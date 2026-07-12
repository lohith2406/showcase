export interface CreateProjectInput {
  name: string;
  targetUrl: string;
  sampleMode: boolean;
  credentials?: { username: string; password: string };
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function projectInputFromForm(data: FormData): CreateProjectInput {
  const username = text(data, "username");
  const passwordValue = data.get("password");
  const password = typeof passwordValue === "string" ? passwordValue : "";
  if ((username && !password) || (!username && password)) {
    throw new Error("Enter both a username and password, or leave both blank.");
  }
  return {
    name: text(data, "name"),
    targetUrl: text(data, "targetUrl"),
    sampleMode: false,
    ...(username && password ? { credentials: { username, password } } : {}),
  };
}
