# Product Requirements Document (PRD)
## Industrial Project Workflow & Cost Tracking System

**Version:** 1.0  
**Date:** 2026-04-18  
**Status:** Draft for implementation

---

## 1. Executive Summary

Build a web application that manages multi-stage industrial projects from initial site measurement through invoicing. The system provides **authenticated role-based access**, **admin-driven project setup**, **department-specific data entry** aligned to a defined workflow, **flexible stage navigation** when corrections or exceptions occur, **reusable dropdown masters** (with inline “add new” values), and **two aggregate reports** (Project Status, Cost Summary) with **PDF export** and charts where they add clarity.

---

## 2. Goals & Success Metrics

| Goal | Success metric |
|------|----------------|
| Reduce spreadsheet fragmentation | Single source of truth per project line item |
| Enforce workflow visibility | Each role sees only permitted stages (with admin override) |
| Financial & operational insight | Reports reconcile man-hours, KM, fuel, and invoice columns |
| Auditability | Attachments and stage transitions traceable to user and timestamp |

---

## 3. Personas & Roles

| Role | Primary responsibilities |
|------|-------------------------|
| **Admin** | Create/edit/archive projects; set initial master data; assign or adjust **current stage**; grant access to any stage for correction; manage users and roles; configure rates (man-hour cost, fuel cost per KM or per vehicle) and lookup lists |
| **Site Measurement** | Input site measurement, man-hours, travel to site |
| **Design / Engineering** | Engineering data, BOM, approval-related man-hours |
| **Fabrication Shop** | Yard/shop locations, yard–shop transport, fab process & inspection man-hours |
| **Machining Shop** | Machining tasks, rework, vehicle request |
| **Warehouse / Store** | Delivery request, warehouse man-hours |
| **Transport** | Delivery man-hours (locations), delivery trips (KM) |
| **Site Installation** | Site team activities, site man-hours |
| **Invoice** | Monetary (SAR) line, accounts handover, invoice man-hours |
| **Accounts** *(optional read-only)* | Consumes invoice handover; may appear as reporting-only role |

Roles map to **workflow stages**. One user may hold multiple roles if the business requires it.

---

## 4. Core Concepts

### 4.1 Project hierarchy

- **Project**: Header (client, plant, PO, project ID, bid, year/month context, area, etc.).
- **Line item** (recommended): Identified by drawing/sheet/rev + material/clamp/description/qty (and weights where applicable)—this is the grain for **cross-stage rollups** in reports.

*PRD assumption:* Reports that pivot “one row per line item” require a stable **LineItem** (or **WorkOrderLine**) key; free-text duplicates complicate aggregation—implementation should normalize identifiers early.

### 4.2 Workflow stages (canonical order)

1. INPUT SITE MEASUREMENT  
2. DESIGNING & ENGINEERING  
3. FABRICATION SHOP  
4. MACHINING SHOP  
5. WAREHOUSE (OR) STORE  
6. TRANSPORT  
7. SITE INSTALLATION  
8. INVOICE  

### 4.3 Stage state machine

- Each project line (or project, depending on chosen grain) has **`currentStage`** and optionally **`stageStatuses`** per stage (Not started / In progress / Complete / Blocked).
- **Happy path:** Completing mandatory fields + explicit **Handover** advances `currentStage` to the next department implied by **JOB HANDOVER** selections.
- **Exception path:** **Admin** or a user with **`overrideStage`** permission may set `currentStage` to **any** stage and record **reason** + **actor** + **timestamp** (audit log).

### 4.4 Lookups (“smart dropdowns”)

- Fields such as **MATERIAL**, **CLAMP TYPE**, **VEHICLE TYPE**, **JOB DESCRIPTION** variants, **CATEGORY**, **SHIFT**, etc. are backed by **lookup entities** keyed by type + optional stage scope.
- UI: **Combobox**—select existing or **Add new**; new values persist and appear for future entries (permission: **`manageLookups`** or stage-specific rule).

### 4.5 Attachments

- Stages marked “add attachments” allow **file upload** bound to project/line/stage; store metadata (name, size, uploader, time); virus scan policy TBD (optional).

### 4.6 Rates for costing (admin-configured)

- **Man-hour cost:** By **CATEGORY** and/or **ID NO.** (employee/person), date-effective bands if needed.
- **Fuel cost:** Per **vehicle type** and/or **per KM**; formula: `fuelCost = km * rate` (details in §8).
- Reports show **TOTAL MAN HRS COST**, **TOTAL FUEL COST**, **TOTAL COST**, **INVOICE COST**—definitions must be fixed in implementation (see §8).

