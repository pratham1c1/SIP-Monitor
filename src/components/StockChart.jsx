import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./StockChart.css";

function formatAxisDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function PurchaseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const purchases = point?.purchasesAtPoint || [];
  if (!purchases.length) return null;

  return (
    <div className="purchase-tooltip">
      <strong>Purchase{purchases.length > 1 ? "s" : ""}</strong>
      {purchases.map((purchase) => (
        <div key={purchase.id || `${purchase.date}-${purchase.price}-${purchase.shares}`}>
          <span>Date: {formatAxisDate(purchase.date)}</span>
          <span>Purchase Price: ₹{Number(purchase.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          <span>Bought: {purchase.shares} shares</span>
          <span>Investment: ₹{Number(purchase.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

function PurchaseDot({ cx, cy, payload }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(payload?.purchaseMarker)) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="#dc2626"
      stroke="#ffffff"
      strokeWidth={2}
    />
  );
}

function findMarkerPoint(purchase, prices) {
  if (!prices.length) return null;

  const exact = prices.find((point) => point.date === purchase.date);
  if (exact) return exact;

  // Purchases can happen on weekends/holidays. Place the marker on the
  // nearest available trading day so it remains visible on the Yahoo series.
  const target = new Date(`${purchase.date}T00:00:00`).getTime();
  return prices.reduce((closest, point) => {
    const distance = Math.abs(new Date(`${point.date}T00:00:00`).getTime() - target);
    if (!closest) return { point, distance };
    return distance < closest.distance ? { point, distance } : closest;
  }, null)?.point || null;
}

export default function StockChart({ prices = [], purchases = [] }) {
  const markerByDate = new Map();

  purchases.forEach((purchase) => {
    const markerPoint = findMarkerPoint(purchase, prices);
    if (!markerPoint) return;

    const existing = markerByDate.get(markerPoint.date) || [];
    existing.push(purchase);
    markerByDate.set(markerPoint.date, existing);
  });

  const data = prices.map((point) => {
    const purchasesAtPoint = markerByDate.get(point.date) || [];
    return {
      ...point,
      label: formatAxisDate(point.date),
      purchasesAtPoint,
      // The marker is positioned on the actual historical market-price line,
      // while the tooltip separately shows the user's purchase price.
      purchaseMarker: purchasesAtPoint.length ? point.price : null,
    };
  });

  if (!data.length) {
    return <div className="chart-empty">Live price history unavailable.</div>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip content={<PurchaseTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="purchaseMarker"
            stroke="transparent"
            strokeWidth={0}
            dot={<PurchaseDot />}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
