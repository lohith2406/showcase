"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  MousePointer2,
  Save,
  Share2,
} from "lucide-react";
import type { DemoStep } from "@showcase/contracts";
import { Corners } from "@/components/frame";
import {
  getProject,
  publishProject,
  updateStep,
  type ProjectDetails,
} from "@/lib/api";

function replaceStep(details: ProjectDetails, next: DemoStep): ProjectDetails {
  return {
    ...details,
    chapters: details.chapters.map((chapter) => ({
      ...chapter,
      steps: chapter.steps.map((step) => (step.id === next.id ? next : step)),
    })),
  };
}

export function DemoEditor({ projectId }: { projectId: string }) {
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void getProject(projectId)
      .then((next) => {
        setDetails(next);
        setSelectedId(next.chapters[0]?.steps[0]?.id ?? "");
        setPublishedSlug(next.publishedSlug ?? "");
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Could not load demo",
        ),
      );
  }, [projectId]);

  const steps = useMemo(
    () => details?.chapters.flatMap((chapter) => chapter.steps) ?? [],
    [details],
  );
  const selected = useMemo(
    () => steps.find((step) => step.id === selectedId),
    [steps, selectedId],
  );
  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setDescription(selected.description);
    }
  }, [selected]);

  async function save(patch?: { hotspot: { x: number; y: number } }) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const next = await updateStep(
        projectId,
        selected.id,
        patch ?? { title, description },
      );
      setDetails((current) => (current ? replaceStep(current, next) : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save step");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError("");
    try {
      const result = await publishProject(projectId);
      setPublishedSlug(result.slug);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not publish demo",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (!details || !selected)
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center">
        <LoaderCircle className="animate-spin text-[var(--ink)]" />
        <span className="sr-only">Loading editor</span>
      </main>
    );

  const stepNumber = steps.findIndex((step) => step.id === selected.id) + 1;

  return (
    <main className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:grid-cols-[264px_minmax(480px,1fr)_320px]">
      {/* Step index */}
      <aside className="overflow-x-auto border-b hair bg-[var(--card)] p-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="mb-5 px-2">
          <p className="eyebrow">Walkthrough</p>
          <h1 className="mt-1.5 truncate text-[17px] font-[600] tracking-[-0.02em]">
            {details.project.name}
          </h1>
          <p className="mono mt-1 text-[11px] text-[var(--faint)]">
            {steps.length} steps
          </p>
        </div>
        <nav className="flex gap-5 lg:block lg:space-y-6">
          {details.chapters.map((chapter) => (
            <section className="min-w-[220px] lg:min-w-0" key={chapter.id}>
              <h2 className="mb-2 px-2 text-[11px] font-[590] uppercase tracking-[0.1em] text-[var(--faint)]">
                {chapter.title}
              </h2>
              <div className="space-y-0.5">
                {chapter.steps.map((step) => {
                  const number =
                    steps.findIndex((item) => item.id === step.id) + 1;
                  const active = step.id === selected.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setSelectedId(step.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? "bg-[var(--paper-2)] text-[var(--ink)]" : "text-[var(--muted)] hover:bg-[var(--paper)]"}`}
                    >
                      {active ? (
                        <span className="frame relative grid size-5 shrink-0 place-items-center">
                          <Corners focus size={7} />
                          <span className="mono text-[9px] font-[700] text-[var(--focus-ink)]">
                            {number}
                          </span>
                        </span>
                      ) : (
                        <span className="mono grid size-5 shrink-0 place-items-center text-[10px] text-[var(--faint)]">
                          {number}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px]">
                        {step.title}
                      </span>
                      {active && (
                        <ChevronRight size={13} className="text-[var(--ink)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      {/* Canvas */}
      <section className="flex min-h-[520px] min-w-0 flex-col bg-[var(--paper)] lg:min-h-0">
        <div className="flex min-h-14 items-center justify-between border-b hair bg-[var(--card)] px-5 py-3">
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <MousePointer2 size={14} />
            <span>Click the screen to place the hotspot</span>
          </div>
          <span className="mono hidden text-[11px] text-[var(--faint)] sm:block">
            x {Math.round(selected.hotspot.x * 100)} · y{" "}
            {Math.round(selected.hotspot.y * 100)}
          </span>
        </div>
        <div className="grid flex-1 place-items-center overflow-auto p-5 sm:p-8">
          <div
            className="relative w-full max-w-[1080px] cursor-crosshair overflow-hidden rounded-xl border border-[var(--line-2)] bg-white shadow-[var(--shadow-lg)]"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              void save({
                hotspot: {
                  x: (event.clientX - rect.left) / rect.width,
                  y: (event.clientY - rect.top) / rect.height,
                },
              });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.screenshotUrl}
              alt={`Captured ${selected.title} screen`}
              className="block aspect-[16/10] w-full object-cover"
            />
            {/* framed hotspot marker */}
            <span
              className="pointer-events-none absolute size-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${selected.hotspot.x * 100}%`,
                top: `${selected.hotspot.y * 100}%`,
              }}
            >
              <Corners focus size={14} />
              <span className="mono absolute -left-2 -top-2.5 grid h-5 min-w-5 place-items-center rounded bg-[var(--focus)] px-1 text-[10px] font-[700] text-white">
                {stepNumber}
              </span>
            </span>
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 max-w-[360px] rounded-xl border border-[var(--line)] border-l-[3px] border-l-[var(--focus)] bg-white/95 p-4 shadow-[var(--shadow-md)] backdrop-blur">
              <p className="mb-1 text-sm font-[600]">{title}</p>
              <p className="text-[13px] leading-5 text-[var(--muted)]">
                {description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inspector */}
      <aside className="border-t hair bg-[var(--card)] p-5 sm:p-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="eyebrow">Step {String(stepNumber).padStart(2, "0")}</p>
            <p className="mt-1 text-[15px] font-[600]">Edit content</p>
          </div>
          <span
            className="flex items-center gap-1.5 text-[11px] font-[560] text-[var(--faint)]"
            aria-live="polite"
          >
            {saving ? (
              <>
                <LoaderCircle
                  size={13}
                  className="animate-spin text-[var(--focus)]"
                />
                Saving
              </>
            ) : (
              <>
                <Check size={13} className="text-[var(--ok)]" />
                Saved
              </>
            )}
          </span>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="label">Step title</span>
            <input
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Description</span>
            <textarea
              className="field min-h-32 resize-y leading-6"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button
            className="btn btn-ghost w-full"
            disabled={saving}
            onClick={() => void save()}
          >
            <Save size={15} />
            Save step
          </button>
        </div>

        <div className="my-6 border-t hair" />

        <div>
          <p className="text-sm font-[600]">Publish walkthrough</p>
          <p className="mb-4 mt-1.5 text-[13px] leading-5 text-[var(--muted)]">
            Creates a stable public snapshot. Edits stay private until you
            publish again.
          </p>
          <button
            className="btn btn-primary w-full"
            disabled={publishing}
            onClick={() => void publish()}
          >
            {publishing ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <Share2 size={15} />
            )}
            {publishedSlug ? "Publish changes" : "Publish demo"}
          </button>
          {publishedSlug && (
            <Link
              className="btn btn-ghost mt-2 w-full no-underline"
              href={`/d/${publishedSlug}`}
              target="_blank"
            >
              <ExternalLink size={14} />
              Open shared demo
            </Link>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="error-note mt-5 rounded-lg p-3 text-xs leading-5"
          >
            {error}
          </p>
        )}
      </aside>
    </main>
  );
}
