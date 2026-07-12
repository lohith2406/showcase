import type { Chapter, DemoStep } from "@showcase/contracts";

export interface PlaybackStep {
  chapter: Chapter;
  step: DemoStep;
}

export function flattenDemoSteps(chapters: Chapter[]): PlaybackStep[] {
  return [...chapters]
    .sort((left, right) => left.order - right.order)
    .flatMap((chapter) =>
      [...chapter.steps]
        .sort((left, right) => left.order - right.order)
        .map((step) => ({ chapter, step })),
    );
}

export function stepPosition(
  chapters: Chapter[],
  stepId: string,
): { current: number; total: number } {
  const steps = flattenDemoSteps(chapters);
  const index = steps.findIndex(({ step }) => step.id === stepId);
  return { current: Math.max(0, index) + 1, total: steps.length };
}
