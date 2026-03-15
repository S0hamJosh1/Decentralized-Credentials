import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";

let server;
let baseUrl;
let tempDir;
let cookieJar = "";

async function request(pathname, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (options.useCookie !== false && cookieJar) {
    headers.Cookie = cookieJar;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });

  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()[0]
      : response.headers.get("set-cookie");

  if (setCookie) {
    cookieJar = setCookie.split(";")[0];
  }

  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

try {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "credential-api-"));
  process.env.CREDENTIAL_API_DB_PATH = path.join(tempDir, "db.json");

  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const { response: unauthBootstrapResponse } = await request("/api/bootstrap");
  assert.equal(unauthBootstrapResponse.status, 401);

  const { response: registerResponse, payload: registeredSession } = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Jane Founder",
      workEmail: "jane@acme.example",
      password: "workspace123",
      companyName: "Acme Credential Group",
      companySlug: "acme-credential-group",
      website: "https://acme.example",
      sector: "Corporate learning",
      verificationDomain: "http://localhost:5173",
      role: "Issuer admin",
    }),
  });
  assert.equal(registerResponse.status, 201);
  assert.equal(registeredSession.user.email, "jane@acme.example");
  assert.equal(registeredSession.organization.name, "Acme Credential Group");
  assert.equal(registeredSession.issuer.role, "Issuer admin");
  assert.ok(cookieJar);

  const { response: sessionResponse, payload: currentSession } = await request("/api/auth/session");
  assert.equal(sessionResponse.status, 200);
  assert.equal(currentSession.user.fullName, "Jane Founder");
  assert.equal(currentSession.organization.slug, "acme-credential-group");

  const { response: bootstrapResponse, payload: bootstrap } = await request("/api/bootstrap");
  assert.equal(bootstrapResponse.status, 200);
  assert.equal(bootstrap.organization.name, "Acme Credential Group");
  assert.equal(bootstrap.templates.length, 0);
  assert.equal(bootstrap.credentials.length, 0);
  assert.equal(bootstrap.issuers.length, 1);

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
  assert.equal(createdTemplate.organizationId, registeredSession.organization.id);

  const { payload: createdCredential, response: createResponse } = await request("/api/credentials", {
    method: "POST",
    body: JSON.stringify({
      templateId: createdTemplate.id,
      issuerId: registeredSession.issuer.id,
      recipientName: "Avery Stone",
      recipientEmail: "avery.stone@example.com",
      recipientWallet: "",
      cohort: "Summer 2026",
      summary: "Completed the internship capstone program.",
    }),
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createdCredential.organizationId, registeredSession.organization.id);
  assert.match(createdCredential.verificationUrl, /^\/verify\//);
  assert.match(createdCredential.verificationCode, /^ACL-EMP-1001$/);

  const { payload: verifyPayload, response: verifyResponse } = await request(
    `/api/verify/${createdCredential.verificationCode}`,
    { useCookie: false }
  );
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyPayload.credential.id, createdCredential.id);
  assert.equal(verifyPayload.organization.name, "Acme Credential Lab");

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
      email: "blocked@acme.example",
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
      recipientWallet: "",
      cohort: "Summer 2026",
      summary: "Should not be created.",
    }),
  });
  assert.equal(pendingResponse.status, 400);
  assert.equal(pendingPayload.error, "Only approved issuers can create credentials.");

  const { response: logoutResponse } = await request("/api/auth/logout", {
    method: "POST",
  });
  assert.equal(logoutResponse.status, 204);

  const { response: loggedOutBootstrapResponse } = await request("/api/bootstrap");
  assert.equal(loggedOutBootstrapResponse.status, 401);

  cookieJar = "";
  const { response: loginResponse, payload: loggedInSession } = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      workEmail: "jane@acme.example",
      password: "workspace123",
    }),
    useCookie: false,
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loggedInSession.organization.name, "Acme Credential Lab");
  assert.ok(cookieJar);

  const { response: reloggedBootstrapResponse } = await request("/api/bootstrap");
  assert.equal(reloggedBootstrapResponse.status, 200);

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
