import React, { useEffect, useState } from "react"
import { ethers } from "ethers"
import CredentialActions from "./components/CredentialActions.jsx"
import abi from "./abi/CredentialRegistry.json"

export default function DappShell() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState("")

  const contractAddress = import.meta.env.VITE_REGISTRY_ADDRESS

  const connect = async () => {
    if (!window.ethereum) {
      alert("Install MetaMask.")
      return
    }

    const p = new ethers.BrowserProvider(window.ethereum)
    await p.send("eth_requestAccounts", [])

    const s = await p.getSigner()

    setProvider(p)
    setSigner(s)
    setAddress(await s.getAddress())
  }

  // Auto-refresh on account / network change
  useEffect(() => {
    if (!window.ethereum) return

    const handleAcc = (acc) => {
      setAddress(acc?.[0] || "")
      connect()
    }

    const handleChain = () => {
      connect()
    }

    window.ethereum.on("accountsChanged", handleAcc)
    window.ethereum.on("chainChanged", handleChain)

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAcc)
      window.ethereum.removeListener("chainChanged", handleChain)
    }
  }, [])

  return (
    /* Full viewport wrapper */
    <div className="min-h-screen w-full bg-neutral-900 flex justify-center px-4 py-6">
      
      {/* Main app container */}
      <div className="w-full max-w-2xl bg-neutral-800 rounded-xl shadow-lg p-4 sm:p-6">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">

          <h1 className="text-xl sm:text-2xl font-semibold text-white">
            Credential Registry
          </h1>

          {address ? (
            <code
              title={address}
              className="text-sm bg-neutral-700 px-3 py-1 rounded-lg text-green-400 break-all"
            >
              {address.slice(0, 6)}…{address.slice(-4)}
            </code>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 rounded-lg border border-neutral-600 text-white hover:bg-neutral-700 transition"
            >
              Connect Wallet
            </button>
          )}
        </header>

        {/* Main actions */}
        <CredentialActions
          contractAddress={contractAddress}
          abi={abi}
          provider={provider}
          signer={signer}
        />

      </div>
    </div>
  )
}

