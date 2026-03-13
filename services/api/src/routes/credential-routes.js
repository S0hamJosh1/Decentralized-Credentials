import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { createCredential, listCredentials, revokeCredential } from "../services/credential-service.js";

export function createCredentialRouter() {
  const router = Router();

  router.get(
    "/api/credentials",
    asyncHandler(async (_, response) => {
      response.json(await listCredentials());
    })
  );

  router.post(
    "/api/credentials",
    asyncHandler(async (request, response) => {
      const credential = await createCredential(request.body);
      response.status(201).json(credential);
    })
  );

  router.patch(
    "/api/credentials/:id/revoke",
    asyncHandler(async (request, response) => {
      response.json(await revokeCredential(request.params.id, request.body?.reason));
    })
  );

  return router;
}
