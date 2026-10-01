import { useEffect, useMemo, useState } from "react";
import {
  calculateInvestmentAmount,
  calculatePendingAmount,
} from "../utils/investmentCalculator";
import InvestmentConsistencyChart from "../components/InvestmentConsistencyChart";
import "./Execution.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const today = () => new Date().toISOString().slice(0, 10);

function getSipStartDate(plans, symbol, exchange) {
  const starts = plans
    .filter(
      (plan) =>
        plan.stockSymbol === symbol &&
        (plan.exchange || "NSE") === (exchange || "NSE") &&
        plan.effectiveFrom
    )
    .map((plan) => plan.effectiveFrom)
    .sort();

  return starts[0] ? `${starts[0]}-01` : "";
}

export default function Execution({ plans, purchases, setPurchases }) {
  const stocks = useMemo(() => {
    const map = new Map();

    plans.forEach((plan) => {
      const key = `${plan.stockSymbol}:${plan.exchange || "NSE"}`;
      const existing = map.get(key);
      if (!existing || String(plan.effectiveFrom || "") > String(existing.effectiveFrom || "")) {
        map.set(key, {
          stockSymbol: plan.stockSymbol,
          stockName: plan.stockName,
          exchange: plan.exchange || "NSE",
          effectiveFrom: plan.effectiveFrom,
        });
      }
    });

    return [...map.values()].sort((a, b) => a.stockSymbol.localeCompare(b.stockSymbol));
  }, [plans]);

  const firstStock = stocks[0];
  const firstStartDate = firstStock
    ? getSipStartDate(plans, firstStock.stockSymbol, firstStock.exchange)
    : "";

  const [form, setForm] = useState(() => ({
    stockSymbol: firstStock?.stockSymbol || "",
    stockName: firstStock?.stockName || "",
    exchange: firstStock?.exchange || "NSE",
    date: firstStartDate && firstStartDate <= today() ? today() : firstStartDate,
    shares: "",
    price: "",
  }));
  const [overBuy, setOverBuy] = useState(null);
  const [error, setError] = useState("");

  const selectedStock = stocks.find(
    (stock) =>
      stock.stockSymbol === form.stockSymbol &&
      stock.exchange === (form.exchange || "NSE")
  );

  const sipStartDate = selectedStock
    ? getSipStartDate(plans, selectedStock.stockSymbol, selectedStock.exchange)
    : "";

  useEffect(() => {
    if (!stocks.length) {
      setForm((previous) => ({
        ...previous,
        stockSymbol: "",
        stockName: "",
        exchange: "NSE",
        date: "",
      }));
      return;
    }

    const selected = stocks.find(
      (stock) =>
        stock.stockSymbol === form.stockSymbol &&
        stock.exchange === (form.exchange || "NSE")
    ) || stocks[0];

    const minDate = getSipStartDate(plans, selected.stockSymbol, selected.exchange);
    setForm((previous) => {
      const nextDate = !previous.date || (minDate && previous.date < minDate)
        ? (minDate && minDate <= today() ? today() : minDate)
        : previous.date;

      if (
        previous.stockSymbol === selected.stockSymbol &&
        previous.exchange === selected.exchange &&
        previous.stockName === selected.stockName &&
        previous.date === nextDate
      ) {
        return previous;
      }

      return {
        ...previous,
        stockSymbol: selected.stockSymbol,
        stockName: selected.stockName,
        exchange: selected.exchange,
        date: nextDate,
      };
    });
  }, [stocks, plans, form.stockSymbol, form.exchange]);

  const pending = form.stockSymbol
    ? calculatePendingAmount(
        plans,
        purchases,
        form.stockSymbol,
        form.date ? form.date.slice(0, 7) : new Date().toISOString().slice(0, 7)
      )
    : 0;

  const amount = calculateInvestmentAmount(form.shares, form.price);

  function resetForm() {
    const stock = stocks[0];
    const minDate = stock ? getSipStartDate(plans, stock.stockSymbol, stock.exchange) : "";
    setForm({
      stockSymbol: stock?.stockSymbol || "",
      stockName: stock?.stockName || "",
      exchange: stock?.exchange || "NSE",
      date: minDate && minDate <= today() ? today() : minDate,
      shares: "",
      price: "",
    });
    setError("");
    setOverBuy(null);
  }

  function handleStockChange(event) {
    const [symbol, exchange] = event.target.value.split(":");
    const selected = stocks.find(
      (stock) => stock.stockSymbol === symbol && stock.exchange === exchange
    );
    const minDate = selected
      ? getSipStartDate(plans, selected.stockSymbol, selected.exchange)
      : "";

    setForm((previous) => ({
      ...previous,
      stockSymbol: symbol,
      exchange,
      stockName: selected?.stockName || "",
      date: minDate && previous.date < minDate
        ? (minDate <= today() ? today() : minDate)
        : previous.date,
    }));
    setError("");
  }

  function validate() {
    if (!form.stockSymbol.trim()) {
      setError("Please select a stock from the current plan.");
      return false;
    }

    if (!form.date || form.date > today()) {
      setError("Please select a valid purchase date.");
      return false;
    }

    if (sipStartDate && form.date < sipStartDate) {
      setError(`Purchase date cannot be before the SIP start month (${sipStartDate.slice(0, 7)}).`);
      return false;
    }

    if (!Number.isInteger(Number(form.shares)) || Number(form.shares) <= 0) {
      setError("Please enter a valid whole number of shares.");
      return false;
    }

    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
      setError("Please enter a valid purchase price.");
      return false;
    }

    return true;
  }

  function createPurchase() {
    return {
      id: crypto.randomUUID(),
      stockSymbol: form.stockSymbol.trim().toUpperCase(),
      stockName: form.stockName.trim(),
      exchange: form.exchange || "NSE",
      date: form.date,
      shares: Number(form.shares),
      price: Number(form.price),
      amount,
    };
  }

  function savePurchase() {
    setPurchases((previous) => [...previous, createPurchase()]);
    resetForm();
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;

    if (amount > pending) {
      setOverBuy({
        pending,
        amount,
        extra: amount - pending,
      });
      return;
    }

    savePurchase();
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Execution</h1>
          <p>Record actual purchases for stocks currently present in your plan.</p>
        </div>
      </div>

      <section className="card execution-card">
        {form.stockSymbol && (
          <div className="buying-power">
            <span>Current buying power for selected month</span>
            <strong>{money(pending)}</strong>
          </div>
        )}

        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label>Stock Symbol</label>
            <select
              className="select"
              value={`${form.stockSymbol}:${form.exchange}`}
              onChange={handleStockChange}
              disabled={!stocks.length}
            >
              {stocks.length ? (
                stocks.map((stock) => (
                  <option
                    key={`${stock.stockSymbol}-${stock.exchange}`}
                    value={`${stock.stockSymbol}:${stock.exchange}`}
                  >
                    {stock.stockSymbol} · {stock.stockName}
                  </option>
                ))
              ) : (
                <option value="">No stocks in Plan</option>
              )}
            </select>
          </div>

          <div className="field">
            <label>Stock Name</label>
            <input className="input" value={form.stockName} readOnly />
          </div>

          <div className="field">
            <label>Purchase Date</label>
            <input
              className="input"
              type="date"
              value={form.date}
              min={sipStartDate || undefined}
              max={today()}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            {sipStartDate && (
              <small className="field-help">
                Purchases can be recorded from {sipStartDate.slice(0, 7)} onward.
              </small>
            )}
          </div>

          <div className="field">
            <label>Number of Shares</label>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={form.shares}
              onChange={(event) => setForm({ ...form, shares: event.target.value })}
            />
          </div>

          <div className="field">
            <label>Purchase Price (₹)</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="200"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </div>

          <div className="amount-preview">
            <span>Investment Amount</span>
            <strong>{money(amount)}</strong>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button className="btn" disabled={!stocks.length}>Record Purchase</button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2 className="section-title">Monthly Investment Consistency</h2>
        <p className="section-subtitle">
          Twelve months are shown from the SIP start month, then the window rolls forward as time moves on.
        </p>

        <div className="consistency-grid">
          {stocks.length ? (
            stocks.map((stock) => (
              <article className="card consistency-card" key={`${stock.stockSymbol}-${stock.exchange}`}>
                <div className="consistency-header">
                  <div>
                    <strong>{stock.stockName}</strong>
                    <span>{stock.stockSymbol} · {stock.exchange}</span>
                  </div>
                </div>
                <InvestmentConsistencyChart
                  symbol={stock.stockSymbol}
                  plans={plans}
                  purchases={purchases}
                />
              </article>
            ))
          ) : (
            <div className="empty">Add a stock to your plan to see its monthly consistency.</div>
          )}
        </div>
      </section>

      {overBuy && (
        <div className="modal-backdrop">
          <div className="modal card">
            <h3>This purchase exceeds your current buying power.</h3>
            <div className="overbuy-grid">
              <span>Buying Power</span>
              <strong>{money(overBuy.pending)}</strong>
              <span>Purchase Amount</span>
              <strong>{money(overBuy.amount)}</strong>
              <span>Extra Amount</span>
              <strong>{money(overBuy.extra)}</strong>
            </div>
            <p>Do you want to continue? The monthly plan will not be changed.</p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setOverBuy(null)}>Cancel</button>
              <button className="btn" onClick={savePurchase}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
