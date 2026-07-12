import { describe, expect, it } from "vitest";
import { projectInputFromForm } from "../src/lib/project-form.js";

describe("project intake form", () => {
  it("includes credentials from the submitted DOM values", () => {
    const data = new FormData();
    data.set("name", "Jyuni demo");
    data.set("targetUrl", "https://app.jyuni.com/dashboard");
    data.set("username", "demo@example.com");
    data.set("password", "browser-autofilled-secret");

    expect(projectInputFromForm(data)).toEqual({
      name: "Jyuni demo",
      targetUrl: "https://app.jyuni.com/dashboard",
      sampleMode: false,
      credentials: {
        username: "demo@example.com",
        password: "browser-autofilled-secret",
      },
    });
  });
});
