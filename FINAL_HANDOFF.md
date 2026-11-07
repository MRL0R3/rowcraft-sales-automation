# Final handoff

## Delivery

Rowcraft is implemented in `rowcraft-sales-automation/` as a locally runnable Python project and a static React + TypeScript portfolio demo. The Python engine validates CSV records and calculates metrics with `Decimal`; its CLI writes JSON, normalized CSV, and escaped static HTML. FastAPI offers local `/health` and `/api/v1/analyze` routes. The browser demo starts with synthetic shared fixture data, performs calculations locally, supports CSV upload, date/status/product filters, a searchable and sortable detail table, JSON/monthly CSV export, and print styling. A failed upload preserves the current dataset.

The demo uses no account, analytics, external data service, or server upload. GitHub Pages hosts only the static browser build. The FastAPI app remains a separately run local demonstration.

## Verified quality gates

Run from `D:\Work\Money\rowcraft-sales-automation` unless stated otherwise:

- `ruff check backend/src backend/tests` — passed.
- `ruff format --check backend/src backend/tests` — passed; 7 files already formatted.
- `pytest backend/tests` — **17 passed**. The environment emitted one `StarletteDeprecationWarning` from its installed `fastapi.testclient` integration about `httpx`; tests passed.
- `rowcraft analyze fixtures/orders.csv --output output --force` — passed; analyzed 8 rows and wrote the report to ignored `output/`.
- `npm ci` in `frontend/` — passed; 0 vulnerabilities.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed; **3 files, 16 tests**.
- `npm run build` — passed with Vite 8.3.6; JS bundle 264.47 kB (83.19 kB gzip), CSS 20.58 kB (5.21 kB gzip).
- `npm audit` — passed; 0 vulnerabilities.

The Python and TypeScript pipelines both consume the root golden report fixture. The static build emits relative `./assets/...` URLs and includes the project Markdown docs. `npx vite preview --host 127.0.0.1` served the built output. The npm project now defines `npm run preview`, which serves and opens the built site.

## Visual and accessibility review

The app was visually reviewed in a browser at 1440×900, 768×1024, 390×844, and 375×812. Tablet and 375 px mobile document widths were checked for horizontal overflow; the order table is intentionally scrollable inside its own region. Manual source review covers semantic section headings, labeled form controls, keyboard focus styling, reduced-motion preferences, chart text alternatives, and announced upload errors/status. Small text colors were adjusted to meet the intended contrast target.

No browser-generated screenshots could be saved as repository image files; the browser tool exposed them inline only. `docs/screenshots/README.md` records this accurately. Automated axe checks and Playwright browser smoke tests were not run.

## Known limitations

- The API is local-only. Deploying a production API would require separate hosting, security, privacy, and cost decisions.
- The browser supports currencies with two minor-unit digits only. Mixed currencies are rejected.
- The tool is not an accounting, tax, or settlement system; its data contract and limitations are documented.
- The test environment reports the Starlette/httpx deprecation warning noted above.
- The live GitHub Pages site is a static browser demo; the local FastAPI app is not hosted there.

## GitHub publication

The user authorized publication. The public repository is [MRL0R3/rowcraft-sales-automation](https://github.com/MRL0R3/rowcraft-sales-automation), and the [live demo](https://mrl0r3.github.io/rowcraft-sales-automation/) returned HTTP 200. The initial Pages run began before Pages was enabled and failed at deployment; Pages was then configured for GitHub Actions and the manually dispatched run completed successfully. CI on the initial push also passed. See [docs/deployment.md](docs/deployment.md) for the ongoing workflow.


## Follow-up: white page when double-clicking the source HTML

`frontend/index.html` is the Vite source entry, so it cannot run the TypeScript modules from a `file://` URL. It now shows startup instructions instead of a blank page when opened directly. `npm run dev` launches the local Vite server and opens the working dashboard automatically; after `npm run build`, `npm run preview` serves and opens the production bundle. The browser automation surface refused `file://` navigation, so I did not claim a direct-file visual check; the inline fallback is present in the HTML source and the npm scripts pass lint, type, test, and build checks.

## Completed product upgrade — 7 November 2026

`UPGRADE_PLAN.md` records the completed work. The browser report now shows a correct negative net amount, average order value, a downloadable example CSV, an in-page CSV schema guide, row-specific import errors, data-scope explanations, and feedback after exports. Mobile filters collapse to expose report metrics sooner. The desktop introduction was shortened to bring the report into the first viewport. The chart and product breakdown were extracted from `App.tsx`; the stylesheet was formatted for maintenance. The table header was corrected after a browser scroll review showed it covering a data row. The tablet trend chart now takes the full report width.

The final local frontend checks passed: lint, typecheck, **16 tests**, build, and npm audit (0 vulnerabilities). Python Ruff checks and **17 tests** passed. The production preview was reviewed at 1440×900, 768×1024, 390×844, and 375×812. The document had no horizontal overflow in those inspected layouts. Browser screenshots were available inline but could not be saved into this repository by the available browser surface; there are no screenshot image assets or automated axe results. The static Pages workflow subsequently deployed successfully on GitHub.
