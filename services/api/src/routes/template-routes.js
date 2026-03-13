import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { createTemplate, listTemplates } from "../services/template-service.js";

export function createTemplateRouter() {
  const router = Router();

  router.get(
    "/api/templates",
    asyncHandler(async (_, response) => {
      response.json(await listTemplates());
    })
  );

  router.post(
    "/api/templates",
    asyncHandler(async (request, response) => {
      const template = await createTemplate(request.body);
      response.status(201).json(template);
    })
  );

  return router;
}
