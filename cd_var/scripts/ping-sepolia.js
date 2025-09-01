import "dotenv/config";
import hre from "hardhat";

async function main() {
  const addr = process.env.REGISTRY_ADDR || "0x9551dB124310CfAef94cfb4Dc71D06ceE9FA2b1b";
  if (!addr) throw new Error("Missing REGISTRY_ADDR in .env");

  const { ethers } = hre;                    // <-- get ethers from hre
  const [signer] = await ethers.getSigners();

  const net = await signer.provider.getNetwork();
  const code = await ethers.provider.getCode(addr);
  const block = await signer.provider.getBlockNumber();

  console.log("ChainId:", Number(net.chainId)); // expect 11155111
  console.log("Block:", block);
  console.log("Contract:", addr);
  console.log("Bytecode length:", code.length, code !== "0x" ? "(CONTRACT FOUND)" : "(NO CONTRACT)");
}
await main();
