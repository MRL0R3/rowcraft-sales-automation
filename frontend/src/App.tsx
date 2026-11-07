import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import sampleCsv from "../../fixtures/orders.csv?raw";
import {
  calculateReport,
  csvSafe,
  filterLines,
  lineAmountCents,
  parseCsv,
} from "./lib/orders";
import type { OrderLine } from "./lib/orders";
import { ProductBars, TrendChart } from "./components/ReportVisuals";
import {
  formatCents as moneyCents,
  formatMoney as money,
} from "./lib/formatMoney";

const repoUrl = __ROWCRAFT_REPOSITORY__;
const pct = (value: string | null) =>
  value === null ? "N/A" : `${(Number(value) * 100).toFixed(1)}%`;
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.readAsText(file, "UTF-8");
  });
}

function ImportNotice({
  notice,
  issues,
}: {
  notice: string;
  issues: { row: number; message: string }[];
}) {
  if (!notice) return null;
  return (
    <div className="notice" role="status">
      <p>{notice}</p>
      {issues.length > 0 && (
        <ul>
          {issues.slice(0, 20).map((issue, index) => (
            <li key={`${issue.row}-${index}`}>
              CSV row {issue.row}: {issue.message}
            </li>
          ))}
          {issues.length > 20 && (
            <li>And {issues.length - 20} more row issues.</li>
          )}
        </ul>
      )}
    </div>
  );
}
export default function App() {
  const initial = useMemo(() => parseCsv(sampleCsv), []);
  const [lines, setLines] = useState<OrderLine[]>(initial.lines);
  const [duplicateRows, setDuplicateRows] = useState<number[]>(
    initial.duplicateRows,
  );
  const [datasetName, setDatasetName] = useState("Synthetic sample · 8 rows");
  const [isSample, setIsSample] = useState(true);
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<{ row: number; message: string }[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("all");
  const [product, setProduct] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "order_id" | "product" | "amount">(
    "date",
  );
  const [ascending, setAscending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const visibleLines = useMemo(
    () => filterLines(lines, start, end, status, product),
    [lines, start, end, status, product],
  );
  const report = useMemo(
    () =>
      visibleLines.length ? calculateReport(visibleLines, duplicateRows) : null,
    [visibleLines, duplicateRows],
  );
  const products = [...new Set(lines.map((line) => line.product))].sort(
    compareText,
  );
  const rows = useMemo(
    () =>
      visibleLines
        .filter((line) =>
          `${line.order_id} ${line.product} ${line.status} ${line.date}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          const av = sort === "amount" ? lineAmountCents(a) : a[sort];
          const bv = sort === "amount" ? lineAmountCents(b) : b[sort];
          const cmp =
            typeof av === "number"
              ? av - Number(bv)
              : compareText(String(av), String(bv));
          return ascending ? cmp : -cmp;
        }),
    [visibleLines, query, sort, ascending],
  );

  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setIssues([]);
      setNotice(
        "This file is over the 5 MB limit. Your current report is unchanged.",
      );
      return;
    }
    try {
      const parsed = parseCsv(await readFileText(file));
      setLines(parsed.lines);
      setDuplicateRows(parsed.duplicateRows);
      setDatasetName(`${file.name} · ${parsed.lines.length} rows`);
      setIsSample(false);
      setIssues([]);
      setStart("");
      setEnd("");
      setStatus("all");
      setProduct("all");
      setQuery("");
      setNotice(
        parsed.duplicateRows.length
          ? `Loaded successfully. Possible duplicate line(s) at CSV rows ${parsed.duplicateRows.join(", ")}; retained for review.`
          : "Loaded successfully. Your file was processed in this browser and was not uploaded.",
      );
    } catch (error) {
      const issues = (
        error as Error & { issues?: { row: number; message: string }[] }
      ).issues;
      setIssues(issues ?? []);
      setNotice(
        `${(error as Error).message} Your current report is unchanged.`,
      );
    }
  }
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  }
  function reset() {
    setLines(initial.lines);
    setDuplicateRows(initial.duplicateRows);
    setDatasetName("Synthetic sample · 8 rows");
    setIsSample(true);
    setNotice("Sample data restored.");
    setIssues([]);
    setStart("");
    setEnd("");
    setStatus("all");
    setProduct("all");
    setQuery("");
  }
  function monthlyCsv() {
    if (!report) return;
    const rows = [
      [
        "month",
        "completed_revenue",
        "refunded_amount",
        "net_revenue",
        "completed_orders",
      ],
      ...report.monthly.map((m) => [
        m.month,
        m.completed_revenue,
        m.refunded_amount,
        m.net_revenue,
        String(m.completed_orders),
      ]),
    ];
    download(
      "rowcraft-monthly-report.csv",
      rows
        .map((row) =>
          row
            .map((cell) => `"${csvSafe(cell).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\r\n"),
      "text/csv;charset=utf-8",
    );
    setNotice("Monthly CSV downloaded for the current report filters.");
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Rowcraft home">
          <span className="brand-mark">r.</span>
          <span>rowcraft</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#report">Report</a>
          <a href="#method">How it works</a>
          <a
            className="nav-github"
            href={repoUrl || "https://github.com/mrl0r3"}
            target="_blank"
            rel="noreferrer"
          >
            {repoUrl ? "Source ↗" : "GitHub ↗"}
          </a>
        </nav>
        <span className="top-note">
          <i /> Local-first reporting
        </span>
      </header>
      <main id="top">
        <section className="intro">
          <div className="intro-copy">
            <p className="eyebrow">ORDER REPORTING, WITHOUT THE BUSYWORK</p>
            <h1>
              From messy orders
              <br />
              to <em>clear decisions.</em>
            </h1>
            <p className="lede">
              Drop in an order export. Get a dependable view of sales, refunds,
              and the products moving your business forward.
            </p>
            <div className="intro-actions">
              <a className="button button-dark" href="#report">
                Try the demo <span aria-hidden="true">↓</span>
              </a>
              <a
                className="text-link"
                href="https://github.com/mrl0r3"
                target="_blank"
                rel="noreferrer"
              >
                Meet the developer ↗
              </a>
            </div>
            <p className="intro-foot">
              Built for independent shops and small teams · Your file stays on
              your device
            </p>
          </div>
          <aside className="intro-aside">
            <span className="aside-index">01 / THE WEEKLY RESET</span>
            <div className="aside-rule" />
            <p>Stop rebuilding the same report every Monday.</p>
            <p className="muted">
              One clean workflow for the numbers you already have.
            </p>
            <span className="aside-scribble" aria-hidden="true">
              ↘
            </span>
          </aside>
        </section>
        <section
          className="workspace"
          id="report"
          aria-labelledby="workspace-title"
        >
          <div className="workspace-head">
            <div>
              <p className="eyebrow">YOUR REPORTING DESK</p>
              <h2 id="workspace-title">Sales overview</h2>
            </div>
            <span className={`data-badge ${isSample ? "sample" : "uploaded"}`}>
              <i />
              {isSample ? "DEMO DATA" : "YOUR FILE"}
            </span>
          </div>
          <div className="report-layout">
            <aside className="controls" aria-label="Report controls">
              <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input
                  ref={input}
                  onChange={onChange}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Choose a CSV file"
                />
                <div className="upload-icon" aria-hidden="true">
                  ↑
                </div>
                <strong>Bring your own CSV</strong>
                <p>
                  Drop a file here, or{" "}
                  <button
                    className="inline-button"
                    type="button"
                    onClick={() => input.current?.click()}
                  >
                    browse files
                  </button>
                </p>
                <small>CSV · up to 5 MB · 10,000 rows</small>
                <small className="privacy-line">
                  Processed in this browser only
                </small>
              </div>
              <button
                className="sample-download"
                type="button"
                onClick={() => {
                  download(
                    "rowcraft-example-orders.csv",
                    sampleCsv,
                    "text/csv;charset=utf-8",
                  );
                  setNotice(
                    "Example CSV downloaded. Replace the sample rows with your own orders to try the import.",
                  );
                }}
              >
                Download example CSV <span aria-hidden="true">↓</span>
              </button>
              <details className="schema-details">
                <summary>CSV format and rules</summary>
                <code>order_id,date,product,quantity,unit_price,status,currency</code>
                <p>One row per line item. Refunds are separate positive rows.</p>
                <a href="./data-contract.md">Full data contract ↗</a>
              </details>
              <button
                className="mobile-filter-toggle"
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="report-filters"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                Report filters {filtersOpen ? "−" : "+"}
              </button>
              <div
                id="report-filters"
                className={`control-group ${filtersOpen ? "is-open" : ""}`}
              >
                <div className="control-title">
                  <span>Report filters</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStart("");
                      setEnd("");
                      setStatus("all");
                      setProduct("all");
                    }}
                  >
                    Reset
                  </button>
                </div>
                <label>
                  From date
                  <input
                    type="date"
                    value={start}
                    max={end || undefined}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Through date
                  <input
                    type="date"
                    value={end}
                    min={start || undefined}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="completed">Completed</option>
                    <option value="refunded">Refunded</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label>
                  Product
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  >
                    <option value="all">All products</option>
                    {products.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="source-note">
                <span className="source-dot" />{" "}
                <span>
                  <strong>{datasetName}</strong>
                  <br />
                  {isSample
                    ? "Synthetic examples · no customer data"
                    : "Local file · never sent to a server"}
                </span>
              </div>
            </aside>
            <div className="report-content">
              {report ? (
                <>
                  <div className="report-toolbar">
                    <p>
                      {visibleLines.length} of {lines.length} rows in this view{" "}
                      <span>·</span> {report.currency}
                    </p>
                    <div>
                      {!isSample && (
                        <button
                          type="button"
                          className="toolbar-button restore-button"
                          onClick={reset}
                        >
                          Restore sample
                        </button>
                      )}
                      <button
                        type="button"
                        className="toolbar-button"
                        onClick={() => {
                          download(
                            "rowcraft-summary.json",
                            `${JSON.stringify(report, null, 2)}\n`,
                            "application/json",
                          );
                          setNotice(
                            "Summary JSON downloaded for the current report filters.",
                          );
                        }}
                      >
                        Export summary <span>↗</span>
                      </button>
                      <button
                        type="button"
                        className="toolbar-button"
                        onClick={monthlyCsv}
                      >
                        Monthly CSV <span>↓</span>
                      </button>
                      <button
                        type="button"
                        className="toolbar-button print"
                        onClick={() => window.print()}
                      >
                        Print <span>↗</span>
                      </button>
                    </div>
                  </div>
                  <ImportNotice notice={notice} issues={issues} />
                  <section
                    className="kpi-grid"
                    aria-label="Key performance indicators"
                  >
                    <article className="kpi primary">
                      <p>
                        COMPLETED REVENUE{" "}
                        <span title="Sum of completed line amounts only">
                          ⓘ
                        </span>
                      </p>
                      <strong>
                        {money(report.completed_revenue, report.currency)}
                      </strong>
                      <small>Completed items · {report.currency}</small>
                    </article>
                    <article className="kpi">
                      <p>
                        NET REVENUE{" "}
                        <span title="Completed revenue minus explicit refunded rows">
                          ⓘ
                        </span>
                      </p>
                      <strong>
                        {money(report.net_revenue, report.currency)}
                      </strong>
                      <small>After explicit refunds</small>
                    </article>
                    <article className="kpi">
                      <p>COMPLETED ORDERS</p>
                      <strong>{report.completed_orders}</strong>
                      <small>Unique order IDs</small>
                    </article>
                    <article className="kpi">
                      <p>AVERAGE ORDER VALUE</p>
                      <strong>
                        {money(report.average_order_value, report.currency)}
                      </strong>
                      <small>Completed revenue ÷ completed orders</small>
                    </article>
                    <article className="kpi">
                      <p>
                        REFUND RATE{" "}
                        <span title="Refunded value divided by completed revenue">
                          ⓘ
                        </span>
                      </p>
                      <strong>{pct(report.refund_rate_by_value)}</strong>
                      <small>
                        {report.refund_rate_by_value === null
                          ? "No completed revenue for a rate"
                          : `${money(report.refunded_amount, report.currency)} refunded by value`}
                      </small>
                    </article>
                  </section>
                  {report.duplicate_rows.length > 0 && (
                    <p className="notice">
                      Source CSV has possible duplicate rows{" "}
                      {report.duplicate_rows.join(", ")}. This warning covers
                      the full dataset, including rows outside current filters.
                    </p>
                  )}
                  <div className="analysis-grid">
                    <TrendChart report={report} />
                    <ProductBars report={report} />
                  </div>
                  <section
                    className="table-section"
                    aria-labelledby="table-title"
                  >
                    <div className="section-heading table-heading">
                      <div>
                        <p className="eyebrow">LINE ITEMS</p>
                        <h3 id="table-title">Order detail</h3>
                      </div>
                      <label className="search-label">
                        Search rows
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Order, product, status…"
                        />
                      </label>
                    </div>
                    <div
                      className="table-wrap"
                      role="region"
                      aria-label="Order detail table"
                      tabIndex={0}
                    >
                      <table>
                        <thead>
                          <tr>
                            {(
                              ["date", "order_id", "product", "amount"] as const
                            ).map((key) => (
                              <th
                                key={key}
                                aria-sort={
                                  sort === key
                                    ? ascending
                                      ? "ascending"
                                      : "descending"
                                    : "none"
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSort(key);
                                    setAscending(
                                      sort === key ? !ascending : true,
                                    );
                                  }}
                                >
                                  {key === "order_id"
                                    ? "ORDER"
                                    : key.toUpperCase()}{" "}
                                  {sort === key ? (ascending ? "↑" : "↓") : ""}
                                </button>
                              </th>
                            ))}
                            <th>QTY</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((line, index) => (
                            <tr
                              key={`${line.order_id}-${line.date}-${line.product}-${index}`}
                            >
                              <td>{line.date}</td>
                              <td className="order-cell">{line.order_id}</td>
                              <td>{line.product}</td>
                              <td>
                                {moneyCents(
                                  lineAmountCents(line),
                                  report.currency,
                                )}
                              </td>
                              <td>{line.quantity}</td>
                              <td>
                                <span
                                  className={`status status-${line.status}`}
                                >
                                  {line.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {!rows.length && (
                            <tr>
                              <td colSpan={6} className="empty-cell">
                                No rows match this search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="table-foot" aria-live="polite">
                      Showing {rows.length} of {visibleLines.length} filtered
                      line items. Search narrows this table only; date, status,
                      and product filters recalculate report metrics.
                    </p>
                  </section>
                </>
              ) : (
                <div className="no-rows">
                  <ImportNotice notice={notice} issues={issues} />
                  <p className="eyebrow">NOTHING IN THIS VIEW</p>
                  <h3>No rows match these filters.</h3>
                  <p>Clear one or more filters to restore the report.</p>
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setStart("");
                      setEnd("");
                      setStatus("all");
                      setProduct("all");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="method" id="method">
          <div>
            <p className="eyebrow">A SMALL TOOL WITH A REAL ENGINE</p>
            <h2>
              One contract.
              <br />
              <em>Two runtimes.</em>
            </h2>
            <p className="method-intro">
              The numbers follow the same documented rules whether the report
              runs on your laptop or inside this browser demo.
            </p>
          </div>
          <div className="method-columns">
            <article>
              <span>01</span>
              <h3>Python engine</h3>
              <p>
                A reusable package validates order exports, calculates money
                with Decimal, and creates JSON, normalized CSV, and a printable
                HTML report.
              </p>
              <code>python -m rowcraft.cli analyze …</code>
            </article>
            <article>
              <span>02</span>
              <h3>Local API</h3>
              <p>
                FastAPI exposes a typed health check and CSV analysis route for
                local development. It is not hosted by GitHub Pages.
              </p>
              <code>localhost:8000/docs</code>
            </article>
            <article>
              <span>03</span>
              <h3>Browser demo</h3>
              <p>
                This static app calculates in your browser. Uploads never leave
                this page, and the sample dataset is synthetic.
              </p>
              <a href="./data-contract.md">Read the data contract ↗</a>
              <br />
              <a href="./walkthrough.md">Demo walkthrough ↗</a>
            </article>
          </div>
        </section>
        <footer>
          <a className="brand" href="#top">
            <span className="brand-mark">r.</span>
            <span>rowcraft</span>
          </a>
          <p>Clear reporting from the data you already have.</p>
          <a
            href={repoUrl || "https://github.com/mrl0r3"}
            target="_blank"
            rel="noreferrer"
          >
            {repoUrl ? "Source repository ↗" : "GitHub profile ↗"}
          </a>
          <span>
            © 2026 · Built by{" "}
            <a
              href="https://github.com/mrl0r3"
              target="_blank"
              rel="noreferrer"
            >
              MRL0R3
            </a>
          </span>
        </footer>
      </main>
    </>
  );
}
