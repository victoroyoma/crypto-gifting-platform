export const APP_NAME = "Crypto Gifting Platform";
export const APP_URL = "https://crypto-gifting-platform.vercel.app";
export const SUPPORTED_CHAINS = ["ethereum", "polygon", "base", "arbitrum", "optimism", "solana", "bnb", "okx"];
export const DEFAULT_CHAIN = "ethereum";
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

export const ERC20_ABI = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function allowance(address owner, address spender) view returns (uint256)",
];

export const CHAIN_EXPLORER_TX = {
    ethereum: (hash) => `https://etherscan.io/tx/${hash}`,
    polygon: (hash) => `https://polygonscan.com/tx/${hash}`,
    base: (hash) => `https://basescan.org/tx/${hash}`,
    arbitrum: (hash) => `https://arbiscan.io/tx/${hash}`,
    optimism: (hash) => `https://optimistic.etherscan.io/tx/${hash}`,
    bnb: (hash) => `https://bscscan.com/tx/${hash}`,
    okx: (hash) => `https://www.oklink.com/okc/tx/${hash}`,
    solana: (hash) => `https://explorer.solana.com/tx/${hash}`,
};
