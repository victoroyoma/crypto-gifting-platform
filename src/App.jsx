import React from "react";
import { WalletProvider } from "./contexts/WalletContext";
import CharityMode from "./components/CharityMode";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

function App() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-deep-blue to-navy-light text-white flex items-center justify-center">
      <ErrorBoundary>
        <WalletProvider>
          <CharityMode />
        </WalletProvider>
      </ErrorBoundary>
    </div>
  );
}

export default App;
