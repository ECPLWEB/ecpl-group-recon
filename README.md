# ecpl-group-recon

Static data + a small **Vite** front-end for cross-party reconciliation (Space Within, ECPL, STPL, Nakul). Everything under `public/data/` is fetched at runtime — no API.

## Run and build locally (simplest path)

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** — click **Load preview** on a dataset.

Production build + local preview (serves the `dist/` folder):

```bash
npm run build
npm run preview
```

Then open the URL Vite prints (usually **http://localhost:4173/**).

## Data layout

| Path | Purpose |
|------|---------|
| `public/data/manifest.json` | List of datasets (title, path, format). |
| `public/data/samples/` | Built-in examples. |
| `public/data/snapshots/` | Your real CSV/JSON exports (add manifest entries). |

## Git branch

Use **`main`** as the default branch. Older clones may still have `master`; rename locally with:

```bash
git branch -m master main
git fetch origin
git branch -u origin/main main
```

## GitHub Pages (optional)

`vite.config.ts` uses base `/ecpl-group-recon/` **only when** `GITHUB_ACTIONS=true` (the deploy workflow). Local builds keep `base: "./"`.

1. Repo **Settings → Pages → Build and deployment**: source **GitHub Actions**.
2. Push to **`main`**; workflow **Deploy to GitHub Pages** builds and publishes `dist/`.

Site URL: `https://ecplweb.github.io/ecpl-group-recon/` (org Project Pages).

## Rules (project context)

- **Printed ECPL sales** override Tally sales when they differ.
- Copy tagged masters from `Downloads\ORIGINALS` into `public/data/snapshots/` as CSV/JSON; avoid committing raw XLSX/PDF (see `.gitignore`).
