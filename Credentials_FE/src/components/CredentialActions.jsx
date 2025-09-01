// src/components/CredentialActions.jsx
import React, { useState } from "react"
import { ethers } from "ethers"

export default function CredentialActions({ contractAddress, abi, provider, signer }) {
  const [holder, setHolder] = useState("")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [txHash, setTxHash] = useState("")

  const hashFromText = () => {
    try {
      if (!text.trim()) return ""
      return ethers.keccak256(ethers.toUtf8Bytes(text.trim()))
    } catch {
      return ""
    }
  }

  const isAddress = (addr) => {
    try { return ethers.isAddress(addr) } catch { return false }
  }

  const ensureReady = (needSigner = false) => {
    if (!provider) { setMessage("Connect wallet first."); return false }
    if (!isAddress(holder)) { setMessage("Enter a valid holder address."); return false }
    if (!text.trim()) { setMessage("Enter credential text."); return false }
    if (needSigner && !signer) { setMessage("No signer found. Reconnect wallet."); return false }
    return true
  }

  const issue = async () => {
    if (!ensureReady(true)) return
    setLoading(true); setMessage(""); setTxHash("")
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer)
      const tx = await contract.issueCredential(holder.trim(), hashFromText())
      setTxHash(tx.hash)
      const rec = await tx.wait()
      setMessage(`✅ Issued (block ${rec.blockNumber})`)
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    if (!ensureReady(false)) return
    setLoading(true); setMessage(""); setTxHash("")
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider)
      const ok = await contract.verifyCredential(holder.trim(), hashFromText())
      setMessage(ok ? "✅ Valid credential" : "❌ Not found / revoked")
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const revoke = async () => {
    if (!ensureReady(true)) return
    setLoading(true); setMessage(""); setTxHash("")
    try {
      const contract = new ethers.Contract(contractAddress, abi, signer)
      const tx = await contract.revokeCredential(holder.trim(), hashFromText())
      setTxHash(tx.hash)
      const rec = await tx.wait()
      setMessage(`🛑 Revoked (block ${rec.blockNumber})`)
    } catch (e) {
      setMessage(e?.reason || e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card}>
      <h2 style={{marginTop:0}}>🎯 Quick Actions</h2>

      <div style={row}>
        <label style={label}>Holder Address</label>
        <input
          style={input}
          placeholder="0x..."
          value={holder}
          onChange={e=>setHolder(e.target.value)}
        />
      </div>

      <div style={row}>
        <label style={label}>Credential Text</label>
        <input
          style={input}
          placeholder='e.g., CS101:Soham'
          value={text}
          onChange={e=>setText(e.target.value)}
        />
      </div>

      <div style={{fontSize:12, opacity:.8, marginTop:6}}>
        bytes32 hash: <code>{hashFromText() || "—"}</code>
      </div>

      <div style={{display:'flex', gap:8, marginTop:12, flexWrap:'wrap'}}>
        <button onClick={issue} disabled={loading} style={btn}>
          {loading ? "Issuing…" : "Issue Credential"}
        </button>
        <button onClick={verify} disabled={loading} style={btn}>
          {loading ? "Checking…" : "Verify Credential"}
        </button>
        <button onClick={revoke} disabled={loading} style={{...btn, borderColor:'#b91c1c', color:'#b91c1c'}}>
          {loading ? "Revoking…" : "Revoke Credential"}
        </button>
      </div>

      {txHash && (
        <p style={{marginTop:8}}>
          Tx:{" "}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash}
          </a>
        </p>
      )}
      {message && <div style={note}>{message}</div>}
    </div>
  )
}

const card = { border:'1px solid #e5e7eb', borderRadius:14, padding:16, marginBottom:16, background:'#f9fafb' }
const row  = { display:'grid', gap:6, marginTop:10 }
const label= { fontWeight:600, fontSize:14 }
const input= { border:'1px solid #d1d5db', padding:'8px 10px', borderRadius:10 }
const btn  = { border:'1px solid #111827', background:'white', padding:'10px 14px', borderRadius:12, cursor:'pointer', fontWeight:600 }
const note = { marginTop:10, padding:'8px 10px', background:'#eef2ff', border:'1px solid #c7d2fe', borderRadius:10 }
