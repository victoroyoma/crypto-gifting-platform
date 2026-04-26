/**
 * ImpactAttestations.jsx
 *
 * On-chain impact verification system using Ethereum Attestation Service (EAS).
 *
 * NGOs submit impact reports with:
 *   - Description of what was achieved
 *   - IPFS hash of evidence (photos, receipts, reports)
 *   - Linked donation campaign (optional)
 *
 * Platform admins can verify/endorse attestations.
 * Donors can see a verified impact timeline for each NGO they've supported.
 *
 * In production:
 *   - EAS contract on Base (0xC2679fBD37d54388Ce493F1DB75320D236e1815e)
 *   - Schema: recipient (address), ngoId (bytes32), ipfsHash (string), description (string)
 *   - `await eas.attest({ schema, data: { recipient, data } })`
 * Here we simulate with localStorage, matching the production interface.
 */

import React, { useState, useContext } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";

// ─── Storage ──────────────────────────────────────────────────────────────────
const ATTEST_KEY = "cgp_attestations";
function load() { try { return JSON.parse(localStorage.getItem(ATTEST_KEY) || "[]"); } catch { return []; } }
function save(a) { localStorage.setItem(ATTEST_KEY, JSON.stringify(a)); }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Mock attestation UID (EAS format) ───────────────────────────────────────
function mockAttestUID() {
    return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// ─── Category colour helpers ─────────────────────────────────────────────────
const CATEGORY_COLORS = {
    "Environment": "from-green-600/20 to-emerald-600/20 border-green-500/30",
    "Health": "from-red-600/20 to-rose-600/20 border-red-500/30",
    "Education": "from-yellow-600/20 to-amber-600/20 border-yellow-500/30",
    "Humanitarian": "from-indigo-600/20 to-blue-600/20 border-indigo-500/30",
    "Human Rights": "from-purple-600/20 to-violet-600/20 border-purple-500/30",
    "Technology": "from-sky-600/20 to-cyan-600/20 border-sky-500/30",
};
const getColor = (cat) => CATEGORY_COLORS[cat] || "from-gray-600/20 to-gray-500/20 border-gray-500/30";

const VerifiedBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-medium border border-green-500/30">
        ✅ Verified
    </span>
);
const PendingBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium border border-yellow-500/30">
        ⏳ Pending Review
    </span>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ImpactAttestations = () => {
    const { isConnected, address } = useContext(WalletContext);
    const { ngos } = useNGOs();

    const [attestations, setAttestations] = useState(load);
    const [selectedNgoId, setSelectedNgoId] = useState("all");
    const [showForm, setShowForm] = useState(false);

    const [form, setForm] = useState({
        ngoId: "", title: "", description: "", ipfsHash: "", impactType: "Report", donorsReached: "", fundsUsed: "",
    });

    const persist = (updated) => { setAttestations(updated); save(updated); };

    const IMPACT_TYPES = ["Report", "Milestone Achieved", "Funds Deployed", "Beneficiaries Reached", "Media Coverage", "Audit"];

    // ── Submit attestation ────────────────────────────────────────────────────────
    const handleSubmit = () => {
        if (!form.ngoId || !form.title || !form.description) {
            toast.error("Fill in NGO, title, and description."); return;
        }
        const ngo = ngos.find((n) => n.id === form.ngoId);
        const attestation = {
            id: uid(),
            uid: mockAttestUID(), // EAS attestation UID in production
            ngoId: form.ngoId,
            ngoName: ngo?.name || form.ngoId,
            ngoIcon: ngo?.icon || "🌍",
            ngoCategory: ngo?.category || "Other",
            title: form.title,
            description: form.description,
            ipfsHash: form.ipfsHash.trim(),
            impactType: form.impactType,
            donorsReached: form.donorsReached ? parseInt(form.donorsReached) : null,
            fundsUsed: form.fundsUsed ? parseFloat(form.fundsUsed) : null,
            attestedBy: address || "anonymous",
            timestamp: Date.now(),
            verified: false,
            // In production: would be the EAS attester's signature
            schemaId: "0x84f3a5e4d1c9b2a7f6e8d0c3b5a9e2d7f4c1b6a3e9d2c5b8a1f4e7d0c3b6a9f",
        };
        persist([attestation, ...attestations]);
        setForm({ ngoId: "", title: "", description: "", ipfsHash: "", impactType: "Report", donorsReached: "", fundsUsed: "" });
        setShowForm(false);
        toast.success("Impact attestation submitted! Platform will review and verify. 📋");
    };

    // ── Verify (admin simulation) ────────────────────────────────────────────────
    const handleVerify = (id) => {
        persist(attestations.map((a) => a.id === id ? { ...a, verified: true, verifiedAt: Date.now(), verifiedBy: address } : a));
        toast.success("Attestation verified! ✅");
    };

    // ── Filter ────────────────────────────────────────────────────────────────────
    const filtered = selectedNgoId === "all"
        ? attestations
        : attestations.filter((a) => a.ngoId === selectedNgoId);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-2xl font-extrabold text-white">📋 Impact Attestations</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Verified on-chain proof that your donations created real-world change.
                    </p>
                </div>
                {isConnected && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
                    >
                        {showForm ? "✕ Cancel" : "+ Submit Impact Report"}
                    </button>
                )}
            </div>

            {/* EAS explainer */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-5 text-xs text-purple-200">
                <p className="font-bold text-purple-300 mb-1">🔗 Powered by Ethereum Attestation Service (EAS)</p>
                <p>
                    Each report generates an immutable on-chain attestation on Base. NGOs submit evidence (IPFS hashes),
                    and the platform cryptographically endorses verified reports. Donors can audit every dollar.
                </p>
                <a href="https://attest.sh" target="_blank" rel="noopener noreferrer"
                    className="text-purple-400 hover:underline mt-1 inline-block">
                    Learn more about EAS →
                </a>
            </div>

            {/* Submit form */}
            {showForm && (
                <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-6">
                    <h3 className="font-bold text-white mb-4">Submit Impact Attestation</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">NGO *</label>
                                <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.ngoId} onChange={(e) => setForm(f => ({ ...f, ngoId: e.target.value }))}>
                                    <option value="">— Select NGO —</option>
                                    {ngos.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Impact Type</label>
                                <select className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.impactType} onChange={(e) => setForm(f => ({ ...f, impactType: e.target.value }))}>
                                    {IMPACT_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Title *</label>
                            <input className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. 500 students enrolled in coding bootcamp" maxLength={120} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Description *</label>
                            <textarea className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary resize-none h-24"
                                value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Detailed description of the impact achieved…" maxLength={600} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">IPFS Evidence Hash (optional)</label>
                            <input className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm font-mono focus:border-primary"
                                value={form.ipfsHash} onChange={(e) => setForm(f => ({ ...f, ipfsHash: e.target.value }))}
                                placeholder="QmXxx... — upload report/photos to IPFS first" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Beneficiaries Reached</label>
                                <input type="number" min="0" className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.donorsReached} onChange={(e) => setForm(f => ({ ...f, donorsReached: e.target.value }))}
                                    placeholder="e.g. 500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Funds Deployed (USD)</label>
                                <input type="number" min="0" className="w-full p-3 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                                    value={form.fundsUsed} onChange={(e) => setForm(f => ({ ...f, fundsUsed: e.target.value }))}
                                    placeholder="e.g. 25000" />
                            </div>
                        </div>
                        <button onClick={handleSubmit}
                            className="w-full py-3 bg-primary hover:bg-primary/80 rounded-xl font-bold text-sm transition-colors">
                            📋 Submit Attestation
                        </button>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 flex-wrap mb-5">
                <button onClick={() => setSelectedNgoId("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedNgoId === "all" ? "bg-primary text-white" : "bg-navy-lighter text-gray-400 hover:bg-navy-lighter/80"
                        }`}>
                    All NGOs
                </button>
                {ngos.filter((n) => attestations.some((a) => a.ngoId === n.id)).map((n) => (
                    <button key={n.id} onClick={() => setSelectedNgoId(n.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedNgoId === n.id ? "bg-primary text-white" : "bg-navy-lighter text-gray-400 hover:bg-navy-lighter/80"
                            }`}>
                        {n.icon} {n.name}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-navy-lighter rounded-2xl border border-gray-700/30">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-gray-400 text-sm">No attestations yet. NGOs can submit impact reports above.</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700/40" />

                    <div className="space-y-5">
                        {filtered.map((a) => {
                            const colorClass = getColor(a.ngoCategory);
                            return (
                                <div key={a.id} className="relative flex gap-4">
                                    {/* Timeline dot */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 z-10 bg-gradient-to-br border ${colorClass}`}>
                                        {a.ngoIcon}
                                    </div>

                                    <div className={`flex-1 bg-gradient-to-br border rounded-2xl p-4 ${colorClass}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-white text-sm">{a.title}</span>
                                                    {a.verified ? <VerifiedBadge /> : <PendingBadge />}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">{a.ngoName} · {a.impactType}</p>
                                            </div>
                                            <span className="text-xs text-gray-500">{format(new Date(a.timestamp), "dd MMM yyyy")}</span>
                                        </div>

                                        <p className="text-sm text-gray-300 mt-2">{a.description}</p>

                                        {/* Stats */}
                                        {(a.donorsReached || a.fundsUsed) && (
                                            <div className="flex gap-4 mt-2">
                                                {a.donorsReached && (
                                                    <span className="text-xs font-medium text-green-300">
                                                        👥 {a.donorsReached.toLocaleString()} beneficiaries
                                                    </span>
                                                )}
                                                {a.fundsUsed && (
                                                    <span className="text-xs font-medium text-blue-300">
                                                        💰 ${a.fundsUsed.toLocaleString()} deployed
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* IPFS evidence */}
                                        {a.ipfsHash && (
                                            <div className="mt-2">
                                                <a href={`https://ipfs.io/ipfs/${a.ipfsHash}`} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-400 hover:underline font-mono">
                                                    📎 IPFS Evidence: {a.ipfsHash.slice(0, 20)}…
                                                </a>
                                            </div>
                                        )}

                                        {/* EAS UID */}
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs text-gray-600 font-mono truncate max-w-xs">
                                                UID: {a.uid?.slice(0, 18)}…
                                            </p>
                                            {!a.verified && isConnected && (
                                                <button onClick={() => handleVerify(a.id)}
                                                    className="px-3 py-1 bg-green-600/70 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors">
                                                    ✅ Verify
                                                </button>
                                            )}
                                            {a.verified && a.verifiedAt && (
                                                <p className="text-xs text-green-500">
                                                    Verified {format(new Date(a.verifiedAt), "dd MMM yyyy")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImpactAttestations;
