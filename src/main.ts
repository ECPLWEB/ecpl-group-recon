import "./style.css";

type DatasetFormat = "json" | "csv";

type ManifestDataset = {
  id: string;
  title: string;
  description: string;
  path: string;
  format: DatasetFormat;
  source_note?: string;
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

type ReconciliationQuestion = {
  id: string;
  title: string;
  status: QuestionStatus;
  summary: string;
  figures: QuestionFigure[];
  data_sources: string[];
  gaps: string[];
  advice: string;
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

  const btn = el("button", { type: "button" }, ["Load preview"]);
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
        previewHost.appendChild(el("pre", {}, [JSON.stringify(data, null, 2)]));
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
          el("td", {}, [s.in_app_manifest ? "Listed in manifest" : "—"]),
        ])
      );
    }
    tbl.appendChild(tbody);
    card.appendChild(tbl);
    wrap.appendChild(card);
  }

  return wrap;
}

function renderQuestionsView(qf: QuestionsFile): HTMLElement {
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
            el("h3", {}, ["Source IDs (see registry)"]),
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
    wrap.appendChild(card);
  }

  const sug = el("div", { className: "card suggestions" }, [
    el("h2", {}, ["Next steps (product)"]),
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
      "Use the tabs above: parties and source files, reconciling questions with partial answers and gaps, then raw data previews from the manifest.",
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
      el("span", { className: "stat-l" }, ["Tracked questions"]),
    ]),
    el("div", { className: "stat" }, [
      el("span", { className: "stat-n" }, [String(counts.datasets)]),
      el("span", { className: "stat-l" }, ["Manifest files"]),
    ]),
  ]);
  wrap.appendChild(grid);
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

    const dash = renderDashboardTab(manifest, reg, qf);
    const parties = renderPartiesView(reg);
    const questions = renderQuestionsView(qf);

    const dataSection = el("section", { className: "datasets" });
    for (const ds of manifest.datasets) {
      dataSection.appendChild(renderDatasetCard(ds));
    }

    const { nav, body } = setupTabs([
      { id: "dash", label: "Overview", element: dash },
      { id: "parties", label: "Parties & sources", element: parties },
      { id: "qa", label: "Questions & answers", element: questions },
      { id: "data", label: "Data files", element: dataSection },
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
      "Edit ",
      el("code", {}, ["public/data/registry.json"]),
      " and ",
      el("code", {}, ["public/data/reconciliation_questions.json"]),
      " to update parties and Q&A. Add CSV/JSON under ",
      el("code", {}, ["public/data/snapshots/"]),
      " and list them in ",
      el("code", {}, ["manifest.json"]),
      ".",
    ])
  );
}

main();
