import "dotenv/config";
import { JsonRpcProvider } from "ethers";

async function main() {
  const addr = process.env.REGISTRY_ADDR || "0x9551dB124310CfAef94cfb4Dc71D06ceE9FA2b1b";
  const rpc  = process.env.SEPOLIA_RPC_URL;
  if (!rpc) throw new Error("SEPOLIA_RPC_URL missing in .env");
  if (!addr) throw new Error("REGISTRY_ADDR missing in .env");

  const provider = new JsonRpcProvider(rpc);

  const net   = await provider.getNetwork();
  const block = await provider.getBlockNumber();
  const code  = await provider.getCode(addr);

  console.log("ChainId:", Number(net.chainId));   // expect 11155111 for Sepolia
  console.log("Block:", block);
  console.log("Contract:", addr);
  console.log(
    "Bytecode length:",
    code.length,
    code !== "0x" ? "(CONTRACT FOUND)" : "(NO CONTRACT AT ADDRESS)"
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
