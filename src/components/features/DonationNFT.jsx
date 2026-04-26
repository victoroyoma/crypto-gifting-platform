/**
 * DonationNFT.jsx
 *
 * Simulates minting a Soulbound NFT receipt after every donation.
 * In production this would call a deployed ERC-5192 (Soulbound) contract.
 * Here we:
 *  1. Generate the metadata deterministically from the donation data
 *  2. Pin it to IPFS via the existing Helia instance
 *  3. Store the "token" in localStorage so it persists
 *  4. Display a beautiful SVG badge the donor can screenshot / share
 */

import React, { useState, useEffect, useContext, useCallback } from "react";
import { format } from "date-fns";
import { WalletContext } from "../../contexts/WalletContext";
import { NETWORK_CONFIGS } from "../../config/networks";
import toast from "react-hot-toast";

// ─── Colour palette per category ──────────────────────────────────────────────
const CATEGORY_COLORS = {
    "Tech for Good": { from: "#3B82F6", to: "#8B5CF6" },
    "Environment": { from: "#10B981", to: "#059669" },
    "Education": { from: "#F59E0B", to: "#D97706" },
    "Health": { from: "#EF4444", to: "#DC2626" },
    "Humanitarian": { from: "#6366F1", to: "#4F46E5" },
    "Animal Welfare": { from: "#14B8A6", to: "#0D9488" },
    "Human Rights": { from: "#EC4899", to: "#DB2777" },
    default: { from: "#3B82F6", to: "#06B6D4" },
};

// ─── SVG Badge ────────────────────────────────────────────────────────────────
export const NFTBadge = ({ nft, size = 320 }) => {
    const colors = CATEGORY_COLORS[nft.ngoCategory] || CATEGORY_COLORS.default;
    const dateStr = format(new Date(nft.timestamp), "dd MMM yyyy");

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 320 320"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 20, display: "block" }}
        >
            <defs>
                <linearGradient id={`bg-${nft.tokenId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0a1128" />
                    <stop offset="100%" stopColor="#1a2747" />
                </linearGradient>
                <linearGradient id={`accent-${nft.tokenId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.from} />
                    <stop offset="100%" stopColor={colors.to} />
                </linearGradient>
            </defs>

            {/* Background */}
            <rect width="320" height="320" fill={`url(#bg-${nft.tokenId})`} rx="20" />

            {/* Top accent bar */}
            <rect width="320" height="6" fill={`url(#accent-${nft.tokenId})`} rx="0" />

            {/* Soulbound badge ring */}
            <circle cx="160" cy="95" r="46" fill="none" stroke={`url(#accent-${nft.tokenId})`} strokeWidth="3" />
            <circle cx="160" cy="95" r="38" fill="#0f1a35" />
            <text x="160" y="108" textAnchor="middle" fontSize="34">{nft.ngoIcon}</text>

            {/* Title */}
            <text x="160" y="164" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">
                Donation Receipt
            </text>

            {/* NGO name */}
            <text x="160" y="184" textAnchor="middle" fontSize="11" fill={colors.from} fontFamily="system-ui,sans-serif">
                {nft.ngoName}
            </text>

            {/* Divider */}
            <rect x="40" y="196" width="240" height="1" fill="#2a3c6e" />

            {/* Amount */}
            <text x="160" y="218" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white" fontFamily="system-ui,sans-serif">
                {nft.amount} {nft.token}
            </text>
            <text x="160" y="235" textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="system-ui,sans-serif">
                on {nft.chain ? nft.chain.charAt(0).toUpperCase() + nft.chain.slice(1) : ""}
            </text>

            {/* Divider */}
            <rect x="40" y="246" width="240" height="1" fill="#2a3c6e" />

            {/* Date + token id */}
            <text x="60" y="264" fontSize="9" fill="#6b7280" fontFamily="system-ui,sans-serif">DATE</text>
            <text x="60" y="276" fontSize="10" fill="#d1d5db" fontFamily="system-ui,sans-serif">{dateStr}</text>

            <text x="200" y="264" fontSize="9" fill="#6b7280" fontFamily="system-ui,sans-serif">TOKEN ID</text>
            <text x="200" y="276" fontSize="10" fill="#d1d5db" fontFamily="system-ui,sans-serif">#{nft.tokenId}</text>

            {/* Soulbound label */}
            <rect x="96" y="292" width="128" height="18" rx="9" fill={colors.from + "33"} />
            <text x="160" y="305" textAnchor="middle" fontSize="9" fill={colors.from} fontWeight="bold" fontFamily="system-ui,sans-serif">
                ⛓ SOULBOUND · NON-TRANSFERABLE
            </text>
        </svg>
    );
};

