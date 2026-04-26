import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import { NGOS, NGO_CATEGORIES as SEED_CATEGORIES } from "../data/ngos";

// ─── Storage keys ────────────────────────────────────────────────────────────
const NGOS_KEY = "cgp_ngo_registry";
const CATS_KEY = "cgp_ngo_categories";
const ADMIN_KEY = "cgp_admin_address";
const SESSION_KEY = "cgp_admin_session";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function load(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function persist(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { }
}

export function slugify(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 64);
}

// ─── Context ─────────────────────────────────────────────────────────────────
export const NGOContext = createContext(null);

export const NGOProvider = ({ children }) => {
    const [ngos, setNgos] = useState(() => load(NGOS_KEY, NGOS));
    const [categories, setCategories] = useState(() =>
        load(CATS_KEY, SEED_CATEGORIES)
    );

    // Sync to localStorage whenever state changes
    useEffect(() => persist(NGOS_KEY, ngos), [ngos]);
    useEffect(() => persist(CATS_KEY, categories), [categories]);

    // ── CRUD ────────────────────────────────────────────────────────────────────
    const addNGO = useCallback((data) => {
        const id = data.id?.trim() || slugify(data.name);
        const ngo = { ...data, id };
        setNgos((prev) => {
            if (prev.some((n) => n.id === id)) {
                throw new Error(`An NGO with id "${id}" already exists.`);
            }
            return [...prev, ngo];
        });
        return ngo;
    }, []);

    const updateNGO = useCallback((id, updates) => {
        setNgos((prev) =>
            prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
        );
    }, []);

    const deleteNGO = useCallback((id) => {
        setNgos((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const reorderNGO = useCallback((id, direction) => {
        setNgos((prev) => {
            const idx = prev.findIndex((n) => n.id === id);
            if (idx === -1) return prev;
            const next = [...prev];
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    }, []);

    // ── Category management ─────────────────────────────────────────────────────
    const addCategory = useCallback((name) => {
        setCategories((prev) => {
            if (prev.includes(name)) return prev;
            return [...prev, name];
        });
    }, []);

    const deleteCategory = useCallback((name) => {
        if (name === "All") return; // "All" is always required
        setCategories((prev) => prev.filter((c) => c !== name));
    }, []);

    // ── Import / Export ─────────────────────────────────────────────────────────
    const exportData = useCallback(() => {
        const payload = JSON.stringify({ ngos, categories }, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ngos-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [ngos, categories]);

    const importData = useCallback((jsonString) => {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data.ngos)) setNgos(data.ngos);
        if (Array.isArray(data.categories)) setCategories(data.categories);
    }, []);

    const resetToDefaults = useCallback(() => {
        setNgos(NGOS);
        setCategories(SEED_CATEGORIES);
    }, []);

    // ── Admin auth helpers (wallet-signature based) ──────────────────────────────
    const getAdminAddress = () => localStorage.getItem(ADMIN_KEY)?.toLowerCase() || null;

    const claimAdmin = useCallback((walletAddress) => {
        localStorage.setItem(ADMIN_KEY, walletAddress.toLowerCase());
        sessionStorage.setItem(SESSION_KEY, "1");
    }, []);

    const authAdmin = useCallback(() => {
        sessionStorage.setItem(SESSION_KEY, "1");
    }, []);

    const logoutAdmin = useCallback(() => {
        sessionStorage.removeItem(SESSION_KEY);
    }, []);

    const isAdminSession = () => sessionStorage.getItem(SESSION_KEY) === "1";

    // ── Derived helpers ─────────────────────────────────────────────────────────
    const getNGOsForChain = useCallback(
        (chain) => ngos.filter((ngo) => !!ngo.walletAddresses?.[chain]),
        [ngos]
    );

    return (
        <NGOContext.Provider
            value={{
                ngos,
                categories,
                // CRUD
                addNGO,
                updateNGO,
                deleteNGO,
                reorderNGO,
                // Categories
                addCategory,
                deleteCategory,
                // Data management
                exportData,
                importData,
                resetToDefaults,
                // Auth
                getAdminAddress,
                claimAdmin,
                authAdmin,
                logoutAdmin,
                isAdminSession,
                // Derived
                getNGOsForChain,
            }}
        >
            {children}
        </NGOContext.Provider>
    );
};

export const useNGOs = () => {
    const ctx = useContext(NGOContext);
    if (!ctx) throw new Error("useNGOs must be used inside NGOProvider");
    return ctx;
};
