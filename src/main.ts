import "./style.css";

type DatasetFormat = "json" | "csv";

type DatasetView =
  | "ecpl_pl_table"
  | "ecpl_monthly"
  | "key_values"
  | "nakul_lines"
  | "bank_lines"
  | "gap_report"
  | "plain_json";

type ManifestDataset = {
  id: string;
  title: string;
  description: string;
  path: string;
  format: DatasetFormat;
  source_note?: string;
  view?: DatasetView;
};

type Manifest = {
  updated: string;
  coverage_note: string;
  datasets: ManifestDataset[];
};

type SourceStatus =
  | "ready_off_repo"
  | "partial"
  | "derivable"
  | "needs_tagging";

type RegistrySource = {
  id: string;
  label: string;
  typical_path: string;
  covers: string;
  status: SourceStatus;
  in_app_manifest: boolean;
};

type RegistryParty = {
  id: string;
  short_name: string;
  legal_name: string;
  role: string;
  sources: RegistrySource[];
};

type Registry = {
  updated: string;
  introduction: string;
  parties: RegistryParty[];
  reconciliation_principles: string[];
};

type QuestionStatus =
  | "blocked"
  | "answered_partial"
  | "manual_review"
  | "advisory";

type QuestionFigure = {
  label: string;
  value: string;
  note: string;
};

type EvidenceLink = {
  dataset_id: string;
  label: string;
};

type ReconciliationQuestion = {
  id: string;
  title: string;
  status: QuestionStatus;
  summary: string;
  figures: QuestionFigure[];
  data_sources: string[];
  gaps: string[];
  advice: string;
  evidence?: EvidenceLink[];
};

type QuestionsFile = {
  updated: string;
  disclaimer: string;
  questions: ReconciliationQuestion[];
  suggestions_next_steps: string[];
};

function dataUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}data/${path.replace(/^\//, "")}`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === "className") node.className = v;
      else node.setAttribute(k, v);
    }
  }
  if (children) {
    for (const c of children) {
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

function formatInr(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(n);
  }
}

function statusLabel(s: SourceStatus | QuestionStatus): string {
  const map: Record<string, string> = {
    ready_off_repo: "Ready (copy into app)",
    partial: "Partial",
    derivable: "Derive from exports",
    needs_tagging: "Needs tagging",
    blocked: "Blocked on data",
    answered_partial: "Partial answer",
    manual_review: "Manual review",
    advisory: "Advisory",
  };
  return map[s] ?? s;
}

function parseSimpleCsv(text: string, maxRows: number): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows: string[][] = [];
  for (let i = 0; i < Math.min(lines.length, maxRows); i++) {
    rows.push(lines[i]!.split(","));
  }
  return rows;
}

