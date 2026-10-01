import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StockAutocomplete from "../components/StockAutocomplete";
import { currentMonth, monthLabel } from "../utils/dateUtils";
import "./Plan.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const TYPES = ["ETF", "MF", "Other"];

const emptyForm = () => ({
  stockSymbol: "",
  stockName: "",
  exchange: "NSE",
  type: "Other",
  monthlyAmount: "",
  targetPercent: "",
  effectiveFrom: currentMonth(),
});

function normalizePlan(plan) {
  const exchange = plan.exchange || "NSE";
  const effectiveFrom = plan.effectiveFrom || currentMonth();
  const stockSymbol = String(plan.stockSymbol || "").toUpperCase();

  return {
    ...plan,
    id: plan.id || `${stockSymbol}:${exchange}:${effectiveFrom}`,
    stockSymbol,
    exchange,
    effectiveFrom,
    type: TYPES.includes(plan.type) ? plan.type : "Other",
    targetPercent: Number.isFinite(Number(plan.targetPercent))
      ? Number(plan.targetPercent)
      : 0,
  };
}

export default function Plan({ plans, setPlans }) {
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const normalizedPlans = useMemo(() => plans.map(normalizePlan), [plans]);

  const currentPlans = useMemo(() => {
    const map = new Map();

    normalizedPlans.forEach((plan) => {
      const key = `${plan.stockSymbol}:${plan.exchange || ""}`;
      const existing = map.get(key);
      if (!existing || existing.effectiveFrom < plan.effectiveFrom) {
        map.set(key, plan);
      }
    });

    return [...map.values()].sort((a, b) =>
      a.stockSymbol.localeCompare(b.stockSymbol)
    );
  }, [normalizedPlans]);

  const totalMonthly = currentPlans.reduce(
    (sum, plan) => sum + Number(plan.monthlyAmount || 0),
    0
  );

  const totalTarget = currentPlans.reduce(
    (sum, plan) => sum + Number(plan.targetPercent || 0),
    0
  );

  const allocationChart = currentPlans.map((plan) => ({
    name: plan.stockSymbol,
    investment: Number(plan.monthlyAmount || 0),
  }));

  const deviationChart = currentPlans.map((plan) => ({
    name: plan.stockSymbol,
    target: Number(plan.targetPercent || 0),
    actual:
      totalMonthly > 0
        ? (Number(plan.monthlyAmount || 0) / totalMonthly) * 100
        : 0,
  }));

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError("");
  }

  function handleStockSelect(stock) {
    setForm((previous) => ({
      ...previous,
      stockSymbol: stock.symbol,
      stockName: stock.instrumentName,
      exchange: stock.exchange || "NSE",
      type: ["ETF", "MF"].includes(stock.instrumentType) ? stock.instrumentType : previous.type,
    }));
    setError("");
  }

  function savePlan(event) {
    event.preventDefault();

    const symbol = form.stockSymbol.trim().toUpperCase();
    const name = form.stockName.trim();
    const amount = Number(form.monthlyAmount);
    const targetPercent = Number(form.targetPercent || 0);

    if (!symbol || !name || !Number.isFinite(amount) || amount <= 0) {
      setError("Select a stock and enter a valid monthly amount.");
      return;
    }

    if (!Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
      setError("Target model % must be between 0 and 100.");
      return;
    }

    if (!form.effectiveFrom) {
      setError("Please select an effective month.");
      return;
    }

    const duplicate = normalizedPlans.find(
      (item) =>
        item.stockSymbol === symbol &&
        (item.exchange || "NSE") === (form.exchange || "NSE") &&
        item.effectiveFrom === form.effectiveFrom &&
        item.id !== editingId
    );

    if (duplicate) {
      setError("A plan for this stock and effective month already exists.");
      return;
    }

    const plan = {
      id: editingId || crypto.randomUUID(),
      stockSymbol: symbol,
      stockName: name,
      exchange: form.exchange || "NSE",
      type: form.type,
      monthlyAmount: amount,
      targetPercent,
      effectiveFrom: form.effectiveFrom,
    };

    setPlans((previous) =>
      editingId
        ? previous.map((item) => (item.id === editingId ? plan : item))
        : [...previous, plan]
    );

    resetForm();
  }

  function editPlan(plan) {
    setEditingId(plan.id);
    setForm({
      stockSymbol: plan.stockSymbol,
      stockName: plan.stockName,
      exchange: plan.exchange || "NSE",
      type: plan.type || "Other",
      monthlyAmount: plan.monthlyAmount,
      targetPercent: plan.targetPercent ?? "",
      effectiveFrom: plan.effectiveFrom,
    });
    setError("");
  }

  function removeStock(symbol, exchange) {
    if (
      window.confirm(
        `Remove ${symbol} from the plan? Existing purchase history will remain.`
      )
    ) {
      setPlans((previous) =>
        previous.filter(
          (plan) =>
            !(
              plan.stockSymbol === symbol &&
              (plan.exchange || "NSE") === (exchange || "NSE")
            )
        )
      );
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Plan</h1>
          <p>
            Define your monthly cash-flow plan and target portfolio mix. Plan
            changes use an effective month and do not alter old plan entries.
          </p>
        </div>
      </div>

      <section className="card plan-form">
        <h2 className="section-title">
          {editingId ? "Edit plan entry" : "Add stock to plan"}
        </h2>

        <form className="form-grid" onSubmit={savePlan}>
          <div className="field">
            <label>Stock Symbol</label>
            <StockAutocomplete
              value={form.stockSymbol}
              onChange={(value) =>
                setForm((previous) => ({ ...previous, stockSymbol: value }))
              }
              onSelect={handleStockSelect}
              placeholder="Type TCS, INFY, NIFTY..."
            />
            <small className="field-help">Searches NSE/BSE instruments.</small>
          </div>

          <div className="field">
            <label>Stock Name</label>
            <input
              className="input"
              placeholder="Auto populated from selected stock"
              value={form.stockName}
              readOnly
            />
          </div>

          <div className="field">
            <label>Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value })
              }
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Monthly Allocation (₹)</label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="5000"
              value={form.monthlyAmount}
              onChange={(event) =>
                setForm({ ...form, monthlyAmount: event.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Target Model %</label>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="20"
              value={form.targetPercent}
              onChange={(event) =>
                setForm({ ...form, targetPercent: event.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Effective From</label>
            <input
              className="input"
              type="month"
              value={form.effectiveFrom}
              onChange={(event) =>
                setForm({ ...form, effectiveFrom: event.target.value })
              }
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button className="btn">
              {editingId ? "Save Change" : "Add to Plan"}
            </button>

            {editingId && (
              <button type="button" className="btn secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card plan-list section">
        <div className="list-heading">
          <div>
            <h2 className="section-title">Current Monthly Allocations</h2>
            <small className="muted">Monthly cash-flow by stock</small>
          </div>
          <strong>Total: {money(totalMonthly)}</strong>
        </div>

        {currentPlans.length ? (
          <>
            <div className="plan-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={allocationChart} margin={{ top: 10, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="investment" name="Monthly Investment" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {currentPlans.map((plan) => (
              <div className="plan-row" key={`${plan.stockSymbol}-${plan.exchange}`}>
                <div className="plan-name">
                  <strong>{plan.stockName}</strong>
                  <span>
                    {plan.stockSymbol} · {plan.exchange} · {plan.type} · from {monthLabel(plan.effectiveFrom)}
                  </span>
                </div>

                <div className="plan-metrics">
                  <strong>{money(plan.monthlyAmount)}</strong>
                  <span>Target {Number(plan.targetPercent || 0).toFixed(1)}%</span>
                </div>

                <div className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => editPlan(plan)}>
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => removeStock(plan.stockSymbol, plan.exchange)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="empty">No monthly investments configured.</div>
        )}
      </section>

      <section className="card plan-list section">
        <div className="list-heading">
          <div>
            <h2 className="section-title">Target vs Actual Allocation</h2>
            <small className="muted">
              Actual % is based on your monthly allocation amounts.
            </small>
          </div>
          <strong className={Math.abs(totalTarget - 100) < 0.01 ? "target-ok" : "target-warning"}>
            Target total: {totalTarget.toFixed(1)}%
          </strong>
        </div>

        {currentPlans.length ? (
          <>
            {Math.abs(totalTarget - 100) >= 0.01 && (
              <div className="notice plan-warning">
                Your target model currently totals {totalTarget.toFixed(1)}%.
                Set targets across investments to reach 100% for a complete model.
              </div>
            )}
            <div className="plan-chart">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deviationChart} margin={{ top: 10, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="target" name="Target %" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="actual" name="Actual %" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="empty">Add investments to see your target model.</div>
        )}
      </section>

      <section className="card plan-list section">
        <h2 className="section-title">Plan History</h2>

        {normalizedPlans.length ? (
          [...normalizedPlans]
            .sort(
              (a, b) =>
                a.stockSymbol.localeCompare(b.stockSymbol) ||
                a.effectiveFrom.localeCompare(b.effectiveFrom)
            )
            .map((plan) => (
              <div className="plan-history-row" key={plan.id}>
                <span>
                  {plan.stockName} ({plan.stockSymbol}) · {plan.exchange} · {plan.type}
                </span>
                <b>{monthLabel(plan.effectiveFrom)}</b>
                <strong>
                  {money(plan.monthlyAmount)}/month · {Number(plan.targetPercent || 0).toFixed(1)}% target
                </strong>
              </div>
            ))
        ) : (
          <div className="empty">Plan changes will be retained here.</div>
        )}
      </section>
    </>
  );
}
