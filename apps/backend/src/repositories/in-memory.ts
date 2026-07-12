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

  async createProject(input: CreateProjectRecordInput): Promise<{ project: ProjectRecord; job: JobRecord }> {
    const now = new Date().toISOString();
    const internal: InternalProjectRecord = {
      id: randomUUID(),
      name: input.name,
      targetUrl: input.targetUrl,
      origin: input.origin,
      status: "QUEUED",
      policy: input.policy,
      createdAt: now,
      updatedAt: now,
      ...(input.credentialsCiphertext ? { credentialsCiphertext: input.credentialsCiphertext } : {}),
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
      chapters: [],
    };
  }

  async getInternalProject(id: string): Promise<InternalProjectRecord | null> {
    return this.projects.get(id) ?? null;
  }

  private toPublic(project: InternalProjectRecord): ProjectRecord {
    const { credentialsCiphertext: _secret, ...publicProject } = project;
    return publicProject;
  }
}
