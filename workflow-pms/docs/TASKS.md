# Implementation Task List
## Workflow PMS — Derived from PRD (core v1.0 + §12 market backlog)

Use this as a sprint-ready backlog. Aligns with [`PRD.md`](./PRD.md): **§§1–11** (core product), **§12** (market parity gaps—mostly post-v1 unless promoted).

**Legend:** `[ ]` todo · `[~]` optional / phase 2+ · **§12.x** = PRD section reference · Dependencies shown as →

---

## Phase 0 — Repository & quality gate

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| P0-1 | Initialize monorepo or `frontend` + `backend` repos; add `.editorconfig`, lint (ESLint/Biome), format (Prettier) | — | Consistency for team |
| P0-2 | Add `docker-compose` for PostgreSQL (+ optional Adminer/pgAdmin) | §10 | Local dev parity |
| P0-3 | CI stub: install, lint, unit tests on PR | §7 | Can use GitHub Actions / Azure DevOps |
| P0-4 | Document env vars (`.env.example`): `DATABASE_URL`, `JWT_SECRET`, `FILE_STORAGE_PATH` | — | Add `SMTP_*`, `APP_BASE_URL` **[~]** when notifications land |

**Parallel:** P0 tasks can run alongside D1–D4 planning.

---

## Phase 1 — Database schema & migrations

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| D1 | Define **User** (`id`, email, password_hash, name, is_active, created_at) | §3 | |
| D2 | Define **Role** + **UserRole** (many-to-many) | §3 | Roles: Admin, SiteMeasurement, Engineering, FabShop, Machining, Warehouse, Transport, SiteInstallation, Invoice, Accounts? |
| D3 | Define **Permission** flags or role→stage map table **`RoleStageAccess(stage, canView, canEdit, canOverride)`** | §4, §12.5 | Admin always all; finer rules → **M16** |
| D4 | Define **Project** header: YEAR, MONTH, AREA, CLIENT, PLANT, PO_NUMBER, PROJECT_ID, BID_NUMBER, status, created_by, timestamps | §4 | |
| D5 | Define **LineItem** (recommended grain): INPUT_DRAWING_NUMBER, DRAWING_NUMBER, SHT_NO, REV_NO, MATERIAL, CLAMP_TYPE, DESCRIPTION, QTY, UNIT_WEIGHT, TOTAL_WEIGHT, MEASUREMENT_DATE, TARGET_DATE, fk_project | §4, §5 | Unique constraint discussion |
| D6 | Define **LookupType** + **LookupValue** (or per-type tables) with `scope` (global vs stage) | §4.4 | Powers comboboxes |
| D7 | Stage-specific tables (or unified **StageRecord** with JSON validated by stage)—prefer **normalized tables** for reporting | §5 | ManHour rows with `stage` enum + line_item_id |
| D8 | **Attachment** (file_path, mime, size, line_item_id, stage, uploaded_by) | §4.5 | |
| D9 | **AuditLog** (entity_type, entity_id, action, payload_json, user_id, created_at) | §4.3, §7 | Stage jumps, handovers |
| D10 | **RateCard**: man_hour_rate by CATEGORY/employee band; fuel_rate by VEHICLE_TYPE or global KM | §4.6, §8 | For cost columns |
| D11 | Run migrations; seed **roles**, **admin user**, **sample lookups** | §11 | Test data |
| D12 | **Optimistic concurrency:** `version` or `updated_at` on LineItem + high-churn row tables; API returns 409 on conflict | §12.1 | Reduces overwrite risk; pair with UI refresh **C6** |

**Parallel:** D1–D4 can proceed before detailed stage tables if API uses iterative migration.

---

