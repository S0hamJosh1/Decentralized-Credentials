import "dotenv/config";
import { ethers, artifacts } from "hardhat";

async function main() {
  const addr = process.env.REGISTRY_ADDR || "0x9551dB124310CfAef94cfb4Dc71D06ceE9FA2b1b";
  if (!addr) throw new Error("Missing REGISTRY_ADDR in .env");

  const [signer] = await ethers.getSigners();
  const artifact = await artifacts.readArtifact("CredentialRegistry");
  const reg = new ethers.Contract(addr, artifact.abi, signer);

  const me = await signer.getAddress();
  const net = await signer.provider.getNetwork();
  console.log("Network:", Number(net.chainId), "Signer:", me, "Contract:", addr);

  const fns = artifact.abi.map(f => f?.name).filter(Boolean);
  console.log("ABI functions:", fns);

  // Example write (replace with your real fn + args)
  // const tx = await reg.registerCredential("0xYourUserAddress", "QmYourIpfsCid");
  // console.log("tx:", tx.hash);
  // const rcpt = await tx.wait();
  // console.log("mined block:", rcpt.blockNumber);
}

await main();
    