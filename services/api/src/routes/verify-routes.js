import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { getVerificationRecord } from "../services/credential-service.js";

export function createVerifyRouter() {
  const router = Router();

  router.get(
    "/api/verify/:code",
    asyncHandler(async (request, response) => {
      response.json(await getVerificationRecord(request.params.code));
    })
  );

  return router;
}
