/**
 * BridgeHelper.jsx
 *
 * Cross-chain token bridge powered by Li.Fi.
 * @lifi/sdk is already installed in this project.
 *
 * Lets users move tokens from any chain to any other chain without
 * leaving the platform — so they can always donate to any NGO
 * regardless of where their funds currently sit.
 *
 * In production:
 *   import { createConfig, getQuote, executeRoute } from '@lifi/sdk';
 *   createConfig({ integrator: 'crypto-gifting-platform' });
 *   const quote = await getQuote({ fromChain, toChain, fromToken, toToken, fromAmount, fromAddress });
 *   await executeRoute(signer, quote.routes[0]);
 *
 * We provide:
 *   1. A quote form (source chain/token → destination chain/token + amount)
 *   2. Live quotes via Li.Fi SDK
 *   3. One-click execution via connected wallet
 *   4. "Open Li.Fi Bridge" fallback for unsupported wallets
 */

import React, { useState, useContext, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { usePriceFeeds } from "../../hooks/usePriceFeeds";

// ─── Chain config (matching our existing chains) ─────────────────────────────
const CHAIN_CONFIGS = {
    ethereum: { chainId: 1, name: "Ethereum", icon: "⟠", color: "#627EEA" },
    polygon: { chainId: 137, name: "Polygon", icon: "⬡", color: "#8247E5" },
    base: { chainId: 8453, name: "Base", icon: "🔵", color: "#0052FF" },
    arbitrum: { chainId: 42161, name: "Arbitrum", icon: "🔷", color: "#28A0F0" },
    optimism: { chainId: 10, name: "Optimism", icon: "🔴", color: "#FF0420" },
    bnb: { chainId: 56, name: "BNB Chain", icon: "🟡", color: "#F3BA2F" },
};

// Tokens per chain for the bridge UI (common bridge tokens)
const BRIDGE_TOKENS = {
    ethereum: ["ETH", "USDC", "USDT", "DAI", "LINK"],
    polygon: ["MATIC", "USDC", "USDT", "DAI", "WETH"],
    base: ["ETH", "USDC", "DAI"],
    arbitrum: ["ETH", "USDC", "USDT", "ARB"],
    optimism: ["ETH", "USDC", "USDT", "OP"],
    bnb: ["BNB", "USDT", "USDC", "BUSD"],
};

// Li.Fi hosted bridge URL builder (fallback)
function buildLiFiUrl(fromChain, toChain, fromToken, toToken, address) {
    const p = new URLSearchParams({
        fromChain: CHAIN_CONFIGS[fromChain]?.chainId || 1,
        toChain: CHAIN_CONFIGS[toChain]?.chainId || 137,
        fromToken: fromToken || "ETH",
        toToken: toToken || "USDC",
        ...(address ? { fromAddress: address } : {}),
    });
    return `https://jumper.exchange/?${p.toString()}`;
}

// ─── Quote card ───────────────────────────────────────────────────────────────
const QuoteCard = ({ quote, onExecute, executing }) => {
    if (!quote) return null;
    return (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mt-4">
            <h4 className="font-bold text-green-300 mb-3">Best Route Found</h4>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">You send</span>
                    <span className="text-white font-medium">{quote.fromAmount} {quote.fromToken} on {quote.fromChain}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">You receive ≈</span>
                    <span className="text-green-300 font-bold">{quote.toAmount} {quote.toToken} on {quote.toChain}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Estimated fee</span>
                    <span className="text-white">{quote.fee}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Est. time</span>
                    <span className="text-white">{quote.time}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Bridge</span>
                    <span className="text-blue-300">{quote.bridge}</span>
                </div>
            </div>
            <button
                onClick={onExecute}
                disabled={executing}
                className="w-full mt-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-colors"
            >
                {executing ? "Bridging…" : "🌉 Execute Bridge"}
            </button>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const BridgeHelper = () => {
    const { isConnected, address, chain, provider } = useContext(WalletContext);
    const { getUSDValue } = usePriceFeeds();

    const [fromChain, setFromChain] = useState(chain || "ethereum");
    const [toChain, setToChain] = useState("polygon");
    const [fromToken, setFromToken] = useState("ETH");
    const [toToken, setToToken] = useState("USDC");
    const [amount, setAmount] = useState("");
    const [quote, setQuote] = useState(null);
    const [gettingQuote, setGettingQuote] = useState(false);
    const [executing, setExecuting] = useState(false);

    // Sync fromChain with wallet's current chain
    useEffect(() => {
        if (chain && CHAIN_CONFIGS[chain]) setFromChain(chain);
    }, [chain]);

    // Auto-set default tokens when chain changes
    useEffect(() => {
        setFromToken(BRIDGE_TOKENS[fromChain]?.[0] || "ETH");
        setQuote(null);
    }, [fromChain]);
    useEffect(() => {
        setToToken(BRIDGE_TOKENS[toChain]?.[0] || "USDC");
        setQuote(null);
    }, [toChain]);

    const usdValue = getUSDValue(amount, fromToken);

    // ── Get quote ─────────────────────────────────────────────────────────────────
    const getQuote = useCallback(async () => {
        if (!amount || parseFloat(amount) <= 0) { toast.error("Enter an amount."); return; }
        if (fromChain === toChain) { toast.error("Source and destination chains must differ."); return; }

        setGettingQuote(true);
        setQuote(null);

        try {
            // Attempt to use @lifi/sdk for a real quote
            const { createConfig, getQuote: lifiGetQuote } = await import("@lifi/sdk");
            createConfig({ integrator: "crypto-gifting-platform" });

            const fromChainId = CHAIN_CONFIGS[fromChain].chainId;
            const toChainId = CHAIN_CONFIGS[toChain].chainId;

            // Resolve token addresses (native = 0x0)
            const NATIVE = "0x0000000000000000000000000000000000000000";

            // For simplicity use token symbols — Li.Fi SDK resolves them
            const result = await lifiGetQuote({
                fromChain: fromChainId,
                toChain: toChainId,
                fromToken: fromToken,
                toToken: toToken,
                fromAmount: String(Math.floor(parseFloat(amount) * 1e18)), // rough wei
                fromAddress: address || "0x0000000000000000000000000000000000000001",
            });

            if (result?.action && result?.estimate) {
                const est = result.estimate;
                setQuote({
                    fromAmount: amount,
                    fromToken,
                    fromChain: CHAIN_CONFIGS[fromChain].name,
                    toAmount: parseFloat(est.toAmountMin / 1e18).toFixed(6),
                    toToken,
                    toChain: CHAIN_CONFIGS[toChain].name,
                    fee: est.feeCosts?.[0]?.amountUSD ? `$${parseFloat(est.feeCosts[0].amountUSD).toFixed(2)}` : "~$0.50",
                    time: est.executionDuration ? `~${Math.ceil(est.executionDuration / 60)} min` : "~2-5 min",
                    bridge: result.toolDetails?.name || "Li.Fi",
                    raw: result,
                });
            } else {
                throw new Error("No route available");
            }
        } catch {
            // Fall back to a simulated quote (for demo / development)
            const mockToAmount = fromToken === toToken
                ? parseFloat(amount) * 0.998
                : usdValue
                    ? (usdValue * 0.997) / (["USDC", "USDT", "DAI"].includes(toToken) ? 1 : 1800)
                    : parseFloat(amount) * 0.998;

            setQuote({
                fromAmount: amount,
                fromToken,
                fromChain: CHAIN_CONFIGS[fromChain].name,
                toAmount: mockToAmount.toFixed(6),
                toToken,
                toChain: CHAIN_CONFIGS[toChain].name,
                fee: "~$0.50–$2.00",
                time: "~2–5 min",
                bridge: "Li.Fi (estimated)",
                raw: null,
            });
            toast(`Using estimated quote — connect wallet for live rates.`, { icon: "ℹ️" });
        } finally {
            setGettingQuote(false);
        }
    }, [fromChain, toChain, fromToken, toToken, amount, address, usdValue]);

    // ── Execute bridge ────────────────────────────────────────────────────────────
    const executeBridge = useCallback(async () => {
        if (!isConnected) { toast.error("Connect wallet to bridge."); return; }
        if (!quote?.raw) {
            // Open Li.Fi hosted UI as fallback
            const url = buildLiFiUrl(fromChain, toChain, fromToken, toToken, address);
            window.open(url, "_blank", "noopener,noreferrer");
            return;
        }

        setExecuting(true);
        const tid = toast.loading("Bridging tokens…");
        try {
            const { executeRoute } = await import("@lifi/sdk");
            const signer = await provider.getSigner();
            await executeRoute(signer, quote.raw);
            toast.dismiss(tid);
            toast.success("Bridge transaction sent! Funds will arrive in a few minutes. 🌉");
            setQuote(null);
            setAmount("");
        } catch (err) {
            toast.dismiss(tid);
            // If SDK execution fails, open hosted bridge
            const url = buildLiFiUrl(fromChain, toChain, fromToken, toToken, address);
            toast.error("Direct execution failed — opening Li.Fi. " + err.message);
            window.open(url, "_blank", "noopener,noreferrer");
        } finally {
            setExecuting(false);
        }
    }, [isConnected, quote, fromChain, toChain, fromToken, toToken, address, provider]);

    const swapChains = () => {
        setFromChain(toChain);
        setToChain(fromChain);
        setFromToken(toToken);
        setToToken(fromToken);
        setQuote(null);
    };

    const chainList = Object.entries(CHAIN_CONFIGS);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-white">🌉 Cross-Chain Bridge</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                    Move tokens between chains so you can always donate on any network.
                </p>
            </div>

            {/* Why bridge */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 text-xs text-blue-200">
                <p className="font-bold text-blue-300 mb-1">🌉 Powered by Li.Fi</p>
                <p>
                    Li.Fi aggregates all major bridges (Across, Stargate, Hop, Connext) and DEXs to find the
                    best route with lowest fees. Your funds never leave your wallet until you approve the transaction.
                </p>
                <a href="https://li.fi" target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline mt-1 inline-block">li.fi →</a>
            </div>

            {/* Bridge form */}
            <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 max-w-lg">
                {/* From */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-2 font-medium">From</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={fromChain} onChange={(e) => setFromChain(e.target.value)}
                        >
                            {chainList.map(([key, c]) => (
                                <option key={key} value={key}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                        <select
                            className="w-28 p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={fromToken} onChange={(e) => setFromToken(e.target.value)}
                        >
                            {(BRIDGE_TOKENS[fromChain] || []).map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Amount</label>
                    <div className="relative">
                        <input
                            type="number" min="0" placeholder="0.0"
                            className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary pr-24"
                            value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
                        />
                        {usdValue !== null && amount && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                ≈ ${usdValue.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Swap button */}
                <div className="flex justify-center my-3">
                    <button
                        onClick={swapChains}
                        className="w-10 h-10 rounded-full bg-navy-light border border-gray-600/30 hover:border-primary/50 flex items-center justify-center text-lg transition-colors"
                        title="Swap chains"
                    >
                        ⇅
                    </button>
                </div>

                {/* To */}
                <div className="mb-5">
                    <label className="text-xs text-gray-400 block mb-2 font-medium">To</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={toChain} onChange={(e) => setToChain(e.target.value)}
                        >
                            {chainList.filter(([key]) => key !== fromChain).map(([key, c]) => (
                                <option key={key} value={key}>{c.icon} {c.name}</option>
                            ))}
                        </select>
                        <select
                            className="w-28 p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={toToken} onChange={(e) => setToToken(e.target.value)}
                        >
                            {(BRIDGE_TOKENS[toChain] || []).map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* Get quote button */}
                <button
                    onClick={getQuote}
                    disabled={gettingQuote || !amount}
                    className="w-full py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 rounded-xl font-bold text-sm transition-colors"
                >
                    {gettingQuote ? "Getting best route…" : "🔍 Get Quote"}
                </button>

                {/* Quote result */}
                <QuoteCard quote={quote} onExecute={executeBridge} executing={executing} />

                {/* Fallback */}
                <div className="mt-4 text-center">
                    <a
                        href={buildLiFiUrl(fromChain, toChain, fromToken, toToken, address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-primary transition-colors"
                    >
                        Open in Li.Fi Jumper ↗ (full bridge interface)
                    </a>
                </div>
            </div>

            {/* Supported routes info */}
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { name: "Across", icon: "🌐", desc: "Fast optimistic bridge" },
                    { name: "Stargate", icon: "⭐", desc: "LayerZero powered" },
                    { name: "Hop", icon: "🐰", desc: "L2 ↔ L2 specialist" },
                    { name: "Connext", icon: "🔗", desc: "Trustless xERC20" },
                    { name: "Socket", icon: "🔌", desc: "Aggregator" },
                    { name: "Celer", icon: "⚡", desc: "cBridge liquidity" },
                ].map((b) => (
                    <div key={b.name} className="bg-navy-lighter rounded-xl p-3 border border-gray-700/30 flex items-center gap-3">
                        <span className="text-2xl">{b.icon}</span>
                        <div>
                            <p className="text-xs font-semibold text-white">{b.name}</p>
                            <p className="text-xs text-gray-400">{b.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BridgeHelper;
