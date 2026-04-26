/**
 * AnalyticsDashboard.jsx
 *
 * Platform-wide donation analytics.
 * Reads from localStorage donation records aggregated across all sessions.
 * Uses recharts for all visualisations (already installed).
 *
 * Charts:
 *   - Cumulative donations over time (AreaChart)
 *   - Donations by chain (BarChart)
 *   - Top 8 NGOs by amount (HorizontalBarChart)
 *   - Token breakdown (PieChart)
 *
 * Also shows key KPI cards: total raised, total donors, top NGO, top chain.
 */

import React, { useContext, useMemo, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";
import { usePriceFeeds } from "../../hooks/usePriceFeeds";

// ─── Colour palette ───────────────────────────────────────────────────────────
const CHAIN_COLORS = {
    ethereum: "#627EEA", polygon: "#8247E5", base: "#0052FF",
    arbitrum: "#28A0F0", optimism: "#FF0420", bnb: "#F3BA2F",
    solana: "#9945FF", okx: "#00B4D8",
};

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1", "#F97316", "#84CC16"];

// ─── Load ALL donation records from localStorage ──────────────────────────────
function loadAllDonations() {
    try {
        // WalletContext stores per-session in memory, but we persist to localStorage
        const stored = JSON.parse(localStorage.getItem("cgp_donation_history") || "[]");
        return stored;
    } catch {
        return [];
    }
}

// ─── Custom tooltip style ────────────────────────────────────────────────────
const TooltipStyle = {
    contentStyle: { background: "#1a2747", border: "1px solid #3B82F6", borderRadius: 12, color: "#fff", fontSize: 12 },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ icon, label, value, sub, accent = "text-white" }) => (
    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 flex flex-col gap-1">
        <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
        <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
    const { donationHistory } = useContext(WalletContext);
    const { ngos } = useNGOs();
    const { getUSDValue } = usePriceFeeds();
    const [range, setRange] = useState(30); // days

    // Merge in-memory + persisted donations, deduplicate by txHash
    const allDonations = useMemo(() => {
        const persisted = loadAllDonations();
        const merged = [...(donationHistory || []), ...persisted];
        const seen = new Set();
        return merged.filter((d) => {
            if (!d.txHash || seen.has(d.txHash)) return false;
            seen.add(d.txHash);
            return true;
        }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [donationHistory]);

    // ── USD amount helper ───────────────────────────────────────────────────────
    const toUSD = (d) => {
        const usd = getUSDValue(d.amount, d.token);
        return usd ?? parseFloat(d.amount) ?? 0;
    };

    // ── KPIs ──────────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const total = allDonations.reduce((s, d) => s + toUSD(d), 0);
        const uniqueAddrs = new Set(allDonations.map((d) => d.donorAddress || d.address || "anon")).size;
        const ngoCounts = {};
        for (const d of allDonations) {
            if (d.ngoName) ngoCounts[d.ngoName] = (ngoCounts[d.ngoName] || 0) + toUSD(d);
        }
        const topNGO = Object.entries(ngoCounts).sort(([, a], [, b]) => b - a)[0];
        const chainCounts = {};
        for (const d of allDonations) {
            chainCounts[d.chain] = (chainCounts[d.chain] || 0) + 1;
        }
        const topChain = Object.entries(chainCounts).sort(([, a], [, b]) => b - a)[0];
        return { total, uniqueAddrs, topNGO, topChain };
    }, [allDonations]);

    // ── Area chart: cumulative over time ──────────────────────────────────────────
    const timeSeriesData = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), range - 1), end: new Date() });
        let cumulative = 0;
        return days.map((day) => {
            const dayStart = startOfDay(day).getTime();
            const dayEnd = dayStart + 86400000;
            const dayTotal = allDonations
                .filter((d) => d.timestamp >= dayStart && d.timestamp < dayEnd)
                .reduce((s, d) => s + toUSD(d), 0);
            cumulative += dayTotal;
            return {
                date: format(day, range <= 14 ? "dd MMM" : "dd/MM"),
                daily: parseFloat(dayTotal.toFixed(2)),
                cumulative: parseFloat(cumulative.toFixed(2)),
            };
        });
    }, [allDonations, range]);

    // ── Bar chart: by chain ───────────────────────────────────────────────────────
    const chainData = useMemo(() => {
        const map = {};
        for (const d of allDonations) {
            const c = d.chain || "unknown";
            map[c] = (map[c] || 0) + toUSD(d);
        }
        return Object.entries(map)
            .map(([chain, amount]) => ({ chain: chain.charAt(0).toUpperCase() + chain.slice(1), amount: parseFloat(amount.toFixed(2)), key: chain }))
            .sort((a, b) => b.amount - a.amount);
    }, [allDonations]);

    // ── Horizontal bar: top NGOs ──────────────────────────────────────────────────
    const ngoData = useMemo(() => {
        const map = {};
        for (const d of allDonations) {
            const name = d.ngoName || "Unknown";
            map[name] = (map[name] || 0) + toUSD(d);
        }
        return Object.entries(map)
            .map(([name, amount]) => ({
                name: name.length > 18 ? name.slice(0, 16) + "…" : name,
                amount: parseFloat(amount.toFixed(2)),
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 8);
    }, [allDonations]);

    // ── Pie: token breakdown ──────────────────────────────────────────────────────
    const tokenData = useMemo(() => {
        const map = {};
        for (const d of allDonations) {
            const tok = d.token || "Unknown";
            map[tok] = (map[tok] || 0) + toUSD(d);
        }
        return Object.entries(map)
            .map(([token, value]) => ({ token, value: parseFloat(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value);
    }, [allDonations]);

    // ── Recent donations ──────────────────────────────────────────────────────────
    const recent = allDonations.slice(0, 8);

    const fmtUSD = (v) => v >= 1000
        ? `$${(v / 1000).toFixed(1)}k`
        : `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">📊 Analytics</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Platform-wide donation data &amp; impact metrics.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Range:</span>
                    {[7, 14, 30, 90].map((d) => (
                        <button key={d} onClick={() => setRange(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${range === d ? "bg-primary text-white" : "bg-navy-lighter text-gray-400 hover:bg-navy-lighter/80"}`}>
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <KPICard icon="💰" label="Total Raised (est. USD)" value={fmtUSD(kpis.total)} sub={`${allDonations.length} donations`} accent="text-green-400" />
                <KPICard icon="👥" label="Unique Donors" value={kpis.uniqueAddrs} sub="wallets participated" accent="text-blue-400" />
                <KPICard icon="🏆" label="Top NGO" value={kpis.topNGO?.[0] || "—"} sub={kpis.topNGO ? fmtUSD(kpis.topNGO[1]) : ""} accent="text-yellow-400" />
                <KPICard icon="⛓️" label="Top Chain" value={kpis.topChain?.[0]?.charAt(0).toUpperCase() + (kpis.topChain?.[0]?.slice(1) || "") || "—"} sub={`${kpis.topChain?.[1] || 0} txs`} accent="text-purple-400" />
            </div>

            {allDonations.length === 0 ? (
                <div className="text-center py-20 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">📊</div>
                    <p className="text-gray-400">No donation data yet. Make a donation to see analytics.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Cumulative area chart */}
                    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                        <h3 className="font-bold text-white mb-4">Donations Over Time</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3c6e" />
                                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip {...TooltipStyle} formatter={(v, n) => [`$${v}`, n === "cumulative" ? "Cumulative" : "Daily"]} />
                                <Area type="monotone" dataKey="cumulative" stroke="#3B82F6" fill="url(#cumGrad)" strokeWidth={2} name="cumulative" />
                                <Area type="monotone" dataKey="daily" stroke="#8B5CF6" fill="url(#dailyGrad)" strokeWidth={1.5} name="daily" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chain + Token row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* By chain */}
                        <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                            <h3 className="font-bold text-white mb-4">By Chain</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={chainData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3c6e" />
                                    <XAxis dataKey="chain" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                                    <Tooltip {...TooltipStyle} formatter={(v) => [`$${v}`, "Amount"]} />
                                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                        {chainData.map((entry, i) => (
                                            <Cell key={i} fill={CHAIN_COLORS[entry.key] || PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Token pie */}
                        <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                            <h3 className="font-bold text-white mb-4">Token Breakdown</h3>
                            {tokenData.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center mt-8">No data</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={tokenData} dataKey="value" nameKey="token" cx="50%" cy="50%"
                                            innerRadius={45} outerRadius={75} paddingAngle={3}>
                                            {tokenData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip {...TooltipStyle} formatter={(v, n) => [`$${v.toFixed(2)}`, n]} />
                                        <Legend formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{v}</span>} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Top NGOs bar */}
                    {ngoData.length > 0 && (
                        <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                            <h3 className="font-bold text-white mb-4">Top NGOs by Amount Raised</h3>
                            <ResponsiveContainer width="100%" height={ngoData.length * 36 + 20}>
                                <BarChart data={ngoData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3c6e" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} width={120} />
                                    <Tooltip {...TooltipStyle} formatter={(v) => [`$${v}`, "Raised"]} />
                                    <Bar dataKey="amount" fill="#3B82F6" radius={[0, 6, 6, 0]}>
                                        {ngoData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Recent donations table */}
                    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                        <h3 className="font-bold text-white mb-4">Recent Donations</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-gray-300">
                                <thead>
                                    <tr className="text-gray-500 text-left">
                                        <th className="pb-2 pr-4">NGO</th>
                                        <th className="pb-2 pr-4">Amount</th>
                                        <th className="pb-2 pr-4">Chain</th>
                                        <th className="pb-2 pr-4">Donor</th>
                                        <th className="pb-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map((d, i) => {
                                        const usd = getUSDValue(d.amount, d.token);
                                        return (
                                            <tr key={d.txHash || i} className="border-t border-gray-700/20">
                                                <td className="py-2 pr-4 font-medium text-white">{d.ngoName || "—"}</td>
                                                <td className="py-2 pr-4">
                                                    {d.amount} {d.token}
                                                    {usd !== null && <span className="text-gray-500 ml-1">(${usd.toFixed(2)})</span>}
                                                </td>
                                                <td className="py-2 pr-4 capitalize">{d.chain}</td>
                                                <td className="py-2 pr-4 font-mono">
                                                    {d.isAnonymous ? "🎭 Anon" : d.donorAddress ? `${d.donorAddress.slice(0, 6)}…` : "—"}
                                                </td>
                                                <td className="py-2 text-gray-500">
                                                    {d.timestamp ? format(new Date(d.timestamp), "dd MMM") : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {allDonations.length > 8 && (
                                <p className="text-xs text-gray-500 mt-2 text-center">{allDonations.length - 8} more donations…</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
