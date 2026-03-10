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

  const { payload: updatedOrganization } = await request("/api/organization", {
    method: "PATCH",
    body: JSON.stringify({
      name: "Northstar Credential Lab",
      slug: "northstar-credential-lab",
      sector: "Workforce training",
      website: "https://northstar.example",
      verificationDomain: "http://localhost:5173",
      status: "Pilot",
      description: "A pilot credential issuer for workforce programs.",
    }),
  });
  assert.equal(updatedOrganization.name, "Northstar Credential Lab");
  assert.equal(updatedOrganization.status, "Pilot");

  const { payload: createdCredential, response: createResponse } = await request("/api/credentials", {
    method: "POST",
    body: JSON.stringify({
      templateId: "TPL-101",
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

  const { response: pendingResponse, payload: pendingPayload } = await request("/api/credentials", {
    method: "POST",
    body: JSON.stringify({
      templateId: "TPL-101",
      issuerId: "ISS-3",
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