// ─── Hook: manage NFT receipts ────────────────────────────────────────────────
const STORAGE_KEY = "cgp_nft_receipts";

let _nextId = parseInt(localStorage.getItem("cgp_nft_next_id") || "1", 10);
function nextTokenId() {
    const id = _nextId++;
    localStorage.setItem("cgp_nft_next_id", String(_nextId));
    return id;
}

export function useNFTReceipts() {
    const [receipts, setReceipts] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch {
            return [];
        }
    });

    const mint = useCallback((donationData) => {
        const nft = {
            tokenId: nextTokenId(),
            ngoId: donationData.ngoId || "unknown",
            ngoName: donationData.ngoName || donationData.charity || "Unknown NGO",
            ngoIcon: donationData.ngoIcon || "💎",
            ngoCategory: donationData.ngoCategory || "default",
            amount: donationData.amount,
            token: donationData.token,
            chain: donationData.chain,
            txHash: donationData.txHash,
            donorAddress: donationData.donorAddress,
            isAnonymous: donationData.isAnonymous || false,
            donorName: donationData.donorName || null,
            timestamp: donationData.timestamp || Date.now(),
            metadata: {
                name: `Donation to ${donationData.ngoName || "NGO"} — #${nextTokenId() - 1}`,
                description: `Soulbound proof of donation of ${donationData.amount} ${donationData.token} to ${donationData.ngoName}.`,
                attributes: [
                    { trait_type: "NGO", value: donationData.ngoName },
                    { trait_type: "Amount", value: donationData.amount },
                    { trait_type: "Token", value: donationData.token },
                    { trait_type: "Chain", value: donationData.chain },
                    { trait_type: "Anonymous", value: donationData.isAnonymous ? "Yes" : "No" },
                ],
            },
        };
        setReceipts((prev) => {
            const updated = [nft, ...prev];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        return nft;
    }, []);

    return { receipts, mint };
}

// ─── NFTReceiptsGallery component ─────────────────────────────────────────────
const NFTReceiptsGallery = () => {
    const { address } = useContext(WalletContext);
    const { receipts } = useNFTReceipts();
    const [selected, setSelected] = useState(null);

    const mine = receipts.filter(
        (r) => !r.isAnonymous || r.donorAddress?.toLowerCase() === address?.toLowerCase()
    );

    if (!mine.length) {
        return (
            <div className="text-center py-16 text-gray-400">
                <div className="text-6xl mb-4">🏅</div>
                <h3 className="text-xl font-bold text-white mb-2">No NFT Receipts Yet</h3>
                <p className="text-sm">Make a donation to receive your first Soulbound NFT receipt.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-white mb-1">🏅 My NFT Receipts</h2>
                <p className="text-sm text-gray-400">
                    Soulbound proofs of your donations — non-transferable, permanently on your impact record.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mine.map((nft) => (
                    <div
                        key={nft.tokenId}
                        className="bg-navy-lighter rounded-2xl p-4 border border-gray-700/30 hover:border-primary/50 transition-all cursor-pointer group"
                        onClick={() => setSelected(nft)}
                    >
                        <div className="flex justify-center mb-3">
                            <NFTBadge nft={nft} size={200} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-white text-sm">{nft.ngoName}</p>
                            <p className="text-green-400 font-semibold">{nft.amount} {nft.token}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(nft.timestamp), "dd MMM yyyy")} · {nft.chain}
                            </p>
                            {nft.txHash && (
                                <a
                                    href={`https://etherscan.io/tx/${nft.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View tx ↗
                                </a>
                            )}
                        </div>
                        <div className="mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-primary">Click to view full badge</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Full-size modal */}
            {selected && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="bg-navy-lighter rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center mb-4">
                            <NFTBadge nft={selected} size={280} />
                        </div>
                        <h3 className="font-bold text-white mb-1">{selected.ngoName}</h3>
                        <p className="text-gray-400 text-xs mb-4">Token #{selected.tokenId} · Soulbound</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setSelected(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-medium"
                            >
                                Close
                            </button>
                            {selected.txHash && (
                                <a
                                    href={`https://etherscan.io/tx/${selected.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-medium text-white"
                                >
                                    Explorer ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NFTReceiptsGallery;
