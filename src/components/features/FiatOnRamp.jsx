/**
 * FiatOnRamp.jsx
 *
 * Fiat-to-crypto on-ramp powered by Transak.
 * Users can buy crypto with credit card / bank transfer and have it
 * sent directly to their wallet, ready to donate immediately.
 *
 * Transak is pre-configured with:
 *   - User's connected wallet address
 *   - Currently selected chain/network
 *   - Suggested crypto (ETH, MATIC, etc.)
 *
 * Fallback providers shown if user dismisses the widget.
 */

import React, { useContext, useState, useCallback } from "react";
import { WalletContext } from "../../contexts/WalletContext";

// ─── Transak config ───────────────────────────────────────────────────────────
// Replace with your Transak Partner API key from https://partners.transak.com
const TRANSAK_API_KEY = "YOUR_TRANSAK_API_KEY";
const TRANSAK_BASE = "https://global.transak.com";

// Maps our chain IDs to Transak network names
const CHAIN_TO_TRANSAK = {
    ethereum: { network: "ethereum", crypto: "ETH" },
    polygon: { network: "polygon", crypto: "MATIC" },
    base: { network: "base", crypto: "ETH" },
    arbitrum: { network: "arbitrum", crypto: "ETH" },
    optimism: { network: "optimism", crypto: "ETH" },
    bnb: { network: "bsc", crypto: "BNB" },
    solana: { network: "solana", crypto: "SOL" },
    okx: { network: "polygon", crypto: "MATIC" }, // fallback
};

// ─── Fallback providers ───────────────────────────────────────────────────────
const PROVIDERS = [
    {
        name: "Transak",
        icon: "💳",
        description: "Card / bank transfer. 130+ countries.",
        url: TRANSAK_BASE,
        recommended: true,
    },
    {
        name: "MoonPay",
        icon: "🌙",
        description: "Fast card payments. Widely supported.",
        url: "https://www.moonpay.com/buy",
    },
    {
        name: "Ramp Network",
        icon: "🏦",
        description: "Bank transfers, open banking.",
        url: "https://ramp.network",
    },
    {
        name: "Banxa",
        icon: "🌐",
        description: "Global payments, many local methods.",
        url: "https://banxa.com",
    },
];

// ─── Build Transak URL with pre-filled params ────────────────────────────────
function buildTransakUrl(address, chain) {
    const cfg = CHAIN_TO_TRANSAK[chain] || CHAIN_TO_TRANSAK.ethereum;
    const params = new URLSearchParams({
        apiKey: TRANSAK_API_KEY,
        network: cfg.network,
        defaultCryptoCurrency: cfg.crypto,
        ...(address ? { walletAddress: address } : {}),
        disableWalletAddressForm: address ? "true" : "false",
        colorMode: "DARK",
        themeColor: "3B82F6",
    });
    return `${TRANSAK_BASE}?${params.toString()}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
const FiatOnRamp = () => {
    const { isConnected, address, chain } = useContext(WalletContext);
    const [showWidget, setShowWidget] = useState(false);
    const [widgetUrl, setWidgetUrl] = useState("");

    const openTransak = useCallback(() => {
        const url = buildTransakUrl(address, chain);
        setWidgetUrl(url);
        setShowWidget(true);
    }, [address, chain]);

    const openInTab = useCallback(() => {
        window.open(buildTransakUrl(address, chain), "_blank", "noopener,noreferrer");
    }, [address, chain]);

    const chainCfg = CHAIN_TO_TRANSAK[chain] || CHAIN_TO_TRANSAK.ethereum;
    const chainLabel = chain ? chain.charAt(0).toUpperCase() + chain.slice(1) : "your chain";

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-white">💳 Buy Crypto</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                    Purchase crypto with a card or bank transfer, delivered straight to your wallet — ready to donate.
                </p>
            </div>

            {/* Not connected banner */}
            {!isConnected && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5 text-sm text-yellow-300">
                    ⚠️ Connect your wallet first so we can pre-fill your address.
                </div>
            )}

            {/* Primary CTA */}
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-6 mb-6 text-center">
                <div className="text-5xl mb-3">💳</div>
                <h3 className="text-xl font-extrabold text-white mb-1">Buy {chainCfg.crypto} on {chainLabel}</h3>
                <p className="text-sm text-gray-300 mb-5">
                    Use Transak to buy crypto with Visa, Mastercard, Apple Pay, or bank transfer in 130+ countries.
                    {address && <span className="block text-xs text-gray-400 mt-1 font-mono">→ Sent to {address.slice(0, 8)}…{address.slice(-6)}</span>}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        onClick={openTransak}
                        className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-xl font-bold transition-colors">
                        Open Transak Widget
                    </button>
                    <button
                        onClick={openInTab}
                        className="px-6 py-3 bg-navy-lighter hover:bg-navy-lighter/80 border border-gray-600/40 rounded-xl font-semibold text-sm transition-colors">
                        Open in New Tab ↗
                    </button>
                </div>
            </div>

            {/* Widget modal */}
            {showWidget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-navy-light rounded-3xl overflow-hidden w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/30">
                            <h3 className="font-bold text-white">Buy Crypto — Transak</h3>
                            <button onClick={() => setShowWidget(false)}
                                className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
                        </div>
                        <div className="h-[560px]">
                            <iframe
                                src={widgetUrl}
                                title="Transak — Buy Crypto"
                                allow="camera; payment; microphone"
                                className="w-full h-full border-none"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Why buy crypto section */}
            <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30 mb-5">
                <h3 className="font-bold text-white mb-3">Why donate crypto instead of fiat?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: "🌍", title: "Global reach", desc: "NGOs receive funds instantly, no bank accounts needed, no currency conversion fees." },
                        { icon: "🔍", title: "Full transparency", desc: "Every transaction is on-chain. Donors can verify exactly where funds went." },
                        { icon: "💸", title: "Lower fees", desc: "Crypto transfers cost cents vs 3-8% for card donations through traditional platforms." },
                    ].map((item) => (
                        <div key={item.title} className="flex gap-3">
                            <span className="text-2xl shrink-0">{item.icon}</span>
                            <div>
                                <p className="font-semibold text-white text-sm">{item.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alternative providers */}
            <div>
                <h3 className="font-bold text-white mb-3 text-sm">Other on-ramp providers</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROVIDERS.map((p) => (
                        <a
                            key={p.name}
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all hover:border-primary/40 ${p.recommended
                                    ? "bg-primary/10 border-primary/30"
                                    : "bg-navy-lighter border-gray-700/30"
                                }`}
                        >
                            <span className="text-3xl mb-2">{p.icon}</span>
                            <p className="font-semibold text-white text-xs">{p.name}</p>
                            {p.recommended && (
                                <span className="text-xs text-primary font-medium">★ Recommended</span>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{p.description}</p>
                        </a>
                    ))}
                </div>
            </div>

            <p className="text-xs text-gray-600 mt-5 text-center">
                Purchasing crypto through these providers is subject to their own KYC / AML requirements.
                This platform does not collect or process any payment information.
            </p>
        </div>
    );
};

export default FiatOnRamp;