---

## 5. Functional Requirements by Stage

Field names below follow the user's specification (typos like TRIPE/TRAN, HANNDOVER preserved in UI labels only if desired; DB should use normalized keys).

### 5.1 INPUT SITE MEASUREMENT

| Sub-area | Fields |
|----------|--------|
| **SITE MEASUREMENT** | YEAR, MONTH, AREA, CLIENT, PLANT, PO. NUMBER, PROJECT ID, BID NUMBER, INPUT DRAWING NUMBER, DRAWING NUMBER, SHT NO, REV NO, CLAMP TYPE, MATERIAL, DESCRIPTION, QTY, MEASUREMENT DATE, TARGET DATE, JOB STATUS, JOB HANDOVER (→ ENGINEERING), attachments |
| **MAN HRS** | YEAR, MONTH, SHIFT, DATE, CLIENT, PLANT, PO. NUMBER, PROJECT ID, BID NUMBER, INPUT DRAWING NUMBER, DRAWING NUMBER, SHT NO, REV NO, ID NO., CATEGORY, Name, NORMAL HOURS, OT HOURS, Total hrs, JOB STATUS |
| **TRAVEL TO SITE** | YEAR, MONTH, SHIFT, DATE, CLIENT, PLANT, PO. NUMBER, PROJECT ID, BID NUMBER, INPUT DRAWING NUMBER, DRAWING NUMBER, SHT NO, REV NO, TRIP, VEHICLE TYPE, ONE WAY (KM), ROUND TRIP (KM), JOB STATUS |

### 5.2 DESIGNING & ENGINEERING

| Sub-area | Fields |
|----------|--------|
| **ENGINEERING** | Common identifiers + CLAMP TYPE, MATERIAL, DESCRIPTION, QTY, UNIT WEIGHT, TOTAL WEIGHT, JOB STATUS, JOB HANDOVER (→ FAB SHOP, MACHINING SHOP), attachments |
| **MAN HRS** | Standard labor + JOB STATUS + **APPROVAL STATUS** |
| **BILL OF MATERIALS** | YEAR, MONTH, DESCRIPTION, QTY, MATERIAL SPEC |

### 5.3 FABRICATION SHOP

| Sub-area | Fields |
|----------|--------|
| **FAB SHOP (summary / locations)** | As per blueprint: DESCRIPTION, QTY, UNIT WEIGHT, TOTAL WEIGHT, YARD LOCATION, SHOP LOCATION, JOB HANDOVER (FAB SHOP context) |
| **MAN HRS (yard/shop)** | Extended row including DESCRIPTION, QTY, weights, YARD LOCATION, SHOP LOCATION, ID NO., CATEGORY, Name, hours, JOB STATUS, JOB HANDOVER |
| **YARD TO SHOP TRANSPORT** | TRIP, VEHICLE TYPE, ONE WAY (KM), ROUND TRIP (KM), JOB STATUS (+ identifiers) |
| **FAB SHOP process grid** | JOB DESCRIPTION (cutting, grinding, fitup, etc.), INSPECTION (fitup/final), THIRD PARTY INSPECTION (PT, PMI, MT, RT), REWORK, process columns: MATERIAL CUTTING, GRINDING, FITUP, FIT UP INSPECTION, WELDING, FINAL GRINDING, JOB HANDOVER (→ MACHINING SHOP) |
| **MAN HRS (process)** | JOB DESCRIPTION, REWORK, JOB STATUS, JOB HANDOVER (→ TRANSPORT DEPARTMENT as per spec) |

*Note:* The blueprint mixes tabular line items and process-level hour buckets; implementation may model **process hours** as child rows keyed by process enum for reporting columns.

### 5.4 MACHINING SHOP

| Sub-area | Fields |
|----------|--------|
| **MACHINING SHOP** | JOB DESCRIPTION (SHAPING, DRILLING, MACHINING), INSPECTION (FINAL), REWORK, JOB STATUS, JOB HANDOVER (WAREHOUSE / TRANSPORT), VEHICLE REQUEST, attachments |
| **MAN HRS** | JOB DESCRIPTION, REWORK, JOB STATUS |

### 5.5 WAREHOUSE (OR) STORE

