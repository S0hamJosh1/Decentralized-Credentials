import { useEffect, useState } from "react";
import {
  normalizeWalletAddress,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_ID_HEX,
  SEPOLIA_NETWORK_NAME,
} from "../lib/blockchain";

function emptyWalletState() {
  return {
    status: "idle",
    account: "",
    chainId: "",
    chainName: "",
    isMetaMaskAvailable: false,
    isSupportedNetwork: false,
    error: "",
  };
}

async function readWalletState(provider) {
  const [accounts, chainIdHex] = await Promise.all([
    provider.request({ method: "eth_accounts" }),
    provider.request({ method: "eth_chainId" }),
  ]);
  const chainId = Number.parseInt(chainIdHex, 16);
  const account = normalizeWalletAddress(accounts?.[0] || "");

  return {
    account,
    chainId: Number.isFinite(chainId) ? String(chainId) : "",
    chainName: Number.isFinite(chainId) && chainId === SEPOLIA_CHAIN_ID ? SEPOLIA_NETWORK_NAME : chainIdHex || "",
    isSupportedNetwork: chainId === SEPOLIA_CHAIN_ID,
  };
}

export function useWalletSession() {
  const [state, setState] = useState(emptyWalletState);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const provider = window.ethereum;

    if (!provider) {
      setState({
        ...emptyWalletState(),
        status: "unavailable",
        isMetaMaskAvailable: false,
      });
      return undefined;
    }

    let cancelled = false;

    const syncWalletState = async () => {
      try {
        const nextWallet = await readWalletState(provider);

        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: nextWallet.account ? "connected" : "idle",
            ...nextWallet,
            isMetaMaskAvailable: true,
            error: "",
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: "error",
            isMetaMaskAvailable: true,
            error: error.message || "Unable to read MetaMask state.",
          }));
        }
      }
    };

    const handleAccountsChanged = (accounts = []) => {
      const account = normalizeWalletAddress(accounts[0] || "");
      setState((current) => ({
        ...current,
        account,
        status: account ? "connected" : "idle",
        error: "",
      }));
    };

    const handleChainChanged = (chainIdHex = "") => {
      const chainId = Number.parseInt(chainIdHex, 16);
      setState((current) => ({
        ...current,
        chainId: Number.isFinite(chainId) ? String(chainId) : "",
        chainName: chainId === SEPOLIA_CHAIN_ID ? SEPOLIA_NETWORK_NAME : chainIdHex || "",
        isSupportedNetwork: chainId === SEPOLIA_CHAIN_ID,
        error: "",
      }));
    };

    syncWalletState();
    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      cancelled = true;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not available in this browser.");
    }

    setState((current) => ({
      ...current,
      status: "connecting",
      error: "",
    }));

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const nextWallet = await readWalletState(window.ethereum);
      setState({
        status: nextWallet.account ? "connected" : "idle",
        ...nextWallet,
        isMetaMaskAvailable: true,
        error: "",
      });
      return nextWallet;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        isMetaMaskAvailable: true,
        error: error.message || "Unable to connect MetaMask.",
      }));
      throw error;
    }
  };

  const switchToSepolia = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not available in this browser.");
    }

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  };

  return {
    ...state,
    connectWallet,
    switchToSepolia,
  };
}
