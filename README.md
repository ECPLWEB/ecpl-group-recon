# ecpl-group-recon

Static data + a small **Vite** front-end for cross-party reconciliation (Space Within, ECPL, STPL, Nakul). Everything under `public/data/` is fetched at runtime — no API.

## Quick start

```bash
npm install
npm run dev
```

Open **`http://localhost:5173/ecpl-group-recon/`** (trailing slash matters). Click **Load preview** on a dataset to fetch a sample file.

```bash
npm run build
npm run preview
```

Output is in `dist/` — deploy that folder to GitHub Pages, Netlify, or any static host.

## Data layout

| Path | Purpose |
|------|---------|
| `public/data/manifest.json` | List of datasets (title, path, format). |
| `public/data/samples/` | Built-in examples. |
| `public/data/snapshots/` | Your real CSV/JSON exports (add manifest entries). |

**GitHub Pages:** `vite.config.ts` uses `base: '/ecpl-group-recon/'` for Project Pages at `https://<your-username>.github.io/ecpl-group-recon/`.

1. Repo **Settings → Pages → Build and deployment**: source **GitHub Actions**.
2. Push to `main` or `master`; workflow **Deploy to GitHub Pages** builds and publishes `dist/`.

For local dev, assets still load correctly; Vite serves with the same `base`.

## Rules (project context)

- **Printed ECPL sales** override Tally sales when they differ.
- Copy tagged masters from `Downloads\ORIGINALS` into `public/data/snapshots/` as CSV/JSON; avoid committing raw XLSX/PDF (see `.gitignore`).
