# Ch. 8: Go full-stack with Next.js

> Port the browser-worker Vite app into a server-side Next.js app within a Turborepo, with shared packages, server actions, and a WebSocket relay for real-time.

In Chapter 7 the browser was a worker — it connected directly to the iii engine, called functions,
subscribed to streams, and registered functions the server could call back. That works beautifully
for learning, but production apps usually want server-side rendering, secrets kept off the client,
and deployment separation between frontend and backend.

In this chapter you restructure Linkly into a **Turborepo** with a Next.js frontend that talks to
iii through server actions, a shared design system, typed contracts, and a WebSocket relay worker for
live click streaming. The browser never touches the iii engine directly.

## Architecture

```
┌─────────────────────────────┐
│         Vercel              │
│                             │
│  apps/web (Next.js)         │
│    server actions call iii  │──── WebSocket ────┐
│                             │                   │
│  apps/docs (Scalar)         │                   │
│    API reference            │                   │
└─────────────────────────────┘                   │
                                                  │
┌─────────────────────────────┐                   │
│        Railway              │◄──────────────────┘
│                             │
│  apps/api/                  │
│    iii engine + workers     │
│    ├── link                 │
│    ├── click-streamer       │
│    ├── bulk-importer        │
│    ├── auth                 │
│    ├── analytics            │
│    └── relay (WebSocket)    │
└─────────────────────────────┘
```

The web app on Vercel calls iii functions over WebSocket via server actions. The relay worker on
Railway pushes live click events to browsers over a separate WebSocket. The browser only talks to
Vercel (HTTP) and Railway's relay port (WebSocket for live data).

## Set up the Turborepo

### Create the monorepo

```bash
mkdir linkly-turbo && cd linkly-turbo
pnpm dlx create-turbo@latest .
```

Choose pnpm as the package manager. You'll get `apps/web`, `apps/docs`, and `packages/`.

### Add the design system

Rename `packages/ui` to `packages/design-system` and set up shadcn with Tailwind v4. The design
system holds all shared UI components, the Tailwind theme, and PostCSS config. Both apps import from
`@repo/design-system`.

### Create `packages/iii` — the client package

This is the equivalent of next-forge's `packages/database`. It exports a configured iii worker
instance that server actions use:

```typescript packages/iii/index.ts
import "server-only";
import { registerWorker } from "iii-sdk";
import { keys } from "./keys";

const globalForIII = global as unknown as {
  iii: ReturnType<typeof registerWorker>;
};

export const iii =
  globalForIII.iii ||
  registerWorker(keys().III_URL, { workerName: "next-server" });

if (process.env.NODE_ENV !== "production") {
  globalForIII.iii = iii;
}
```

The `keys.ts` validates environment variables at build time:

```typescript packages/iii/keys.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: { III_URL: z.string().url() },
    runtimeEnv: { III_URL: process.env.III_URL },
  });
```

The `server-only` import prevents accidental use in client components. The global singleton avoids
multiple WebSocket connections during Next.js hot reload.

### Create `packages/database` — shared types

A non-runtime package that holds the contract between workers and the web app:

```typescript packages/database/types.ts
export type Link = {
  code: string;
  url: string;
  created_at: string;
};

export type Click = {
  id: number;
  code: string;
  clicked_at: string;
};

export type CreateLinkInput = { url: string; code?: string };
export type CreateLinkOutput = { code: string; url: string };
export type DeleteLinkOutput = { deleted: boolean };
```

These types can later become Zod schemas, tRPC procedures, oRPC contracts, or Effect schemas.

## Set up the iii backend

### Create `apps/api`

All iii engine config and workers live in one directory:

```
apps/api/
├── config.yaml
├── Dockerfile
├── workers/
│   ├── link/
│   ├── click-streamer/
│   ├── bulk-importer/
│   ├── auth/
│   ├── analytics/
│   └── relay/
└── package.json
```

The `config.yaml` uses relative paths:

```yaml apps/api/config.yaml
workers:
  - name: link
    worker_path: ./workers/link
  - name: relay
    worker_path: ./workers/relay
  # ... other workers
```

Start the engine locally:

```bash
cd apps/api && iii --config config.yaml
```

## Build the Next.js web app

### Server actions

Server actions are the bridge between Next.js and iii. They run server-side, call `@repo/iii`, and
return typed results:

