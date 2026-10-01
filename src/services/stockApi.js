const YAHOO_CHART_URL = "/api/yahoo/v8/finance/chart";
const NSE_EQUITY_CSV_URL = "/api/nse/content/equities/EQUITY_L.csv";
const NSE_ETF_CSV_URL = "/api/nse/content/equities/eq_etfseclist.csv";
const AMFI_SCHEME_URL = "/api/amfi/DownloadSchemeData_Po.aspx?mf=0";

const searchCache = new Map();
const historyCache = new Map();
const quoteCache = new Map();
let nseSymbolsPromise = null;
let etfSymbolsPromise = null;
let mfSchemesPromise = null;

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

async function request(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.chart?.error?.description || data?.message || `Market API returned ${response.status}.`);
  }
  if (data?.chart?.error) {
    throw new Error(data.chart.error.description || "Yahoo Finance returned an error.");
  }
  return data;
}

function yahooSymbol(symbol, exchange = "") {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (normalized.includes(".")) return normalized;
  if (String(exchange).toUpperCase() === "NSE") return `${normalized}.NS`;
  if (String(exchange).toUpperCase() === "BSE") return `${normalized}.BO`;
  return normalized;
}

function rangeToYahooRange(range) {
  if (range === "3M") return "3mo";
  if (range === "6M") return "6mo";
  if (range === "1Y") return "1y";
  if (range === "5Y") return "5y";
  return "6mo";
}

async function loadEtfSymbols() {
  if (etfSymbolsPromise) return etfSymbolsPromise;

  etfSymbolsPromise = fetch(NSE_ETF_CSV_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`NSE ETF list returned ${response.status}.`);
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return [];

      const first = parseCsvLine(lines[0]);
      const headers = first.map((header) => header.toUpperCase());
      const symbolIndex = headers.findIndex((header) => /SYMBOL|SECURITY.*CODE|TCKR/.test(header));
      const nameIndex = headers.findIndex((header) => /NAME|SECURITY.*NAME|SECURITY/.test(header));
      const start = symbolIndex >= 0 ? 1 : 0;

      return lines.slice(start).map(parseCsvLine).map((fields) => ({
        symbol: String(fields[symbolIndex >= 0 ? symbolIndex : 0] || "").trim().toUpperCase(),
        instrumentName: String(fields[nameIndex >= 0 ? nameIndex : 1] || fields[0] || "").trim(),
        exchange: "NSE",
        instrumentType: "ETF",
        country: "India",
      })).filter((item) => item.symbol && item.instrumentName);
    })
    .catch((error) => {
      etfSymbolsPromise = null;
      throw error;
    });

  return etfSymbolsPromise;
}

async function loadMfSchemes() {
  if (mfSchemesPromise) return mfSchemesPromise;

  mfSchemesPromise = fetch(AMFI_SCHEME_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`AMFI scheme list returned ${response.status}.`);
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const schemes = [];

      for (const line of lines) {
        const fields = line.split(";").map((field) => field.trim());
        if (fields.length < 5 || !/^\d+$/.test(fields[0])) continue;

        const schemeCode = fields[0];
        const schemeName = fields[1];
        const isinGrowth = fields[2];
        const isinReinvestment = fields[3];

        if (!schemeName) continue;
        schemes.push({
          symbol: schemeCode,
          instrumentName: schemeName,
          exchange: "AMFI",
          instrumentType: "MF",
          isin: isinGrowth || isinReinvestment || "",
          country: "India",
        });
      }

      return schemes;
    })
    .catch((error) => {
      mfSchemesPromise = null;
      throw error;
    });

  return mfSchemesPromise;
}

async function loadNseSymbols() {
  if (nseSymbolsPromise) return nseSymbolsPromise;

  nseSymbolsPromise = fetch(NSE_EQUITY_CSV_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`NSE symbol list returned ${response.status}.`);
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return [];

      const headers = parseCsvLine(lines[0]).map((header) => header.toUpperCase());
      const symbolIndex = headers.indexOf("SYMBOL");
      const nameIndex = headers.indexOf("NAME OF COMPANY");
      const seriesIndex = headers.indexOf("SERIES");

      if (symbolIndex < 0) throw new Error("NSE CSV does not contain SYMBOL column.");

      return lines.slice(1).map(parseCsvLine).map((fields) => ({
        symbol: String(fields[symbolIndex] || "").trim().toUpperCase(),
        instrumentName: String(fields[nameIndex] || fields[symbolIndex] || "").trim(),
        exchange: "NSE",
        instrumentType: seriesIndex >= 0 ? String(fields[seriesIndex] || "EQ").trim() : "EQ",
        country: "India",
      })).filter((item) => item.symbol && item.instrumentName);
    })
    .catch((error) => {
      nseSymbolsPromise = null;
      throw error;
    });

  return nseSymbolsPromise;
}

export async function searchSymbols(query) {
  const normalized = query.trim().toUpperCase();
  if (!normalized) return [];
  if (searchCache.has(normalized)) return searchCache.get(normalized);

  try {
    const [stocks, etfs, mfs] = await Promise.allSettled([
      loadNseSymbols(),
      loadEtfSymbols(),
      loadMfSchemes(),
    ]);

    const allSymbols = [
      ...(stocks.status === "fulfilled" ? stocks.value : []),
      ...(etfs.status === "fulfilled" ? etfs.value : []),
      ...(mfs.status === "fulfilled" ? mfs.value : []),
    ];

    const results = allSymbols
      .filter((item) =>
        `${item.symbol} ${item.instrumentName} ${item.isin || ""}`.toUpperCase().includes(normalized)
      )
      .slice(0, 20);
    searchCache.set(normalized, results);
    return results;
  } catch {
    searchCache.set(normalized, []);
    return [];
  }
}

export async function getCurrentPrice(symbol, exchange = "") {
  const cacheKey = `${symbol}:${exchange}`;
  if (quoteCache.has(cacheKey)) return quoteCache.get(cacheKey);

  const ticker = yahooSymbol(symbol, exchange);
  const params = new URLSearchParams({ range: "1d", interval: "1d", events: "div,splits" });
  const data = await request(`${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?${params}`);
  const meta = data?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice ?? meta?.previousClose);

  if (!Number.isFinite(price)) throw new Error("No current price returned by Yahoo Finance.");
  quoteCache.set(cacheKey, price);
  return price;
}

export async function getHistoricalPrices(symbol, range = "6M", exchange = "") {
  const cacheKey = `${symbol}:${exchange}:${range}`;
  if (historyCache.has(cacheKey)) return historyCache.get(cacheKey);

  const ticker = yahooSymbol(symbol, exchange);
  const params = new URLSearchParams({
    range: rangeToYahooRange(range),
    interval: "1d",
    events: "div,splits",
  });

  const data = await request(`${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?${params}`);
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  const values = timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    price: Number(closes[index]),
  })).filter((point) => Number.isFinite(point.price) && point.price > 0);

  if (!values.length) throw new Error("No historical prices returned by Yahoo Finance.");
  historyCache.set(cacheKey, values);
  return values;
}

export function getMarketApiStatus() {
  return { configured: true, provider: "Yahoo Finance" };
}
