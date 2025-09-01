import "dotenv/config";
import hre from "hardhat";

async function main() {
  const addr = process.env.REGISTRY_ADDR || "0x9551dB124310CfAef94cfb4Dc71D06ceE9FA2b1b";
  if (!addr) throw new Error("Missing REGISTRY_ADDR in .env");

  const { ethers, artifacts } = hre;         // <-- from hre
  const artifact = await artifacts.readArtifact("CredentialRegistry");
  const [signer] = await ethers.getSigners();

  console.log("Contract:", addr);
  const reg = new ethers.Contract(addr, artifact.abi, signer);

  console.log("ABI functions:", artifact.abi.map(f => f?.name).filter(Boolean));
  if (typeof reg.owner === "function") {
    console.log("owner():", await reg.owner());
  }
}
await main();
