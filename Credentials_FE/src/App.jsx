// src/App.jsx
import React, { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { ConnectButton } from './components/ConnectButton'
import { FunctionRunner } from './components/FunctionRunner'
import { getProvider, getSigner } from './lib/eth'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config/contract'
import CredentialActions from './components/CredentialActions'

export default function App() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [networkOk, setNetworkOk] = useState(false)

  const iface = useMemo(() => new ethers.Interface(CONTRACT_ABI), [])

  const handleConnected = async () => {
    const p = await getProvider()
    setProvider(p)
    const s = await getSigner(p)
    setSigner(s)
    const addr = await s.getAddress()
    setAccount(addr)

    const net = await p.getNetwork()
    setNetworkOk(net.chainId === 11155111n) // Sepolia
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, padding: 24, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    }}>
      <header style={{maxWidth: 920, width: '100%'}}>
        <h1 style={{fontSize: 28, marginBottom: 4}}>🪪 Credential Registry </h1>
        <p style={{opacity: 0.8}}>React + Vite + ethers v6 • Network: Sepolia (11155111)</p>
      </header>

      <section style={{display:'flex', gap:12, alignItems:'center', width:'100%', maxWidth:920}}>
        <ConnectButton onConnected={handleConnected} />
        <div style={{fontSize:14}}>
          {account ? <>
            <div><strong>Account:</strong> {account}</div>
            <div><strong>Contract:</strong> {CONTRACT_ADDRESS}</div>
            <div><strong>Network OK:</strong> {networkOk ? '✅ Sepolia' : '❌ Not Sepolia'}</div>
          </> : <span>Connect wallet to begin.</span>}
        </div>
      </section>

      <main style={{width: '100%', maxWidth: 920}}>
        <InfoCard />

        {/* Quick task-focused UI: Issue + Verify (no manual bytes32) */}
        <CredentialActions
          contractAddress={CONTRACT_ADDRESS}
          abi={CONTRACT_ABI}
          provider={provider}
          signer={signer}
        />

        {/* Full power tool for any ABI function */}
        <FunctionRunner
          iface={iface}
          contractAddress={CONTRACT_ADDRESS}
          abi={CONTRACT_ABI}
          provider={provider}
          signer={signer}
        />
      </main>

      <footer style={{marginTop: 'auto', opacity: 0.6}}>Made for cd_var • You can customize UI later</footer>
    </div>
  )
}

function InfoCard(){
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 16,
      background: '#fafafa'
    }}>
      <h2 style={{marginTop:0}}>How this template works</h2>
      <ol style={{marginTop:8}}>
        <li>Click <b>Connect Wallet</b> (MetaMask) → we ensure Sepolia.</li>
        <li>Replace the <code>CONTRACT_ADDRESS</code> and <code>CONTRACT_ABI</code> in <code>src/config/contract.js</code> with your deployed contract values.</li>
        <li>Use the <b>Function Runner</b> below to call <i>any</i> function from your ABI (reads & writes).</li>
      </ol>
      <p style={{marginTop:8}}>
        The <b>Quick Actions</b> above give you friendlier forms for common flows like
        <i> issueCredential()</i> and <i>verifyCredential()</i> (we auto-hash your text to bytes32).
      </p>
    </div>
  )
}
