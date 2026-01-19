// src/App.jsx
import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { ConnectButton } from "./components/ConnectButton";
import { FunctionRunner } from "./components/FunctionRunner";
import { getProvider, getSigner } from "./lib/eth";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./config/contract";
import CredentialActions from "./components/CredentialActions";

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);

  const iface = useMemo(() => new ethers.Interface(CONTRACT_ABI), []);

  const handleConnected = async () => {
    const p = await getProvider();
    setProvider(p);

    const s = await getSigner(p);
    setSigner(s);

    const addr = await s.getAddress();
    setAccount(addr);

    const net = await p.getNetwork();
    setNetworkOk(net.chainId === 11155111n); // Sepolia
  };

  return (
    <div className="min-h-screen neo-bg text-zinc-100">
      {/* widened to use side space */}
      <div className="mx-auto w-full max-w-7xl px-5 py-10">
        {/* Header */}
        <header className="mb-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-50 leading-[1.05]">
                Credential Registry  
              </h1>

              {/* tighter spacing under title */}
              <p className="mt-2 text-sm text-zinc-400">
                Issue, verify, and revoke credentials on-chain • Sepolia (11155111)
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Built with React + Vite + ethers v6
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <span className="neo-badge">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-300/80" />
                Cyber Registry 
              </span>
            </div>
          </div>
        </header>

        {/* Connect row */}
        <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <ConnectButton onConnected={handleConnected} />
            <span className="text-sm text-zinc-400">
              {account ? "Wallet connected." : "Connect wallet to begin."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="neo-badge">
              <span className="text-zinc-400">Contract</span>
              <span className="text-zinc-200">
                {CONTRACT_ADDRESS.slice(0, 6)}…{CONTRACT_ADDRESS.slice(-4)}
              </span>
            </div>

            <div
              className={`neo-badge ${
                networkOk
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/25 bg-rose-500/10 text-rose-200"
              }`}
            >
              <span className="text-zinc-300/80">Network</span>
              <span>{networkOk ? "Sepolia" : "Not Sepolia"}</span>
            </div>
          </div>
        </section>

        {/* Cards */}
        <main className="space-y-7">
          <Card title="Quick Actions" subtitle="Use the forms below to manage credentials." version="V.0">
            <CredentialActions
              contractAddress={CONTRACT_ADDRESS}
              abi={CONTRACT_ABI}
              provider={provider}
              signer={signer}
              networkOk={networkOk}
              account={account}
            />
          </Card>

          <Card
            title="Advanced Tools"
            subtitle="For testing: call contract methods directly (recommended only if you know what you're doing)."
            version="V.0"
          >
            <FunctionRunner
              iface={iface}
              contractAddress={CONTRACT_ADDRESS}
              abi={CONTRACT_ABI}
              provider={provider}
              signer={signer}
              networkOk={networkOk}
              account={account}
            />
          </Card>
        </main>
      </div>
    </div>
  );
}

function Card({ title, subtitle, version, children }) {
  return (
    <section className="neo-card neo-outline">
      <div className="neo-card-header flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-zinc-400">{subtitle}</p> : null}
        </div>

        {version ? (
          <span className="neo-badge">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-300/70" />
            {version}
          </span>
        ) : null}
      </div>

      <div className="neo-card-body">{children}</div>
    </section>
  );
}

