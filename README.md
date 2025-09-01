#  Decentralized Credential DApp

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
