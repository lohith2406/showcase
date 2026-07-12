import path from "node:path";
import { config } from "dotenv";
import { createApp } from "./app.js";
import { FallbackPlannerAgent } from "./agents/planner.js";
import { OpenAIPlannerAgent } from "./agents/openai-planner.js";
import { PlaywrightExplorerAgent } from "./agents/playwright-explorer.js";
import { SampleExplorerAgent } from "./agents/sample-explorer.js";
import { PiExplorationOrchestrator } from "./orchestration/pi-orchestrator.js";
import { InMemoryShowcaseRepository } from "./repositories/in-memory.js";
import { PrismaShowcaseRepository } from "./repositories/prisma.js";
import { createCredentialCipher } from "./security/credentials.js";
import { assertSafeTarget } from "./security/target.js";
import { createAssetStore } from "./storage/assets.js";

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
  override: true,
  quiet: true,
});

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be a valid TCP port");
}

const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === "production" && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production");
}

const database = databaseUrl
  ? (await import("@showcase/database")).prisma
  : null;
const repository = database
  ? new PrismaShowcaseRepository(database)
  : new InMemoryShowcaseRepository();
const credentialCipher = createCredentialCipher();
const assets = createAssetStore();
const allowPrivateTargets = process.env.ALLOW_PRIVATE_TARGETS === "true";
const validateBrowserRequest = allowPrivateTargets
  ? async () => undefined
  : assertSafeTarget;
const orchestrator = new PiExplorationOrchestrator({
  repository,
  explorer: new PlaywrightExplorerAgent(assets, validateBrowserRequest),
  sampleExplorer: new SampleExplorerAgent(),
  planner: new OpenAIPlannerAgent(),
  samplePlanner: new FallbackPlannerAgent(),
  credentialCipher,
  allowPrivateTargets,
});
const assetDirectory = path.resolve(process.cwd(), "artifacts");
const app = createApp({
  repository,
  orchestrator,
  credentialCipher,
  assetDirectory,
});
const server = app.listen(port, () => {
  console.log(
    `[showcase-api] listening on http://localhost:${port} (${database ? "postgres" : "memory"})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[showcase-api] ${signal}; shutting down`);
  server.close(async () => {
    if (database) await database.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
