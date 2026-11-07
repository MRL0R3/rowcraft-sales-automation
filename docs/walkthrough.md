# Demo walkthrough

1. Open the live demo after Pages is enabled, or run `cd frontend && npm ci && npm run dev`.
2. Inspect the clearly labeled synthetic sample and use the date, status, and product filters. Those filters recalculate the KPIs and charts. Search narrows only the detail table.
3. Try the summary JSON, monthly CSV, and print controls.
4. Choose a UTF-8 order CSV matching the documented headers. Parsing happens in the browser; invalid uploads leave the previous report visible and show row-level errors.
5. For the Python path, install once with `python -m pip install -e "backend[dev]"`, then run `python -m rowcraft.cli analyze fixtures/orders.csv --output output/` from the repository root.

The public page is a static browser demo. The Python API is local-only and is not called by the page.
