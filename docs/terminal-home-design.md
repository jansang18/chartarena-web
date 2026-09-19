# Trader terminal home — approved concept 05

Implemented 2026-09-19. Home only; retains all existing wallet, room rates, profile and record behavior. The center chart is labeled decorative example data. No fake online count, leaderboard or market feed is shown.

## Artwork
Built-in image_gen edit, approved concept 05 reference. Runtime asset: assets/terminal-floor-v1.webp (WebP encoding of generated artwork).

Prompt:
Create production background artwork based closely on this approved trading cockpit image. Preserve photorealistic premium game environment, dark metal desk, mint keyboard illumination, warm Manhattan trading floor lights and skyline, bull statue at far left, beautiful black monitor hardware. Remove ALL text, ALL letters, ALL numbers, ALL UI, logos, chart graphics, buttons and screen content throughout the whole image. Screens are clean nearly-black glass with extremely faint mint reflections only. Main monitor front-facing large rectangle centered spanning 20% to 79% image width, from 17% to 81% image height. Smaller angled monitor left occupying left 19%, and smaller angled monitor right occupying right 20%. Keyboard/desk bottom 18%. Background buildings and lights top 17%. Main display must be unobstructed, straight-on usable rectangle, not heavily curved. No persons, no watermark, no fictional labels, no typography ANYWHERE including walls and papers. 16:9 landscape, highest quality realistic cinematic rendered game environmental asset. This will have real HTML UI overlaid, so empty monitor screens are mandatory.

## Verification
- Local screenshots at 1440x1000, 390x844, 320x650, 829x565.
- 320/390/829 viewport checks: document scrollWidth <= innerWidth.
- Record button opens existing local record view.
- Standard room link opens battle lobby with standard selected and wallet 35,000 G preserved.
- No live matching or settlement retest in this presentation-only change.
- Existing test suite and inline build/asset validation run before deployment.
