// src/components/FunctionRunner.jsx
import React, { useMemo, useState } from 'react'
import { ethers } from 'ethers'

export function FunctionRunner({ iface, contractAddress, abi, provider, signer }) {
  const [selected, setSelected] = useState('')
  const [args, setArgs] = useState([])
  const [result, setResult] = useState('')
  const [txHash, setTxHash] = useState('')
  const [pending, setPending] = useState(false)

  const fragments = useMemo(() => {
    try {
      return iface.fragments.filter(f => f.type === 'function')
    } catch {
      return []
    }
  }, [iface])

  const frag = useMemo(
    () => fragments.find(f => f.format() === selected),
    [fragments, selected]
  )

  const isView = frag?.stateMutability === 'view' || frag?.stateMutability === 'pure'
  const inputs = frag?.inputs || []

  const onSelect = (val) => {
    setSelected(val)
    const found = fragments.find(f => f.format() === val)
    setArgs(Array(found?.inputs?.length || 0).fill(''))
    setResult('')
    setTxHash('')
  }

  const run = async () => {
    if (!frag) return
    if (!provider) { alert('Connect wallet first'); return }

    try {
      setPending(true)
      const contract = new ethers.Contract(
        contractAddress,
        abi,
        isView ? provider : (signer || provider)
      )
      const parsedArgs = inputs.map((inp, i) => coerce(args[i], inp.type))

      if (isView) {
        const res = await contract[frag.name](...parsedArgs)
        setResult(stringify(res))
      } else {
        const tx = await contract[frag.name](...parsedArgs)
        setTxHash(tx.hash)
        const rec = await tx.wait()
        setResult(`Mined in block ${rec.blockNumber}`)
      }
    } catch (err) {
      console.error(err)
      setResult(err?.reason || err?.message || String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{border:'1px solid #e5e7eb', borderRadius:14, padding:16}}>
      <h2 style={{marginTop:0}}>🛠️ Function Runner</h2>
      {fragments.length === 0 && (
        <p style={{color:'#b91c1c'}}>
          Your ABI is empty or invalid. Replace it in <code>src/config/contract.js</code>.
        </p>
      )}

      <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
        <label><b>Function</b></label>
        <select value={selected} onChange={e => onSelect(e.target.value)} style={select}>
          <option value="">— select —</option>
          {fragments.map(f => {
            const sig = f.format()
            return <option key={sig} value={sig}>{sig}</option>
          })}
        </select>
      </div>

      {frag && (
        <div style={{marginTop:12}}>
          <div style={{display:'grid', gap:8}}>
            {inputs.map((inp, i) => (
              <div key={i} style={{display:'grid', gap:6}}>
                <label>
                  <code>{inp.type}</code> <b>{inp.name || `arg${i}`}</b>
                </label>
                <input
                  style={input}
                  placeholder={`Enter ${inp.type}`}
                  value={args[i] ?? ''}
                  onChange={e => setArgs(a => a.map((v, idx) => idx===i ? e.target.value : v))}
                />
              </div>
            ))}
          </div>

          <button onClick={run} disabled={pending} style={{...btn, marginTop:12}}>
            {pending ? (isView ? 'Reading…' : 'Sending…') : (isView ? 'Call (read)' : 'Send (write)')}
          </button>

          {txHash && (
            <p style={{marginTop:8}}>
              Tx:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}

          {result && (
            <pre style={pre}>{result}</pre>
          )}
        </div>
      )}
    </div>
  )
}

const btn = { border:'1px solid #111827', background:'white', padding:'10px 14px', borderRadius:12, cursor:'pointer', fontWeight:600 }
const select = { border:'1px solid #d1d5db', padding:'8px 10px', borderRadius:10 }
const input = { border:'1px solid #d1d5db', padding:'8px 10px', borderRadius:10 }
const pre = { background:'#0b1020', color:'#e5e7eb', padding:12, borderRadius:10, marginTop:12, overflow:'auto' }

function stringify(v){
  try{
    if (typeof v === 'bigint') return v.toString()
    if (Array.isArray(v)) return JSON.stringify(v.map(x => typeof x === 'bigint' ? x.toString() : x), null, 2)
    if (typeof v === 'object') return JSON.stringify(v, (k,val)=> typeof val==='bigint'? val.toString(): val, 2)
    return String(v)
  }catch{
    return String(v)
  }
}

function coerce(value, type){
  if (type === 'uint256' || type.startsWith('uint') || type.startsWith('int')){
    if (typeof value === 'string' && value.trim() !== '') return value
    return String(value)
  }
  if (type === 'address') return String(value).trim()
  if (type === 'bool') return value === true || String(value).toLowerCase() === 'true'
  // bytes, string, arrays left as-is (string input)
  return value
}
