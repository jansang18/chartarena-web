"""Remove the deliberately generated magenta backing from Dreamina idle clips.

Runs offline only. Keeps the downloaded native 768x1024 raster; no upscale claim.
White clothing and silver hair are never used as background seeds.
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'exports/.motion-tools'))
import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, binary_erosion, binary_propagation
from pymatting import estimate_alpha_cf, estimate_foreground_ml
import cv2

RIN_REFERENCE = None


def stabilize(frames, name):
    """Remove generated camera zoom/pan while keeping local blink/breath motion."""
    sift = cv2.SIFT_create(nfeatures=1600)
    anchor = np.asarray(frames[0])
    h,w = anchor.shape[:2]
    ak,ad = sift.detectAndCompute(cv2.cvtColor(anchor[:,:,:3],cv2.COLOR_RGB2GRAY),(anchor[:,:,3]>245).astype(np.uint8)*255)
    output = [frames[0]]
    rows = [{'frame':0,'correction_scale':1,'matches':len(ak)}]
    for i,frame in enumerate(frames[1:],1):
        rgba = np.asarray(frame)
        k,d = sift.detectAndCompute(cv2.cvtColor(rgba[:,:,:3],cv2.COLOR_RGB2GRAY),(rgba[:,:,3]>245).astype(np.uint8)*255)
        pairs = cv2.BFMatcher().knnMatch(d,ad,k=2)
        matches = [m for m,n in pairs if m.distance < .7*n.distance]
        if len(matches)<12:
            raise ValueError(f'{name} frame {i}: insufficient stable portrait features')
        src = np.float32([k[m.queryIdx].pt for m in matches])
        dst = np.float32([ak[m.trainIdx].pt for m in matches])
        matrix,inliers = cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=2)
        scale = float(np.hypot(matrix[0,0],matrix[0,1]))
        if not .8 < scale < 1.25:
            raise ValueError(f'{name} frame {i}: unexpected camera correction {scale}')
        # Warp premultiplied RGBA to avoid dark seams along translucent hair.
        pixels = rgba.astype(np.float32)/255
        pixels[:,:,:3] *= pixels[:,:,3:4]
        warped = cv2.warpAffine(pixels,matrix,(w,h),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_CONSTANT)
        warped = np.clip(warped,0,1)
        warped[:,:,:3] /= np.maximum(warped[:,:,3:4],.001)
        output.append(Image.fromarray(np.round(np.clip(warped,0,1)*255).astype(np.uint8)))
        rows.append({'frame':i,'correction_scale':round(scale,6),'matches':int(inliers.sum())})
    (ROOT/'exports/character-idle-regenerated'/f'{name}-stabilization.json').write_text(json.dumps(rows,indent=2))
    print('STABILIZED',name,'correction range',min(r['correction_scale'] for r in rows),max(r['correction_scale'] for r in rows),flush=True)
    return output


def cutout_rin(pixels):
    """Track the supplied PNG's clean opaque silhouette onto the intact clip.

    Rin's second green-screen generation cropped her head; the first clip keeps
    her whole silhouette. Its dark glow is excluded using the original alpha.
    """
    global RIN_REFERENCE
    h, w = pixels.shape[:2]
    if RIN_REFERENCE is None:
        source = Image.open(ROOT/'assets/traders/rin-v1.png').convert('RGBA')
        source = source.resize((round(source.width*h/source.height),h), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA',(w,h));canvas.paste(source,((w-source.width)//2,0))
        rgba = np.asarray(canvas)
        reference_gray = cv2.cvtColor(rgba[:,:,:3],cv2.COLOR_RGB2GRAY)
        # The PNG includes low-opacity glow outside its actual opaque subject.
        clean_alpha = np.clip((rgba[:,:,3].astype(np.float32)-235)/18,0,1)
        RIN_REFERENCE = reference_gray,clean_alpha
    reference_gray,clean_alpha = RIN_REFERENCE
    gray = cv2.cvtColor(pixels,cv2.COLOR_RGB2GRAY)
    sift=cv2.SIFT_create()
    kp1,d1=sift.detectAndCompute(reference_gray,(clean_alpha>.99).astype(np.uint8)*255)
    kp2,d2=sift.detectAndCompute(gray,None)
    pairs=cv2.BFMatcher().knnMatch(d1,d2,k=2)
    matches=[m for m,n in pairs if m.distance<.7*n.distance]
    p1=np.float32([kp1[m.queryIdx].pt for m in matches])
    p2=np.float32([kp2[m.trainIdx].pt for m in matches])
    matrix,_=cv2.estimateAffinePartial2D(p1,p2,method=cv2.RANSAC,ransacReprojThreshold=3)
    tracked=cv2.warpAffine(clean_alpha,matrix,(w,h))
    shape = tracked>.5
    trimap = np.full((h,w),.5)
    trimap[~binary_dilation(shape,iterations=4)]=0
    trimap[binary_erosion(shape,iterations=6,border_value=1)]=1
    rgb=pixels.astype(np.float64)/255
    chroma=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]
    trimap[chroma>.18]=0
    alpha=np.clip(estimate_alpha_cf(rgb,trimap),0,1)
    foreground=np.clip(estimate_foreground_ml(rgb,alpha),0,1)
    edge=binary_dilation(alpha<.05,iterations=12)
    spill=np.maximum(np.minimum(foreground[:,:,0],foreground[:,:,2])-foreground[:,:,1]-.01,0)*edge
    foreground[:,:,0]-=spill;foreground[:,:,2]-=spill
    complement=np.maximum(foreground[:,:,1]-np.maximum(foreground[:,:,0],foreground[:,:,2])-.01,0)*edge
    foreground[:,:,1]-=complement
    foreground[alpha<.01]=0;alpha[alpha<.01]=0
    return Image.fromarray(np.round(np.dstack([foreground,alpha])*255).astype(np.uint8))


def cutout(pixels, name):
    if name=='rin':
        return cutout_rin(pixels)
    rgb = pixels.astype(np.float64) / 255
    # Each generated clip has its own slightly different flat magenta.
    samples = np.concatenate([rgb[:, :12].reshape(-1, 3), rgb[:, -12:].reshape(-1, 3)])
    backing = np.median(samples, axis=0)
    distance = np.linalg.norm(rgb - backing, axis=2)
    green_screen = backing[1] > max(backing[0], backing[2])
    chroma = (rgb[:,:,1]-np.maximum(rgb[:,:,0],rgb[:,:,2])) if green_screen else (np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1])
    # Generated backing also has darker saturated pockets behind hair/arms.
    # Hue dominance catches those pockets even when their brightness differs.
    key = ((distance < .22) & (chroma > .15)) | (chroma > .22)
    # Kai's generated backing includes white corners outside the magenta field.
    # Only border-connected white is background; keep his white pocket square.
    white = np.min(rgb, axis=2) > .92
    border = np.zeros(white.shape, bool)
    border[0] = white[0]; border[-1] = white[-1]
    border[:, 0] = white[:, 0]; border[:, -1] = white[:, -1]
    white_backing = binary_propagation(border, mask=white)
    if name=='kai':
        # A small detached white backing patch occurs beside his lowered hand.
        # His white pocket square is in the upper half and must remain intact.
        lower_white=white.copy();lower_white[:pixels.shape[0]//2]=False
        white_backing |= binary_propagation(lower_white,mask=white)
    key |= white_backing
    bg = binary_erosion(key, iterations=2, border_value=1)
    fg = ~binary_dilation(key, iterations=4)
    trimap = np.full(key.shape, .5)
    trimap[bg] = 0
    trimap[fg] = 1
    alpha = np.clip(estimate_alpha_cf(rgb, trimap), 0, 1)
    alpha[alpha < .02] = 0
    alpha[alpha > .99] = 1
    # Undo backing-color mixing in partially covered edge pixels.
    a = alpha[:, :, None]
    foreground = np.clip((rgb - (1-a)*backing) / np.maximum(a, .02), 0, 1)
    edge = binary_dilation(bg, iterations=15)
    if green_screen:
        spill = np.maximum(foreground[:,:,1]-np.maximum(foreground[:,:,0],foreground[:,:,2])-.015,0)*edge
        foreground[:,:,1] -= spill
    else:
        # Kill colored backing spill in the narrow silhouette band, including
        # dark thin hair where generated magenta is stronger than antialiasing.
        spill = np.maximum(np.minimum(foreground[:,:,0],foreground[:,:,2])-foreground[:,:,1]-.015, 0)*edge
        foreground[:,:,0] -= spill
        foreground[:,:,2] -= spill
        complement = np.maximum(foreground[:,:,1]-np.maximum(foreground[:,:,0],foreground[:,:,2])-.015,0)*edge
        foreground[:,:,1] -= complement
        # White corners use their own backing color for edge unmixing.
        white_edge = binary_dilation(white_backing, iterations=5)
        white_fg = np.clip((rgb-(1-a))/np.maximum(a,.02),0,1)
        foreground[white_edge] = white_fg[white_edge]
    foreground[alpha == 0] = 0
    return Image.fromarray(np.round(np.dstack([foreground, alpha])*255).astype(np.uint8))


def run(name, preview=False):
    started = time.time()
    source = ROOT / 'exports/character-idle-regenerated' / f'{name}-idle.mp4'
    folder = ROOT / 'exports/character-idle-regenerated'
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', str(source)]))['streams'][0]
    w, h = info['width'], info['height']
    command = ['ffmpeg', '-v', 'error']
    if preview:
        command += ['-ss', '2']
    else:
        # Reject the provider's introductory background-color transitions.
        command += ['-ss', str({'seon':1.2, 'kai':1.6}.get(name, .2))]
    command += ['-i', str(source), '-vf', 'fps=15']
    if preview:
        command += ['-frames:v', '1']
    command += ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.check_output(command)
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    result = []
    for i, pixels in enumerate(frames):
        result.append(cutout(pixels, name))
        if i % 15 == 0:
            print(name, i, len(frames), round(time.time()-started, 1), flush=True)
    if not preview:
        result = stabilize(result, name)
        # Reverse excludes repeated endpoints and avoids a visible loop jump.
        cycle = result + result[-2:0:-1]
        target = ROOT / 'assets/traders/motion' / f'{name}-idle-v5.webp'
        temporary = target.with_suffix('.tmp.webp')
        cycle[0].save(temporary, save_all=True, append_images=cycle[1:], duration=67, loop=0, quality=94, method=4)
        temporary.replace(target)
        print('SAVED', name, target.stat().st_size, flush=True)
    ids = [0] if preview else [0, len(result)//2, len(result)-1]
    for i in ids:
        result[i].save(folder / f'{name}-cutout-{i}.png')
        for color, label in [('#101d26', 'dark'), ('#b8c5cc', 'light')]:
            canvas = Image.new('RGBA', (w,h), color)
            canvas.alpha_composite(result[i])
            canvas.convert('RGB').save(folder / f'{name}-{label}-{i}.jpg', quality=94)
    print('DONE', name, round(time.time()-started, 1), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('names', nargs='*', default=['seon', 'yuna', 'kai', 'rin', 'doyun'])
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    for character in args.names:
        run(character, args.preview)
