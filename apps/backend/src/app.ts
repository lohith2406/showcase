import { randomUUID } from "node:crypto";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { createProjectSchema, explorationPolicySchema } from "@showcase/contracts";
import { ZodError } from "zod";
import type { CredentialCipher } from "./security/credentials.js";
import { createCredentialCipher } from "./security/credentials.js";
import type { ExplorationOrchestrator, ShowcaseRepository } from "./domain.js";

export interface AppDependencies {
  repository: ShowcaseRepository;
  orchestrator: ExplorationOrchestrator;
  credentialCipher?: CredentialCipher;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const credentialCipher = dependencies.credentialCipher ?? createCredentialCipher();
  const allowedOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000";

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use((request, response, next) => {
    response.setHeader("x-request-id", request.header("x-request-id") ?? randomUUID());
    next();
  });

  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok", service: "showcase-api", timestamp: new Date().toISOString() });
  });

  app.post("/api/v1/projects", async (request, response, next) => {
    try {
      const input = createProjectSchema.parse(request.body);
      const policy = explorationPolicySchema.parse(input.policy ?? {});
      const result = await dependencies.repository.createProject({
        name: input.name,
        targetUrl: input.targetUrl,
        origin: new URL(input.targetUrl).origin,
        policy,
        ...(input.credentials ? { credentialsCiphertext: credentialCipher.encrypt(input.credentials) } : {}),
      });
      await dependencies.orchestrator.enqueue(result.project.id, result.job.id);
      response.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/projects/:projectId", async (request, response, next) => {
    try {
      const details = await dependencies.repository.getProject(request.params.projectId);
      if (!details) {
        response.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found" } });
        return;
      }
      response.json(details);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Request validation failed", issues: error.issues },
      });
      return;
    }
    console.error("[showcase-api] request failed", error);
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
  };
  app.use(errorHandler);
  return app;
}
