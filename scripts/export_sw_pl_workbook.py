"""
Export Space Within P&L workbook summary (no petty/salary detail sheets) to JSON.

Usage:
  python scripts/export_sw_pl_workbook.py "C:\\path\\to\\Space within_P&L Account_Oct to March 25_260108.xlsx"
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "public" / "data" / "snapshots" / "sw_fy2425"

DEFAULT = Path(r"C:\Users\Nakul Mehta\Downloads\Space within_P&L Account_Oct to March 25_260108.xlsx")


def num(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main(xlsx: Path) -> None:
    if not xlsx.is_file():
        raise SystemExit(f"Missing: {xlsx}")

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "source_file": str(xlsx.resolve()),
        "reconciliation_display_source": f"Space Within P&L workbook | {xlsx.name}",
        "financial_year_label": "2024-25",
        "period_note": "Workbook title Oct–Mar 25; reconciliation window per stakeholder: from 15-Sep-2024. SW operating expenses in books through 30-Jun-2025 only — none after (activity on ECPL).",
        "sw_expenses_cessation": "2025-06-30",
    }
    (OUT / "export_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Formal P&L sheet (Oct 24 – Mar 25)
    raw = pd.read_excel(xlsx, sheet_name="P&L_Oct 24 to Mar 25_Space", header=None)
    lines = []
    for i in range(2, len(raw)):
        row = raw.iloc[i]
        part = row[0]
        if part is None or (isinstance(part, float) and pd.isna(part)):
            continue
        p = str(part).strip()
        if not p:
            continue
        lines.append(
            {
                "line_order": len(lines),
                "particulars": p,
                "level": None if pd.isna(row[1]) else int(row[1]) if str(row[1]).isdigit() else str(row[1]),
                "amount_inr": num(row[2]),
                "pct_of_gross": num(row[3]),
                "per_month_inr": num(row[4]),
            }
        )

    pl = {**meta, "sheet": "P&L_Oct 24 to Mar 25_Space", "pl_lines": lines}
    (OUT / "sw_pl_main_oct_mar25.json").write_text(
        json.dumps(pl, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Revised summary sheet (high-level, no line detail)
    rev = pd.read_excel(xlsx, sheet_name="Revised PL_Oct to Mar 25", header=None)
    revised_rows = []
    for i in range(1, len(rev)):
        r = rev.iloc[i]
        sr = r[0]
        desc = r[1]
        if desc is None or (isinstance(desc, float) and pd.isna(desc)):
            continue
        revised_rows.append(
            {
                "sr": sr,
                "description": str(desc).strip(),
                "base_amount": num(r[2]),
                "gst": num(r[3]),
                "total": num(r[4]),
                "remarks": None if pd.isna(r[5]) else str(r[5]).strip(),
            }
        )

    rev_out = {**meta, "sheet": "Revised PL_Oct to Mar 25", "summary_rows": revised_rows}
    (OUT / "sw_revised_pl_summary.json").write_text(
        json.dumps(rev_out, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT)