function tableFromRows(rows: string[][]): HTMLTableElement {
  const table = el("table", { className: "preview-table" });
  if (rows.length === 0) return table;
  const thead = el("thead");
  const hr = el("tr");
  for (const cell of rows[0]!) {
    hr.appendChild(el("th", {}, [cell]));
  }
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = el("tbody");
  for (let r = 1; r < rows.length; r++) {
    const tr = el("tr");
    for (const cell of rows[r]!) {
      tr.appendChild(el("td", {}, [cell]));
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function buildDatasetMap(m: Manifest): Map<string, ManifestDataset> {
  return new Map(m.datasets.map((d) => [d.id, d]));
}

type GapReport = {
  title?: string;
  disclaimer?: string;
  understood_rules?: string[];
  period_notes?: Record<string, string>;
  internal_inconsistency_flag?: Record<string, unknown>;
  six_expense_lines?: Array<Record<string, unknown>>;
  three_months_missing_detail?: Record<string, unknown>;
  what_we_have_in_app_now?: string[];
  what_is_missing_for_full_bank_tie?: string[];
  unreconciled_bank_payments?: Record<string, unknown>;
  vendors_and_outstandings?: Record<string, unknown>;
  harshad_income_tax_proxy?: Record<string, unknown>;
  next_files_to_send?: string[];
};

function renderGapReport(data: GapReport): HTMLElement {
  const wrap = el("div", { className: "gap-report" });
  if (data.title) {
    wrap.appendChild(el("h2", { className: "gap-h2" }, [data.title]));
  }
  if (data.disclaimer) {
    wrap.appendChild(el("p", { className: "banner disclaimer" }, [data.disclaimer]));
  }
  if (data.understood_rules?.length) {
    wrap.appendChild(el("h3", {}, ["Rules we are using"]));
    const ul = el("ul", { className: "checklist" });
    for (const r of data.understood_rules) ul.appendChild(el("li", {}, [r]));
    wrap.appendChild(ul);
  }
  if (data.period_notes && typeof data.period_notes === "object") {
    wrap.appendChild(el("h3", {}, ["Periods"]));
    const dl = el("dl", { className: "kv-grid" });
    for (const [k, v] of Object.entries(data.period_notes)) {
      dl.appendChild(el("dt", {}, [k]));
      dl.appendChild(el("dd", {}, [String(v)]));
    }
    wrap.appendChild(dl);
  }
  const inc = data.internal_inconsistency_flag;
  if (inc && typeof inc === "object") {
    wrap.appendChild(
      el("div", { className: "banner", style: "border-color:#c9a227" }, [
        el("strong", {}, ["Internal inconsistency — resolve before bank tie: "]),
        document.createTextNode(String(inc.topic ?? "")),
      ])
    );
    const dl2 = el("dl", { className: "kv-grid" });
    for (const [k, v] of Object.entries(inc)) {
      if (k === "topic") continue;
      dl2.appendChild(el("dt", {}, [k]));
      dl2.appendChild(el("dd", {}, [typeof v === "number" ? formatInr(v) : String(v)]));
    }
    wrap.appendChild(dl2);
  }
  if (data.six_expense_lines?.length) {
    wrap.appendChild(el("h3", {}, ["Six expense lines — books vs bank (status)"]));
    const table = el("table", { className: "data-table gap-six" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["Line"]),
          el("th", {}, ["Books / notes"]),
          el("th", {}, ["Bank tie"]),
          el("th", {}, ["Missing"]),
        ]),
      ])
    );
    const tb = el("tbody");
    for (const row of data.six_expense_lines) {
      const have = Array.isArray(row.data_we_have)
        ? (row.data_we_have as string[]).join("; ")
        : "";
      const miss = Array.isArray(row.data_missing)
        ? (row.data_missing as string[]).join("; ")
        : "—";
      const booksBits: string[] = [];
      for (const [k, v] of Object.entries(row)) {
        if (["line", "bank_tie_status", "data_we_have", "data_missing"].includes(k))
          continue;
        if (v === undefined || v === null) continue;
        booksBits.push(`${k}: ${typeof v === "number" ? formatInr(v) : String(v)}`);
      }
      if (have) booksBits.push(`Have: ${have}`);
      tb.appendChild(
        el("tr", {}, [
          el("td", {}, [el("strong", {}, [String(row.line ?? "")])]),
          el("td", { className: "small-cell" }, [booksBits.join(" · ") || "—"]),
          el("td", {}, [
            el("span", { className: "badge src-needs_tagging" }, [
              String(row.bank_tie_status ?? "—"),
            ]),
          ]),
          el("td", { className: "small-cell" }, [miss]),
        ])
      );
    }
    table.appendChild(tb);
    wrap.appendChild(table);
  }
  if (data.three_months_missing_detail) {
    wrap.appendChild(el("h3", {}, ["Three months — missing detail (confirm)"]));
    const t = data.three_months_missing_detail;
    if (typeof t.user_note === "string") {
      wrap.appendChild(el("p", {}, [t.user_note]));
    }
    if (Array.isArray(t.please_confirm_exact_months)) {
      const ul = el("ul", { className: "checklist" });
      for (const x of t.please_confirm_exact_months as string[]) {
        ul.appendChild(el("li", {}, [x]));
      }
      wrap.appendChild(ul);
    }
  }
  const addList = (title: string, items: string[] | undefined) => {
    if (!items?.length) return;
    wrap.appendChild(el("h3", {}, [title]));
    const ul = el("ul", { className: "checklist" });
    for (const x of items) ul.appendChild(el("li", {}, [x]));
    wrap.appendChild(ul);
  };
  addList("In the app today", data.what_we_have_in_app_now);
  addList("Still needed for bank ↔ ledger", data.what_is_missing_for_full_bank_tie);
  const ubp = data.unreconciled_bank_payments;
  if (ubp && typeof ubp === "object") {
    wrap.appendChild(el("h3", {}, ["Unreconciled bank payments"]));
    if (typeof ubp.status === "string") {
      wrap.appendChild(el("p", {}, [ubp.status]));
    }
    if (typeof ubp.explanation === "string") {
      wrap.appendChild(el("p", { className: "muted small" }, [ubp.explanation]));
    }
    if (Array.isArray(ubp.known_slices_in_app)) {
      const ul = el("ul", { className: "checklist" });
      for (const x of ubp.known_slices_in_app as string[]) {
        ul.appendChild(el("li", {}, [x]));
      }
      wrap.appendChild(ul);
    }
  }
  const vo = data.vendors_and_outstandings;
  if (vo && typeof vo === "object") {
    wrap.appendChild(el("h3", {}, ["Vendors & outstandings"]));
    wrap.appendChild(el("p", {}, [String(vo.status ?? "")]));
    if (Array.isArray(vo.collect)) {
      const ul = el("ul", { className: "checklist" });
      for (const x of vo.collect as string[]) ul.appendChild(el("li", {}, [x]));
      wrap.appendChild(ul);
    }
  }
  const ht = data.harshad_income_tax_proxy;
  if (ht && typeof ht === "object") {
    wrap.appendChild(el("h3", {}, ["Harshad tax — proxy (30% × SW profit)"]));
    const dl = el("dl", { className: "kv-grid" });
    for (const [k, v] of Object.entries(ht)) {
      dl.appendChild(el("dt", {}, [k]));
      const str =
        typeof v === "number" && (k.includes("inr") || k.includes("percent"))
          ? formatInr(v)
          : String(v);
      dl.appendChild(el("dd", {}, [str]));
    }
    wrap.appendChild(dl);
  }
  addList("Next files to collect", data.next_files_to_send);
  return wrap;
}

