/**
 * QuadraticFunding.jsx
 *
 * Quadratic Funding rounds — brings Gitcoin's model to humanitarian NGOs.
 *
 * How it works:
 *  1. A matching pool is contributed by sponsors (stored in localStorage)
 *  2. Each NGO in the round receives donations from the community
 *  3. Match allocation = (√ sum of individual donations)² relative to total
 *  4. Small donations from many people are amplified more than large single donations
 *  5. At round end, matching funds are distributed to NGOs proportionally
 *
 * Formula: match_i = (matching_pool × (√contributions_i)²) / Σ(√contributions_j)²
 */

import React, { useState, useContext, useMemo } from "react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";

// ─── Storage ──────────────────────────────────────────────────────────────────
const ROUNDS_KEY = "cgp_qf_rounds";
function loadRounds() {
    try { return JSON.parse(localStorage.getItem(ROUNDS_KEY) || "[]"); } catch { return []; }
}
function saveRounds(r) { localStorage.setItem(ROUNDS_KEY, JSON.stringify(r)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── QF math ──────────────────────────────────────────────────────────────────
function calcMatches(round) {
    const pool = round.matchingPool || 0;
    const ngoIds = Object.keys(round.contributions || {});
    if (!ngoIds.length || pool === 0) return {};

    // For each NGO: sqrt of sum of individual donation amounts
    const sqrtSums = {};
    for (const ngoId of ngoIds) {
        const donations = round.contributions[ngoId] || [];
        const sqrtSum = donations.reduce((s, d) => s + Math.sqrt(d.amount), 0);
        sqrtSums[ngoId] = sqrtSum ** 2; // square it for the QF formula
    }

    const totalWeight = Object.values(sqrtSums).reduce((s, v) => s + v, 0);
    const matches = {};
    for (const ngoId of ngoIds) {
        matches[ngoId] = totalWeight > 0 ? (pool * sqrtSums[ngoId]) / totalWeight : 0;
    }
    return matches;
}

// ─── Colours ─────────────────────────────────────────────────────────────────
const CHART_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];

// ─── Main component ───────────────────────────────────────────────────────────
const QuadraticFunding = () => {
    const { isConnected, address, chain, supportedTokens, sendDonation } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [rounds, setRounds] = useState(loadRounds);
    const [activeRoundId, setActiveRoundId] = useState(rounds[0]?.id || null);
    const [view, setView] = useState("round"); // "round" | "create"

    // Donate form
    const [donateNgoId, setDonateNgoId] = useState(null);
    const [donateAmount, setDonateAmount] = useState("");
    const [donateToken, setDonateToken] = useState(null);

    // Create round form
    const [createForm, setCreateForm] = useState({
        title: "", description: "", matchingPool: "", token: "USDC",
        durationDays: 14, ngoIds: [],
    });

    const persist = (updated) => { setRounds(updated); saveRounds(updated); };

    const activeRound = rounds.find((r) => r.id === activeRoundId);

    // ── Create round ─────────────────────────────────────────────────────────────
    const createRound = () => {
        if (!createForm.title || !createForm.matchingPool || createForm.ngoIds.length < 2) {
            toast.error("Need title, matching pool amount, and at least 2 NGOs.");
            return;
        }
        const now = Date.now();
        const round = {
            id: uid(),
            title: createForm.title,
            description: createForm.description,
            matchingPool: parseFloat(createForm.matchingPool),
            token: createForm.token,
            ngoIds: createForm.ngoIds,
            contributions: Object.fromEntries(createForm.ngoIds.map((id) => [id, []])),
            startDate: now,
            endDate: now + createForm.durationDays * 86400000,
            status: "active",
            createdBy: address || "admin",
        };
        const updated = [round, ...rounds];
        persist(updated);
        setActiveRoundId(round.id);
        setView("round");
        toast.success("Funding round launched! 🎉");
        setCreateForm({ title: "", description: "", matchingPool: "", token: "USDC", durationDays: 14, ngoIds: [] });
    };

    // ── Donate in round ───────────────────────────────────────────────────────────
    const handleRoundDonate = async (ngoId) => {
        if (!isConnected) { toast.error("Connect wallet first."); return; }
        if (!donateToken || !donateAmount || parseFloat(donateAmount) <= 0) {
            toast.error("Choose token and amount."); return;
        }
        const ngo = ngos.find((n) => n.id === ngoId);
        const addr = ngo?.walletAddresses?.[chain];
        if (!addr) { toast.error(`${ngo?.name} doesn't accept on ${chain}.`); return; }

        const tid = toast.loading("Sending donation…");
        try {
            const txHash = await sendDonation(addr, donateAmount, chain, donateToken, {
                ngoId, ngoName: ngo?.name, isAnonymous: false,
            });

            const updated = rounds.map((r) => {
                if (r.id !== activeRound.id) return r;
                const existing = r.contributions[ngoId] || [];
                return {
                    ...r,
                    contributions: {
                        ...r.contributions,
                        [ngoId]: [...existing, {
                            id: uid(), donor: address, amount: parseFloat(donateAmount),
                            token: donateToken.symbol, txHash, timestamp: Date.now(),
                        }],
                    },
                };
            });
            persist(updated);
            setDonateNgoId(null); setDonateAmount(""); setDonateToken(null);
            toast.dismiss(tid);
            toast.success(`Donation sent! Your ${donateAmount} ${donateToken.symbol} will be amplified by QF matching. ⚡`);
        } catch (err) {
            toast.dismiss(tid);
            toast.error("Failed: " + err.message);
        }
    };

    // ── Match distribution chart data ────────────────────────────────────────────
    const chartData = useMemo(() => {
        if (!activeRound) return [];
        const matches = calcMatches(activeRound);
        return activeRound.ngoIds.map((id) => {
            const ngo = ngos.find((n) => n.id === id);
            const contributions = activeRound.contributions[id] || [];
            const directTotal = contributions.reduce((s, d) => s + d.amount, 0);
            return {
                name: ngo?.name?.split(" ").slice(0, 2).join(" ") || id,
                icon: ngo?.icon || "🌍",
                direct: parseFloat(directTotal.toFixed(2)),
                matching: parseFloat((matches[id] || 0).toFixed(2)),
                donors: contributions.length,
                ngoId: id,
            };
        }).sort((a, b) => (b.direct + b.matching) - (a.direct + a.matching));
    }, [activeRound, ngos]);

    const daysLeft = activeRound
        ? Math.max(0, Math.ceil((activeRound.endDate - Date.now()) / 86400000))
        : 0;

    // ── Toggle NGO in create form ─────────────────────────────────────────────────
    const toggleNgo = (id) => {
        setCreateForm((f) => ({
            ...f,
            ngoIds: f.ngoIds.includes(id) ? f.ngoIds.filter((n) => n !== id) : [...f.ngoIds, id],
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Create round
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "create") {
        return (
            <div className="w-full max-w-xl mx-auto">
                <button onClick={() => setView("round")} className="text-gray-400 hover:text-white text-sm mb-4">← Back</button>
                <h2 className="text-xl font-extrabold text-white mb-5">Create Funding Round</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Round Title *</label>
                        <input className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Q2 2026 Humanitarian Round" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Description</label>
                        <textarea className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary resize-none h-16"
                            value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Describe the focus of this round…" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Matching Pool *</label>
                            <input type="number" min="0" className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={createForm.matchingPool} onChange={(e) => setCreateForm(f => ({ ...f, matchingPool: e.target.value }))}
                                placeholder="50000" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Token</label>
                            <select className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={createForm.token} onChange={(e) => setCreateForm(f => ({ ...f, token: e.target.value }))}>
                                {["USDC", "USDT", "ETH", "DAI"].map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Duration (days)</label>
                        <input type="number" min="1" max="90" className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={createForm.durationDays} onChange={(e) => setCreateForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-2">Select NGOs for this Round * ({createForm.ngoIds.length} selected)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {ngos.map((n) => (
                                <div key={n.id}
                                    onClick={() => toggleNgo(n.id)}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm ${createForm.ngoIds.includes(n.id)
                                            ? "border-primary bg-primary/10 text-white"
                                            : "border-gray-700/40 bg-navy-lighter text-gray-400 hover:border-primary/40"
                                        }`}>
                                    <span>{n.icon}</span>
                                    <span className="truncate">{n.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={createRound}
                        className="w-full py-3 bg-primary hover:bg-primary/80 rounded-xl font-bold text-sm transition-colors">
                        🚀 Launch Round
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Round view
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">⚡ Quadratic Funding</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Every donation is amplified. 500 people giving $1 beats 1 person giving $500.
                    </p>
                </div>
                <div className="flex gap-2">
                    {rounds.length > 1 && (
                        <select
                            className="p-2 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm"
                            value={activeRoundId || ""}
                            onChange={(e) => setActiveRoundId(e.target.value)}
                        >
                            {rounds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                        </select>
                    )}
                    <button onClick={() => setView("create")}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors">
                        + New Round
                    </button>
                </div>
            </div>

            {!activeRound ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">⚡</div>
                    <p className="text-gray-400 text-sm">No funding rounds yet. Create the first one!</p>
                </div>
            ) : (
                <>
                    {/* Round info */}
                    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-white">{activeRound.title}</h3>
                                <p className="text-sm text-gray-400">{activeRound.description}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-extrabold text-primary">
                                    {activeRound.matchingPool.toLocaleString()} {activeRound.token}
                                </p>
                                <p className="text-xs text-gray-400">Matching Pool</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                            <span>📅 {format(new Date(activeRound.startDate), "dd MMM")} – {format(new Date(activeRound.endDate), "dd MMM yyyy")}</span>
                            <span className={daysLeft > 0 ? "text-green-400" : "text-red-400"}>
                                {daysLeft > 0 ? `⏳ ${daysLeft} days remaining` : "🏁 Round ended"}
                            </span>
                            <span>🏛 {activeRound.ngoIds.length} NGOs competing</span>
                        </div>
                    </div>

                    {/* How QF works explainer */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 text-xs text-blue-200">
                        <p className="font-bold text-blue-300 mb-1">⚡ How Quadratic Funding works</p>
                        <p>Each NGO's match = <strong>(√ sum of donations)²</strong>. A donation from 10 different people carries 10× more weight than one donation of the same total value. <strong>Your $1 matters more than you think.</strong></p>
                    </div>

                    {/* Chart */}
                    {chartData.length > 0 && (
                        <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                            <h3 className="font-bold text-white mb-4">📊 Current Allocation</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={{ background: "#1a2747", border: "1px solid #3B82F6", borderRadius: 12, color: "#fff" }}
                                        formatter={(value, name) => [`${value} ${activeRound.token}`, name === "direct" ? "Direct donations" : "Matching"]}
                                    />
                                    <Bar dataKey="direct" stackId="a" name="direct" radius={[0, 0, 4, 4]}>
                                        {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length] + "99"} />)}
                                    </Bar>
                                    <Bar dataKey="matching" stackId="a" name="matching" radius={[4, 4, 0, 0]}>
                                        {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <p className="text-xs text-gray-500 mt-2 text-center">Blue = direct · Solid = QF match allocation</p>
                        </div>
                    )}

                    {/* NGO cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {chartData.map((entry, idx) => {
                            const ngo = ngos.find((n) => n.id === entry.ngoId);
                            const isExpanded = donateNgoId === entry.ngoId;
                            return (
                                <div key={entry.ngoId}
                                    className="bg-navy-lighter rounded-2xl p-4 border border-gray-700/30 hover:border-primary/40 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">{entry.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{entry.name}</p>
                                            <p className="text-xs text-gray-400">{entry.donors} donors</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-white">{(entry.direct + entry.matching).toFixed(2)}</p>
                                            <p className="text-xs text-green-400">+{entry.matching.toFixed(2)} match</p>
                                        </div>
                                    </div>

                                    {isExpanded && daysLeft > 0 && isConnected ? (
                                        <div className="space-y-2 mt-2">
                                            <div className="flex gap-2">
                                                <select className="flex-1 p-2 bg-navy-light border border-gray-600/30 rounded-lg text-xs"
                                                    value={donateToken?.symbol || ""}
                                                    onChange={(e) => setDonateToken(supportedTokens[chain]?.find((t) => t.symbol === e.target.value))}>
                                                    <option value="">Token</option>
                                                    {supportedTokens[chain]?.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                                                </select>
                                                <input type="number" min="0" placeholder="Amount"
                                                    className="flex-1 p-2 bg-navy-light border border-gray-600/30 rounded-lg text-xs"
                                                    value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setDonateNgoId(null); setDonateAmount(""); setDonateToken(null); }}
                                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors">
                                                    Cancel
                                                </button>
                                                <button onClick={() => handleRoundDonate(entry.ngoId)}
                                                    className="flex-1 py-2 bg-primary hover:bg-primary/80 rounded-lg text-xs font-semibold transition-colors">
                                                    ⚡ Donate
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        daysLeft > 0 && (
                                            <button onClick={() => { setDonateNgoId(entry.ngoId); setDonateAmount(""); setDonateToken(null); }}
                                                className="w-full py-2 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded-xl text-xs font-semibold text-primary transition-colors">
                                                ⚡ Donate (gets matched)
                                            </button>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default QuadraticFunding;
