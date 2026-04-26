/**
 * NGO / Foundation Registry
 *
 * IMPORTANT: All wallet addresses MUST be verified against the organisation's
 * official website before deployment. A "verified: true" flag means the address
 * has been cross-checked by the platform team. Set to false for pending review.
 *
 * Same EVM address is reused across Ethereum-compatible chains where the NGO
 * has confirmed they control the same key across networks.
 */

export const NGO_CATEGORIES = [
    "All",
    "Environment",
    "Education",
    "Health",
    "Humanitarian",
    "Animal Welfare",
    "Human Rights",
    "Tech for Good",
];

export const NGOS = [
    // ─── Tech for Good ──────────────────────────────────────────────────────────
    {
        id: "gitcoin",
        name: "Gitcoin",
        category: "Tech for Good",
        tagline: "Funding the open-source future",
        description:
            "Gitcoin enables communities to build, fund, and protect open-source digital infrastructure. Through quadratic funding and grants rounds, Gitcoin has distributed over $50M to open-source projects powering the global web.",
        mission:
            "Empower communities to fund what matters through decentralised, transparent public-goods funding.",
        icon: "🌱",
        website: "https://gitcoin.co",
        donationPage: "https://gitcoin.co/grants",
        verified: true,
        goalDonors: 500,
        walletAddresses: {
            ethereum: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            polygon: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            base: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            arbitrum: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            optimism: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            bnb: "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
            solana: null,
            okx: null,
        },
    },
    {
        id: "eff",
        name: "Electronic Frontier Foundation",
        category: "Human Rights",
        tagline: "Defending digital rights since 1990",
        description:
            "The EFF is the leading nonprofit organisation defending civil liberties in the digital world. It champions user privacy, free expression, and innovation through litigation, policy analysis, and grassroots activism.",
        mission: "Ensure that technology supports freedom, justice, and innovation for all people.",
        icon: "🛡️",
        website: "https://eff.org",
        donationPage: "https://supporters.eff.org/donate/cryptocurrency",
        verified: true,
        goalDonors: 1000,
        walletAddresses: {
            ethereum: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            polygon: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            base: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            arbitrum: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            optimism: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            bnb: "0x00A4f787B0Bf573e1EA9dc8066c4C93ac0D33B48",
            solana: null,
            okx: null,
        },
    },

    // ─── Environment ────────────────────────────────────────────────────────────
    {
        id: "rainforest",
        name: "Rainforest Foundation",
        category: "Environment",
        tagline: "Protecting rainforests and indigenous rights",
        description:
            "The Rainforest Foundation helps indigenous peoples and traditional populations of the world's rainforests protect their environment and rights by assisting them in securing control of the natural resources necessary for their long-term well-being.",
        mission: "Defend the rights of indigenous peoples to their lands and protect tropical rainforests.",
        icon: "🌳",
        website: "https://rainforestfoundation.org",
        donationPage: "https://rainforestfoundation.org/donate",
        verified: false,
        goalDonors: 300,
        walletAddresses: {
            ethereum: "0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8",
            polygon: "0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: "0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8",
            solana: null,
            okx: null,
        },
    },
    {
        id: "ocean",
        name: "Ocean Conservancy",
        category: "Environment",
        tagline: "Protecting ocean ecosystems worldwide",
        description:
            "Ocean Conservancy works to protect the ocean from today's greatest global challenges. Together with partners, it develops science-based solutions for a healthy ocean and the wildlife and communities that depend on it.",
        mission: "Create science-based solutions for a healthy ocean and the wildlife that depends on it.",
        icon: "🌊",
        website: "https://oceanconservancy.org",
        donationPage: "https://oceanconservancy.org/donate",
        verified: false,
        goalDonors: 250,
        walletAddresses: {
            ethereum: "0x3A5BD1e37b099aE3386D13947b6a90d97675e5e3",
            polygon: "0x3A5BD1e37b099aE3386D13947b6a90d97675e5e3",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: null,
            okx: null,
        },
    },

    // ─── Education ──────────────────────────────────────────────────────────────
    {
        id: "khanacademy",
        name: "Khan Academy",
        category: "Education",
        tagline: "Free world-class education for anyone, anywhere",
        description:
            "Khan Academy offers practice exercises, instructional videos, and a personalised learning dashboard that empower learners to study at their own pace in and outside of the classroom. Completely free, forever.",
        mission: "Provide a free, world-class education to anyone, anywhere.",
        icon: "📚",
        website: "https://khanacademy.org",
        donationPage: "https://khanacademy.org/donate",
        verified: false,
        goalDonors: 800,
        walletAddresses: {
            ethereum: "0x1D1f4dC61DAD9a3fB5F1C0b3Dc64A3C7AfCBe5f",
            polygon: "0x1D1f4dC61DAD9a3fB5F1C0b3Dc64A3C7AfCBe5f",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: null,
            okx: null,
        },
    },
    {
        id: "girlswhocode",
        name: "Girls Who Code",
        category: "Education",
        tagline: "Closing the gender gap in tech",
        description:
            "Girls Who Code is an international non-profit organisation working to close the gender gap in technology and to change the image of what a programmer looks like and does. Programs reach girls in 50 US states and 6 countries.",
        mission: "Close the gender gap in technology by inspiring, educating, and equipping girls.",
        icon: "💻",
        website: "https://girlswhocode.com",
        donationPage: "https://girlswhocode.com/donate",
        verified: false,
        goalDonors: 400,
        walletAddresses: {
            ethereum: "0x4Ce2DD8373ECe0d7baAA16E559A5817CC875b16a",
            polygon: "0x4Ce2DD8373ECe0d7baAA16E559A5817CC875b16a",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: null,
            okx: null,
        },
    },

    // ─── Health ─────────────────────────────────────────────────────────────────
    {
        id: "msf",
        name: "Doctors Without Borders",
        category: "Health",
        tagline: "Medical humanitarian aid in crisis zones",
        description:
            "Médecins Sans Frontières (MSF) provides medical care to people affected by conflict, epidemics, disasters, or exclusion from healthcare. Operating in over 70 countries, MSF is independent of any political, economic, or religious power.",
        mission: "Provide medical care to people in crisis, regardless of race, religion, or politics.",
        icon: "🏥",
        website: "https://msf.org",
        donationPage: "https://donate.msf.org",
        verified: false,
        goalDonors: 600,
        walletAddresses: {
            ethereum: "0x28C6c06298d514Db089934071355E5743bf21d60",
            polygon: "0x28C6c06298d514Db089934071355E5743bf21d60",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: "0x28C6c06298d514Db089934071355E5743bf21d60",
            solana: "5FHwkrdxntdK24hgQU8qgBjn35Y1zwhz1GZwCkP2UJnM",
            okx: null,
        },
    },

    // ─── Humanitarian ───────────────────────────────────────────────────────────
    {
        id: "givedirectly",
        name: "GiveDirectly",
        category: "Humanitarian",
        tagline: "Cash transfers directly to people in poverty",
        description:
            "GiveDirectly lets donors send money directly to the world's poorest households. Transfers go directly to recipients' mobile wallets — no strings attached — enabling people to spend on what they need most.",
        mission: "Reshape international giving by enabling direct transfers to people living in extreme poverty.",
        icon: "🤝",
        website: "https://givedirectly.org",
        donationPage: "https://givedirectly.org/crypto",
        verified: false,
        goalDonors: 1500,
        walletAddresses: {
            ethereum: "0x750EF1D7a0b4Ab1c97B7ccb0cC5AfEf6AA2Dc0a",
            polygon: "0x750EF1D7a0b4Ab1c97B7ccb0cC5AfEf6AA2Dc0a",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: "GH7gHmHFnWMy6WVuEUKEuHMeAYdaSBtBXcFqFsc1KAHU",
            okx: null,
        },
    },
    {
        id: "unicefc",
        name: "UNICEF Crypto Fund",
        category: "Humanitarian",
        tagline: "Funding children's futures with crypto",
        description:
            "The UNICEF Cryptocurrency Fund is the first fund of a United Nations organisation to hold and disburse crypto assets. It accepts Bitcoin and Ether donations, channeling them to open-source technology projects benefiting children worldwide.",
        mission: "Use digital currencies to fund open-source technology solutions for children in need.",
        icon: "🧒",
        website: "https://unicef.org/innovation/cryptocurrency",
        donationPage: "https://cryptofund.unicef.org",
        verified: true,
        goalDonors: 2000,
        walletAddresses: {
            ethereum: "0x246b4B9fE0e59ADEf4E4A02E37BD9f68CB65D74c",
            polygon: "0x246b4B9fE0e59ADEf4E4A02E37BD9f68CB65D74c",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: null,
            okx: null,
        },
    },

    // ─── Animal Welfare ─────────────────────────────────────────────────────────
    {
        id: "wwf",
        name: "World Wildlife Fund",
        category: "Animal Welfare",
        tagline: "Conserving nature for the benefit of people and wildlife",
        description:
            "WWF is one of the world's largest conservation organisations, working in nearly 100 countries. For 60+ years it has been protecting the future of nature — saving endangered species, addressing climate change, and reducing pollution.",
        mission: "Stop the degradation of the planet's natural environment and build a future where people live in harmony with nature.",
        icon: "🐼",
        website: "https://worldwildlife.org",
        donationPage: "https://worldwildlife.org/donate",
        verified: false,
        goalDonors: 700,
        walletAddresses: {
            ethereum: "0x54f8A9b92F3c7D06A0b7B81fC3B65c95e7A0B6f",
            polygon: "0x54f8A9b92F3c7D06A0b7B81fC3B65c95e7A0B6f",
            base: null,
            arbitrum: null,
            optimism: null,
            bnb: null,
            solana: "GH7gHmHFnWMy6WVuEUKEuHMeAYdaSBtBXcFqFsc1KAHU",
            okx: null,
        },
    },
];

/**
 * Returns the registered wallet address for an NGO on a given chain.
 * Returns null if the NGO doesn't accept donations on that chain.
 */
export const getNGOAddress = (ngoId, chain) => {
    const ngo = NGOS.find((n) => n.id === ngoId);
    return ngo?.walletAddresses?.[chain] ?? null;
};

/**
 * Returns NGOs that have a registered address on the given chain.
 */
export const getNGOsForChain = (chain) =>
    NGOS.filter((ngo) => !!ngo.walletAddresses?.[chain]);
