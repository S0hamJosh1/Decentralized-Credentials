## Decentralized Credential DApp

A full-stack decentralized app for **issuing, verifying, and revoking** digital credentials on the **Ethereum Sepolia** testnet.  
Smart contracts with **Solidity + Hardhat** and a **React (Vite) + ethers.js** frontend.

---

##  Project Structure

```text
Decentralized-Credentials/
├─ cd_var/                    # Backend (Hardhat)
│  ├─ contracts/              # Solidity contracts
│  ├─ scripts/                # Deploy & interaction scripts
│  ├─ test/                   # Contract tests (TS/JS)
│  ├─ package.json
│  ├─ hardhat.config.cjs
│  └─ tsconfig.json
└─ Credentials_FE/            # Frontend (React + Vite)
   ├─ src/
   │  ├─ components/          # UI components
   │  ├─ config/              # CONTRACT_ABI + address
   │  └─ lib/                 # ethers helpers (provider/signer)
   ├─ index.html
   ├─ vite.config.js
   └─ package.json
```

---

 ## Features

- Smart contracts for credential issuance, verification, and revocation
- Hardhat dev environment with compile/deploy scripts
- React + Vite frontend with ethers.js for Ethereum interaction
- Works on the Ethereum Sepolia testnet

---

 ## Tech Stack

- Solidity, Hardhat
- React, Vite, ethers.js
- Node.js, npm

---

 ## Getting started 
 ### 1) clone
 ```text
 git clone https://github.com/S0hamJosh1/Decentralized-Credentials.git
 cd Decentralized-Credentials
```
### 2) Backend setup(cd_var)
```text
cd cd_var
npm install
```
#### Create .env file in cd_var
```text
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```
#### compile and deploy

```text
npx hardhat compile
# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```
### 3) frontend setup
```text
cd ../Credentials_FE
npm install
```
#### create .env in Credentials_FE
```text
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
# Optional if you read from RPC without wallet:
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/yourApiKey
```
#### start dev server:

```text
npm run dev
```
#### Visit: http://localhost:5173 (default or check your terminal output)

### Security & Repo Hygiene

- Never commit .env, node_modules, artifacts, cache.
- Contract ABI and addresses in the frontend are OK; keep private keys and RPC keys in .env.
- Example .gitignore lines:
  ```text
  .env
  node_modules/
  artifacts/
  cache/
  dist/
  build/
  ```
 ---

 ## License 
 - This project is licensed under the MIT License. See the LICENSE file.

 ## Acknowledgements 
 - Hardhat
 - Ethers.js
 - React
 - Vite