## Phase 2 — Authentication & user management

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| A1 | Register/login API: hash passwords, issue JWT (access + optional refresh) or secure session | §7 | |
| A2 | Middleware: authenticate + attach `userId`, `roles[]` | §7 | |
| A3 | Admin APIs: CRUD users, assign roles | §3 | Only Admin |
| A4 | Frontend: Login page, logout, protected routes, **403** page | §3 | |
| A5 | Password policy & lockout **[~]** | §7 | MVP: min length 8 |
| A6 | **SSO (SAML/OIDC, e.g. Azure AD)** **[~]** | §12.5 → **M15** | Enterprise; can ship after local login |

**Test:** Postman/curl collection or automated e2e login.

---

## Phase 3 — Project & line items (Admin)

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| B1 | API: create/update/list/archive **Project** | §4, §11 | |
| B2 | API: CRUD **LineItem** under project | §4 | Validate FKs; respect **D12** version |
| B3 | API: set **`currentStage`** / line scope | §4.3 | Per PRD: line vs project—pick one |
| B4 | Admin UI: project list, project form, line item grid | §11 | |
| B5 | Seed script: 1 project + 2–3 lines for QA | §11 | |
| B6 | **Clone project / line item** **[~]** | §12.7 → **M20** | Productivity |

**Test:** Integration tests for CRUD + RBAC.

---

## Phase 4 — RBAC by stage & handover

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| C1 | Implement **canAccessStage(user, stage, action)** used by all stage routes | §4 | |
| C2 | **Handover** endpoint: valid transitions + update `currentStage` | §4.3 | Map HANDOVER targets to enum |
| C3 | **Override stage** endpoint: Admin + role with `overrideStage`; require **reason** string | §4.3 | Audit log **D9** |
| C4 | Frontend: stage navigation sidebar or tabs; disable stages user cannot edit | §4 | Show read-only if view-only |
| C5 | Display **audit trail** for stage changes (table on project detail) | §2, §7 | Foundation for **M2** comments distinction |
| C6 | **409 conflict UX:** when save fails on stale version, show message + reload row | §12.1 | Uses **D12** |

**Test:** User with only `FabShop` cannot hit Engineering APIs (403).

---

## Phase 5 — Lookups (combobox + add new)

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| L1 | API: list lookups by type; POST to create new value | §4.4 | Permission: manageLookups or stage edit |
| L2 | Reusable **Combobox** component: search, create inline, debounce | §4.4 | |
| L3 | Seed common lists: VEHICLE_TYPE, SHIFT, JOB_DESC_*, etc. | §5 | Align with PRD field lists |

---

## Phase 6 — Stage data entry UIs & APIs (vertical slices)

Complete **API + form grid with ADD rows** + validation per sub-table for each stage.

| ID | Stage | PRD | Sub-areas |
|----|-------|-----|-----------|
| S1 | INPUT SITE MEASUREMENT | §5.1 | Site measurement, Man Hrs, Travel to site |
| S2 | DESIGNING & ENGINEERING | §5.2 | Engineering, Man Hrs (+ approval field), BOM |
| S3 | FABRICATION SHOP | §5.3 | Fab summary/man hrs, Yard↔Shop transport, process table, process man hrs |
| S4 | MACHINING SHOP | §5.4 | Machining line, Man Hrs |
| S5 | WAREHOUSE | §5.5 | Delivery request, Man Hrs |
| S6 | TRANSPORT | §5.6 | Delivery man hrs, Delivery trips |
| S7 | SITE INSTALLATION | §5.7 | Site team, Man Hrs |
| S8 | INVOICE | §5.8 | Invoice line, Man Hrs |

**Cross-cutting per slice:**  
- Attach file where PRD says “add attachments.”  
- Use **LineItem** FK on every repeating row.  
- OT + normal hours → validate **Total hrs** (auto-fill or validate).  
- **S2:** `APPROVAL STATUS` field only in v1; multi-step routing → **M5**.

**Test:** Per-stage API unit tests + one Playwright/Cypress flow per stage with seeded user.

---

