/**
 * DAOGovernance.jsx
 *
 * Decentralised governance panel for the Crypto Gifting Platform.
 * Token holders / donors vote on platform decisions.
 *
 * Voting power = total lifetime donations (USD-equivalent, stored in localStorage)
 * Proposal types:
 *   - NGO Listing / Removal
 *   - Platform Fee Change
 *   - Feature Request
 *   - Treasury Allocation
 *
 * In production:
 *   - Integrate Snapshot.org API (off-chain, gasless voting)
 *   - Or deploy a Governor.sol (OpenZeppelin) on Base/Optimism
 *   - Voting token: donation-weighted ERC20 or NFT-gated
 *
 * Storage: cgp_proposals, cgp_votes
 */

import React, { useState, useContext, useMemo } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";

// ─── Storage ──────────────────────────────────────────────────────────────────
const PROPOSALS_KEY = "cgp_proposals";
const VOTES_KEY = "cgp_votes";

function loadProposals() { try { return JSON.parse(localStorage.getItem(PROPOSALS_KEY) || "[]"); } catch { return []; } }
function loadVotes() { try { return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}"); } catch { return {}; } }
function saveProposals(p) { localStorage.setItem(PROPOSALS_KEY, JSON.stringify(p)); }
function saveVotes(v) { localStorage.setItem(VOTES_KEY, JSON.stringify(v)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Types ────────────────────────────────────────────────────────────────────
const PROPOSAL_TYPES = [
    { value: "ngo_listing", label: "📋 NGO Listing", color: "text-blue-300   bg-blue-500/20   border-blue-500/30" },
    { value: "ngo_removal", label: "🚫 NGO Removal", color: "text-red-300    bg-red-500/20    border-red-500/30" },
    { value: "fee_change", label: "💰 Platform Fee Change", color: "text-yellow-300 bg-yellow-500/20 border-yellow-500/30" },
    { value: "feature_request", label: "✨ Feature Request", color: "text-purple-300 bg-purple-500/20 border-purple-500/30" },
    { value: "treasury", label: "🏦 Treasury Allocation", color: "text-green-300  bg-green-500/20  border-green-500/30" },
    { value: "other", label: "💬 Other", color: "text-gray-300   bg-gray-500/20   border-gray-500/30" },
];

const typeInfo = (value) => PROPOSAL_TYPES.find((t) => t.value === value) || PROPOSAL_TYPES[5];

// ─── Voting power (from donation history in localStorage) ────────────────────
function getVotingPower(address) {
    if (!address) return 0;
    try {
        const history = JSON.parse(localStorage.getItem("cgp_donation_history") || "[]");
        const mine = history.filter((d) => d.address?.toLowerCase() === address.toLowerCase());
        // Simple: each donation counts as 1 vote regardless of amount
        // Production: weight by USD amount
        return mine.length + 1; // +1 so new users can still vote
    } catch {
        return 1;
    }
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function proposalStatus(p) {
    if (p.status === "finalized") return "finalized";
    if (isPast(new Date(p.endsAt))) return "ended";
    return "active";
}

const StatusBadge = ({ status }) => {
    const map = {
        active: "bg-green-500/20 text-green-300 border-green-500/30",
        ended: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        finalized: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
            {status === "active" ? "🟢 Active" : status === "ended" ? "⏰ Ended" : "✅ Finalized"}
        </span>
    );
};

// ─── Quorum ───────────────────────────────────────────────────────────────────
const QUORUM = 3; // minimum votes to pass

// ─── Main component ───────────────────────────────────────────────────────────
const DAOGovernance = () => {
    const { isConnected, address, donationHistory } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [proposals, setProposals] = useState(loadProposals);
    const [votes, setVotes] = useState(loadVotes);
    const [view, setView] = useState("list"); // "list" | "create" | "detail"
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState("all"); // "all" | "active" | "ended" | "finalized"

    const [form, setForm] = useState({
        title: "", description: "", type: "feature_request",
        options: ["For", "Against"],
        durationDays: 7,
    });

    const votingPower = useMemo(() => getVotingPower(address), [address, donationHistory]);

    const persistProposals = (p) => { setProposals(p); saveProposals(p); };
    const persistVotes = (v) => { setVotes(v); saveVotes(v); };

    // ── Create proposal ───────────────────────────────────────────────────────────
    const createProposal = () => {
        if (!isConnected) { toast.error("Connect wallet to create proposals."); return; }
        if (!form.title.trim() || !form.description.trim()) {
            toast.error("Title and description required."); return;
        }
        if (form.options.some((o) => !o.trim())) {
            toast.error("All options must be filled in."); return;
        }

        const proposal = {
            id: uid(),
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            options: form.options.map((o) => o.trim()),
            proposer: address,
            createdAt: Date.now(),
            endsAt: Date.now() + form.durationDays * 86400000,
            status: "active",
            voteCounts: Object.fromEntries(form.options.map((o) => [o.trim(), 0])),
            votePower: Object.fromEntries(form.options.map((o) => [o.trim(), 0])),
        };

        persistProposals([proposal, ...proposals]);
        setForm({ title: "", description: "", type: "feature_request", options: ["For", "Against"], durationDays: 7 });
        setView("list");
        toast.success("Proposal submitted! Voting is now open. 🗳");
    };

    // ── Vote ──────────────────────────────────────────────────────────────────────
    const castVote = (proposalId, option) => {
        if (!isConnected) { toast.error("Connect wallet to vote."); return; }
        const existing = votes[proposalId];
        if (existing) { toast.error("You've already voted on this proposal."); return; }

        const power = votingPower;
        const updVotes = { ...votes, [proposalId]: { option, power, voter: address, timestamp: Date.now() } };
        persistVotes(updVotes);

        const updProposals = proposals.map((p) => {
            if (p.id !== proposalId) return p;
            return {
                ...p,
                voteCounts: { ...p.voteCounts, [option]: (p.voteCounts[option] || 0) + 1 },
                votePower: { ...p.votePower, [option]: (p.votePower[option] || 0) + power },
            };
        });
        persistProposals(updProposals);
        if (selected?.id === proposalId) setSelected(updProposals.find((p) => p.id === proposalId));

        toast.success(`Vote cast for "${option}" with ${power} voting power! ✅`);
    };

    // ── Finalize ──────────────────────────────────────────────────────────────────
    const finalizeProposal = (proposalId) => {
        const updProposals = proposals.map((p) => {
            if (p.id !== proposalId) return p;
            const totalPower = Object.values(p.votePower).reduce((s, v) => s + v, 0);
            const totalVotes = Object.values(p.voteCounts).reduce((s, v) => s + v, 0);
            const winner = Object.entries(p.votePower).sort(([, a], [, b]) => b - a)[0]?.[0];
            const passed = totalVotes >= QUORUM && winner === (p.options[0]); // "For" wins
            return { ...p, status: "finalized", finalizedAt: Date.now(), winner, totalVotes, totalPower, passed };
        });
        persistProposals(updProposals);
        if (selected?.id === proposalId) setSelected(updProposals.find((p) => p.id === proposalId));
        toast.success("Proposal finalized! 📜");
    };

    // ── Filtered list ─────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return proposals.filter((p) => {
            const s = proposalStatus(p);
            if (filter === "all") return true;
            return s === filter;
        });
    }, [proposals, filter]);

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Create
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "create") {
        return (
            <div className="w-full max-w-xl mx-auto">
                <button onClick={() => setView("list")} className="text-gray-400 hover:text-white text-sm mb-4">← Back</button>
                <h2 className="text-xl font-extrabold text-white mb-5">New Proposal</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Proposal Type</label>
                        <select className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                            {PROPOSAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Title *</label>
                        <input className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Short, clear title for the proposal" maxLength={120} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Description *</label>
                        <textarea className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary resize-none h-28"
                            value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Explain what you're proposing and why…" maxLength={1000} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-2">Voting Options</label>
                        <div className="space-y-2">
                            {form.options.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <input className="flex-1 p-2.5 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                        value={opt} onChange={(e) => setForm(f => ({
                                            ...f, options: f.options.map((o, j) => j === i ? e.target.value : o)
                                        }))}
                                        placeholder={`Option ${i + 1}`} maxLength={60} />
                                    {form.options.length > 2 && (
                                        <button onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                                            className="text-red-400 hover:text-red-300 text-lg px-1">✕</button>
                                    )}
                                </div>
                            ))}
                            {form.options.length < 5 && (
                                <button onClick={() => setForm(f => ({ ...f, options: [...f.options, ""] }))}
                                    className="text-xs text-primary hover:underline">+ Add option</button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Voting Duration (days)</label>
                        <input type="number" min="1" max="30" className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.durationDays} onChange={(e) => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} />
                    </div>
                    <button onClick={createProposal}
                        className="w-full py-3 bg-primary hover:bg-primary/80 rounded-xl font-bold text-sm transition-colors">
                        🗳 Submit Proposal
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Detail
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "detail" && selected) {
        const p = proposals.find((x) => x.id === selected.id) || selected;
        const status = proposalStatus(p);
        const myVote = votes[p.id];
        const totalVotes = Object.values(p.voteCounts).reduce((s, v) => s + v, 0);
        const totalPower = Object.values(p.votePower).reduce((s, v) => s + v, 0);
        const info = typeInfo(p.type);

        return (
            <div className="w-full max-w-2xl mx-auto">
                <button onClick={() => setView("list")} className="text-gray-400 hover:text-white text-sm mb-4">← All Proposals</button>

                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${info.color}`}>{info.label}</span>
                                <StatusBadge status={status} />
                            </div>
                            <h2 className="text-xl font-extrabold text-white">{p.title}</h2>
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">{p.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>👤 Proposer: <span className="font-mono">{p.proposer?.slice(0, 8)}…{p.proposer?.slice(-4)}</span></span>
                        <span>📅 Created: {format(new Date(p.createdAt), "dd MMM yyyy")}</span>
                        <span>{status === "active" ? "⏳" : "🏁"} Ends: {format(new Date(p.endsAt), "dd MMM yyyy")}</span>
                        <span>🗳 {totalVotes} votes cast</span>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-4">
                    <h3 className="font-bold text-white mb-4">
                        {status === "active" ? "Cast Your Vote" : "Results"}
                    </h3>

                    {myVote && (
                        <div className="mb-3 text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                            ✅ You voted <strong>"{myVote.option}"</strong> with {myVote.power} voting power.
                        </div>
                    )}

                    <div className="space-y-3">
                        {p.options.map((opt) => {
                            const count = p.voteCounts[opt] || 0;
                            const power = p.votePower[opt] || 0;
                            const pct = totalPower > 0 ? Math.round((power / totalPower) * 100) : 0;
                            const isWinner = p.status === "finalized" && p.winner === opt;
                            return (
                                <div key={opt}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{opt}</span>
                                            {isWinner && <span className="text-xs text-yellow-300">👑 Winner</span>}
                                        </div>
                                        <span className="text-xs text-gray-400">{count} vote{count !== 1 ? "s" : ""} · {pct}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700/40 rounded-full h-2.5 mb-2">
                                        <div className={`h-2.5 rounded-full transition-all ${isWinner ? "bg-yellow-400" : "bg-primary"}`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                    {status === "active" && !myVote && isConnected && (
                                        <button onClick={() => castVote(p.id, opt)}
                                            className="text-xs px-3 py-1.5 bg-primary/20 hover:bg-primary/40 border border-primary/30 text-primary rounded-lg font-medium transition-colors">
                                            Vote "{opt}" ({votingPower} power)
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                        Quorum: {totalVotes}/{QUORUM} votes required to pass.
                        {totalVotes < QUORUM && status !== "finalized" && (
                            <span className="text-yellow-400"> — Needs {QUORUM - totalVotes} more vote{QUORUM - totalVotes > 1 ? "s" : ""}.</span>
                        )}
                    </div>

                    {status === "ended" && !myVote && address === p.proposer && (
                        <button onClick={() => finalizeProposal(p.id)}
                            className="mt-4 w-full py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold transition-colors">
                            ✅ Finalize Proposal
                        </button>
                    )}

                    {p.status === "finalized" && (
                        <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${p.passed ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
                            {p.passed ? "✅ Proposal PASSED" : "❌ Proposal did not pass"} — finalized {format(new Date(p.finalizedAt), "dd MMM yyyy")}
                        </div>
                    )}
                </div>

                {/* Snapshot explainer */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-xs text-purple-200">
                    <p className="font-bold text-purple-300 mb-1">🗳 Production: Snapshot.org</p>
                    <p>In production, proposals live on Snapshot.org — gasless, off-chain voting with on-chain verification.
                        Voting power tied to a donation-weighted ERC20 or NFT snapshot at proposal creation block.</p>
                    <a href="https://snapshot.org" target="_blank" rel="noopener noreferrer"
                        className="text-purple-400 hover:underline mt-1 inline-block">snapshot.org →</a>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: List
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">🏛 DAO Governance</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Vote on platform decisions. Your donations determine your voting power.</p>
                </div>
                {isConnected && (
                    <button onClick={() => setView("create")}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors">
                        + New Proposal
                    </button>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                    { label: "Total Proposals", value: proposals.length },
                    { label: "Active", value: proposals.filter((p) => proposalStatus(p) === "active").length },
                    { label: "Passed", value: proposals.filter((p) => p.passed).length },
                    { label: "Your Power", value: isConnected ? `${votingPower} VP` : "—" },
                ].map((s) => (
                    <div key={s.label} className="bg-navy-lighter rounded-xl p-4 border border-gray-700/30 text-center">
                        <p className="text-2xl font-extrabold text-white">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Voting power explainer */}
            {isConnected && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 mb-5 text-xs text-blue-200">
                    ⚡ Your voting power: <strong className="text-blue-300">{votingPower} VP</strong>.
                    Power increases with every donation you make. In production, power is weighted by total USD donated.
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {["all", "active", "ended", "finalized"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-white" : "bg-navy-lighter text-gray-400 hover:bg-navy-lighter/80"
                            }`}>
                        {f}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">🏛</div>
                    <p className="text-gray-400 text-sm">
                        {proposals.length === 0 ? "No proposals yet. Be the first to submit one!" : "No proposals match this filter."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((p) => {
                        const status = proposalStatus(p);
                        const totalVotes = Object.values(p.voteCounts).reduce((s, v) => s + v, 0);
                        const totalPower = Object.values(p.votePower).reduce((s, v) => s + v, 0);
                        const info = typeInfo(p.type);
                        const myVote = votes[p.id];
                        const leading = Object.entries(p.votePower).sort(([, a], [, b]) => b - a)[0];

                        return (
                            <div key={p.id}
                                onClick={() => { setSelected(p); setView("detail"); }}
                                className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 hover:border-primary/40 cursor-pointer transition-all">
                                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${info.color}`}>{info.label}</span>
                                        <StatusBadge status={status} />
                                        {myVote && <span className="text-xs text-green-400">✅ Voted</span>}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {status === "active"
                                            ? `Ends ${formatDistanceToNow(new Date(p.endsAt), { addSuffix: true })}`
                                            : format(new Date(p.endsAt), "dd MMM yyyy")}
                                    </span>
                                </div>
                                <h3 className="font-bold text-white mb-1">{p.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2">{p.description}</p>
                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                                    <span>🗳 {totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
                                    {leading && totalPower > 0 && (
                                        <span>Leading: <strong className="text-white">"{leading[0]}"</strong> {Math.round((leading[1] / totalPower) * 100)}%</span>
                                    )}
                                    {p.status === "finalized" && (
                                        <span className={p.passed ? "text-green-400" : "text-red-400"}>
                                            {p.passed ? "✅ Passed" : "❌ Not passed"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DAOGovernance;
