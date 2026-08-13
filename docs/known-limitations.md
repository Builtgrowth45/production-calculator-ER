# Known limitations

This public release is intentionally local-first. The following limitations are explicit:

- There is no login, shared guild database, Cloudflare API, remote analytics endpoint, or real-time collaboration.
- Player profiles, inventories, plans, requests, gear, preferences, analytics events, and world context live in the current browser unless exported.
- Colony owners, taxes, faction policies, transport assumptions, drift, and slot settings are user-maintained context; the app does not claim they are live game truth.
- Faction return policies are not generalized from CMG to every faction. Invalid or unknown policies produce no return.
- Unaffiliated mode reports gross-cost behavior and does not invent ownership or rebates.
- Production-time estimates and live market/ownership feeds are not provided.
- The service worker can retain an older static asset until the browser completes an update cycle. Reload with network access after a release if behavior appears stale.
- The real-browser fallback verifies rendered production artifacts, but the Hermes interactive browser harness was unavailable during this audit. Full interactive assistive-technology traversal remains a follow-up QA item when that harness is available.
- Game-derived names, data, and assets retain separate rights-holder status. They are not automatically covered by the MIT license for application code.
- Public data can be corrected as authoritative game information changes. Include source, date, and a minimal reproducible example when reporting an issue.
