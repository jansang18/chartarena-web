# Percentage Gold Implementation Plan

**Goal:** Replace portfolio-allocation scoring with the approved percentage × room rate × leverage virtual-gold settlement.
**Architecture:** Pure deterministic rules and wallet transitions in battle-rules.js; existing battle page owns rendering and persistence. Matchmaking isolates versioned tables.
**Tech Stack:** Plain browser JavaScript/CSS; Node test runner; existing Firebase compat client.
**Spec:** docs/superpowers/specs/2026-09-19-percent-gold.md

## Global constraints
- Preserve owned assets, user saves, home parity, and mobile-focused controls.
- Default leverage 1; selectable 2/3/5/10; one free pass; no extra risk/power multiplier or rank gold award.
- Do not initialize production Firebase on localhost or change server security rules.

## Task 1: Rules and wallet
- [x] Write tests in tests/battle-rules.test.cjs and tests/percent-gold.test.cjs for +1%/10x=10,000, short symmetry, fractional returns, capped losses, bankruptcy, invalid inputs, duplicate rounds, reservation, pending-round recovery, and exactly-once close.
- [x] Run `node --test tests/battle-rules.test.cjs tests/percent-gold.test.cjs` and confirm failures against old rules.
- [x] Implement TABLES/table/create/choice/profit/settle and walletOpen/walletRound/walletClose in battle-rules.js, with integer gold and atomic document transitions.
- [x] Run the focused rules/wallet tests.

## Task 2: Battle integration and rooms
- [x] Replace obsolete controls in quiz-battle.html with rate explanation and live equation. Add room selection, eligibility, reserve and settlement integration at start/confirm/reveal/exit/recovery.
- [x] Version rooms and validate selected table both in candidate filtering and transaction reread. Keep asynchronous cancellation protections.
- [x] Update tests/battle.test.cjs, tests/leverage-ui.test.cjs, tests/battle-online.test.cjs to exercise new rules and actual handlers; add matching isolation cases.
- [x] Style room cards and equation in gameplay.css. Remove no-longer-used strategy CSS.

## Task 3: Verification and delivery
- [x] Run asset versioning, all tests, verify-build and diff checks.
- [x] Verify desktop and narrow phone/Fold screenshots, table selection and eligibility, default/selected leverage, actual formula, exit/reload recovery, final result, and absence of browser exceptions.
- [x] Update UPDATE-NOTES.md and prepare the scoped commit.
- [ ] Push authorized site update and verify Pages success and local/live content hashes.

Verification: 69 Node tests pass; inline scripts/assets/home parity pass; diff check clean. Browser QA: 320x650, 390x780, 829x565, 1440x1000. Standard room +2.553% at 10x settled +25,530; saved balance 25,800 to 51,330. A subsequent confirmed adverse round/reload capped loss at 20,000 and left 31,330. Practice completed five rounds with +1,672 simulated gold and unchanged 31,330 wallet. Mobile result overlay was widened after screenshot review. Real four-human server matching is not verified.
