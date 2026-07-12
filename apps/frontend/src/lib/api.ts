import type {
  Chapter,
  DemoStep,
  PatchStepInput,
  ProjectStatus,
} from "@showcase/contracts";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ProjectView {
  id: string;
  name: string;
  targetUrl: string;
  status: ProjectStatus;
  sampleMode: boolean;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface JobView {
  id: string;
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

export interface ProjectDetails {
  project: ProjectView;
  jobs: JobView[];
  chapters: Chapter[];
  publishedSlug?: string;
}

export interface PublishedDemo {
  slug: string;
  project: Pick<ProjectView, "id" | "name" | "targetUrl">;
  chapters: Chapter[];
  publishedAt: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: { message?: string } }).error
        : undefined;
    throw new Error(error?.message ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

export async function createProject(input: {
  name: string;
  targetUrl: string;
  sampleMode: boolean;
  credentials?: { username: string; password: string };
}): Promise<{ project: ProjectView; job: JobView }> {
  return apiFetch("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const getProject = (id: string) =>
  apiFetch<ProjectDetails>(`/api/v1/projects/${id}`, { cache: "no-store" });

export async function updateStep(
  projectId: string,
  stepId: string,
  input: PatchStepInput,
): Promise<DemoStep> {
  const result = await apiFetch<{ step: DemoStep }>(
    `/api/v1/projects/${projectId}/steps/${stepId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return result.step;
}

export const publishProject = (projectId: string, slug?: string) =>
  apiFetch<{ slug: string; publishedAt: string }>(
    `/api/v1/projects/${projectId}/publish`,
    {
      method: "POST",
      body: JSON.stringify(slug ? { slug } : {}),
    },
  );

export const getPublishedDemo = (slug: string) =>
  apiFetch<PublishedDemo>(`/api/v1/public/${slug}`, { cache: "no-store" });
