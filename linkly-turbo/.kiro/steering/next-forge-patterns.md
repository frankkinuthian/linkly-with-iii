---
inclusion: auto
---

# next-forge Architecture Patterns

Reference the template at `.cache/next-forge-template/` in the parent linkly directory for structural decisions.

## Core Principles

- Every cross-cutting concern is its own package under `packages/`
- Each package is a thin wrapper that exports a configured client
- Apps are just UI shells — they import capabilities from packages and compose them
- Apps never talk to infrastructure directly

## Package Naming

All packages use `@repo/<name>` convention:

```typescript
import { iii } from "@repo/iii";
import { Button } from "@repo/design-system/components/ui/button";
import { log } from "@repo/observability/log";
```

## Target Structure

```
linkly-turbo/
├── apps/
│   ├── web/                    ← Main product UI (Vercel)
│   ├── docs/                   ← API docs (Vercel)
│   └── relay/                  ← WebSocket relay (Railway)
│
├── packages/
│   ├── iii/                    ← iii SDK client, configured with keys.ts
│   ├── database/               ← Schema definitions, migrations
│   ├── design-system/          ← shadcn components, Tailwind theme, providers
│   ├── observability/          ← Logging/tracing wrapper
│   ├── typescript-config/      ← Shared tsconfigs
│   └── eslint-config/          ← Shared lint rules
│
├── workers/                    ← Deploy to Railway (iii manages)
│   ├── link/
│   ├── click-streamer/
│   ├── bulk-importer/
│   └── auth/
│
├── config.yaml                 ← iii engine config (Railway)
├── turbo.json
└── pnpm-workspace.yaml
```

## Design System Package (replaces packages/ui)

Named `@repo/design-system`. Structure:

```
packages/design-system/
├── components/
│   ├── ui/              ← shadcn primitives (button, card, input, etc.)
│   └── *.tsx            ← composed components (mode-toggle, etc.)
├── hooks/               ← shared React hooks
├── lib/
│   ├── utils.ts         ← cn() helper
│   └── fonts.ts         ← font configuration
├── providers/
│   └── theme.tsx        ← ThemeProvider wrapper
├── styles/
│   └── globals.css      ← Tailwind theme variables
├── index.tsx            ← DesignSystemProvider (wraps theme + toast + tooltip)
├── components.json      ← shadcn CLI config
├── postcss.config.mjs   ← apps re-export this
├── package.json
└── tsconfig.json
```

- Run `shadcn add` from an app dir (it detects the framework), but aliases route output here
- Apps import globals via `@repo/design-system/styles/globals.css`
- Apps re-export postcss config: `export { default } from "@repo/design-system/postcss.config"`

## iii Client Package

Named `@repo/iii`. Structure:

```
packages/iii/
├── index.ts        ← exports configured worker (server-only)
├── keys.ts         ← validates III_URL with Zod via @t3-oss/env-nextjs
└── package.json
```

Pattern: singleton worker instance, cached globally in dev (same as next-forge's Prisma pattern).

## Env Validation Pattern

Every package that needs env vars has a `keys.ts`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: { III_URL: z.string().url() },
    runtimeEnv: { III_URL: process.env.III_URL },
  });
```

## Deployment Targets

| Target           | What deploys                               |
| ---------------- | ------------------------------------------ |
| Vercel project 1 | `apps/web` (root dir: `apps/web`)          |
| Vercel project 2 | `apps/docs` (root dir: `apps/docs`)        |
| Railway          | `config.yaml` + `workers/*` + `apps/relay` |

## Key Rules

- Package names: `@repo/design-system`, NOT `@repo/ui`
- shadcn CLI: run from app dir, output routes to design-system via aliases
- Server-only packages use `import "server-only"` at top
- Graceful degradation: missing env vars disable features, don't crash
- Workers live in `workers/`, not `packages/` — they're deployable processes, not importable libraries
- `pnpm-workspace.yaml` includes `apps/*`, `packages/*`, and `workers/*`
