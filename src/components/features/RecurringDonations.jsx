/**
 * RecurringDonations.jsx
 *
 * Recurring / streaming donation UI powered by Superfluid protocol concepts.
 *
 * Users set up a monthly donation "stream" to any NGO.
 * The UI simulates the flow with localStorage state.
 *
 * In production:
 *   - Use Superfluid SDK (superfluid-finance/sdk-core) or direct contract calls
 *   - CFAv1 (Constant Flow Agreement) controls per-second token streams
 *   - Supported tokens: fUSDCx, fDAIx, and any Super Token
 *   - createFlow(token, receiver, flowRate) / deleteFlow(token, receiver)
 *   - Supported on: Polygon, Optimism, Base, Arbitrum, BNB Chain
 *
 * Note: @superfluid-finance/sdk-core has a React 18 peer dep conflict.
 * Production deployment should use ethers.js v5 + SDK or direct ABI calls.
 */

import React, { useState, useContext } from "react";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STREAMS_KEY = "cgp_streams";
function load() { try { return JSON.parse(localStorage.getItem(STREAMS_KEY) || "[]"); } catch { return []; } }
function save(s) { localStorage.setItem(STREAMS_KEY, JSON.stringify(s)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// Supported Superfluid chains
const SUPERFLUID_CHAINS = ["polygon", "optimism", "base", "arbitrum", "bnb"];

// Token options for streams (Super Tokens in production)
const STREAM_TOKENS = ["USDC", "DAI", "USDT", "ETH"];

// ─── Flow rate calculator ─────────────────────────────────────────────────────
function monthlyToPerSecond(amount) {
    return (amount / 30 / 86400).toFixed(8);
}

// ─── Main component ───────────────────────────────────────────────────────────
const RecurringDonations = () => {
    const { isConnected, address, chain, sendDonation, supportedTokens } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [streams, setStreams] = useState(load);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const [form, setForm] = useState({
        ngoId: "", token: "USDC", monthlyAmount: "", frequency: "monthly",
        message: "",
    });

    const persist = (updated) => { setStreams(updated); save(updated); };

    const activeStreams = streams.filter((s) => s.status === "active" && s.donor === address);
    const pausedStreams = streams.filter((s) => s.status === "paused" && s.donor === address);
    const isSuperfluidChain = SUPERFLUID_CHAINS.includes(chain);

    // ── Create stream ─────────────────────────────────────────────────────────────
    const createStream = async () => {
        if (!isConnected) { toast.error("Connect wallet first."); return; }
        if (!form.ngoId || !form.monthlyAmount || parseFloat(form.monthlyAmount) <= 0) {
            toast.error("Choose an NGO and enter a monthly amount."); return;
        }

        const ngo = ngos.find((n) => n.id === form.ngoId);
        const ngoAddr = ngo?.walletAddresses?.[chain];
        if (!ngoAddr) {
            toast.error(`${ngo?.name} doesn't have a wallet on ${chain}.`); return;
        }

        setCreating(true);
        const tid = toast.loading("Setting up recurring donation…");

        try {
            // Send first month's payment immediately to simulate stream start
            const token = supportedTokens[chain]?.find((t) => t.symbol === form.token);
            if (token) {
                await sendDonation(ngoAddr, form.monthlyAmount, chain, token, {
                    ngoId: form.ngoId, ngoName: ngo.name, isAnonymous: false,
                });
            }

            const stream = {
                id: uid(),
                donor: address,
                ngoId: form.ngoId,
                ngoName: ngo?.name || form.ngoId,
                ngoIcon: ngo?.icon || "🌍",
                ngoAddress: ngoAddr,
                token: form.token,
                monthlyAmount: parseFloat(form.monthlyAmount),
                flowRatePerSecond: monthlyToPerSecond(parseFloat(form.monthlyAmount)),
                frequency: form.frequency,
                message: form.message,
                chain,
                status: "active",
                startedAt: Date.now(),
                lastPayment: Date.now(),
                nextPayment: Date.now() + 30 * 86400000,
                totalStreamed: parseFloat(form.monthlyAmount),
                // In production: Superfluid stream ID / transaction hash
                superfluidFlowId: `0x${uid()}${uid()}`,
            };

            persist([stream, ...streams]);
            setForm({ ngoId: "", token: "USDC", monthlyAmount: "", frequency: "monthly", message: "" });
            setShowCreate(false);
            toast.dismiss(tid);
            toast.success(`Recurring donation of ${form.monthlyAmount} ${form.token}/month started! 💚`);
        } catch (err) {
            toast.dismiss(tid);
            toast.error("Failed: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    // ── Cancel stream ─────────────────────────────────────────────────────────────
    const cancelStream = (id) => {
        persist(streams.map((s) => s.id === id ? { ...s, status: "cancelled", cancelledAt: Date.now() } : s));
        toast.success("Recurring donation cancelled.");
    };

    // ── Pause / Resume ────────────────────────────────────────────────────────────
    const togglePause = (id) => {
        persist(streams.map((s) => {
            if (s.id !== id) return s;
            const newStatus = s.status === "paused" ? "active" : "paused";
            return { ...s, status: newStatus };
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">🔁 Recurring Donations</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Set up automatic monthly gifts — NGOs receive a steady, predictable income stream.
                    </p>
                </div>
                {isConnected && (
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
                    >
                        {showCreate ? "✕ Cancel" : "+ New Stream"}
                    </button>
                )}
            </div>

            {/* Superfluid explainer */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-5 text-xs text-green-200">
                <p className="font-bold text-green-300 mb-1">💧 Powered by Superfluid Protocol</p>
                <p>
                    In production, donations flow <strong>per-second</strong> as a token stream using Superfluid's
                    Constant Flow Agreement (CFA). NGOs receive funds continuously — not in batches.
                    Available on Polygon, Optimism, Base, Arbitrum & BNB Chain.
                </p>
                <a href="https://www.superfluid.finance" target="_blank" rel="noopener noreferrer"
                    className="text-green-400 hover:underline mt-1 inline-block">
                    Learn more →
                </a>
            </div>

            {/* Chain warning */}
            {isConnected && !isSuperfluidChain && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 mb-4 text-xs text-yellow-300">
                    ⚠️ Superfluid streams work best on Polygon, Optimism, Base, Arbitrum, or BNB Chain.
                    Switch networks for full streaming support.
                </div>
            )}

            {/* Create form */}
            {showCreate && isConnected && (
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-6">
                    <h3 className="font-bold text-white mb-4">Start a Donation Stream</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">NGO *</label>
                            <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.ngoId} onChange={(e) => setForm(f => ({ ...f, ngoId: e.target.value }))}>
                                <option value="">— Select NGO —</option>
                                {ngos.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Monthly Amount *</label>
                                <input type="number" min="0" placeholder="e.g. 25"
                                    className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.monthlyAmount} onChange={(e) => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Token</label>
                                <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.token} onChange={(e) => setForm(f => ({ ...f, token: e.target.value }))}>
                                    {STREAM_TOKENS.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        {form.monthlyAmount && parseFloat(form.monthlyAmount) > 0 && (
                            <div className="text-xs text-gray-400 bg-navy-light rounded-lg px-3 py-2">
                                ⚡ Flow rate: <strong className="text-white">{monthlyToPerSecond(parseFloat(form.monthlyAmount))} {form.token}/sec</strong>
                                &nbsp;·&nbsp;
                                <strong className="text-white">{form.monthlyAmount} {form.token}/month</strong>
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Message (optional)</label>
                            <input className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Why you're donating…" maxLength={120} />
                        </div>
                        <button onClick={createStream} disabled={creating}
                            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-colors">
                            {creating ? "Starting stream…" : "💚 Start Recurring Donation"}
                        </button>
                    </div>
                </div>
            )}

            {/* Active streams */}
            {!isConnected ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <p className="text-gray-400 text-sm">Connect your wallet to view and manage your donation streams.</p>
                </div>
            ) : activeStreams.length === 0 && pausedStreams.length === 0 ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">💚</div>
                    <p className="text-gray-400 text-sm">No active streams. Start your first recurring donation above.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {[...activeStreams, ...pausedStreams].map((s) => {
                        const started = formatDistanceToNow(new Date(s.startedAt), { addSuffix: true });
                        const isPaused = s.status === "paused";
                        return (
                            <div key={s.id}
                                className={`bg-navy-lighter rounded-2xl p-5 border transition-all ${isPaused ? "border-yellow-500/20 opacity-70" : "border-gray-700/30"
                                    }`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{s.ngoIcon}</span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-white text-sm">{s.ngoName}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${isPaused ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"
                                                    }`}>
                                                    {isPaused ? "⏸ Paused" : "🟢 Active"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">Started {started} · {s.chain}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-white">{s.monthlyAmount} <span className="text-xs text-gray-400">{s.token}/mo</span></p>
                                        <p className="text-xs text-gray-500">{s.flowRatePerSecond} {s.token}/sec</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                                    <span>💰 Total streamed: <strong className="text-green-400">{s.totalStreamed.toFixed(2)} {s.token}</strong></span>
                                    {s.nextPayment && (
                                        <span>📅 Next payment: {format(new Date(s.nextPayment), "dd MMM yyyy")}</span>
                                    )}
                                </div>

                                {s.message && (
                                    <p className="text-xs text-gray-300 italic mb-3">"{s.message}"</p>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => togglePause(s.id)}
                                        className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/30 rounded-lg text-xs font-medium text-yellow-300 transition-colors">
                                        {isPaused ? "▶ Resume" : "⏸ Pause"}
                                    </button>
                                    <button onClick={() => cancelStream(s.id)}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors">
                                        ✕ Cancel
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Cancelled streams (collapsed) */}
            {address && streams.filter((s) => s.status === "cancelled" && s.donor === address).length > 0 && (
                <details className="mt-5">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                        View cancelled streams ({streams.filter((s) => s.status === "cancelled" && s.donor === address).length})
                    </summary>
                    <div className="mt-3 space-y-2">
                        {streams.filter((s) => s.status === "cancelled" && s.donor === address).map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-navy-lighter rounded-xl border border-gray-700/20 opacity-50 text-xs text-gray-400">
                                <span>{s.ngoIcon} {s.ngoName}</span>
                                <span>{s.monthlyAmount} {s.token}/mo · {s.totalStreamed.toFixed(2)} total</span>
                                <span>{format(new Date(s.cancelledAt || s.startedAt), "dd MMM yyyy")}</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
};

export default RecurringDonations;
