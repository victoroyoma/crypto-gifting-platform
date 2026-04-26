/**
 * MilestoneCampaigns.jsx
 *
 * Milestone-gated fundraising campaigns.
 * Funds are conceptually held in escrow and released when NGO submits
 * verifiable proof of milestone completion (IPFS hash of evidence).
 *
 * In production: a deployed MilestoneEscrow.sol contract would handle this.
 * Here we simulate the full UX with localStorage state, matching the exact
 * contract interface so it can be swapped in later.
 */

import React, { useState, useContext, useCallback } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";
import { NETWORK_CONFIGS } from "../../config/networks";

// ─── Storage ──────────────────────────────────────────────────────────────────
const CAMPAIGNS_KEY = "cgp_milestone_campaigns";
const PLEDGES_KEY = "cgp_milestone_pledges";

function loadCampaigns() {
    try { return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || "[]"); } catch { return []; }
}
function saveCampaigns(c) {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(c));
}
function loadPledges() {
    try { return JSON.parse(localStorage.getItem(PLEDGES_KEY) || "[]"); } catch { return []; }
}
function savePledges(p) {
    localStorage.setItem(PLEDGES_KEY, JSON.stringify(p));
}

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Milestone status colours ─────────────────────────────────────────────────
const STATUS = {
    pending: { label: "Pending", color: "bg-gray-600/40 text-gray-300", dot: "bg-gray-400" },
    active: { label: "Active", color: "bg-blue-500/20 text-blue-300", dot: "bg-blue-400" },
    submitted: { label: "In Review", color: "bg-yellow-500/20 text-yellow-300", dot: "bg-yellow-400" },
    released: { label: "Complete", color: "bg-green-500/20 text-green-400", dot: "bg-green-400" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

const ProgressBar = ({ raised, goal, color = "from-primary to-secondary" }) => {
    const pct = Math.min(100, goal > 0 ? Math.round((raised / goal) * 100) : 0);
    return (
        <div className="w-full bg-gray-700/40 rounded-full h-2">
            <div
                className={`bg-gradient-to-r ${color} h-2 rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const MilestoneCampaigns = () => {
    const { isConnected, address, chain, supportedTokens, sendDonation, donationHistory } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [campaigns, setCampaigns] = useState(loadCampaigns);
    const [pledges, setPledges] = useState(loadPledges);

    // ── UI state ─────────────────────────────────────────────────────────────────
    const [view, setView] = useState("browse"); // "browse" | "create" | "detail"
    const [selected, setSelected] = useState(null);
    const [pledgeAmount, setPledgeAmount] = useState("");
    const [pledgeToken, setPledgeToken] = useState(null);

    // Create campaign form
    const [form, setForm] = useState({
        ngoId: "", title: "", description: "", goalAmount: "", goalToken: "USDC",
        deadlineDays: 60,
        milestones: [{ id: uid(), title: "", description: "", pctRelease: 100, status: "pending" }],
    });

    // ── Campaign helpers ──────────────────────────────────────────────────────────
    const persist = (updated) => { setCampaigns(updated); saveCampaigns(updated); };

    const createCampaign = () => {
        if (!form.ngoId || !form.title || !form.goalAmount) {
            toast.error("Fill in NGO, title, and goal amount."); return;
        }
        const total = form.milestones.reduce((s, m) => s + Number(m.pctRelease), 0);
        if (total !== 100) { toast.error("Milestone release percentages must sum to 100%."); return; }

        const ngo = ngos.find((n) => n.id === form.ngoId);
        const now = Date.now();
        const campaign = {
            id: uid(),
            ngoId: form.ngoId,
            ngoName: ngo?.name || form.ngoId,
            ngoIcon: ngo?.icon || "🌍",
            title: form.title,
            description: form.description,
            goalAmount: parseFloat(form.goalAmount),
            goalToken: form.goalToken,
            raised: 0,
            deadline: now + form.deadlineDays * 86400000,
            createdAt: now,
            createdBy: address || "admin",
            milestones: form.milestones.map((m, i) => ({ ...m, order: i })),
            status: "active",
        };
        persist([campaign, ...campaigns]);
        setForm({
            ngoId: "", title: "", description: "", goalAmount: "", goalToken: "USDC",
            deadlineDays: 60,
            milestones: [{ id: uid(), title: "", description: "", pctRelease: 100, status: "pending" }],
        });
        setView("browse");
        toast.success("Campaign created!");
    };

    const addMilestone = () =>
        setForm((f) => ({
            ...f,
            milestones: [...f.milestones, { id: uid(), title: "", description: "", pctRelease: 0, status: "pending" }],
        }));

    const updateMilestone = (id, field, value) =>
        setForm((f) => ({
            ...f,
            milestones: f.milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
        }));

    const removeMilestone = (id) =>
        setForm((f) => ({ ...f, milestones: f.milestones.filter((m) => m.id !== id) }));

    // ── Pledge ────────────────────────────────────────────────────────────────────
    const handlePledge = async () => {
        if (!isConnected) { toast.error("Connect wallet first."); return; }
        if (!pledgeToken || !pledgeAmount || parseFloat(pledgeAmount) <= 0) {
            toast.error("Choose a token and enter an amount."); return;
        }
        const ngo = ngos.find((n) => n.id === selected.ngoId);
        const addr = ngo?.walletAddresses?.[chain];
        if (!addr) {
            toast.error(`Campaign NGO doesn't accept donations on ${chain}.`); return;
        }
        const tid = toast.loading("Sending pledge to escrow…");
        try {
            const txHash = await sendDonation(addr, pledgeAmount, chain, pledgeToken, {
                ngoId: selected.ngoId, ngoName: selected.ngoName,
                isAnonymous: false, donorName: null,
            });
            const pledge = {
                id: uid(), campaignId: selected.id, donor: address, amount: parseFloat(pledgeAmount),
                token: pledgeToken.symbol, chain, txHash, timestamp: Date.now(),
            };
            const updPledges = [pledge, ...pledges];
            setPledges(updPledges); savePledges(updPledges);

            // Update raised amount
            const updCampaigns = campaigns.map((c) =>
                c.id === selected.id ? { ...c, raised: c.raised + parseFloat(pledgeAmount) } : c
            );
            persist(updCampaigns);
            setSelected(updCampaigns.find((c) => c.id === selected.id));

            toast.dismiss(tid);
            toast.success(`Pledged ${pledgeAmount} ${pledgeToken.symbol}! 🎉`);
            setPledgeAmount(""); setPledgeToken(null);
        } catch (err) {
            toast.dismiss(tid);
            toast.error("Pledge failed: " + err.message);
        }
    };

    // ── Submit milestone proof (NGO/admin action) ─────────────────────────────────
    const submitMilestoneProof = (campaignId, milestoneId, ipfsHash) => {
        if (!ipfsHash.trim()) { toast.error("Enter an IPFS hash for the proof."); return; }
        const updCampaigns = campaigns.map((c) => {
            if (c.id !== campaignId) return c;
            return {
                ...c,
                milestones: c.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, status: "submitted", proof: ipfsHash.trim() } : m
                ),
            };
        });
        persist(updCampaigns);
        setSelected(updCampaigns.find((c) => c.id === campaignId));
        toast.success("Milestone proof submitted! Platform will review and release funds.");
    };

    // ── Release funds (admin action) ──────────────────────────────────────────────
    const releaseMilestoneFunds = (campaignId, milestoneId) => {
        const updCampaigns = campaigns.map((c) => {
            if (c.id !== campaignId) return c;
            const updMilestones = c.milestones.map((m) =>
                m.id === milestoneId ? { ...m, status: "released", releasedAt: Date.now() } : m
            );
            const allDone = updMilestones.every((m) => m.status === "released");
            return { ...c, milestones: updMilestones, status: allDone ? "completed" : c.status };
        });
        persist(updCampaigns);
        setSelected(updCampaigns.find((c) => c.id === campaignId));
        toast.success("Funds released to NGO! ✅");
    };

    // ── Campaign pledges ──────────────────────────────────────────────────────────
    const campaignPledges = selected
        ? pledges.filter((p) => p.campaignId === selected.id)
        : [];

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Browse
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "browse") {
        return (
            <div className="w-full">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-2xl font-extrabold text-white">🎯 Milestone Campaigns</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Funds are held in escrow and released only when NGOs prove milestones are met.
                        </p>
                    </div>
                    {isConnected && (
                        <button
                            onClick={() => setView("create")}
                            className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
                        >
                            + Create Campaign
                        </button>
                    )}
                </div>

                {campaigns.length === 0 ? (
                    <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                        <div className="text-5xl mb-3">🏗</div>
                        <p className="text-gray-400">No campaigns yet. Be the first to create one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {campaigns.map((c) => {
                            const daysLeft = Math.max(0, Math.ceil((c.deadline - Date.now()) / 86400000));
                            const milestonesCompleted = c.milestones.filter((m) => m.status === "released").length;
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => { setSelected(c); setView("detail"); }}
                                    className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 hover:border-primary/40 cursor-pointer transition-all"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-3xl">{c.ngoIcon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white text-sm">{c.title}</h3>
                                                <StatusBadge status={c.status || "active"} />
                                            </div>
                                            <p className="text-xs text-gray-400">{c.ngoName}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-3 line-clamp-2">{c.description}</p>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>{c.raised.toFixed(2)} {c.goalToken} raised</span>
                                        <span>Goal: {c.goalAmount} {c.goalToken}</span>
                                    </div>
                                    <ProgressBar raised={c.raised} goal={c.goalAmount} />
                                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                                        <span>{milestonesCompleted}/{c.milestones.length} milestones complete</span>
                                        <span>{daysLeft > 0 ? `${daysLeft}d left` : "Ended"}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Create
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "create") {
        const milestoneTotal = form.milestones.reduce((s, m) => s + Number(m.pctRelease || 0), 0);
        return (
            <div className="w-full max-w-2xl mx-auto">
                <button onClick={() => setView("browse")} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
                    ← Back
                </button>
                <h2 className="text-xl font-extrabold text-white mb-5">Create Milestone Campaign</h2>

                <div className="space-y-4">
                    {/* NGO */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">NGO *</label>
                        <select className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.ngoId} onChange={(e) => setForm(f => ({ ...f, ngoId: e.target.value }))}>
                            <option value="">— Select NGO —</option>
                            {ngos.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.name}</option>)}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Campaign Title *</label>
                        <input className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. Build 3 Schools in Ghana" maxLength={100} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Description</label>
                        <textarea className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary resize-none h-20"
                            value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Describe what this campaign will fund…" maxLength={400} />
                    </div>

                    {/* Goal + deadline */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Funding Goal *</label>
                            <input type="number" min="0" className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.goalAmount} onChange={(e) => setForm(f => ({ ...f, goalAmount: e.target.value }))}
                                placeholder="10000" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Token</label>
                            <select className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.goalToken} onChange={(e) => setForm(f => ({ ...f, goalToken: e.target.value }))}>
                                {["USDC", "USDT", "ETH", "MATIC", "DAI"].map((t) => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Duration (days)</label>
                        <input type="number" min="1" max="365" className="w-full p-3 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={form.deadlineDays} onChange={(e) => setForm(f => ({ ...f, deadlineDays: Number(e.target.value) }))} />
                    </div>

                    {/* Milestones */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-400">
                                Milestones * — total release: <span className={milestoneTotal === 100 ? "text-green-400" : "text-red-400"}>{milestoneTotal}%</span>
                            </label>
                            <button onClick={addMilestone} className="text-xs text-primary hover:underline">+ Add</button>
                        </div>
                        <div className="space-y-3">
                            {form.milestones.map((m, idx) => (
                                <div key={m.id} className="bg-[#1a2747] rounded-xl p-3 border border-gray-700/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-white">Milestone {idx + 1}</span>
                                        {form.milestones.length > 1 && (
                                            <button onClick={() => removeMilestone(m.id)} className="text-red-400 text-xs hover:underline">Remove</button>
                                        )}
                                    </div>
                                    <input className="w-full p-2 bg-navy-light border border-gray-600/30 rounded-lg text-xs mb-2 focus:border-primary"
                                        value={m.title} onChange={(e) => updateMilestone(m.id, "title", e.target.value)}
                                        placeholder="Milestone title…" />
                                    <div className="flex items-center gap-2">
                                        <input className="w-24 p-2 bg-navy-light border border-gray-600/30 rounded-lg text-xs focus:border-primary"
                                            type="number" min="0" max="100"
                                            value={m.pctRelease} onChange={(e) => updateMilestone(m.id, "pctRelease", Number(e.target.value))} />
                                        <span className="text-xs text-gray-400">% of funds released on completion</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={createCampaign}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm transition-colors">
                        🚀 Launch Campaign
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: Detail
    // ─────────────────────────────────────────────────────────────────────────────
    if (view === "detail" && selected) {
        const [proofInputs, setProofInputs] = useState({});
        const daysLeft = Math.max(0, Math.ceil((selected.deadline - Date.now()) / 86400000));

        return (
            <div className="w-full">
                <button onClick={() => setView("browse")} className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1">
                    ← All Campaigns
                </button>

                {/* Campaign header */}
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                    <div className="flex items-start gap-3 mb-3">
                        <span className="text-4xl">{selected.ngoIcon}</span>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-extrabold text-white">{selected.title}</h2>
                                <StatusBadge status={selected.status || "active"} />
                            </div>
                            <p className="text-sm text-gray-400">{selected.ngoName}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">{selected.description}</p>

                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-white font-bold">{selected.raised.toFixed(2)} {selected.goalToken}</span>
                        <span className="text-gray-400">of {selected.goalAmount} {selected.goalToken}</span>
                    </div>
                    <ProgressBar raised={selected.raised} goal={selected.goalAmount} />

                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                        <span>{campaignPledges.length} backers</span>
                        <span>{daysLeft > 0 ? `${daysLeft} days left` : "Campaign ended"}</span>
                        <span>Deadline: {format(new Date(selected.deadline), "dd MMM yyyy")}</span>
                    </div>
                </div>

                {/* Pledge form */}
                {isConnected && selected.status !== "completed" && daysLeft > 0 && (
                    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                        <h3 className="font-bold text-white mb-3">Back this Campaign</h3>
                        <div className="flex gap-3">
                            <select
                                className="flex-1 p-2.5 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={pledgeToken?.symbol || ""}
                                onChange={(e) => setPledgeToken(supportedTokens[chain]?.find((t) => t.symbol === e.target.value))}
                            >
                                <option value="">Token</option>
                                {supportedTokens[chain]?.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                            </select>
                            <input type="number" min="0" placeholder="Amount"
                                className="flex-1 p-2.5 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} />
                            <button onClick={handlePledge}
                                className="px-5 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors">
                                Pledge
                            </button>
                        </div>
                    </div>
                )}

                {/* Milestones */}
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                    <h3 className="font-bold text-white mb-4">Milestones</h3>
                    <div className="space-y-3">
                        {selected.milestones.map((m) => (
                            <div key={m.id} className="bg-[#1a2747] rounded-xl p-4 border border-gray-700/20">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-white text-sm">{m.title || `Milestone ${m.order + 1}`}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{m.pctRelease}% of funds</span>
                                        <StatusBadge status={m.status} />
                                    </div>
                                </div>
                                {m.proof && (
                                    <p className="text-xs text-green-400 mt-1">
                                        Proof: <a href={`https://ipfs.io/ipfs/${m.proof}`} target="_blank" rel="noopener noreferrer"
                                            className="hover:underline">{m.proof.slice(0, 20)}…</a>
                                    </p>
                                )}
                                {m.releasedAt && (
                                    <p className="text-xs text-gray-500 mt-1">Released: {format(new Date(m.releasedAt), "dd MMM yyyy")}</p>
                                )}
                                {/* NGO: submit proof */}
                                {m.status === "active" || m.status === "pending" ? (
                                    <div className="mt-2 flex gap-2">
                                        <input className="flex-1 p-2 bg-navy-light border border-gray-600/30 rounded-lg text-xs focus:border-primary"
                                            placeholder="IPFS hash of evidence (QmXxx...)"
                                            value={proofInputs[m.id] || ""}
                                            onChange={(e) => setProofInputs((p) => ({ ...p, [m.id]: e.target.value }))} />
                                        <button
                                            onClick={() => submitMilestoneProof(selected.id, m.id, proofInputs[m.id] || "")}
                                            className="px-3 py-1 bg-yellow-600/70 hover:bg-yellow-600 rounded-lg text-xs font-medium transition-colors">
                                            Submit Proof
                                        </button>
                                    </div>
                                ) : m.status === "submitted" ? (
                                    <button
                                        onClick={() => releaseMilestoneFunds(selected.id, m.id)}
                                        className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-semibold transition-colors">
                                        ✅ Release Funds
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Backers */}
                {campaignPledges.length > 0 && (
                    <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                        <h3 className="font-bold text-white mb-3">Backers ({campaignPledges.length})</h3>
                        <div className="space-y-2">
                            {campaignPledges.map((p) => (
                                <div key={p.id} className="flex justify-between items-center text-xs text-gray-300 py-1 border-b border-gray-700/20">
                                    <span className="font-mono">{p.donor?.slice(0, 8)}…{p.donor?.slice(-4)}</span>
                                    <span className="font-semibold text-green-400">{p.amount} {p.token}</span>
                                    <span className="text-gray-500">{format(new Date(p.timestamp), "dd MMM yyyy")}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default MilestoneCampaigns;
