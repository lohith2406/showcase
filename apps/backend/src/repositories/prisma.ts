import type {
  Chapter,
  DemoStep,
  DiscoveredPage,
  PatchStepInput,
} from "@showcase/contracts";
import type { Prisma, PrismaClient } from "@showcase/database";
import type {
  CreateProjectRecordInput,
  InternalProjectRecord,
  JobRecord,
  ProjectDetails,
  ProjectRecord,
  PublishedDemoSnapshot,
  ShowcaseRepository,
} from "../domain.js";

const iso = (value: Date) => value.toISOString();

export class PrismaShowcaseRepository implements ShowcaseRepository {
  constructor(private readonly db: PrismaClient) {}

  async createProject(
    input: CreateProjectRecordInput,
  ): Promise<{ project: ProjectRecord; job: JobRecord }> {
    const created = await this.db.project.create({
      data: {
        name: input.name,
        targetUrl: input.targetUrl,
        origin: input.origin,
        status: "QUEUED",
        sampleMode: input.sampleMode,
        credentialsCiphertext: input.credentialsCiphertext ?? null,
        explorationPolicy: input.policy as Prisma.InputJsonValue,
        jobs: {
          create: {
            stage: "QUEUED",
            progress: 0,
            message: "Waiting for an explorer",
          },
        },
      },
      include: { jobs: true },
    });
    const job = created.jobs[0];
    if (!job) throw new Error("Failed to create exploration job");
    return { project: this.project(created), job: this.job(job) };
  }

  async getProject(id: string): Promise<ProjectDetails | null> {
    const record = await this.db.project.findUnique({
      where: { id },
      include: {
        jobs: { orderBy: { createdAt: "desc" } },
        chapters: {
          orderBy: { order: "asc" },
          include: {
            steps: { orderBy: { order: "asc" }, include: { page: true } },
          },
        },
        publishedDemo: true,
      },
    });
    if (!record) return null;
    return {
      project: this.project(record),
      jobs: record.jobs.map((job) => this.job(job)),
      chapters: record.chapters.map((chapter) => ({
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        description: chapter.description,
        steps: chapter.steps.map((step) =>
          this.step(step, step.page.url, step.page.screenshotUrl),
        ),
      })),
      ...(record.publishedDemo
        ? { publishedSlug: record.publishedDemo.slug }
        : {}),
    };
  }

  async getInternalProject(id: string): Promise<InternalProjectRecord | null> {
    const record = await this.db.project.findUnique({ where: { id } });
    if (!record) return null;
    return {
      ...this.project(record),
      ...(record.credentialsCiphertext
        ? { credentialsCiphertext: record.credentialsCiphertext }
        : {}),
    };
  }

  async updateProject(
    id: string,
    status: ProjectRecord["status"],
    lastError?: string,
  ): Promise<void> {
    await this.db.project.update({
      where: { id },
      data: { status, ...(lastError !== undefined ? { lastError } : {}) },
    });
  }

  async updateJob(id: string, update: Partial<JobRecord>): Promise<void> {
    await this.db.explorationJob.update({
      where: { id },
      data: {
        ...(update.stage !== undefined ? { stage: update.stage } : {}),
        ...(update.progress !== undefined ? { progress: update.progress } : {}),
        ...(update.message !== undefined ? { message: update.message } : {}),
        ...(update.startedAt !== undefined
          ? { startedAt: new Date(update.startedAt) }
          : {}),
        ...(update.completedAt !== undefined
          ? { completedAt: new Date(update.completedAt) }
          : {}),
        ...(update.error !== undefined ? { error: update.error } : {}),
      },
    });
  }

