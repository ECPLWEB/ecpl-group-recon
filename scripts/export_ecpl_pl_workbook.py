"""
Export ECPL P&L workbook (CA Excel) to cleaned JSON under public/data/snapshots/ecpl_fy2526/.

Usage (from repo root):
  python scripts/export_ecpl_pl_workbook.py "C:\\Users\\...\\Downloads\\PL_Apr to Feb_26_ECPL.xlsx"

If no path is passed, uses DEFAULT_XLSX below (edit for your machine).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "public" / "data" / "snapshots" / "ecpl_fy2526"

DEFAULT_XLSX = Path(r"C:\Users\Nakul Mehta\Downloads\PL_Apr to Feb_26_ECPL.xlsx")


def num(v) -> float | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def main(xlsx: Path) -> None:
    if not xlsx.is_file():
        raise SystemExit(f"Missing file: {xlsx}")

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "source_file": str(xlsx.resolve()),
        "reconciliation_display_source": f"ECPL P&L workbook | {xlsx.name}",
        "period_label": "1-Apr-2025 to 28-Feb-2026",
        "authority_note": "ECPL operating expenses for this window are taken from this P&L (and backing sheets in the same workbook). Use this as the main expense total unless superseded by a signed statutory filing.",
    }
    (OUT / "export_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Main P&L ---
    raw = pd.read_excel(xlsx, sheet_name="P&L_Apr To_Feb_26_ECPL", header=None)
    lines = []
    for i in range(2, len(raw)):
        row = raw.iloc[i]
        part = row[0]
        lvl = row[1]
        amt = num(row[2])
        pct = num(row[3])
        per_m = num(row[4])
        if part is None or (isinstance(part, float) and pd.isna(part)):
            continue
        p = str(part).strip()
        if not p:
            continue
        lines.append(
            {
                "line_order": len(lines),
                "particulars": p,
                "level": None if pd.isna(lvl) else int(lvl) if str(lvl).isdigit() else str(lvl),
                "amount_inr": amt,
                "pct_of_gross_sales": pct,
                "per_month_inr": per_m,
            }
        )

    pl_main = {
        **meta,
        "sheet": "P&L_Apr To_Feb_26_ECPL",
        "pl_lines": lines,
    }
    (OUT / "pl_main.json").write_text(
        json.dumps(pl_main, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Monthly expenses (cleaned) ---
    me = pd.read_excel(xlsx, sheet_name="Monthly Exp_ Apr To_Feb_26", header=None)
    monthly_rows = []
    for i in range(2, min(15, len(me))):
        r = me.iloc[i]
        name = r[0]
        typ = r[1]
        if pd.isna(name) and pd.isna(typ):
            continue
        totals = []
        for c in range(2, 14):
            totals.append(num(r[c]))
        ttot = num(r[13]) if len(r) > 13 else None
        if pd.isna(name) or str(name).strip() == "":
            continue
        monthly_rows.append(
            {
                "expense_line": str(name).strip(),
                "type": None if pd.isna(typ) else str(typ).strip(),
                "monthly_amounts_inr": totals,
                "row_total_inr": ttot,
            }
        )

    monthly = {**meta, "sheet": "Monthly Exp_ Apr To_Feb_26", "rows": monthly_rows}
    (OUT / "monthly_expenses.json").write_text(
        json.dumps(monthly, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Sales register summary ---
    sr = pd.read_excel(xlsx, sheet_name="Sales Register_Apr_25_To_Feb_26", header=0)
    sr2 = sr[sr["Particulars"].notna() & (sr["Particulars"].astype(str) != "Grand Total")]
    gross = pd.to_numeric(sr2["Gross Total"], errors="coerce").sum()
    val = pd.to_numeric(sr2["Value"], errors="coerce").sum()
    cgst = pd.to_numeric(sr2.get("CGST 9% (S)"), errors="coerce").sum()
    sgst = pd.to_numeric(sr2.get("SGST 9% (S)"), errors="coerce").sum()
    igst = pd.to_numeric(sr2.get("IGST 18 % (S)"), errors="coerce").sum()
    sales_summary = {
        **meta,
        "sheet": "Sales Register_Apr_25_To_Feb_26",
        "data_rows_excl_grand_total": int(len(sr2)),
        "sum_gross_total_inr": gross,
        "sum_value_inr": val,
        "sum_cgst_9_inr": cgst,
        "sum_sgst_9_inr": sgst,
        "sum_igst_18_inr": igst,
        "matches_pl_gross_sales": bool(abs(gross - 47345661.07) < 1),
    }
    (OUT / "sales_register_summary.json").write_text(
        json.dumps(sales_summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Purchase register summary ---
    pr = pd.read_excel(xlsx, sheet_name="Purchase Register_Apr25_To_Feb", header=0)
    pr2 = pr[pr["Particular"].notna() & (pr["Particular"].astype(str) != "Grand Total")]
    pr2 = pr2.copy()
    pr2["gross"] = pd.to_numeric(pr2["Gross Total"], errors="coerce")
    pr2["pacct"] = pd.to_numeric(pr2["PURCHASE ACCOUNT"], errors="coerce")
    sum_gross = pr2["gross"].sum()
    sum_pacct = pr2["pacct"].sum()
    vt_na = pr2["Voucher Type"].isna().sum()
    sum_gross_na_vt = pr2.loc[pr2["Voucher Type"].isna(), "gross"].sum()
    sum_gross_purchase_vt = pr2.loc[pr2["Voucher Type"] == "Purchase", "gross"].sum()

    purchase_summary = {
        **meta,
        "sheet": "Purchase Register_Apr25_To_Feb",
        "data_rows_excl_grand_total": int(len(pr2)),
        "sum_gross_total_all_rows_inr": sum_gross,
        "sum_purchase_account_col_inr": sum_pacct,
        "pl_add_purchase_accounts_inr": 20864127.47,
        "delta_pacct_vs_pl_inr": sum_pacct - 20864127.47,
        "rows_with_blank_voucher_type": int(vt_na),
        "gross_total_on_blank_voucher_type_inr": sum_gross_na_vt,
        "gross_total_voucher_type_purchase_only_inr": sum_gross_purchase_vt,
        "note": "P&L purchase line aligns with PURCHASE ACCOUNT column total (~₹2.08 cr), not the sum of Gross Total across all rows.",
    }
    (OUT / "purchase_register_summary.json").write_text(
        json.dumps(purchase_summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Nakul indirect sheet ---
    nk = pd.read_excel(xlsx, sheet_name="Indirect exp_paid by Nakul M.", header=None)
    nak_lines = []
    for i in range(2, len(nk)):
        r = nk.iloc[i]
        part = r[0]
        typ = r[1]
        amt = num(r[2])
        per = r[3]
        if part is None or pd.isna(part) or str(part).strip() == "":
            if amt is not None:
                nak_lines.append(
                    {
                        "particulars": "(subtotal / continuation)",
                        "type": None if pd.isna(typ) else str(typ),
                        "amount_inr": amt,
                        "period_note": None if pd.isna(per) else str(per),
                    }
                )
            continue
        nak_lines.append(
            {
                "particulars": str(part).strip(),
                "type": None if pd.isna(typ) else str(typ),
                "amount_inr": amt,
                "period_note": None if pd.isna(per) else str(per),
            }
        )

    nak = {**meta, "sheet": "Indirect exp_paid by Nakul M.", "lines": nak_lines}
    (OUT / "nakul_indirect.json").write_text(
        json.dumps(nak, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- Sales cross-check (printed invoices — run separately if CSV path exists) ---
    inv_path = Path(
        r"C:\Users\Nakul Mehta\Downloads\New folder\ecpl_invoices_consolidated_master_tagged.csv"
    )
    cross = {
        **meta,
        "sheet": "(external) printed invoices CSV",
        "pl_gross_sales_inr": 47345661.07,
        "pl_period_end": "2026-02-28",
    }
    if inv_path.is_file():
        inv = pd.read_csv(inv_path)
        inv["d"] = pd.to_datetime(inv["invoice_date_iso"], errors="coerce")
        amt = pd.to_numeric(inv["INVOICE_AMOUNT"], errors="coerce")
        cut = pd.Timestamp("2026-02-28")
        cross["printed_invoices_all_inr"] = float(amt.sum())
        cross["printed_invoices_on_or_before_pl_end_inr"] = float(amt[inv["d"] <= cut].sum())
        cross["printed_invoices_after_pl_end_inr"] = float(amt[inv["d"] > cut].sum())
        cross["invoice_count_after_pl_end"] = int((inv["d"] > cut).sum())
        cross["delta_pl_minus_printed_through_period_inr"] = (
            47345661.07 - float(amt[inv["d"] <= cut].sum())
        )
    else:
        cross["note"] = f"Printed invoice CSV not found at {inv_path}; fill manually."

    (OUT / "sales_crosscheck_printed.json").write_text(
        json.dumps(cross, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"Wrote JSON under {OUT}")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    main(path)
