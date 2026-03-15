import { createHttpError } from "../lib/http.js";
import { getSessionToken } from "../lib/auth.js";
import { getSessionPayload } from "../services/auth-service.js";

export function requireAuth(request, _, next) {
  const token = getSessionToken(request);

  if (!token) {
    next(createHttpError(401, "Please sign in to access the workspace."));
    return;
  }

  getSessionPayload(token)
    .then((auth) => {
      request.auth = auth;
      next();
    })
    .catch(next);
}
