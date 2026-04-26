import React, { useContext, useState, useRef } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { WalletContext } from "../../contexts/WalletContext";
import { useNGOs } from "../../contexts/NGOContext";
import { NETWORK_CONFIGS } from "../../config/networks";
import NGOFormModal from "./NGOFormModal";

// ─── Auth message ─────────────────────────────────────────────────────────────
const AUTH_MSG = "I am the administrator of Crypto Gifting Platform. I authorise this login.";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Stats card */
const Stat = ({ label, value, color = "text-white" }) => (
    <div className="bg-[#1a2747] rounded-xl p-4 border border-gray-700/30 text-center">
        <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const AdminPanel = () => {
    const {
        isConnected,
        address,
        provider,
        connectMetaMask,
        connectPhantom,
        connectOKXWallet,
        loading: walletLoading,
    } = useContext(WalletContext);

    const {
        ngos,
        categories,
        addCategory,
        deleteNGO,
        reorderNGO,
        deleteCategory,
        exportData,
        importData,
        resetToDefaults,
        getAdminAddress,
        claimAdmin,
        authAdmin,
        logoutAdmin,
        isAdminSession,
    } = useNGOs();

    // ── Auth state ───────────────────────────────────────────────────────────────
    const [authenticated, setAuthenticated] = useState(() => isAdminSession());
    const [authLoading, setAuthLoading] = useState(false);

    // ── UI state ─────────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [editNGO, setEditNGO] = useState(null); // NGO object being edited
    const [confirmDelete, setConfirmDelete] = useState(null); // id to delete
    const [showCatManager, setShowCatManager] = useState(false);
    const [newCatInput, setNewCatInput] = useState("");
    const importRef = useRef();

    const adminAddress = getAdminAddress();
    const isFirstRun = !adminAddress;

    // ── Auth handlers ─────────────────────────────────────────────────────────────
    const handleClaim = () => {
        if (!address) {
            toast.error("Connect your wallet first.");
            return;
        }
        claimAdmin(address);
        setAuthenticated(true);
        toast.success("Admin wallet registered. You are now logged in.");
    };

    const handleSignIn = async () => {
        if (!isConnected) {
            toast.error("Connect your wallet first.");
            return;
        }
        if (address.toLowerCase() !== adminAddress) {
            toast.error(
                `This wallet is not the registered admin.\nAdmin: ${adminAddress.slice(0, 6)}…${adminAddress.slice(-4)}`
            );
            return;
        }
        setAuthLoading(true);
        try {
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(AUTH_MSG);
            const recovered = ethers.verifyMessage(AUTH_MSG, signature);
            if (recovered.toLowerCase() !== adminAddress) {
                toast.error("Signature mismatch. Authentication failed.");
                return;
            }
            authAdmin();
            setAuthenticated(true);
            toast.success("Authenticated as admin.");
        } catch (err) {
            if (err.code !== 4001) {
                // 4001 = user rejected
                toast.error("Authentication error: " + err.message);
            }
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        logoutAdmin();
        setAuthenticated(false);
        toast("Logged out.");
    };

    // ── Data handlers ─────────────────────────────────────────────────────────────
    const handleDelete = (id) => {
        deleteNGO(id);
        setConfirmDelete(null);
        toast.success("NGO deleted.");
    };

    const handleFormClose = (saved) => {
        setShowForm(false);
        setEditNGO(null);
        if (saved) toast.success(editNGO ? "NGO updated." : "NGO added.");
    };

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                importData(ev.target.result);
                toast.success("Import successful.");
            } catch {
                toast.error("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleReset = () => {
        if (
            window.confirm(
                "Reset ALL NGO data to the built-in defaults? This cannot be undone."
            )
        ) {
            resetToDefaults();
            toast.success("Reset to defaults.");
        }
    };

    // ── Filtered NGO list ─────────────────────────────────────────────────────────
    const filteredNGOs = ngos.filter((n) => {
        const matchCat = filterCat === "All" || n.category === filterCat;
        const matchSearch =
            !search ||
            n.name.toLowerCase().includes(search.toLowerCase()) ||
            n.category.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const verifiedCount = ngos.filter((n) => n.verified).length;

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: not authenticated
    // ─────────────────────────────────────────────────────────────────────────────
    if (!authenticated) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="bg-navy-lighter rounded-2xl border border-gray-700/30 p-8 w-full max-w-md text-center shadow-2xl">
                    <div className="text-5xl mb-4">🔐</div>
                    <h1 className="text-2xl font-extrabold mb-2">Admin Access</h1>

                    {isFirstRun ? (
                        <>
                            <p className="text-gray-400 text-sm mb-6">
                                No admin wallet has been registered yet. Connect the wallet you
                                want to use as the admin and click{" "}
                                <strong className="text-white">Claim Admin</strong>.
                                <br />
                                <span className="text-yellow-400 text-xs">
                                    This can only be done once per device — store the wallet safely.
                                </span>
                            </p>
                            {!isConnected ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={connectMetaMask}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                            alt=""
                                            className="w-5 h-5"
                                        />
                                        Connect MetaMask
                                    </button>
                                    <button
                                        onClick={connectPhantom}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        👻 Connect Phantom
                                    </button>
                                    <button
                                        onClick={connectOKXWallet}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        ⬛ Connect OKX
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-300 mb-4 font-mono">
                                        {address?.slice(0, 8)}…{address?.slice(-6)}
                                    </p>
                                    <button
                                        onClick={handleClaim}
                                        className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-colors"
                                    >
                                        ✅ Claim Admin
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-gray-400 text-sm mb-2">
                                Admin wallet:{" "}
                                <span className="font-mono text-white">
                                    {adminAddress.slice(0, 8)}…{adminAddress.slice(-6)}
                                </span>
                            </p>
                            <p className="text-gray-400 text-sm mb-6">
                                Connect that wallet and sign a message to authenticate.
                            </p>
                            {!isConnected ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={connectMetaMask}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                            alt=""
                                            className="w-5 h-5"
                                        />
                                        Connect MetaMask
                                    </button>
                                    <button
                                        onClick={connectPhantom}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        👻 Connect Phantom
                                    </button>
                                    <button
                                        onClick={connectOKXWallet}
                                        disabled={walletLoading}
                                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        ⬛ Connect OKX
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm font-mono text-gray-300 mb-4">
                                        {address?.slice(0, 8)}…{address?.slice(-6)}
                                    </p>
                                    <button
                                        onClick={handleSignIn}
                                        disabled={authLoading}
                                        className="w-full py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 rounded-xl font-semibold transition-colors"
                                    >
                                        {authLoading ? "Waiting for signature…" : "🔏 Sign to Authenticate"}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER: authenticated dashboard
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="w-full text-white pb-10">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold">🔧 Admin Dashboard</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Logged in as{" "}
                        <span className="font-mono text-white">
                            {adminAddress?.slice(0, 8)}…{adminAddress?.slice(-6)}
                        </span>
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600/60 hover:bg-red-600 rounded-xl text-sm font-medium transition-colors"
                >
                    Logout
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Stat label="Total NGOs" value={ngos.length} color="text-primary" />
                <Stat label="Verified" value={verifiedCount} color="text-green-400" />
                <Stat
                    label="Pending Review"
                    value={ngos.length - verifiedCount}
                    color="text-yellow-400"
                />
                <Stat
                    label="Categories"
                    value={categories.filter((c) => c !== "All").length}
                    color="text-secondary"
                />
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => { setEditNGO(null); setShowForm(true); }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold transition-colors"
                >
                    + Add NGO
                </button>
                <button
                    onClick={exportData}
                    className="px-4 py-2 bg-blue-600/70 hover:bg-blue-600 rounded-xl text-sm font-medium transition-colors"
                >
                    ⬇ Export JSON
                </button>
                <button
                    onClick={() => importRef.current?.click()}
                    className="px-4 py-2 bg-purple-600/70 hover:bg-purple-600 rounded-xl text-sm font-medium transition-colors"
                >
                    ⬆ Import JSON
                </button>
                <input
                    ref={importRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImport}
                />
                <button
                    onClick={() => setShowCatManager((v) => !v)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium transition-colors"
                >
                    🏷 Manage Categories
                </button>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-700/60 hover:bg-red-700 rounded-xl text-sm font-medium transition-colors ml-auto"
                >
                    ↩ Reset to Defaults
                </button>
            </div>

            {/* Category manager */}
            {showCatManager && (
                <div className="bg-navy-lighter rounded-2xl border border-gray-700/30 p-4 mb-6">
                    <h3 className="font-bold mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {categories
                            .filter((c) => c !== "All")
                            .map((c) => (
                                <span
                                    key={c}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-navy-light rounded-full text-sm border border-gray-600/30"
                                >
                                    {c}
                                    <button
                                        onClick={() => {
                                            if (ngos.some((n) => n.category === c)) {
                                                toast.error(`Cannot delete "${c}" — ${ngos.filter((n) => n.category === c).length} NGO(s) use it.`);
                                                return;
                                            }
                                            deleteCategory(c);
                                        }}
                                        className="text-gray-500 hover:text-red-400 text-xs ml-1"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 p-2 bg-navy-light border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                            value={newCatInput}
                            onChange={(e) => setNewCatInput(e.target.value)}
                            placeholder="New category name…"
                            maxLength={40}
                        />
                        <button
                            onClick={() => {
                                const t = newCatInput.trim();
                                if (!t) return;
                                if (categories.includes(t)) {
                                    toast.error("Category already exists.");
                                    return;
                                }
                                addCategory(t);
                                setNewCatInput("");
                                toast.success(`Category "${t}" added.`);
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-medium transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Search + filter */}
            <div className="flex flex-wrap gap-3 mb-4">
                <input
                    className="flex-1 min-w-[200px] p-2.5 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search NGOs…"
                />
                <select
                    className="p-2.5 bg-navy-lighter border border-gray-600/30 rounded-xl text-sm focus:border-primary"
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                >
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* NGO table */}
            <div className="bg-navy-lighter rounded-2xl border border-gray-700/30 overflow-hidden">
                {filteredNGOs.length === 0 ? (
                    <p className="text-center text-gray-400 py-10 text-sm">
                        No NGOs match your search.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-gray-400 border-b border-gray-700/40">
                                    <th className="px-4 py-3 w-8">#</th>
                                    <th className="px-4 py-3">NGO</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-center">Verified</th>
                                    <th className="px-4 py-3 text-center">Chains</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNGOs.map((ngo, idx) => {
                                    const chainCount = Object.values(
                                        ngo.walletAddresses || {}
                                    ).filter(Boolean).length;
                                    const originalIdx = ngos.indexOf(ngo);
                                    return (
                                        <tr
                                            key={ngo.id}
                                            className="border-b border-gray-700/20 hover:bg-white/5 transition-colors"
                                        >
                                            {/* Position */}
                                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>

                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{ngo.icon}</span>
                                                    <div>
                                                        <p className="font-semibold text-white">{ngo.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{ngo.id}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-gray-700/50 rounded-full text-xs">
                                                    {ngo.category}
                                                </span>
                                            </td>

                                            {/* Verified */}
                                            <td className="px-4 py-3 text-center">
                                                {ngo.verified ? (
                                                    <span className="text-green-400 text-sm">✓</span>
                                                ) : (
                                                    <span className="text-yellow-500 text-sm">⏳</span>
                                                )}
                                            </td>

                                            {/* Chains */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-bold">
                                                    {chainCount}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Reorder up */}
                                                    <button
                                                        onClick={() => reorderNGO(ngo.id, "up")}
                                                        disabled={originalIdx === 0}
                                                        title="Move up"
                                                        className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-400"
                                                    >
                                                        ↑
                                                    </button>
                                                    {/* Reorder down */}
                                                    <button
                                                        onClick={() => reorderNGO(ngo.id, "down")}
                                                        disabled={originalIdx === ngos.length - 1}
                                                        title="Move down"
                                                        className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-400"
                                                    >
                                                        ↓
                                                    </button>
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => { setEditNGO(ngo); setShowForm(true); }}
                                                        title="Edit"
                                                        className="p-1.5 rounded-lg hover:bg-blue-600/30 text-blue-400 transition-colors"
                                                    >
                                                        ✏️
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setConfirmDelete(ngo.id)}
                                                        title="Delete"
                                                        className="p-1.5 rounded-lg hover:bg-red-600/30 text-red-400 transition-colors"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0f1a35] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="text-4xl mb-3">⚠️</div>
                        <h3 className="text-lg font-bold mb-2">Delete NGO?</h3>
                        <p className="text-gray-400 text-sm mb-5">
                            <strong className="text-white">
                                {ngos.find((n) => n.id === confirmDelete)?.name}
                            </strong>{" "}
                            will be permanently removed from the registry.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NGO Form modal */}
            {showForm && (
                <NGOFormModal ngo={editNGO} onClose={handleFormClose} />
            )}
        </div>
    );
};

export default AdminPanel;
