"""Deterministic order metrics and safely escaped static HTML report."""

from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal
from html import escape

from rowcraft.models import MonthlyMetric, OrderLine, ProductMetric, Report

CENT = Decimal("0.01")


def money(value: Decimal) -> str:
    return str(value.quantize(CENT, rounding=ROUND_HALF_UP))


def calculate_report(lines: list[OrderLine], duplicate_rows: list[int] | None = None) -> Report:
    if not lines:
        raise ValueError("At least one valid order row is required.")
    currency = lines[0].currency
    completed = [line for line in lines if line.status == "completed"]
    refunded = [line for line in lines if line.status == "refunded"]
    completed_total = sum((line.amount for line in completed), Decimal(0))
    refunded_total = sum((line.amount for line in refunded), Decimal(0))
    completed_orders = len({line.order_id for line in completed})
    monthly: dict[str, dict] = defaultdict(
        lambda: {"completed": Decimal(0), "refunded": Decimal(0), "orders": set()}
    )
    products: dict[str, dict] = defaultdict(
        lambda: {"revenue": Decimal(0), "quantity": 0, "orders": set()}
    )
    for line in lines:
        month = line.date.strftime("%Y-%m")
        if line.status == "completed":
            monthly[month]["completed"] += line.amount
            monthly[month]["orders"].add(line.order_id)
            products[line.product]["revenue"] += line.amount
            products[line.product]["quantity"] += line.quantity
            products[line.product]["orders"].add(line.order_id)
        elif line.status == "refunded":
            monthly[month]["refunded"] += line.amount
    monthly_rows = [
        MonthlyMetric(
            month=month,
            completed_revenue=money(item["completed"]),
            refunded_amount=money(item["refunded"]),
            net_revenue=money(item["completed"] - item["refunded"]),
            completed_orders=len(item["orders"]),
        )
        for month, item in sorted(monthly.items())
    ]
    product_rows = [
        ProductMetric(
            product=name,
            completed_revenue=money(item["revenue"]),
            quantity=item["quantity"],
            orders=len(item["orders"]),
        )
        for name, item in sorted(
            products.items(), key=lambda x: (-x[1]["revenue"], x[0].lower(), x[0])
        )
    ]
    refund_rate = (
        (refunded_total / completed_total).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
        if completed_total
        else None
    )
    return Report(
        currency=currency,
        row_count=len(lines),
        completed_revenue=money(completed_total),
        refunded_amount=money(refunded_total),
        net_revenue=money(completed_total - refunded_total),
        completed_orders=completed_orders,
        average_order_value=money(completed_total / completed_orders)
        if completed_orders
        else "0.00",
        refund_rate_by_value=str(refund_rate) if refund_rate is not None else None,
        monthly=monthly_rows,
        products=product_rows,
        duplicate_rows=duplicate_rows or [],
    )


def html_report(report: Report) -> str:
    rows = "".join(
        f"<tr><td>{escape(row.product)}</td><td>{row.completed_revenue} {escape(report.currency)}</td><td>{row.quantity}</td></tr>"
        for row in report.products
    )
    return f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rowcraft sales report</title><style>body{{font:16px system-ui;max-width:920px;margin:4rem auto;padding:0 1.5rem;color:#18232b;background:#f6f7f4}}article{{background:white;padding:2rem;border:1px solid #dce2df}}h1{{font-size:2.5rem}}.kpis{{display:flex;gap:2rem;flex-wrap:wrap}}table{{width:100%;border-collapse:collapse}}td,th{{padding:.8rem;border-bottom:1px solid #dce2df;text-align:left}}</style><article><p>ROWCRAFT · LOCAL REPORT</p><h1>Sales, made clear.</h1><p>{report.row_count} validated rows · {escape(report.currency)}</p><section class="kpis"><div><small>Completed revenue</small><h2>{report.completed_revenue}</h2></div><div><small>Net revenue</small><h2>{report.net_revenue}</h2></div><div><small>Refunded</small><h2>{report.refunded_amount}</h2></div></section><h2>Products</h2><table><thead><tr><th>Product</th><th>Revenue</th><th>Units</th></tr></thead><tbody>{rows}</tbody></table><p>Generated locally by Rowcraft. Currency: {escape(report.currency)}.</p></article></html>"""
