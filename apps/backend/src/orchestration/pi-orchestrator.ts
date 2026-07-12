import { Agent } from "@earendil-works/pi-agent-core";
import type { Credentials, ProjectStatus } from "@showcase/contracts";
import type { CredentialCipher } from "../security/credentials.js";
import type {
  ExplorerAgent,
  PlannerAgent,
  ShowcaseRepository,
} from "../domain.js";
import { assertSafeTarget } from "../security/target.js";

interface PiOrchestratorDependencies {
  repository: ShowcaseRepository;
  explorer: ExplorerAgent;
  sampleExplorer?: ExplorerAgent;
  planner: PlannerAgent;
  samplePlanner?: PlannerAgent;
  credentialCipher?: CredentialCipher;
  allowPrivateTargets: boolean;
  targetValidator?: (target: string) => Promise<void>;
}

export class PiExplorationOrchestrator {
  private readonly runs = new Map<string, Promise<void>>();
  private readonly runtimes = new Map<string, Agent>();

  constructor(private readonly dependencies: PiOrchestratorDependencies) {}

  enqueue(projectId: string, jobId: string): void {
    if (this.runs.has(jobId)) return;
    const runtime = new Agent({
      initialState: {
        systemPrompt:
          "Coordinate showcase exploration stages. Reasoning is delegated to the planner adapter.",
        messages: [],
      },
      sessionId: jobId,
    });
    this.runtimes.set(jobId, runtime);
    const run = this.run(projectId, jobId, runtime).finally(() => {
      this.runs.delete(jobId);
      this.runtimes.delete(jobId);
    });
    this.runs.set(jobId, run);
  }

  async waitFor(jobId: string): Promise<void> {
    await this.runs.get(jobId);
  }

  private note(runtime: Agent, content: string): void {
    runtime.state.messages = [
      ...runtime.state.messages,
      { role: "user", content, timestamp: Date.now() },
    ];
  }

  private async transition(
    runtime: Agent,
    projectId: string,
    jobId: string,
    status: ProjectStatus,
    stage: "EXPLORING" | "PLANNING" | "GENERATING",
    progress: number,
    message: string,
  ): Promise<void> {
    this.note(runtime, `${stage}: ${message}`);
    await Promise.all([
      this.dependencies.repository.updateProject(projectId, status),
      this.dependencies.repository.updateJob(jobId, {
        stage,
        progress,
        message,
        ...(stage === "EXPLORING"
          ? { startedAt: new Date().toISOString() }
          : {}),
      }),
    ]);
  }

  private async run(
    projectId: string,
    jobId: string,
    runtime: Agent,
  ): Promise<void> {
    try {
      const project =
        await this.dependencies.repository.getInternalProject(projectId);
      if (!project) throw new Error("Project not found");
      if (!project.sampleMode && !this.dependencies.allowPrivateTargets) {
        await (this.dependencies.targetValidator ?? assertSafeTarget)(
          project.targetUrl,
        );
      }
      let credentials: Credentials | undefined;
      if (project.credentialsCiphertext && this.dependencies.credentialCipher) {
        credentials = this.dependencies.credentialCipher.decrypt(
          project.credentialsCiphertext,
        );
      }

      await this.transition(
        runtime,
        projectId,
        jobId,
        "EXPLORING",
        "EXPLORING",
        15,
        "Mapping navigation and UI elements",
      );
      const explorer =
        project.sampleMode && this.dependencies.sampleExplorer
          ? this.dependencies.sampleExplorer
          : this.dependencies.explorer;
      const pages = await explorer.explore(project, credentials);
      await this.dependencies.repository.saveDiscovery(projectId, pages);

      await this.transition(
        runtime,
        projectId,
        jobId,
        "PLANNING",
        "PLANNING",
        60,
        "Selecting core workflows",
      );
      const planner =
        project.sampleMode && this.dependencies.samplePlanner
          ? this.dependencies.samplePlanner
          : this.dependencies.planner;
      const chapters = await planner.plan(pages);

      await this.transition(
        runtime,
        projectId,
        jobId,
        "GENERATING",
        "GENERATING",
        85,
        "Generating walkthrough hotspots",
      );
      await this.dependencies.repository.saveChapters(projectId, chapters);
      this.note(runtime, "COMPLETE: Walkthrough is ready for editing");
      await Promise.all([
        this.dependencies.repository.updateProject(projectId, "READY"),
        this.dependencies.repository.updateJob(jobId, {
          stage: "COMPLETE",
          progress: 100,
          message: "Walkthrough is ready for editing",
          completedAt: new Date().toISOString(),
        }),
      ]);
    } catch (error) {
      const failure = error as { name?: unknown; code?: unknown };
      console.error(`[showcase-orchestrator] job ${jobId} failed`, {
        name: typeof failure.name === "string" ? failure.name : "UnknownError",
        code: typeof failure.code === "string" ? failure.code : undefined,
      });
      const message =
        "Exploration could not be completed. Check the target and try again.";
      await Promise.all([
        this.dependencies.repository.updateProject(
          projectId,
          "FAILED",
          message,
        ),
        this.dependencies.repository.updateJob(jobId, {
          stage: "FAILED",
          progress: 100,
          message: "Exploration failed",
          error: message,
          completedAt: new Date().toISOString(),
        }),
      ]);
    } finally {
      await this.dependencies.repository.clearCredentials(projectId);
    }
  }
}
