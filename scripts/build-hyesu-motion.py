"""Prepare the approved Dreamina video. No new AI generation or upscaling.

Video matting reuses the project's green-screen edge decontamination.
The opening background transition is omitted; reverse playback closes the loop.
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('trader_chroma', ROOT/'scripts/build-trader-chroma.py')
chroma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chroma)
np, Image = chroma.np, chroma.Image
from scipy.ndimage import distance_transform_edt

def clean_edge(pixels):
    rgba=np.asarray(chroma.cutout(pixels,'hyesu')).copy()
    alpha=rgba[:,:,3]
    alpha=chroma.cv2.erode(alpha,np.ones((3,3),np.uint8))
    # The generated green backdrop bleeds into skin edge pixels. Solve the
    # solid body silhouette directly; the fine hair still uses closed-form matting.
    rgb=pixels.astype(np.float32)
    yy=np.arange(alpha.shape[0])[:,None]
    skin_seed=(rgb[:,:,0]>rgb[:,:,1]+18)&(rgb[:,:,1]>rgb[:,:,2]+8)&(rgb[:,:,0]>100)&(yy>alpha.shape[0]*.26)&(alpha>220)
    skin_band=chroma.cv2.dilate(skin_seed.astype(np.uint8),np.ones((25,25),np.uint8))>0
    green=np.maximum(rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2]),0)/255
    body=np.clip((.43-green)/.38,0,1)
    body=chroma.cv2.GaussianBlur(body,(5,5),.7)
    body=np.clip((body-.12)/.76,0,1)
    alpha[skin_band]=np.round(body[skin_band]*255).astype(np.uint8)
    # Chroma unmixing can turn green-contaminated hair into a purple fringe.
    # Reconstruct only the outer 4 source pixels from the nearest clean interior,
    # rather than subtracting another color channel or shaving off more hair.
    interior=chroma.cv2.erode((alpha>250).astype(np.uint8),np.ones((9,9),np.uint8))>0
    distance,indices=distance_transform_edt(~interior,return_indices=True)
    nearest=rgba[indices[0],indices[1],:3].astype(np.float32)
    blend=np.clip(distance/4,0,1)*((alpha>0)&~interior)
    rgba[:,:,:3]=np.round(rgba[:,:,:3]*(1-blend[:,:,None])+nearest*blend[:,:,None]).astype(np.uint8)
    alpha=chroma.cv2.GaussianBlur(alpha,(3,3),.45)
    alpha[alpha<8]=0
    rgba[:,:,3]=alpha
    rgba[alpha==0,:3]=0
    return Image.fromarray(rgba)
folder = ROOT/'exports/character-idle-regenerated'
source = folder/'hyeran-dreamina-original.mp4'
raw = subprocess.check_output(['ffmpeg','-v','error','-ss','0.6','-i',str(source),
    '-vf','fps=15','-f','rawvideo','-pix_fmt','rgb24','-'])
frames = np.frombuffer(raw,np.uint8).reshape(-1,1024,768,3)
result = []
preview='--preview' in sys.argv
if preview:
    frames=frames[[0,len(frames)//2,len(frames)-1]]
for i,pixels in enumerate(frames):
    result.append(clean_edge(pixels))
    if i % 10 == 0:
        print('MATTED',i,len(frames),flush=True)
if preview:
    canvas=Image.new('RGB',(1200,840))
    for j,im in enumerate(result):
        for i,color in enumerate(['#101d26','#eeeeee']):
            bg=Image.new('RGBA',im.size,color);bg.alpha_composite(im)
            canvas.paste(bg.crop((160,0,600,310)).resize((400,280)),(i*400,j*280))
        canvas.paste(im.getchannel('A').crop((160,0,600,310)).resize((400,280)).convert('RGB'),(800,j*280))
    canvas.save(folder/'hyesu-edge-preview.jpg')
    arms=Image.new('RGB',(1200,600))
    for j,im in enumerate(result):
        for i,color in enumerate(['#101d26','#eeeeee']):
            bg=Image.new('RGBA',im.size,color);bg.alpha_composite(im)
            arms.paste(bg.crop((100,240,700,540)).resize((600,300)),(i*600,(j%2)*300))
        if j==1:break
    arms.save(folder/'hyesu-shoulder-preview.jpg')
    sys.exit(0)
# The locked-camera source already has stable framing. Whole-body SIFT fitting
# mistakes the intended posture shift for camera rotation and must not be used.
cycle = result + result[-2:0:-1]
cycle = cycle[15:] + cycle[:15]  # Begin with an open-eyed pose.
target = ROOT/'assets/traders/motion/hyesu-idle-v2.webp'
temporary = target.with_suffix('.tmp.webp')
print('ENCODING',len(cycle),flush=True)
cycle[0].save(temporary,save_all=True,append_images=cycle[1:],duration=67,loop=0,quality=90,method=2)
temporary.replace(target)
cycle[0].save(ROOT/'assets/traders/hyesu-v2.png')
for i in [0,len(result)//2,len(result)-1]:
    for color,label in [('#101d26','dark'),('#d3dce1','light')]:
        canvas=Image.new('RGBA',(768,1024),color)
        canvas.alpha_composite(result[i])
        canvas.convert('RGB').save(folder/f'hyeran-{label}-{i}.jpg',quality=95)
receipt={'source':source.name,'trim_seconds':0.6,'native_size':[768,1024],
    'frames':len(cycle),'frame_ms':67,'bytes':target.stat().st_size,
    'motion':'Original locked-camera movement, no geometric warp, forward/reverse loop',
    'credits_additional':0}
(folder/'hyeran-motion-receipt.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt),flush=True)
