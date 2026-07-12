import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { Chapter, DiscoveredPage } from "@showcase/contracts";
import type { PlannerAgent } from "../domain.js";
import { buildFallbackPlan } from "./planner.js";

const modelPlanSchema = z.object({
  chapters: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      pageId: z.string().min(1),
      steps: z.array(
        z.object({
          elementId: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
        }),
      ),
    }),
  ),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["chapters"],
  properties: {
    chapters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "pageId", "steps"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          pageId: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["elementId", "title", "description"],
              properties: {
                elementId: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export class OpenAIPlannerAgent implements PlannerAgent {
  private readonly client: OpenAI | null;

  constructor(
    apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_MODEL ?? "gpt-5-mini",
  ) {
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async plan(pages: DiscoveredPage[]): Promise<Chapter[]> {
    if (!this.client) return buildFallbackPlan(pages);
    try {
      const compactPages = pages.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title,
        navigationLabel: page.navigationLabel,
        summary: page.summary,
        elements: page.elements
          .filter((element) => element.safeToClick)
          .map((element) => ({
            id: element.id,
            role: element.role,
            label: element.name || element.text,
            importance: element.importance,
          })),
      }));
      const response = await this.client.responses.create({
        model: this.model,
        instructions:
          "You are the planner for an interactive SaaS product demo. Select the few workflows that best communicate product value. Never include destructive, billing-charge, logout, or deletion actions. Return 1-6 chapters and 1-6 concise steps per chapter. Reference only supplied page and element IDs.",
        input: JSON.stringify(compactPages),
        text: {
          format: {
            type: "json_schema",
            name: "showcase_walkthrough_plan",
            strict: true,
            schema: jsonSchema,
          },
        },
      });
      const parsed = modelPlanSchema.parse(JSON.parse(response.output_text));
      const chapters: Chapter[] = [];
      for (const [chapterOrder, planned] of parsed.chapters.entries()) {
        const page = pages.find((candidate) => candidate.id === planned.pageId);
        if (!page) continue;
        const chapterId = randomUUID();
        const steps = planned.steps.flatMap((plannedStep, order) => {
          const element = page.elements.find(
            (candidate) =>
              candidate.id === plannedStep.elementId && candidate.safeToClick,
          );
          if (!element) return [];
          return [
            {
              id: randomUUID(),
              chapterId,
              order,
              title: plannedStep.title,
              description: plannedStep.description,
              pageUrl: page.url,
              screenshotUrl: page.screenshotUrl,
              hotspot: element.rect,
              selector: element.selector,
            },
          ];
        });
        if (steps.length > 0) {
          chapters.push({
            id: chapterId,
            order: chapterOrder,
            title: planned.title,
            description: planned.description,
            steps,
          });
        }
      }
      return chapters.length > 0 ? chapters : buildFallbackPlan(pages);
    } catch (error) {
      console.warn(
        "[showcase-planner] OpenAI planning failed; using deterministic fallback",
        error,
      );
      return buildFallbackPlan(pages);
    }
  }
}
