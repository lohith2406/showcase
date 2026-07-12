import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { InMemoryShowcaseRepository } from "../src/repositories/in-memory.js";

describe("showcase Express API", () => {
  it("reports service health", async () => {
    const app = createApp({
      repository: new InMemoryShowcaseRepository(),
      orchestrator: { enqueue: vi.fn() },
    });

    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "showcase-api",
    });
  });

  it("creates a queued exploration without exposing credentials", async () => {
    const enqueue = vi.fn();
    const repository = new InMemoryShowcaseRepository();
    const app = createApp({ repository, orchestrator: { enqueue } });

    const response = await request(app)
      .post("/api/v1/projects")
      .send({
        name: "Acme",
        targetUrl: "https://app.acme.test/dashboard",
        credentials: { username: "demo@acme.test", password: "super-secret" },
      })
      .expect(202);

    expect(response.body.project).toMatchObject({
      name: "Acme",
      targetUrl: "https://app.acme.test/dashboard",
      status: "QUEUED",
    });
    expect(JSON.stringify(response.body)).not.toContain("super-secret");
    expect(response.body.job).toMatchObject({ stage: "QUEUED", progress: 0 });
    expect(enqueue).toHaveBeenCalledWith(
      response.body.project.id,
      response.body.job.id,
    );
  });

  it("returns structured validation errors", async () => {
    const app = createApp({
      repository: new InMemoryShowcaseRepository(),
      orchestrator: { enqueue: vi.fn() },
    });

    const response = await request(app)
      .post("/api/v1/projects")
      .send({ name: "X", targetUrl: "file:///etc/passwd" })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(response.body.error.issues.length).toBeGreaterThan(0);
  });

  it("returns a created project by id", async () => {
    const repository = new InMemoryShowcaseRepository();
    const app = createApp({ repository, orchestrator: { enqueue: vi.fn() } });
    const created = await request(app)
      .post("/api/v1/projects")
      .send({ name: "Acme", targetUrl: "https://app.acme.test" })
      .expect(202);

    const response = await request(app)
      .get(`/api/v1/projects/${created.body.project.id}`)
      .expect(200);

    expect(response.body.project.id).toBe(created.body.project.id);
    expect(response.body.jobs).toHaveLength(1);
  });

  it("edits a generated step and publishes a stable public snapshot", async () => {
    const repository = new InMemoryShowcaseRepository();
    const app = createApp({ repository, orchestrator: { enqueue: vi.fn() } });
    const created = await repository.createProject({
      name: "Acme",
      targetUrl: "https://app.acme.test",
      origin: "https://app.acme.test",
      policy: {
        maxPages: 12,
        maxActionsPerPage: 8,
        navigationTimeoutMs: 30_000,
        sameOriginOnly: true,
      },
    });
    await repository.saveChapters(created.project.id, [
      {
        id: "chapter-1",
        order: 0,
        title: "Dashboard",
        description: "Workspace overview",
        steps: [
          {
            id: "step-1",
            chapterId: "chapter-1",
            order: 0,
            title: "Create project",
            description: "Start a project.",
            pageUrl: "https://app.acme.test/dashboard",
            screenshotUrl: "https://assets.example/dashboard.png",
            hotspot: { x: 0.8, y: 0.1, width: 0.1, height: 0.05 },
            selector: "button.create",
          },
        ],
      },
    ]);

    await request(app)
      .patch(`/api/v1/projects/${created.project.id}/steps/step-1`)
      .send({ title: "Launch a project", hotspot: { x: 0.75 } })
      .expect(200);

    const published = await request(app)
      .post(`/api/v1/projects/${created.project.id}/publish`)
      .send({ slug: "acme-product-tour" })
      .expect(201);
    expect(published.body).toMatchObject({ slug: "acme-product-tour" });

    const publicDemo = await request(app)
      .get("/api/v1/public/acme-product-tour")
      .expect(200);
    expect(publicDemo.body.chapters[0].steps[0]).toMatchObject({
      title: "Launch a project",
      hotspot: { x: 0.75, y: 0.1 },
    });
  });
});
