# Linkly

A URL shortener built on [iii](https://iii.dev) — the engine that replaces your API framework, task queue, cron scheduler, pub/sub, state store, and observability pipeline with three primitives: **Function**, **Trigger**, **Worker**.

## Architecture

Linkly is a multi-worker system where each worker owns a single concern:

| Worker           | Language   | Responsibility                                                                             |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `link`           | TypeScript | Core CRUD — create, resolve, update, delete short links. HTTP layer for external access.   |
| `analytics`      | Python     | Subscribes to `link.created` events, maintains daily link counts in its own database.      |
| `click-streamer` | TypeScript | Subscribes to `link.clicked` pub/sub events, pushes each click onto a live stream.         |
| `bulk-importer`  | TypeScript | Accepts a channel with CSV data and batch-creates links.                                   |
| `auth`           | TypeScript | Gates browser connections via an RBAC auth function.                                       |
| `frontend`       | React/TS   | Browser-based worker — creates links, shows live clicks, answers server-initiated prompts. |

### Engine workers (from the registry)

- `iii-http` — HTTP API (port 3111)
- `iii-state` — Key-value cache
- `iii-queue` — Background job processing with retries and DLQ
- `iii-pubsub` — In-process event fan-out
- `iii-stream` — Real-time WebSocket streams (port 3112)
- `iii-worker-manager` — Worker connection lifecycle and RBAC listeners
- `iii-observability` — OpenTelemetry traces, metrics, logs
- `database` — SQLite (durable storage)

## Getting started

### Prerequisites

- [iii engine](https://iii.dev/docs/quickstart) installed
- Node.js 20+
- Python 3.11+ (for the analytics worker)

### Run

```bash
# From the project root
iii
```

The engine reads `config.yaml`, installs worker dependencies on first run, and starts everything. Workers connect over WebSocket and register their functions automatically.

### Endpoints

| Method | Path           | Description                                              |
| ------ | -------------- | -------------------------------------------------------- |
| POST   | `/links`       | Create a short link (`{ "url": "...", "code?": "..." }`) |
| PUT    | `/links/:code` | Update a link's target URL                               |
| GET    | `/s/:code`     | Redirect to the original URL (302)                       |

### CLI usage

```bash
iii trigger link::create url=https://example.com code=demo
iii trigger link::resolve code=demo
iii trigger link::request_delete code=demo
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The browser becomes an iii worker — it creates links directly (no REST gateway), subscribes to the live click stream, and registers a `user::confirm_destructive_op` function the server can call to request human confirmation.

### Bulk import

```bash
cd test-channels
node import-links.js
```

Streams a CSV of links over a channel to the `bulk-importer` worker.

## Project structure

```
linkly/
├── config.yaml          # Engine configuration (workers, ports, adapters, queues)
├── iii.lock             # Reproducible worker lockfile
├── link/                # Core link worker (TypeScript)
├── analytics/           # Daily link counter (Python)
├── click-streamer/      # Real-time click broadcaster (TypeScript)
├── bulk-importer/       # CSV channel importer (TypeScript)
├── auth/                # Browser auth gating (TypeScript)
├── frontend/            # Vite + React browser worker
├── test-channels/       # Standalone channel test scripts
├── data/                # Local database files (gitignored)
└── docs/                # Tutorial chapters
```

## Key patterns demonstrated

- **Cache-ahead reads** — `iii-state` in front of SQLite, with automatic backfill on miss
- **Durable queues** — Click recording is enqueued so redirects stay fast; retries and DLQ on failure
- **Pub/sub fan-out** — `link.created` fires to analytics (best-effort); `link.updated` uses durable pub/sub to guarantee cache refresh
- **Channels** — Binary streaming pipe for bulk CSV upload
- **Streams** — Real-time push of clicks to connected browsers
- **Browser as worker** — Client registers functions the server calls back (confirmation prompts)
- **RBAC** — Browser connections are gated through an auth function on a separate listener port
