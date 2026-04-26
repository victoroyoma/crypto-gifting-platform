/**
 * usePriceFeeds.js
 *
 * Fetches live USD prices for supported crypto tokens via CoinGecko's
 * free public API (no key required for basic price data).
 *
 * Returns: { prices, getUSDValue(amount, symbol), loading, error }
 *
 * Cached in sessionStorage for 90 seconds to avoid rate limits.
 */

import { useState, useEffect, useCallback } from "react";

// ─── CoinGecko ID mapping ─────────────────────────────────────────────────────
const TOKEN_TO_COINGECKO = {
    ETH: "ethereum",
    WETH: "ethereum",
    MATIC: "matic-network",
    BNB: "binancecoin",
    SOL: "solana",
    OKT: "oec-token",
    ARB: "arbitrum",
    OP: "optimism",
    LINK: "chainlink",
    // Stablecoins — always 1 USD
    USDC: null,
    USDT: null,
    DAI: null,
    BUSD: null,
};

const STABLE_SYMBOLS = new Set(["USDC", "USDT", "DAI", "BUSD", "FRAX", "LUSD"]);

const COINGECKO_IDS = [...new Set(
    Object.values(TOKEN_TO_COINGECKO).filter(Boolean)
)];

const CACHE_KEY = "cgp_price_cache";
const CACHE_TTL = 90 * 1000; // 90 seconds

function readCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data;
    } catch {
        return null;
    }
}

function writeCache(data) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch { }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePriceFeeds() {
    const [prices, setPrices] = useState({}); // { ethereum: 3200.5, ... }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPrices = useCallback(async () => {
        const cached = readCache();
        if (cached) { setPrices(cached); return; }

        setLoading(true);
        setError(null);
        try {
            const ids = COINGECKO_IDS.join(",");
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Normalise: { ethereum: 3200 } → { ethereum: 3200 }
            writeCache(data);
            setPrices(data);
        } catch (err) {
            setError(err.message);
            // Keep stale cache if available
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrices();
        // Refresh every 90 s while the page is active
        const interval = setInterval(fetchPrices, CACHE_TTL);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    /**
     * Convert a token amount to its USD value.
     * Returns null if price is unavailable.
     */
    const getUSDValue = useCallback((amount, symbol) => {
        if (!amount || isNaN(parseFloat(amount))) return null;
        const n = parseFloat(amount);
        if (STABLE_SYMBOLS.has(symbol?.toUpperCase())) return n; // 1:1
        const geckoId = TOKEN_TO_COINGECKO[symbol?.toUpperCase()];
        if (!geckoId) return null;
        const price = prices[geckoId]?.usd;
        if (!price) return null;
        return n * price;
    }, [prices]);

    /**
     * Format a token amount + USD equivalent, e.g. "0.005 ETH ($16.00)"
     */
    const formatWithUSD = useCallback((amount, symbol) => {
        const usd = getUSDValue(amount, symbol);
        const base = `${amount} ${symbol}`;
        if (usd === null) return base;
        return `${base} ($${usd < 0.01 ? usd.toFixed(6) : usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }, [getUSDValue]);

    return { prices, getUSDValue, formatWithUSD, loading, error, refresh: fetchPrices };
}

export default usePriceFeeds;
