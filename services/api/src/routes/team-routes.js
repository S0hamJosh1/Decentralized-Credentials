import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { createInvitation, getInvitationDetails, listTeamAccess } from "../services/team-service.js";

export function createTeamRouter() {
  const router = Router();

  router.get(
    "/api/team",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await listTeamAccess(request.auth));
    })
  );

  router.post(
    "/api/team/invitations",
    requireAuth,
    asyncHandler(async (request, response) => {
      const invitation = await createInvitation(request.auth, request.body);
      response.status(201).json(invitation);
    })
  );

  router.get(
    "/api/invitations/:code",
    asyncHandler(async (request, response) => {
      response.json(await getInvitationDetails(request.params.code));
    })
  );

  return router;
}
