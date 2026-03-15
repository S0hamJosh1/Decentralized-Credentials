import express from "express";
import cors from "cors";
import { sendError } from "./lib/http.js";
import { createAuthRouter } from "./routes/auth-routes.js";
import { createBootstrapRouter } from "./routes/bootstrap-routes.js";
import { createCredentialRouter } from "./routes/credential-routes.js";
import { createHealthRouter } from "./routes/health-routes.js";
import { createIssuerRouter } from "./routes/issuer-routes.js";
import { createOrganizationRouter } from "./routes/organization-routes.js";
import { createTeamRouter } from "./routes/team-routes.js";
import { createTemplateRouter } from "./routes/template-routes.js";
import { createVerifyRouter } from "./routes/verify-routes.js";

function getAllowedOrigins() {
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];
}

function buildCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0) {
        callback(new Error("This origin is not allowed to access the API."), false);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
  };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "1mb" }));

  app.use(createHealthRouter());
  app.use(createAuthRouter());
  app.use(createBootstrapRouter());
  app.use(createOrganizationRouter());
  app.use(createTeamRouter());
  app.use(createTemplateRouter());
  app.use(createIssuerRouter());
  app.use(createCredentialRouter());
  app.use(createVerifyRouter());

  app.use((error, _, response, __) => {
    sendError(response, error);
  });

  return app;
}
