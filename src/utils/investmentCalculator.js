export function calculateInvestmentAmount(shares, price) {
  return Number(shares) * Number(price);
}

export function calculateTotalInvested(purchases) {
  return purchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
}

export function calculateSharesOwned(purchases, symbol) {
  return purchases
    .filter((purchase) => purchase.stockSymbol === symbol)
    .reduce((sum, purchase) => sum + Number(purchase.shares || 0), 0);
}

export function getPlanForMonth(plans, symbol, month) {
  return (
    plans
      .filter(
        (plan) =>
          plan.stockSymbol === symbol &&
          plan.effectiveFrom <= month
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] || null
  );
}

export function calculateAccumulatedPlanned(plans, symbol, throughMonth) {
  const relevantPlans = plans
    .filter(
      (plan) =>
        plan.stockSymbol === symbol &&
        plan.effectiveFrom <= throughMonth
    )
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  if (!relevantPlans.length) return 0;

  let total = 0;
  let cursor = new Date(`${relevantPlans[0].effectiveFrom}-01T00:00:00`);
  const end = new Date(`${throughMonth}-01T00:00:00`);

  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    const plan = getPlanForMonth(plans, symbol, month);

    if (plan) {
      total += Number(plan.monthlyAmount);
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return total;
}

export function calculatePendingAmount(
  plans,
  purchases,
  symbol,
  throughMonth = new Date().toISOString().slice(0, 7)
) {
  const planned = calculateAccumulatedPlanned(plans, symbol, throughMonth);

  const invested = purchases
    .filter(
      (purchase) =>
        purchase.stockSymbol === symbol &&
        purchase.date.slice(0, 7) <= throughMonth
    )
    .reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);

  return planned - invested;
}

export function calculateDistribution(purchases) {
  const grouped = {};

  purchases.forEach((purchase) => {
    grouped[purchase.stockSymbol] =
      (grouped[purchase.stockSymbol] || 0) + Number(purchase.amount || 0);
  });

  return Object.entries(grouped).map(([name, value]) => ({
    name,
    value,
  }));
}

export function calculatePortfolioValue(purchases, prices) {
  const symbols = [...new Set(purchases.map((purchase) => purchase.stockSymbol))];

  return symbols.reduce(
    (total, symbol) =>
      total +
      calculateSharesOwned(purchases, symbol) *
        Number(prices[symbol] || 0),
    0
  );
}
