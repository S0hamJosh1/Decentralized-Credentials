import { normalizeWalletAddress, SEPOLIA_CHAIN_ID } from "./blockchain";

export const CREDENTIAL_REGISTRY_ABI = [
  "function updateIssuerApproval(address issuer, bool approved)",
  "function issueCredential(string credentialId, bytes32 credentialHash, string verificationCode, string templateId)",
  "function revokeCredential(string credentialId)",
  "function getCredentialRecord(string credentialId) view returns (bytes32 credentialHash, address issuer, uint64 issuedAt, uint64 revokedAt, string verificationCode, string templateId, bool exists)",
  "function approvedIssuers(address issuer) view returns (bool)",
];

export const SEPOLIA_CONTRACT_ADDRESS = import.meta.env.VITE_SEPOLIA_CONTRACT_ADDRESS || "";

function requireMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available in this browser.");
  }

  return window.ethereum;
}

async function getProviderAndSigner() {
  const { BrowserProvider } = await import("ethers");
  const provider = new BrowserProvider(requireMetaMask());
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error("Switch MetaMask to Sepolia before sending this transaction.");
  }

  return { provider, signer, network };
}

function requireConfiguredContract() {
  if (!SEPOLIA_CONTRACT_ADDRESS) {
    throw new Error("Set VITE_SEPOLIA_CONTRACT_ADDRESS to enable Sepolia anchoring.");
  }

  return SEPOLIA_CONTRACT_ADDRESS;
}

export function isSepoliaContractConfigured() {
  return Boolean(SEPOLIA_CONTRACT_ADDRESS);
}

export async function issueCredentialOnSepolia(credential) {
  const { Contract } = await import("ethers");
  const contractAddress = requireConfiguredContract();
  const { signer, network } = await getProviderAndSigner();
  const contract = new Contract(contractAddress, CREDENTIAL_REGISTRY_ABI, signer);
  const tx = await contract.issueCredential(
    credential.id,
    credential.credentialHash,
    credential.verificationCode,
    credential.templateId
  );
  const receipt = await tx.wait();

  return {
    issuerWallet: normalizeWalletAddress(await signer.getAddress()),
    chainId: String(network.chainId),
    network: "Sepolia",
    contractAddress,
    txHash: receipt?.hash || tx.hash,
    blockNumber: String(receipt?.blockNumber || ""),
  };
}

export async function revokeCredentialOnSepolia(credentialId) {
  const { Contract } = await import("ethers");
  const contractAddress = requireConfiguredContract();
  const { signer, network } = await getProviderAndSigner();
  const contract = new Contract(contractAddress, CREDENTIAL_REGISTRY_ABI, signer);
  const tx = await contract.revokeCredential(credentialId);
  const receipt = await tx.wait();

  return {
    issuerWallet: normalizeWalletAddress(await signer.getAddress()),
    chainId: String(network.chainId),
    network: "Sepolia",
    contractAddress,
    txHash: receipt?.hash || tx.hash,
    blockNumber: String(receipt?.blockNumber || ""),
  };
}
