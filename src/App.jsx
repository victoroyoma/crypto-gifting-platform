import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./contexts/WalletContext";
import { NGOProvider } from "./contexts/NGOContext";
import CharityMode from "./components/CharityMode";
import SendReceiveTokens from "./components/SendReceiveTokens";
import HomePage from "./components/HomePage";
import AdminPanel from "./components/admin/AdminPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import NFTReceiptsGallery from "./components/features/DonationNFT";
import MilestoneCampaigns from "./components/features/MilestoneCampaigns";
import QuadraticFunding from "./components/features/QuadraticFunding";
import ImpactAttestations from "./components/features/ImpactAttestations";
import FiatOnRamp from "./components/features/FiatOnRamp";
import RecurringDonations from "./components/features/RecurringDonations";
import CorporateMatching from "./components/features/CorporateMatching";
import DAOGovernance from "./components/features/DAOGovernance";
import AnalyticsDashboard from "./components/features/AnalyticsDashboard";
import BridgeHelper from "./components/features/BridgeHelper";
import "./index.css";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const featuresRef = useRef(null);

  // Close features dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (featuresRef.current && !featuresRef.current.contains(e.target)) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mainNavItems = [
    { to: "/", label: "Home" },
    { to: "/charity", label: "Fundraise" },
    { to: "/send-receive", label: "Send & Receive" },
  ];

  const featureItems = [
    { to: "/nft-receipts", label: "🏅 NFT Receipts" },
    { to: "/campaigns", label: "🎯 Campaigns" },
    { to: "/quadratic", label: "⚡ Quadratic Funding" },
    { to: "/impact", label: "📋 Impact Attestations" },
    { to: "/fiat", label: "💳 Buy Crypto" },
    { to: "/recurring", label: "🔁 Recurring Donations" },
    { to: "/matching", label: "🤝 Corporate Matching" },
    { to: "/governance", label: "🏛 DAO Governance" },
    { to: "/analytics", label: "📊 Analytics" },
    { to: "/bridge", label: "🌉 Bridge" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-navy-light text-white overflow-x-hidden">
      <ErrorBoundary>
        <NGOProvider>
          <WalletProvider>
            <Router>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: { background: "#2a3c6e", color: "#fff", border: "1px solid #3B82F6" },
                  success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
                  error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                }}
              />
              <header className="p-4 md:p-6 bg-navy-lighter bg-opacity-90 backdrop-blur-md shadow-custom-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <Link to="/" className="text-xl md:text-3xl font-bold text-white tracking-tight truncate">
                    💎 Crypto Gifting
                  </Link>

                  {/* Mobile Menu Button */}
                  <button
                    className="md:hidden p-2 hover:bg-navy-light rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>

                  {/* Desktop Navigation */}
                  <nav className="hidden md:flex items-center space-x-2">
                    {mainNavItems.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        className={({ isActive }) =>
                          `px-4 py-2 rounded-xl font-medium transition-all duration-300 ${isActive
                            ? "bg-primary/30 text-white"
                            : "text-white hover:bg-primary/20"
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                    ))}

                    {/* Features dropdown */}
                    <div className="relative" ref={featuresRef}>
                      <button
                        onClick={() => setFeaturesOpen((o) => !o)}
                        className="px-4 py-2 rounded-xl font-medium transition-all duration-300 text-white hover:bg-primary/20 flex items-center gap-1"
                      >
                        Features
                        <svg className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {featuresOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-navy-lighter border border-gray-700/40 rounded-2xl shadow-2xl py-1 z-50">
                          {featureItems.map(({ to, label }) => (
                            <NavLink
                              key={to}
                              to={to}
                              onClick={() => setFeaturesOpen(false)}
                              className={({ isActive }) =>
                                `block px-4 py-2.5 text-sm transition-colors ${isActive ? "text-primary bg-primary/10" : "text-gray-300 hover:text-white hover:bg-primary/10"}`
                              }
                            >
                              {label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>

                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `px-4 py-2 rounded-xl font-medium transition-all duration-300 ${isActive ? "bg-primary/30 text-white" : "text-white hover:bg-primary/20"}`
                      }
                    >
                      🔧 Admin
                    </NavLink>
                  </nav>
                </div>

                {/* Mobile Navigation */}
                <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"} pt-4`}>
                  <nav className="flex flex-col space-y-2">
                    {[...mainNavItems, ...featureItems, { to: "/admin", label: "🔧 Admin" }].map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        className={({ isActive }) =>
                          `px-4 py-2 rounded-xl font-medium transition-all duration-300 ${isActive ? "bg-primary/30 text-white" : "text-white hover:bg-primary/20"
                          }`
                        }
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </header>

              <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 flex-grow overflow-hidden">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/charity" element={<CharityMode />} />
                  <Route path="/send-receive" element={<SendReceiveTokens />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/nft-receipts" element={<NFTReceiptsGallery />} />
                  <Route path="/campaigns" element={<MilestoneCampaigns />} />
                  <Route path="/quadratic" element={<QuadraticFunding />} />
                  <Route path="/impact" element={<ImpactAttestations />} />
                  <Route path="/fiat" element={<FiatOnRamp />} />
                  <Route path="/recurring" element={<RecurringDonations />} />
                  <Route path="/matching" element={<CorporateMatching />} />
                  <Route path="/governance" element={<DAOGovernance />} />
                  <Route path="/analytics" element={<AnalyticsDashboard />} />
                  <Route path="/bridge" element={<BridgeHelper />} />
                  <Route
                    path="*"
                    element={
                      <div className="text-center text-lg font-semibold mt-20">
                        Page not found.{" "}
                        <Link to="/" className="text-primary hover:underline">
                          Go home
                        </Link>
                      </div>
                    }
                  />
                </Routes>
              </main>

              <footer className="bg-navy-lighter bg-opacity-90 backdrop-blur-md py-4 md:py-6 text-center text-xs md:text-sm text-gray-300 px-4">
                <div className="max-w-7xl mx-auto">
                  <p className="font-medium">
                    Built with ❤️ by Urhefe Ogheneyoma Victor for the Web3 community |{" "}
                    <a
                      href="https://github.com/victoroyoma"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors duration-300"
                    >
                      GitHub
                    </a>
                  </p>
                </div>
              </footer>
            </Router>
          </WalletProvider>
        </NGOProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
