const path = require("node:path");
const { mkdir, writeFile } = require("node:fs/promises");
const { ethers } = require("hardhat");

function normalizeAddress(value = "") {
  return String(value || "").trim();
}

async function writeDeploymentFile(payload) {
  const outputDir = path.resolve(process.cwd(), "deployments", payload.network);
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "credential-registry.json");
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return outputPath;
}

async function main() {
  const requestedOwner = normalizeAddress(process.env.SEPOLIA_OWNER_ADDRESS);
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const initialOwner = requestedOwner || deployerAddress;

  if (!ethers.isAddress(initialOwner)) {
    throw new Error("SEPOLIA_OWNER_ADDRESS must be a valid Ethereum address.");
  }

  const factory = await ethers.getContractFactory("CredentialRegistry");
  const contract = await factory.deploy(initialOwner);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const network = await ethers.provider.getNetwork();
  const deployment = {
    network: "sepolia",
    chainId: String(network.chainId),
    contractAddress,
    deployer: deployerAddress,
    owner: initialOwner,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = await writeDeploymentFile(deployment);

  console.log("CredentialRegistry deployed.");
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Owner address: ${initialOwner}`);
  console.log(`Deployment file: ${outputPath}`);
  if (initialOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
    console.log(
      "Note: issuer approval updates must be signed by the contract owner wallet, so set SEPOLIA_PRIVATE_KEY to that owner before running contracts:approve:issuer."
    );
  }
  console.log("Next steps:");
  console.log(`1. Put ${contractAddress} into apps/web/.env.local as VITE_SEPOLIA_CONTRACT_ADDRESS.`);
  console.log(`2. Put ${contractAddress} into apps/api/.env as SEPOLIA_CONTRACT_ADDRESS.`);
  console.log("3. Approve issuer wallets on-chain before attempting Sepolia issuance.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
