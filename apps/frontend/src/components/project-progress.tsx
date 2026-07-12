"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { Corners } from "@/components/frame";
import { getProject, type ProjectDetails } from "@/lib/api";

const stages = ["EXPLORING", "PLANNING", "GENERATING"] as const;
const copy = {
  EXPLORING: { title: "Exploring", note: "Mapping navigation and visible UI" },
  PLANNING: { title: "Planning", note: "Selecting the workflows that matter" },
  GENERATING: {
    title: "Generating",
    note: "Composing chapters, steps, and hotspots",
  },
};

export function ProjectProgress({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const next = await getProject(projectId);
        if (!active) return;
        setDetails(next);
        if (
          next.project.status === "READY" ||
          next.project.status === "PUBLISHED"
        ) {
          router.replace(`/projects/${projectId}/edit`);
          return;
        }
        if (next.project.status !== "FAILED") setTimeout(refresh, 1200);
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Could not load project",
          );
      }
    }
    void refresh();
    return () => {
      active = false;
    };
  }, [projectId, router]);

  const job = details?.jobs[0];
  const currentIndex = stages.indexOf(job?.stage as (typeof stages)[number]);
  const failed = error || details?.project.status === "FAILED";
  const progress = job?.progress ?? 4;

  return (
    <main className="wrap grid min-h-[calc(100vh-64px)] place-items-center py-12">
      <section className="card w-full max-w-2xl p-7 sm:p-10">
        <div className="mb-9 flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow mb-3 text-[var(--focus-ink)]">Agent at work</p>
            <h1 className="text-[26px] font-[620] tracking-[-0.035em]">
              {details?.project.name ?? "Preparing the workspace"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {job?.message ?? "Assigning an explorer…"}
            </p>
          </div>
          <span className="mono shrink-0 text-[26px] font-[600] tabular-nums">
            {progress}
            <span className="text-sm text-[var(--faint)]">%</span>
          </span>
        </div>

        <div className="mb-9 h-1.5 overflow-hidden rounded-full bg-[var(--paper-2)]">
          <div
            className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="space-y-2.5">
          {stages.map((stage, index) => {
            const done = currentIndex > index || job?.stage === "COMPLETE";
            const active = currentIndex === index && !failed;
            return (
              <li key={stage} className="flex items-center gap-4">
                {done ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--ink)] text-white">
                    <Check size={14} />
                  </span>
                ) : active ? (
                  <span className="frame relative grid size-7 shrink-0 place-items-center rounded-md">
                    <Corners focus size={9} />
                    <LoaderCircle
                      size={13}
                      className="animate-spin text-[var(--focus)]"
                    />
                  </span>
                ) : (
                  <span className="mono grid size-7 shrink-0 place-items-center rounded-md border hair text-[11px] text-[var(--faint)]">
                    {index + 1}
                  </span>
                )}
                <div>
                  <p
                    className={`text-sm font-[590] ${done || active ? "text-[var(--ink)]" : "text-[var(--faint)]"}`}
                  >
                    {copy[stage].title}
                  </p>
                  <p className="text-[12.5px] text-[var(--faint)]">
                    {copy[stage].note}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {failed && (
          <p role="alert" className="error-note mt-7 rounded-lg p-4 text-sm">
            {error || details?.project.lastError || "Exploration failed"}
          </p>
        )}
      </section>
    </main>
  );
}
