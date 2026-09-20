"""Prepare the approved Dreamina video. No new AI generation or upscaling.

Video matting reuses the project's green-screen edge decontamination.
The opening background transition is omitted; reverse playback closes the loop.
"""
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('trader_chroma', ROOT/'scripts/build-trader-chroma.py')
chroma = importlib.util.module_from_spec(spec)
spec.loader.exec_module(chroma)
np, Image = chroma.np, chroma.Image
folder = ROOT/'exports/character-idle-regenerated'
source = folder/'hyeran-dreamina-original.mp4'
raw = subprocess.check_output(['ffmpeg','-v','error','-ss','0.6','-i',str(source),
    '-vf','fps=15','-f','rawvideo','-pix_fmt','rgb24','-'])
frames = np.frombuffer(raw,np.uint8).reshape(-1,1024,768,3)
result = []
for i,pixels in enumerate(frames):
    rgba=np.asarray(chroma.cutout(pixels,'hyeran')).copy()
    # Remove one subpixel fringe from chroma edges, preserving the opaque body.
    rgba[:,:,3]=chroma.cv2.erode(rgba[:,:,3],np.ones((3,3),np.uint8))
    result.append(Image.fromarray(rgba))
    if i % 10 == 0:
        print('MATTED',i,len(frames),flush=True)
# The locked-camera source already has stable framing. Whole-body SIFT fitting
# mistakes the intended posture shift for camera rotation and must not be used.
cycle = result + result[-2:0:-1]
cycle = cycle[15:] + cycle[:15]  # Begin with an open-eyed pose.
target = ROOT/'assets/traders/motion/hyesu-idle-v1.webp'
temporary = target.with_suffix('.tmp.webp')
print('ENCODING',len(cycle),flush=True)
cycle[0].save(temporary,save_all=True,append_images=cycle[1:],duration=67,loop=0,quality=90,method=2)
temporary.replace(target)
cycle[0].save(ROOT/'assets/traders/hyesu-v1.png')
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
