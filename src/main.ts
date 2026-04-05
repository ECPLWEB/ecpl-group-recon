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

async function loadManifest(): Promise<Manifest> {
  const res = await fetch(dataUrl("manifest.json"));
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json() as Promise<Manifest>;
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
        const pre = el("pre", {}, [JSON.stringify(data, null, 2)]);
        previewHost.appendChild(pre);
      } else {
        const rows = parseSimpleCsv(text, 51);
        previewHost.appendChild(tableFromRows(rows));
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

  const card = el("article", { className: "card" }, [
    el("h2", {}, [ds.title]),
    el("div", { className: "meta" }, [metaBits.join(" · ")]),
    el("p", { className: "desc" }, [ds.description]),
    el("div", { className: "actions" }, [btn, status]),
    err,
    previewHost,
  ]);

  return card;
}

async function main() {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) return;

  root.appendChild(
    el("header", {}, [
      el("h1", {}, ["Group reconciliation"]),
      el("p", {}, [
        "Static snapshots for Space Within, ECPL, STPL, and related parties. ",
        "No server — data ships with the site under ",
        el("code", {}, ["public/data/"]),
        ".",
      ]),
    ])
  );

  try {
    const manifest = await loadManifest();
    const banner = el("div", { className: "banner" }, [
      el("strong", {}, [`Last manifest update: ${manifest.updated}. `]),
      document.createTextNode(manifest.coverage_note),
    ]);
    root.appendChild(banner);

    const list = el("section", { className: "datasets" });
    for (const ds of manifest.datasets) {
      list.appendChild(renderDatasetCard(ds));
    }
    root.appendChild(list);
  } catch (e) {
    root.appendChild(
      el("div", { className: "error" }, [
        "Could not load data/manifest.json. Run ",
        el("code", {}, ["npm run dev"]),
        " from the project root. ",
        e instanceof Error ? e.message : String(e),
      ])
    );
  }

  root.appendChild(
    el("footer", {}, [
      "Replace files under ",
      el("code", {}, ["public/data/snapshots/"]),
      " with dated CSV/JSON exports; update ",
      el("code", {}, ["manifest.json"]),
      " when you add a dataset.",
    ])
  );
}

main();
