// src/App.jsx
import React, { useMemo, useState } from "react";
import { ethers } from "ethers";

import { ConnectButton } from "./components/ConnectButton";
import CredentialActions from "./components/CredentialActions";
import { FunctionRunner } from "./components/FunctionRunner";

import { getProvider, getSigner } from "./lib/eth";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./config/contract";

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  const connected = !!account;

  const contract = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }, [signer]);

  const connect = async () => {
    const p = await getProvider();
    const s = await getSigner(p);
    const addr = await s.getAddress();

    setProvider(p);
    setSigner(s);
    setAccount(addr);
  };

  return (
    <div className="min-h-[100dvh] w-full neo-bg text-zinc-100 overflow-x-clip">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <header className="mb-10">

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">

            {/* Left side */}
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-bold mb-3">
                Credential Registry
              </h1>

              <p className="text-zinc-400 mb-2">
                Issue, verify, and revoke credentials on-chain • Sepolia
                (11155111)
              </p>

              <p className="text-zinc-500 text-sm mb-5">
                Built with React + Vite + ethers v6
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <ConnectButton
                  connected={connected}
                  onClick={connect}
                />

                <span className="text-sm text-zinc-400">
                  Connect wallet to begin.
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="hidden md:flex shrink-0 items-center gap-2">
              <span className="badge">
                Contract {CONTRACT_ADDRESS.slice(0, 6)}…
                {CONTRACT_ADDRESS.slice(-4)}
              </span>

              <span className="badge badge-red">
                Network Not Sepolia
              </span>
            </div>

          </div>

        </header>

        {/* Main */}
        <main className="space-y-8">

          <CredentialActions
            contract={contract}
            connected={connected}
            account={account}
          />

          <FunctionRunner
            contract={contract}
            connected={connected}
          />

        </main>

      </div>
    </div>
  );
}

