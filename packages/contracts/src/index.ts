import { z } from "zod";

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP and HTTPS targets are supported");

export const credentialsSchema = z
  .object({
    username: z.string().trim().min(1).max(320),
    password: z.string().min(1).max(4096),
  })
  .strict();

export const explorationPolicySchema = z.object({
  maxPages: z.number().int().min(1).max(30).default(12),
  maxActionsPerPage: z.number().int().min(1).max(20).default(8),
  navigationTimeoutMs: z.number().int().min(5_000).max(120_000).default(30_000),
  sameOriginOnly: z.boolean().default(true),
});

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    targetUrl: httpUrlSchema,
    credentials: credentialsSchema.optional(),
    policy: explorationPolicySchema.optional(),
    sampleMode: z.boolean().default(false),
  })
  .strict();

export const projectStatusSchema = z.enum([
  "DRAFT",
  "QUEUED",
  "EXPLORING",
  "PLANNING",
  "GENERATING",
  "READY",
  "FAILED",
  "PUBLISHED",
]);

export const jobStageSchema = z.enum([
  "QUEUED",
  "EXPLORING",
  "PLANNING",
  "GENERATING",
  "COMPLETE",
  "FAILED",
]);

export const normalizedRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1).optional(),
    height: z.number().min(0).max(1).optional(),
  })
  .strict();

export const discoveredElementSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  name: z.string().default(""),
  selector: z.string().min(1),
  text: z.string().default(""),
  rect: normalizedRectSchema,
  importance: z.number().min(0).max(1),
  safeToClick: z.boolean(),
});

export const discoveredPageSchema = z.object({
  id: z.string().min(1),
  url: httpUrlSchema,
  title: z.string(),
  screenshotUrl: z.string().url(),
  navigationLabel: z.string().optional(),
  summary: z.string(),
  elements: z.array(discoveredElementSchema),
});

export const demoStepSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(1200),
  pageUrl: httpUrlSchema,
  screenshotUrl: z.string().url(),
  hotspot: normalizedRectSchema,
  selector: z.string().min(1).nullable(),
});

export const chapterSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  steps: z.array(demoStepSchema),
});

export const patchStepSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(1200).optional(),
    hotspot: normalizedRectSchema.partial().optional(),
    selector: z.string().min(1).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required",
  );

export const publishDemoSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export type Credentials = z.infer<typeof credentialsSchema>;
export type ExplorationPolicy = z.infer<typeof explorationPolicySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type JobStage = z.infer<typeof jobStageSchema>;
export type NormalizedRect = z.infer<typeof normalizedRectSchema>;
export type DiscoveredElement = z.infer<typeof discoveredElementSchema>;
export type DiscoveredPage = z.infer<typeof discoveredPageSchema>;
export type DemoStep = z.infer<typeof demoStepSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type PatchStepInput = z.infer<typeof patchStepSchema>;
export type PublishDemoInput = z.infer<typeof publishDemoSchema>;
