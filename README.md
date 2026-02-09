# Decentralized Credential DApp

A full-stack decentralized application for **issuing, verifying, and revoking** digital credentials on the **Ethereum Sepolia** testnet.

Built with **Solidity**, **Hardhat Ignition**, and a **React (Vite) + Tailwind CSS** frontend using **ethers.js v6**.

---

##  Features

- **Smart Contract Registry**: Issue, verify, and revoke credentials on-chain.
- **Modern UI**: Cyber-aesthetic interface built with React, Vite, and Tailwind CSS.
- **Hardhat Ignition**: Streamlined deployment modules.
- **Ethers.js v6**: Robust interaction with Ethereum networks.
- **Sepolia Testnet**: Fully functional on Ethereum's Sepolia network.

---

##  Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, ethers.js
- **Backend**: Solidity, Hardhat, Hardhat Ignition, TypeScript
- **Tools**: Node.js, npm

---

##  Project Structure

```text
Decentralized-Credentials/
├── cd_var/                   # Backend (Hardhat Smart Contracts)
│   ├── contracts/            # Solidity contracts
│   ├── scripts/              # Interaction scripts & Ignition modules
│   ├── test/                 # Contract tests
│   └── hardhat.config.cjs    # Hardhat configuration
└── Credentials_FE/           # Frontend (React Application)
    ├── src/                  # React source code
    ├── vite.config.js        # Vite configuration
    └── tailwind.config.js    # Tailwind configuration
```

---

##  Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- An Ethereum wallet (e.g., MetaMask) with **Sepolia ETH**.

### 1. Clone the Repository

```bash
git clone https://github.com/S0hamJosh1/Decentralized-Credentials.git
cd Decentralized-Credentials
```

### 2. Backend Setup (`cd_var`)

Navigate to the backend directory and install dependencies:

```bash
cd cd_var
npm install
```

#### Configure Environment Variables

Create a `.env` file in `cd_var`:

```env
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### Compile and Deploy

Compile the contracts:

```bash
npx hardhat compile
```

Deploy to Sepolia using Hardhat Ignition:

```bash
# Note: The deployment module is currently located in scripts/deploy.ts
npx hardhat ignition deploy scripts/deploy.ts --network sepolia
```

Save the deployed contract address from the output.

### 3. Frontend Setup (`Credentials_FE`)

Open a new terminal, navigate to the frontend directory, and install dependencies:

```bash
cd ../Credentials_FE
npm install
```

#### Configure Environment Variables

Create a `.env` file in `Credentials_FE`:

```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
# Optional: If you read from RPC without wallet connection
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/yourApiKey
```

#### Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to view the application.

---

##  Usage

1. **Connect Wallet**: Click the "Connect Wallet" button in the top-right corner.
2. **Issue Credential**: Use the "Quick Actions" form to issue a new credential to a wallet address.
3. **Verify Credential**: Check the validity of a credential ID.
4. **Revoke Credential**: Revoke an existing credential.

---

##  Security & Hygiene

- **Never commit `.env` files.**
- Keep your private keys secure.
- The repository is configured to ignore sensitive files (`.env`, `node_modules`, `artifacts`, etc.).

---

##  License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.org/v6/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
