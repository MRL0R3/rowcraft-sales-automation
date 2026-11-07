# Rowcraft implementation plan

## Milestones

- [x] A — Discover the workspace and define product, data, and deployment contracts.
- [x] B — Implement Python CSV engine, reports, CLI, local API, and tests.
- [x] C — Implement static React application, browser calculations, tests, and responsive UI.
- [x] D — Complete docs, portfolio materials, CI, and Pages workflow.
- [x] E — Run quality gates, inspect the rendered application, and record handoff.

## Decisions and blockers

- The provided directory contained only the task specification and was not a Git repository. The project was created in `rowcraft-sales-automation/` without changing the specification.
- Python 3.11 and Node 24 were used. A new local `main` branch has been initialized; no remote is configured.
- GitHub Pages is static hosting only; the FastAPI service is local developer tooling.
- Shared CSV/JSON fixtures are the source of truth. The browser supports two-decimal currencies with integer-cent math.
- No external publication, push, or deployment was authorized or performed.
- Visual review was completed in the browser at desktop (1440×900), tablet (768×1024), and mobile (390×844 and 375×812). Tablet and 375 px mobile layouts were checked for document-level horizontal overflow. Screenshots were available inline during inspection but could not be exported to `docs/screenshots/` by the browser tool.

## Verification commands

```powershell
python -m pip install -e "backend[dev]"
ruff check backend/src backend/tests
ruff format --check backend/src backend/tests
pytest backend/tests
rowcraft analyze fixtures/orders.csv --output output --force
cd frontend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
```

## Progress

- [x] Workspace discovery and environment check.
- [x] Python checks pass: 17 tests; Ruff lint and format checks; CLI analyzes 8 fixture rows.
- [x] Frontend checks pass: lint, typecheck, 13 tests, production build, and zero npm audit vulnerabilities after clean install.
- [x] Python and TypeScript are tested against the shared golden report.
- [x] Responsive browser review completed at the documented viewports.
- [x] Static build checked for relative assets and included docs; local Vite preview served successfully.
- [x] `FINAL_HANDOFF.md` and `NEXT_SESSION.md` record verified state.
- [ ] Create the GitHub repository, push, configure Pages, and verify the published URL (manual owner action; not authorized here).
