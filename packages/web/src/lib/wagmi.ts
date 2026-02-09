// Wallet utility using ethers.js directly (replaces wagmi for simplicity)
import { ethers } from "ethers";

export const BSC_TESTNET = {
  chainId: 97,
  name: "BSC Testnet",
  rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  explorer: "https://testnet.bscscan.com",
};

export async function connectWallet() {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum : undefined;
  if (!eth) {
    throw new Error("No wallet found. Install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(eth);

  // Request account access
  await provider.send("eth_requestAccounts", []);

  // Switch to BSC Testnet if needed
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: "0x" + BSC_TESTNET.chainId.toString(16) },
    ]);
  } catch (switchError: unknown) {
    // Chain not added, add it
    if ((switchError as { code?: number }).code === 4902) {
      await provider.send("wallet_addEthereumChain", [
        {
          chainId: "0x" + BSC_TESTNET.chainId.toString(16),
          chainName: BSC_TESTNET.name,
          rpcUrls: [BSC_TESTNET.rpc],
          blockExplorerUrls: [BSC_TESTNET.explorer],
          nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
        },
      ]);
    }
  }

  const signer = await provider.getSigner();
  return { provider, signer, address: await signer.getAddress() };
}
