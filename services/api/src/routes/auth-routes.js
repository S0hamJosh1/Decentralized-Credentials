import { Router } from "express";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../lib/auth.js";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { loginAccount, registerAccount, revokeSession } from "../services/auth-service.js";

export function createAuthRouter() {
  const router = Router();

  router.post(
    "/api/auth/register",
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await registerAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.status(201).json(session);
    })
  );

  router.post(
    "/api/auth/login",
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await loginAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.json(session);
    })
  );

  router.get(
    "/api/auth/session",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(request.auth);
    })
  );

  router.post(
    "/api/auth/logout",
    asyncHandler(async (request, response) => {
      await revokeSession(getSessionToken(request));
      clearSessionCookie(response);
      response.status(204).end();
    })
  );

  return router;
}
