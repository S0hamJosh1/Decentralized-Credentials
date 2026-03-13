import { readDb } from "../store.js";

export async function getBootstrap() {
  return readDb();
}
