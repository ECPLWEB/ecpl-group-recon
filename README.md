# ecpl-group-recon

Static data + a small **Vite** front-end for cross-party reconciliation (Space Within, ECPL, STPL, Nakul). Everything under `public/data/` is fetched at runtime — no API.

## Run and build locally (simplest path)

```bash
npm install
npm run dev
```

Open **http://localhost:5173/**. Tabs: **Overview**, **ECPL P&L** (full cleaned statement + sibling workbook JSON), **Parties & sources**, **Questions** (each answer can **open reconciled snapshots** via buttons), **All data files** (every manifest entry with table/JSON views).

### ECPL P&L → JSON (regenerate after Excel changes)

```bash
python scripts/export_ecpl_pl_workbook.py "C:\path\to\PL_Apr to Feb_26_ECPL.xlsx"
```

Outputs under **`public/data/snapshots/ecpl_fy2526/`**. The script can also refresh **printed-invoice cross-check** if the tagged CSV path in the script exists.

### Space Within P&L → JSON (FY 24-25 workbook)

```bash
python scripts/export_sw_pl_workbook.py "C:\path\to\Space within_P&L Account_Oct to March 25_260108.xlsx"
```

Outputs under **`public/data/snapshots/sw_fy2425/`**.

### Gaps & bank checklist

Editable **`public/data/reconciliation_gaps.json`** drives the **Gaps & bank** tab (six expense lines, missing files, unreconciled-bank workplan). It is also a manifest dataset for evidence buttons.

Edit **`public/data/registry.json`** and **`public/data/reconciliation_questions.json`** (`evidence[]` links questions to **`manifest.json`** `id` values).

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
