# ChartArena unified redesign — 2026-09-20

Local preview: http://127.0.0.1:8035/index.html

## Implemented

- One navy, ivory, coral and muted-gold presentation for onboarding, home, table selection, matching, battle, results and collection/exchange.
- Five original adult trader cutouts: Seon, Yuna, Kai, Rin and the additional male trader Doyun. No cyberpunk theme.
- Home prioritizes character selection and three stake rooms, with practice and personal records alongside. Historical chart preview is secondary.
- Desktop battle places portraits beside the chart; landscape phones use a compact player strip and controls below the chart. Portrait phones and foldable proportions adapt without horizontal overflow.
- Shared character catalog resolves all legacy selections to the new five traders without changing balances or owned-item records. The old collection menu is removed. Footer, guild and matchmaking use the same new artwork.
- Matches now end after three rounds. Both round validation and the battle UI use ArenaRules.ROUNDS. Matchmaking protocol v5 separates three-round clients from previous five-round rooms. MA controls, leverage and virtual-wallet settlement remain intact.
- Home and battle share a new five-trader loading introduction. The old image background and hidden-logo rules were removed; matching placeholders use new portraits.
- Keyboard-operable onboarding and character selection; reduced-motion and higher-contrast fallbacks.

## Validation

- Browser: completed the final three-round practice flow, character selection persistence, first-run setup, gem-to-gold exchange and matching with local bots.
- Checked 1440×900 desktop, 844×390 landscape phone, 390×844 portrait phone, 320×740 first-run and 690×829 foldable-proportion battle viewports. These are browser viewport simulations, not physical-device certification.
- Portrait leverage controls end above the confirmation button, with the entire game inside 390×844.
- Automated character migration/asset checks supplement the existing wallet, gameplay and build suite.
- Commands: `node --test tests/*.test.cjs`, `node tests/verify-build.cjs`, `git diff --check`.

## Boundaries

Release target: https://jansang18.github.io/chartarena-web/ (GitHub Pages, main branch). Firebase human multiplayer was not verified. Character skill mechanics, Dreamina animation, mailbox and 300-candle Go/Stop rounds are not implemented by this redesign. Character images are static sprites.

Follow-up validation: a local practice match ended at ROUND 3 / 3 and retained the actual wallet. Browser checks confirmed only the five new traders in collection and the selected new portrait beside the level. Unit tests cover three-round wallet settlement, fourth-round rejection, old-client exclusion and legacy portrait rendering. Static intro preview: `loading-preview.html`.

Edit `landscape.html` first, copy it to `index.html`, then run `node scripts/version-assets.cjs` whenever shared assets change.

## Surface polish follow-up

- Raised metallic edges, top lighting, lower bevels and press-state inset shadows unify home room cards, table choices and game controls. No hover/press translation; reduced-motion disables the brief selection highlight.
- Table descriptions use a reserved two-line area. At 860×652, switching practice to expert previously moved the heading and CTA by about 10px; after the fix their bounds match exactly. The CTA also remains fixed at 390×844. The 844×390 home and lobby fit without horizontal overflow.
- Selection restores keyboard focus without scrolling after the cards render again.