| Sub-area | Fields |
|----------|--------|
| **Delivery request** | INSPECTION REPORT, DELIVERY TICKET NUMBER, JOB STATUS, JOB HANDOVER (→ TRANSPORT) |
| **MAN HRS** | Full identity + material line fields |

### 5.6 TRANSPORT

| Sub-area | Fields |
|----------|--------|
| **Delivery MAN HRS** | CURRENT LOCATION, SITE LOCATION, JOB HANDOVER (→ SITE TEAM) |
| **DELIVERY TO TRIP** | TRIP, VEHICLE TYPE, ONE WAY (KM), ROUND TRIP (KM), JOB STATUS |

### 5.7 SITE INSTALLATION

| Sub-area | Fields |
|----------|--------|
| **SITE TEAM** | JOB DESCRIPTION, REWORK, JOB STATUS, JOB HANDOVER (SHOP / INVOICE), attachments |
| **MAN HRS** | Standard + JOB STATUS |

### 5.8 INVOICE

| Sub-area | Fields |
|----------|--------|
| **INVOICE** | SAR, JOB STATUS, JOB HANDOVER (→ ACCOUNTS DEPARTMENT), attachments |
| **MAN HRS** | CURRENT LOCATION, SITE LOCATION, JOB STATUS |

---

## 6. Reporting

### 6.1 Project Status Report

**Grain:** One row per **line item** (recommended) with project header columns repeated per blueprint.

**Columns (indicative):**  
YEAR, MONTH, AREA, CLIENT, PLANT, PO. NUMBER, PROJECT ID, BID NUMBER, INPUT DRAWING NUMBER, DRAWING NUMBER, SHT NO, REV NO, MATERIAL, CLAMP TYPE, DESCRIPTION, QTY, UNIT WEIGHT, TOTAL WEIGHT, MEASUREMENT DATE, TARGET DATE, INPUT SITE MEASUREMENT (status/hours as defined), DESIGNING & ENGINEERING, YARD TO SHOP TRANSPORT (HRS), YARD TO SHOP TRANSPORT (KM), YARD TO SHOP TRANSPORT FUEL COST, **Fab process buckets** (material cutting, grinding, fitup, fitup welding man hrs, fit up inspection man hrs, welding man hrs, final grinding man hrs), **Machining** (shaping, drilling, machining, final inspection man hrs), **Warehouse** man hrs, **Transport** man hrs, **Transport** KM, **Transport** fuel cost, **Site installation** man hrs, **Invoice** man hrs, **TOTAL KM**, **TOTAL MAN HRS COST**, **TOTAL FUEL COST**, **TOTAL COST**, **INVOICE COST**.

**Rules:**  
- Numeric columns aggregate from child tables; empty = 0 or blank per UX policy.  
- **Charts:** Optional bar/line for cost breakdown per line or per project (configurable).

### 6.2 Cost Summary Report

Same identity columns as above; column set focuses on **man-hour columns per stage/activity** (as in user list): INPUT SITE MEASUREMENT (MAN HRS), DESIGNING & ENGINEERING (MAN HRS), YARD TO SHOP TRANSPORT (MAN HRS), then fab/machining buckets, warehouse, transport, site installation, invoice.

### 6.3 Export

- **PDF** download for both reports (server-side rendering: HTML → PDF or report library).  
- Optional **Excel/CSV** export phase-2 unless required in v1.

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Security** | Password hashing (e.g. bcrypt/argon2), HTTPS, JWT or session cookies, CSRF protection for cookie-based auth |
| **Authorization** | RBAC middleware on every API route; row-level check by project membership if multi-tenant grows |
| **Performance** | Report queries indexed by PROJECT ID + drawing keys; pagination on grids |
| **Audit** | Stage changes, handovers, lookup creation, invoice amounts |
| **Backup** | DB backups + attachment storage policy |

---

## 8. Open decisions (to lock during implementation)

1. **Aggregation grain:** Strict **LineItem** table vs. duplicate key matching on each form—**LineItem strongly recommended.**  
2. **OT weighting:** Whether OT hours use a multiplier for cost (configurable).  
3. **Fuel model:** Per-vehicle flat trip cost vs. KM × rate; handle ROUND TRIP vs ONE WAY consistently.  
4. **“Total hrs”:** Stored vs computed from NORMAL + OT.  
5. **Localization:** English UI only vs. Arabic numerals/labels later.

---

## 9. Out of Scope (v1 unless promoted)

- Mobile native apps  
- Full accounting/ERP GL integration  
- Real-time GPS for CURRENT LOCATION  

---