function renderJsonView(data: unknown, view: DatasetView | undefined): HTMLElement {
  const v = view ?? "plain_json";
  if (data === null || data === undefined) {
    return el("p", { className: "muted" }, ["No data"]);
  }
  if (typeof data !== "object") {
    return el("pre", { className: "json-pre" }, [JSON.stringify(data, null, 2)]);
  }
  const o = data as Record<string, unknown>;

  if (v === "gap_report" && "six_expense_lines" in o) {
    return renderGapReport(o as GapReport);
  }

  if (v === "ecpl_pl_table" && Array.isArray(o.pl_lines)) {
    const table = el("table", { className: "data-table" });
    const thead = el("thead");
    thead.appendChild(
      el("tr", {}, [
        el("th", {}, ["#"]),
        el("th", {}, ["Particulars"]),
        el("th", {}, ["Amount"]),
        el("th", {}, ["% of gross"]),
        el("th", {}, ["Per month"]),
      ])
    );
    table.appendChild(thead);
    const tbody = el("tbody");
    for (const row of o.pl_lines as Record<string, unknown>[]) {
      const amt = row.amount_inr;
      const tr = el("tr", {}, [
        el("td", {}, [String(row.line_order ?? "")]),
        el("td", {}, [String(row.particulars ?? "")]),
        el("td", { className: "num" }, [
          typeof amt === "number" ? formatInr(amt) : String(amt ?? "—"),
        ]),
        el("td", { className: "num" }, [
          row.pct_of_gross_sales != null
            ? String(row.pct_of_gross_sales)
            : "—",
        ]),
        el("td", { className: "num" }, [
          typeof row.per_month_inr === "number"
            ? formatInr(row.per_month_inr)
            : "—",
        ]),
      ]);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    const wrap = el("div", { className: "json-table-wrap" });
    if (typeof o.authority_note === "string") {
      wrap.appendChild(el("p", { className: "authority-note" }, [o.authority_note]));
    }
    wrap.appendChild(table);
    return wrap;
  }

  if (v === "ecpl_monthly" && Array.isArray(o.rows)) {
    const wrap = el("div", { className: "json-table-wrap" });
    if (typeof o.authority_note === "string") {
      wrap.appendChild(el("p", { className: "authority-note" }, [o.authority_note]));
    }
    const table = el("table", { className: "data-table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["Expense"]),
          el("th", {}, ["Type"]),
          el("th", {}, ["Months (Apr–Feb)"]),
          el("th", {}, ["Row total"]),
        ]),
      ])
    );
    const tbody = el("tbody");
    for (const row of o.rows as Record<string, unknown>[]) {
      const months = row.monthly_amounts_inr;
      let monthStr = "—";
      if (Array.isArray(months)) {
        const parts = months.map((x) =>
          typeof x === "number" && !Number.isNaN(x) ? formatInr(x) : "—"
        );
        monthStr = parts.join(" · ");
      }
      const tot = row.row_total_inr;
      tbody.appendChild(
        el("tr", {}, [
          el("td", {}, [String(row.expense_line ?? "")]),
          el("td", {}, [String(row.type ?? "—")]),
          el("td", { className: "month-cells" }, [monthStr]),
          el("td", { className: "num" }, [
            typeof tot === "number" ? formatInr(tot) : String(tot ?? "—"),
          ]),
        ])
      );
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  if (v === "nakul_lines" && Array.isArray(o.lines)) {
    const table = el("table", { className: "data-table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["Particulars"]),
          el("th", {}, ["Type"]),
          el("th", {}, ["Amount"]),
          el("th", {}, ["Note"]),
        ]),
      ])
    );
    const tbody = el("tbody");
    for (const row of o.lines as Record<string, unknown>[]) {
      const amt = row.amount_inr;
      tbody.appendChild(
        el("tr", {}, [
          el("td", {}, [String(row.particulars ?? "")]),
          el("td", {}, [String(row.type ?? "—")]),
          el("td", { className: "num" }, [
            typeof amt === "number" ? formatInr(amt) : String(amt ?? "—"),
          ]),
          el("td", {}, [String(row.period_note ?? row.classification_note ?? "—")]),
        ])
      );
    }
    table.appendChild(tbody);
    return el("div", { className: "json-table-wrap" }, [table]);
  }

  if (v === "bank_lines" && Array.isArray(o.lines)) {
    const table = el("table", { className: "data-table" });
    table.appendChild(
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["Date"]),
          el("th", {}, ["Debit"]),
          el("th", {}, ["Credit"]),
          el("th", {}, ["Detail"]),
        ]),
      ])
    );
    const tbody = el("tbody");
    for (const row of o.lines as Record<string, unknown>[]) {
      const dr = row.debit_inr;
      const cr = row.credit_inr;
      const narr =
        String(row.particulars ?? row.narration_hint ?? row.narration ?? "");
      tbody.appendChild(
        el("tr", {}, [
          el("td", {}, [String(row.txn_date ?? "—")]),
          el("td", { className: "num" }, [
            typeof dr === "number" ? formatInr(dr) : "—",
          ]),
          el("td", { className: "num" }, [
            typeof cr === "number" ? formatInr(cr) : "—",
          ]),
          el("td", {}, [narr]),
        ])
      );
    }
    table.appendChild(tbody);
    const wrap = el("div", { className: "json-table-wrap" });
    if (typeof o.reconciliation_display_source === "string") {
      wrap.appendChild(
        el("p", { className: "meta-inline" }, [o.reconciliation_display_source])
      );
    }
    wrap.appendChild(table);
    if (o.sum_neft_harshad_inr != null) {
      wrap.appendChild(
        el("p", { className: "kv-line" }, [
          el("strong", {}, ["Sum NEFT (Harshad): "]),
          formatInr(Number(o.sum_neft_harshad_inr)),
        ])
      );
    }
    if (o.total_credit_inr != null) {
      wrap.appendChild(
        el("p", { className: "kv-line" }, [
          el("strong", {}, ["Total credits: "]),
          formatInr(Number(o.total_credit_inr)),
        ])
      );
    }
    if (typeof o.gap_note === "string") {
      wrap.appendChild(el("p", { className: "muted small" }, [o.gap_note]));
    }
    return wrap;
  }

  if (v === "key_values") {
    const dl = el("dl", { className: "kv-grid" });
    const skip = new Set(["pl_lines", "rows", "lines"]);
    for (const [k, val] of Object.entries(o)) {
      if (skip.has(k)) continue;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        dl.appendChild(el("dt", {}, [k]));
        dl.appendChild(
          el("dd", {}, [el("pre", { className: "json-pre tight" }, [JSON.stringify(val, null, 2)])])
        );
        continue;
      }
      if (Array.isArray(val)) {
        dl.appendChild(el("dt", {}, [k]));
        dl.appendChild(
          el("dd", {}, [
            el("pre", { className: "json-pre tight" }, [JSON.stringify(val, null, 2)]),
          ])
        );
        continue;
      }
      let display: string;
      if (typeof val === "number") display = formatInr(val);
      else if (typeof val === "boolean") display = val ? "yes" : "no";
      else display = val == null ? "—" : String(val);
      dl.appendChild(el("dt", {}, [k]));
      dl.appendChild(el("dd", {}, [display]));
    }
    return el("div", { className: "json-table-wrap" }, [dl]);
  }

  return el("pre", { className: "json-pre" }, [JSON.stringify(data, null, 2)]);
}

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(dataUrl(path));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadManifest(): Promise<Manifest> {
  return loadJson<Manifest>("manifest.json");
}

