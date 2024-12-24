import React, { useContext, useState } from "react";
import { WalletContext } from "../contexts/WalletContext";
import AnimationComponent from "./AnimationComponent";

const SendReceiveTokens = () => {
  const { sendToken, receiveTokens, supportedTokens, chain, isConnected, storeDataOnIPFS, retrieveDataFromIPFS } =
    useContext(WalletContext);

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(null);
  const [transactionCID, setTransactionCID] = useState(null);
  const [retrievedData, setRetrievedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animationVisible, setAnimationVisible] = useState(false);

  const handleSend = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!toAddress || !amount || !selectedToken) {
      alert("Please fill in all the fields.");
      return;
    }
    try {
      setLoading(true);
      setAnimationVisible(true); // Show animation
      const txHash = await sendToken(toAddress, amount, selectedToken);
      const txData = { toAddress, amount, token: selectedToken.symbol, chain, txHash, timestamp: Date.now() };

      // Store transaction data on IPFS
      const cid = await storeDataOnIPFS(txData);
      setTransactionCID(cid);

      alert(`Transaction sent! Hash: ${txHash}\nStored on IPFS: ${cid}`);
    } catch (err) {
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setLoading(false);
      setAnimationVisible(false); // Hide animation
    }
  };


  const handleRetrieve = async () => {
    if (!transactionCID) {
      alert("No transaction CID found. Make a transaction first.");
      return;
    }
    try {
      setLoading(true);
      setAnimationVisible(true); // Show animation
      const data = await retrieveDataFromIPFS(transactionCID);
      setRetrievedData(data);
      alert("Transaction data retrieved successfully!");
    } catch (err) {
      alert(`Failed to retrieve data: ${err.message}`);
    } finally {
      setLoading(false);
      setAnimationVisible(false); // Hide animation
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-6 bg-[#0a1128] text-white p-6">
      {/* Left Section: Token Actions */}
      <div className="w-full lg:w-1/3 bg-navy-lighter rounded-2xl shadow-custom-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Send and Receive Tokens</h2>
        {!isConnected ? (
          <p className="text-center text-gray-400">Please connect your wallet to use this feature.</p>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">Send Tokens</h3>
            <select
              value={selectedToken?.symbol || ""}
              onChange={(e) =>
                setSelectedToken(supportedTokens[chain]?.find((token) => token.symbol === e.target.value))
              }
              className="w-full p-3 bg-navy-light rounded-xl border border-gray-600/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
            >
              <option value="">-- Select Token --</option>
              {supportedTokens[chain]?.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Recipient Address"
              className="w-full p-3 mb-4 bg-[#1a2747] border border-gray-500 rounded-lg"
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-full p-3 mb-4 bg-[#1a2747] border border-gray-500 rounded-lg"
            />
            <button
              onClick={handleSend}
              className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-xl shadow-custom transition-all duration-300 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Tokens"}
            </button>
            {transactionCID && (
              <p className="mt-4 text-center text-sm text-gray-400">
                Transaction stored on IPFS:{" "}
                <a
                  href={`https://ipfs.io/ipfs/${transactionCID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  View Transaction
                </a>
              </p>
            )}
          </>
        )}

        {/* Retrieve Stored Data */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Retrieve Transaction Data</h3>
          <button
            onClick={handleRetrieve}
            className="w-full p-3 bg-blue-600 rounded-lg hover:bg-blue-700"
            disabled={loading || !transactionCID}
          >
            {loading ? "Retrieving..." : "Retrieve Data"}
          </button>
          {retrievedData && (
            <div className="mt-6 bg-[#1a2747] p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-2">Retrieved Data</h4>
              <p className="text-sm text-gray-400">Recipient: {retrievedData.toAddress}</p>
              <p className="text-sm text-gray-400">Amount: {retrievedData.amount}</p>
              <p className="text-sm text-gray-400">Token: {retrievedData.token}</p>
              <p className="text-sm text-gray-400">Chain: {retrievedData.chain}</p>
              <p className="text-sm text-gray-400">Transaction Hash: {retrievedData.txHash}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Placeholder for future features */}
      <div className="w-full lg:w-2/3 bg-navy-lighter rounded-2xl shadow-custom-lg p-6">
        <h3 className="text-2xl font-bold">More Features Coming Soon!</h3>
        <p className="text-gray-400 mt-4 text-center">
          We're actively working on expanding the functionality of this dApp. Stay tuned for updates!
        </p>
      </div>
    </div>
  );
};

export default SendReceiveTokens;
