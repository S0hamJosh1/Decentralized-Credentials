import assert from "node:assert/strict";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function deploy() {
  const [deployer, holder, rando, newIssuer] = await ethers.getSigners();
  const registry = await ethers.deployContract("CredentialRegistry");
  await registry.waitForDeployment();
  return { registry, deployer, holder, rando, newIssuer };
}

const hashCredential = (value) => keccak256(toUtf8Bytes(JSON.stringify(value)));

const { registry: ownerRegistry, deployer } = await deploy();
assert.equal(await ownerRegistry.owner(), deployer.address);
assert.equal(await ownerRegistry.isIssuer(deployer.address), true);

const { registry: issuedRegistry, holder: issuedHolder } = await deploy();
const issuedHash = hashCredential({ type: "CourseCompletion", course: "CS101", name: "Soham" });
await (await issuedRegistry.issueCredential(issuedHolder.address, issuedHash)).wait();
assert.equal(await issuedRegistry.verifyCredential(issuedHolder.address, issuedHash), true);

const { registry: revokedRegistry, holder: revokedHolder } = await deploy();
const revokedHash = hashCredential({ type: "Badge", id: "badge-1" });
await (await revokedRegistry.issueCredential(revokedHolder.address, revokedHash)).wait();
await (await revokedRegistry.revokeCredential(revokedHolder.address, revokedHash)).wait();
assert.equal(await revokedRegistry.verifyCredential(revokedHolder.address, revokedHash), false);

const { registry: restrictedRegistry, holder: restrictedHolder, rando } = await deploy();
const restrictedHash = hashCredential({ foo: "bar" });
await assert.rejects(
  restrictedRegistry.connect(rando).issueCredential(restrictedHolder.address, restrictedHash),
  /not issuer/
);
await assert.rejects(
  restrictedRegistry.connect(rando).revokeCredential(restrictedHolder.address, restrictedHash),
  /not issuer/
);

const { registry: issuerRegistry, holder: issuerHolder, newIssuer } = await deploy();
const issuerHash = hashCredential({ type: "VC", n: 1 });
await (await issuerRegistry.addIssuer(newIssuer.address)).wait();
await (await issuerRegistry.connect(newIssuer).issueCredential(issuerHolder.address, issuerHash)).wait();
assert.equal(await issuerRegistry.verifyCredential(issuerHolder.address, issuerHash), true);

const { registry: duplicateRegistry, holder: duplicateHolder } = await deploy();
const duplicateHash = hashCredential({ x: 1 });
await (await duplicateRegistry.issueCredential(duplicateHolder.address, duplicateHash)).wait();
await assert.rejects(
  duplicateRegistry.issueCredential(duplicateHolder.address, duplicateHash),
  /already issued/
);

console.log("CredentialRegistry assertions passed.");