function renderDatasetCard(ds: ManifestDataset): HTMLElement {
  const previewHost = el("div", { className: "preview" });
  previewHost.style.display = "none";

  const status = el("span", { className: "status" });
  const err = el("div", { className: "error" });
  err.style.display = "none";

  const btn = el("button", { type: "button" }, ["Load / refresh"]);
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    err.style.display = "none";
    status.textContent = "Loading…";
    previewHost.style.display = "none";
    previewHost.replaceChildren();

    try {
      const res = await fetch(dataUrl(ds.path));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      if (ds.format === "json") {
        const data = JSON.parse(text) as unknown;
        previewHost.appendChild(renderJsonView(data, ds.view));
      } else {
        previewHost.appendChild(tableFromRows(parseSimpleCsv(text, 51)));
      }
      previewHost.style.display = "block";
      status.textContent = "Loaded";
    } catch (e) {
      err.textContent = e instanceof Error ? e.message : String(e);
      err.style.display = "block";
      status.textContent = "";
    } finally {
      btn.disabled = false;
    }
  });

  const metaBits = [`format: ${ds.format}`, `file: data/${ds.path}`];
  if (ds.view) metaBits.push(`view: ${ds.view}`);
  if (ds.source_note) metaBits.push(ds.source_note);

  return el("article", { className: "card" }, [
    el("h2", {}, [ds.title]),
    el("div", { className: "meta" }, [metaBits.join(" · ")]),
    el("p", { className: "desc" }, [ds.description]),
    el("div", { className: "actions" }, [btn, status]),
    err,
    previewHost,
  ]);
}

