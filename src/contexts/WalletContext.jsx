import React, { createContext, useState, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { MemoryBlockstore } from "blockstore-core";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { NETWORK_CONFIGS } from "../config/networks";
import { ERC20_ABI } from "../constants";
import { isMobileDevice } from "../utils/mobile";

const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [chain, setChain] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMobile = isMobileDevice();

  const supportedTokens = {
    ethereum: [
      { symbol: "ETH", name: "Ethereum", address: "native", decimals: 18 },
      { symbol: "USDT", name: "Tether", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
      { symbol: "USDC", name: "USD Coin", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
      { symbol: "DAI", name: "Dai", address: "0x6b175474e89094c44da98b954eedeac495271d0f", decimals: 18 },
      { symbol: "LINK", name: "Chainlink", address: "0x514910771af9ca656af840dff83e8264ecf986ca", decimals: 18 },
    ],
    polygon: [
      { symbol: "MATIC", name: "Polygon", address: "native", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
      { symbol: "USDT", name: "Tether", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
      { symbol: "DAI", name: "Dai", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
      { symbol: "WETH", name: "Wrapped ETH", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
    ],
    base: [
      { symbol: "ETH", name: "Ethereum", address: "native", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
      { symbol: "DAI", name: "Dai", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
    ],
    arbitrum: [
      { symbol: "ETH", name: "Ethereum", address: "native", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      { symbol: "USDT", name: "Tether", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
      { symbol: "ARB", name: "Arbitrum", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
    ],
    optimism: [
      { symbol: "ETH", name: "Ethereum", address: "native", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
      { symbol: "USDT", name: "Tether", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
      { symbol: "OP", name: "Optimism", address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    ],
    solana: [
      { symbol: "SOL", name: "Solana", address: "native", decimals: 9 },
      { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
    ],
    bnb: [
      { symbol: "BNB", name: "BNB", address: "native", decimals: 18 },
      { symbol: "USDT", name: "Tether", address: "0x55d398326f99059ff775485246999027b3197955", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18 },
      { symbol: "BUSD", name: "BUSD", address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", decimals: 18 },
    ],
    okx: [
      { symbol: "OKT", name: "OKT", address: "native", decimals: 18 },
      { symbol: "USDT", name: "Tether", address: "0x382bb369d343125bfb2117af9c149795c6c65c50", decimals: 18 },
    ],
  };

  let heliaInstance = null;
  let fsInstance = null;

  const initializeHelia = async () => {
    if (!heliaInstance) {
      const blockstore = new MemoryBlockstore();
      heliaInstance = await createHelia({ blockstore });
      fsInstance = unixfs(heliaInstance);
    }
  };

  const storeDataOnIPFS = async (data) => {
    await initializeHelia();
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const cid = await fsInstance.addBytes(bytes);
    return cid.toString();
  };

  const retrieveDataFromIPFS = async (cid) => {
    await initializeHelia();
    const decoder = new TextDecoder();
    let result = "";
    for await (const chunk of fsInstance.cat(cid)) {
      result += decoder.decode(chunk, { stream: true });
    }
    return JSON.parse(result);
  };

  const fetchBalance = useCallback(async (addr, currentChain, currentProvider) => {
    if (!addr || !currentChain || !currentProvider) return;
    try {
      if (currentChain === "solana") {
        const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
        const lamports = await connection.getBalance(new PublicKey(addr));
        setBalance(`${(lamports / 1e9).toFixed(4)} SOL`);
      } else {
        const bal = await currentProvider.getBalance(addr);
        const nativeToken = supportedTokens[currentChain]?.find((t) => t.address === "native");
        const symbol = nativeToken?.symbol || "ETH";
        setBalance(`${parseFloat(ethers.formatEther(bal)).toFixed(4)} ${symbol}`);
      }
    } catch {
      setBalance(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchNetwork = async (targetChain) => {
    if (targetChain === "solana") return;
    const config = NETWORK_CONFIGS[targetChain];
    if (!config || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: config.chainId }],
      });
      setChain(targetChain);
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(updatedProvider);
      await fetchBalance(address, targetChain, updatedProvider);
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: config.chainId,
              chainName: config.name,
              rpcUrls: config.rpcUrls,
              nativeCurrency: config.nativeCurrency,
              blockExplorerUrls: [config.blockExplorer],
            },
          ],
        });
        setChain(targetChain);
        const updatedProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(updatedProvider);
        await fetchBalance(address, targetChain, updatedProvider);
      } else {
        throw switchError;
      }
    }
  };

  const connectOKXWallet = async () => {
    try {
      if (!window.okxwallet) {
        if (isMobile) {
          window.location.href = "https://www.okx.com/web3/dapp/";
          return;
        }
        throw new Error("OKX Wallet not installed. Get it at okx.com/web3");
      }
      setLoading(true);
      setError(null);
      const accounts = await window.okxwallet.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("No accounts found");
      const okxProvider = new ethers.BrowserProvider(window.okxwallet);
      setAddress(accounts[0]);
      setProvider(okxProvider);
      setIsConnected(true);
      setChain("okx");
      await fetchBalance(accounts[0], "okx", okxProvider);
      window.okxwallet.on("accountsChanged", (accs) => {
        if (accs.length > 0) setAddress(accs[0]);
        else disconnectWallet();
      });
    } catch (err) {
      setError(err.message || "Failed to connect OKX Wallet");
    } finally {
      setLoading(false);
    }
  };

  const connectPhantom = async () => {
    setLoading(true);
    setError(null);
    try {
      const phantom = window.phantom?.solana || window.solana;
      if (!phantom?.isPhantom) {
        if (isMobile) {
          window.location.href = "https://phantom.app/ul/browse/";
          return;
        }
        throw new Error("Phantom wallet not found. Install it at phantom.app");
      }
      await phantom.connect();
      const publicKey = phantom.publicKey;
      if (!publicKey) throw new Error("Failed to get public key from Phantom");
      setAddress(publicKey.toString());
      setIsConnected(true);
      setChain("solana");
      setProvider(phantom);
      await fetchBalance(publicKey.toString(), "solana", phantom);
      phantom.on("disconnect", disconnectWallet);
    } catch (err) {
      setError(err.message || "Failed to connect Phantom");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const connectMetaMask = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isMobile && !window.ethereum?.isMetaMask) {
        window.location.href =
          "https://metamask.app.link/dapp/https://crypto-gifting-platform.vercel.app/";
        return;
      }
      if (!window.ethereum?.isMetaMask) {
        throw new Error("MetaMask not found. Install it at metamask.io");
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts?.length) throw new Error("No accounts found");
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await ethProvider.getNetwork();
      const chainId = Number(network.chainId);
      let detectedChain = "ethereum";
      if (chainId === 137) detectedChain = "polygon";
      else if (chainId === 8453) detectedChain = "base";
      else if (chainId === 42161) detectedChain = "arbitrum";
      else if (chainId === 10) detectedChain = "optimism";
      else if (chainId === 56) detectedChain = "bnb";
      else if (chainId === 66) detectedChain = "okx";
      setAddress(accounts[0]);
      setChain(detectedChain);
      setProvider(ethProvider);
      setIsConnected(true);
      await fetchBalance(accounts[0], detectedChain, ethProvider);
      window.ethereum.on("chainChanged", () => window.location.reload());
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs.length > 0) setAddress(accs[0]);
        else disconnectWallet();
      });
    } catch (err) {
      setError(err.message || "Failed to connect MetaMask");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const sendToken = async (toAddress, amount, token) => {
    if (!isConnected) throw new Error("Wallet not connected");
    const signer = await provider.getSigner();
    let tx;
    if (token.address === "native") {
      tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount.toString()),
      });
    } else {
      const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
      tx = await contract.transfer(
        toAddress,
        ethers.parseUnits(amount.toString(), token.decimals)
      );
    }
    await tx.wait();
    await fetchBalance(address, chain, provider);
    return tx.hash;
  };

  const receiveTokens = async () => {
    if (!isConnected) throw new Error("Wallet not connected");
    if (chain === "solana") {
      const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
      const lamports = await connection.getBalance(new PublicKey(address));
      return (lamports / 1e9).toString();
    }
    const bal = await provider.getBalance(address);
    return ethers.formatEther(bal);
  };

  const sendDonation = async (
    charityAddress,
    amount,
    targetChain,
    token,
    meta = {}
  ) => {
    if (!isConnected) throw new Error("Wallet not connected");
    const {
      ngoId = null,
      ngoName = null,
      isAnonymous = false,
      donorName = null,
    } = meta;

    const buildRecord = (txHash) => ({
      charity: charityAddress,
      ngoId,
      ngoName,
      amount,
      chain: targetChain,
      token: token.symbol,
      txHash,
      timestamp: Date.now(),
      isAnonymous,
      donorName: isAnonymous ? null : (donorName || null),
    });

    if (targetChain === "solana") {
      if (!provider?.publicKey) throw new Error("Phantom wallet not connected");
      const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: new PublicKey(charityAddress),
          lamports: Math.floor(parseFloat(amount) * 1e9),
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = provider.publicKey;
      const signature = await provider.signAndSendTransaction(transaction);
      const txHash = typeof signature === "object" ? signature.signature : signature;
      const solRecord = buildRecord(txHash);
      setDonationHistory((prev) => [...prev, solRecord]);
      try {
        const stored = JSON.parse(localStorage.getItem("cgp_donation_history") || "[]");
        localStorage.setItem("cgp_donation_history", JSON.stringify([solRecord, ...stored].slice(0, 500)));
      } catch { /* ignore storage errors */ }
      await fetchBalance(address, chain, provider);
      return txHash;
    } else {
      const signer = await provider.getSigner();
      let tx;
      if (token.address === "native") {
        tx = await signer.sendTransaction({
          to: charityAddress,
          value: ethers.parseEther(amount.toString()),
        });
      } else {
        const contract = new ethers.Contract(token.address, ERC20_ABI, signer);
        tx = await contract.transfer(
          charityAddress,
          ethers.parseUnits(amount.toString(), token.decimals)
        );
      }
      await tx.wait();
      const evmRecord = buildRecord(tx.hash);
      setDonationHistory((prev) => [...prev, evmRecord]);
      try {
        const stored = JSON.parse(localStorage.getItem("cgp_donation_history") || "[]");
        localStorage.setItem("cgp_donation_history", JSON.stringify([evmRecord, ...stored].slice(0, 500)));
      } catch { /* ignore storage errors */ }
      await fetchBalance(address, chain, provider);
      return tx.hash;
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setIsConnected(false);
    setChain(null);
    setProvider(null);
    setBalance(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      address,
      chain,
      isConnected,
      isMobile,
      balance,
      connectMetaMask,
      connectPhantom,
      connectOKXWallet,
      disconnectWallet,
      sendDonation,
      sendToken,
      receiveTokens,
      supportedTokens,
      switchNetwork,
      loading,
      error,
      donationHistory,
      storeDataOnIPFS,
      retrieveDataFromIPFS,
      fetchBalance,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, chain, isConnected, loading, error, donationHistory, balance]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export { WalletContext, WalletProvider };
