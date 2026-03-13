import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { createIssuer, listIssuers } from "../services/issuer-service.js";

export function createIssuerRouter() {
  const router = Router();

  router.get(
    "/api/issuers",
    asyncHandler(async (_, response) => {
      response.json(await listIssuers());
    })
  );

  router.post(
    "/api/issuers",
    asyncHandler(async (request, response) => {
      const issuer = await createIssuer(request.body);
      response.status(201).json(issuer);
    })
  );

  return router;
}
