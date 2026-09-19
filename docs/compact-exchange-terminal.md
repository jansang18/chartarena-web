# Compact exchange terminal — 2026-09-20

## Delivered
- Home rebuilt as charcoal/yellow exchange panels, replacing the fixed monitor-art layout. Primary controls fit normal phone landscape; no CSS scaling of the whole application.
- Three real historical BTC/ETH/SOL previews, copied from the first 70 candles of existing charts.js segments. Read-only symbol switching and six-bar change summaries. Explicitly labeled historical, normalized, and not live quotes. No fabricated market prices or player counts.
- Home rooms keep existing 1%-rate and full-wallet semantics. Existing shop, profile, records, guild, and storage retained.
- Home/records/shop use a fixed header and profile dock at >=600px; long content scrolls inside the main panel. Landscape exchange cards sit side by side.
- Battle uses chart plus right-side order controls on landscape phones and desktop. Near-square unfolded-phone sizes use a wide chart and horizontal order strip. Matching lobby also fits short-height screens.
- Gold theme applied to matching, battle controls, and shared exchange-theme surfaces. Korean up-red/down-blue candle colors and MA 5/20/60 preserved.

## Evidence
- 79 tests passing; verify-build passes; terminal-home.js syntax check; diff whitespace check.
- Verified all three embedded previews exactly match source chart segments.
- Home measured at 320x740, 390x844, 667x375, 844x390, 690x829, 829x690, 1440x900. No horizontal document overflow. Landscape/fold/desktop primary home panels fit with no main-panel vertical overflow; portrait permits normal scrolling.
- Screenshots inspected for landscape home/battle, unfolded home/battle, desktop home, portrait home, and landscape gem exchange.
- Local practice tested: matching, MA display, long + 2x + confirm, reveal and settled practice result. Owned wallet remained 45,000 after practice exit. Test profile only; no production wallet mutation.
- Shop categories and records navigation tested; local server records correctly state device-only fallback.

## Limits
- Browser viewport simulation, not physical iPhone/Galaxy Fold testing. Live multi-human Firebase match not exercised.
- 300-candle/checkpoint redesign and user mailbox are separate pending functional work, not included in this layout change.
