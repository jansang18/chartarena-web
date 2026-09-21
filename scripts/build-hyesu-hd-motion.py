"""Matte the user-supplied 1176x1764 Hyesu video at native resolution."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'exports/.motion-tools'))
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import binary_erosion, binary_dilation, distance_transform_edt
from pymatting import estimate_alpha_cf, estimate_foreground_ml

FOLDER = ROOT/'exports/character-idle-regenerated'
SOURCE = FOLDER/'hyesu-hd-dreamina-original.mp4'
TARGET = ROOT/'assets/traders/motion/hyesu-idle-hd-v2.webp'
POSTER = ROOT/'assets/traders/hyesu-hd-v2.png'


def refine_hair_fringe(rgba):
    """Limit gray rim luminance to nearby solid hair, leaving skin and interior intact."""
    out = rgba.copy()
    height = round(len(rgba)*.34)
    patch = out[:height]
    color = patch[:,:,:3].astype(np.float32)/255
    alpha = patch[:,:,3].astype(np.float32)/255
    interior_distance = distance_transform_edt(alpha>.04)
    skin = (color[:,:,0]-color[:,:,1]>.09)&(color[:,:,0]-color[:,:,2]>.14)
    skin = binary_dilation(skin,iterations=3)
    luminance = color@np.array([.2126,.7152,.0722],np.float32)
    core = (alpha>.985)&(interior_distance>12)&(luminance<.43)&~skin
    distance,indices = distance_transform_edt(~core,return_indices=True)
    # Smooth the reference field, not the fine strands themselves.
    reference = luminance[indices[0],indices[1]]
    reference = cv2.GaussianBlur(reference,(0,0),3)
    limit = reference*1.05+.008
    weight = np.clip((14-interior_distance)/9,0,1)*(distance<30)*~skin
    weight *= alpha>.01
    scale = np.minimum(1,limit/np.maximum(luminance,.001))
    color *= (1-weight+weight*scale)[:,:,None]
    patch[:,:,:3] = np.round(np.clip(color,0,1)*255).astype(np.uint8)
    return out,weight.astype(np.float32)


def matte(pixels):
    rgb = pixels.astype(np.float64)/255
    dominance = (rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2]))/np.maximum(rgb[:,:,1],.04)
    border = np.concatenate([dominance[:,:16].ravel(),dominance[:,-16:].ravel()])
    # This source has a muted, shaded backing, unlike the earlier neon green.
    background_level = float(np.percentile(border,5))*.80
    background = dominance > background_level
    foreground = dominance < .04
    trimap = np.full(dominance.shape,.5)
    trimap[binary_erosion(background,iterations=2,border_value=1)] = 0
    trimap[binary_erosion(foreground,iterations=2,border_value=1)] = 1
    alpha = np.clip(estimate_alpha_cf(rgb,trimap),0,1)
    alpha[alpha<.012] = 0
    alpha[alpha>.992] = 1
    return foreground_color(rgb,alpha)


def foreground_color(rgb,alpha):
    # Reconstruct against the FINAL alpha; changing alpha alone exposes old edge RGB.
    color = np.clip(estimate_foreground_ml(rgb,alpha),0,1)
    edge = binary_dilation(alpha<.05,iterations=12)
    hair = np.arange(alpha.shape[0])[:,None]<alpha.shape[0]*.37
    spill = np.maximum(color[:,:,1]-np.maximum(color[:,:,0],color[:,:,2]),0)*(edge|hair)
    color[:,:,1] -= spill
    # Preserve hair detail; neutralize only partially transparent edge colors.
    mix = edge*hair*np.clip((1-alpha)*1.5,0,1)
    neutral = color.mean(axis=2)
    tint = np.stack([neutral*1.02,neutral*.98,neutral*.97],axis=2)
    color = np.clip(color*(1-mix[:,:,None])+tint*mix[:,:,None],0,1)
    color[alpha==0] = 0
    return np.round(np.dstack([color,alpha])*255).astype(np.uint8)


def main():
    preview = '--preview' in sys.argv
    reuse_alpha = '--reuse-v1-alpha' in sys.argv and not preview
    info = json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0',
        '-show_entries','stream=width,height','-of','json',str(SOURCE)]))['streams'][0]
    w,h = info['width'],info['height']
    # 24 fps matches the source's actual average frame rate; no raster upscale.
    # Skip the opening white-to-green backing transition (first 0.2 seconds).
    raw = subprocess.check_output(['ffmpeg','-v','error','-ss','0.25','-i',str(SOURCE),
        '-vf','fps=1' if preview else 'fps=24','-f','rawvideo','-pix_fmt','rgb24','-'])
    frames = np.frombuffer(raw,np.uint8).reshape(-1,h,w,3)
    ids = [0,len(frames)//2,len(frames)-1] if preview else range(len(frames))
    result=[]
    if reuse_alpha:
        # WebP alpha is lossless. Reuse the published, already stabilized matte;
        # foreground RGB is still rebuilt from the uncompressed source below.
        prior=Image.open(ROOT/'assets/traders/motion/hyesu-idle-hd-v1.webp')
        assert prior.size==(w,h) and prior.n_frames==len(frames)*2-2
        for i in ids:
            prior.seek(i)
            result.append(np.array(prior.convert('RGBA')))
    else:
        for i in ids:
            rgba=matte(frames[i])
            result.append(refine_hair_fringe(rgba)[0] if preview else rgba)
            if preview or i%12==0:print('MATTED',i,len(frames),flush=True)
    if preview:
        sheet=Image.new('RGB',(1500,1000))
        for col,rgba in enumerate(result):
            for row,bg in enumerate(['#111114','#eeeeee']):
                im=Image.new('RGBA',(w,h),bg);im.alpha_composite(Image.fromarray(rgba))
                sheet.paste(im.crop((180,0,1000,820)).resize((500,500)),(500*col,500*row))
        sheet.save(FOLDER/'hyesu-hd-preview.jpg',quality=96)
        return
    # Motion-compensated median stabilizes alpha only around moving head edges.
    small_w=392;small_h=round(h*small_w/w)
    gray=[cv2.resize(cv2.cvtColor(frame,cv2.COLOR_RGB2GRAY),(small_w,small_h)) for frame in frames]
    xx,yy=np.meshgrid(np.arange(w,dtype=np.float32),np.arange(h,dtype=np.float32))
    hair=np.clip((h*.38-np.arange(h))/(h*.025),0,1)[:,None]
    previous_alpha=None
    for i in range(0 if reuse_alpha else len(result)):
        rgba=result[i]
        alpha=rgba[:,:,3].astype(np.float32)
        neighbors=[]
        for j in [i-1,i+1]:
            if not 0<=j<len(result):continue
            flow=cv2.calcOpticalFlowFarneback(gray[i],gray[j],None,.5,3,21,3,5,1.2,0)
            flow=cv2.resize(flow,(w,h));flow[:,:,0]*=w/small_w;flow[:,:,1]*=h/small_h
            neighbor=previous_alpha if j==i-1 else result[j][:,:,3].astype(np.float32)
            neighbors.append(cv2.remap(neighbor,xx+flow[:,:,0],yy+flow[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE))
        median=np.median(np.stack([alpha]+neighbors),axis=0)
        filtered=cv2.GaussianBlur(median,(3,3),.5)
        rgba[:,:,3]=np.round(alpha*(1-hair)+filtered*hair).astype(np.uint8)
        rgba[rgba[:,:,3]<3]=0
        previous_alpha=alpha
        if i%24==0:print('STABILIZED',i,len(result),flush=True)
    weights=[]
    for i,rgba in enumerate(result):
        rgba=foreground_color(frames[i].astype(np.float64)/255,rgba[:,:,3]/255.)
        result[i],weight=refine_hair_fringe(rgba)
        weights.append(weight)
        if i%24==0:print('DEFRINGED',i,len(result),flush=True)
    # Stabilize the fringe's premultiplied color as well as its opacity. Neighbor
    # samples follow hair motion, so the silhouette and facial animation stay live.
    head_h=weights[0].shape[0]
    premult=[r[:head_h,:,:3].astype(np.float32)*(r[:head_h,:,3:4]/255.) for r in result]
    before_residual=[];after_residual=[]
    for i,rgba in enumerate(result):
        samples=[premult[i]]
        for j in [i-1,i+1]:
            if not 0<=j<len(result):continue
            flow=cv2.calcOpticalFlowFarneback(gray[i],gray[j],None,.5,3,21,3,5,1.2,0)
            flow=cv2.resize(flow,(w,h))[:head_h];flow[:,:,0]*=w/small_w;flow[:,:,1]*=h/small_h
            warped=cv2.remap(premult[j],xx[:head_h]+flow[:,:,0],yy[:head_h]+flow[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
            samples.append(warped)
        median=np.median(np.stack(samples),axis=0)
        blend=weights[i][:,:,None]*.8
        filtered=premult[i]*(1-blend)+median*blend
        # Neighbor coverage can exceed current alpha. Never let that create a
        # brighter unpremultiplied fringe when restoring current-frame RGB.
        filtered=np.minimum(filtered,premult[i])
        measured=weights[i]>.5
        before_residual.append(float(np.abs(premult[i]-median)[measured].mean()))
        after_residual.append(float(np.abs(filtered-median)[measured].mean()))
        alpha=rgba[:head_h,:,3:4]/255.
        rgba[:head_h,:,:3]=np.round(np.clip(filtered/np.maximum(alpha,1/255),0,255)).astype(np.uint8)
        rgba[rgba[:,:,3]<3]=0
        if i%24==0:print('COLOR_STABILIZED',i,len(result),flush=True)
    images=[Image.fromarray(rgba) for rgba in result]
    cycle=images+images[-2:0:-1]
    # Alternating frame durations avoid drifting from 24 fps.
    durations=[round((i+1)*1000/24)-round(i*1000/24) for i in range(len(cycle))]
    print('ENCODING',len(cycle),flush=True)
    temporary=TARGET.with_suffix('.tmp.webp')
    cycle[0].save(temporary,save_all=True,append_images=cycle[1:],duration=durations,
                  loop=0,quality=92,method=4)
    temporary.replace(TARGET)
    # Use the open-eyed pose after the initial blink for static/loading screens.
    cycle[6].save(POSTER)
    receipt={'source':SOURCE.name,'native_size':[w,h],'frames':len(cycle),'fps':24,
        'duration_ms':sum(durations),'bytes':TARGET.stat().st_size,'poster_bytes':POSTER.stat().st_size,
        'source_start_seconds':.25,'poster_frame':6,'additional_credits':0,
        'fringe_median_residual_before':float(np.mean(before_residual)),
        'fringe_median_residual_after':float(np.mean(after_residual)),
        'loop':'forward then reverse, no duplicate endpoints'}
    (FOLDER/'hyesu-hd-v2-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt),flush=True)


if __name__=='__main__':main()
