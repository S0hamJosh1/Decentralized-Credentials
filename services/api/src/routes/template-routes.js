import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { createTemplate, listTemplates } from "../services/template-service.js";

export function createTemplateRouter() {
  const router = Router();

  router.get(
    "/api/templates",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await listTemplates(request.auth));
    })
  );

  router.post(
    "/api/templates",
    requireAuth,
    asyncHandler(async (request, response) => {
      const template = await createTemplate(request.auth, request.body);
      response.status(201).json(template);
    })
  );

  return router;
}
