// src/components/FunctionRunner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";

export function FunctionRunner({
  iface,
  contractAddress,
  abi,
  provider,
  signer,
  networkOk,
  account,
}) {
  const [selected, setSelected] = useState("");
  const [args, setArgs] = useState([]);
  const [result, setResult] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pending, setPending] = useState(false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  const fragments = useMemo(() => {
    try {
      return iface.fragments.filter((f) => f.type === "function");
    } catch {
      return [];
    }
  }, [iface]);

  const frag = useMemo(
    () => fragments.find((f) => f.format() === selected),
    [fragments, selected]
  );

  const isView =
    frag?.stateMutability === "view" || frag?.stateMutability === "pure";

  const inputs = frag?.inputs || [];

  const onSelect = (val) => {
    setSelected(val);
    const found = fragments.find((f) => f.format() === val);
    setArgs(Array(found?.inputs?.length || 0).fill(""));
    setResult("");
    setTxHash("");
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const run = async () => {
    if (!frag) return;

    if (!provider) {
      setResult("Connect your wallet first.");
      return;
    }

    if (!networkOk) {
      setResult("Switch to Sepolia to continue.");
      return;
    }

    try {
      setPending(true);

      const contract = new ethers.Contract(
        contractAddress,
        abi,
        isView ? provider : signer || provider
      );

      const parsedArgs = inputs.map((inp, i) =>
        coerce(args[i], inp.type)
      );

      if (isView) {
        const res = await contract[frag.name](...parsedArgs);
        setResult(stringify(res));
      } else {
        if (!signer) {
          setResult("Write actions require a signer.");
          return;
        }

        const tx = await contract[frag.name](...parsedArgs);
        setTxHash(tx.hash);

        const rec = await tx.wait();

        setResult(`✅ Completed (block ${rec.blockNumber})`);
      }
    } catch (err) {
      console.error(err);
      setResult(err?.reason || err?.message || String(err));
    } finally {
      setPending(false);
    }
  };

  const selectedLabel = selected
    ? prettySig(selected)
    : "— Choose a method —";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return fragments;

    return fragments.filter((f) =>
      prettySig(f.format()).toLowerCase().includes(q)
    );
  }, [fragments, query]);

  return (
    <div className="space-y-5">

      {fragments.length === 0 && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          ABI looks empty or invalid.
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        {/* Dropdown */}
        <div className="w-full lg:w-[70%] min-w-0" ref={dropdownRef}>

          <div className="neo-label">Select a method</div>

          <div className="neo-help mt-1">
            Direct contract invocation — useful for debugging.
          </div>

          <div className="relative mt-3">

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="neo-select min-w-0 flex items-center justify-between gap-3"
            >
              <span className="truncate">{selectedLabel}</span>
              <span className="text-zinc-400">▾</span>
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-2 w-full z-50 rounded-xl overflow-hidden neo-dropdown">

                <div className="p-2 border-b border-white/10">
                  <input
                    className="neo-input"
                    placeholder="Search methods…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-auto py-1">

                  <button
                    type="button"
                    onClick={() => onSelect("")}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
                  >
                    — Choose a method —
                  </button>

                  {filtered.map((f) => {
                    const sig = f.format();
                    const label = prettySig(sig);
                    const active = sig === selected;

                    return (
                      <button
                        key={sig}
                        type="button"
                        onClick={() => onSelect(sig)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] ${
                          active
                            ? "bg-white/[0.08] text-zinc-100"
                            : "text-zinc-200"
                        }`}
                        title={label}
                      >
                        <span className="block truncate">{label}</span>
                      </button>
                    );
                  })}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Read/Write Badge */}
        <div className="neo-badge mt-2 lg:mt-7 shrink-0">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isView
                ? "bg-emerald-300/80"
                : "bg-amber-300/80"
            }`}
          />
          <span>{isView ? "Read" : "Write"}</span>
        </div>

      </div>

      {frag && (

        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-5">

          {/* Selected Method */}
          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-300">
                Selected method
              </div>

              <div className="mt-1 text-sm text-zinc-100 break-all">
                {prettySig(frag.format())}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">

              <span className="neo-badge text-zinc-300">
                {frag.stateMutability || "nonpayable"}
              </span>

              <span
                className={`neo-badge ${
                  isView
                    ? ""
                    : "border-amber-500/25 bg-amber-500/10 text-amber-100"
                }`}
              >
                {isView ? "reads state" : "writes state"}
              </span>

            </div>
          </div>

          {/* Arguments */}
          <div className="mt-6">

            <div className="text-lg font-bold text-zinc-50">
              Arguments
            </div>

            <div className="neo-help mt-1">
              Provide inputs in the exact ABI types.
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 lg:gap-x-10">

              {inputs.map((inp, i) => (

                <div key={i} className="min-w-0">

                  <div className="flex items-center justify-between gap-3">

                    <div className="neo-label">
                      {inp.name || `arg${i}`}
                    </div>

                    <div className="text-xs text-zinc-500">
                      {inp.type}
                    </div>

                  </div>

                  <input
                    className="neo-input mt-3 min-w-0"
                    placeholder={placeholderFor(inp.type)}
                    value={args[i] ?? ""}
                    onChange={(e) =>
                      setArgs((a) =>
                        a.map((v, idx) =>
                          idx === i ? e.target.value : v
                        )
                      )
                    }
                  />

                  <div className="neo-help mt-2">
                    {helpFor(inp.type)}
                  </div>

                </div>
              ))}
            </div>

            {/* Run Button */}
            <div className="mt-6 flex flex-wrap items-center gap-3">

              <button
                onClick={run}
                disabled={pending || !provider || !networkOk}
                className={isView ? "neo-btn" : "neo-btn-primary"}
              >
                {pending
                  ? isView
                    ? "Reading…"
                    : "Sending…"
                  : isView
                  ? "Run (read)"
                  : "Send (write)"}
              </button>

              <div className="text-sm text-zinc-500">
                {account
                  ? "Wallet connected."
                  : "Wallet not connected."}
              </div>

            </div>

            {/* TX */}
            {txHash && (

              <div className="mt-4 text-sm text-zinc-300">

                Transaction:{" "}

                <a
                  className="text-cyan-200 underline"
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Etherscan
                </a>

              </div>
            )}

            {/* Result */}
            {result && (

              <pre className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-200 overflow-x-auto break-all">

                {result}

              </pre>
            )}

          </div>

        </div>
      )}
    </div>
  );
}

/* ================= Helpers ================= */

function prettySig(sig) {
  try {
    const open = sig.indexOf("(");
    if (open === -1) return sig;

    const name = sig.slice(0, open).trim();

    const inside = sig
      .slice(open + 1, sig.lastIndexOf(")"))
      .replace(/,\s*/g, ", ")
      .trim();

    return `${name} (${inside})`;
  } catch {
    return sig;
  }
}

function stringify(v) {
  try {
    if (typeof v === "bigint") return v.toString();

    if (Array.isArray(v))
      return JSON.stringify(
        v.map((x) =>
          typeof x === "bigint" ? x.toString() : x
        ),
        null,
        2
      );

    if (typeof v === "object")
      return JSON.stringify(
        v,
        (k, val) =>
          typeof val === "bigint"
            ? val.toString()
            : val,
        2
      );

    return String(v);
  } catch {
    return String(v);
  }
}

function coerce(value, type) {
  if (type.startsWith("uint") || type.startsWith("int"))
    return String(value).trim();

  if (type === "address") return String(value).trim();

  if (type === "bool")
    return value === true || String(value).toLowerCase() === "true";

  return value;
}

function placeholderFor(type) {
  if (type === "address") return "0xabc...1234";
  if (type === "bytes32") return "0x... (32-byte hex)";
  if (type.startsWith("uint") || type.startsWith("int")) return "e.g., 1";
  if (type === "bool") return "true / false";

  return `Enter ${type}`;
}

function helpFor(type) {
  if (type === "address") return "Paste a 0x... wallet address.";
  if (type === "bytes32") return "Paste a 0x... 32-byte hash.";
  if (type.startsWith("uint") || type.startsWith("int"))
    return "Numbers only.";
  if (type === "bool") return "Type true or false.";

  return "Enter a value that matches the type.";
}

