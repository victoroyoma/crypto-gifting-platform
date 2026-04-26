import React, { useContext, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { WalletContext } from "../contexts/WalletContext";
import { NETWORK_CONFIGS } from "../config/networks";
import AnimationComponent from "./AnimationComponent";

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

const SendReceiveTokens = () => {
  const {
    sendToken,
    supportedTokens,
    chain,
    isConnected,
    address,
    balance,
    storeDataOnIPFS,
    retrieveDataFromIPFS,
    loading: walletLoading,
  } = useContext(WalletContext);

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(null);
  const [transactionCID, setTransactionCID] = useState(null);
  const [retrievedData, setRetrievedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animationVisible, setAnimationVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("send"); // "send" | "receive"
  const [copied, setCopied] = useState(false);

  const getTxUrl = (ch, hash) => {
    const cfg = NETWORK_CONFIGS[ch];
    if (!cfg?.blockExplorer) return "#";
    return `${cfg.blockExplorer}/tx/${hash}`;
  };

  const handleSend = async () => {
    if (!isConnected) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!toAddress || !amount || !selectedToken) {
      toast.error("Fill in all fields before sending.");
      return;
    }
    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero.");
      return;
    }
    try {
      setLoading(true);
      setAnimationVisible(true);
      const loadingToast = toast.loading("Sending transaction…");
      const txHash = await sendToken(toAddress, amount, selectedToken);
      const txData = {
        toAddress,
        amount,
        token: selectedToken.symbol,
        chain,
        txHash,
        timestamp: Date.now(),
      };
      const cid = await storeDataOnIPFS(txData);
      setTransactionCID(cid);
      toast.dismiss(loadingToast);
      toast.success(
        <span>
          Sent {amount} {selectedToken.symbol}!{" "}
          <a
            href={getTxUrl(chain, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-300"
          >
            View tx
          </a>
        </span>,
        { duration: 8000 }
      );
      setToAddress("");
      setAmount("");
    } catch (err) {
      toast.error("Transaction failed: " + err.message);
    } finally {
      setLoading(false);
      setAnimationVisible(false);
    }
  };

  const handleRetrieve = async () => {
    if (!transactionCID) {
      toast.error("No IPFS CID found. Send a transaction first.");
      return;
    }
    try {
      setLoading(true);
      setAnimationVisible(true);
      const data = await retrieveDataFromIPFS(transactionCID);
      setRetrievedData(data);
      toast.success("Transaction data retrieved from IPFS.");
    } catch (err) {
      toast.error("Failed to retrieve data: " + err.message);
    } finally {
      setLoading(false);
      setAnimationVisible(false);
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 bg-[#0a1128] text-white w-full max-w-full overflow-hidden">
      {/* Left: Send / Receive */}
      <div className="w-full lg:w-1/2 bg-navy-lighter rounded-2xl shadow-custom-lg p-4 md:p-6">
        <h2 className="text-2xl font-bold mb-4">Send &amp; Receive Tokens</h2>

        {!isConnected ? (
          <p className="text-center text-gray-400 py-10">
            Connect your wallet to send or receive tokens.
          </p>
        ) : (
          <>
            {/* Wallet info */}
            <div className="mb-4 p-3 bg-[#1a2747] rounded-xl border border-gray-600/30 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Network</span>
                <span className="font-semibold">
                  {NETWORK_CONFIGS[chain]?.icon} {CHAIN_LABELS[chain]}
                </span>
              </div>
              {balance && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance</span>
                  <span className="text-green-400 font-semibold">{balance}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-gray-600/30 mb-5">
              {["send", "receive"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-white"
                      : "bg-navy-light text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "send" ? "⬆ Send" : "⬇ Receive"}
                </button>
              ))}
            </div>

            {activeTab === "send" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Token</label>
                  <select
                    value={selectedToken?.symbol || ""}
                    onChange={(e) =>
                      setSelectedToken(
                        supportedTokens[chain]?.find((t) => t.symbol === e.target.value)
                      )
                    }
                    className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary transition-all"
                  >
                    <option value="">— Select Token —</option>
                    {supportedTokens[chain]?.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.name} ({token.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Recipient Address</label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x… or Solana address"
                    className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary transition-all font-mono text-sm"
                  />
                </div>

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
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={loading || !toAddress || !amount || !selectedToken}
                  className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Sending…" : "Send Tokens"}
                </button>

                {transactionCID && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Stored on IPFS:{" "}
                    <a
                      href={`https://ipfs.io/ipfs/${transactionCID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {transactionCID.slice(0, 20)}…
                    </a>
                  </p>
                )}
              </div>
            ) : (
              /* Receive Tab */
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-gray-400 text-center">
                  Share your address or QR code to receive{" "}
                  {NETWORK_CONFIGS[chain]?.icon} {CHAIN_LABELS[chain]} tokens.
                </p>
                <div className="p-4 bg-white rounded-2xl">
                  <QRCodeSVG value={address} size={180} />
                </div>
                <div className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 text-center">
                  <p className="text-xs font-mono break-all text-gray-200">{address}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="px-6 py-2 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
                >
                  {copied ? "✓ Copied!" : "Copy Address"}
                </button>
              </div>
            )}
          </>
        )}

        <AnimationComponent isVisible={animationVisible} />
      </div>

      {/* Right: IPFS retrieval + info */}
      <div className="w-full lg:w-1/2 bg-navy-lighter rounded-2xl shadow-custom-lg p-4 md:p-6 space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-1">Retrieve IPFS Record</h3>
          <p className="text-sm text-gray-400 mb-4">
            Every send transaction is stored on IPFS. Retrieve your last record here.
          </p>
          <button
            onClick={handleRetrieve}
            disabled={loading || !transactionCID}
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Retrieving…" : "Retrieve Last Transaction"}
          </button>
          {retrievedData && (
            <div className="mt-4 bg-[#1a2747] p-4 rounded-xl border border-gray-600/30 text-sm space-y-1">
              <h4 className="font-semibold text-white mb-2">Retrieved Record</h4>
              <p className="text-gray-400">Recipient: <span className="text-white font-mono text-xs">{retrievedData.toAddress}</span></p>
              <p className="text-gray-400">Amount: <span className="text-white">{retrievedData.amount} {retrievedData.token}</span></p>
              <p className="text-gray-400">Chain: <span className="text-white">{retrievedData.chain}</span></p>
              <p className="text-gray-400">
                Tx Hash:{" "}
                <a
                  href={getTxUrl(retrievedData.chain, retrievedData.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-mono text-xs"
                >
                  {retrievedData.txHash?.slice(0, 20)}…
                </a>
              </p>
              {retrievedData.timestamp && (
                <p className="text-gray-400">Time: <span className="text-white">{new Date(retrievedData.timestamp).toLocaleString()}</span></p>
              )}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm text-gray-300 space-y-2">
          <h4 className="font-semibold text-white">Supported Chains</h4>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(CHAIN_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1 text-xs">
                <span>{NETWORK_CONFIGS[key]?.icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Transactions are signed by your own wallet. This platform never holds funds.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SendReceiveTokens;