function attachEvidencePanel(
  card: HTMLElement,
  evidence: EvidenceLink[],
  manifestById: Map<string, ManifestDataset>
): void {
  if (!evidence.length) return;

  const head = el("h3", {}, ["Reconciled data — click to load"]);
  const bar = el("div", { className: "evidence-bar" });
  const host = el("div", { className: "evidence-host" });
  host.style.display = "none";

  let openId: string | null = null;

  for (const ev of evidence) {
    const ds = manifestById.get(ev.dataset_id);
    const btn = el(
      "button",
      { type: "button", className: "evidence-btn" },
      [ds ? `${ev.label}` : `${ev.label} (missing manifest id)`]
    );
    btn.addEventListener("click", async () => {
      for (const b of bar.querySelectorAll("button.evidence-btn")) {
        b.classList.remove("active");
      }
      if (!ds) {
        host.style.display = "block";
        openId = null;
        host.replaceChildren(
          el("p", { className: "error" }, [`Unknown dataset_id: ${ev.dataset_id}`])
        );
        return;
      }
      if (openId === ev.dataset_id && host.style.display === "block") {
        host.style.display = "none";
        openId = null;
        return;
      }
      btn.classList.add("active");
      openId = ev.dataset_id;
      host.style.display = "block";
      host.replaceChildren(
        el("p", { className: "muted small" }, [
          `data/${ds.path} · ${ds.title}`,
        ]),
        el("div", { className: "evidence-loading" }, ["Loading…"])
      );
      try {
        const res = await fetch(dataUrl(ds.path));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = JSON.parse(await res.text()) as unknown;
        host.replaceChildren(
          el("p", { className: "muted small" }, [`data/${ds.path} · ${ds.title}`])
        );
        const meta =
          data &&
          typeof data === "object" &&
          "reconciliation_display_source" in data &&
          typeof (data as { reconciliation_display_source: string })
            .reconciliation_display_source === "string"
            ? (data as { reconciliation_display_source: string })
                .reconciliation_display_source
            : null;
        if (meta) {
          host.appendChild(el("p", { className: "meta-inline" }, [meta]));
        }
        host.appendChild(renderJsonView(data, ds.view));
      } catch (e) {
        host.replaceChildren(
          el("p", { className: "error" }, [
            e instanceof Error ? e.message : String(e),
          ])
        );
      }
    });
    bar.appendChild(btn);
  }

  const block = el("div", { className: "evidence-block" }, [head, bar, host]);
  card.appendChild(block);
}

