import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  createCredential,
  getCredentialDetails,
  listCredentials,
  revokeCredential,
} from "../services/credential-service.js";

export function createCredentialRouter() {
  const router = Router();

  router.get(
    "/api/credentials",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await listCredentials(request.auth));
    })
  );

  router.post(
    "/api/credentials",
    requireAuth,
    asyncHandler(async (request, response) => {
      const credential = await createCredential(request.auth, request.body);
      response.status(201).json(credential);
    })
  );

  router.get(
    "/api/credentials/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await getCredentialDetails(request.auth, request.params.id));
    })
  );

  router.patch(
    "/api/credentials/:id/revoke",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await revokeCredential(request.auth, request.params.id, request.body?.reason));
    })
  );

  return router;
}
