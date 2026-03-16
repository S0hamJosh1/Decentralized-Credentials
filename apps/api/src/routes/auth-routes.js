import { Router } from "express";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "../lib/auth.js";
import { asyncHandler } from "../lib/http.js";
import { authRateLimiter, passwordResetRateLimiter } from "../lib/rate-limit.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import {
  acceptInvitationWithGoogle,
  acceptInvitationWithPassword,
  loginAccount,
  loginGoogleAccount,
  registerAccount,
  registerGoogleAccount,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  switchWorkspace,
} from "../services/auth-service.js";

export function createAuthRouter() {
  const router = Router();

  router.post(
    "/api/auth/register",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await registerAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.status(201).json(session);
    })
  );

  router.post(
    "/api/auth/login",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await loginAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.json(session);
    })
  );

  router.post(
    "/api/auth/google/register",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await registerGoogleAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.status(201).json(session);
    })
  );

  router.post(
    "/api/auth/google/login",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await loginGoogleAccount(request.body);
      setSessionCookie(response, sessionToken);
      response.json(session);
    })
  );

  router.post(
    "/api/auth/invitations/accept",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await acceptInvitationWithPassword(request.body);
      setSessionCookie(response, sessionToken);
      response.json(session);
    })
  );

  router.post(
    "/api/auth/google/invitations/accept",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      const { sessionToken, session } = await acceptInvitationWithGoogle(request.body);
      setSessionCookie(response, sessionToken);
      response.json(session);
    })
  );

  router.post(
    "/api/auth/password-reset/request",
    passwordResetRateLimiter,
    asyncHandler(async (request, response) => {
      response.json(await requestPasswordReset(request.body));
    })
  );

  router.post(
    "/api/auth/password-reset/reset",
    passwordResetRateLimiter,
    asyncHandler(async (request, response) => {
      response.json(await resetPassword(request.body));
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
    "/api/auth/switch-workspace",
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json(await switchWorkspace(getSessionToken(request), request.body));
    })
  );

  router.post(
    "/api/auth/logout",
    authRateLimiter,
    asyncHandler(async (request, response) => {
      await revokeSession(getSessionToken(request));
      clearSessionCookie(response);
      response.status(204).end();
    })
  );

  return router;
}
