# ecpl-group-recon

Static data + a small **Vite** front-end for cross-party reconciliation (Space Within, ECPL, STPL, Nakul). Everything under `public/data/` is fetched at runtime — no API.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Click **Load preview** on a dataset to fetch a sample file.

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

**GitHub Pages:** if the site is not at the domain root, set `base` in `vite.config.ts` to your repo path (e.g. `/ecpl-group-recon/`) before `npm run build`.

## Rules (project context)

- **Printed ECPL sales** override Tally sales when they differ.
- Copy tagged masters from `Downloads\ORIGINALS` into `public/data/snapshots/` as CSV/JSON; avoid committing raw XLSX/PDF (see `.gitignore`).
