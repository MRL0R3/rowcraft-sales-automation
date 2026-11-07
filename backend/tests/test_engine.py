import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from rowcraft.api import app
from rowcraft.cli import main as cli_main
from rowcraft.cli import safe_cell
from rowcraft.csv_ingest import CSVInputError, parse_orders
from rowcraft.metrics import calculate_report, html_report

ROOT = Path(__file__).resolve().parents[2]
client = TestClient(app)


def test_golden_fixture_matches_shared_contract():
    lines, duplicates = parse_orders((ROOT / "fixtures/orders.csv").read_bytes())
    report = calculate_report(lines, duplicates).model_dump(exclude={"duplicate_rows"})
    expected = json.loads((ROOT / "fixtures/golden-report.json").read_text())
    assert report == expected


def test_precision_and_cancelled_lines():
    lines, _ = parse_orders((ROOT / "fixtures/edge-cases.csv").read_bytes())
    report = calculate_report(lines)
    assert report.completed_revenue == "0.30"
    assert report.net_revenue == "0.30"
    assert report.completed_orders == 2


def test_cancelled_only_and_empty_input_behavior():
    lines, _ = parse_orders((ROOT / "fixtures/cancelled-only.csv").read_bytes())
    report = calculate_report(lines)
    assert report.completed_orders == 0
    assert report.average_order_value == "0.00"
    assert report.refund_rate_by_value is None
    assert report.net_revenue == "0.00"
    with pytest.raises(CSVInputError, match="empty"):
        parse_orders(b"")


def test_invalid_fixture_lists_each_bad_record():
    with pytest.raises(CSVInputError) as error:
        parse_orders((ROOT / "fixtures/invalid-orders.csv").read_bytes())
    assert [issue.row for issue in error.value.issues] == [2, 3, 4]


def test_mixed_currency_rejected():
    with pytest.raises(CSVInputError, match="Mixed currencies"):
        parse_orders(
            "order_id,date,product,quantity,unit_price,status,currency\na,2026-01-01,x,1,1,completed,USD\nb,2026-01-01,x,1,1,completed,EUR"
        )


@pytest.mark.parametrize(
    "date_value,quantity,price,status",
    [
        ("2026-02-30", "1", "1", "completed"),
        ("2026-01-01", "0", "1", "completed"),
        ("2026-01-01", "1", "NaN", "completed"),
        ("2026-01-01", "1", "-1", "refunded"),
        ("2026-01-01", "1", "1.001", "completed"),
        ("2026-01-01", "1", "1", "unknown"),
    ],
)
def test_invalid_rows_have_actionable_row_number(date_value, quantity, price, status):
    text = f"order_id,date,product,quantity,unit_price,status,currency\no,{date_value},x,{quantity},{price},{status},USD"
    with pytest.raises(CSVInputError) as error:
        parse_orders(text)
    assert error.value.issues[0].row == 2


def test_duplicate_headers_and_unsafe_quantities_are_rejected():
    with pytest.raises(CSVInputError, match="Duplicate headers"):
        parse_orders(
            "order_id,date,product,quantity,unit_price,status,currency,currency\n"
            "x,2026-01-01,x,1,1,completed,USD,USD"
        )
    with pytest.raises(CSVInputError) as error:
        parse_orders(
            "order_id,date,product,quantity,unit_price,status,currency\n"
            "x,2026-01-01,x,900719925475,0,completed,USD"
        )
    assert "safe calculation limit" in error.value.issues[0].message


def test_duplicates_are_flagged_not_removed_and_bom_quoted_commas_work():
    lines, duplicates = parse_orders(
        '\ufefforder_id,date,product,quantity,unit_price,status,currency\n"a,1",2026-01-01,"Nice, product",1,1.20,completed,USD\n"a,1",2026-01-01,"Nice, product",1,1.20,completed,USD\n'
    )
    assert len(lines) == 2
    assert duplicates == [3]


def test_html_report_escapes_untrusted_product_text():
    lines, _ = parse_orders(
        "order_id,date,product,quantity,unit_price,status,currency\n"
        'a,2026-01-01,"<script>alert(1)</script>",1,1,completed,USD'
    )
    assert "&lt;script&gt;" in html_report(calculate_report(lines))
    assert "<script>alert(1)</script>" not in html_report(calculate_report(lines))
    assert safe_cell("  =1+1") == "'  =1+1"


def test_cli_outputs_and_refuses_partial_overwrite(tmp_path, monkeypatch, capsys):
    output = tmp_path / "out"
    monkeypatch.setattr(
        sys,
        "argv",
        ["rowcraft", "analyze", str(ROOT / "fixtures/orders.csv"), "--output", str(output)],
    )
    cli_main()
    assert {"report.json", "report.html", "normalized.csv"} == {
        path.name for path in output.iterdir()
    }
    (output / "normalized.csv").write_text("existing", encoding="utf-8")
    with pytest.raises(SystemExit) as error:
        cli_main()
    assert error.value.code == 2
    assert (output / "normalized.csv").read_text(encoding="utf-8") == "existing"
    assert "Pass --force" in capsys.readouterr().err


def test_api_health_and_upload_errors():
    assert client.get("/health").json()["status"] == "ok"
    response = client.post(
        "/api/v1/analyze", files={"file": ("orders.csv", b"wrong,headers\na,b", "text/csv")}
    )
    assert response.status_code == 400
    assert "Missing required columns" in response.json()["detail"]


def test_api_returns_typed_report():
    response = client.post(
        "/api/v1/analyze",
        files={"file": ("orders.csv", (ROOT / "fixtures/orders.csv").read_bytes(), "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["report"]["completed_revenue"] == "214.00"
