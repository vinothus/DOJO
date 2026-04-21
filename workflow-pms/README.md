# Workflow PMS (MVP)

Industrial project workflow and tracking: **NestJS + PostgreSQL (Prisma) + React (Vite, MUI)**.

See [`docs/PRD.md`](docs/PRD.md) and [`docs/TASKS.md`](docs/TASKS.md). Implemented **Phases 0–9** core (excluding §12 market backlog and deep S1–S8 UI grids):

- Auth (JWT), rate-limited login, users (admin)
- Projects & line items, workflow stage, **handover**, **admin override**, audit log, optimistic locking
- Man-hours, travel, BOM APIs; **file attachments** (multipart)
- **Lookups**; **costing** (rate cards); **reports**: project status + cost summary (**JSON, CSV, PDF**)
- Frontend: projects, line items, **reports** with authenticated CSV/PDF download

## Full stack with Docker (recommended)

Requires **Docker Desktop** (or Engine) running.

From `workflow-pms`:

```bash
docker compose build
docker compose up -d
```

Wait until API is healthy (~30–60s first run — `db push` + `seed`).

| Service   | URL |
|-----------|-----|
| Web UI    | http://localhost:8082 |
| API (direct) | http://localhost:3000 |
| Adminer   | http://localhost:8080 |
| Postgres  | localhost:5432 (`workflow` / `workflow` / `workflow_pms`) |

Log in: `admin@example.com` / `Admin123!`

### End-to-end API check

With the API reachable (Docker **or** local `npm run start:dev` in `backend/` with Postgres + seed):

```bash
node scripts/e2e-docker.mjs
```

| Env | Meaning |
|-----|--------|
| `API_URL` | Default `http://localhost:3000`. Use `http://localhost:8082/api` when testing through the **web** container’s nginx proxy. |
| `E2E_WAIT_ATTEMPTS` | Health poll attempts (default 45, 2s apart ≈90s max wait). Lower for a fast fail, e.g. `E2E_WAIT_ATTEMPTS=5`. |
| `E2E_REQUIRE_LINE_ROWS` | Set to `1` to fail if the project-status report has zero rows. |

The script checks: `/health`, login, `/projects`, report JSON, PDF, CSV, cost-summary JSON/CSV.

**Login rate limits:** if you hit `429` from throttling, the script waits 65s and retries once.

## Local dev without Docker (Postgres optional)

1. Start Postgres or `docker compose up -d postgres` only.
2. `cd backend && npx prisma db push && npx prisma db seed`
3. `npm run start:dev` (API :3000)
4. `cd frontend && npm run dev` (Vite proxies `/api` → :3000)

Environment: copy [`.env.example`](.env.example) to `backend/.env`.

## API overview

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/login` | `{ email, password }` → JWT (Throttler: 40/min) |
| GET | `/auth/me` | Bearer token |
| GET/POST/PATCH | `/users` | Admin |
| GET | `/projects` | Authenticated |
| POST/PATCH | `/projects` | Admin |
| GET | `/projects/:id` | Includes line items |
| GET/PATCH | `/line-items/:id` | `invoiceAmountSar` optional on PATCH |
| POST | `/line-items/:id/handover` | `targetStage`, `note?` |
| POST | `/line-items/:id/stage-override` | `targetStage`, `reason`, `version` |
| POST | `/line-items/:id/man-hours` | |
| DELETE | `/line-items/:lid/man-hours/:eid` | |
| POST | `/line-items/:id/travel` | |
| DELETE | `/line-items/:lid/travel/:tid` | |
| POST | `/line-items/:id/bom` | Engineering stage |
| POST | `/line-items/:id/attachments` | multipart `file` + form field `stage` |
| GET | `/reports/project-status?projectId=` | JSON |
| GET | `/reports/cost-summary?projectId=` | JSON |
| GET | `.../project-status.csv`, `.pdf`, `cost-summary.csv` | Authenticated download |

## Still out of scope / backlog

- Full spreadsheet-style UI for every PRD column per stage
- PRD §12 (notifications, SSO, NCR, ERP, etc.) — see `docs/TASKS.md` Phase 10
- CSV **import** for grids (API-ready data via REST instead)

## CI

Workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — adjust paths if your repo root is `workflow-pms` only.
