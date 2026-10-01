import { useEffect, useState } from "react";
import { getCurrentPrice, getHistoricalPrices, getMarketApiStatus } from "../services/stockApi";
import {
  calculatePendingAmount,
  calculateSharesOwned,
  calculateTotalInvested,
} from "../utils/investmentCalculator";
import StockChart from "./StockChart";
import "./StockCard.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function StockCard({ stock, plans, purchases, historyRange = "6M" }) {
  const [price, setPrice] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const apiStatus = getMarketApiStatus();

  const ownPurchases = purchases.filter(
    (purchase) => purchase.stockSymbol === stock.stockSymbol
  );

  useEffect(() => {
    let active = true;

    async function loadMarketData() {
      const errors = [];

      try {
        const current = await getCurrentPrice(stock.stockSymbol, stock.exchange);
        if (active) setPrice(current);
      } catch {
        errors.push("price");
        if (active) setPrice(null);
      }

      try {
        const historical = await getHistoricalPrices(
          stock.stockSymbol,
          historyRange,
          stock.exchange
        );
        if (active) setHistory(historical);
      } catch {
        errors.push("history");
        if (active) setHistory([]);
      }

      if (active) {
        setError(
          errors.length
            ? apiStatus.configured
              ? "Some market data is temporarily unavailable."
              : "Market data is unavailable."
            : ""
        );
      }
    }

    loadMarketData();
    return () => {
      active = false;
    };
  }, [stock.stockSymbol, stock.exchange, historyRange, apiStatus.configured]);

  const invested = calculateTotalInvested(ownPurchases);
  const shares = calculateSharesOwned(purchases, stock.stockSymbol);
  const pending = calculatePendingAmount(plans, purchases, stock.stockSymbol);

  return (
    <div className="stock-card card">
      <div className="stock-header">
        <div>
          <h3>{stock.stockName}</h3>
          <span>{stock.stockSymbol} · {stock.exchange || "NSE"} · {stock.type || "Other"}</span>
        </div>

        <div className="stock-price">
          <strong>{price == null ? "—" : money(price)}</strong>
          <small>{price == null ? "Latest price" : "Latest price"}</small>
        </div>
      </div>

      {error && <div className="stock-error">{error}</div>}

      <StockChart prices={history} purchases={ownPurchases} />

      <div className="stock-stats">
        <div>
          <span>Total Invested</span>
          <strong>{money(invested)}</strong>
        </div>
        <div>
          <span>Current Value</span>
          <strong>{price == null ? "—" : money(shares * price)}</strong>
        </div>
        <div>
          <span>Shares Owned</span>
          <strong>{shares}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{money(pending)}</strong>
        </div>
      </div>
    </div>
  );
}
