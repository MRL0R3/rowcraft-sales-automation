import type { Report } from "../lib/orders";
import { formatMoney as money } from "../lib/formatMoney";

export function TrendChart({ report }: { report: Report }) {
  const width = 680;
  const height = 240;
  const left = 54;
  const right = 20;
  const top = 18;
  const bottom = 42;
  const max = Math.max(
    1,
    ...report.monthly.map((item) => Number(item.completed_revenue)),
  );
  const points = report.monthly.map((item, index) => ({
    ...item,
    x:
      left +
      (report.monthly.length <= 1
        ? 0
        : (index * (width - left - right)) / (report.monthly.length - 1)),
    y:
      top +
      (1 - Number(item.completed_revenue) / max) * (height - top - bottom),
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <figure className="chart" aria-labelledby="trend-title">
      <figcaption>
        <div>
          <p className="eyebrow">Performance</p>
          <h3 id="trend-title">Monthly completed sales</h3>
        </div>
        <span className="chart-key">
          <i /> Revenue · {report.currency}
        </span>
      </figcaption>
      {report.monthly.length ? (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Monthly completed revenue: ${report.monthly.map((m) => `${m.month} ${money(m.completed_revenue, report.currency)}`).join("; ")}`}
          >
            {[0, 0.5, 1].map((fraction) => {
              const y = top + (1 - fraction) * (height - top - bottom);
              return (
                <g key={fraction}>
                  <line
                    x1={left}
                    x2={width - right}
                    y1={y}
                    y2={y}
                    className="grid-line"
                  />
                  <text
                    x={left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="axis-text"
                  >
                    {Math.round(max * fraction)}
                  </text>
                </g>
              );
            })}
            <polyline points={line} className="trend-line" />
            {points.map((point) => (
              <g key={point.month}>
                <circle cx={point.x} cy={point.y} r="4" className="trend-dot" />
                <text
                  x={point.x}
                  y={height - 12}
                  textAnchor="middle"
                  className="axis-text"
                >
                  {new Date(`${point.month}-01T00:00:00`).toLocaleDateString(
                    "en",
                    { month: "short", year: "2-digit" },
                  )}
                </text>
                <title>
                  {point.month}:{" "}
                  {money(point.completed_revenue, report.currency)}
                </title>
              </g>
            ))}
          </svg>
          <p className="chart-note">
            Revenue shown by local business date. Refunded rows are reported
            separately.
          </p>
        </>
      ) : (
        <p className="empty">No completed sales in this selection.</p>
      )}
    </figure>
  );
}

export function ProductBars({ report }: { report: Report }) {
  const top = report.products.slice(0, 5);
  const largest = Math.max(
    1,
    ...top.map((item) => Number(item.completed_revenue)),
  );
  return (
    <section className="product-panel" aria-labelledby="products-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mix</p>
          <h3 id="products-title">Top products</h3>
        </div>
        <span className="muted">By completed revenue</span>
      </div>
      {top.length ? (
        <ol className="product-list">
          {top.map((item) => (
            <li key={item.product}>
              <div className="product-line">
                <span>{item.product}</span>
                <strong>
                  {money(item.completed_revenue, report.currency)}
                </strong>
              </div>
              <div
                className="bar-track"
                aria-label={`${item.product}: ${money(item.completed_revenue, report.currency)}`}
              >
                <span
                  style={{
                    width: `${Math.max(2, (Number(item.completed_revenue) / largest) * 100)}%`,
                  }}
                />
              </div>
              <small>
                {item.quantity} units · {item.orders} completed orders
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">No completed products in this selection.</p>
      )}
    </section>
  );
}
