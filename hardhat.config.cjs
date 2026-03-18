require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

function normalizePrivateKey(value = "") {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

const sepoliaRpcUrl = String(process.env.SEPOLIA_RPC_URL || "").trim();
const sepoliaPrivateKey = normalizePrivateKey(process.env.SEPOLIA_PRIVATE_KEY);

const config = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
    cache: "./.hardhat/cache",
    artifacts: "./.hardhat/artifacts",
  },
  networks: {
    hardhat: {},
  },
};

if (sepoliaRpcUrl && sepoliaPrivateKey) {
  config.networks.sepolia = {
    url: sepoliaRpcUrl,
    accounts: [sepoliaPrivateKey],
  };
}

module.exports = config;
