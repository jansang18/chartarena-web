# Royal Play Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved work in the current checkout. Native implementation; one independent review before release.

**Goal:** Make choices, results and repeat play feel like one dark Royal Lounge game.

**Architecture:** Preserve the existing virtual-gold rules and multiplayer protocol. Add isolated presentation/review and mastery modules, then prototype three character strategies in a saved solo club tour using the existing chart data and bot personas.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Web Audio, node:test, Playwright.

**Spec:** The user's approved six-part recommendation in this task: consistent design, decision feedback, chart review, three initial character strategies, cosmetic mastery, and a club tour with tactical choices.

## Global Constraints

- Charcoal and gold; little green; stable supplied portraits without forced zoom.
- Existing character IDs, saves, wallet arithmetic and 15-second decisions remain compatible.
- Tour strategies first apply to solo tour; no multiplayer rule or wallet migration.
- Club tour uses run points, no wallet or energy charge. Three opponents, one of three tactics between victories, refresh-safe continuation.
- Cosmetic mastery never modifies competitive stats. Unlock signature quote, gold frame and victory lighting using the supplied pose.
- Edit landscape.html and copy to index.html; hash shared resources; never stage unrelated files.

## Review Focus

- SWITCH at two different leverages and STOP must remain exact in review.
- Reload/duplicate finish must not award mastery twice.
- Tour reload during reveal or decision must preserve the decision and deadline.
- Two tabs must not overwrite a newer tour revision.
- Small landscape screens, muted sound and reduced motion remain usable.

### Task 1: Review, sound, visual consistency

**Files:** battle-review.js/css, arena-feedback.js, royal-play.css, quiz-battle.html, landscape.html, index.html, deathmatch.html.

**Interfaces:** ArenaReview.build({initial,history,segment}) returns settled rounds and exact legs; ArenaReview.open(report) opens a keyboard-accessible post-match dialog. ArenaFeedback.play(kind), pulse(element,kind), mount(parent).

- [x] Write and run tests/battle-review.test.cjs for changed leverage, STOP, missing entry and immutable source history; expect missing-module failure.
- [x] Implement pure review data plus chart/round selector and per-leg ledger. Open only from final results.
- [x] Add low-volume gesture-unlocked sound with persistent mute; fixed-camera chip/switch feedback.
- [x] Unify SUIT typography and charcoal result hierarchy. Verify 320px portrait and 667px landscape.

### Task 2: Character mastery

**Files:** character-mastery.js, tests/character-mastery.test.cjs, home and final result integrations.

**Interfaces:** ArenaMastery.award(old,outcome) is pure and idempotent by match ID; record(outcome) serializes local storage; summary(character), render(element,character).

- [x] Test duplicate matches, independent characters, malformed storage and win/comeback/escape milestones; expect missing-module failure.
- [x] Implement cosmetic progress; show next reward on home, apply unlocked frame/lighting, award completed battles and tours once.

### Task 3: Three strategy club tour

**Files:** club-tour-rules.js, club-tour.html/js/css, tests/club-tour.test.cjs.

**Interfaces:** create(id,character,segments,now), commit(run,choice,botChoice,now), reveal(run,chart,now), choose(run,tactic,now), score(run,chart,through), validate(run).

- [x] Test deterministic 3-room progression, action eligibility, reversible strategy risk, locked rewards, refresh reconstruction and non-mutating state.
- [x] Implement Sera GO amplification, Chaerin SWITCH amplification and Taeo loss limit with reduced upside. Each signature is once per encounter.
- [x] Build three-room UI with visible-only bot input, 15-second decisions, incremental candle reveal, revision-checked persistence, review and home entry.

### Task 4: Verify and publish

- [x] Run node scripts/version-assets.cjs, node --test tests/*.test.cjs, node tests/verify-build.cjs and git diff --check.
- [x] Isolated browser: full battle and review, sound/mute, mastery repeat, tour win/loss/reload/two-tabs, responsive screens and console errors.
- [x] Independent review while runtime QA proceeds; fix material issues, record evidence in UPDATE-NOTES.md.
- Release procedure: selectively commit this change, push HEAD:main, then compare live resource hashes against the committed files. The post-push verification writes exports/royal-play-live.json.

## Independent review disposition

One independent read-only review found four material issues; all were fixed in one follow-up pass:

- Stale tour creation could replace a newer save while loading: capture the expected revision before loading and compare it inside the lock. Actual start-handler regression passed.
- Defensive tactics reduced a missed-entry penalty: missed entry now remains exactly -1,000 points and has no fake trade legs. Rules and browser regression passed.
- Rematch errors appeared behind the native result dialog: energy and gold failures now appear within the result. Browser regressions passed.
- Inconsistent saved phases and malformed history could resume: phase/receipt validation rejects them. Restore regressions passed.

Verification: 227 node tests and build/reference/home-parity checks passed. The isolated browser suites cover changed leverage receipts, rematch, all three signatures, a complete three-table win, loss, missed entry, reload/deadline, stale tabs, mastery deduplication, wallet isolation, audio mute, reduced motion, and 320/390/667/960/2002px layouts. Synthetic rising charts are confined to browser test fixtures.

Repeat against the local server with node tests/royal-play.browser.cjs, node tests/club-tour.browser.cjs and node tests/royal-layout.browser.cjs. These write screenshots/JSON to ignored exports/. Playwright can be installed normally or resolved from the bundled Codex runtime.

Production two-account Firebase play and long-term skill balance are separate follow-up work; competitive v11 rules and wallet math were not changed. Mastery/tour state is local to this device.
