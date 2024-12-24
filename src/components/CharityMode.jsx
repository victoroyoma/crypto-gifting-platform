import React, { useContext, useState, useEffect } from "react";
import { WalletContext } from "../contexts/WalletContext";
import AnimationComponent from "./AnimationComponent";
import DonationHistory from "./DonationHistory";
import Leaderboard from "./Leaderboard";

const CharityMode = () => {
    const {
        isConnected,
        chain,
        address,
        supportedTokens,
        switchNetwork,
        connectMetaMask,
        connectPhantom,
        connectOKXWallet,
        sendDonation, 
        loading,
        error,
        disconnectWallet,
        isMobile,
    } = useContext(WalletContext);

    const [selectedToken, setSelectedToken] = useState(null);
    const [amount, setAmount] = useState("");
    const [selectedCharity, setSelectedCharity] = useState("");
    const [showAnimation, setShowAnimation] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [transactionInProgress, setTransactionInProgress] = useState(false);

    // Reset form when chain changes
    useEffect(() => {
        setSelectedToken(null);
        setSelectedCharity("");
    }, [chain]);

    const charities = {
        ethereum: [{ name: "Save the Children", address: "0x1234567890abcdef1234567890abcdef12345678" }],
        solana: [{ name: "World Wildlife Fund", address: "4MvnukK5BhVQdqG3C2s3XUkdAf6ZaLfL6mA5NL6J" }],
        bnb: [{ name: "Humanity Relief", address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" }],
        okx: [{ name: "OKX Charity", address: "0x9876543210fedcba9876543210fedcba98765432" }],
    };

    const handleNetworkSwitch = async (newChain) => {
        if (!newChain) return;
        try {
            if (chain === "solana" && newChain !== "solana") {
                // Disconnect Phantom when switching from Solana
                handleWalletDisconnect();
                return;
            }
            if (chain !== "solana" && newChain === "solana") {
                // Disconnect Web3 wallet when switching to Solana
                handleWalletDisconnect();
                return;
            }
            if (newChain === "okx" && chain !== "okx") {
                handleWalletDisconnect();
                return;
            }
            await switchNetwork(newChain);
        } catch (err) {
            console.error("Network switch failed:", err);
            alert("Failed to switch network. Please disconnect and use the appropriate wallet.");
        }
    };

    const handleWalletDisconnect = () => {
        disconnectWallet();
        setSelectedToken(null);
        setSelectedCharity("");
        setAmount("");
    };

    const checkConnection = () => {
        if (!isConnected) {
            alert(isMobile 
              ? "Please open this dApp in your wallet's browser to connect." 
              : "Please connect your wallet to continue.");
            return false;
        }
        return true;
    };

    const handleDonate = async () => {
        if (!checkConnection()) return;
        if (!selectedCharity || !selectedToken || !amount) {
            alert("Please select a charity, token, and amount.");
            return;
        }
        try {
            setTransactionInProgress(true);
            setShowAnimation(true);
            const txHash = await sendDonation(selectedCharity, amount, chain, selectedToken);
            alert(`Donation successful! Transaction: ${txHash}`);
            // Reset form after successful donation
            setAmount("");
            setSelectedCharity("");
            setSelectedToken(null);
        } catch (err) {
            console.error("Donation error:", err);
            alert(`Donation failed: ${err.message}`);
        } finally {
            setShowAnimation(false);
            setTransactionInProgress(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row gap-6 bg-[#0a1128] text-white max-w-[100vw] overflow-x-hidden p-6">
            {/* Wallet Section */}
            <div className="w-full md:w-1/3 bg-navy-lighter rounded-2xl shadow-custom-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Wallet Connection</h2>
                {!isConnected ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400 mb-2 font-semibold">
                            Please make sure you have opened this page in your wallet's browser for easy connection to your wallet.
                        </p>
                        <button
                            onClick={connectMetaMask}
                            className="w-full p-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                            disabled={loading}
                        >
                            <span>{loading ? "Connecting..." : "Connect MetaMask"}</span>
                        </button>
                        <button
                            onClick={connectPhantom}
                            className="w-full p-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                            disabled={loading}
                        >
                            <span>{loading ? "Connecting..." : "Connect Phantom"}</span>
                        </button>
                        <button
              onClick={connectOKXWallet}
              className="w-full p-3 bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                disabled={loading}
            >
                {loading ? "Connecting..." : "Connect OKX Wallet"}
            </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-[#2a3c6e] rounded-lg">
                            <p className="text-sm text-gray-300">Connected Address:</p>
                            <p className="text-xs break-all">{address}</p>
                            <p className="mt-2 text-sm text-gray-300">Network:</p>
                            <p>{chain?.toUpperCase()}</p>
                        </div>

                        <select
                            value={chain || ""}
                            onChange={(e) => handleNetworkSwitch(e.target.value)}
                            className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        >
                            <option value="">Switch Network</option>
                            <option value="ethereum">Ethereum</option>
                            <option value="solana">Solana</option>
                            <option value="bnb">BNB Chain</option>
                            <option value="okx">OKX Chain</option>
                        </select>

                        <button
                            onClick={handleWalletDisconnect}
                            className="w-full p-3 bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            Disconnect Wallet
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}
            </div>

            {/* Donation Section */}
            <div className="w-full md:w-2/3 bg-navy-lighter rounded-2xl shadow-custom-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-center">Make a Donation</h2>
                {!isConnected && isMobile && (
                    <div className="px-4 py-2 bg-yellow-500/20 text-yellow-500 text-sm rounded-lg mb-4">
                        Open this dApp in your wallet's browser for the best experience
                    </div>
                )}
                {isConnected ? (
                    <div className="space-y-4">
                        <select
                            value={selectedCharity}
                            onChange={(e) => setSelectedCharity(e.target.value)}
                            className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                            disabled={transactionInProgress}
                        >
                            <option value="">Select Charity</option>
                            {charities[chain]?.map((charity) => (
                                <option key={charity.address} value={charity.address}>
                                    {charity.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedToken?.symbol || ""}
                            onChange={(e) => setSelectedToken(
                                supportedTokens[chain]?.find(t => t.symbol === e.target.value)
                            )}
                            className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                            disabled={transactionInProgress}
                        >
                            <option value="">Select Token</option>
                            {supportedTokens[chain]?.map((token) => (
                                <option key={token.symbol} value={token.symbol}>
                                    {token.name} ({token.symbol})
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter Amount"
                            className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                            disabled={transactionInProgress}
                        />

                        <div className="flex items-center mb-4">
                            <input
                                type="checkbox"
                                id="privacyToggle"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="mr-2"
                                disabled={transactionInProgress}
                            />
                            <label htmlFor="privacyToggle" className="text-sm">Donate Anonymously</label>
                        </div>

                        <button
                            onClick={handleDonate}
                            className="w-full p-4 bg-green-600 hover:bg-green-500 rounded-xl shadow-custom transition-all duration-300 font-medium disabled:opacity-50 disabled:hover:bg-green-600"
                            disabled={transactionInProgress || !selectedCharity || !selectedToken || !amount}
                        >
                            {transactionInProgress ? "Processing..." : "Donate"}
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-gray-400">Please connect your wallet to make a donation.</p>
                )}
                
                <AnimationComponent isVisible={showAnimation} />

                {/* History and Leaderboard Section */}
                <div className="mt-8 max-w-full overflow-x-auto">
                    <DonationHistory />
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
};

export default CharityMode;
