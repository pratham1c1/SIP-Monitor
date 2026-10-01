import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SummaryCard from "../components/SummaryCard";
import StockCard from "../components/StockCard";
import { getCurrentPrice } from "../services/stockApi";
import {
  calculateDistribution,
  calculatePendingAmount,
  calculatePortfolioValue,
  calculateTotalInvested,
  calculateSharesOwned,
} from "../utils/investmentCalculator";
import "./Analyze.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const ranges = [
  ["3M", "3 months"],
  ["6M", "6 months"],
  ["1Y", "1 year"],
  ["5Y", "5 years"],
];

export default function Analyze({ plans, purchases }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [historyRange, setHistoryRange] = useState("6M");
  const [prices, setPrices] = useState({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [selectedStockKey, setSelectedStockKey] = useState("");

  const stocks = useMemo(() => {
    const map = new Map();

    plans.forEach((plan) => {
      const key = `${plan.stockSymbol}:${plan.exchange || "NSE"}`;
      map.set(key, {
        stockSymbol: plan.stockSymbol,
        stockName: plan.stockName,
        exchange: plan.exchange || "NSE",
        type: plan.type || "Other",
      });
    });

    purchases.forEach((purchase) => {
      const key = `${purchase.stockSymbol}:${purchase.exchange || "NSE"}`;
      if (!map.has(key)) {
        map.set(key, {
          stockSymbol: purchase.stockSymbol,
          stockName: purchase.stockName,
          exchange: purchase.exchange || "NSE",
          type: purchase.type || "Other",
        });
      }
    });

    return [...map.values()];
  }, [plans, purchases]);

  const pendingStocks = useMemo(() => {
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

    return [...map.values()];
  }, [plans]);

  const distribution = calculateDistribution(purchases);

  const totalPending = pendingStocks.reduce(
    (sum, stock) =>
      sum +
      calculatePendingAmount(
        plans,
        purchases,
        stock.stockSymbol,
        currentMonth
      ),
    0
  );

  const totalMonthlyPlan = pendingStocks.reduce((sum, stock) => {
    const currentPlan = plans
      .filter(
        (plan) =>
          plan.stockSymbol === stock.stockSymbol &&
          plan.effectiveFrom <= currentMonth
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

    return sum + Number(currentPlan?.monthlyAmount || 0);
  }, 0);

  const portfolioValue = calculatePortfolioValue(purchases, prices);

  const selectedStock = useMemo(
    () => pendingStocks.find((stock) => `${stock.stockSymbol}:${stock.exchange}` === selectedStockKey) || null,
    [pendingStocks, selectedStockKey]
  );

  const selectedPurchases = useMemo(() =>
    selectedStock
      ? purchases.filter((purchase) => purchase.stockSymbol === selectedStock.stockSymbol)
      : purchases,
    [purchases, selectedStock]
  );

  const selectedPending = selectedStock
    ? calculatePendingAmount(plans, purchases, selectedStock.stockSymbol, currentMonth)
    : totalPending;

  const selectedMonthlyPlan = selectedStock
    ? plans
        .filter(
          (plan) =>
            plan.stockSymbol === selectedStock.stockSymbol &&
            plan.effectiveFrom <= currentMonth
        )
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.monthlyAmount || 0
    : totalMonthlyPlan;

  const selectedInvested = calculateTotalInvested(selectedPurchases);
  const selectedShares = selectedStock
    ? calculateSharesOwned(selectedPurchases, selectedStock.stockSymbol)
    : 0;
  const selectedPortfolioValue = selectedStock
    ? selectedShares * Number(prices[selectedStock.stockSymbol] || 0)
    : portfolioValue;

  useEffect(() => {
    let active = true;

    async function loadPortfolioPrices() {
      if (!stocks.length) {
        setPrices({});
        return;
      }

      setPriceLoading(true);
      setPriceError("");

      const nextPrices = {};
      let failed = false;

      await Promise.all(
        stocks.map(async (stock) => {
          try {
            nextPrices[stock.stockSymbol] = await getCurrentPrice(
              stock.stockSymbol,
              stock.exchange
            );
          } catch {
            failed = true;
          }
        })
      );

      if (active) {
        setPrices(nextPrices);
        setPriceLoading(false);
        if (failed) setPriceError("Some live prices could not be fetched.");
      }
    }

    loadPortfolioPrices();
    return () => {
      active = false;
    };
  }, [stocks]);

  const holdingsWithPrice = stocks.filter((stock) =>
    Number.isFinite(Number(prices[stock.stockSymbol]))
  ).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Analyze</h1>
          <p>Your investment plan and portfolio at a glance.</p>
        </div>
      </div>

      <div className="grid summary-grid">
        <SummaryCard icon="↗" label={selectedStock ? `${selectedStock.stockSymbol} Invested` : "Total Invested"} value={money(selectedInvested)} hint={selectedStock ? "Actual purchases for selected stock" : "Actual purchases"} />
        <SummaryCard icon="◎" label={selectedStock ? "Monthly Plan" : "Monthly Plan"} value={money(selectedMonthlyPlan)} hint={selectedStock ? "Current allocation for selected stock" : "Current allocations"} />
        <SummaryCard icon="◌" label="Pending Investment" value={money(selectedPending)} hint={selectedStock ? "Buying power for selected stock" : "Buying power"} />
        <SummaryCard
          icon="₹"
          label={selectedStock ? `${selectedStock.stockSymbol} Value` : "Portfolio Value"}
          value={priceLoading ? "Loading…" : selectedStock ? (Number.isFinite(Number(prices[selectedStock.stockSymbol])) ? money(selectedPortfolioValue) : "—") : holdingsWithPrice ? money(portfolioValue) : "—"}
          hint={priceError || (selectedStock ? "Current market value for selected stock" : (holdingsWithPrice ? `${holdingsWithPrice}/${stocks.length} holdings priced` : "Requires live prices"))}
        />
      </div>

      <div className="grid two-col section">
        <section className="card dashboard-panel">
          <h2 className="section-title">Investment Distribution</h2>
          {distribution.length ? (
            <div className="distribution">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {distribution.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={`hsl(${210 + index * 32} 50% ${45 + (index % 3) * 8}%)`}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="distribution-list">
                {distribution.map((item) => (
                  <div key={item.name}>
                    <span>{item.name}</span>
                    <strong>{money(item.value)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">Purchases will appear here after your first execution.</div>
          )}
        </section>

        <section className="card dashboard-panel pending-panel">
          <h2 className="section-title">Investment</h2>
          {pendingStocks.length ? (
            <>
              <div className="pending-header" aria-hidden="true">
                <span>Stock</span>
                <span>Pending Investment</span>
              </div>
              <div className="pending-list">
              {pendingStocks.map((stock) => (
                <button
                  type="button"
                  className={`pending-row ${selectedStockKey === `${stock.stockSymbol}:${stock.exchange}` ? "selected" : ""}`}
                  key={`${stock.stockSymbol}-${stock.exchange}`}
                  onClick={() => setSelectedStockKey(`${stock.stockSymbol}:${stock.exchange}`)}
                  aria-pressed={selectedStockKey === `${stock.stockSymbol}:${stock.exchange}`}
                >
                  <span>
                    <strong>{stock.stockName}</strong>
                    <small>{stock.stockSymbol} · {stock.exchange}</small>
                  </span>
                  <b>{money(calculatePendingAmount(plans, purchases, stock.stockSymbol, currentMonth))}</b>
                </button>
              ))}
              </div>
            </>
          ) : (
            <div className="empty">Add a monthly plan to start tracking buying power.</div>
          )}
        </section>
      </div>

      <section className="section">
        <div className="stocks-heading">
          <div>
            <h2 className="section-title">Stocks</h2>
            <p className="section-subtitle">Historical chart defaults to 6 months.</p>
          </div>
          <div className="range-switcher" aria-label="Historical range">
            {ranges.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={historyRange === value ? "active" : ""}
                onClick={() => setHistoryRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid stock-grid">
          {stocks.length ? (
            stocks.map((stock) => (
              <StockCard
                key={`${stock.stockSymbol}-${stock.exchange}`}
                stock={stock}
                plans={plans}
                purchases={purchases}
                historyRange={historyRange}
              />
            ))
          ) : (
            <div className="empty">No stocks planned or purchased yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
