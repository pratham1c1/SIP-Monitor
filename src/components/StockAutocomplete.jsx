import { useEffect, useRef, useState } from "react";
import { searchSymbols } from "../services/stockApi";
import "./StockAutocomplete.css";

export default function StockAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search NSE stocks, ETFs or mutual funds...",
  disabled = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await searchSymbols(trimmed);
        if (active) {
          setResults(matches);
          setOpen(true);
        }
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  function handleChange(event) {
    const next = event.target.value;
    setQuery(next);
    onChange(next.toUpperCase());
    setOpen(true);
  }

  function handleSelect(stock) {
    setQuery(stock.symbol);
    setOpen(false);
    onSelect(stock);
  }

  return (
    <div className="stock-autocomplete" ref={wrapperRef}>
      <input
        className="input"
        value={query}
        onChange={handleChange}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />

      {open && !disabled && (loading || results.length > 0) && (
        <div className="stock-suggestions">
          {loading && <div className="stock-suggestion-muted">Searching...</div>}

          {!loading && results.map((stock) => (
            <button
              type="button"
              className="stock-suggestion"
              key={`${stock.symbol}-${stock.exchange}-${stock.instrumentType}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(stock)}
            >
              <span>
                <strong>{stock.symbol}</strong>
                <small>{stock.instrumentName}</small>
              </span>
              <em>{stock.instrumentType === "MF" ? "MF" : `${stock.exchange} · ${stock.instrumentType}`}</em>
            </button>
          ))}

          {!loading && !results.length && (
            <div className="stock-suggestion-muted">No stock, ETF or mutual fund match found.</div>
          )}
        </div>
      )}
    </div>
  );
}
