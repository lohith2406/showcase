import { randomUUID } from "node:crypto";
import path from "node:path";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import {
  createProjectSchema,
  explorationPolicySchema,
  patchStepSchema,
  publishDemoSchema,
} from "@showcase/contracts";
import { ZodError } from "zod";
import type { CredentialCipher } from "./security/credentials.js";
import { createCredentialCipher } from "./security/credentials.js";
import type { ExplorationOrchestrator, ShowcaseRepository } from "./domain.js";

export interface AppDependencies {
  repository: ShowcaseRepository;
  orchestrator: ExplorationOrchestrator;
  credentialCipher?: CredentialCipher;
  assetDirectory?: string;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const credentialCipher =
    dependencies.credentialCipher ?? createCredentialCipher();
  const allowedOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000";

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use(
    "/assets",
    express.static(
      dependencies.assetDirectory ?? path.resolve(process.cwd(), "artifacts"),
      {
        immutable: true,
        maxAge: "1d",
        fallthrough: true,
      },
    ),
  );
  app.use((request, response, next) => {
    response.setHeader(
      "x-request-id",
      request.header("x-request-id") ?? randomUUID(),
    );
    next();
  });

  app.get("/api/v1/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "showcase-api",
      timestamp: new Date().toISOString(),
    });
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
        sampleMode: input.sampleMode,
        ...(input.credentials
          ? {
              credentialsCiphertext: credentialCipher.encrypt(
                input.credentials,
              ),
            }
          : {}),
      });
      await dependencies.orchestrator.enqueue(result.project.id, result.job.id);
      response.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/projects/:projectId", async (request, response, next) => {
    try {
      const details = await dependencies.repository.getProject(
        request.params.projectId,
      );
      if (!details) {
        response
          .status(404)
          .json({ error: { code: "NOT_FOUND", message: "Project not found" } });
        return;
      }
      response.json(details);
    } catch (error) {
      next(error);
    }
  });

  app.patch(
    "/api/v1/projects/:projectId/steps/:stepId",
    async (request, response, next) => {
      try {
        const input = patchStepSchema.parse(request.body);
        const step = await dependencies.repository.updateStep(
          request.params.projectId,
          request.params.stepId,
          input,
        );
        if (!step) {
          response
            .status(404)
            .json({ error: { code: "NOT_FOUND", message: "Step not found" } });
          return;
        }
        response.json({ step });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/v1/projects/:projectId/publish",
    async (request, response, next) => {
      try {
        const input = publishDemoSchema.parse(request.body ?? {});
        const demo = await dependencies.repository.publish(
          request.params.projectId,
          input.slug,
        );
        if (!demo) {
          response.status(404).json({
            error: {
              code: "NOT_FOUND",
              message: "Project or walkthrough not found",
            },
          });
          return;
        }
        response
          .status(201)
          .json({ slug: demo.slug, publishedAt: demo.publishedAt });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/api/v1/public/:slug", async (request, response, next) => {
    try {
      const demo = await dependencies.repository.getPublicDemo(
        request.params.slug,
      );
      if (!demo) {
        response.status(404).json({
          error: { code: "NOT_FOUND", message: "Published demo not found" },
        });
        return;
      }
      response.setHeader(
        "cache-control",
        "public, max-age=60, stale-while-revalidate=300",
      );
      response.json(demo);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, response) => {
    response
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next,
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          issues: error.issues,
        },
      });
      return;
    }
    console.error("[showcase-api] request failed", error);
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  };
  app.use(errorHandler);
  return app;
}
