# Battle presentation update — 2026-09-20

Implemented in order: simultaneous decision disclosure, live standings/overtaking feedback, then staged candle pacing. Scope is the four-player battle; login and deathmatch rules are unchanged.

- Each of the three decision stages shows all resolved choices together for 1.8 seconds, including leverage, GO, SWITCH, STOP and already stopped positions.
- Live standings use cumulative match profit plus only the revealed portion of the current round. Seats stay fixed. Equal scores share ranks; the HUD shows the gap to the nearest higher score. Overtaking notices are throttled and expire; the result hides the HUD to avoid colliding with chart identification.
- Each 30-candle segment uses 24 × 180 ms, 3 × 360 ms, then 700/1000/1600 ms. Including disclosure, each segment lasts 10.5 seconds. The shared timestamp drives catch-up after throttled/background tabs. Reduced motion preserves timing and disables decorative effects.
- Five rounds, 15-second decisions, GO/STOP/SWITCH accounting, pass and missed-entry penalties are preserved.

Validation: presentation unit tests, real inline reveal engine with a fake clock, existing wallet/switch/recovery tests, build verification and asset hash checks. Browser smoke test on localhost:8035 with bots: 390×844, 844×390, 829×565 and 1440×900. Observed initial disclosure, SWITCH to short, STOP at 60, fixed settlement at 90, and transition to the next round. No horizontal overflow on measured portrait/Fold/desktop viewports; controls remained at the viewport bottom. Browser console showed no warnings/errors during that run.

Limits: four simultaneous human clients and physical mobile devices were not tested. Choice concealment is a UI presentation behavior; this does not add server-side hidden commitments or anti-cheat. Local QA used the separate localhost profile, not the live player's wallet.