## Phase 7 — Aggregation & costing logic

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| R0 | Define formulas in code (single module): `computeManHourCost`, `computeFuelCost`, `kmTotal` | §4.6, §8 | Document in README |
| R1 | Materialized view or SQL aggregations by `line_item_id` for report columns | §6 | Indexes on line_item_id, project_id |
| R2 | Map process enums → **Project Status** column names (cutting, grinding, …) | §6.1 | Match PRD spellings for export |
| R3 | Reconcile **TOTAL KM** (YARD + TRANSPORT + any other KM fields) | §6 | Explicit spec in code comments |
| R4 | **Baseline snapshot** (planned vs actual) **[~]** | §12.3 → **M9** | Optional |

**Test:** Golden-file: fixture DB → expected numbers in report DTO.

---

## Phase 8 — Reports & PDF

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| RP1 | API: `GET /reports/project-status?projectId=` returns row array (JSON) | §6.1 | Pagination if huge |
| RP2 | API: `GET /reports/cost-summary?projectId=` | §6.2 | |
| RP3 | PDF service: HTML template + headless browser OR report generator; **charts** **[~]** | §6 | QuickChart, Chart.js PNG |
| RP4 | `GET .../pdf` variants or `Accept: application/pdf` | §6.3 | Filename: `ProjectStatus_{PROJECT_ID}_{date}.pdf` |
| RP5 | Frontend: Report page, filters (project, date range **[~]**), preview table, **Download PDF** | §6 | |
| RP6 | Branding: logo, footer page numbers **[~]** | §6 | Admin upload logo |
| RP7 | **CSV export** for Project Status & Cost Summary (tabular)**[~]** | §6.3, §12.1 | Promote to v1 if stakeholders require; pairs with **M3** import |

**Test:** Snapshot PDF byte size > 0; smoke open in viewer; column order matches PRD §6.

---

## Phase 9 — Hardening & release

| ID | Task | PRD | Notes |
|----|------|-----|--------|
| H1 | Security pass: OWASP top issues, rate limit login | §7 | |
| H2 | Error handling & user-visible messages (i18n **[~]**) | §8 | |
| H3 | Backup notes for DB + file volume | §7 | Ops doc **[~]** |
| H4 | User guide **[~]** (short): Admin creates project → handover flow | §11 | |
| H5 | Load test report endpoint **[~]** | §7 | |

---

## Phase 10 — Market parity & enterprise backlog (PRD §12)

**Default:** post-v1 unless product owner promotes items. Each row maps to **PRD §12.x**.

### §12.1 High impact for real shops

| ID | Task | Notes |
|----|------|--------|
| M1 | **Notifications:** email and/or Teams webhook on handover, assignment, optional due-date reminders | Needs **P0-4** SMTP/templates; user notification prefs |
| M2 | **Comments / activity feed** on line item or stage (threaded); optional `@user` mention | Distinct from **D9** audit stream; may reuse audit UI patterns |
| M3 | **CSV import** for high-volume grids (man-hours, trips)—validate + dry-run + error report | **RP7** CSV export helps round-trip testing |
| M4 | **Pessimistic “record locked by User X”** for critical rows **[~]** | Alternative/complement to **D12** optimistic |
| M5 | **Approval workflow routing** for engineering (multi-step: e.g. engineer → lead) | Replaces field-only **APPROVAL STATUS** when required |
| M6 | **Subcontractor / external portal** (limited roles, project-scoped) | Auth + invitation flow; audit **D9** |

### §12.2 Document & engineering

| ID | Task | Notes |
|----|------|--------|
| M7 | **Drawing revision history:** supersede, “current only” on reports; optional recost on REV change | Extends **LineItem** / drawing key model |
| M8 | **Transmittals** (issue-for-review, IFC, as-built) **[~]** | Often overlaps DMS; may stay separate product |

### §12.3 Planning & control

| ID | Task | Notes |
|----|------|--------|
| M9 | **Baseline snapshot** for dates/cost vs actual (extends **R4**) | Tie to TARGET DATE / rates |
| M10 | **Gantt / dependencies / milestones** **[~]** | Large scope; only if leaving spreadsheet model |
| M11 | **Change orders** (scope + cost delta) | Links to line items + reports |

