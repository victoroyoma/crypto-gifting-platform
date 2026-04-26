/**
 * CorporateMatching.jsx
 *
 * Corporate Donation Matching — companies pledge to match every donation
 * to an NGO up to a capped matching pool.
 *
 * How it works:
 *   1. A company (sponsor) creates a matching pool for a specific NGO
 *   2. They specify: match ratio (e.g. 2x), max pool (e.g. 10,000 USDC), deadline
 *   3. When donors give to that NGO, a "This donation will be matched 2x!" banner appears
 *   4. The company deploys funds up to the pool cap
 *
 * In production: a MatchingPool.sol contract holds sponsor funds and
 * auto-releases on donation events via the DonationReceived event.
 * Here simulated with localStorage.
 *
 * Exports:
 *   - CorporateMatching (default) — full management page
 *   - useActiveMatch(ngoId) — hook to check if an NGO has a live match (for CharityMode banner)
 */

import React, { useState, useContext, useCallback } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";

// ─── Storage ──────────────────────────────────────────────────────────────────
const POOLS_KEY = "cgp_matching_pools";
function load() { try { return JSON.parse(localStorage.getItem(POOLS_KEY) || "[]"); } catch { return []; } }
function save(p) { localStorage.setItem(POOLS_KEY, JSON.stringify(p)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Hook: check active match for an NGO ────────────────────────────────────
export function useActiveMatch(ngoId) {
    const pools = load();
    const now = Date.now();
    return pools.find(
        (p) => p.ngoId === ngoId && p.status === "active" && p.deadline > now && p.matched < p.poolAmount
    ) || null;
}

// ─── MatchBanner: used inside CharityMode ────────────────────────────────────
export const MatchBanner = ({ ngoId }) => {
    const match = useActiveMatch(ngoId);
    if (!match) return null;

    const remaining = match.poolAmount - match.matched;
    const pct = Math.min(100, (match.matched / match.poolAmount) * 100);

    return (
        <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-200">
            <span className="text-2xl shrink-0">🤝</span>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-yellow-300">
                    {match.ratio}x Matched by {match.sponsorName}!
                </p>
                <p>Every donation is matched up to {match.ratio}x until the pool runs out.</p>
                <div className="mt-1.5 w-full bg-yellow-900/40 rounded-full h-1.5">
                    <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-yellow-400 mt-0.5">
                    {remaining.toLocaleString()} {match.token} remaining in pool
                </p>
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CorporateMatching = () => {
    const { isConnected, address } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [pools, setPools] = useState(load);
    const [showCreate, setShowCreate] = useState(false);

    const [form, setForm] = useState({
        ngoId: "", sponsorName: "", sponsorWebsite: "",
        ratio: 2, poolAmount: "", token: "USDC",
        deadlineDays: 30, description: "",
    });

    const persist = useCallback((updated) => { setPools(updated); save(updated); }, []);

    // ── Create pool ───────────────────────────────────────────────────────────────
    const createPool = () => {
        if (!form.ngoId || !form.sponsorName || !form.poolAmount || parseFloat(form.poolAmount) <= 0) {
            toast.error("Fill in NGO, sponsor name, and pool amount."); return;
        }
        const ngo = ngos.find((n) => n.id === form.ngoId);
        const pool = {
            id: uid(),
            ngoId: form.ngoId,
            ngoName: ngo?.name || form.ngoId,
            ngoIcon: ngo?.icon || "🌍",
            sponsorName: form.sponsorName,
            sponsorWebsite: form.sponsorWebsite,
            sponsorAddress: address,
            ratio: Number(form.ratio),
            poolAmount: parseFloat(form.poolAmount),
            matched: 0,
            token: form.token,
            deadline: Date.now() + form.deadlineDays * 86400000,
            description: form.description,
            status: "active",
            createdAt: Date.now(),
        };
        persist([pool, ...pools]);
        setShowCreate(false);
        setForm({ ngoId: "", sponsorName: "", sponsorWebsite: "", ratio: 2, poolAmount: "", token: "USDC", deadlineDays: 30, description: "" });
        toast.success(`Matching pool of ${form.poolAmount} ${form.token} created! 🤝`);
    };

    // ── Simulate match (admin/demo) ───────────────────────────────────────────────
    const simulateMatch = (id, donationAmount) => {
        const pool = pools.find((p) => p.id === id);
        if (!pool) return;
        const matchAmount = Math.min(donationAmount * pool.ratio, pool.poolAmount - pool.matched);
        if (matchAmount <= 0) { toast.error("Pool exhausted."); return; }
        persist(pools.map((p) => {
            if (p.id !== id) return p;
            const newMatched = p.matched + matchAmount;
            return { ...p, matched: newMatched, status: newMatched >= p.poolAmount ? "exhausted" : p.status };
        }));
        toast.success(`Matched ${matchAmount.toFixed(2)} ${pool.token}! 🤝`);
    };

    // ── Close pool ────────────────────────────────────────────────────────────────
    const closePool = (id) => {
        persist(pools.map((p) => p.id === id ? { ...p, status: "closed", closedAt: Date.now() } : p));
        toast.success("Matching pool closed.");
    };

    const activePools = pools.filter((p) => p.status === "active" && p.deadline > Date.now());
    const endedPools = pools.filter((p) => p.status !== "active" || p.deadline <= Date.now());

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">🤝 Corporate Matching</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Companies pledge matching funds — every donation is amplified automatically.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
                >
                    {showCreate ? "✕ Cancel" : "+ Create Matching Pool"}
                </button>
            </div>

            {/* Explainer */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5 text-xs text-yellow-200">
                <p className="font-bold text-yellow-300 mb-1">🤝 How Corporate Matching works</p>
                <p>
                    A sponsor deposits a matching pool (e.g., 10,000 USDC at 2x). When donors give to the
                    matching NGO, the sponsor's contract automatically releases 2× the donation amount from the pool —
                    until the pool is exhausted or the campaign ends.
                </p>
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-6">
                    <h3 className="font-bold text-white mb-4">Create Matching Pool</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">NGO to Match *</label>
                            <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.ngoId} onChange={(e) => setForm(f => ({ ...f, ngoId: e.target.value }))}>
                                <option value="">— Select NGO —</option>
                                {ngos.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Company Name *</label>
                                <input className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.sponsorName} onChange={(e) => setForm(f => ({ ...f, sponsorName: e.target.value }))}
                                    placeholder="Acme Corp" maxLength={60} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Website</label>
                                <input className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.sponsorWebsite} onChange={(e) => setForm(f => ({ ...f, sponsorWebsite: e.target.value }))}
                                    placeholder="https://acme.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Match Ratio</label>
                                <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.ratio} onChange={(e) => setForm(f => ({ ...f, ratio: e.target.value }))}>
                                    {[1, 1.5, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r}x</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Pool Amount *</label>
                                <input type="number" min="0" className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.poolAmount} onChange={(e) => setForm(f => ({ ...f, poolAmount: e.target.value }))}
                                    placeholder="10000" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Token</label>
                                <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.token} onChange={(e) => setForm(f => ({ ...f, token: e.target.value }))}>
                                    {["USDC", "USDT", "ETH", "DAI"].map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Duration (days)</label>
                            <input type="number" min="1" max="365" className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.deadlineDays} onChange={(e) => setForm(f => ({ ...f, deadlineDays: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Description</label>
                            <textarea className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary resize-none h-16"
                                value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Why your company is supporting this NGO…" maxLength={300} />
                        </div>
                        <button onClick={createPool}
                            className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-sm transition-colors">
                            🤝 Create Matching Pool
                        </button>
                    </div>
                </div>
            )}

            {/* Active pools */}
            {activePools.length === 0 && !showCreate ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">🤝</div>
                    <p className="text-gray-400 text-sm">No active matching pools. Companies can create one above.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activePools.map((p) => {
                        const pct = Math.min(100, (p.matched / p.poolAmount) * 100);
                        const daysL = Math.max(0, Math.ceil((p.deadline - Date.now()) / 86400000));
                        const [demoInput, setDemoInput] = useState("100");

                        return (
                            <div key={p.id} className="bg-navy-lighter rounded-2xl p-5 border border-yellow-500/20">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{p.ngoIcon}</span>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-white text-sm">{p.ngoName}</p>
                                                <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                                                    {p.ratio}x Match
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                by {p.sponsorWebsite
                                                    ? <a href={p.sponsorWebsite} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.sponsorName}</a>
                                                    : p.sponsorName
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-white">{p.poolAmount.toLocaleString()} <span className="text-xs text-gray-400">{p.token}</span></p>
                                        <p className="text-xs text-gray-500">{daysL}d left</p>
                                    </div>
                                </div>

                                {p.description && <p className="text-xs text-gray-300 mb-3">{p.description}</p>}

                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>{p.matched.toFixed(2)} {p.token} matched</span>
                                    <span>{pct.toFixed(0)}% of pool used</span>
                                </div>
                                <div className="w-full bg-gray-700/40 rounded-full h-2 mb-3">
                                    <div className="bg-yellow-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>

                                {/* Demo simulate match */}
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-gray-400">Simulate donation:</span>
                                    <input type="number" min="1" className="w-20 p-1.5 bg-navy-light border border-gray-600/30 rounded-lg text-xs"
                                        value={demoInput} onChange={(e) => setDemoInput(e.target.value)} />
                                    <button onClick={() => simulateMatch(p.id, parseFloat(demoInput) || 0)}
                                        className="px-3 py-1.5 bg-yellow-600/70 hover:bg-yellow-600 rounded-lg text-xs font-medium transition-colors">
                                        Match {demoInput} {p.token}
                                    </button>
                                    {(isConnected && address === p.sponsorAddress) && (
                                        <button onClick={() => closePool(p.id)}
                                            className="ml-auto px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400 transition-colors">
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ended pools */}
            {endedPools.length > 0 && (
                <details className="mt-6">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                        Past/closed pools ({endedPools.length})
                    </summary>
                    <div className="mt-3 space-y-2">
                        {endedPools.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-navy-lighter rounded-xl border border-gray-700/20 opacity-60 text-xs text-gray-400">
                                <span>{p.ngoIcon} {p.ngoName}</span>
                                <span>{p.sponsorName} · {p.ratio}x</span>
                                <span>{p.matched.toFixed(2)} / {p.poolAmount} {p.token} matched</span>
                                <span className="capitalize">{p.status}</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
};

export default CorporateMatching;
