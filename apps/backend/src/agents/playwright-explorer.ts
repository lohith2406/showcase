import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";
import type {
  Credentials,
  DiscoveredElement,
  DiscoveredPage,
} from "@showcase/contracts";
import type { ExplorerAgent, InternalProjectRecord } from "../domain.js";
import type { AssetStore } from "../storage/assets.js";
import { assertSafeTarget } from "../security/target.js";
import { isDestructiveAction } from "./planner.js";

interface RawElement {
  role: string;
  name: string;
  text: string;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
}

export class PlaywrightExplorerAgent implements ExplorerAgent {
  constructor(
    private readonly assets: AssetStore,
    private readonly validateRequest: (
      url: string,
    ) => Promise<void> = assertSafeTarget,
  ) {}

  async explore(
    project: InternalProjectRecord,
    credentials?: Credentials,
  ): Promise<DiscoveredPage[]> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: false,
    });
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        await route.continue();
        return;
      }
      try {
        await this.validateRequest(url);
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });
    const page = await context.newPage();
    try {
      await page.goto(project.targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: project.policy.navigationTimeoutMs,
      });
      const authenticated = credentials
        ? await this.login(
            page,
            credentials,
            project.origin,
            project.policy.navigationTimeoutMs,
          )
        : false;
      if (authenticated) {
        await page.goto(project.targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: project.policy.navigationTimeoutMs,
        });
        await this.assertAuthenticatedTarget(page, project.origin);
      }
      const routeQueue = await this.navigationRoutes(
        page,
        project.origin,
        project.policy.maxPages,
      );
      const routes = [page.url(), ...routeQueue].filter(
        (value, index, values) => values.indexOf(value) === index,
      );
      const discovered: DiscoveredPage[] = [];
      for (const route of routes.slice(0, project.policy.maxPages)) {
        if (
          project.policy.sameOriginOnly &&
          new URL(route).origin !== project.origin
        )
          continue;
        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: project.policy.navigationTimeoutMs,
        });
        await page
          .waitForLoadState("networkidle", { timeout: 5_000 })
          .catch(() => undefined);
        discovered.push(
          await this.capture(page, project.id, discovered.length),
        );
      }
      return discovered;
    } finally {
      await context.close();
      await browser.close();
    }
  }

  private async login(
    page: Page,
    credentials: Credentials,
    expectedOrigin: string,
    timeout: number,
  ): Promise<boolean> {
    const password = page.locator('input[type="password"]').first();
    if (!(await password.isVisible().catch(() => false))) return false;
    if (new URL(page.url()).origin !== expectedOrigin) {
      throw new Error("Refusing to enter credentials on an unexpected origin");
    }
    const username = page
      .locator(
        'input[type="email"], input[name*="user" i], input[name*="email" i], input[type="text"]',
      )
      .first();
    if (await username.isVisible().catch(() => false))
      await username.fill(credentials.username);
    await password.fill(credentials.password);
    const submit = page
      .locator(
        'button[type="submit"], input[type="submit"], form:has(input[type="password"]) button',
      )
      .first();
    if (await submit.isVisible().catch(() => false)) await submit.click();
    else await password.press("Enter");
    await password.waitFor({ state: "hidden", timeout });
    return true;
  }

  private async assertAuthenticatedTarget(
    page: Page,
    expectedOrigin: string,
  ): Promise<void> {
    if (new URL(page.url()).origin !== expectedOrigin) {
      throw new Error(
        "Authenticated target redirected to an unexpected origin",
      );
    }
    const password = page.locator('input[type="password"]').first();
    if (await password.isVisible().catch(() => false)) {
      throw new Error(
        "Authentication did not reach the requested product page",
      );
    }
  }

  private async navigationRoutes(
    page: Page,
    origin: string,
    limit: number,
  ): Promise<string[]> {
    const hrefs = await page
      .locator('nav a[href], aside a[href], [role="navigation"] a[href]')
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
    return hrefs
      .filter((href) => {
        try {
          const url = new URL(href);
          return url.origin === origin && !url.hash;
        } catch {
          return false;
        }
      })
      .slice(0, limit);
  }

  private async capture(
    page: Page,
    projectId: string,
    order: number,
  ): Promise<DiscoveredPage> {
    const title =
      (await page.title()) ||
      new URL(page.url()).pathname.split("/").filter(Boolean).at(-1) ||
      "Overview";
    const screenshot = await page.screenshot({ fullPage: false, type: "png" });
    const screenshotUrl = await this.assets.put(
      `${projectId}/page-${order}.png`,
      screenshot,
      "image/png",
    );
    const raw = (await page
      .locator('a, button, [role="button"], input:not([type="hidden"]), select')
      .evaluateAll((nodes) =>
        nodes.slice(0, 120).flatMap((node, index) => {
          const element = node as HTMLElement;
          const rect = element.getBoundingClientRect();
          if (rect.width < 4 || rect.height < 4) return [];
          const testId = element.getAttribute("data-testid");
          const id = element.id;
          const selector = testId
            ? `[data-testid="${CSS.escape(testId)}"]`
            : id
              ? `#${CSS.escape(id)}`
              : `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
          return [
            {
              role:
                element.getAttribute("role") || element.tagName.toLowerCase(),
              name:
                element.getAttribute("aria-label") ||
                element.getAttribute("title") ||
                "",
              text: (
                element.innerText ||
                (element as HTMLInputElement).value ||
                ""
              )
                .trim()
                .slice(0, 240),
              selector,
              rect: {
                x: rect.x / window.innerWidth,
                y: rect.y / window.innerHeight,
                width: rect.width / window.innerWidth,
                height: rect.height / window.innerHeight,
              },
            },
          ];
        }),
      )) as RawElement[];
    const elements: DiscoveredElement[] = raw
      .slice(0, 50)
      .map((element, index) => {
        const label = `${element.name} ${element.text}`.trim();
        const prominent =
          /create|add|new|invite|start|continue|save|view|manage/i.test(label);
        return {
          id: randomUUID(),
          ...element,
          rect: {
            x: Math.max(0, Math.min(1, element.rect.x)),
            y: Math.max(0, Math.min(1, element.rect.y)),
            width: Math.max(0, Math.min(1, element.rect.width)),
            height: Math.max(0, Math.min(1, element.rect.height)),
          },
          importance: prominent ? 0.95 : Math.max(0.35, 0.8 - index * 0.01),
          safeToClick: !isDestructiveAction(label),
        };
      });
    return {
      id: randomUUID(),
      url: page.url(),
      title,
      navigationLabel: title,
      summary: `Key actions and information discovered on ${title}.`,
      screenshotUrl,
      elements,
    };
  }
}