### §12.4 Inventory, procurement, finance

| ID | Task | Notes |
|----|------|--------|
| M12 | **Stock / reservation** linked to BOM | Inventory module |
| M13 | **PO workflow** (PO as entity, not only attribute on Project) | Approvals, receipts **[~]** |
| M14 | **ERP / GL sync** (invoice & cost posting) **[~]** | Out of §9 v1; integration contracts |

### §12.5 Enterprise IT

| ID | Task | Notes |
|----|------|--------|
| M15 | **SSO SAML/OIDC** (e.g. Azure AD) | See **A6** |
| M16 | **Fine-grained RBAC** (field-level or approve-only) | Extends **D3** |

### §12.6 Quality & compliance

| ID | Task | Notes |
|----|------|--------|
| M17 | **NCR / CAPA** workflow from inspection outcomes | New entities + stages |
| M18 | **Traceability** fields (heat, WPS, welder ID) on relevant tables | Report columns if needed |
| M19 | **Electronic signature** pattern for sign-offs **[~]** | Policy-heavy |

### §12.7 Productivity

| ID | Task | Notes |
|----|------|--------|
| M20 | **Project template / clone** | See **B6** |
| M21 | **Operational dashboard** (KPIs, overdue lines, stage bottlenecks) | Uses R1 aggregates + filters |
| M22 | **PWA / mobile-friendly** or offline **[~]** | §9 OOS for native; web-first MVP |

---

## Suggested sprint mapping (example)

| Sprint | Focus | Done when |
|--------|--------|-----------|
| 1 | P0, D1–D4, A1–A4, B1–B2 | Login + empty project CRUD |
| 2 | D5–D12, B3–B5, C1–C4 | Line items + concurrency column + handover |
| 3 | L1–L3, S1–S2 | First two stages end-to-end |
| 4 | S3–S5 | Fab, machining, warehouse |
| 5 | S6–S8 | Transport, site, invoice |
| 6 | R0–R3, RP1–RP6 (+ RP7 if promoted) | Reports + PDF (+ CSV) |
| 7 | C5–C6, H1–H4, UAT | Hardening + conflict UX |
| 8+ | M* as prioritized (§12) | Feature-pack releases |

---

## Traceability: PRD § → Task IDs

| PRD | Task IDs |
|-----|----------|
| §4 Core / stages | D4–D7, B1–B3, C1–C4, S1–S8 |
| §6 Reports | RP1–RP7 |
| §7 NFR / security | P0-3, A1–A2, H1, D9 |
| §8 Open decisions | R0, R3, R4, implementation notes in R0 README |
| §9 Out of scope | M22 mobile native; M14 ERP—explicit backlog |
| §11 Acceptance | Covered by Phases 3–8 + checklist below |
| §12 Market parity | M1–M22, A6, B6, R4 |

---

## Testing checklist (every setup)

**Core (v1)**  
- [ ] DB migrates cleanly from empty  
- [ ] Admin user can log in; non-admin cannot access user admin API  
- [ ] Each seeded role logs in and receives expected 403 on wrong stage  
- [ ] Handover advances stage; override with reason writes audit (**D9**)  
- [ ] New lookup value appears on second form open  
- [ ] Attachment uploads and downloads for one stage  
- [ ] Stale concurrent update returns 409 and UI recovers (**D12** + **C6**)  
- [ ] Project Status totals equal sum of seeded man-hour rows (± rounding)  
- [ ] PDF downloads and opens locally  

**Optional / when built**  
- [ ] CSV export matches on-screen report columns (**RP7**)  
- [ ] CSV import dry-run catches invalid rows (**M3**)  
- [ ] SSO login path (**M15** / **A6**)  
- [ ] Notification delivered on handover (**M1**)  

---

*Maintainer: update task IDs when splitting into Jira/Azure DevOps work items; keep §12 IDs grouped (M1–M22) for PRD traceability.*
