import { useMemo, useState } from "react";
import { formatDate } from "../utils/dateUtils";
import "./History.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const initialFilters = {
  stock: "",
  month: "",
  year: "",
  from: "",
  to: "",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function History({ purchases, setPurchases }) {
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: "", shares: "", price: "" });
  const [error, setError] = useState("");

  const stocks = [...new Set(purchases.map((purchase) => purchase.stockSymbol))].sort();

  const years = [
    ...new Set(purchases.map((purchase) => purchase.date.slice(0, 4))),
  ].sort().reverse();

  const filteredPurchases = useMemo(
    () =>
      purchases
        .filter((purchase) => {
          const date = purchase.date;

          return (
            (!filters.stock || purchase.stockSymbol === filters.stock) &&
            (!filters.month || date.slice(5, 7) === filters.month) &&
            (!filters.year || date.slice(0, 4) === filters.year) &&
            (!filters.from || date >= filters.from) &&
            (!filters.to || date <= filters.to)
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [purchases, filters]
  );

  function resetFilters() {
    setFilters(initialFilters);
  }

  function startEdit(purchase) {
    setEditingId(purchase.id);
    setEditForm({
      date: purchase.date,
      shares: String(purchase.shares),
      price: String(purchase.price),
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ date: "", shares: "", price: "" });
    setError("");
  }

  function saveEdit(purchase) {
    if (!editForm.date || editForm.date > today()) {
      setError("Please select a valid purchase date.");
      return;
    }

    if (!Number.isInteger(Number(editForm.shares)) || Number(editForm.shares) <= 0) {
      setError("Please enter a valid whole number of shares.");
      return;
    }

    if (!Number.isFinite(Number(editForm.price)) || Number(editForm.price) <= 0) {
      setError("Please enter a valid purchase price.");
      return;
    }

    const shares = Number(editForm.shares);
    const price = Number(editForm.price);

    setPurchases((previous) =>
      previous.map((item) =>
        item.id === purchase.id
          ? {
              ...item,
              date: editForm.date,
              shares,
              price,
              amount: shares * price,
            }
          : item
      )
    );

    cancelEdit();
  }

  function deletePurchase(purchase) {
    const confirmed = window.confirm(
      `Delete the ${formatDate(purchase.date)} purchase of ${purchase.stockName}?`
    );

    if (!confirmed) return;

    setPurchases((previous) => previous.filter((item) => item.id !== purchase.id));
    if (editingId === purchase.id) cancelEdit();
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>History</h1>
          <p>Every actual purchase remains a separate record.</p>
        </div>
      </div>

      <section className="card filters">
        <div className="field">
          <label>Stock</label>
          <select
            className="select"
            value={filters.stock}
            onChange={(event) => setFilters({ ...filters, stock: event.target.value })}
          >
            <option value="">All stocks</option>
            {stocks.map((stock) => (
              <option key={stock} value={stock}>{stock}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Month</label>
          <select
            className="select"
            value={filters.month}
            onChange={(event) => setFilters({ ...filters, month: event.target.value })}
          >
            <option value="">All months</option>
            {Array.from({ length: 12 }, (_, index) => {
              const value = String(index + 1).padStart(2, "0");
              const label = new Date(2000, index, 1).toLocaleString("en-IN", { month: "long" });
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </div>

        <div className="field">
          <label>Year</label>
          <select
            className="select"
            value={filters.year}
            onChange={(event) => setFilters({ ...filters, year: event.target.value })}
          >
            <option value="">All years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Date From</label>
          <input className="input" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        </div>

        <div className="field">
          <label>Date To</label>
          <input className="input" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        </div>

        <button className="btn secondary" onClick={resetFilters}>Reset</button>
      </section>

      {error && <div className="error history-error">{error}</div>}

      <section className="history-list section">
        {filteredPurchases.length ? (
          filteredPurchases.map((purchase) => (
            <article className="card history-item" key={purchase.id}>
              <div className="history-stock">
                <strong>{purchase.stockName}</strong>
                <span>{purchase.stockSymbol} · {purchase.exchange || "NSE"} · {formatDate(purchase.date)}</span>
              </div>

              {editingId === purchase.id ? (
                <>
                  <div className="field history-edit-field">
                    <label>Date</label>
                    <input
                      className="input"
                      type="date"
                      max={today()}
                      value={editForm.date}
                      onChange={(event) => setEditForm({ ...editForm, date: event.target.value })}
                    />
                  </div>
                  <div className="field history-edit-field">
                    <label>Shares</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      value={editForm.shares}
                      onChange={(event) => setEditForm({ ...editForm, shares: event.target.value })}
                    />
                  </div>
                  <div className="field history-edit-field">
                    <label>Price</label>
                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editForm.price}
                      onChange={(event) => setEditForm({ ...editForm, price: event.target.value })}
                    />
                  </div>
                  <div className="history-actions">
                    <strong>{money(Number(editForm.shares) * Number(editForm.price))}</strong>
                    <button className="btn compact" onClick={() => saveEdit(purchase)}>Save</button>
                    <button className="btn secondary compact" onClick={cancelEdit}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div><small>Shares</small><strong>{purchase.shares}</strong></div>
                  <div><small>Price</small><strong>{money(purchase.price)}</strong></div>
                  <div className="history-amount"><small>Investment</small><strong>{money(purchase.amount)}</strong></div>
                  <div className="history-actions">
                    <button
                      className="icon-btn edit-icon"
                      type="button"
                      onClick={() => startEdit(purchase)}
                      aria-label={`Edit ${purchase.stockName} purchase`}
                      title="Edit purchase"
                    >
                      ✎
                    </button>
                    <button
                      className="icon-btn delete-icon"
                      type="button"
                      onClick={() => deletePurchase(purchase)}
                      aria-label={`Delete ${purchase.stockName} purchase`}
                      title="Delete purchase"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        ) : (
          <div className="empty">No purchase records match the selected filters.</div>
        )}
      </section>
    </>
  );
}
