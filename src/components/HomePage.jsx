import React from "react";
import { Link } from "react-router-dom";
import { NETWORK_CONFIGS } from "../config/networks";
import { useNGOs } from "../contexts/NGOContext";

const FEATURES = [
    {
        icon: "🌍",
        title: "Discover Verified NGOs",
        description:
            "Browse a curated registry of trusted NGOs and Foundations across Environment, Education, Health, and more. No middlemen, no conversion fees.",
    },
    {
        icon: "🎭",
        title: "Anonymous or Public Giving",
        description:
            "Donate anonymously to protect your privacy, or go public to inspire others and appear on our Donor Wall.",
    },
    {
        icon: "🔐",
        title: "Non-Custodial & Trustless",
        description:
            "Your keys, your crypto. Funds go directly to the NGO's on-chain address — this platform never holds your tokens.",
    },
    {
        icon: "⛓️",
        title: "Multi-Chain Support",
        description:
            "Donate across Ethereum, Polygon, Base, Arbitrum, Optimism, BNB Chain, Solana, and OKX Chain without converting to fiat.",
    },
    {
        icon: "📦",
        title: "Transparent Records",
        description:
            "Every donation is recorded on-chain and optionally pinned to IPFS, creating an immutable, publicly verifiable fundraising history.",
    },
    {
        icon: "🏆",
        title: "Donor Wall",
        description:
            "See who's giving and celebrate community generosity. Top donors are recognised with social sharing built in.",
    },
];

const CHAINS = Object.entries(NETWORK_CONFIGS).map(([key, cfg]) => ({
    key,
    name: cfg.name || key.charAt(0).toUpperCase() + key.slice(1),
    icon: cfg.icon,
    color: cfg.color,
}));

const HomePage = () => {
    const { ngos } = useNGOs();
    return (
        <div className="w-full text-white">
            {/* Hero */}
            <section className="text-center py-16 px-4">
                <div className="inline-block text-6xl mb-6">🌐</div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                    The Fundraiser for{" "}
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        the Next Generation
                    </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                    Gift crypto directly to NGOs and Foundations — no bank accounts, no
                    currency conversion, no intermediaries. Donate anonymously or be
                    celebrated on our global Donor Wall.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/charity"
                        className="px-8 py-3 bg-primary hover:bg-primary/80 rounded-xl font-semibold text-white transition-all duration-300 shadow-custom-lg"
                    >
                        Browse NGOs
                    </Link>
                    <Link
                        to="/send-receive"
                        className="px-8 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-semibold text-white transition-all duration-300 shadow-custom-lg"
                    >
                        Send &amp; Receive Tokens
                    </Link>
                </div>
            </section>

            {/* Supported chains */}
            <section className="py-10 px-4">
                <h2 className="text-center text-2xl font-bold mb-6 text-gray-200">
                    Supported Networks
                </h2>
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                    {CHAINS.map((c) => (
                        <div
                            key={c.key}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-600/40 bg-navy-lighter text-sm font-medium"
                            style={{ borderColor: c.color + "55" }}
                        >
                            <span>{c.icon}</span>
                            <span>{c.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="py-12 px-4">
                <h2 className="text-center text-2xl font-bold mb-10 text-gray-200">
                    Why Crypto Fundraising?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="bg-navy-lighter rounded-2xl p-6 shadow-custom-lg border border-gray-700/30 hover:border-primary/40 transition-all duration-300"
                        >
                            <div className="text-3xl mb-3">{f.icon}</div>
                            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="py-12 px-4 max-w-4xl mx-auto">
                <h2 className="text-center text-2xl font-bold mb-10 text-gray-200">
                    How It Works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                    {[
                        { step: "01", title: "Connect Wallet", desc: "Connect MetaMask, Phantom, or OKX Wallet in one click — no sign-up required." },
                        { step: "02", title: "Find an NGO", desc: "Browse verified NGOs by category, view their mission, and see real-time fundraising progress." },
                        { step: "03", title: "Donate & Impact", desc: "Send crypto directly to the NGO. Go public on the Donor Wall or donate anonymously." },
                    ].map((item) => (
                        <div key={item.step} className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-extrabold text-lg">
                                {item.step}
                            </div>
                            <h4 className="font-semibold text-lg">{item.title}</h4>
                            <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="py-14 px-4 text-center">
                <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-10 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-extrabold mb-3">Ready to make an impact?</h2>
                    <p className="text-gray-300 mb-6">
                        Browse {ngos.length}+ verified NGOs and make your first crypto donation in under 60 seconds.
                    </p>
                    <Link
                        to="/charity"
                        className="px-10 py-3 bg-primary hover:bg-primary/80 rounded-xl font-semibold text-white transition-all duration-300 shadow-custom-lg inline-block"
                    >
                        Browse NGOs
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
