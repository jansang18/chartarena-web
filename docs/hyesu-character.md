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

## v2 cutout correction

The initial key treated weakly saturated dark green pockets between curls as foreground. Backing-color subtraction also produced purple edge pixels. The Hyesu-only key now removes those green pockets; an outer four-pixel band reconstructs foreground color from nearby opaque interior pixels. A narrow alpha smoothing pass retains a soft boundary without adding an external glow. Other characters' key thresholds are unchanged.

The source video and its original body movement are retained. No additional Dreamina generation or credits were used. New `hyesu-v2.png` and `hyesu-idle-v2.webp` filenames bypass the previous image cache.

Skin edges on shoulders and arms use a separate green-dominance matte, selected only near confident skin pixels. This avoids the stepped contours produced by aggressively tightening the hair matte. A narrow antialiasing transition keeps skin outlines defined without a wide translucent halo.

V2 verification: 7,634,368 bytes, 768x1024, 134 encoded frames. Every frame decodes with transparent corners and an intact head. Dark/light head and shoulder composites were inspected at multiple poses. The 1440x900 and 844x390 home use the v2 animated asset without horizontal overflow. All 191 Node tests and build verification pass. No new credits were consumed.

## v3 moving-hair correction

The user reported that the hair changes unnaturally while moving. Comparing the native green-screen clip and the v2 matte showed curved strands becoming angular opaque edges. V2 eroded the hair silhouette and copied nearby solid pixels into the fringe separately for each frame.

`scripts/refine-hyesu-video.py` reprocesses the existing video using relative green dominance, local foreground estimation and motion-compensated three-frame alpha filtering. It preserves the v2 body matte below the head overlap. The head is not frozen or geometrically warped. The static `hyesu-v2.png` reduced-motion fallback remains unchanged; the shared catalog now points to `hyesu-idle-v3.webp` for motion.

Validation: 768x1024, 136 encoded frames, 9,112ms (same duration as v2), 10,163,822 bytes. All frames have transparent top corners and an intact opaque head region. The internal motion-compensated hair-edge residual decreased from 17.08 to 5.43 alpha levels within the new processing pass; this is a diagnostic metric, not a perceptual quality score or direct v2 comparison. Light/dark browser comparison and actual home loading of v3 were checked. All 191 Node tests, build reference checks and whitespace checks passed. No additional generation credits were used. This is local preview work; native-phone playback performance remains unmeasured.

## Loading portrait proportions

Hyesu's 768x1024 source is 3:4 while the other four loading portraits are 1024x1536 (2:3). Equal CSS widths previously produced a shorter Hyesu image. The shared loading image rule now uses a 2:3 aspect ratio with object-fit cover and top-centered alignment, preserving anatomy while normalizing the portrait window. Browser checks show equal rounded image heights for all five portraits: 588px at 1280x720, 297px at 844x390, and 264px at 390x844. Both phone viewports have no horizontal overflow. The shared stylesheet applies to the home splash, battle splash and loading preview. 191 tests and build verification pass.

## Native HD replacement (2026-09-21)

The user supplied `dreamina-2026-09-21-4730-Create a 5-second seamless idle animatio....mp4` and approved replacing Hyesu. Its verified native raster is 1176x1764 (2:3), duration 5.056009 seconds, 12,642,239 bytes. Source SHA256: `EA5895E82CA6CE84CD0D1CAC7FDBF2E49B6232D5FC8ADC6DAD32C37E3094CBC4`. The actual average frame rate is about 24.12fps; a 60fps container rate is not a claim of 60 unique frames per second.

`scripts/build-hyesu-hd-motion.py` processes the supplied source without raster upscaling. It removes the opening 0.25-second white-to-green backing transition, uses source-adaptive green matting and local foreground estimation, and removes green contamination around edges and inside hair. Optical-flow-aligned neighboring alpha masks stabilize hair edges without freezing the head or adding camera zoom. Forward/reverse playback joins the poses without an abrupt end-to-start cut.

Both `hyesu-idle-hd-v1.webp` and `hyesu-hd-v1.png` come from this same processed clip. The PNG uses the open-eyed pose at frame 6, after the initial blink. Home, collection, loading, battle lobby, deathmatch and login reference the new artwork. Existing character IDs, ownership and skills are unchanged; reduced-motion, data-saving and error fallbacks retain the matching still. No additional Dreamina credits were used. The supplied MP4 and processing receipt remain in ignored `exports/character-idle-regenerated` for local provenance. Historical assets remain available for rollback.

HD validation: 1176x1764, 228 decoded frames, 9,500ms loop, 28,363,704 bytes. Every frame has transparent top corners and a preserved opaque head region. Dark/light composites were checked across start/middle/end poses. The actual local home, battle lobby and deathmatch load the HD animated asset at its native dimensions; the loading preview uses the HD static image and all five portrait boxes have equal heights. The 844x390 home has no horizontal overflow and keeps Hyesu's head visible. All 191 Node tests, build references, home parity and whitespace checks pass. This replacement is applied locally, not published in this turn. Physical-phone playback and network performance remain unmeasured; the full-resolution animation is about 28MB.

## HD v2 fringe shimmer correction

After HD v1 was published, the user reported white flashes around moving hair. Inspection covered the 115 forward frames and enlarged neutral boundary highlights. The source itself contains a bright hair rim (for example source frame 13 at x510/y43 has RGB 146/137/120); this is not a remaining full white background. Semi-transparent gray edge pixels and frame-varying reconstruction made that rim more noticeable against dark surfaces. The v1 pipeline changed alpha after reconstructing foreground RGB, leaving edge colors inconsistent with the final alpha.

HD v2 reconstructs foreground color after temporal alpha stabilization. A narrow hair boundary band limits rim luminance relative to nearby solid hair, excludes warm skin pixels, and preserves interior detail. Motion-aligned temporal median filtering also stabilizes premultiplied fringe RGB. It does not freeze the head, erode the whole silhouette, darken the whole character or introduce a camera transform. All current image references use new v2 filenames to avoid reusing cached v1 artwork. The source, native resolution, character identity and gameplay rules remain unchanged; no additional generation credits are used.

HD v2 verification: 1176x1764, 228 frames, 9,500ms, 27,635,818 bytes. The optional `--reuse-v1-alpha` mode reuses lossless v1 alpha and reconstructs RGB from the original MP4. Pixel comparison across all 228 encoded frames found zero alpha changes, so the silhouette was not cut back. Transparent corners and opaque head checks pass on every frame. Across 115 forward frames, the neutral boundary pixels above the diagnostic brightness threshold decreased from an average 309.37 to 174.76 (about 43.5%); this measures bright boundary area, not a perceived flicker rating. The internal motion-aligned color-median residual decreased from 0.633 to 0.413. Natural highlights inside the hair remain.

Dark-background before/after crops and actual 1280x720 local battle-lobby playback were inspected. Home and lobby resolve to the v2 asset at native dimensions. All 191 Node tests, build references and home parity checks pass. Physical-phone playback has not been measured. Local diagnostic results: `exports/character-idle-regenerated/hyesu-hd-v2-qa.json` and `hyesu-hd-v2-receipt.json`. No additional generation credits were used.
