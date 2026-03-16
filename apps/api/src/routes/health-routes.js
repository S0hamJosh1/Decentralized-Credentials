import { Router } from "express";
import { getStorageMode } from "../lib/prisma.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_, response) => {
    response.json({ ok: true, storage: getStorageMode() });
  });

  return router;
}
