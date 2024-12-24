import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { WalletProvider } from "./contexts/WalletContext";
import CharityMode from "./components/CharityMode";
import SendReceiveTokens from "./components/SendReceiveTokens";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-navy-light text-white overflow-x-hidden">
      <ErrorBoundary>
        <WalletProvider>
          <Router>
            <header className="p-4 md:p-6 bg-navy-lighter bg-opacity-90 backdrop-blur-md shadow-custom-lg sticky top-0 z-50">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="text-xl md:text-3xl font-bold text-white tracking-tight truncate">
                  💎 Crypto Gifting
                </div>
                
                {/* Mobile Menu Button */}
                <button 
                  className="md:hidden p-2 hover:bg-navy-light rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
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
                <nav className="hidden md:flex space-x-8">
                  <Link
                    to="/charity"
                    className="px-4 py-2 rounded-xl text-white hover:bg-primary/20 transition-all duration-300 font-medium"
                  >
                    Charity Mode
                  </Link>
                  <Link
                    to="/send-receive"
                    className="px-4 py-2 rounded-xl text-white hover:bg-primary/20 transition-all duration-300 font-medium"
                  >
                    Send & Receive
                  </Link>
                </nav>
              </div>

              {/* Mobile Navigation */}
              <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} pt-4`}>
                <nav className="flex flex-col space-y-2">
                  <Link
                    to="/charity"
                    className="px-4 py-2 rounded-xl text-white hover:bg-primary/20 transition-all duration-300 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Charity Mode
                  </Link>
                  <Link
                    to="/send-receive"
                    className="px-4 py-2 rounded-xl text-white hover:bg-primary/20 transition-all duration-300 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Send & Receive
                  </Link>
                </nav>
              </div>
            </header>

            <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 flex-grow overflow-hidden">
              <Routes>
                <Route path="/charity" element={<CharityMode />} />
                <Route path="/send-receive" element={<SendReceiveTokens />} />
                <Route
                  path="*"
                  element={
                    <div className="text-center text-lg font-semibold mt-20">
                      Welcome to the first ever crypto donation platform for charities, Please select a valid route.
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
      </ErrorBoundary>
    </div>
  );
}

export default App;
