import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { setupWorkspace } from "../services/workspace-service.js";

export function createWorkspaceRouter() {
  const router = Router();

  router.post(
    "/api/workspace/setup",
    asyncHandler(async (request, response) => {
      const workspace = await setupWorkspace(request.body);
      response.status(201).json(workspace);
    })
  );

  return router;
}
