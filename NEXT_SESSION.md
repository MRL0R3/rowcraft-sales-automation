# Next session checkpoint

The Rowcraft product upgrade and GitHub publication are complete. Start with `UPGRADE_PLAN.md` and `FINAL_HANDOFF.md` for the implemented scope and verified quality gates. The project is at `D:\Work\Money\rowcraft-sales-automation` on `main`, tracking `origin/main`. The public repository is `https://github.com/MRL0R3/rowcraft-sales-automation`, and the live demo is `https://mrl0r3.github.io/rowcraft-sales-automation/`.

Last verified checks: Python Ruff lint/format and 17 tests; frontend lint, typecheck, 16 tests, production build, and npm audit with 0 vulnerabilities. Browser review covered 1440×900, 768×1024, 390×844, and 375×812; no document-level horizontal overflow was seen. GitHub CI passed, the Pages workflow deployed successfully, and the live URL returned HTTP 200.

To preview: from `frontend/`, run `npm ci`, `npm run build`, then `npm run preview`. The source `frontend/index.html` requires Vite and should not be opened directly as the app. Publication commands and Pages setup are in `docs/deployment.md`. Any later work should follow a new user request or a concrete defect, rather than rerunning this upgrade from scratch.
