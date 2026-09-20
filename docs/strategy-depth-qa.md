# Battle strategy depth — 2026-09-20

Scope: requested items 4–6, four-player battle. Login and deathmatch rules are unchanged.

## Character skills

One free activation per match, shown with the revealed choice. Seon boosts the next 30 candles by one leverage step; Yuna changes leverage at a checkpoint; Kai halves gains and losses for 30 candles; Rin uses 1x for 30 candles; Doyun makes the next 30 candles neutral. Temporary effects restore the original leverage. SWITCH retains its existing entry-price behavior.

Canonical picks validate character, timing, usage and round. Settlement persists skill use through wallet recovery. Network entries cannot submit future switches or exits. Protocol version 9 excludes older clients.

## Bot personalities and revenge

Holder, scalper, trend follower and contrarian use only candles already revealed. Three distinct personalities are selected for a local match; revenge preserves the same roster. Each bot can use its character skill.

The final recap compares a checkpoint choice against the next 30 candles of the alternative and does not modify settlement. Revenge starts a new wallet session, spends the normal play allowance, resets skills and uses new charts. Online revenge requires all human players' fresh consent, a completed match and a transaction that advances the match sequence once.

## Verification

- 191 Node tests pass, including all five skills, symmetric gain/loss effects, wallet recovery, hidden-candle access rejection, network input sanitation, local rematch and online consent/sequence behavior.
- Build verification and diff whitespace check pass.
- Actual localhost game: completed five rounds, activated Seon's skill, used STOP, observed settlement and the decisive-choice recap, then began revenge with the same three bots and a fresh skill allowance.
- 844×390 actual game: chart, choices and header fit. 390×844 and 844×390 final-result visual fixture: recap and revenge controls fit; the narrow header was corrected after an overflow was found.
- Home and collection skill descriptions checked in the browser.

Limits: local testing deliberately does not connect to production Firebase. Four simultaneous real human clients and physical phones have not been tested. Online coordination has automated coverage, not a live multiplayer certification.
