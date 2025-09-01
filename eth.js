export async function getProvider(){
if(!window.ethereum) throw new Error('MetaMask not detected')
const { ethers } = await import('ethers')
return new ethers.BrowserProvider(window.ethereum)
}


export async function getSigner(provider){
const s = await provider.getSigner()
return s
}


export async function ensureSepolia(){
const sepoliaParams = {
chainId: '0xaa36a7', // 11155111
chainName: 'Sepolia',
nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
rpcUrls: ['https://rpc.sepolia.org'],
blockExplorerUrls: ['https://sepolia.etherscan.io']
}
try{
await window.ethereum.request({
method: 'wallet_switchEthereumChain',
params: [{ chainId: sepoliaParams.chainId }]
})
}catch(switchError){
// If the chain is not added, add it
if(switchError.code === 4902){
await window.ethereum.request({
method: 'wallet_addEthereumChain',
params: [sepoliaParams]
})
} else {
throw switchError
}
}
}