"""Typed records and API response contracts."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["completed", "refunded", "cancelled"]


class OrderLine(BaseModel):
    model_config = ConfigDict(frozen=True)

    order_id: str
    date: date
    product: str
    quantity: int
    unit_price: Decimal
    status: Status
    currency: str

    @property
    def amount(self) -> Decimal:
        return self.quantity * self.unit_price


class Issue(BaseModel):
    row: int
    field: str
    message: str


class ProductMetric(BaseModel):
    product: str
    completed_revenue: str
    quantity: int
    orders: int


class MonthlyMetric(BaseModel):
    month: str
    completed_revenue: str
    refunded_amount: str
    net_revenue: str
    completed_orders: int


class Report(BaseModel):
    currency: str
    row_count: int
    completed_revenue: str
    refunded_amount: str
    net_revenue: str
    completed_orders: int
    average_order_value: str
    refund_rate_by_value: str | None
    monthly: list[MonthlyMetric]
    products: list[ProductMetric]
    duplicate_rows: list[int]


class AnalyzeResponse(BaseModel):
    report: Report


class ErrorResponse(BaseModel):
    detail: str
    issues: list[Issue] = Field(default_factory=list)
