# Rowcraft product upgrade plan

## Diagnosis (7 November 2026)

The CSV parser, Python engine, browser calculations, filters, and downloads are implemented. The sample is intentionally synthetic and labelled. The product still feels like a mock because the dashboard hides its real workflow behind a marketing intro, uses 8–10 px data text, gives little help before upload, and presents several calculated outputs with weak hierarchy. The browser money formatter also mishandles negative decimal strings.

## Execution order

### 1. Trust and correctness

- [x] Fix negative-money display, including net revenue after refunds exceed sales.
- [x] Make every visible metric and export state its data scope; ensure duplicate warnings match the active view.
- [x] Show validation failures as actionable row issues, preserve the previous report, and provide a sample CSV download.
- [x] Add focused regression coverage for negative money; report-state coverage added.

### 2. Product workflow

- [x] Rework the first screen around an immediate report and a clear `Use sample / Upload CSV` flow.
- [x] Add an import guide with exact columns, limits, and privacy status at the point of action.
- [x] Expose average order value and refund semantics visibly; explain zero-denominator states.
- [x] Ensure search, filters, sort, exports, and restore have clear, consistent feedback.

### 3. Visual system and accessibility

- [x] Replace miniature data typography with readable 12–16 px text, stronger hierarchy, and 40+ px controls.
- [x] Refine chart axes, table density, color contrast, keyboard focus, and mobile layouts.
- [x] Review 1440 px, 768 px, and 390/375 px screens in a browser, then correct clipping and awkward spacing.

### 4. Engineering and proof

- [x] Break the large `App.tsx` and compressed stylesheet into maintainable sections where it improves reviewability.
- [x] Keep Python and TypeScript parity on shared fixtures and document the static Pages/local API boundary.
- [x] Run the existing Python and frontend checks, inspect the production bundle, and record actual outcomes.
- [x] Update README with real product proof and screenshots if the browser tooling can export them.

## Working constraints

GitHub Pages remains static. The browser will calculate uploaded files locally; the Python API runs separately for local development. Synthetic examples remain labelled. No remote publication is authorized. Prioritize correctness and an immediately usable report before extra marketing sections.

## Verification

`ruff check backend/src backend/tests`; `ruff format --check backend/src backend/tests`; `pytest backend/tests`; then from `frontend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and browser review of the served build.

## First upgrade pass completed

- Added safe negative-money formatting in `frontend/src/lib/formatMoney.ts` and a regression test.
- Added average order value to the dashboard, a downloadable example CSV, a direct schema link, and row-by-row upload feedback.
- Clarified that duplicate warnings cover the source dataset even when filters are active.
- Enlarged text and controls, reduced hero height, and collapsed mobile filters behind a labelled button so metrics arrive sooner.
- Served the production build locally and visually reviewed the report at a narrow viewport. The upload panel, filter toggle, exports, and top KPIs render without clipping in that view.
- Verified `npm run lint`, `npm run typecheck`, `npm run test` (14 passed), and `npm run build` after the changes.

## Completion review (7 November 2026)

- Python: Ruff check and format passed; 17 tests passed. The test environment emits one upstream Starlette/httpx deprecation warning.
- Frontend: lint, typecheck, 16 tests, and Vite production build passed. `npm audit` reported 0 vulnerabilities.
- The shared golden fixture still verifies Python/TypeScript parity. The browser import, filter, search, export, restore, invalid-row, and negative-money paths have automated coverage.
- Production preview was visually reviewed at 1440×900, 768×1024, 390×844, and 375×812. Document width matched viewport width at each inspected breakpoint. The order table scrolls within its own region. The 375 px layout uses one-column upload controls; the tablet chart uses the full report width.
- The table header no longer overlaps rows during page scrolling. The first desktop viewport now includes the report. Browser screenshots were visible during inspection, but the browser surface could not export them into repository files; `docs/screenshots/README.md` records that limit.
- No external GitHub repository, Pages deployment, or API hosting was created.

