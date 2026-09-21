# Royal Gold presentation

Implemented the user's selected Las Vegas sample 1 on 2026-09-21.

## Scope

- Warm casino lounge backdrop, champagne-gold wordmark and frames, emerald table surfaces.
- Emerald / sapphire / burgundy home room cards with shared price and entry alignment.
- Existing five character portraits and motion assets retained.
- Matching lobby, loading, home collection, login and deathmatch use the same palette.
- Desktop battle seats two traders on each side of the chart. Compact screens retain the horizontal player strip.
- No changes to game rules, wallet logic, character IDs, authentication or settlement.
- Shared stylesheet is loaded last and versioned by scripts/version-assets.cjs. Home source remains landscape.html, mirrored to index.html.

## Asset provenance

assets/royal-gold/lounge-v1.png was generated for this implementation with the built-in image generation tool. Brief: wide luxurious Las Vegas casino salon, warm crystal chandeliers, brass architecture, dark emerald velvet, walnut and black lacquer; darker central field for readable UI; no people, text, logos or interface. The existing wordmark SVG was recolored in assets/royal-gold/wordmark-v1.svg.

## Verification

- node --test tests/*.test.cjs: 191 passed, 0 failed.
- node tests/verify-build.cjs: passed asset references, six inline scripts, shared shell and home parity.
- git diff --check: clean.
- Browser viewport checks: 390x844 portrait home and collection; 844x390 home, battle, matching lobby, login and deathmatch; 912x768 home; 1280x720 home; 1440x900 live battle.
- Verified the desktop portrait layers do not cover player names or balances.
- At 844x390 the deathmatch start button remains within the viewport; long explanatory steps are omitted at this breakpoint while settlement and forfeiture information remain visible.
- Existing local bot gameplay was used for visual checks. This is not physical-device or online multiplayer certification. Portrait pages intentionally allow vertical scrolling.

The user approved public deployment on 2026-09-21 after reviewing the local implementation. Deployment uses the repository's existing GitHub Pages source, main at the repository root.

## Dark-tone refinement and design audit

The user subsequently requested less green and a darker overall tone. The large green surfaces in the home, roster, lobby, loading, login, battle and duel now use neutral charcoal. Home cards retain restrained slate and burgundy variation; brass frames and primary action buttons provide the gold accent. The lounge background uses a darker overlay so its lighting does not compete with labels.

Fresh checks after this refinement:
- Home: 390x844 portrait, 844x390 landscape, 912x768 unfolded-tablet viewport. No horizontal overflow; at 844x390 main client/scroll heights both equal 314px. Portrait room entry buttons are 44px high.
- Live local bot battle: 1440x900 and 844x390. Player labels are unobstructed. At 844x390 the chart is within y111–299 and controls within y306–390. No browser console errors were observed on this test tab.
- Sample text/surface contrast: primary 16.36:1, muted 8.12:1, gold button darkest stop 5.87:1, room supporting text 10.45:1. These are representative palette checks, not a full accessibility certification.
- 191 automated tests passed; build verification and diff whitespace checks passed.
- Physical phones and live online multiplayer were not tested. This revision changes presentation only.
- Additional 320x740 audit found a 326px header overflow and cramped hero text. A narrow-phone rule reduced logo/price sizes, removed the duplicate hero description, and kept 44px entry actions. Recheck: document scroll width 305px inside the 320px viewport, with the scrollbar accounting for the difference; all three prices and header currency values remain visible.

## Table card typography and gold artwork

The home room selector now uses the existing 1254x1254 `assets/fx-gold-token-v2.png` in place of the 128x128 legacy coin. One, two and three coins distinguish the three tables. The card surfaces use dark charcoal, restrained warm metal borders and a single light sweep on hover or keyboard focus. Reduced-motion mode removes the sweep.

`room-cards.css` is a home-only component stylesheet, loaded after the shared theme and included in content-hash versioning. It bundles SUIT Variable for the card labels and tabular amounts. The font comes from the existing local SUIT asset; the upstream license is included at `assets/fonts/SUIT-LICENSE.txt`. Upstream project: https://github.com/sun-typeface/SUIT (SIL Open Font License 1.1).

Portrait phones use three horizontal cards with full-width entry actions inside each card. Desktop and landscape retain the three-column comparison. Coin artwork fits the available vertical space without overlapping prices or titles. Table URLs, rates and entry checks are unchanged.

Verification for this change:

- 194 Node tests passed; `node tests/verify-build.cjs` and `git diff --check` passed.
- Isolated Chromium at 2x pixel density: 1440x900, 1280x720, 960x720, 768x1024, 844x390, 667x375, 390x844 and 320x650.
- All card heights align, font and high-resolution images load, no clipped labels or horizontal overflow, and no browser runtime or failed-request errors.
- Tab navigation, visible focus and Enter navigation to the expert table work. Reduced-motion mode suppresses the decorative sweep.
- Local screenshots and detailed measurements are in the ignored `exports/room-cards-*` files. This is browser viewport QA, not physical-device or online multiplayer verification.
