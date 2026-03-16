import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { getBootstrap } from "../services/bootstrap-service.js";

export function createBootstrapRouter() {
  const router = Router();

  router.get(
    "/api/bootstrap",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await getBootstrap(request.auth));
    })
  );

  return router;
}
