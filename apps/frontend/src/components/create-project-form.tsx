"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  KeyRound,
  Play,
  ShieldCheck,
} from "lucide-react";
import { createProject } from "@/lib/api";
import {
  projectInputFromForm,
  type CreateProjectInput,
} from "@/lib/project-form";

export function CreateProjectForm() {
  const router = useRouter();
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    targetUrl: "",
  });

  async function submit(input: CreateProjectInput) {
    setLoading(true);
    setError("");
    try {
      const result = await createProject(input);
      router.push(`/projects/${result.project.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start exploration",
      );
      setLoading(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        className="card p-6 sm:p-9"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            void submit(
              projectInputFromForm(new FormData(event.currentTarget)),
            );
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Check the sign-in details",
            );
          }
        }}
      >
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2.5">New exploration</p>
            <h2 className="text-[22px] font-[600] tracking-[-0.03em]">
              Connect your product
            </h2>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--paper-2)] text-[var(--ink)]">
            <ShieldCheck size={18} />
          </span>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="label">Demo name</span>
            <input
              className="field"
              name="name"
              required
              minLength={2}
              value={form.name}
              placeholder="Spring launch walkthrough"
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="label">Product URL</span>
            <input
              className="field mono text-[13px]"
              name="targetUrl"
              required
              type="url"
              value={form.targetUrl}
              placeholder="https://app.yourproduct.com"
              onChange={(event) =>
                setForm({ ...form, targetUrl: event.target.value })
              }
            />
          </label>

          <div className="border-t hair pt-1">
            <button
              className="btn btn-quiet flex w-full justify-between px-1 text-[13px] font-[560]"
              type="button"
              aria-expanded={advanced}
              onClick={() => setAdvanced(!advanced)}
            >
              <span className="flex items-center gap-2">
                <KeyRound size={14} />
                Sign-in details
                <span className="text-[var(--faint)]">optional</span>
              </span>
              <ChevronDown
                className={`transition-transform ${advanced ? "rotate-180" : ""}`}
                size={15}
              />
            </button>
          </div>

          {advanced && (
            <div className="grid gap-4 rounded-lg border-l-2 border-[var(--focus)] bg-[var(--focus-soft)] p-5 sm:grid-cols-2">
              <label className="block">
                <span className="label">Username or email</span>
                <input
                  className="field"
                  name="username"
                  autoComplete="username"
                />
              </label>
              <label className="block">
                <span className="label">Password</span>
                <input
                  className="field"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                />
              </label>
              <p className="text-xs leading-5 text-[var(--muted)] sm:col-span-2">
                Credentials are encrypted for this run and deleted the moment
                exploration finishes.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="error-note rounded-xl px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <button
            className="btn btn-primary w-full sm:w-auto"
            disabled={loading}
            type="submit"
          >
            {loading ? "Preparing exploration…" : "Explore product"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      <aside className="card flex flex-col gap-5 p-6 sm:p-7">
        <div>
          <p className="eyebrow mb-3">No account needed</p>
          <h3 className="text-[17px] font-[600] tracking-[-0.02em]">
            See the studio first
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Run the full flow on a synthetic SaaS workspace — chapters,
            hotspots, editing, and publishing. No Playwright, no API spend.
          </p>
        </div>
        <button
          className="btn btn-ghost w-full justify-between"
          disabled={loading}
          type="button"
          onClick={() =>
            void submit({
              name: "Sample product",
              targetUrl: "https://sample.showcase.ai",
              sampleMode: true,
            })
          }
        >
          <span className="flex items-center gap-2">
            <Play size={14} fill="currentColor" />
            Launch sample
          </span>
          <ArrowRight size={14} />
        </button>
      </aside>
    </div>
  );
}
