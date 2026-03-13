import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { getOrganization, updateOrganization } from "../services/organization-service.js";

export function createOrganizationRouter() {
  const router = Router();

  router.get(
    "/api/organization",
    asyncHandler(async (_, response) => {
      response.json(await getOrganization());
    })
  );

  router.patch(
    "/api/organization",
    asyncHandler(async (request, response) => {
      response.json(await updateOrganization(request.body));
    })
  );

  return router;
}
