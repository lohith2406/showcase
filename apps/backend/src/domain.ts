import type { Chapter, ExplorationPolicy, JobStage, ProjectStatus } from "@showcase/contracts";

export interface ProjectRecord {
  id: string;
  name: string;
  targetUrl: string;
  origin: string;
  status: ProjectStatus;
  policy: ExplorationPolicy;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface InternalProjectRecord extends ProjectRecord {
  credentialsCiphertext?: string;
}

export interface JobRecord {
  id: string;
  projectId: string;
  stage: JobStage;
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ProjectDetails {
  project: ProjectRecord;
  jobs: JobRecord[];
  chapters: Chapter[];
  publishedSlug?: string;
}

export interface CreateProjectRecordInput {
  name: string;
  targetUrl: string;
  origin: string;
  policy: ExplorationPolicy;
  credentialsCiphertext?: string;
}

export interface ShowcaseRepository {
  createProject(input: CreateProjectRecordInput): Promise<{ project: ProjectRecord; job: JobRecord }>;
  getProject(id: string): Promise<ProjectDetails | null>;
  getInternalProject(id: string): Promise<InternalProjectRecord | null>;
}

export interface ExplorationOrchestrator {
  enqueue(projectId: string, jobId: string): void | Promise<void>;
}
