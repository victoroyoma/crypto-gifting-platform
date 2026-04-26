import React, { useState, useEffect } from "react";
import { useNGOs, slugify } from "../../contexts/NGOContext";

const CHAINS = ["ethereum", "polygon", "base", "arbitrum", "optimism", "bnb", "solana", "okx"];

const CHAIN_LABELS = {
    ethereum: "Ethereum",
    polygon: "Polygon",
    base: "Base",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
    bnb: "BNB Chain",
    solana: "Solana",
    okx: "OKX Chain",
};

const CHAIN_PLACEHOLDER = {
    ethereum: "0x...",
    polygon: "0x...",
    base: "0x...",
    arbitrum: "0x...",
    optimism: "0x...",
    bnb: "0x...",
    solana: "SoLana1111...base58address",
    okx: "0x...",
};

function isValidEVM(addr) {
    return !addr || /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function isValidSolana(addr) {
    return !addr || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

function validateAddress(chain, addr) {
    if (!addr) return true; // empty = not accepting on this chain, valid
    if (chain === "solana") return isValidSolana(addr);
    return isValidEVM(addr);
}

// ─── Blank NGO template ───────────────────────────────────────────────────────
const blankNGO = () => ({
    id: "",
    name: "",
    category: "",
    tagline: "",
    description: "",
    mission: "",
    icon: "🌍",
    website: "",
    donationPage: "",
    verified: false,
    goalDonors: 500,
    walletAddresses: {
        ethereum: "",
        polygon: "",
        base: "",
        arbitrum: "",
        optimism: "",
        bnb: "",
        solana: "",
        okx: "",
    },
});

// ─── Component ────────────────────────────────────────────────────────────────
const NGOFormModal = ({ ngo, onClose }) => {
    const { addNGO, updateNGO, categories, addCategory } = useNGOs();
    const isEdit = !!ngo;

    const [form, setForm] = useState(() => {
        if (ngo) {
            return {
                ...blankNGO(),
                ...ngo,
                walletAddresses: { ...blankNGO().walletAddresses, ...(ngo.walletAddresses || {}) },
            };
        }
        return blankNGO();
    });

    const [tab, setTab] = useState("basic"); // "basic" | "wallets"
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [newCategory, setNewCategory] = useState("");

    // Auto-generate id from name when adding
    useEffect(() => {
        if (!isEdit && form.name) {
            setForm((f) => ({ ...f, id: slugify(f.name) }));
        }
    }, [form.name, isEdit]);

    const set = (field, value) =>
        setForm((f) => ({ ...f, [field]: value }));

    const setWallet = (chain, value) =>
        setForm((f) => ({
            ...f,
            walletAddresses: { ...f.walletAddresses, [chain]: value.trim() },
        }));

    // ── Validation ──────────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Name is required.";
        if (!form.category) e.category = "Category is required.";
        if (!form.tagline.trim()) e.tagline = "Tagline is required.";
        if (!form.description.trim()) e.description = "Description is required.";
        if (!form.mission.trim()) e.mission = "Mission is required.";
        if (form.website && !/^https?:\/\//.test(form.website))
            e.website = "Must start with https://";
        if (form.donationPage && !/^https?:\/\//.test(form.donationPage))
            e.donationPage = "Must start with https://";
        if (!form.goalDonors || form.goalDonors < 1) e.goalDonors = "Must be ≥ 1.";

        // Wallet address validation
        for (const chain of CHAINS) {
            const addr = form.walletAddresses[chain];
            if (!validateAddress(chain, addr)) {
                e[`wallet_${chain}`] =
                    chain === "solana"
                        ? "Invalid Solana address (32–44 base58 chars)"
                        : "Invalid EVM address (0x + 40 hex chars)";
            }
        }

        // Must have at least one wallet address
        const hasAny = CHAINS.some((c) => !!form.walletAddresses[c]);
        if (!hasAny) e.wallet_any = "Add at least one wallet address.";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            // Jump to wallet tab if wallet errors exist
            const hasWalletErrors = Object.keys(errors).some((k) => k.startsWith("wallet_"));
            if (hasWalletErrors) setTab("wallets");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                name: form.name.trim(),
                tagline: form.tagline.trim(),
                description: form.description.trim(),
                mission: form.mission.trim(),
                website: form.website.trim(),
                donationPage: form.donationPage.trim(),
                goalDonors: parseInt(form.goalDonors, 10),
                // Remove empty wallet addresses (store null instead of "")
                walletAddresses: Object.fromEntries(
                    CHAINS.map((c) => [c, form.walletAddresses[c] || null])
                ),
            };

            if (isEdit) {
                updateNGO(ngo.id, payload);
            } else {
                addNGO(payload);
            }
            onClose(true);
        } catch (err) {
            setErrors({ submit: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !categories.includes(trimmed)) {
            addCategory(trimmed);
            set("category", trimmed);
            setNewCategory("");
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f1a35] border border-gray-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/40 shrink-0">
                    <h2 className="text-xl font-bold text-white">
                        {isEdit ? `Edit: ${ngo.name}` : "Add New NGO"}
                    </h2>
                    <button
                        onClick={() => onClose(false)}
                        className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 shrink-0">
                    {[
                        { key: "basic", label: "Basic Info" },
                        { key: "wallets", label: "Wallet Addresses" },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${tab === key
                                    ? "bg-primary/20 text-primary border-b-2 border-primary"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {label}
                            {key === "wallets" &&
                                Object.keys(errors).some((k) => k.startsWith("wallet_")) && (
                                    <span className="ml-1 text-red-400">⚠</span>
                                )}
                        </button>
                    ))}
                </div>

                {/* Form body */}
                <form
                    onSubmit={handleSubmit}
                    className="overflow-y-auto flex-1 px-6 py-4 space-y-4"
                >
                    {errors.submit && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                            {errors.submit}
                        </div>
                    )}

                    {/* ── Tab: Basic Info ───────────────────────────────────── */}
                    {tab === "basic" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="sm:col-span-2">
                                    <label className="label">Name *</label>
                                    <input
                                        className={`input ${errors.name ? "border-red-500" : ""}`}
                                        value={form.name}
                                        onChange={(e) => set("name", e.target.value)}
                                        placeholder="e.g. Gitcoin"
                                        maxLength={80}
                                    />
                                    {errors.name && <p className="err">{errors.name}</p>}
                                </div>

                                {/* ID */}
                                <div className="sm:col-span-2">
                                    <label className="label">
                                        Slug / ID{" "}
                                        <span className="text-gray-500">(auto-generated, must be unique)</span>
                                    </label>
                                    <input
                                        className="input font-mono"
                                        value={form.id}
                                        onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                        placeholder="gitcoin"
                                        maxLength={64}
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="label">Category *</label>
                                    <select
                                        className={`input ${errors.category ? "border-red-500" : ""}`}
                                        value={form.category}
                                        onChange={(e) => set("category", e.target.value)}
                                    >
                                        <option value="">— Select —</option>
                                        {categories
                                            .filter((c) => c !== "All")
                                            .map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                    </select>
                                    {errors.category && <p className="err">{errors.category}</p>}
                                    {/* Add new category inline */}
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            className="input flex-1 text-xs py-1"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            placeholder="New category…"
                                            maxLength={40}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="px-2 py-1 bg-primary/20 hover:bg-primary/40 text-primary rounded-lg text-xs"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

                                {/* Icon */}
                                <div>
                                    <label className="label">Icon (emoji)</label>
                                    <input
                                        className="input text-2xl"
                                        value={form.icon}
                                        onChange={(e) => set("icon", e.target.value)}
                                        maxLength={4}
                                        placeholder="🌍"
                                    />
                                </div>

                                {/* Tagline */}
                                <div className="sm:col-span-2">
                                    <label className="label">Tagline * (short, one line)</label>
                                    <input
                                        className={`input ${errors.tagline ? "border-red-500" : ""}`}
                                        value={form.tagline}
                                        onChange={(e) => set("tagline", e.target.value)}
                                        placeholder="e.g. Funding the open-source future"
                                        maxLength={120}
                                    />
                                    {errors.tagline && <p className="err">{errors.tagline}</p>}
                                </div>

                                {/* Description */}
                                <div className="sm:col-span-2">
                                    <label className="label">Description *</label>
                                    <textarea
                                        className={`input resize-none h-24 ${errors.description ? "border-red-500" : ""}`}
                                        value={form.description}
                                        onChange={(e) => set("description", e.target.value)}
                                        placeholder="Detailed description of the organisation…"
                                        maxLength={600}
                                    />
                                    {errors.description && <p className="err">{errors.description}</p>}
                                </div>

                                {/* Mission */}
                                <div className="sm:col-span-2">
                                    <label className="label">Mission Statement *</label>
                                    <textarea
                                        className={`input resize-none h-16 ${errors.mission ? "border-red-500" : ""}`}
                                        value={form.mission}
                                        onChange={(e) => set("mission", e.target.value)}
                                        placeholder="One-sentence mission…"
                                        maxLength={240}
                                    />
                                    {errors.mission && <p className="err">{errors.mission}</p>}
                                </div>

                                {/* Website */}
                                <div>
                                    <label className="label">Website URL</label>
                                    <input
                                        className={`input ${errors.website ? "border-red-500" : ""}`}
                                        value={form.website}
                                        onChange={(e) => set("website", e.target.value)}
                                        placeholder="https://example.org"
                                        type="url"
                                    />
                                    {errors.website && <p className="err">{errors.website}</p>}
                                </div>

                                {/* Donation page */}
                                <div>
                                    <label className="label">Donation Page / Verify URL</label>
                                    <input
                                        className={`input ${errors.donationPage ? "border-red-500" : ""}`}
                                        value={form.donationPage}
                                        onChange={(e) => set("donationPage", e.target.value)}
                                        placeholder="https://example.org/donate"
                                        type="url"
                                    />
                                    {errors.donationPage && <p className="err">{errors.donationPage}</p>}
                                </div>

                                {/* Goal donors */}
                                <div>
                                    <label className="label">Donor Goal (target number of donors)</label>
                                    <input
                                        className={`input ${errors.goalDonors ? "border-red-500" : ""}`}
                                        value={form.goalDonors}
                                        onChange={(e) => set("goalDonors", e.target.value)}
                                        type="number"
                                        min="1"
                                        max="1000000"
                                    />
                                    {errors.goalDonors && <p className="err">{errors.goalDonors}</p>}
                                </div>

                                {/* Verified */}
                                <div className="flex items-center gap-3 self-end pb-1">
                                    <label className="label mb-0">Verified address?</label>
                                    <button
                                        type="button"
                                        onClick={() => set("verified", !form.verified)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.verified ? "bg-green-500" : "bg-gray-600"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.verified ? "translate-x-6" : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                    <span className={`text-sm ${form.verified ? "text-green-400" : "text-gray-400"}`}>
                                        {form.verified ? "✓ Verified" : "⏳ Pending"}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Tab: Wallet Addresses ─────────────────────────────── */}
                    {tab === "wallets" && (
                        <>
                            {errors.wallet_any && (
                                <p className="err">{errors.wallet_any}</p>
                            )}
                            <p className="text-xs text-gray-400 mb-2">
                                Leave a chain empty to disable donations on that network. EVM
                                addresses must be checksummed or lowercase hex (42 chars).
                                Solana addresses are base58 (32–44 chars).
                            </p>
                            <div className="space-y-3">
                                {CHAINS.map((chain) => (
                                    <div key={chain}>
                                        <label className="label">{CHAIN_LABELS[chain]}</label>
                                        <input
                                            className={`input font-mono text-xs ${errors[`wallet_${chain}`] ? "border-red-500" : ""
                                                }`}
                                            value={form.walletAddresses[chain] || ""}
                                            onChange={(e) => setWallet(chain, e.target.value)}
                                            placeholder={CHAIN_PLACEHOLDER[chain]}
                                            spellCheck={false}
                                        />
                                        {errors[`wallet_${chain}`] && (
                                            <p className="err">{errors[`wallet_${chain}`]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700/40 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="px-5 py-2 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/80 disabled:opacity-50 text-white transition-colors"
                    >
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add NGO"}
                    </button>
                </div>
            </div>

            {/* Tailwind utility classes used in this file (prevent purge) */}
            <style>{`
        .label { display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem; }
        .input { width:100%; padding:0.625rem 0.75rem; background:#1a2747; border:1px solid rgba(75,85,99,0.4); border-radius:0.75rem; color:#fff; font-size:0.875rem; transition:border-color 0.2s; outline:none; }
        .input:focus { border-color:#3B82F6; }
        .err { font-size:0.7rem; color:#f87171; margin-top:0.25rem; }
      `}</style>
        </div>
    );
};

export default NGOFormModal;
