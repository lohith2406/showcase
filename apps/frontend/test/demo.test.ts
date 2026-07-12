import { describe, expect, it } from "vitest";
import type { Chapter } from "@showcase/contracts";
import { flattenDemoSteps, stepPosition } from "../src/lib/demo.js";

const chapters: Chapter[] = [
  {
    id: "chapter-1",
    order: 0,
    title: "Dashboard",
    description: "Overview",
    steps: [
      {
        id: "step-1",
        chapterId: "chapter-1",
        order: 0,
        title: "First",
        description: "First step",
        pageUrl: "https://example.com",
        screenshotUrl: "https://example.com/1.png",
        hotspot: { x: 0.2, y: 0.3 },
        selector: null,
      },
    ],
  },
  {
    id: "chapter-2",
    order: 1,
    title: "Projects",
    description: "Projects",
    steps: [
      {
        id: "step-2",
        chapterId: "chapter-2",
        order: 0,
        title: "Second",
        description: "Second step",
        pageUrl: "https://example.com/projects",
        screenshotUrl: "https://example.com/2.png",
        hotspot: { x: 0.7, y: 0.4 },
        selector: "button",
      },
    ],
  },
];

describe("demo navigation", () => {
  it("flattens ordered chapters into a stable playback sequence", () => {
    expect(flattenDemoSteps(chapters).map((entry) => entry.step.id)).toEqual([
      "step-1",
      "step-2",
    ]);
  });

  it("reports one-based progress and clamps unknown steps", () => {
    expect(stepPosition(chapters, "step-2")).toEqual({ current: 2, total: 2 });
    expect(stepPosition(chapters, "missing")).toEqual({ current: 1, total: 2 });
  });
});
