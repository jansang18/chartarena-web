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
