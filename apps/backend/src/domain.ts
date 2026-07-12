import type {
  Chapter,
  Credentials,
  DemoStep,
  DiscoveredPage,
  ExplorationPolicy,
  JobStage,
  PatchStepInput,
  ProjectStatus,
} from "@showcase/contracts";

export interface ProjectRecord {
  id: string;
  name: string;
  targetUrl: string;
  origin: string;
  status: ProjectStatus;
  sampleMode: boolean;
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
  sampleMode: boolean;
  credentialsCiphertext?: string;
}

export interface PublishedDemoSnapshot {
  slug: string;
  project: Pick<ProjectRecord, "id" | "name" | "targetUrl">;
  chapters: Chapter[];
  publishedAt: string;
}

export interface ShowcaseRepository {
  createProject(
    input: CreateProjectRecordInput,
  ): Promise<{ project: ProjectRecord; job: JobRecord }>;
  getProject(id: string): Promise<ProjectDetails | null>;
  getInternalProject(id: string): Promise<InternalProjectRecord | null>;
  updateProject(
    id: string,
    status: ProjectStatus,
    lastError?: string,
  ): Promise<void>;
  updateJob(
    id: string,
    update: Partial<
      Pick<
        JobRecord,
        "stage" | "progress" | "message" | "startedAt" | "completedAt" | "error"
      >
    >,
  ): Promise<void>;
  saveDiscovery(projectId: string, pages: DiscoveredPage[]): Promise<void>;
  saveChapters(projectId: string, chapters: Chapter[]): Promise<void>;
  clearCredentials(projectId: string): Promise<void>;
  updateStep(
    projectId: string,
    stepId: string,
    input: PatchStepInput,
  ): Promise<DemoStep | null>;
  publish(
    projectId: string,
    slug?: string,
  ): Promise<PublishedDemoSnapshot | null>;
  getPublicDemo(slug: string): Promise<PublishedDemoSnapshot | null>;
}

export interface ExplorerAgent {
  explore(
    project: InternalProjectRecord,
    credentials?: Credentials,
  ): Promise<DiscoveredPage[]>;
}

export interface PlannerAgent {
  plan(pages: DiscoveredPage[]): Promise<Chapter[]>;
}

export interface ExplorationOrchestrator {
  enqueue(projectId: string, jobId: string): void | Promise<void>;
}
