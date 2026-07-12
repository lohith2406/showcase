# showcase.ai

An AI product-demo agent that explores a SaaS application, discovers its primary workflows, generates an editable interactive walkthrough, and publishes a shareable demo.

## Architecture

```text
Next.js studio
    │
    ▼
Express API ───────────────► Neon PostgreSQL (Prisma 7 + pg adapter)
    │
    ▼
Pi orchestration
    ├── Explorer agent ────► Playwright + screenshot storage
    ├── Planner agent ─────► OpenAI Responses API
    └── Demo generator ────► Chapters, steps, hotspots, public snapshot
```

Agents communicate through persisted, typed records instead of hidden prompt context. This keeps the pipeline modular and leaves room for a future refresh agent that can compare a saved demo with the live product.

## Monorepo

```text
apps/
  frontend/        Next.js App Router studio and public player
  backend/         Express API, agents, orchestration, repositories
packages/
  contracts/       Shared Zod schemas and TypeScript types
  database/        Prisma 7 schema, migration, generated client, db.ts
```

## Product flow

1. Enter a product URL and optional credentials.
2. Playwright maps same-origin navigation and visible actions.
3. The planner selects important, safe workflows.
4. The generator creates chapters, annotations, and normalized hotspots.
5. Edit copy or reposition hotspots in the studio.
6. Publish an immutable-feeling public snapshot at `/d/:slug`.

Sample mode runs the complete flow with synthetic SaaS screens. It does not launch Playwright or spend OpenAI tokens.

## Requirements

- Node.js 22.19+
- npm 10+
- PostgreSQL/Neon connection string
- OpenAI API key for AI planning of real products

## Environment

Keep server secrets in the repository-root `.env`:

```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
CREDENTIAL_ENCRYPTION_KEY=""
NEXT_PUBLIC_API_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
PORT="4000"
ASSET_STORAGE_PROVIDER="local"
BLOB_READ_WRITE_TOKEN=""
ALLOW_PRIVATE_TARGETS="false"
```

Generate the 32-byte encryption key as 64 hexadecimal characters:

```bash
openssl rand -hex 32
```

The frontend reads only `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Never expose `DATABASE_URL`, OpenAI keys, Blob tokens, or the encryption key through a `NEXT_PUBLIC_*` variable.

## Install and initialize

```bash
npm install
npm exec -w @showcase/database -- prisma migrate dev --name init
npm run db:generate
npx playwright install chromium
```

Prisma follows the v7 layout:

- CLI URL: `packages/database/prisma.config.ts`
- Schema: `packages/database/prisma/schema.prisma`
- Generated client: `packages/database/generated/prisma`
- Runtime adapter/client: `packages/database/db.ts`

## Development

```bash
npm run dev
```

- Studio: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/api/v1/health

## Quality gates

```bash
npm run typecheck
npm test
npm run build
npm run format:check
```

## API surface

| Method  | Route                                       | Purpose                          |
| ------- | ------------------------------------------- | -------------------------------- |
| `POST`  | `/api/v1/projects`                          | Create an exploration job        |
| `GET`   | `/api/v1/projects/:projectId`               | Read status, chapters, and steps |
| `PATCH` | `/api/v1/projects/:projectId/steps/:stepId` | Edit step copy or hotspot        |
| `POST`  | `/api/v1/projects/:projectId/publish`       | Publish a stable snapshot        |
| `GET`   | `/api/v1/public/:slug`                      | Read a public walkthrough        |

## Security posture

- Target URLs must use HTTP(S).
- Private, loopback, link-local, and reserved targets are rejected by default.
- Exploration remains same-origin and bounded by page/action limits.
- Controls with destructive labels are never selected as demo actions.
- Credentials are AES-256-GCM encrypted for the run and deleted at terminal job states.
- Credentials and selectors are excluded from public API snapshots.
- API request bodies are size-limited and validated with shared Zod schemas.
- Local asset paths are sanitized before writes.

### MVP deployment boundary

The current MVP assumes a trusted single workspace. Before exposing the studio as a public multi-tenant service, add user authentication, workspace ownership on every database query, rate limiting, a durable external job queue, per-tenant asset namespaces, and audit logs. Public demo playback is intentionally unauthenticated.

## Storage

Development defaults to `artifacts/`, served by Express at `/assets`. For deployment:

```env
ASSET_STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=...
```

The agent code depends only on the `AssetStore` interface, so S3 can be added without changing exploration logic.

## Current limitations

- Login automation handles conventional username/password forms; SSO and MFA require a user-assisted session handoff.
- Jobs persist progress in PostgreSQL but execute in the API process. Use a durable queue before horizontal scaling.
- The explorer maps navigation and safe actions but deliberately does not submit destructive or payment workflows.
- Real-product quality depends on accessible labels, stable navigation, and permission to automate the target application.
