# Task: Deploy ER Ops Console to Vercel

Static site — `index.html` plus runtime-fetched assets (`data/`, `maps_er/`, `models/`, `assets/`, `src/vendor/three/`). Deploy the whole folder as-is. No build step.

```bash
cd er-ops-console
vercel link --yes --project er-ops-console   # scope: builtgrowth45's projects
vercel deploy --prod
```

Settings if asked: Framework = Other, no build command, output dir = `.` (root).

Done when the assigned URL (e.g. https://er-ops-console.vercel.app) renders the ER Ops Console (dark tactical UI, armor slots, 3D character).
