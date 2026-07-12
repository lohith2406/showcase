import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var showcasePrisma: PrismaClient | undefined;
}

export const prisma = globalThis.showcasePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.showcasePrisma = prisma;
}

export * from "@prisma/client";
