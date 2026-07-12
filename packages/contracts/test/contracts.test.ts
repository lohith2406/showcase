import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  demoStepSchema,
  explorationPolicySchema,
  patchStepSchema,
} from "../src/index.js";

describe("createProjectSchema", () => {
  it("normalizes a valid HTTPS SaaS target", () => {
    const result = createProjectSchema.parse({
      name: "Acme workspace",
      targetUrl: "https://app.acme.test/dashboard",
      credentials: { username: "demo@acme.test", password: "secret" },
    });

    expect(result.targetUrl).toBe("https://app.acme.test/dashboard");
    expect(result.credentials?.username).toBe("demo@acme.test");
  });

  it("rejects non-HTTP protocols", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Unsafe",
        targetUrl: "file:///etc/passwd",
      }),
    ).toThrow();
  });
});

describe("explorationPolicySchema", () => {
  it("provides conservative exploration defaults", () => {
    expect(explorationPolicySchema.parse({})).toEqual({
      maxPages: 12,
      maxActionsPerPage: 8,
      navigationTimeoutMs: 30_000,
      sameOriginOnly: true,
    });
  });
});

describe("walkthrough editing", () => {
  it("requires normalized hotspot coordinates", () => {
    expect(() =>
      demoStepSchema.parse({
        id: "step_1",
        chapterId: "chapter_1",
        order: 0,
        title: "Create a project",
        description: "Start from the primary action.",
        pageUrl: "https://app.acme.test/projects",
        screenshotUrl: "https://assets.acme.test/projects.png",
        hotspot: { x: 1.2, y: 0.5, width: 0.1, height: 0.1 },
        selector: "button[data-action='create']",
      }),
    ).toThrow();
  });

  it("accepts a focused partial step update", () => {
    expect(
      patchStepSchema.parse({
        title: "Invite your team",
        hotspot: { x: 0.2, y: 0.3 },
      }),
    ).toEqual({
      title: "Invite your team",
      hotspot: { x: 0.2, y: 0.3 },
    });
  });
});