function renderPartiesView(reg: Registry): HTMLElement {
  const wrap = el("div", { className: "view-panel" });

  wrap.appendChild(el("p", { className: "lead" }, [reg.introduction]));

  const principles = el("div", { className: "card principles" }, [
    el("h2", {}, ["Reconciliation principles"]),
    el("ul", { className: "checklist" }, []),
  ]);
  const ul = principles.querySelector("ul")!;
  for (const p of reg.reconciliation_principles) {
    ul.appendChild(el("li", {}, [p]));
  }
  wrap.appendChild(principles);

  for (const party of reg.parties) {
    const card = el("article", { className: "card party-card" }, [
      el("h2", {}, [party.short_name]),
      el("div", { className: "meta" }, [party.legal_name]),
      el("p", { className: "desc" }, [party.role]),
    ]);

    const tbl = el("table", { className: "sources-table" });
    const thead = el("thead");
    thead.appendChild(
      el("tr", {}, [
        el("th", {}, ["Source"]),
        el("th", {}, ["Covers"]),
        el("th", {}, ["Typical file"]),
        el("th", {}, ["Status"]),
        el("th", {}, ["In app"]),
      ])
    );
    tbl.appendChild(thead);
    const tbody = el("tbody");
    for (const s of party.sources) {
      const listed = s.in_app_manifest ? "Flagged in registry" : "—";
      tbody.appendChild(
        el("tr", {}, [
          el("td", {}, [el("strong", {}, [s.label])]),
          el("td", {}, [s.covers]),
          el("td", {}, [el("code", { className: "path-hint" }, [s.typical_path])]),
          el("td", {}, [
            el("span", { className: `badge src-${s.status}` }, [
              statusLabel(s.status),
            ]),
          ]),
          el("td", {}, [listed]),
        ])
      );
    }
    tbl.appendChild(tbody);
    card.appendChild(tbl);
    wrap.appendChild(card);
  }

  return wrap;
}

function renderQuestionsView(
  qf: QuestionsFile,
  manifestById: Map<string, ManifestDataset>
): HTMLElement {
  const wrap = el("div", { className: "view-panel" });

  wrap.appendChild(
    el("div", { className: "banner disclaimer" }, [
      el("strong", {}, ["Not financial advice. "]),
      document.createTextNode(qf.disclaimer),
    ])
  );

  for (const q of qf.questions) {
    const figBlock =
      q.figures.length > 0
        ? el("div", { className: "figures" }, [
            el("h3", {}, ["Numbers / placeholders"]),
            ...q.figures.map((f) =>
              el("div", { className: "figure-row" }, [
                el("div", { className: "figure-label" }, [f.label]),
                el("div", { className: "figure-value" }, [f.value]),
                el("div", { className: "figure-note" }, [f.note]),
              ])
            ),
          ])
        : null;

    const gapsBlock =
      q.gaps.length > 0
        ? el("div", { className: "subblock" }, [
            el("h3", {}, ["Still needed"]),
            el("ul", {}, q.gaps.map((g) => el("li", {}, [g]))),
          ])
        : null;

    const srcBlock =
      q.data_sources.length > 0
        ? el("div", { className: "subblock muted" }, [
            el("h3", {}, ["Source IDs (registry)"]),
            el("p", {}, [q.data_sources.join(", ")]),
          ])
        : null;

    const card = el("article", { className: "card question-card" }, [
      el("div", { className: "question-head" }, [
        el("h2", {}, [q.title]),
        el("span", { className: `badge q-${q.status}` }, [statusLabel(q.status)]),
      ]),
      el("p", { className: "answer-summary" }, [q.summary]),
      ...(figBlock ? [figBlock] : []),
      ...(srcBlock ? [srcBlock] : []),
      ...(gapsBlock ? [gapsBlock] : []),
      el("div", { className: "advice" }, [
        el("h3", {}, ["Suggestion"]),
        el("p", {}, [q.advice]),
      ]),
    ]);

    if (q.evidence?.length) {
      attachEvidencePanel(card, q.evidence, manifestById);
    } else {
      card.appendChild(
        el("p", { className: "muted small" }, [
          "No in-app snapshots linked yet — add evidence[] in reconciliation_questions.json.",
        ])
      );
    }

    wrap.appendChild(card);
  }

  const sug = el("div", { className: "card suggestions" }, [
    el("h2", {}, ["Next steps"]),
    el("ul", { className: "checklist" }, []),
  ]);
  const sul = sug.querySelector("ul")!;
  for (const s of qf.suggestions_next_steps) {
    sul.appendChild(el("li", {}, [s]));
  }
  wrap.appendChild(sug);

  return wrap;
}

