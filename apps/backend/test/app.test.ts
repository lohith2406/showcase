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

    expect(response.body).toMatchObject({ status: "ok", service: "showcase-api" });
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
    expect(enqueue).toHaveBeenCalledWith(response.body.project.id, response.body.job.id);
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

    expect(response.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
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
});
