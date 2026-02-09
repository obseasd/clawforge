// Wallet utility using ethers.js directly (replaces wagmi for simplicity)
import { ethers } from "ethers";

export const BSC_MAINNET = {
  chainId: 56,
  name: "BNB Smart Chain",
  rpc: "https://bsc-dataseed.binance.org/",
  explorer: "https://bscscan.com",
};

// Keep alias for backward compat in imports
export const BSC_TESTNET = BSC_MAINNET;

export async function connectWallet() {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum : undefined;
  if (!eth) {
    throw new Error("No wallet found. Install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(eth);

  // Request account access
  await provider.send("eth_requestAccounts", []);

  // Switch to BSC Mainnet if needed
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: "0x" + BSC_MAINNET.chainId.toString(16) },
    ]);
  } catch (switchError: unknown) {
    // Chain not added, add it
    if ((switchError as { code?: number }).code === 4902) {
      await provider.send("wallet_addEthereumChain", [
        {
          chainId: "0x" + BSC_MAINNET.chainId.toString(16),
          chainName: BSC_MAINNET.name,
          rpcUrls: [BSC_MAINNET.rpc],
          blockExplorerUrls: [BSC_MAINNET.explorer],
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        },
      ]);
    }
  }

  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}
