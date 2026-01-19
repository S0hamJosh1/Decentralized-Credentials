import React, { useEffect, useState } from "react"
import { ethers } from "ethers"
import CredentialActions from "./components/CredentialActions.jsx"
import abi from "./abi/CredentialRegistry.json"   // adjust path if needed

export default function DappShell() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState("")
  const contractAddress = import.meta.env.VITE_REGISTRY_ADDRESS

  const connect = async () => {
    if (!window.ethereum) return alert("Install MetaMask.")
    const p = new ethers.BrowserProvider(window.ethereum)
    await p.send("eth_requestAccounts", [])
    const s = await p.getSigner()
    setProvider(p)
    setSigner(s)
    setAddress(await s.getAddress())
  }

  // refresh when user switches account/network
  useEffect(() => {
    if (!window.ethereum) return
    const handleAcc = (acc) => { setAddress(acc?.[0] || ""); connect() }
    const handleChain = () => { connect() }
    window.ethereum.on?.("accountsChanged", handleAcc)
    window.ethereum.on?.("chainChanged", handleChain)
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAcc)
      window.ethereum.removeListener?.("chainChanged", handleChain)
    }
  }, [])

  return (
    <div style={{maxWidth:720, margin:"24px auto", padding:"0 16px"}}>
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
        <h1 style={{margin:0}}>Credential Registry</h1>
        {address ? (
          <code title={address}>{address.slice(0,6)}…{address.slice(-4)}</code>
        ) : (
          <button onClick={connect} style={{padding:"10px 14px", border:"1px solid #111", borderRadius:12}}>
            Connect Wallet
          </button>
        )}
      </header>

      <CredentialActions
        contractAddress={contractAddress}
        abi={abi}
        provider={provider}
        signer={signer}
      />
    </div>
  )
}
