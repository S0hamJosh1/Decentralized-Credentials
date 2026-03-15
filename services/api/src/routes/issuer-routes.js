import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { createIssuer, listIssuers } from "../services/issuer-service.js";

export function createIssuerRouter() {
  const router = Router();

  router.get(
    "/api/issuers",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await listIssuers(request.auth));
    })
  );

  router.post(
    "/api/issuers",
    requireAuth,
    asyncHandler(async (request, response) => {
      const issuer = await createIssuer(request.auth, request.body);
      response.status(201).json(issuer);
    })
  );

  return router;
}
