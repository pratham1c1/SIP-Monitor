import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPlanForMonth } from "../utils/investmentCalculator";
import "./InvestmentConsistencyChart.css";

function addMonths(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getStartMonth(symbol, plans, purchases) {
  const planMonths = plans
    .filter((plan) => plan.stockSymbol === symbol && plan.effectiveFrom)
    .map((plan) => plan.effectiveFrom)
    .sort();

  if (planMonths.length) return planMonths[0];

  const purchaseMonths = purchases
    .filter((purchase) => purchase.stockSymbol === symbol && purchase.date)
    .map((purchase) => purchase.date.slice(0, 7))
    .sort();

  return purchaseMonths[0] || currentMonth();
}

function label(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export default function InvestmentConsistencyChart({ symbol, plans, purchases }) {
  const sipStartMonth = getStartMonth(symbol, plans, purchases);
  const rollingStart = addMonths(currentMonth(), -11);
  const startMonth = sipStartMonth > rollingStart ? sipStartMonth : rollingStart;
  const months = Array.from({ length: 12 }, (_, index) => addMonths(startMonth, index));

  const data = months.map((month) => {
    const plan = getPlanForMonth(plans, symbol, month);
    const actual = purchases
      .filter(
        (purchase) =>
          purchase.stockSymbol === symbol && purchase.date.slice(0, 7) === month
      )
      .reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);

    return {
      month,
      label: label(month),
      allocated: Number(plan?.monthlyAmount || 0),
      actual,
    };
  });

  return (
    <div className="consistency-chart">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value, name) => [
              `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
              name,
            ]}
            labelFormatter={(value, payload) => payload?.[0]?.payload?.month || value}
          />
          <Line
            type="monotone"
            dataKey="allocated"
            name="Allocated"
            stroke="#6b7280"
            strokeWidth={3}
            dot={false}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            fill="#b7e4c7"
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
