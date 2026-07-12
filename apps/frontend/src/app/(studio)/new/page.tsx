import type { Metadata } from "next";
import { CreateProjectForm } from "@/components/create-project-form";
import { Corners } from "@/components/frame";

export const metadata: Metadata = { title: "Create a demo" };

export default function NewProjectPage() {
  return (
    <main className="wrap py-12 sm:py-16 lg:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <p className="eyebrow mb-5">Autonomous product demos</p>
          <h1 className="display text-[clamp(2.5rem,5.4vw,4.3rem)]">
            Frame the moments
            <br />
            that matter.
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-8 text-[var(--muted)]">
            Point the agent at your product. It explores the live interface,
            finds the workflows worth showing, and turns each one into a framed,
            annotated step you can edit and share.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {[
              ["Same-origin", "safe exploration"],
              ["Editable", "copy + hotspots"],
              ["One link", "public playback"],
            ].map(([term, desc]) => (
              <div key={term}>
                <dt className="text-sm font-[590] text-[var(--ink)]">{term}</dt>
                <dd className="text-[13px] text-[var(--faint)]">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Thesis: a framed, annotated product screen — the studio's output */}
        <div className="relative">
          <div className="frame p-4 sm:p-5">
            <Corners size={20} />
            <div className="overflow-hidden rounded-xl border border-[var(--line-2)] bg-white shadow-[var(--shadow-lg)]">
              <div className="flex h-9 items-center gap-2 border-b hair px-4">
                <span className="size-2 rounded-full bg-[var(--focus)]" />
                <span className="mono text-[11px] text-[var(--faint)]">
                  app.yourproduct.com
                </span>
              </div>
              <div className="grid grid-cols-[56px_1fr] bg-[#fbfaf7]">
                <div className="space-y-2.5 border-r hair p-3">
                  <span className="block h-2 w-6 rounded-full bg-[var(--line-2)]" />
                  <span className="block h-2 w-5 rounded-full bg-[var(--line)]" />
                  <span className="block h-2 w-6 rounded-full bg-[var(--line)]" />
                  <span className="block h-2 w-4 rounded-full bg-[var(--line)]" />
                </div>
                <div className="min-h-[236px] space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="block h-3 w-28 rounded-full bg-[var(--line-2)]" />
                    {/* the focused target */}
                    <span className="frame relative inline-flex h-8 items-center rounded-md bg-[var(--ink)] px-3">
                      <Corners focus size={11} />
                      <span className="text-[11px] font-[560] text-white">
                        Create a demo
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((card) => (
                      <div
                        key={card}
                        className="rounded-lg border hair bg-white p-3"
                      >
                        <span className="block h-2 w-10 rounded-full bg-[var(--line)]" />
                        <span className="mt-3 block h-4 w-12 rounded bg-[var(--paper-2)]" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border hair bg-white p-3">
                    <span className="block h-2 w-20 rounded-full bg-[var(--line)]" />
                    <div className="mt-3 flex items-end gap-2">
                      {[10, 16, 12, 22, 18, 26].map((h, i) => (
                        <span
                          key={i}
                          className="w-full rounded-sm bg-[var(--paper-2)]"
                          style={{ height: h }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* the annotation the agent writes for this frame */}
          <div className="absolute -bottom-3 right-2 w-60 rounded-lg border border-[var(--line)] border-l-[3px] border-l-[var(--focus)] bg-white p-3.5 shadow-[var(--shadow-md)] sm:right-6">
            <p className="eyebrow text-[var(--focus-ink)]">Step 02</p>
            <p className="mt-1 text-[13px] font-[600]">Create your first demo</p>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">
              Start here to turn a live workflow into a shareable walkthrough.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-20 border-t hair pt-12 sm:mt-24">
        <CreateProjectForm />
      </div>
    </main>
  );
}
