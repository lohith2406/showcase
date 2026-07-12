"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Corners } from "@/components/frame";
import { flattenDemoSteps, stepPosition } from "@/lib/demo";
import { getPublishedDemo, type PublishedDemo } from "@/lib/api";

export function DemoPlayer({ slug }: { slug: string }) {
  const [demo, setDemo] = useState<PublishedDemo | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPublishedDemo(slug)
      .then(setDemo)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Demo not found"),
      );
  }, [slug]);

  const sequence = useMemo(
    () => (demo ? flattenDemoSteps(demo.chapters) : []),
    [demo],
  );
  useEffect(() => {
    function navigate(event: KeyboardEvent) {
      if (event.key === "ArrowRight")
        setIndex((current) => Math.min(sequence.length - 1, current + 1));
      if (event.key === "ArrowLeft")
        setIndex((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [sequence.length]);

  const entry = sequence[index];
  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card max-w-md p-9 text-center">
          <p className="text-xl font-[620] tracking-[-0.02em]">
            This demo is unavailable
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
        </div>
      </div>
    );
  if (!demo || !entry)
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin text-[var(--ink)]" />
      </div>
    );

  const position = stepPosition(demo.chapters, entry.step.id);
  const last = index === sequence.length - 1;

  return (
    <main className="min-h-screen bg-[var(--paper)] p-3 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-md)] sm:min-h-[calc(100vh-40px)]">
        <header className="flex h-16 items-center justify-between border-b hair px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-[600]">{demo.project.name}</p>
              <p className="eyebrow truncate">{entry.chapter.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono text-[11px] text-[var(--muted)]">
              {position.current} / {position.total}
            </span>
            <button
              className="grid size-9 place-items-center rounded-lg border hair bg-white text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
              aria-label="Close demo"
              onClick={() => window.history.back()}
            >
              <X size={14} />
            </button>
          </div>
        </header>

        <section className="grid flex-1 place-items-center overflow-hidden p-3 sm:p-7 lg:p-10">
          <div className="relative w-full max-w-[1200px] overflow-hidden rounded-xl border border-[var(--line-2)] bg-white shadow-[var(--shadow-lg)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.step.screenshotUrl}
              alt="Product screen"
              className="block aspect-[16/10] w-full object-cover"
            />
            {/* framed hotspot marker */}
            <span
              className="absolute size-9 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${entry.step.hotspot.x * 100}%`,
                top: `${entry.step.hotspot.y * 100}%`,
              }}
            >
              <Corners focus size={13} />
              <span className="absolute -left-2 -top-2.5 grid h-5 min-w-5 place-items-center rounded bg-[var(--focus)] px-1 text-[10px] font-[700] text-white">
                {position.current}
              </span>
            </span>
            <article className="absolute bottom-3 left-3 right-3 max-w-md rounded-xl border border-[var(--line)] border-l-[3px] border-l-[var(--focus)] bg-white/95 p-4 shadow-[var(--shadow-md)] backdrop-blur sm:bottom-6 sm:left-6">
              <p className="mb-1 text-sm font-[600] sm:text-base">
                {entry.step.title}
              </p>
              <p className="text-[13px] leading-5 text-[var(--muted)] sm:text-sm">
                {entry.step.description}
              </p>
            </article>
          </div>
        </section>

        <footer className="flex h-16 items-center justify-between border-t hair px-4 sm:px-6">
          <button
            className="btn btn-ghost min-h-9 px-3"
            disabled={index === 0}
            onClick={() => setIndex(Math.max(0, index - 1))}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="hidden items-center gap-1.5 sm:flex">
            {sequence.map((item, itemIndex) => (
              <button
                aria-label={`Go to step ${itemIndex + 1}`}
                key={item.step.id}
                onClick={() => setIndex(itemIndex)}
                className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-6 bg-[var(--focus)]" : "w-1.5 bg-[var(--line-2)] hover:bg-[var(--faint)]"}`}
              />
            ))}
          </div>
          <button
            className="btn btn-primary min-h-9 px-3"
            onClick={() => setIndex(last ? 0 : index + 1)}
          >
            {last ? (
              <>
                <RotateCcw size={14} />
                Replay
              </>
            ) : (
              <>
                Next
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </footer>
      </div>
    </main>
  );
}
