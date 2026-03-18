const { ethers } = require("hardhat");

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const contractAddress = requireEnv("SEPOLIA_CONTRACT_ADDRESS");
  const issuerWallet = requireEnv("ISSUER_WALLET_TO_APPROVE");
  const approvalFlag = String(process.env.ISSUER_APPROVED || "true").trim().toLowerCase() !== "false";

  if (!ethers.isAddress(contractAddress)) {
    throw new Error("SEPOLIA_CONTRACT_ADDRESS must be a valid Ethereum address.");
  }

  if (!ethers.isAddress(issuerWallet)) {
    throw new Error("ISSUER_WALLET_TO_APPROVE must be a valid Ethereum address.");
  }

  const contract = await ethers.getContractAt("CredentialRegistry", contractAddress);
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const contractOwner = await contract.owner();

  if (signerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
    throw new Error(
      `The connected signer ${signerAddress} is not the contract owner ${contractOwner}. Set SEPOLIA_PRIVATE_KEY to the owner wallet before updating issuer approvals.`
    );
  }

  const tx = await contract.updateIssuerApproval(issuerWallet, approvalFlag);
  const receipt = await tx.wait();

  console.log(`Issuer approval updated for ${issuerWallet}.`);
  console.log(`Approved: ${approvalFlag}`);
  console.log(`Transaction hash: ${receipt?.hash || tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
