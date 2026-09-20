# Hyesu character replacement

The user requested replacing Seon with an original mature Korean female character, then explicitly chose the display name **혜수 / HYESU**. This is an original fictional character, not a licensed film character or a reproduction of an actor.

The existing `tr_seon` ownership and skill key is intentionally retained. Wallets, saved selection and the once-per-match boost skill are unchanged. Public names and artwork are replaced throughout home, collection, loading, lobby, login artwork and deathmatch. The login implementation is unchanged.

## Source and cost

The user supplied the approved wine-red dress character in Dreamina. MiniMax H3 generated one clip for an explicitly approved 100 credits; the observed balance afterward was 522. No retry or additional credits were used. Dreamina labeled the job 2K, but the downloaded file is 768×1024, 60 fps, 5.183991 seconds. Do not describe it as native 2K.

The prompt requests a 5-second game idle, preserving face, proportions and dress, natural breathing and subtle posture-related secondary motion, one blink, slight hair-tip movement, locked camera, a uniform green backing and no anatomy changes. It requests no exaggerated bouncing or sexual posing.

## Asset preparation

Run `scripts/build-hyesu-motion.py` with the bundled Python runtime and the existing `exports/.motion-tools` dependencies. Input: `exports/character-idle-regenerated/hyeran-dreamina-original.mp4` (working name retained for provenance).

The opening 0.6 seconds are omitted. Existing chroma matting removes the green screen and decontaminates edges, followed by a one-pixel alpha erosion. Original generated motion is retained. Whole-body SIFT stabilization was rejected because it interpreted posture changes as camera rotation. Forward/reverse playback closes the loop without jumping between different end poses. WebP uses 15 fps at source resolution with transparent alpha and quality 90 compression.

The static PNG comes from the first clean video frame. Existing visibility, reduced-motion, data-saver and loading-error fallbacks continue to use that still image. The original Seon asset files remain available for historical records, but live presentation references use Hyesu.

## Verification

- Final WebP: 8,986,160 bytes, 768×1024, 134 encoded frames (encoder merges identical adjacent frames). All frames decode with transparent corners and visible head regions.
- Dark/light composites inspected at start, middle and end. Geometric rotation introduced by the first processing attempt was removed before release.
- 844×390 home, 390×844 deathmatch lobby and 1440×900 home inspected. No horizontal overflow; head remains visible. Final home and VS images resolve to the new animated WebP.
- 191 Node tests pass; build, asset versions, home parity and whitespace verification pass. Reduced-motion/data-saver/error behavior retains automated coverage.
- Physical-phone animation performance was not measured; the new motion file is about 9 MB.
