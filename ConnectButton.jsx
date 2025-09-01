import React, { useState } from 'react'
import { ensureSepolia } from '../lib/eth'


export function ConnectButton({ onConnected }){
const [connecting, setConnecting] = useState(false)


const connect = async () => {
if(!window.ethereum){
alert('MetaMask not detected. Install the extension and refresh.')
return
}
try{
setConnecting(true)
await window.ethereum.request({ method: 'eth_requestAccounts' })
await ensureSepolia()
await onConnected?.()
}catch(err){
console.error(err)
alert(err?.message || 'Failed to connect')
}finally{
setConnecting(false)
}
}


return (
<button onClick={connect} disabled={connecting} style={btn}>
{connecting ? 'Connecting…' : '🔗 Connect Wallet'}
</button>
)
}


const btn = {
border: '1px solid #111827',
background: 'white',
padding: '10px 14px',
borderRadius: 12,
cursor: 'pointer',
fontWeight: 600
}