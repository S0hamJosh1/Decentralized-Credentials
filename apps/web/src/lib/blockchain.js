export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
export const SEPOLIA_NETWORK_NAME = "Sepolia";
export const ETHERSCAN_SEPOLIA_BASE_URL = "https://sepolia.etherscan.io";

export function normalizeWalletAddress(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function formatWalletAddress(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "-";
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function formatAnchorStatus(status) {
  switch (status) {
    case "Anchored":
      return "Anchored on Sepolia";
    case "RevokedOnChain":
      return "Revoked on Sepolia";
    case "RevokedOffChain":
      return "Revoked off-chain";
    case "ReadyForAnchoring":
      return "Ready for Sepolia anchor";
    case "AwaitingIssuerWallet":
    default:
      return "Awaiting issuer wallet";
  }
}

export function buildSepoliaAddressUrl(address) {
  const normalized = normalizeWalletAddress(address);
  return normalized ? `${ETHERSCAN_SEPOLIA_BASE_URL}/address/${normalized}` : "";
}

export function buildSepoliaTxUrl(txHash) {
  const normalized = String(txHash || "").trim();
  return normalized ? `${ETHERSCAN_SEPOLIA_BASE_URL}/tx/${normalized}` : "";
}