  async saveDiscovery(
    projectId: string,
    pages: DiscoveredPage[],
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.chapter.deleteMany({ where: { projectId } });
      await tx.discoveredPage.deleteMany({ where: { projectId } });
      for (const [order, page] of pages.entries()) {
        await tx.discoveredPage.create({
          data: {
            id: page.id,
            projectId,
            url: page.url,
            title: page.title,
            navigationLabel: page.navigationLabel ?? null,
            summary: page.summary,
            screenshotUrl: page.screenshotUrl,
            viewportWidth: 1440,
            viewportHeight: 900,
            order,
            elements: {
              create: page.elements.map((element) => ({
                id: element.id,
                role: element.role,
                name: element.name,
                text: element.text,
                selector: element.selector,
                x: element.rect.x,
                y: element.rect.y,
                width: element.rect.width ?? 0.01,
                height: element.rect.height ?? 0.01,
                importance: element.importance,
                safeToClick: element.safeToClick,
              })),
            },
          },
        });
      }
    });
  }

  async saveChapters(projectId: string, chapters: Chapter[]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.chapter.deleteMany({ where: { projectId } });
      for (const chapter of chapters) {
        await tx.chapter.create({
          data: {
            id: chapter.id,
            projectId,
            title: chapter.title,
            description: chapter.description,
            order: chapter.order,
          },
        });
        for (const step of chapter.steps) {
          const page = await tx.discoveredPage.findUnique({
            where: { projectId_url: { projectId, url: step.pageUrl } },
            select: { id: true },
          });
          if (!page)
            throw new Error(`No discovered page found for ${step.pageUrl}`);
          await tx.demoStep.create({
            data: {
              id: step.id,
              chapterId: chapter.id,
              pageId: page.id,
              title: step.title,
              description: step.description,
              order: step.order,
              selector: step.selector,
              hotspotX: step.hotspot.x,
              hotspotY: step.hotspot.y,
              hotspotWidth: step.hotspot.width ?? null,
              hotspotHeight: step.hotspot.height ?? null,
            },
          });
        }
      }
    });
  }

  async clearCredentials(projectId: string): Promise<void> {
    await this.db.project.update({
      where: { id: projectId },
      data: { credentialsCiphertext: null },
    });
  }

  async updateStep(
    projectId: string,
    stepId: string,
    input: PatchStepInput,
  ): Promise<DemoStep | null> {
    const existing = await this.db.demoStep.findFirst({
      where: { id: stepId, chapter: { projectId } },
      include: { page: true },
    });
    if (!existing) return null;
    const updated = await this.db.demoStep.update({
      where: { id: stepId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.selector !== undefined ? { selector: input.selector } : {}),
        ...(input.hotspot?.x !== undefined
          ? { hotspotX: input.hotspot.x }
          : {}),
        ...(input.hotspot?.y !== undefined
          ? { hotspotY: input.hotspot.y }
          : {}),
        ...(input.hotspot?.width !== undefined
          ? { hotspotWidth: input.hotspot.width }
          : {}),
        ...(input.hotspot?.height !== undefined
          ? { hotspotHeight: input.hotspot.height }
          : {}),
      },
      include: { page: true },
    });
    return this.step(updated, updated.page.url, updated.page.screenshotUrl);
  }

  async publish(
    projectId: string,
    requestedSlug?: string,
  ): Promise<PublishedDemoSnapshot | null> {
    const details = await this.getProject(projectId);
    if (!details || details.chapters.length === 0) return null;
    const slug =
      requestedSlug ??
      `${details.project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${projectId.slice(0, 6)}`;
    const snapshot: PublishedDemoSnapshot = {
      slug,
      project: {
        id: details.project.id,
        name: details.project.name,
        targetUrl: details.project.targetUrl,
      },
      chapters: details.chapters.map((chapter) => ({
        ...chapter,
        steps: chapter.steps.map((step) => ({ ...step, selector: null })),
      })),
      publishedAt: new Date().toISOString(),
    };
    await this.db.$transaction([
      this.db.publishedDemo.upsert({
        where: { projectId },
        create: {
          projectId,
          slug,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
        update: {
          slug,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(snapshot.publishedAt),
        },
      }),
      this.db.project.update({
        where: { id: projectId },
        data: { status: "PUBLISHED" },
      }),
    ]);
    return snapshot;
  }

  async getPublicDemo(slug: string): Promise<PublishedDemoSnapshot | null> {
    const record = await this.db.publishedDemo.findUnique({ where: { slug } });
    return record
      ? (record.snapshot as unknown as PublishedDemoSnapshot)
      : null;
  }

  private project(record: {
    id: string;
    name: string;
    targetUrl: string;
    origin: string;
    status: string;
    sampleMode: boolean;
    explorationPolicy: Prisma.JsonValue;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectRecord {
    return {
      id: record.id,
      name: record.name,
      targetUrl: record.targetUrl,
      origin: record.origin,
      status: record.status as ProjectRecord["status"],
      sampleMode: record.sampleMode,
      policy: record.explorationPolicy as unknown as ProjectRecord["policy"],
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      ...(record.lastError ? { lastError: record.lastError } : {}),
    };
  }

  private job(record: {
    id: string;
    projectId: string;
    stage: string;
    progress: number;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
  }): JobRecord {
    return {
      id: record.id,
      projectId: record.projectId,
      stage: record.stage as JobRecord["stage"],
      progress: record.progress,
      message: record.message,
      createdAt: iso(record.createdAt),
      updatedAt: iso(record.updatedAt),
      ...(record.startedAt ? { startedAt: iso(record.startedAt) } : {}),
      ...(record.completedAt ? { completedAt: iso(record.completedAt) } : {}),
      ...(record.error ? { error: record.error } : {}),
    };
  }

  private step(
    record: {
      id: string;
      chapterId: string;
      order: number;
      title: string;
      description: string;
      selector: string | null;
      hotspotX: number;
      hotspotY: number;
      hotspotWidth: number | null;
      hotspotHeight: number | null;
    },
    pageUrl: string,
    screenshotUrl: string,
  ): DemoStep {
    return {
      id: record.id,
      chapterId: record.chapterId,
      order: record.order,
      title: record.title,
      description: record.description,
      selector: record.selector,
      pageUrl,
      screenshotUrl,
      hotspot: {
        x: record.hotspotX,
        y: record.hotspotY,
        ...(record.hotspotWidth !== null ? { width: record.hotspotWidth } : {}),
        ...(record.hotspotHeight !== null
          ? { height: record.hotspotHeight }
          : {}),
      },
    };
  }
}