## 10. Recommended Technical Stack (baseline)

| Layer | Suggestion |
|-------|------------|
| **DB** | PostgreSQL |
| **API** | Node (NestJS or Express) or .NET 8 Web API |
| **Auth** | JWT + refresh or session store; role claims |
| **Frontend** | React (Vite) + UI library (MUI or similar); react-query |
| **PDF** | Puppeteer, Playwright PDF, or dedicated PDF service |
| **Files** | Local disk v1 / S3-compatible later |

---

## 11. Acceptance criteria (release gate)

- [ ] Admin can create a project with initial data and assign starting stage.  
- [ ] Each role logs in and only accesses permitted stages; handover updates stage.  
- [ ] Admin or authorized user can move project/line to any stage with audit reason.  
- [ ] Lookups support add-new and reuse.  
- [ ] Both reports match manual sums on a seeded test project.  
- [ ] PDF export opens and includes headers/footers (project id, date generated).  

---

## 12. Market parity & backlog (cross-check)

Cross-check against capabilities commonly found in commercial PMS, industrial workflow, and shop-floor tools. **PRD v1.0** above deliberately focused the core vertical slice; the tables below record **gaps** for prioritization in later releases—not an obligation to build everything.

### 12.1 High impact for real shops

| Area | What market tools usually have | PRD today |
|------|-------------------------------|-----------|
| **Notifications** | Email / Teams when handover happens, assignment, due dates | Not specified |
| **Comments / activity feed** | Per line item or stage: notes, @user, “why did we jump stage?” — threaded collaboration | Audit log exists; threaded collaboration not spelled out |
| **Excel friendliness** | CSV import/export for grids (man-hours, trips) | Reports PDF yes; grid import often “must have” for adoption—not specified |
| **Concurrent editing** | Optimistic locking or “record locked by user X” | Not specified—risk of overwrites in busy shops |
| **Approval workflow** | Multi-step (e.g. engineer → lead), not only an **APPROVAL STATUS** field | Field exists in engineering man-hours; routing not defined |
| **Subcontractor / external portal** | Limited access for third-party inspection, transport | Not in scope for v1 |

### 12.2 Document & engineering (common in industrial PMS)

| Area | Typical | PRD today |
|------|---------|-----------|
| **Document / revision control** | Full history per drawing: who changed REV, superseded docs, “current only” reports; optional recost on rev change | REV fields present; formal revision history & rules not defined |
| **Transmittals** | Issued-for-review, IFC, as-built packages | Not included (often a separate DMS) |

### 12.3 Planning & control (classic PMS)

| Area | Typical | PRD today |
|------|---------|-----------|
| **Baseline** | Planned dates/cost vs actual | TARGET DATE exists; baseline snapshot not defined |
| **Dependencies / Gantt** | CPM, milestones | Out of line with the spreadsheet-style model unless scope expands |
| **Change orders** | Scope/cost impact tracked | Not in PRD |

### 12.4 Inventory, procurement, finance touches

| Area | Typical | PRD today |
|------|---------|-----------|
| **Stock / reservation** | BOM drives pick lists, shortages | BOM lines without inventory link |
| **PO workflow** | PO as a managed procurement object | PO used as a header attribute only |
| **ERP sync** | Post invoice/cost to GL | Listed out of scope for v1—intentional if retained |

### 12.5 Enterprise IT expectations

| Area | Typical | PRD today |
|------|---------|-----------|
| **SSO** (SAML/OIDC, Azure AD) | Standard in mid/large orgs | Not listed |
| **RBAC granularity** | Field-level or “approve only” permissions | Stage-level RBAC; may suffice for v1 |

### 12.6 Quality & compliance (shops with audits)

| Area | Typical | PRD today |
|------|---------|-----------|
| **NCR / CAPA** | Formal nonconformance from inspection | Inspection fields exist; NCR workflow not defined |
| **Traceability** | Heat numbers, WPS, welder ID | Not in blueprint |
| **Electronic signature** | Regulated-style sign-off (e.g. 21 CFR Part 11 patterns) | Not mentioned |

### 12.7 Productivity features users often ask for

| Area | Typical | PRD today |
|------|---------|-----------|
| **Project templates / clone** | Copy a prior job | Not listed |
| **Dashboards** | KPIs across projects, overdue lines | Two reports—not a live operational dashboard |
| **Mobile / offline** | Site capture with limited connectivity | Listed out of scope for v1 in §9 |

---

*End of PRD.*
