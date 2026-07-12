import { describe, expect, it } from "vitest";
import type { DiscoveredPage } from "@showcase/contracts";
import { SampleExplorerAgent } from "../src/agents/sample-explorer.js";
import {
  buildFallbackPlan,
  isDestructiveAction,
} from "../src/agents/planner.js";
import { assertSafeTarget } from "../src/security/target.js";
import { createCredentialCipher } from "../src/security/credentials.js";
import { PiExplorationOrchestrator } from "../src/orchestration/pi-orchestrator.js";
import { InMemoryShowcaseRepository } from "../src/repositories/in-memory.js";

describe("target safety", () => {
  it("rejects loopback and private address targets", async () => {
    await expect(assertSafeTarget("http://127.0.0.1/admin")).rejects.toThrow(
      "private",
    );
    await expect(
      assertSafeTarget("https://internal.example", async () => ["10.20.30.40"]),
    ).rejects.toThrow("private");
  });

  it("accepts a public HTTPS target", async () => {
    await expect(
      assertSafeTarget("https://app.example.com", async () => ["203.0.113.10"]),
    ).resolves.toBeUndefined();
  });
});

describe("credential cipher", () => {
  it("round-trips credentials without embedding plaintext", () => {
    const cipher = createCredentialCipher("ab".repeat(32));
    const encrypted = cipher.encrypt({
      username: "demo@example.com",
      password: "secret",
    });

    expect(encrypted).not.toContain("secret");
    expect(cipher.decrypt(encrypted)).toEqual({
      username: "demo@example.com",
      password: "secret",
    });
  });
});

describe("fallback walkthrough planning", () => {
  const pages: DiscoveredPage[] = [
    {
      id: "page-dashboard",
      url: "https://app.example.com/dashboard",
      title: "Dashboard",
      navigationLabel: "Dashboard",
      summary: "Workspace overview",
      screenshotUrl: "https://assets.example.com/dashboard.png",
      elements: [
        {
          id: "el-create",
          role: "button",
          name: "Create project",
          text: "Create project",
          selector: "[data-testid='create-project']",
          rect: { x: 0.8, y: 0.1, width: 0.12, height: 0.06 },
          importance: 0.95,
          safeToClick: true,
        },
        {
          id: "el-delete",
          role: "button",
          name: "Delete workspace",
          text: "Delete workspace",
          selector: "button.delete",
          rect: { x: 0.2, y: 0.9, width: 0.1, height: 0.05 },
          importance: 0.9,
          safeToClick: false,
        },
      ],
    },
  ];

  it("turns important safe actions into ordered chapters and steps", () => {
    const plan = buildFallbackPlan(pages);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.title).toBe("Dashboard");
    expect(plan[0]?.steps).toHaveLength(1);
    expect(plan[0]?.steps[0]).toMatchObject({
      title: "Create project",
      selector: "[data-testid='create-project']",
    });
  });

  it("recognizes controls that an autonomous explorer must never click", () => {
    expect(isDestructiveAction("Delete workspace permanently")).toBe(true);
    expect(isDestructiveAction("Create a project")).toBe(false);
  });
});

describe("sample explorer isolation", () => {
  it("scopes synthetic page and element IDs to each project", async () => {
    const explorer = new SampleExplorerAgent();
    const base = {
      name: "Sample",
      targetUrl: "https://sample.showcase.ai",
      origin: "https://sample.showcase.ai",
      status: "EXPLORING" as const,
      sampleMode: true,
      policy: {
        maxPages: 12,
        maxActionsPerPage: 8,
        navigationTimeoutMs: 30_000,
        sameOriginOnly: true,
      },
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const first = await explorer.explore({ ...base, id: "project-a" });
    const second = await explorer.explore({ ...base, id: "project-b" });

    expect(first[0]?.id).not.toBe(second[0]?.id);
    expect(first[0]?.elements[0]?.id).not.toBe(second[0]?.elements[0]?.id);
  });
});

describe("Pi exploration orchestration", () => {
  it("does not persist sensitive internal failure details", async () => {
    const repository = new InMemoryShowcaseRepository();
    const created = await repository.createProject({
      name: "Acme",
      targetUrl: "https://app.example.com",
      origin: "https://app.example.com",
      sampleMode: false,
      policy: {
        maxPages: 12,
        maxActionsPerPage: 8,
        navigationTimeoutMs: 30_000,
        sameOriginOnly: true,
      },
    });
    const orchestrator = new PiExplorationOrchestrator({
      repository,
      explorer: {
        explore: async () => {
          throw new Error("postgres password leaked in adapter error");
        },
      },
      planner: { plan: async () => [] },
      allowPrivateTargets: false,
      targetValidator: async () => undefined,
    });

    orchestrator.enqueue(created.project.id, created.job.id);
    await orchestrator.waitFor(created.job.id);

    const details = await repository.getProject(created.project.id);
    expect(details?.project.status).toBe("FAILED");
    expect(details?.project.lastError).toBe(
      "Exploration could not be completed. Check the target and try again.",
    );
    expect(details?.jobs[0]?.error).not.toContain("password");
  });

  it("runs explorer, planner, and demo generation as persisted stages", async () => {
    const repository = new InMemoryShowcaseRepository();
    const created = await repository.createProject({
      name: "Acme",
      targetUrl: "https://app.example.com",
      origin: "https://app.example.com",
      policy: {
        maxPages: 12,
        maxActionsPerPage: 8,
        navigationTimeoutMs: 30_000,
        sameOriginOnly: true,
      },
    });
    const pages: DiscoveredPage[] = [
      {
        id: "dashboard",
        url: "https://app.example.com/dashboard",
        title: "Dashboard",
        navigationLabel: "Dashboard",
        summary: "Workspace overview",
        screenshotUrl: "https://assets.example.com/dashboard.png",
        elements: [],
      },
    ];
    const orchestrator = new PiExplorationOrchestrator({
      repository,
      explorer: { explore: async () => pages },
      planner: { plan: async (observed) => buildFallbackPlan(observed) },
      allowPrivateTargets: false,
      targetValidator: async () => undefined,
    });

    orchestrator.enqueue(created.project.id, created.job.id);
    await orchestrator.waitFor(created.job.id);

    const details = await repository.getProject(created.project.id);
    expect(details?.project.status).toBe("READY");
    expect(details?.jobs[0]).toMatchObject({
      stage: "COMPLETE",
      progress: 100,
    });
    expect(details?.chapters[0]?.title).toBe("Dashboard");
  });
});
