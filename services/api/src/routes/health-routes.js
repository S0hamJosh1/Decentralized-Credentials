import { Router } from "express";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_, response) => {
    response.json({ ok: true });
  });

  return router;
}
