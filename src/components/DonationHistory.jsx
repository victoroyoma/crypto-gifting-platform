import React, { useContext } from "react";
import { WalletContext } from "../contexts/WalletContext";
import SocialShare from "./SocialShare";

const DonationHistory = () => {
  const { donationHistory = [] } = useContext(WalletContext);

  if (!donationHistory.length) {
    return <p className="text-center text-gray-400 text-lg font-semibold">No donations made yet.</p>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-2xl font-bold mb-6 text-center">Donation History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-700">
          <thead>
            <tr className="bg-navy-lighter text-white uppercase text-sm">
              <th className="p-4 border border-gray-700 text-left">Charity</th>
              <th className="p-4 border border-gray-700 text-left">Amount</th>
              <th className="p-4 border border-gray-700 text-left">Token</th>
              <th className="p-4 border border-gray-700 text-left">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {donationHistory.map((donation, index) => (
              <tr
                key={index}
                className={`hover:bg-navy-light transition ${
                  donation.txHash.startsWith("demo") ? "bg-yellow-100/10" : "bg-[#1a2747]"
                }`}
              >
                <td className="p-4 border border-gray-700">{donation.charity}</td>
                <td className="p-4 border border-gray-700">{donation.amount}</td>
                <td className="p-4 border border-gray-700">{donation.token}</td>
                <td className="p-4 border border-gray-700">
                  {donation.txHash.startsWith("demo") ? (
                    <span className="text-yellow-400 font-semibold">Demo Transaction</span>
                  ) : (
                    <a
                      href={
                        donation.chain === "ethereum"
                          ? `https://etherscan.io/tx/${donation.txHash}`
                          : donation.chain === "bnb"
                          ? `https://bscscan.com/tx/${donation.txHash}`
                          : donation.chain === "okx"
                          ? `https://www.oklink.com/okc/tx/${donation.txHash}`
                          : `https://explorer.solana.com/tx/${donation.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      View on Explorer
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DonationHistory;
