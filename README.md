# Rowcraft

**From messy orders to decisions.** A real Python sales reporting engine with a privacy-minded, browser-only interactive preview.

> **[Try the live dashboard](https://mrl0r3.github.io/rowcraft-sales-automation/)** · [View the source](https://github.com/MRL0R3/rowcraft-sales-automation)

> **Opening the HTML directly?** `frontend/index.html` is the source entry for Vite and is not standalone. From the project root, run `cd frontend` and `npm run dev`; Vite opens the working dashboard in your browser. After building, `npm run preview` opens the production bundle.

## The workflow

Small shops often rebuild sales summaries by hand from order exports. Rowcraft validates a predictable CSV contract, then reports completed sales, explicit refunds, net revenue, orders, average order value, monthly totals, and product mix. For the synthetic fixture, completed lines total **$214.00** across five unique completed orders; an explicit **$12.50** refund produces **$201.50** net revenue. Those figures are calculated from `fixtures/orders.csv` and verified against `fixtures/golden-report.json` by both implementations.

## What works

- Python package with strict CSV validation, Decimal money math, duplicate-line warnings, CLI exports, and a local FastAPI API.
- Static React + TypeScript dashboard with synthetic sample data, local CSV upload, filters that recalculate the report, searchable/sortable order detail, summary JSON, monthly CSV, and print styles.
- A downloadable example CSV and an in-page schema guide let visitors try the workflow with a real file. The dashboard shows row-specific validation errors while keeping the previous report visible.
- Papa Parse handles quoted CSV fields. Uploads stay in the browser; invalid uploads preserve the current report.
- Shared golden fixture verifies Python/TypeScript parity. Limits and semantics are explicit in [the data contract](docs/data-contract.md).
- No accounts, analytics, remote data calls, client data, or paid service dependency.

## Architecture

The Python engine is the reusable business logic. FastAPI runs locally for developers (`/health`, `/api/v1/analyze`, and OpenAPI docs); it is not the dashboard's backend and is not deployed on GitHub Pages. Pages hosts only the static React build, where calculations run in the browser using integer cents. See [architecture](docs/architecture.md).

## Quick start

From the repository root, install the backend and analyze the included fixture:

```powershell
python -m pip install -e "backend[dev]"
python -m rowcraft.cli analyze fixtures/orders.csv --output output/
python -m uvicorn rowcraft.api:app --reload --app-dir backend/src
```

In a second terminal, run the static demo:

```powershell
cd frontend
npm ci
npm run dev
```

Vite opens the dashboard automatically. After `npm run build`, use `npm run preview` to serve the production bundle. Do not open the source `frontend/index.html` by double-clicking; it needs Vite to compile and serve its TypeScript modules.

Start with the labelled synthetic report, then download the example CSV beside the upload area. Edit its rows and upload it locally to see the metrics change. Date, status, and product filters recalculate the KPIs and exports; search narrows the line-item table only. The browser does not send the file to the local API.

## Tests and CI

```powershell
python -m pip install -e "backend[dev]"
ruff check backend/src backend/tests
ruff format --check backend/src backend/tests
pytest backend/tests
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

GitHub Actions runs Python and frontend checks on pushes and pull requests. The Pages workflow builds and deploys on pushes to `main` or manual dispatch. [CI](https://github.com/MRL0R3/rowcraft-sales-automation/actions/workflows/ci.yml) and [Pages deployment](https://github.com/MRL0R3/rowcraft-sales-automation/actions/workflows/pages.yml) are available in the repository.

## Data and privacy

The required columns are `order_id,date,product,quantity,unit_price,status,currency`. Only `completed`, `refunded`, and `cancelled` statuses are accepted; currencies cannot be mixed within one report. Prices are per unit, refunds are separate positive rows, and dates have no invented timezone. Browser uploads are limited to 5 MB / 10,000 rows and are processed locally. Two-decimal currencies are supported in the browser. Do not use this demo as a tax, accounting, or settlement system without requirements review.

Repeated identical order lines are retained and flagged, since the engine cannot infer whether they are duplicates or legitimate split lines. Formula-leading export cells are escaped. Read [Security](SECURITY.md) before handling sensitive client data.

## Preview and project materials

The interface puts the upload and filters beside a compact report canvas, then surfaces the business calculations, monthly trend, product mix, and line detail. No marketing figures, customer claims, or testimonials are invented. See the [walkthrough](docs/walkthrough.md) and [publication steps](docs/deployment.md).

## Custom reporting automation

Need a tailored order or operations report? [Contact the developer through GitHub](https://github.com/mrl0r3) to discuss the data shape and workflow. Scope, timing, payment eligibility, and privacy requirements should be confirmed before any paid work. Reusable offer and proposal material lives in [`business/`](business/).

## License

MIT. See [LICENSE](LICENSE).
