require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-node-test-runner");
require("@nomicfoundation/hardhat-verify");

const networks = {};

if (process.env.SEPOLIA_RPC_URL) {
  networks.sepolia = {
    type: "http",
    url: process.env.SEPOLIA_RPC_URL,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks,
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
};
