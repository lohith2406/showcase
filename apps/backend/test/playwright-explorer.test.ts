import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { PlaywrightExplorerAgent } from "../src/agents/playwright-explorer.js";
import type { InternalProjectRecord } from "../src/domain.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe("authenticated Playwright exploration", () => {
  it("waits for SPA authentication and captures the originally requested page", async () => {
    const server = createServer((request, response) => {
      const authenticated = request.headers.cookie?.includes("session=valid");
      if (request.url === "/session" && request.method === "POST") {
        response.writeHead(204, {
          "set-cookie": "session=valid; Path=/; HttpOnly",
        });
        response.end();
        return;
      }
      if (request.url === "/login") {
        response.setHeader("content-type", "text/html");
        response.end(`<!doctype html><title>Sign in</title><form>
            <input type="email" aria-label="Email">
            <input type="password" aria-label="Password">
            <button type="button" id="login">Sign in</button>
          </form><script>
            login.onclick = async () => {
              await fetch('/session', { method: 'POST' });
              setTimeout(() => location.assign('/dashboard'), 150);
            };
          </script>`);
        return;
      }
      if (!authenticated) {
        response.writeHead(302, { location: "/login" });
        response.end();
        return;
      }
      response.setHeader("content-type", "text/html");
      if (request.url === "/settings") {
        response.end("<!doctype html><title>Settings</title><h1>Settings</h1>");
        return;
      }
      response.end(
        '<!doctype html><title>Dashboard</title><nav><a href="/settings">Settings</a></nav><h1>Dashboard</h1>',
      );
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test port");
    const origin = `http://127.0.0.1:${address.port}`;
    const project: InternalProjectRecord = {
      id: "authenticated-project",
      name: "Authenticated app",
      targetUrl: `${origin}/dashboard`,
      origin,
      status: "EXPLORING",
      sampleMode: false,
      policy: {
        maxPages: 3,
        maxActionsPerPage: 8,
        navigationTimeoutMs: 5_000,
        sameOriginOnly: true,
      },
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
    const explorer = new PlaywrightExplorerAgent(
      { put: async (key) => `memory://${key}` },
      async () => undefined,
    );

    const pages = await explorer.explore(project, {
      username: "demo@example.com",
      password: "secret",
    });

    expect(pages.map((page) => page.title)).toContain("Dashboard");
    expect(pages.every((page) => !page.url.includes("/login"))).toBe(true);
  }, 20_000);
});
