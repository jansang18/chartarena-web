# Full-wallet battle correction — 2026-09-20

User approved using all owned virtual gold. Room tiers now determine only gold per percentage point. Any positive balance can enter paid rooms. Practice continues with fictional capital and never changes the wallet.

At match start all available wallet gold is reserved atomically, and both the local player's displayed state and persisted settlement state start with that amount. Loss is capped to remaining gold. Existing pending v3 matches still close using their saved state and preserve the unreserved wallet.

Online v4 matchmaking publishes each human player's starting gold. Every client initializes remote participants with the same amounts. A balance changed during matchmaking requires rematching. Versioned rooms prevent mixing v3 and v4 rules.

Verification: 75 tests, including purchased 75,000 gold -> 20,000 loss -> 55,000 still playable, zero-only bankruptcy, low-balance entry, old wallet recovery, unequal online wallets, and actual initMatch/renderCtrl execution. Browser localhost check uses the existing test profile, separate from production. Live multi-human Firebase play was not tested.
