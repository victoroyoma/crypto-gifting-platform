export const NETWORK_CONFIGS = {
  ethereum: {
    chainId: "0x1",
    name: "Ethereum Mainnet",
    rpcUrls: ["https://mainnet.infura.io/v3/YOUR_INFURA_KEY"],
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    blockExplorer: "https://etherscan.io"
  },
  bnb: {
    chainId: "0x38",
    name: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorer: "https://bscscan.com"
  },
  solana: {
    endpoint: "https://api.mainnet-beta.solana.com",
    blockExplorer: "https://explorer.solana.com"
  },
  okx: {
    chainId: "0x42",
    name: "OKX Chain",
    rpcUrls: ["https://exchainrpc.okex.org"],
    nativeCurrency: { name: "OKT", symbol: "OKT", decimals: 18 },
    blockExplorer: "https://www.oklink.com/okc"
  }
};
