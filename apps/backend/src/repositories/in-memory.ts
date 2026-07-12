import { randomUUID } from "node:crypto";
import type {
  CreateProjectRecordInput,
  InternalProjectRecord,
  JobRecord,
  ProjectDetails,
  ProjectRecord,
  ShowcaseRepository,
} from "../domain.js";

export class InMemoryShowcaseRepository implements ShowcaseRepository {
  readonly projects = new Map<string, InternalProjectRecord>();
  readonly jobs = new Map<string, JobRecord>();
  readonly pages = new Map<
    string,
    import("@showcase/contracts").DiscoveredPage[]
  >();
  readonly chapters = new Map<
    string,
    import("@showcase/contracts").Chapter[]
  >();
  readonly published = new Map<
    string,
    import("../domain.js").PublishedDemoSnapshot
  >();

  async createProject(
    input: CreateProjectRecordInput,
  ): Promise<{ project: ProjectRecord; job: JobRecord }> {
    const now = new Date().toISOString();
    const internal: InternalProjectRecord = {
      id: randomUUID(),
      name: input.name,
      targetUrl: input.targetUrl,
      origin: input.origin,
      status: "QUEUED",
      sampleMode: input.sampleMode,
      policy: input.policy,
      createdAt: now,
      updatedAt: now,
      ...(input.credentialsCiphertext
        ? { credentialsCiphertext: input.credentialsCiphertext }
        : {}),
    };
    const job: JobRecord = {
      id: randomUUID(),
      projectId: internal.id,
      stage: "QUEUED",
      progress: 0,
      message: "Waiting for an explorer",
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(internal.id, internal);
    this.jobs.set(job.id, job);
    return { project: this.toPublic(internal), job };
  }

  async getProject(id: string): Promise<ProjectDetails | null> {
    const project = this.projects.get(id);
    if (!project) return null;
    return {
      project: this.toPublic(project),
      jobs: [...this.jobs.values()].filter((job) => job.projectId === id),
      chapters: this.chapters.get(id) ?? [],
    };
  }

  async getInternalProject(id: string): Promise<InternalProjectRecord | null> {
    return this.projects.get(id) ?? null;
  }

  async updateProject(
    id: string,
    status: InternalProjectRecord["status"],
    lastError?: string,
  ): Promise<void> {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");
    this.projects.set(id, {
      ...project,
      status,
      updatedAt: new Date().toISOString(),
      ...(lastError ? { lastError } : {}),
    });
  }

  async updateJob(id: string, update: Partial<JobRecord>): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) throw new Error("Job not found");
    this.jobs.set(id, {
      ...job,
      ...update,
      id: job.id,
      projectId: job.projectId,
      updatedAt: new Date().toISOString(),
    });
  }

  async saveDiscovery(
    projectId: string,
    pages: import("@showcase/contracts").DiscoveredPage[],
  ): Promise<void> {
    this.pages.set(projectId, structuredClone(pages));
  }

  async saveChapters(
    projectId: string,
    chapters: import("@showcase/contracts").Chapter[],
  ): Promise<void> {
    this.chapters.set(projectId, structuredClone(chapters));
  }

  async clearCredentials(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;
    const { credentialsCiphertext: _secret, ...withoutCredentials } = project;
    this.projects.set(projectId, withoutCredentials);
  }

  async updateStep(
    projectId: string,
    stepId: string,
    input: import("@showcase/contracts").PatchStepInput,
  ): Promise<import("@showcase/contracts").DemoStep | null> {
    const chapters = this.chapters.get(projectId);
    if (!chapters) return null;
    const existing = chapters
      .flatMap((chapter) => chapter.steps)
      .find((step) => step.id === stepId);
    if (!existing) return null;
    const hotspot = input.hotspot
      ? {
          ...existing.hotspot,
          ...(input.hotspot.x !== undefined ? { x: input.hotspot.x } : {}),
          ...(input.hotspot.y !== undefined ? { y: input.hotspot.y } : {}),
          ...(input.hotspot.width !== undefined
            ? { width: input.hotspot.width }
            : {}),
          ...(input.hotspot.height !== undefined
            ? { height: input.hotspot.height }
            : {}),
        }
      : existing.hotspot;
    const updated: import("@showcase/contracts").DemoStep = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.selector !== undefined ? { selector: input.selector } : {}),
      hotspot,
    };
    this.chapters.set(
      projectId,
      chapters.map((chapter) => ({
        ...chapter,
        steps: chapter.steps.map((step) =>
          step.id === stepId ? updated : step,
        ),
      })),
    );
    return updated;
  }

  async publish(
    projectId: string,
    requestedSlug?: string,
  ): Promise<import("../domain.js").PublishedDemoSnapshot | null> {
    const project = this.projects.get(projectId);
    const chapters = this.chapters.get(projectId);
    if (!project || !chapters) return null;
    const base =
      requestedSlug ??
      `${project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${project.id.slice(0, 6)}`;
    const existing = this.published.get(base);
    if (existing && existing.project.id !== projectId)
      throw new Error("Slug is already in use");
    const snapshot: import("../domain.js").PublishedDemoSnapshot = {
      slug: base,
      project: {
        id: project.id,
        name: project.name,
        targetUrl: project.targetUrl,
      },
      chapters: structuredClone(chapters).map((chapter) => ({
        ...chapter,
        steps: chapter.steps.map((step) => ({ ...step, selector: null })),
      })),
      publishedAt: new Date().toISOString(),
    };
    this.published.set(base, snapshot);
    await this.updateProject(projectId, "PUBLISHED");
    return snapshot;
  }

  async getPublicDemo(
    slug: string,
  ): Promise<import("../domain.js").PublishedDemoSnapshot | null> {
    return structuredClone(this.published.get(slug) ?? null);
  }

  private toPublic(project: InternalProjectRecord): ProjectRecord {
    const { credentialsCiphertext: _secret, ...publicProject } = project;
    return publicProject;
  }
}
