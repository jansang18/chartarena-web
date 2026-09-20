"""Offline conversion of the approved Dreamina clips; never runs in the game."""
import sys, os, subprocess, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'exports/.motion-tools'))
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter
from pymatting import estimate_alpha_cf, estimate_foreground_ml
from scipy.ndimage import binary_dilation

root = Path(__file__).resolve().parent.parent
out = root / 'assets/traders/motion'
out.mkdir(exist_ok=True)
opts = ort.SessionOptions()
opts.intra_op_num_threads = 4
opts.inter_op_num_threads = 1
session = ort.InferenceSession(str(Path.home()/'.u2net/u2net.onnx'), opts, providers=['CPUExecutionProvider'])
input_name = session.get_inputs()[0].name
names = sys.argv[1:] or ['seon','yuna','kai','rin','doyun']
for name in names:
    started = time.time()
    source = root / 'exports/character-idle-videos' / (name+'-idle.mp4')
    width, height = 720, 1080
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vf',f'fps=12,scale=810:{height},crop={width}:{height}','-f','rawvideo','-pix_fmt','rgb24','-'])
    frames = np.frombuffer(raw,np.uint8).reshape(-1,height,width,3)
    result = []
    for i, pixels in enumerate(frames):
        im = Image.fromarray(pixels)
        small = np.asarray(im.resize((320,320),Image.Resampling.BILINEAR), dtype=np.float32)/255
        inp = ((small-np.array([.485,.456,.406],np.float32))/np.array([.229,.224,.225],np.float32)).transpose(2,0,1)[None]
        mask = session.run(None,{input_name:inp})[0][0,0]
        mask = (mask-mask.min())/max(float(mask.max()-mask.min()),1e-6)
        # Keep white clothing. Segment the subject, rather than keying white pixels.
        alpha = Image.fromarray((np.clip((mask-.08)/.84,0,1)*255).astype(np.uint8)).resize(im.size,Image.Resampling.LANCZOS)
        fg = np.asarray(alpha.filter(ImageFilter.MinFilter(21))) > 245
        bg = np.asarray(alpha.filter(ImageFilter.MaxFilter(21))) < 10
        trimap = np.full(fg.shape,.5); trimap[fg]=1; trimap[bg]=0
        # U2Net can fill enclosed gaps between dark hair strands as foreground.
        # Restrict this extra background seed to neutral white pixels in the head
        # region. Keep Rin's silver hair and every character's white clothes intact.
        if name != 'rin':
            neutral = (pixels.max(axis=2).astype(int)-pixels.min(axis=2).astype(int)) < 22
            white_gap = (pixels.min(axis=2)>215) & neutral
            white_gap[int(len(pixels)*.27):] = False
            trimap[white_gap]=0
        # Explicit negative-space seeds for gaps enclosed by the bent arm and torso.
        # Scale the reviewed 384x576 coordinates to the output resolution.
        gaps={'doyun':(112,286,149,355),'kai':(279,299,325,378)}
        if name in gaps:
            x1,y1,x2,y2=[round(v*width/384) for v in gaps[name]]
            gap=np.zeros(fg.shape,dtype=bool)
            region=pixels[y1:y2,x1:x2]
            gap[y1:y2,x1:x2]=(region.min(axis=2)>222)&((region.max(axis=2).astype(int)-region.min(axis=2).astype(int))<22)
            trimap[binary_dilation(gap,iterations=8)]=.5
            trimap[gap]=0
        rgb = pixels.astype(np.float64)/255
        matte = estimate_alpha_cf(rgb,trimap)
        foreground = estimate_foreground_ml(rgb,matte)
        im = Image.fromarray((np.clip(np.dstack([foreground,matte]),0,1)*255).astype(np.uint8))
        result.append(im)
        if i%20==0: print(name,i,len(frames),round(time.time()-started,1),flush=True)
    # A forward/reverse cycle has identical poses at the wrap, avoiding a hard cut.
    sequence = result + result[-2:0:-1]
    sequence[0].save(out/(name+'-idle-v4.webp'),save_all=True,append_images=sequence[1:],duration=83,loop=0,quality=92,method=4)
    for n in [0,len(result)//2,len(result)-1]:
        result[n].save(root/'exports'/f'{name}-mask-{n}.png')
    print('DONE',name,(out/(name+'-idle-v4.webp')).stat().st_size,round(time.time()-started,1),flush=True)