function renderDashboardTab(
  manifest: Manifest,
  reg: Registry,
  qf: QuestionsFile
): HTMLElement {
  const wrap = el("div", { className: "view-panel" });
  wrap.appendChild(
    el("div", { className: "banner" }, [
      el("strong", {}, [`Manifest: ${manifest.updated} · Registry: ${reg.updated} · Q&A: ${qf.updated}. `]),
      document.createTextNode(manifest.coverage_note),
    ])
  );
  wrap.appendChild(
    el("p", { className: "lead" }, [
      "ECPL expenses through 28-Feb-26: ECPL P&L tab. Space Within FY 24-25: snapshots under sw_fy2425. Gaps & bank tab: six expense lines (Rent, MSEDCL, Salary, Food, Water, Petty) — what we have, what’s missing, bank tie-up plan, SW rent conflict. Questions: evidence buttons.",
    ])
  );

  const counts = {
    parties: reg.parties.length,
    sources: reg.parties.reduce((n, p) => n + p.sources.length, 0),
    questions: qf.questions.length,
    datasets: manifest.datasets.length,
  };

  const grid = el("div", { className: "stat-grid" }, [
    el("div", { className: "stat" }, [
      el("span", { className: "stat-n" }, [String(counts.parties)]),
      el("span", { className: "stat-l" }, ["Parties"]),
    ]),
    el("div", { className: "stat" }, [
      el("span", { className: "stat-n" }, [String(counts.sources)]),
      el("span", { className: "stat-l" }, ["Source streams"]),
    ]),
    el("div", { className: "stat" }, [
      el("span", { className: "stat-n" }, [String(counts.questions)]),
      el("span", { className: "stat-l" }, ["Questions"]),
    ]),
    el("div", { className: "stat" }, [
      el("span", { className: "stat-n" }, [String(counts.datasets)]),
      el("span", { className: "stat-l" }, ["Data files"]),
    ]),
  ]);
  wrap.appendChild(grid);
  return wrap;
}

function renderEcplPlTab(plData: unknown, manifestById: Map<string, ManifestDataset>): HTMLElement {
  const wrap = el("div", { className: "view-panel" });
  wrap.appendChild(
    el("h2", { className: "tab-title" }, ["ECPL — P&L & workbook snapshots"])
  );
  wrap.appendChild(
    el("p", { className: "lead" }, [
      "Period: 1 Apr 2025 – 28 Feb 2026. This is the main ECPL operating expense and profit view. Regenerate JSON from Excel with ",
      el("code", {}, ["python scripts/export_ecpl_pl_workbook.py"]),
      ".",
    ])
  );

  if (plData && typeof plData === "object") {
    wrap.appendChild(renderJsonView(plData, "ecpl_pl_table"));
  } else {
    wrap.appendChild(
      el("p", { className: "error" }, [
        "Could not load snapshots/ecpl_fy2526/pl_main.json — run the export script.",
      ])
    );
  }

  const sub = el("div", { className: "card ecpl-subcard" }, [
    el("h3", {}, ["Load other ECPL workbook extracts"]),
    el("p", { className: "desc" }, [
      "Same data as in Questions → evidence buttons and Data files tab.",
    ]),
  ]);
  const bar = el("div", { className: "evidence-bar" });
  const ids = [
    "ecpl_pl_monthly",
    "ecpl_sales_register_summary",
    "ecpl_purchase_register_summary",
    "ecpl_nakul_indirect",
    "ecpl_sales_crosscheck_printed",
    "ecpl_export_meta",
  ];
  const host = el("div", { className: "evidence-host" });
  host.style.display = "none";
  let open: string | null = null;

  for (const id of ids) {
    const ds = manifestById.get(id);
    if (!ds) continue;
    const btn = el("button", { type: "button", className: "evidence-btn" }, [ds.title]);
    btn.addEventListener("click", async () => {
      for (const b of bar.querySelectorAll("button")) b.classList.remove("active");
      if (open === id && host.style.display === "block") {
        host.style.display = "none";
        open = null;
        return;
      }
      btn.classList.add("active");
      open = id;
      host.style.display = "block";
      host.replaceChildren(el("div", { className: "evidence-loading" }, ["Loading…"]));
      try {
        const data = await loadJson<unknown>(ds.path);
        host.replaceChildren(renderJsonView(data, ds.view));
      } catch (e) {
        host.replaceChildren(
          el("p", { className: "error" }, [e instanceof Error ? e.message : String(e)])
        );
      }
    });
    bar.appendChild(btn);
  }
  sub.appendChild(bar);
  sub.appendChild(host);
  wrap.appendChild(sub);

  return wrap;
}

