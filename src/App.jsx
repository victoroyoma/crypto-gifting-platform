import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { WalletProvider } from "./contexts/WalletContext";
import CharityMode from "./components/CharityMode";
import SendReceiveTokens from "./components/SendReceiveTokens";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-deep-blue to-navy-light text-white">
      <ErrorBoundary>
        <WalletProvider>
          <Router>
            <header className="p-6 bg-navy-lighter bg-opacity-90 backdrop-blur-md shadow-custom-lg sticky top-0 z-50">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="text-3xl font-bold text-white tracking-tight">
                  💎 Crypto Gifting
                </div>
                <nav className="flex space-x-8">
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
            </header>

            <main className="max-w-7xl mx-auto p-6 flex-grow">
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

            <footer className="bg-navy-lighter bg-opacity-90 backdrop-blur-md py-6 text-center text-sm text-gray-300">
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
