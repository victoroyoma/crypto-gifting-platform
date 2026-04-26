import React from "react";
import { NETWORK_CONFIGS } from "../config/networks";

/**
 * NGOCard — displayed in the fundraise browse panel.
 * Shows basic NGO info + donor progress bar.
 * Calls onSelect when the user clicks "Donate".
 */
const NGOCard = ({ ngo, donationCount, isSelected, onSelect, currentChain }) => {
    const chainSupported = currentChain
        ? !!ngo.walletAddresses?.[currentChain]
        : true;

    const progressPct = Math.min(
        100,
        Math.round((donationCount / ngo.goalDonors) * 100)
    );

    return (
        <div
            className={`rounded-2xl p-4 border transition-all duration-200 cursor-pointer ${isSelected
                    ? "border-primary bg-primary/10 shadow-custom-lg"
                    : "border-gray-700/40 bg-[#1a2747] hover:border-primary/40"
                }`}
            onClick={onSelect}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{ngo.icon}</span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-white truncate">{ngo.name}</h3>
                            {ngo.verified && (
                                <span
                                    title="Address verified by platform"
                                    className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-1.5 py-0.5 shrink-0"
                                >
                                    ✓ Verified
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-400">{ngo.category}</span>
                    </div>
                </div>
            </div>

            {/* Tagline */}
            <p className="text-xs text-gray-300 mb-3 line-clamp-2">{ngo.tagline}</p>

            {/* Progress */}
            <div className="mb-1 flex justify-between text-xs text-gray-400">
                <span>{donationCount} donations</span>
                <span>Goal: {ngo.goalDonors}</span>
            </div>
            <div className="w-full bg-gray-700/40 rounded-full h-1.5 mb-3">
                <div
                    className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                />
            </div>

            {/* Chain support tags */}
            <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(ngo.walletAddresses || {})
                    .filter(([, addr]) => addr)
                    .map(([ch]) => (
                        <span
                            key={ch}
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${currentChain === ch
                                    ? "bg-primary/20 border-primary/50 text-primary"
                                    : "bg-gray-700/30 border-gray-600/30 text-gray-400"
                                }`}
                        >
                            {NETWORK_CONFIGS[ch]?.icon} {ch}
                        </span>
                    ))}
            </div>

            <button
                className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${chainSupported
                        ? "bg-primary hover:bg-primary/80 text-white"
                        : "bg-gray-700/40 text-gray-500 cursor-not-allowed"
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (chainSupported) onSelect();
                }}
                disabled={!chainSupported}
                title={!chainSupported ? `${ngo.name} doesn't accept donations on your current chain` : ""}
            >
                {chainSupported ? "Donate" : "Not on this chain"}
            </button>
        </div>
    );
};

export default NGOCard;
