import React, { useContext, useMemo } from "react";
import { WalletContext } from "../contexts/WalletContext";

const MEDALS = ["🥇", "🥈", "🥉"];

const Leaderboard = ({ ngoId }) => {
  const { donationHistory } = useContext(WalletContext);

  const topDonors = useMemo(() => {
    const source = ngoId
      ? (donationHistory || []).filter((d) => d.ngoId === ngoId)
      : donationHistory || [];

    const donorTotals = source.reduce((totals, d) => {
      // Key: anonymous donors share one "Anonymous" bucket; public donors keyed by name or address
      const key = d.isAnonymous
        ? "__anonymous__"
        : d.donorName || d.txHash?.slice(0, 10) || "Unknown";
      const amount = parseFloat(d.amount) || 0;
      totals[key] = (totals[key] || 0) + amount;
      return totals;
    }, {});

    return Object.entries(donorTotals)
      .map(([key, total]) => ({
        key,
        label: key === "__anonymous__" ? "🕵️ Anonymous Donor" : key,
        isAnonymous: key === "__anonymous__",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [donationHistory, ngoId]);

  if (!topDonors.length) return null;

  return (
    <div className="mt-6 w-full">
      <h3 className="text-xl font-bold mb-1">🏆 Donor Wall</h3>
      <p className="text-xs text-gray-400 mb-4">Cumulative donations (all tokens, combined)</p>
      <div className="space-y-2">
        {topDonors.map((entry, index) => (
          <div
            key={entry.key}
            className={`flex items-center justify-between p-3 rounded-xl border ${index === 0
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-[#1a2747] border-gray-700/40"
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{MEDALS[index] || `#${index + 1}`}</span>
              <span
                className={`text-sm truncate max-w-[200px] ${entry.isAnonymous ? "text-gray-400 italic" : "font-mono text-gray-300"
                  }`}
              >
                {entry.label}
              </span>
            </div>
            <span className="font-bold text-green-400 shrink-0">
              {entry.total.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
