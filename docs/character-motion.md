# Character idle motion

## Source and cost

On 2026-09-20 all five existing character references were regenerated with Dreamina MiniMax H3, 5 seconds, with the UI set to 2K. Five generations used 500 credits. The user explicitly approved a 100-credit retry for Rin: this turn's total is 600 credits, leaving 622 as observed in Dreamina.

**Resolution discrepancy:** both normal and detail-view downloads returned native 768x1024, 60 fps MP4 files, despite the job's 2K label. These assets must not be described as native 2K. Local sources remain in `exports/character-idle-regenerated`; no additional upscaling credits were used.

Seon, Yuna, Kai and Doyun use new magenta-backed sources. Rin's first source retained a dark glow; her green-backed retry cropped her head and was rejected. The intact first source is used with a silhouette guided by the original PNG alpha, aligned to each frame. Rejected source files remain in exports for comparison.

## Runtime assets (v6: fixed silhouette)

`assets/traders/motion/*-idle-v6.webp` keeps the downloaded 768x1024 raster, 15 fps, lossless encoding and real transparency. A single clean frame fixes the entire silhouette and body position. Only locally registered eye motion is taken from the generated video; clothing breathing is a bounded warp smaller than one source pixel. Every frame has identical alpha and identical RGB outside these interior motion regions. This addresses shimmering edges and the reported briefly disappearing Kai head. Introductory background transitions are trimmed from Seon (1.2 seconds) and Kai (1.6 seconds). Other clips omit the first 0.2 seconds. Forward/reverse playback excludes duplicate endpoints to close the loop.

The intermediate v5 pass removes generated camera zoom. Each processed frame is registered to its first frame using stable interior features and a similarity transform. This removes generated camera scale/pan while retaining local blinking and breathing. Per-frame corrections are saved to `exports/character-idle-regenerated/*-stabilization.json`. Premultiplied RGBA resampling protects translucent edges.

`arena-motion.js` enhances home, lobby, podium and selected collection portraits. Visibility, hidden tabs, reduced motion, data saver, manual pause and media-load failure retain their static-PNG fallbacks. Original PNGs and ownership IDs are preserved. Deathmatch shows the selected player and actual bot on opposite sides of VS.

## Offline preparation

Run `scripts/build-trader-chroma.py` and then `scripts/build-trader-stable-idle.py` with the bundled Python runtime. Build-time packages in `exports/.motion-tools` are NumPy, Pillow, SciPy, PyMatting and OpenCV; FFmpeg/FFprobe must be on PATH. None run in the game.

For magenta sources, backing-color samples seed a narrow closed-form matte. Backing color is unmixed from translucent edges and residual color spill is suppressed. Enclosed arm gaps use the same key. Border-connected white corners in Kai are removed without removing his pocket square. Rin uses the high-opacity original-PNG silhouette, SIFT/RANSAC registration and foreground estimation to retain her dark trousers. This mask is source-specific and needs rechecking for replacement clips.

## Verification scope

Check every file's frame decoding/alpha, start/middle/end composites on dark and light backgrounds, residual camera scale, and local home/VS rendering at desktop and phone-landscape sizes. Run `node scripts/version-assets.cjs`, `node --test tests/*.test.cjs`, `node tests/verify-build.cjs` and `git diff --check` after integration.

Native 2K delivery, physical-phone memory/performance and production deployment are not verified by these assets or Node tests. A release also requires checking the deployed pages and asset hashes separately.

The final v6 export is written atomically, so a browser cannot load a partially encoded replacement file. The old v4/v5 files are working intermediates, not runtime references.

Final v6 validation on 2026-09-20: all 665 decoded frames across five assets have identical alpha and identical visible upper-hair pixels within each character (Kai: 105 frames). The home loads `kai-idle-v6.webp`; its head is fully visible at 844x390. The five-character viewer was inspected on dark and light backgrounds, and its pause control switches to the fixed posters. All 141 Node tests, build verification and whitespace checks passed after v6 integration. Temporary browser viewport overrides were reset. Evidence: `exports/character-idle-regenerated/final-fixed-validation.json`.
