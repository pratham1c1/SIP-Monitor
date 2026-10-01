# SIP Investment Tracker PWA

A React + Vite Progressive Web App for tracking monthly investment plans, actual purchases, historical trades, target allocation, portfolio value and investment consistency.

## Start

Requirements:
- Node.js 18+ recommended
- VS Code

Run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## Yahoo Finance / NSE / BSE market data

The app uses the Yahoo Finance chart API for current and historical market values:

```text
https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
```

For Indian instruments, symbols are mapped automatically:

- NSE: `TCS` -> `TCS.NS`
- BSE: `TCS` -> `TCS.BO`

The same chart response provides the latest market price and historical daily prices for the 3M, 6M, 1Y and 5Y ranges. No market-data API key is required by the app.

An optional `VITE_TWELVE_DATA_API_KEY` can still be configured as a fallback for NSE/BSE symbol search when Yahoo search does not return a matching instrument.

**Important:** Yahoo Finance's chart endpoint is an unofficial/public endpoint rather than a versioned commercial API. If a production deployment needs guaranteed availability, put the market-data request behind a backend/proxy that you control.

## Plan page

- Search NSE/BSE instruments as you type.
- Selecting a result auto-populates Stock Name and exchange.
- Select investment type: `ETF`, `MF`, or `Other`.
- Set monthly allocation.
- Set Target Model % for each investment.
- Current Monthly Allocations includes a bar chart of monthly investment per stock.
- Target vs Actual Allocation compares the target percentage with the percentage implied by monthly allocation.
- The target model warning highlights when the configured targets do not total 100%.
- Existing plan history remains supported.

## Execution page

### Planned Stock

Use this when the stock is part of the monthly plan. Buying-power validation remains enabled.

### Previous / Historical Stock

Use this when the stock was purchased before the current plan or is not in the plan.

Example:

```text
Stock Symbol: TCS
Stock Name: Tata Consultancy Services
Purchase Date: 2025-07-15
Shares: 10
Purchase Price: ₹200
Investment Amount: ₹2,000
```

Historical purchases remain separate purchase records and do not create or modify a monthly plan.

Additional execution features:

- NSE/BSE stock suggestions while typing.
- Recent Purchases is no longer shown on the Execution page.
- Purchase records can be edited or deleted from History.
- Monthly Investment Consistency starts from each stock's SIP start month and shows 12 months from that point.
- Multiple purchases in the same month are summed into the Actual value for that month, and the chart updates immediately when purchase records change.

## Analyze page

- Portfolio Value uses Yahoo Finance latest market prices.
- Pending Investment has a scrollable list for many planned stocks.
- Stock historical charts default to 6 months.
- Chart range options: 3 months, 6 months, 1 year and 5 years.
- Purchases that are not in the current plan are also included in the stock/portfolio view.

## Browser/mobile Back

There is no in-app Back button. The app listens to browser history and keeps navigation inside the PWA routes. If the browser's Back action would otherwise leave the app, the current PWA route is restored instead.

## PIN

The PIN is stored as a SHA-256 derived value rather than plaintext.

## Data

LocalStorage keys:

- `sip_plans`
- `sip_purchases`
- `sip_auth`

Existing stored plans are backward-compatible: old plans without `exchange`, `type`, or `targetPercent` are treated as NSE / Other / 0% target respectively.

## Suggested manual test

1. First launch -> Create PIN.
2. Reload -> Login.
3. Plan -> type `TCS` and select an NSE/BSE suggestion.
4. Verify Stock Name is populated automatically.
5. Select `Other`, enter ₹5,000 and target 50%.
6. Add another stock with a target of 50%.
7. Verify the Current Monthly Allocations chart and Target vs Actual chart.
8. Execution -> Previous / Historical Stock -> search `TCS` and select it.
9. Enter a previous date such as `2025-07-15`, 10 shares and ₹200.
10. Open History and verify the purchase record appears.
11. Edit the purchase in History and save.
12. Delete the purchase from History and verify the confirmation popup.
13. Add several monthly purchases/missed months and inspect the 12-month consistency window from the SIP start month.
14. Analyze -> verify 6M is selected by default and try 3M, 1Y and 5Y.
15. Verify Portfolio Value and Stock cards load using Yahoo Finance market data.
16. Test the app at approximately 370x550 in browser mobile inspect mode.
17. Navigate between pages and use the browser/mobile Back button.
