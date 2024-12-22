import React, { useContext, useMemo } from "react";
import { WalletContext } from "../contexts/WalletContext";

const Leaderboard = () => {
  const { donationHistory } = useContext(WalletContext);

  const topDonors = useMemo(() => {
    const donorTotals = donationHistory.reduce((totals, donation) => {
      const donor = donation.txHash.startsWith("demo") ? "Demo Donor" : donation.charity;
      const amount = parseFloat(donation.amount);
      if (totals[donor]) {
        totals[donor] += amount;
      } else {
        totals[donor] = amount;
      }
      return totals;
    }, {});

    return Object.entries(donorTotals)
      .map(([donor, total]) => ({ donor, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [donationHistory]);

  return (
    <div className="mt-6 -mx-4 md:mx-0">
      <h3 className="text-2xl font-bold mb-6 text-center">Top Donors</h3>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <table className="min-w-full w-max md:w-full table-auto border-collapse border border-gray-700">
          <thead>
            <tr className="bg-navy-lighter text-white uppercase text-sm">
              <th className="p-4 border border-gray-700 text-left">Donor</th>
              <th className="p-4 border border-gray-700 text-left">Total Donations</th>
            </tr>
          </thead>
          <tbody>
            {topDonors.map((donor, index) => (
              <tr
                key={index}
                className={`hover:bg-navy-light transition ${
                  index === 0 ? "bg-green-600/10" : "bg-[#1a2747]"
                }`}
              >
                <td className="p-4 border border-gray-700 font-semibold">{donor.donor}</td>
                <td className="p-4 border border-gray-700">{donor.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
