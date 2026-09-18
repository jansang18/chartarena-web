# Percentage-based four-player battle

Approved in chat: signed chart movement in percentage points × room gold per 1% × leverage. A 1% correct direction at 1,000 gold per 1% and 10x earns 10,000 gold; the opposite loses 10,000, limited by match funds. Remove allocation presets and extra tactical multipliers. Keep four-player cumulative standings, five rounds, one pass, default 1x and optional 2/3/5/10x.

Rooms: practice (100 simulated gold per 1%, no wallet change), beginner (100), standard (1,000), expert (10,000). Paid rooms reserve 20 times their rate on entry, identically for all players. Reserve is not a fee: unused funds and earnings return on completion or exit. Wallet may never go below zero. Missing choices earn/lose zero. Exhausted players spectate. No rank reward on top of formula.

Store reserved funds, completed rounds, and the final calculation for a confirmed pending round together with the existing wallet in one localStorage document. Reload/exit settles confirmed choices and returns remaining funds once. A second tab recovers the old session and invalidates its owner. Existing unrelated wallet fields and saves are retained. This remains the app's existing local virtual-gold economy, not a server-authoritative wallet.

Online matches must use rules version 3 and the same table; do not mix previous rules. Existing Firebase authorization failure remains external; bots use identical rules and are labeled. No permission widening.

UI: room cards show rate and maximum net loss/required balance; game shows room rate, selected leverage, current signed percentage and gold equation. Phone controls remain compact with direction and leverage adjacent. Home and battle retain their current visual theme.