function setupTabs(
  panels: { id: string; label: string; element: HTMLElement }[]
): { nav: HTMLElement; body: HTMLElement } {
  const nav = el("nav", { className: "tabs", role: "tablist" });
  const body = el("div", { className: "tab-panels" });

  const activate = (id: string) => {
    for (const p of panels) {
      const show = p.id === id;
      p.element.classList.toggle("active", show);
      p.element.toggleAttribute("hidden", !show);
    }
    for (const btn of nav.querySelectorAll("button.tab")) {
      const on = btn.getAttribute("data-tab") === id;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
  };

  for (const p of panels) {
    const btn = el(
      "button",
      {
        type: "button",
        className: "tab",
        role: "tab",
        "data-tab": p.id,
        "aria-selected": "false",
      },
      [p.label]
    );
    btn.addEventListener("click", () => activate(p.id));
    nav.appendChild(btn);
    p.element.classList.add("tab-panel");
    p.element.setAttribute("role", "tabpanel");
    if (!p.element.classList.contains("active")) {
      p.element.setAttribute("hidden", "");
    }
    body.appendChild(p.element);
  }

  activate(panels[0]!.id);
  return { nav, body };
}

async function main() {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;

  root.appendChild(
    el("header", {}, [
      el("h1", {}, ["Group reconciliation"]),
      el("p", {}, [
        "Space Within · ECPL · STPL · Nakul / Harshad — static evidence under ",
        el("code", {}, ["public/data/"]),
        ".",
      ]),
    ])
  );

  try {
    const [manifest, reg, qf] = await Promise.all([
      loadManifest(),
      loadJson<Registry>("registry.json"),
      loadJson<QuestionsFile>("reconciliation_questions.json"),
    ]);

    const manifestById = buildDatasetMap(manifest);

    let plMain: unknown = null;
    try {
      plMain = await loadJson("snapshots/ecpl_fy2526/pl_main.json");
    } catch {
      plMain = null;
    }

    const dash = renderDashboardTab(manifest, reg, qf);

    let gapsPanel = el("div", { className: "view-panel" });
    try {
      const gapsData = await loadJson<GapReport>("reconciliation_gaps.json");
      gapsPanel.appendChild(renderGapReport(gapsData));
      gapsPanel.appendChild(
        el("p", { className: "muted small" }, [
          "Also open this file from All data files → Gaps checklist for raw JSON / sharing.",
        ])
      );
    } catch {
      gapsPanel.appendChild(
        el("p", { className: "error" }, ["Could not load reconciliation_gaps.json"])
      );
    }

    const ecplTab = renderEcplPlTab(plMain, manifestById);
    const parties = renderPartiesView(reg);
    const questions = renderQuestionsView(qf, manifestById);

    const dataSection = el("section", { className: "datasets" });
    for (const ds of manifest.datasets) {
      dataSection.appendChild(renderDatasetCard(ds));
    }

    const { nav, body } = setupTabs([
      { id: "dash", label: "Overview", element: dash },
      { id: "gaps", label: "Gaps & bank", element: gapsPanel },
      { id: "ecpl", label: "ECPL P&L", element: ecplTab },
      { id: "parties", label: "Parties & sources", element: parties },
      { id: "qa", label: "Questions", element: questions },
      { id: "data", label: "All data files", element: dataSection },
    ]);

    const shell = el("div", { className: "shell" });
    shell.appendChild(nav);
    shell.appendChild(body);
    root.appendChild(shell);
  } catch (e) {
    root.appendChild(
      el("div", { className: "error" }, [
        "Could not load dashboard JSON. Run ",
        el("code", {}, ["npm run dev"]),
        " from the project root. ",
        e instanceof Error ? e.message : String(e),
      ])
    );
  }

  root.appendChild(
    el("footer", {}, [
      "Regenerate ECPL: ",
      el("code", {}, ["python scripts/export_ecpl_pl_workbook.py"]),
      ". Edit ",
      el("code", {}, ["reconciliation_questions.json"]),
      " evidence[] to link questions to manifest ids.",
    ])
  );
}

main();
