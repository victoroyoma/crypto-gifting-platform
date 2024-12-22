import React, { createContext, useState, useMemo } from "react";
import { ethers } from "ethers";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from "@solana/web3.js";

const WalletContext = createContext();

const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [chain, setChain] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [donationHistory, setDonationHistory] = useState([
    {
        charity: "Save the Children",
        amount: "0.5",
        chain: "ethereum",
        token: "ETH",
        txHash: "demo1",
      },
      {
        charity: "Global Fund",
        amount: "1.2",
        chain: "okx",
        token: "OKB",
        txHash: "demo2",
      },
  ]);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null);   
   
  const supportedTokens = {
    ethereum: [
        { symbol: "ETH", name: "Ethereum", address: "native" },
        { symbol: "USDT", name: "Tether", address: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
        { symbol: "USDC", name: "USD Coin", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
        { symbol: "DAI", name: "Dai Stablecoin", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
        { symbol: "LINK", name: "ChainLink", address: "0x514910771af9ca656af840dff83e8264ecf986ca" },
      ],
    solana: [
      { symbol: "SOL", name: "Solana", address: "native" },
      { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    ],
    bnb: [
      { symbol: "BNB", name: "Binance Coin", address: "native" },
      { symbol: "THC", name: "Transhuman Coin", address: "0x24802247bd157d771b7effa205237d8e9269ba8a" },
    ],
    okx: [
        { symbol: "BTC", name: "Bitcoin", address: "native" },
        { symbol: "OKB", name: "OKB Token", address: "0xdd1d5b4c18360e0b524a987dbfcf60e8e299b6e6" },
        { symbol: "SOL", name: "Solana", address: "native" },
        { symbol: "MATIC", name: "Polygon", address: "0x0000000000000000000000000000000000001010" },
        { symbol: "FIL", name: "Filecoin", address: "native" },
        { symbol: "INJ", name: "Injective", address: "0xe28b3b32b6c345a34ff64674606124dd5aceca30" },
        { symbol: "THETA", name: "Theta Network", address: "0x3883f5e181fccaf8410fa61e12b59bad963fb645" },
        { symbol: "AAVE", name: "Aave", address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9" },
        { symbol: "UNI", name: "Uniswap", address: "0x1f9840a85d5aF5bf1d1762f925bdADdc4201F984" },
        { symbol: "LUNA", name: "Terra", address: "0x0000000000000000000000000000000000000000" }, // Replace with actual address
      ],
  };
// Switch network
  const switchNetwork = async (targetChain) => {
    if (!window.ethereum) {
      alert("MetaMask is required to switch networks.");
      return;
    }

    const chainConfigs = {
      ethereum: { chainId: "0x1", name: "Ethereum Mainnet" },
      bnb: { chainId: "0x38", name: "BNB Smart Chain" },
    };
// Add OKX chain
    const networkConfig = chainConfigs[targetChain];
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: networkConfig.chainId,
            chainName: networkConfig.name,
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            nativeCurrency: {
              name: "Binance Coin",
              symbol: "BNB",
              decimals: 18,
            },
            blockExplorerUrls: ["https://bscscan.com/"],
          },
        ],
      });
      setChain(targetChain);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };
  //
  const connectOKXWallet = async () => {
    try {
      if (typeof window.okxwallet === "undefined") {
        alert("OKX Wallet is not installed. Please install it to continue.");
        return;
      }

      setLoading(true);
      setError(null);

      // Request account access
      const accounts = await window.okxwallet.request({ 
        method: "eth_requestAccounts" 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Create Web3 provider
      const okxProvider = new ethers.BrowserProvider(window.okxwallet);
      
      setAddress(accounts[0]);
      setProvider(okxProvider);
      setIsConnected(true);
      setChain("okx");

      // Add account change listener
      window.okxwallet.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

    } catch (error) {
      console.error("OKX Wallet connection error:", error);
      setError("Error connecting to OKX Wallet: " + error.message);
    } finally {
      setLoading(false);
    }
  };
// Connect Phantom wallet
  const connectPhantom = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for mobile Phantom wallet
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const phantom = isMobile ? window.phantom?.solana : window.solana;
      
      if (!phantom) {
        if (isMobile) {
          window.location.href = 'https://phantom.app/ul/browse/';
          return;
        }
        throw new Error("Phantom wallet not found. Please install it from phantom.app");
      }

      if (!phantom.isPhantom) {
        throw new Error("Please use Phantom wallet");
      }

      await phantom.connect();
      const publicKey = phantom.publicKey || phantom.account;
      
      if (!publicKey) {
        throw new Error("Failed to connect to Phantom wallet");
      }

      setAddress(publicKey.toString());
      setIsConnected(true);
      setChain("solana");
      setProvider(phantom);

      // Add disconnect listener
      phantom.on('disconnect', () => {
        disconnectWallet();
      });

    } catch (err) {
      console.error("Phantom connection error:", err);
      setError(err.message || "Failed to connect Phantom wallet");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };
  // Connect MetaMask wallet

  const connectMetaMask = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check for mobile MetaMask
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile && !window.ethereum?.isMetaMask) {
        window.location.href = 'https://metamask.app.link/dapp/https://crypto-gifting-platform.vercel.app/';
        return;
      }

      if (!window.ethereum?.isMetaMask) {
        throw new Error("MetaMask not found. Please install MetaMask");
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Create provider and get network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      // Set chain based on chainId
      const chainId = Number(network.chainId);
      let detectedChain = "ethereum";
      if (chainId === 56) detectedChain = "bnb";
      
      setAddress(accounts[0]);
      setChain(detectedChain);
      setProvider(provider);
      setIsConnected(true);

      // Add network change listener
      window.ethereum.on("chainChanged", (chainId) => {
        window.location.reload();
      });

      // Add account change listener
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

    } catch (err) {
      console.error("MetaMask connection error:", err);
      setError(err.message || "Failed to connect MetaMask");
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Clear demo data from donation history

  const clearDemoData = () => {
    setDonationHistory((prev) => prev.filter((entry) => !entry.txHash.startsWith("demo")));
  };
//
  const sendDonation = async (charityAddress, amount, targetChain, token) => {
    if (!isConnected) throw new Error("Wallet not connected");
    clearDemoData();
    
    try {
      if (targetChain === "solana") {
        if (!provider || !provider.publicKey) throw new Error("Phantom wallet not connected");
        
        const connection = new Connection(clusterApiUrl("mainnet-beta"));
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: new PublicKey(charityAddress),
            lamports: Math.floor(amount * 1e9),
          })
        );

        const signature = await provider.signAndSendTransaction(transaction);
        setDonationHistory(prev => [...prev, {
          charity: charityAddress,
          amount,
          chain: targetChain,
          token: token.symbol,
          txHash: signature
        }]);
        return signature;
      } else {
        // For Ethereum/BSC/OKX
        if (!provider) throw new Error(`${targetChain.toUpperCase()} wallet not connected`);
        
        const signer = await provider.getSigner();
        if (token.address === "native") {
          const tx = await signer.sendTransaction({
            to: charityAddress,
            value: ethers.parseEther(amount.toString())
          });
          setDonationHistory(prev => [...prev, {
            charity: charityAddress,
            amount,
            chain: targetChain,
            token: token.symbol,
            txHash: tx.hash
          }]);
          return tx.hash;
        } else {
          const erc20Contract = new ethers.Contract(
            token.address,
            ["function transfer(address to, uint256 amount) public returns (bool)"],
            signer
          );
          const tx = await erc20Contract.transfer(
            charityAddress, 
            ethers.parseUnits(amount.toString(), 18)  // Use parseUnits directly
          );
          setDonationHistory((prev) => [
            ...prev,
            { charity: charityAddress, amount, chain: targetChain, token: token.symbol, txHash: tx.hash },
          ]);
          return tx.hash;
        }
      }
    } catch (error) {
      console.error("Donation failed:", error);
      throw new Error(error.message || "Transaction failed");
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setIsConnected(false);
    setChain(null);
    setProvider(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      address,
      chain,
      isConnected,
      connectMetaMask,
      connectPhantom,
      connectOKXWallet,
      disconnectWallet,
      sendDonation,  
      supportedTokens,
      loading,
      error,
      donationHistory,
    }),
    [address, chain, isConnected, loading, error, donationHistory]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export { WalletContext, WalletProvider };
