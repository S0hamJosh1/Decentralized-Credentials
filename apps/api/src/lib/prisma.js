import prismaClientPackage from "@prisma/client";

const { PrismaClient } = prismaClientPackage;

const globalKey = "__credentialFoundryPrisma";

export function isDatabaseConfigured() {
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}

export function getPrismaClient() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!globalThis[globalKey]) {
    globalThis[globalKey] = new PrismaClient();
  }

  return globalThis[globalKey];
}

export function getStorageMode() {
  return isDatabaseConfigured() ? "database" : "file";
}
