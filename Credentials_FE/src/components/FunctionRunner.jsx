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
      return iface.fragments.filter((fragment) => fragment.type === "function");
    } catch {
      return [];
    }
  }, [iface]);

  const fragment = useMemo(
    () => fragments.find((item) => item.format() === selected),
    [fragments, selected]
  );

  const isView = fragment?.stateMutability === "view" || fragment?.stateMutability === "pure";
  const inputs = fragment?.inputs || [];

  const onSelect = (value) => {
    setSelected(value);
    const nextFragment = fragments.find((item) => item.format() === value);
    setArgs(Array(nextFragment?.inputs?.length || 0).fill(""));
    setResult("");
    setTxHash("");
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const onDocumentMouseDown = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

  const run = async () => {
    if (!fragment) return;

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

      const parsedArgs = inputs.map((input, index) => coerce(args[index], input.type));

      if (isView) {
        const response = await contract[fragment.name](...parsedArgs);
        setResult(stringify(response));
        return;
      }

      if (!signer) {
        setResult("Write actions require a signer.");
        return;
      }

      const tx = await contract[fragment.name](...parsedArgs);
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      setResult(`Completed successfully (block ${receipt.blockNumber}).`);
    } catch (error) {
      console.error(error);
      setResult(error?.reason || error?.message || String(error));
    } finally {
      setPending(false);
    }
  };

  const selectedLabel = selected ? prettySig(selected) : "Choose a method";

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return fragments;

    return fragments.filter((item) => prettySig(item.format()).toLowerCase().includes(normalizedQuery));
  }, [fragments, query]);

  return (
    <div className="space-y-5">
      {fragments.length === 0 && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          ABI looks empty or invalid.
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 w-full lg:w-[70%]" ref={dropdownRef}>
          <div className="neo-label">Select a method</div>
          <div className="neo-help mt-1">Direct contract invocation for debugging, inspection, and admin checks.</div>

          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="neo-select flex min-w-0 items-center justify-between gap-3"
            >
              <span className="truncate">{selectedLabel}</span>
              <span className="text-zinc-400">v</span>
            </button>

            {open && (
              <div className="neo-dropdown absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl">
                <div className="border-b border-white/10 p-2">
                  <input
                    className="neo-input"
                    placeholder="Search methods..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-auto py-1">
                  <button
                    type="button"
                    onClick={() => onSelect("")}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
                  >
                    Choose a method
                  </button>

                  {filtered.map((item) => {
                    const signature = item.format();
                    const label = prettySig(signature);
                    const active = signature === selected;

                    return (
                      <button
                        key={signature}
                        type="button"
                        onClick={() => onSelect(signature)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06] ${
                          active ? "bg-white/[0.08] text-zinc-100" : "text-zinc-200"
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

        <div className="neo-badge mt-1 w-fit shrink-0 lg:mt-7">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${isView ? "bg-emerald-300/80" : "bg-amber-300/80"}`} />
          <span>{isView ? "Read" : "Write"}</span>
        </div>
      </div>

      {fragment && (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-300">Selected method</div>
              <div className="mt-1 break-words text-sm text-zinc-100">{prettySig(fragment.format())}</div>
            </div>

            <div className="min-w-0 flex flex-wrap items-center gap-2">
              <span className="neo-badge text-zinc-300">{fragment.stateMutability || "nonpayable"}</span>
              <span className={`neo-badge ${isView ? "" : "border-amber-500/25 bg-amber-500/10 text-amber-100"}`}>
                {isView ? "reads state" : "writes state"}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-lg font-bold text-zinc-50">Arguments</div>
            <div className="neo-help mt-1">Provide inputs that match the contract ABI exactly.</div>

            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-10">
              {inputs.map((input, index) => (
                <div key={index} className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="neo-label">{input.name || `arg${index}`}</div>
                    <div className="text-xs text-zinc-500">{input.type}</div>
                  </div>

                  <input
                    className="neo-input mt-3 min-w-0"
                    placeholder={placeholderFor(input.type)}
                    value={args[index] ?? ""}
                    onChange={(event) =>
                      setArgs((currentArgs) =>
                        currentArgs.map((value, currentIndex) =>
                          currentIndex === index ? event.target.value : value
                        )
                      )
                    }
                  />

                  <div className="neo-help mt-2">{helpFor(input.type)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={run} disabled={pending || !provider || !networkOk} className={isView ? "neo-btn" : "neo-btn-primary"}>
                {pending ? (isView ? "Reading..." : "Sending...") : isView ? "Run read" : "Send write"}
              </button>

              <div className="text-sm text-zinc-500">{account ? "Wallet connected." : "Wallet not connected."}</div>
            </div>

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

            {result && (
              <pre className="mt-4 overflow-x-auto break-all rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-200">
                {result}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function prettySig(signature) {
  try {
    const openIndex = signature.indexOf("(");
    if (openIndex === -1) return signature;

    const name = signature.slice(0, openIndex).trim();
    const inside = signature.slice(openIndex + 1, signature.lastIndexOf(")")).replace(/,\s*/g, ", ").trim();
    return `${name} (${inside})`;
  } catch {
    return signature;
  }
}

function stringify(value) {
  try {
    if (typeof value === "bigint") return value.toString();

    if (Array.isArray(value)) {
      return JSON.stringify(
        value.map((item) => (typeof item === "bigint" ? item.toString() : item)),
        null,
        2
      );
    }

    if (typeof value === "object") {
      return JSON.stringify(
        value,
        (_, item) => (typeof item === "bigint" ? item.toString() : item),
        2
      );
    }

    return String(value);
  } catch {
    return String(value);
  }
}

function coerce(value, type) {
  if (type.startsWith("uint") || type.startsWith("int")) return String(value).trim();
  if (type === "address") return String(value).trim();
  if (type === "bool") return value === true || String(value).toLowerCase() === "true";
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
  if (type.startsWith("uint") || type.startsWith("int")) return "Numbers only.";
  if (type === "bool") return "Type true or false.";
  return "Enter a value that matches the type.";
}
