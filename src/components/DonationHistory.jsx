import React, { useContext } from "react";
import { WalletContext } from "../contexts/WalletContext";
import SocialShare from "./SocialShare";
import { CHAIN_EXPLORER_TX } from "../constants";
import { NETWORK_CONFIGS } from "../config/networks";

const DonationHistory = ({ ngoId }) => {
  const { donationHistory = [] } = useContext(WalletContext);

  const filtered = ngoId
    ? donationHistory.filter((d) => d.ngoId === ngoId)
    : donationHistory;

  if (!filtered.length) {
    return (
      <p className="text-center text-gray-400 text-sm py-4">
        {ngoId ? "No donations to this organisation yet." : "No donations yet. Make your first donation above!"}
      </p>
    );
  }

  return (
    <div className="mt-6 w-full">
      <h3 className="text-xl font-bold mb-4">Donation History</h3>
      <div className="space-y-3">
        {[...filtered].reverse().map((donation, index) => (
          <div
            key={index}
            className="bg-[#1a2747] rounded-xl p-4 border border-gray-700/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-1 flex-1 min-w-0">
              {/* NGO name / address */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">
                  {donation.ngoName || donation.charity}
                </p>
                {donation.isAnonymous ? (
                  <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                    🎭 Anonymous
                  </span>
                ) : donation.donorName ? (
                  <span className="text-xs text-blue-300 shrink-0">{donation.donorName}</span>
                ) : null}
              </div>

              <p className="text-green-400 font-bold text-lg">
                {donation.amount} {donation.token}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{NETWORK_CONFIGS[donation.chain]?.icon}</span>
                <span className="capitalize">{donation.chain}</span>
                {donation.timestamp && (
                  <>
                    <span>·</span>
                    <span>{new Date(donation.timestamp).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {CHAIN_EXPLORER_TX[donation.chain] && donation.txHash ? (
                <a
                  href={CHAIN_EXPLORER_TX[donation.chain](donation.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  View on Explorer ↗
                </a>
              ) : null}
              <SocialShare
                charity={donation.ngoName || donation.charity}
                amount={donation.amount}
                token={donation.token}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonationHistory;
