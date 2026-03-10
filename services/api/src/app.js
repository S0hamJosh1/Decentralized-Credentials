import express from "express";
import cors from "cors";
import { buildVerificationUrl, readDb, writeDb } from "./store.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function templateCode(templateName) {
  return templateName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function sanitizeOrganization(payload = {}) {
  return {
    name: payload.name?.trim(),
    slug: payload.slug?.trim(),
    sector: payload.sector?.trim(),
    website: payload.website?.trim(),
    verificationDomain: payload.verificationDomain?.trim(),
    status: payload.status?.trim() || "Active",
    description: payload.description?.trim(),
  };
}

function validationError(response, message) {
  response.status(400).json({ error: message });
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_, response) => {
    response.json({ ok: true });
  });

  app.get("/api/bootstrap", async (_, response) => {
    const db = await readDb();
    response.json(db);
  });

  app.get("/api/organization", async (_, response) => {
    const db = await readDb();
    response.json(db.organization);
  });

  app.patch("/api/organization", async (request, response) => {
    const db = await readDb();
    const nextOrganization = sanitizeOrganization({
      ...db.organization,
      ...request.body,
    });

    if (
      !nextOrganization.name ||
      !nextOrganization.slug ||
      !nextOrganization.sector ||
      !nextOrganization.website ||
      !nextOrganization.verificationDomain ||
      !nextOrganization.description
    ) {
      validationError(response, "Missing required organization fields.");
      return;
    }

    db.organization = {
      ...db.organization,
      ...nextOrganization,
    };

    db.credentials = db.credentials.map((credential) => ({
      ...credential,
      organizationId: db.organization.id,
      verificationUrl: credential.verificationUrl || buildVerificationUrl(credential.verificationCode),
    }));

    const saved = await writeDb(db);
    response.json(saved.organization);
  });

  app.get("/api/templates", async (_, response) => {
    const db = await readDb();
    response.json(db.templates);
  });

  app.post("/api/templates", async (request, response) => {
    const db = await readDb();
    const { name, category, validity, summary } = request.body;

    if (!name || !category || !validity || !summary) {
      validationError(response, "Missing required template fields.");
      return;
    }

    const template = {
      id: nextId("TPL-", db.templates, 100),
      organizationId: db.organization.id,
      name,
      category,
      validity,
      summary,
    };

    db.templates.unshift(template);
    await writeDb(db);
    response.status(201).json(template);
  });

  app.get("/api/issuers", async (_, response) => {
    const db = await readDb();
    response.json(db.issuers);
  });

  app.post("/api/issuers", async (request, response) => {
    const db = await readDb();
    const { name, role, wallet, status } = request.body;

    if (!name || !role || !wallet || !status) {
      validationError(response, "Missing required issuer fields.");
      return;
    }

    const issuer = {
      id: nextId("ISS-", db.issuers),
      organizationId: db.organization.id,
      name,
      role,
      wallet,
      status,
    };

    db.issuers.unshift(issuer);
    await writeDb(db);
    response.status(201).json(issuer);
  });

  app.get("/api/credentials", async (_, response) => {
    const db = await readDb();
    response.json(db.credentials);
  });

  app.post("/api/credentials", async (request, response) => {
    const db = await readDb();
    const {
      templateId,
      issuerId,
      recipientName,
      recipientEmail,
      recipientWallet,
      cohort,
      summary,
    } = request.body;

    if (!templateId || !issuerId || !recipientName || !recipientEmail || !recipientWallet || !cohort || !summary) {
      validationError(response, "Missing required credential fields.");
      return;
    }

    const template = db.templates.find((item) => item.id === templateId);
    const issuer = db.issuers.find((item) => item.id === issuerId);

    if (!template) {
      response.status(404).json({ error: "Template not found." });
      return;
    }

    if (!issuer) {
      response.status(404).json({ error: "Issuer not found." });
      return;
    }

    if (issuer.status !== "Approved") {
      validationError(response, "Only approved issuers can create credentials.");
      return;
    }

    if (issuer.organizationId !== template.organizationId) {
      validationError(response, "Issuer and template must belong to the same organization.");
      return;
    }

    const id = nextId("CRD-", db.credentials, 1000);
    const numericId = id.replace("CRD-", "");
    const verificationCode = `NST-${templateCode(template.name)}-${numericId}`;
    const credential = {
      id,
      organizationId: db.organization.id,
      verificationCode,
      verificationUrl: buildVerificationUrl(verificationCode),
      recipientName,
      recipientEmail,
      recipientWallet,
      templateId,
      templateName: template.name,
      issuerId,
      issuedBy: issuer.name,
      issuedAt: today(),
      status: "Valid",
      cohort,
      summary,
      revokedAt: "",
      revocationReason: "",
    };

    db.credentials.unshift(credential);
    await writeDb(db);
    response.status(201).json(credential);
  });

  app.patch("/api/credentials/:id/revoke", async (request, response) => {
    const db = await readDb();
    const credential = db.credentials.find((item) => item.id === request.params.id);

    if (!credential) {
      response.status(404).json({ error: "Credential not found." });
      return;
    }

    credential.status = "Revoked";
    credential.revokedAt = today();
    credential.revocationReason = request.body?.reason?.trim() || "Revoked by an authorized issuer.";

    await writeDb(db);
    response.json(credential);
  });

  app.get("/api/verify/:code", async (request, response) => {
    const db = await readDb();
    const code = decodeURIComponent(request.params.code).toUpperCase();
    const credential = db.credentials.find((item) => item.verificationCode.toUpperCase() === code);

    if (!credential) {
      response.status(404).json({ error: "Credential not found." });
      return;
    }

    response.json({
      organization: db.organization,
      credential,
    });
  });

  return app;
}
