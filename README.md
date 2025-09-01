--> Decentralized Credential DApp
A full-stack decentralized application (DApp) for issuing, verifying, and revoking digital credentials on the **Ethereum Sepolia testnet**. Built with **Solidity (Hardhat)** for the smart contracts and **React + Vite + ethers.js** for the frontend.

---

---> Project Structure
Decentralized-Credentials/
├── cd_var/ # Backend (Hardhat smart contracts + scripts)
│ ├── contracts/ # Solidity smart contracts
│ ├── scripts/ # Deployment & interaction scripts
│ ├── test/ # (Optional) contract tests
│ ├── package.json # Backend dependencies
│ └── hardhat.config.cjs
│
└── Credential_FE/ # Frontend (React + Vite)
├── src/ # React components & logic
├── vite.config.js # Vite configuration
├── index.html # Entry point
├── package.json # Frontend dependencies
└── .gitignore

---

--> Features
- Smart contracts for credential issuance, verification, and revocation.
-  Hardhat development environment with deployment & testing scripts.  
- React + Vite frontend with ethers.js for Ethereum interaction.  
-  Works on the Ethereum Sepolia testnet.  

---

--> Tech Stack
- Solidity — Smart contract language  
- Hardhat — Ethereum development framework  
- React + Vite — Frontend framework & bundler  
- ethers.js — Ethereum wallet & contract interaction  
- Node.js + npm — Package & dependency management  

---

----> start
--> Clone the repository 
```bash
git clone https://github.com/S0hamJosh1/Decentralized-Credentials.git
cd Decentralized-Credentials

---

--> backend setup
cd cd_var
npm install

Create a .env file in cd_var/:

SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

compile contracts:

npx hardhat compile

deply to sepolia:

npx hardhat run scripts/deploy.ts --network sepolia

---

--> front-end setup

cd Credential_FE
npm install
npm run dev

This will start the frontend on http://localhost:5173

---

License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Acknowledgements

Hardhat
Ethers.js
React
Vite