```typescript apps/web/app/actions.ts
"use server";

import { iii } from "@repo/iii";
import type {
  Link,
  CreateLinkInput,
  CreateLinkOutput,
} from "@repo/database/types";
import { revalidatePath } from "next/cache";

export async function createLink(
  url: string,
  code?: string,
): Promise<CreateLinkOutput> {
  const link = await iii.trigger<CreateLinkInput, CreateLinkOutput>({
    function_id: "link::create",
    payload: { url, code: code || undefined },
  });
  revalidatePath("/");
  return link;
}

export async function listLinks(): Promise<Link[]> {
  const { rows } = await iii.trigger<
    { db: string; sql: string },
    { rows: Link[] }
  >({
    function_id: "database::query",
    payload: {
      db: "primary",
      sql: "SELECT code, url, created_at FROM links ORDER BY created_at DESC LIMIT 50",
    },
  });
  return rows;
}

export async function deleteLink(code: string): Promise<{ deleted: boolean }> {
  const result = await iii.trigger<{ code: string }, { deleted: boolean }>({
    function_id: "link::delete",
    payload: { code },
  });
  revalidatePath("/");
  return result;
}
```

### The homepage

The page is a server component that fetches links on every request, with client components for the
form and live counter:

```tsx apps/web/app/page.tsx
import { CreateLinkForm } from "./components/create-link-form";
import { LiveClicks } from "./components/live-clicks";
import { LinksList } from "./components/links-list";
import { listLinks } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await listLinks();

  return (
    <main>
      <h1>Linkly</h1>
      <CreateLinkForm />
      <LinksList initialLinks={links} />
      <LiveClicks />
    </main>
  );
}
```

Links persist across page refreshes because they're fetched from the database on every render.
`revalidatePath("/")` in the create/delete actions tells Next.js to re-render with fresh data.

## Add real-time with the relay worker

### The relay worker

A dedicated iii worker that subscribes to `link.clicked` and runs a WebSocket server for browsers:

```typescript apps/api/workers/relay/src/index.ts
import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";
import { WebSocketServer, WebSocket } from "ws";

const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "relay",
});
const logger = new Logger();

const PORT = parseInt(process.env.RELAY_PORT ?? "4000", 10);
const wss = new WebSocketServer({ port: PORT });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

worker.registerFunction("relay::on_click", async (data) => {
  broadcast("click", data);
  return null;
});

worker.registerTrigger({
  type: "subscribe",
  function_id: "relay::on_click",
  config: { topic: "link.clicked" },
});

logger.info("relay ready", { port: PORT });
```

### The client component

The browser connects to the relay via a plain WebSocket:

```tsx apps/web/app/components/live-clicks.tsx
"use client";

import { useEffect, useState } from "react";

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL ?? "ws://localhost:4000";

export function LiveClicks() {
  const [clicks, setClicks] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(RELAY_URL);
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "click") setClicks((n) => n + 1);
    };
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, []);

  return (
    <section>
      <h2>Live clicks: {clicks}</h2>
      <p>{connected ? "Connected" : "Reconnecting..."}</p>
    </section>
  );
}
```

## Add API documentation with Scalar

Install Scalar in `apps/docs`:

```bash
cd apps/docs && pnpm add @scalar/nextjs-api-reference
```

Create an OpenAPI spec at `apps/docs/public/openapi.json` describing your HTTP endpoints, then add
a route handler:

```typescript apps/docs/app/reference/route.ts
import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/openapi.json",
  theme: "kepler" as const,
});
```

Open `/reference` to see the interactive API documentation.

## Deployment

| Target           | What deploys | How                                                           |
| ---------------- | ------------ | ------------------------------------------------------------- |
| Vercel project 1 | `apps/web`   | Root dir: `apps/web`, env: `III_URL`, `NEXT_PUBLIC_RELAY_URL` |
| Vercel project 2 | `apps/docs`  | Root dir: `apps/docs`                                         |
| Railway          | `apps/api`   | Dockerfile, exposes ports 3111, 3112, 4000, 49134             |

Vercel builds only the app + its workspace dependencies (packages). Railway runs the iii engine
which manages all workers. Same repo, different slices.

## What changed from Chapter 7

| Chapter 7 (Vite)                                 | Chapter 8 (Next.js)                                          |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Browser is an iii worker                         | Browser is a plain client                                    |
| Browser calls `link::create` directly            | Server action calls `link::create`, browser calls the action |
| Browser subscribes to iii-stream                 | Browser connects to relay WebSocket                          |
| Browser registers `user::confirm_destructive_op` | Server handles deletion directly (or via UI confirmation)    |
| No SSR                                           | Server-rendered link list                                    |
| Secrets in browser env                           | Secrets server-side only                                     |
| Single deploy target                             | Vercel (frontend) + Railway (backend)                        |

## Conclusion

Linkly is now a production-shaped full-stack app: a Turborepo with a Next.js frontend on Vercel, an
iii backend on Railway, shared type contracts, a real-time relay, and interactive API docs. The same
iii primitives power everything — the difference is where the boundary between client and server
sits.
