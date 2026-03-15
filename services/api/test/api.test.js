import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";

let server;
let baseUrl;
let tempDir;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json();
  return { response, payload };
}

try {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "credential-api-"));
  process.env.CREDENTIAL_API_DB_PATH = path.join(tempDir, "db.json");

  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const { response: bootstrapResponse, payload: bootstrap } = await request("/api/bootstrap");
  assert.equal(bootstrapResponse.status, 200);
  assert.equal(bootstrap.organization.id, "ORG-1001");
  assert.ok(bootstrap.templates.every((item) => item.organizationId === bootstrap.organization.id));
  assert.ok(bootstrap.credentials.every((item) => item.organizationId === bootstrap.organization.id));

  const { response: setupResponse, payload: workspaceSetup } = await request("/api/workspace/setup", {
    method: "POST",
    body: JSON.stringify({
      companyName: "Acme Credential Group",
      companySlug: "acme-credential-group",
      website: "https://acme.example",
      sector: "Corporate learning",
      verificationDomain: "http://localhost:5173",
      fullName: "Jane Founder",
      workEmail: "jane@acme.example",
      role: "Issuer admin",
    }),
  });
  assert.equal(setupResponse.status, 201);
  assert.equal(workspaceSetup.organization.name, "Acme Credential Group");
  assert.equal(workspaceSetup.templates.length, 0);
  assert.equal(workspaceSetup.credentials.length, 0);
  assert.equal(workspaceSetup.issuer.email, "jane@acme.example");

  const { payload: updatedOrganization } = await request("/api/organization", {
    method: "PATCH",
    body: JSON.stringify({
      name: "Acme Credential Lab",
      slug: "acme-credential-lab",
      sector: "Corporate learning",
      website: "https://acme.example",
      verificationDomain: "http://localhost:5173",
      status: "Pilot",
      description: "A pilot credential issuer for internal learning programs.",
    }),
  });
  assert.equal(updatedOrganization.name, "Acme Credential Lab");
  assert.equal(updatedOrganization.status, "Pilot");

  const { payload: createdTemplate, response: templateResponse } = await request("/api/templates", {
    method: "POST",
    body: JSON.stringify({
      name: "Employee Completion",
      category: "Learning",
      validity: "Permanent",
      summary: "Confirms an employee completed required training.",
    }),
  });
  assert.equal(templateResponse.status, 201);
  assert.equal(createdTemplate.organizationId, "ORG-1001");

  const { payload: createdCredential, response: createResponse } = await request("/api/credentials", {
    method: "POST",
    body: JSON.stringify({
      templateId: createdTemplate.id,
      issuerId: "ISS-1",
      recipientName: "Avery Stone",
      recipientEmail: "avery.stone@example.com",
      recipientWallet: "0x1111111111111111111111111111111111111111",
      cohort: "Summer 2026",
      summary: "Completed the internship capstone program.",
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createdCredential.organizationId, "ORG-1001");
  assert.match(createdCredential.verificationUrl, /^\/verify\//);

  const { payload: verifyPayload, response: verifyResponse } = await request(`/api/verify/${createdCredential.verificationCode}`);
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyPayload.credential.id, createdCredential.id);
  assert.equal(verifyPayload.organization.id, "ORG-1001");

  const { payload: revokedCredential } = await request(`/api/credentials/${createdCredential.id}/revoke`, {
    method: "PATCH",
    body: JSON.stringify({ reason: "Issued to the wrong cohort." }),
  });
  assert.equal(revokedCredential.status, "Revoked");
  assert.equal(revokedCredential.revocationReason, "Issued to the wrong cohort.");
  assert.ok(revokedCredential.revokedAt);

  const { payload: pendingIssuer, response: pendingIssuerResponse } = await request("/api/issuers", {
    method: "POST",
    body: JSON.stringify({
      name: "Blocked Issuer",
      role: "Operations",
      wallet: "blocked@acme.example",
      status: "Pending",
    }),
  });
  assert.equal(pendingIssuerResponse.status, 201);

  const { response: pendingResponse, payload: pendingPayload } = await request("/api/credentials", {
    method: "POST",
    body: JSON.stringify({
      templateId: createdTemplate.id,
      issuerId: pendingIssuer.id,
      recipientName: "Blocked User",
      recipientEmail: "blocked@example.com",
      recipientWallet: "0x2222222222222222222222222222222222222222",
      cohort: "Summer 2026",
      summary: "Should not be created.",
    }),
  });
  assert.equal(pendingResponse.status, 400);
  assert.equal(pendingPayload.error, "Only approved issuers can create credentials.");

  console.log("API assertions passed.");
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }

  delete process.env.CREDENTIAL_API_DB_PATH;
}
