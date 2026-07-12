import type {
  Chapter,
  DemoStep,
  DiscoveredElement,
  DiscoveredPage,
} from "@showcase/contracts";

const destructivePattern =
  /\b(delete|remove|destroy|terminate|cancel subscription|reset|revoke|disable|archive|sign out|log out|purchase|pay|submit payment)\b/i;

export function isDestructiveAction(label: string): boolean {
  return destructivePattern.test(label);
}

function stepFromElement(
  page: DiscoveredPage,
  element: DiscoveredElement,
  chapterId: string,
  order: number,
): DemoStep {
  const label = element.name || element.text || `Explore ${page.title}`;
  return {
    id: `step-${page.id}-${element.id}`,
    chapterId,
    order,
    title: label,
    description: `Use ${label.toLowerCase()} to continue this workflow.`,
    pageUrl: page.url,
    screenshotUrl: page.screenshotUrl,
    hotspot: element.rect,
    selector: element.selector,
  };
}

export class FallbackPlannerAgent {
  async plan(pages: DiscoveredPage[]): Promise<Chapter[]> {
    return buildFallbackPlan(pages);
  }
}

export function buildFallbackPlan(pages: DiscoveredPage[]): Chapter[] {
  return pages.map((page, chapterOrder) => {
    const chapterId = `chapter-${page.id}`;
    const actionable = page.elements
      .filter(
        (element) =>
          element.safeToClick &&
          !isDestructiveAction(`${element.name} ${element.text}`),
      )
      .sort((left, right) => right.importance - left.importance)
      .slice(0, 6);
    const steps = actionable.map((element, order) =>
      stepFromElement(page, element, chapterId, order),
    );
    if (steps.length === 0) {
      steps.push({
        id: `step-${page.id}-overview`,
        chapterId,
        order: 0,
        title: `Explore ${page.title || "this page"}`,
        description:
          page.summary || "Review the key information available on this page.",
        pageUrl: page.url,
        screenshotUrl: page.screenshotUrl,
        hotspot: { x: 0.5, y: 0.5, width: 0.01, height: 0.01 },
        selector: null,
      });
    }
    return {
      id: chapterId,
      order: chapterOrder,
      title:
        page.navigationLabel || page.title || `Chapter ${chapterOrder + 1}`,
      description: page.summary,
      steps,
    };
  });
}
