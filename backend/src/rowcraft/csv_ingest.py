"""Strict CSV ingestion with actionable physical CSV row numbers."""

import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from pydantic import ValidationError

from rowcraft.models import Issue, OrderLine

REQUIRED = ("order_id", "date", "product", "quantity", "unit_price", "status", "currency")
STATUSES = {"completed", "refunded", "cancelled"}
MAX_ROWS = 10_000
MAX_BYTES = 5 * 1024 * 1024
MAX_QUANTITY = 900_719_925_474
MAX_LINE_AMOUNT = Decimal("9007199254.74")
MONEY = re.compile(r"^(?:0|[1-9]\d*)(?:\.\d{1,2})?$")
DATE_FORMAT = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class CSVInputError(ValueError):
    def __init__(self, message: str, issues: list[Issue] | None = None):
        super().__init__(message)
        self.issues = issues or []


def parse_orders(data: bytes | str) -> tuple[list[OrderLine], list[int]]:
    raw = data.encode("utf-8") if isinstance(data, str) else data
    if len(raw) > MAX_BYTES:
        raise CSVInputError("CSV exceeds the 5 MB upload limit.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise CSVInputError("CSV must be UTF-8 encoded.") from exc
    try:
        reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
        headers = reader.fieldnames or []
        if not headers:
            raise CSVInputError("CSV is empty or has no header row.")
        normalized = [header.strip() if header else "" for header in headers]
        duplicates = sorted({name for name in normalized if normalized.count(name) > 1})
        if duplicates:
            raise CSVInputError(f"Duplicate headers: {', '.join(duplicates)}.")
        missing = [name for name in REQUIRED if name not in normalized]
        if missing:
            raise CSVInputError(f"Missing required columns: {', '.join(missing)}.")
        reader.fieldnames = normalized
        records: list[OrderLine] = []
        issues: list[Issue] = []
        fingerprints: dict[tuple[str, ...], int] = {}
        duplicate_rows: list[int] = []
        data_row_count = 0
        for row in reader:
            if not row or all(value is None or not value.strip() for value in row.values()):
                continue
            row_number = reader.line_num
            data_row_count += 1
            if data_row_count > MAX_ROWS:
                raise CSVInputError("CSV exceeds the 10,000 data row limit.")
            if None in row:
                issues.append(
                    Issue(row=row_number, field="row", message="Unexpected extra columns.")
                )
                continue
            values = {k: (v or "").strip() for k, v in row.items()}
            fingerprint = tuple(values.get(key, "") for key in REQUIRED)
            if fingerprint in fingerprints:
                duplicate_rows.append(row_number)
            fingerprints[fingerprint] = row_number
            try:
                if not values["order_id"]:
                    raise ValueError("Order ID is required.")
                if not values["product"]:
                    raise ValueError("Product is required.")
                if not re.fullmatch(r"[A-Z]{3}", values["currency"]):
                    raise ValueError("Currency must be a three-letter uppercase code.")
                if (
                    not values["quantity"].isascii()
                    or not values["quantity"].isdigit()
                    or not 0 < int(values["quantity"]) <= MAX_QUANTITY
                ):
                    raise ValueError(
                        "Quantity must be a positive whole number within the safe calculation limit."
                    )
                if not MONEY.fullmatch(values["unit_price"]):
                    raise ValueError(
                        "Unit price must be a non-negative amount with at most two decimals."
                    )
                price = Decimal(values["unit_price"])
                if not price.is_finite():
                    raise ValueError("Unit price must be finite.")
                if values["status"] not in STATUSES:
                    raise ValueError("Status must be completed, refunded, or cancelled.")
                if not DATE_FORMAT.fullmatch(values["date"]):
                    raise ValueError("Date must use ISO YYYY-MM-DD format.")
                line = OrderLine(
                    order_id=values["order_id"],
                    date=date.fromisoformat(values["date"]),
                    product=values["product"],
                    quantity=int(values["quantity"]),
                    unit_price=price,
                    status=values["status"],
                    currency=values["currency"],
                )
                if line.amount > MAX_LINE_AMOUNT:
                    raise ValueError("Line amount exceeds the supported safe calculation limit.")
                records.append(line)
            except (ValueError, InvalidOperation, ValidationError) as exc:
                issues.append(Issue(row=row_number, field="row", message=str(exc)))
        if issues:
            raise CSVInputError(f"CSV has {len(issues)} invalid row(s).", issues)
        if not records:
            raise CSVInputError("CSV contains no order rows.")
        currencies = {record.currency for record in records}
        if len(currencies) != 1:
            raise CSVInputError(
                "Mixed currencies are not supported. Analyze one currency at a time."
            )
        return records, duplicate_rows
    except csv.Error as exc:
        raise CSVInputError(f"Malformed CSV near row {reader.line_num}: {exc}") from exc
