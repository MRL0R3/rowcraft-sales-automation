"""Command-line interface for local CSV analysis."""

import argparse
import csv
import sys
from pathlib import Path

from rowcraft.csv_ingest import CSVInputError, parse_orders
from rowcraft.metrics import calculate_report, html_report


def safe_cell(value: str) -> str:
    dangerous = value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@"))
    return f"'{value}" if dangerous else value


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="rowcraft", description="Validate an order CSV and create a sales report."
    )
    sub = parser.add_subparsers(dest="command", required=True)
    analyze = sub.add_parser("analyze", help="Analyze an order CSV locally")
    analyze.add_argument("csv", type=Path, help="Input CSV path")
    analyze.add_argument(
        "--output", type=Path, default=Path("output"), help="Output directory (default: output)"
    )
    analyze.add_argument("--force", action="store_true", help="Replace existing report files")
    args = parser.parse_args()
    try:
        lines, duplicates = parse_orders(args.csv.read_bytes())
        report = calculate_report(lines, duplicates)
        args.output.mkdir(parents=True, exist_ok=True)
        outputs = {
            "report.json": report.model_dump_json(indent=2),
            "report.html": html_report(report),
        }
        output_names = [*outputs, "normalized.csv"]
        conflicts = [args.output / name for name in output_names if (args.output / name).exists()]
        if conflicts and not args.force:
            raise FileExistsError(
                f"Output exists: {', '.join(str(path) for path in conflicts)}. Pass --force to replace it."
            )
        for name, content in outputs.items():
            (args.output / name).write_text(content + "\n", encoding="utf-8")
        with (args.output / "normalized.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(
                ["order_id", "date", "product", "quantity", "unit_price", "status", "currency"]
            )
            for line in lines:
                writer.writerow(
                    [
                        safe_cell(line.order_id),
                        line.date.isoformat(),
                        safe_cell(line.product),
                        line.quantity,
                        line.unit_price,
                        line.status,
                        line.currency,
                    ]
                )
        print(f"Analyzed {len(lines)} rows. Report written to {args.output.resolve()}")
    except (OSError, CSVInputError, FileExistsError) as exc:
        print(f"rowcraft: error: {exc}", file=sys.stderr)
        if isinstance(exc, CSVInputError):
            for issue in exc.issues:
                print(f"  row {issue.row}, {issue.field}: {issue.message}", file=sys.stderr)
        raise SystemExit(2) from exc


if __name__ == "__main__":
    main()
