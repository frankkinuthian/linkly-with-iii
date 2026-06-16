# Linkly

A full-stack URL shortener built on [iii](https://iii.dev) and Next.js, structured as a Turborepo monorepo. The frontend deploys to Vercel, the backend (iii engine + workers) deploys to Railway.

## Architecture

```
Browser ──→ Vercel (apps/web)
              │
              │ server actions (WebSocket)
              ▼
           Railway (apps/api)
              │
              ├── iii engine
              ├── link worker
              ├── click-streamer worker
              ├── bulk-importer worker
              ├── auth worker
              ├── analytics worker (Python)
              └── relay worker ──→ WebSocket push to browser
```

Server actions in the Next.js app call iii functions over WebSocket. The relay worker pushes live click events to browsers over a separate WebSocket connection. The browser never touches the iii engine directly.

## Project Structure

```
linkly-turbo/
├── apps/
│   ├── web/                  Next.js frontend (Vercel, port 3000)
│   ├── docs/                 API documentation with Scalar (Vercel, port 3001)
│   └── api/                  iii engine + all workers (Railway)
│       ├── config.yaml       Engine configuration
│       ├── Dockerfile        Railway deployment
│       └── workers/
│           ├── link/         Core CRUD — create, resolve, update, delete
│           ├── click-streamer/ Subscribes to clicks, pushes to iii-stream
│           ├── bulk-importer/  CSV import over channels
│           ├── auth/         Browser connection gating (RBAC)
│           ├── analytics/    Daily link counter (Python)
│           └── relay/        WebSocket server for live browser events
│
├── packages/
│   ├── iii/                  Server-only iii client with env validation
│   ├── database/             Shared types (Link, Click, function I/O shapes)
│   ├── design-system/        shadcn/ui + Tailwind v4 component library
│   ├── typescript-config/    Shared tsconfig presets
│   └── eslint-config/        Shared ESLint rules
│
├── docs/                     Tutorial chapters (Markdown)
├── turbo.json                Turborepo pipeline config
└── pnpm-workspace.yaml       Workspace package declarations
```

## Apps

| App    | Port             | Purpose                                                       | Deploys to |
| ------ | ---------------- | ------------------------------------------------------------- | ---------- |
| `web`  | 3000             | Main product UI — create links, view list, live click counter | Vercel     |
| `docs` | 3001             | Interactive API reference (Scalar + OpenAPI)                  | Vercel     |
| `api`  | 3111, 3112, 4000 | iii engine with all backend workers                           | Railway    |

## Packages

| Package             | Name                      | Purpose                                                    |
| ------------------- | ------------------------- | ---------------------------------------------------------- |
| `iii`               | `@repo/iii`               | Configured iii-sdk worker instance (server-only singleton) |
| `database`          | `@repo/database`          | Shared TypeScript types and SQL schema reference           |
| `design-system`     | `@repo/design-system`     | shadcn components, Tailwind theme, PostCSS config          |
| `typescript-config` | `@repo/typescript-config` | Shared tsconfig base, nextjs, react-library presets        |
| `eslint-config`     | `@repo/eslint-config`     | Shared ESLint configuration                                |

## Workers (in apps/api/workers/)

| Worker           | Language   | Responsibility                                                        |
| ---------------- | ---------- | --------------------------------------------------------------------- |
| `link`           | TypeScript | Core link CRUD, HTTP endpoints, click recording, cache management     |
| `click-streamer` | TypeScript | Subscribes to `link.clicked` pub/sub, pushes to iii-stream            |
| `bulk-importer`  | TypeScript | Accepts CSV data over a channel, batch-creates links                  |
| `auth`           | TypeScript | Gates browser WebSocket connections via RBAC auth function            |
| `analytics`      | Python     | Subscribes to `link.created`, maintains daily counts in its own DB    |
| `relay`          | TypeScript | WebSocket server (port 4000) that broadcasts click events to browsers |

## Getting Started

### Prerequisites

- [iii engine](https://iii.dev/docs/quickstart) installed
- Node.js 20+
- pnpm 9+
- Python 3.11+ (for the analytics worker)

### Install dependencies

```bash
pnpm install
```

### Start the iii backend

```bash
cd apps/api && iii --config config.yaml
```

This starts the engine, installs worker dependencies on first run, and connects all workers.

### Start the web app

```bash
pnpm dev --filter=web
```

Open http://localhost:3000 — create links, see them persist, watch the live click counter.

### Start the docs app

```bash
pnpm dev --filter=docs
```

Open http://localhost:3001/reference for the interactive Scalar API reference.

### Run everything

```bash
# Terminal 1: iii backend
cd apps/api && iii --config config.yaml

# Terminal 2: all Next.js apps
pnpm dev
```

## Environment Variables

### apps/web/.env.local

```
III_URL=ws://localhost:49134
NEXT_PUBLIC_RELAY_URL=ws://localhost:4000
```

### Production (Vercel)

```
III_URL=wss://your-railway-app.railway.app:49134
NEXT_PUBLIC_RELAY_URL=wss://your-railway-app.railway.app:4000
```

## Build

```bash
pnpm build              # Build all apps
pnpm build --filter=web # Build only the web app
pnpm build --filter=docs # Build only docs
```

## Deployment

### Vercel (frontend)

Connect the repo to Vercel. Create two projects:

1. **Linkly Web** — Root directory: `apps/web`
2. **Linkly Docs** — Root directory: `apps/docs`

Add `III_URL` and `NEXT_PUBLIC_RELAY_URL` as environment variables pointing to your Railway instance.

### Railway (backend)

Deploy `apps/api` using the included Dockerfile:

```dockerfile
FROM iiidev/iii:latest
WORKDIR /app
COPY config.yaml .
COPY workers/ ./workers/
RUN mkdir -p ./data
EXPOSE 3111 3112 3110 4000 49134
CMD ["iii", "--config", "config.yaml"]
```

Expose ports 3111 (HTTP API), 4000 (relay WebSocket), and 49134 (engine WebSocket for the web app's server actions).

## Key Patterns

- **Server actions as the bridge** — Next.js server actions call iii functions via `@repo/iii`. No REST API between frontend and backend.
- **Shared types** — `@repo/database` defines the contract between workers and the web app. Ready for tRPC, oRPC, or Effect schemas later.
- **Relay for real-time** — A dedicated iii worker runs a WebSocket server. Browsers connect to it for live push events without touching the engine directly.
- **Design system** — shadcn components in `@repo/design-system`, shared across all apps. Run `shadcn add` from any app and it routes to the shared package.
- **Env validation** — `@repo/iii/keys.ts` validates `III_URL` with Zod at build time. Missing env = build error, not runtime crash.
- **Server-only guard** — `@repo/iii` uses `import "server-only"` to prevent accidental client-side import of the engine connection.

## HTTP Endpoints (via iii-http on Railway)

| Method | Path           | Description                        |
| ------ | -------------- | ---------------------------------- |
| POST   | `/links`       | Create a short link                |
| PUT    | `/links/:code` | Update a link's target URL         |
| GET    | `/s/:code`     | Redirect to the original URL (302) |

Full interactive documentation available at `/reference` in the docs app.

## Tutorial

The `docs/` folder contains step-by-step chapters building Linkly from scratch:

1. Foundations — Worker, functions, triggers, HTTP
2. Observe everything — Console, logs, traces
3. Persist everything — SQLite, cache-ahead reads
4. Make it durable — Queues, pub/sub, reactive state
5. Stream live clicks — iii-stream, click-streamer worker
6. Move bulk data with channels — CSV import
7. Bring in the browser — Browser as a worker (Vite)
8. Go full-stack with Next.js — This Turborepo architecture
