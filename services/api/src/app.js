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

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

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
