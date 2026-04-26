import React, { useContext, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { WalletContext } from "../contexts/WalletContext";
import { useNGOs } from "../contexts/NGOContext";
import { NETWORK_CONFIGS } from "../config/networks";
import NGOCard from "./NGOCard";
import AnimationComponent from "./AnimationComponent";
import DonationHistory from "./DonationHistory";
import Leaderboard from "./Leaderboard";
import { useNFTReceipts } from "./features/DonationNFT";
import { MatchBanner } from "./features/CorporateMatching";
import { usePriceFeeds } from "../hooks/usePriceFeeds";

const CHAIN_LABELS = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  base: "Base",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  solana: "Solana",
  bnb: "BNB Chain",
  okx: "OKX Chain",
};

const CharityMode = () => {
  const {
    isConnected,
    chain,
    address,
    balance,
    supportedTokens,
    switchNetwork,
    connectMetaMask,
    connectPhantom,
    connectOKXWallet,
    sendDonation,
    donationHistory,
    loading,
    error,
    disconnectWallet,
    isMobile,
  } = useContext(WalletContext);

  const { ngos, categories } = useNGOs();
  const { mint: mintNFT } = useNFTReceipts();
  const { getUSDValue } = usePriceFeeds();

  // ─── Browse state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedNGO, setSelectedNGO] = useState(null);

  // ─── Donation form state ─────────────────────────────────────────────────
  const [selectedToken, setSelectedToken] = useState(null);
  const [amount, setAmount] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Reset form when NGO or chain changes
  const selectNGO = (ngo) => {
    setSelectedNGO(ngo);
    setSelectedToken(null);
    setAmount("");
  };

  // ─── Filtered NGO list ───────────────────────────────────────────────────
  const filteredNGOs = useMemo(() => {
    return ngos.filter((ngo) => {
      const matchesCategory =
        activeCategory === "All" || ngo.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, ngos]);

  // ─── Donation count per NGO ──────────────────────────────────────────────
  const donationCountByNGO = useMemo(() => {
    return (donationHistory || []).reduce((acc, d) => {
      if (d.ngoId) acc[d.ngoId] = (acc[d.ngoId] || 0) + 1;
      return acc;
    }, {});
  }, [donationHistory]);

  // ─── Network helpers ─────────────────────────────────────────────────────
  const handleNetworkSwitch = async (newChain) => {
    if (!newChain || newChain === chain) return;
    const fromSolana = chain === "solana";
    const toSolana = newChain === "solana";
    if (fromSolana || toSolana) {
      disconnectWallet();
      toast(`Reconnect with the right wallet for ${CHAIN_LABELS[newChain]}`);
      return;
    }
    try {
      await switchNetwork(newChain);
      toast.success("Switched to " + CHAIN_LABELS[newChain]);
    } catch {
      toast.error("Network switch failed — try manually in your wallet.");
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setSelectedToken(null);
    setAmount("");
    setSelectedNGO(null);
  };

  // ─── Donation submission ─────────────────────────────────────────────────
  const handleDonate = async () => {
    if (!isConnected) {
      toast.error(
        isMobile
          ? "Open this dApp inside your wallet's browser."
          : "Connect your wallet first."
      );
      return;
    }
    if (!selectedNGO) {
      toast.error("Select an NGO to donate to.");
      return;
    }
    if (!selectedToken || !amount || parseFloat(amount) <= 0) {
      toast.error("Choose a token and enter a valid amount.");
      return;
    }

    const charityAddress = selectedNGO.walletAddresses?.[chain];
    if (!charityAddress) {
      toast.error(`${selectedNGO.name} doesn't accept donations on ${CHAIN_LABELS[chain]}.`);
      return;
    }

    try {
      setTransactionInProgress(true);
      setShowAnimation(true);
      const loadingToast = toast.loading(
        `Sending ${amount} ${selectedToken.symbol} to ${selectedNGO.name}…`
      );

      const txHash = await sendDonation(
        charityAddress,
        amount,
        chain,
        selectedToken,
        {
          ngoId: selectedNGO.id,
          ngoName: selectedNGO.name,
          isAnonymous,
          donorName: isAnonymous ? null : donorName.trim() || null,
        }
      );

      toast.dismiss(loadingToast);

      const explorerUrl = NETWORK_CONFIGS[chain]?.blockExplorer
        ? `${NETWORK_CONFIGS[chain].blockExplorer}/tx/${txHash}`
        : null;

      toast.success(
        <span>
          {isAnonymous ? "Anonymous donation" : "Donation"} of {amount}{" "}
          {selectedToken.symbol} to{" "}
          <strong>{selectedNGO.name}</strong> sent!{" "}
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-300"
            >
              View tx ↗
            </a>
          )}
        </span>,
        { duration: 10000 }
      );

      setAmount("");
      setSelectedToken(null);

      // Mint soulbound NFT receipt
      try {
        await mintNFT({
          ngoId: selectedNGO.id,
          ngoName: selectedNGO.name,
          ngoIcon: selectedNGO.icon,
          ngoCategory: selectedNGO.category,
          amount,
          token: selectedToken.symbol,
          chain,
          txHash,
          donorAddress: address,
          isAnonymous,
          donorName: isAnonymous ? null : donorName.trim() || null,
        });
        toast.success("🏅 NFT receipt minted!", { duration: 4000 });
      } catch {
        // NFT minting failure is non-critical
      }
    } catch (err) {
      toast.error("Donation failed: " + (err.message || "Unknown error"));
    } finally {
      setShowAnimation(false);
      setTransactionInProgress(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full text-white">
      {/* Top: Wallet bar */}
      <div className="bg-navy-lighter rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-4">
        {!isConnected ? (
          <>
            <p className="text-sm text-gray-400 mr-auto">
              Connect a wallet to start donating
            </p>
            {isMobile && (
              <p className="text-xs text-yellow-400 w-full">
                Open inside your wallet's browser for best experience.
              </p>
            )}
            <button
              onClick={connectMetaMask}
              disabled={loading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                alt=""
                className="w-4 h-4"
              />
              MetaMask
            </button>
            <button
              onClick={connectPhantom}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              👻 Phantom
            </button>
            <button
              onClick={connectOKXWallet}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
            >
              ⬛ OKX
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{NETWORK_CONFIGS[chain]?.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Connected</p>
                <p className="text-xs font-mono text-white truncate max-w-[140px]">
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </p>
              </div>
            </div>
            {balance && (
              <span className="text-sm font-semibold text-green-400">{balance}</span>
            )}
            <select
              value=""
              onChange={(e) => handleNetworkSwitch(e.target.value)}
              className="ml-auto bg-navy-light border border-gray-600/30 rounded-xl px-3 py-2 text-sm focus:border-primary transition-all"
            >
              <option value="">Switch Network…</option>
              {Object.entries(CHAIN_LABELS).map(([key, label]) => (
                <option key={key} value={key} disabled={key === chain}>
                  {NETWORK_CONFIGS[key]?.icon} {label}
                </option>
              ))}
            </select>
            <button
              onClick={handleWalletDisconnect}
              className="px-4 py-2 bg-red-600/70 hover:bg-red-600 rounded-xl text-sm font-medium transition-colors"
            >
              Disconnect
            </button>
          </>
        )}
        {error && (
          <p className="w-full text-xs text-red-400 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
            {error}
          </p>
        )}
      </div>

      {/* Main: Browse + Donate */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Browse NGOs */}
        <div className="w-full lg:w-2/5 xl:w-1/3 flex flex-col gap-3">
          <div className="bg-navy-lighter rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-3">Browse Organisations</h2>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NGOs…"
              className="w-full p-2.5 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary text-sm mb-3 transition-all"
            />

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${activeCategory === cat
                    ? "bg-primary border-primary text-white"
                    : "border-gray-600/40 text-gray-400 hover:text-white hover:border-primary/40"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* NGO cards */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredNGOs.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-6">
                  No organisations match your search.
                </p>
              ) : (
                filteredNGOs.map((ngo) => (
                  <NGOCard
                    key={ngo.id}
                    ngo={ngo}
                    donationCount={donationCountByNGO[ngo.id] || 0}
                    isSelected={selectedNGO?.id === ngo.id}
                    currentChain={chain}
                    onSelect={() => selectNGO(ngo)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Fundraiser detail + Donation form */}
        <div className="w-full lg:w-3/5 xl:w-2/3 flex flex-col gap-4">
          {selectedNGO ? (
            <>
              {/* NGO detail card */}
              <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl">{selectedNGO.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-2xl font-extrabold">{selectedNGO.name}</h2>
                      {selectedNGO.verified && (
                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
                          ✓ Verified
                        </span>
                      )}
                      {!selectedNGO.verified && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
                          ⏳ Pending verification
                        </span>
                      )}
                      <span className="text-xs bg-gray-700/50 text-gray-300 rounded-full px-2 py-0.5">
                        {selectedNGO.category}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm italic">{selectedNGO.tagline}</p>
                  </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {selectedNGO.description}
                </p>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4 text-sm">
                  <span className="text-primary font-semibold">Mission: </span>
                  <span className="text-gray-300">{selectedNGO.mission}</span>
                </div>

                {/* Progress */}
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span className="font-semibold text-white">
                    {donationCountByNGO[selectedNGO.id] || 0} donors
                  </span>
                  <span>Goal: {selectedNGO.goalDonors} donors</span>
                </div>
                <div className="w-full bg-gray-700/40 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((donationCountByNGO[selectedNGO.id] || 0) /
                            selectedNGO.goalDonors) *
                          100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <a
                    href={selectedNGO.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    🌐 Official website ↗
                  </a>
                  <a
                    href={selectedNGO.donationPage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    🔍 Verify wallet address ↗
                  </a>
                </div>
              </div>

              {/* Donation form */}
              <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
                <h3 className="text-lg font-bold mb-4">
                  Donate to {selectedNGO.name}
                </h3>

                {!isConnected ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    Connect your wallet above to donate.
                  </p>
                ) : !selectedNGO.walletAddresses?.[chain] ? (
                  <div className="text-center py-4">
                    <p className="text-yellow-400 text-sm mb-2">
                      {selectedNGO.name} hasn't registered a wallet on{" "}
                      {CHAIN_LABELS[chain]} yet.
                    </p>
                    <p className="text-gray-400 text-xs">
                      Switch to another network or donate directly via their{" "}
                      <a
                        href={selectedNGO.donationPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        official page
                      </a>
                      .
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Corporate matching banner */}
                    {selectedNGO && <MatchBanner ngoId={selectedNGO.id} />}

                    {/* Anonymous / public toggle */}
                    <div className="flex items-center gap-3 p-3 bg-[#1a2747] rounded-xl border border-gray-600/30">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          {isAnonymous ? "Anonymous donation 🎭" : "Public donation 👤"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {isAnonymous
                            ? "Your address will not be shown publicly."
                            : "Your address or name will appear in the donor wall."}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAnonymous((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnonymous ? "bg-secondary" : "bg-primary"
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymous ? "translate-x-6" : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Donor name (only when public) */}
                    {!isAnonymous && (
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">
                          Display name{" "}
                          <span className="text-gray-500">(optional — leave blank to show address)</span>
                        </label>
                        <input
                          type="text"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          placeholder="e.g. Alice, Anon Hero, …"
                          maxLength={40}
                          className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary text-sm transition-all"
                          disabled={transactionInProgress}
                        />
                      </div>
                    )}

                    {/* Token selector */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Token</label>
                      <select
                        value={selectedToken?.symbol || ""}
                        onChange={(e) =>
                          setSelectedToken(
                            supportedTokens[chain]?.find(
                              (t) => t.symbol === e.target.value
                            )
                          )
                        }
                        className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary transition-all"
                        disabled={transactionInProgress}
                      >
                        <option value="">— Choose a token —</option>
                        {supportedTokens[chain]?.map((token) => (
                          <option key={token.symbol} value={token.symbol}>
                            {token.name} ({token.symbol})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Amount</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`0.00 ${selectedToken?.symbol || ""}`}
                        min="0"
                        step="any"
                        className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary transition-all"
                        disabled={transactionInProgress}
                      />
                      {balance && (
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {balance}
                        </p>
                      )}
                      {amount && selectedToken && getUSDValue(amount, selectedToken.symbol) !== null && (
                        <p className="text-xs text-green-400 mt-1">≈ ${getUSDValue(amount, selectedToken.symbol).toFixed(2)} USD</p>
                      )}
                    </div>

                    {/* Wallet address confirmation */}
                    <div className="p-3 bg-[#1a2747] rounded-xl border border-gray-600/30 text-xs">
                      <p className="text-gray-400 mb-1">Donation recipient address</p>
                      <p className="font-mono text-gray-200 break-all">
                        {selectedNGO.walletAddresses[chain]}
                      </p>
                      <a
                        href={selectedNGO.donationPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline mt-1 block"
                      >
                        Verify on official website ↗
                      </a>
                    </div>

                    <button
                      onClick={handleDonate}
                      disabled={
                        transactionInProgress ||
                        !selectedToken ||
                        !amount ||
                        parseFloat(amount) <= 0
                      }
                      className="w-full p-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-custom-lg"
                    >
                      {transactionInProgress
                        ? "Processing…"
                        : `${isAnonymous ? "🎭 Donate Anonymously" : "💚 Donate"} ${amount ? amount + " " + (selectedToken?.symbol || "") : ""
                        }`}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No NGO selected */
            <div className="bg-navy-lighter rounded-2xl p-10 border border-gray-700/30 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <span className="text-5xl mb-4">💎</span>
              <h3 className="text-xl font-bold mb-2">Select an Organisation</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Browse and choose an NGO or Foundation from the list on the left
                to view their campaign and make a donation.
              </p>
            </div>
          )}

          <AnimationComponent isVisible={showAnimation} />

          {/* Donor activity */}
          <div className="bg-navy-lighter rounded-2xl p-5 border border-gray-700/30">
            <DonationHistory ngoId={selectedNGO?.id} />
            <Leaderboard ngoId={selectedNGO?.id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharityMode;
