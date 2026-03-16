import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { getOrganization, updateOrganization } from "../services/organization-service.js";

export function createOrganizationRouter() {
  const router = Router();

  router.get(
    "/api/organization",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await getOrganization(request.auth));
    })
  );

  router.patch(
    "/api/organization",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await updateOrganization(request.auth, request.body));
    })
  );

  return router;
}
