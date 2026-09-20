"""Fixed-silhouette idle assets: registered eye motion plus subpixel breathing.

The outside alpha AND edge RGB never change between frames. AI video motion is
limited to the eyes; clothing breath is a bounded warp of one clean still frame.
"""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'exports/.motion-tools'))
import cv2
import numpy as np
from PIL import Image

EYES={
 'seon':(290,115,457,188),
 'yuna':(311,110,492,191),
 'kai':(306,111,521,204),
 'rin':(289,133,469,211),
 'doyun':(285,116,482,205),
}

for name in sys.argv[1:] or list(EYES):
 source=Image.open(ROOT/'assets/traders/motion'/f'{name}-idle-v5.webp')
 count=source.n_frames
 source.seek(count//4)
 base=np.asarray(source.convert('RGBA')).copy()
 h,w=base.shape[:2]
 yy,xx=np.mgrid[:h,:w].astype(np.float32)
 x1,y1,x2,y2=EYES[name]
 cx,cy=(x1+x2)/2,(y1+y2)/2
 eye=np.clip(1-((xx-cx)/((x2-x1)/2))**4-((yy-cy)/((y2-y1)/2))**4,0,1)
 eye=cv2.GaussianBlur(eye,(0,0),3)
 # Never animate a translucent edge or any nearby pixel.
 interior=cv2.erode((base[:,:,3]>250).astype(np.uint8),np.ones((35,35),np.uint8))
 eye*=interior
 eye[eye<.005]=0
 face=(max(0,x1-30),max(0,y1-35),min(w,x2+30),min(h,y2+95))
 fx1,fy1,fx2,fy2=face
 template=cv2.cvtColor(base[fy1:fy2,fx1:fx2,:3],cv2.COLOR_RGB2GRAY)
 align_mask=np.ones(template.shape,np.uint8)*255
 align_mask[max(0,y1-fy1):y2-fy1,max(0,x1-fx1):x2-fx1]=0
 chest=np.clip(1-((xx-w*.52)/(w*.25))**2-((yy-h*.43)/(h*.16))**2,0,1)**2
 chest*=interior
 chest[chest<.005]=0
 active=(eye>0)|(chest>0)
 output=[]
 for i in range(count):
  source.seek(i)
  rgba=np.asarray(source.convert('RGBA'))
  rgb=base[:,:,:3].astype(np.float32).copy()
  frame=cv2.cvtColor(rgba[fy1:fy2,fx1:fx2,:3],cv2.COLOR_RGB2GRAY)
  warp=np.eye(2,3,dtype=np.float32)
  try:
   _,warp=cv2.findTransformECC(template,frame,warp,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,.0001),align_mask,3)
  except cv2.error:
   warp=np.eye(2,3,dtype=np.float32)
  warp[:,2]=np.clip(warp[:,2],-12,12)
  aligned=cv2.warpAffine(rgba[fy1:fy2,fx1:fx2,:3],warp,(fx2-fx1,fy2-fy1),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT)
  blend=eye[fy1:fy2,fx1:fx2,None]
  rgb[fy1:fy2,fx1:fx2]=rgb[fy1:fy2,fx1:fx2]*(1-blend)+aligned*blend
  phase=np.float32(np.sin(2*np.pi*i/count))
  # Less than one source pixel, returning smoothly to its first pose.
  map_x=(xx-(xx-w*.52)*(.0018*phase)*chest).astype(np.float32)
  map_y=(yy-.8*phase*chest).astype(np.float32)
  breathed=cv2.remap(base[:,:,:3],map_x,map_y,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
  rgb=rgb*(1-chest[:,:,None])+breathed*chest[:,:,None]
  result=base.copy();result[:,:,:3]=np.round(rgb).astype(np.uint8)
  assert np.array_equal(result[:,:,3],base[:,:,3])
  assert np.array_equal(result[~active],base[~active])
  output.append(Image.fromarray(result))
 target=ROOT/'assets/traders/motion'/f'{name}-idle-v6.webp'
 temporary=target.with_suffix('.tmp.webp')
 output[0].save(temporary,save_all=True,append_images=output[1:],duration=67,loop=0,lossless=True,method=4)
 temporary.replace(target)
 output[0].save(ROOT/'exports/character-idle-regenerated'/f'{name}-stable-poster.png')
 receipt={'name':name,'frames':count,'size':[w,h],'alpha_fixed':True,'outside_motion_regions_rgb_fixed':True,'breathing_displacement_px':.8,'eye_roi':EYES[name],'bytes':target.stat().st_size}
 (ROOT/'exports/character-idle-regenerated'/f'{name}-fixed-outline.json').write_text(json.dumps(receipt,indent=2))
 print(json.dumps(receipt),flush=True)
