// src/components/CredentialActions.jsx
import React, { useMemo, useState } from "react";
import { ethers } from "ethers";

export default function CredentialActions({
  contractAddress,
  abi,
  provider,
  signer,
  networkOk,
  account,
}) {
  const [holder, setHolder] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const hashFromText = useMemo(() => {
    try {
      if (!text.trim()) return "";
      return ethers.keccak256(ethers.toUtf8Bytes(text.trim()));
    } catch {
      return "";
    }
  }, [text]);

  const isAddress = (addr) => {
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  };

  const ensureReady = (needSigner = false) => {
    if (!provider) {
      setMessage("Connect your wallet first.");
      return false;
    }
    if (!networkOk) {
      setMessage("Switch to Sepolia to continue.");
      return false;
    }
    if (!isAddress(holder)) {
      setMessage("Enter a valid holder address (0x...).");
      return false;
    }
    if (!text.trim()) {
      setMessage("Enter a credential label (any short text).");
      return false;
    }
    if (needSigner && !signer) {
      setMessage("No signer found. Reconnect your wallet.");
      return false;
    }
    return true;
  };

  const issue = async () => {
    if (!ensureReady(true)) return;
    setLoading(true);
    setMessage("");
    setTxHash("");
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const tx = await contract.issueCredential(holder.trim(), hashFromText);
      setTxHash(tx.hash);
      const rec = await tx.wait();
      setMessage(`✅ Credential issued (block ${rec.blockNumber})`);
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!ensureReady(false)) return;
    setLoading(true);
    setMessage("");
    setTxHash("");
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const ok = await contract.verifyCredential(holder.trim(), hashFromText);
      setMessage(ok ? "✅ Credential is valid" : "❌ Not found (or revoked)");
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!ensureReady(true)) return;
    setLoading(true);
    setMessage("");
    setTxHash("");
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const tx = await contract.revokeCredential(holder.trim(), hashFromText);
      setTxHash(tx.hash);
      const rec = await tx.wait();
      setMessage(`🛑 Credential revoked (block ${rec.blockNumber})`);
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const disabledAll = !provider || !networkOk || loading;

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 lg:gap-x-10">
        <div className="min-w-0">
          <div className="neo-label">Holder address</div>
          <div className="neo-help mt-1">The wallet address that owns the credential.</div>
          <input
            className="neo-input mt-3 min-w-0"
            placeholder="0xabc...1234"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
          />
        </div>

        <div className="min-w-0">
          <div className="neo-label">Credential label</div>
          <div className="neo-help mt-1">
            Choose a label, to store the hash on-chain.
          </div>
          <input
            className="neo-input mt-3 min-w-0"
            placeholder="Example: CS101 - Completion"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <div className="text-xs font-semibold text-zinc-300">bytes32 hash</div>
            <div className="mt-2 text-xs text-zinc-400 break-all">
              {hashFromText || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Buttons + status */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className="neo-btn-success" onClick={issue} disabled={disabledAll}>
            {loading ? "Issuing…" : "Issue"}
          </button>

          <button className="neo-btn" onClick={verify} disabled={disabledAll}>
            {loading ? "Checking…" : "Verify"}
          </button>

          <button className="neo-btn-danger" onClick={revoke} disabled={disabledAll}>
            {loading ? "Revoking…" : "Revoke"}
          </button>
        </div>

        <div className="sm:ml-auto text-sm text-zinc-500">
          {account ? "Wallet connected." : "Wallet not connected."}
        </div>
      </div>

      {txHash && (
        <div className="text-sm text-zinc-300">
          Transaction:{" "}
          <a
            className="text-cyan-200 hover:text-cyan-100 underline"
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200">
          {message}
        </div>
      )}
    </div>
  );
}

