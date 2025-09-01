import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

describe("CredentialRegistry", function () {
  async function deploy() {
    const [deployer, holder, rando, newIssuer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, deployer, holder, rando, newIssuer };
  }

  const h = (obj: any) => keccak256(toUtf8Bytes(JSON.stringify(obj)));

  it("deployer is owner + issuer", async () => {
    const { registry, deployer } = await deploy();
    expect(await registry.owner()).to.equal(deployer.address);
    expect(await registry.isIssuer(deployer.address)).to.equal(true);
  });

  it("issue → verify true", async () => {
    const { registry, holder } = await deploy();
    const hash = h({ type: "CourseCompletion", course: "CS101", name: "Soham" });
    await expect(registry.issueCredential(holder.address, hash))
      .to.emit(registry, "CredentialIssued");
    expect(await registry.verifyCredential(holder.address, hash)).to.equal(true);
  });

  it("revoke → verify false", async () => {
    const { registry, holder } = await deploy();
    const hash = h({ type: "Badge", id: "badge-1" });
    await registry.issueCredential(holder.address, hash);
    expect(await registry.verifyCredential(holder.address, hash)).to.equal(true);
    await expect(registry.revokeCredential(holder.address, hash))
      .to.emit(registry, "CredentialRevoked");
    expect(await registry.verifyCredential(holder.address, hash)).to.equal(false);
  });

  it("non-issuer cannot issue/revoke", async () => {
    const { registry, holder, rando } = await deploy();
    const hash = h({ foo: "bar" });
    await expect(
      registry.connect(rando).issueCredential(holder.address, hash)
    ).to.be.revertedWith("not issuer");
    await expect(
      registry.connect(rando).revokeCredential(holder.address, hash)
    ).to.be.revertedWith("not issuer");
  });

  it("owner can add a new issuer who can issue", async () => {
    const { registry, holder, newIssuer } = await deploy();
    await expect(registry.addIssuer(newIssuer.address))
      .to.emit(registry, "IssuerAdded").withArgs(newIssuer.address);
    const hash = h({ t: "VC", n: 1 });
    await registry.connect(newIssuer).issueCredential(holder.address, hash);
    expect(await registry.verifyCredential(holder.address, hash)).to.equal(true);
  });

  it("cannot double-issue same hash to same holder", async () => {
    const { registry, holder } = await deploy();
    const hash = h({ x: 1 });
    await registry.issueCredential(holder.address, hash);
    await expect(
      registry.issueCredential(holder.address, hash)
    ).to.be.revertedWith("already issued");
  });
});
