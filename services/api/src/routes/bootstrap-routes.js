import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { getBootstrap } from "../services/bootstrap-service.js";

export function createBootstrapRouter() {
  const router = Router();

  router.get(
    "/api/bootstrap",
    asyncHandler(async (_, response) => {
      response.json(await getBootstrap());
    })
  );

  return router;
}
