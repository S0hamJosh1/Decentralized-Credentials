import assert from "node:assert/strict";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function deploy() {
  const [deployer, holder, rando, newIssuer] = await ethers.getSigners();
  const registry = await ethers.deployContract("CredentialRegistry");
  await registry.waitForDeployment();
  return { registry, deployer, holder, rando, newIssuer };
}

const hashCredential = (value: unknown) => keccak256(toUtf8Bytes(JSON.stringify(value)));

describe("CredentialRegistry", () => {
  it("starts with the deployer as owner and issuer", async () => {
    const { registry, deployer } = await deploy();
    assert.equal(await registry.owner(), deployer.address);
    assert.equal(await registry.isIssuer(deployer.address), true);
  });

  it("issues and verifies credentials", async () => {
    const { registry, holder } = await deploy();
    const hash = hashCredential({ type: "CourseCompletion", course: "CS101", name: "Soham" });

    await (await registry.issueCredential(holder.address, hash)).wait();
    assert.equal(await registry.verifyCredential(holder.address, hash), true);
  });

  it("revokes credentials and flips verification to false", async () => {
    const { registry, holder } = await deploy();
    const hash = hashCredential({ type: "Badge", id: "badge-1" });

    await (await registry.issueCredential(holder.address, hash)).wait();
    await (await registry.revokeCredential(holder.address, hash)).wait();

    assert.equal(await registry.verifyCredential(holder.address, hash), false);
  });

  it("blocks non-issuers from issuing or revoking", async () => {
    const { registry, holder, rando } = await deploy();
    const hash = hashCredential({ foo: "bar" });

    await assert.rejects(
      registry.connect(rando).issueCredential(holder.address, hash),
      /not issuer/
    );

    await assert.rejects(
      registry.connect(rando).revokeCredential(holder.address, hash),
      /not issuer/
    );
  });

  it("lets the owner add a new issuer", async () => {
    const { registry, holder, newIssuer } = await deploy();
    const hash = hashCredential({ type: "VC", n: 1 });

    await (await registry.addIssuer(newIssuer.address)).wait();
    await (await registry.connect(newIssuer).issueCredential(holder.address, hash)).wait();

    assert.equal(await registry.verifyCredential(holder.address, hash), true);
  });

  it("prevents double issuance for the same holder and hash", async () => {
    const { registry, holder } = await deploy();
    const hash = hashCredential({ x: 1 });

    await (await registry.issueCredential(holder.address, hash)).wait();

    await assert.rejects(
      registry.issueCredential(holder.address, hash),
      /already issued/
    );
  });
});
