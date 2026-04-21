#!/usr/bin/env node
/**
 * API E2E: health, login, reports (gold project), RBAC 403 message, handover-gate sample.
 *
 * Usage (from workflow-pms):
 *   node scripts/e2e-docker.mjs
 *
 * Env:
 *   API_URL — default http://localhost:3000 (or http://localhost:8082/api via nginx)
 *   E2E_WAIT_ATTEMPTS — health poll attempts (default 45)
 *   E2E_REQUIRE_LINE_ROWS — if "1", fail when project-status has 0 rows on gold project
 *   E2E_PROJECT_CODE — default PRJ-GOLD-COMPLETE
 */
import { Buffer } from 'node:buffer';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function joinUrl(base, path) {
  const b = String(base).replace(/\/+$/, '');
  const p = String(path).replace(/^\/+/, '');
  return `${b}/${p}`;
}

const API = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const WAIT_ATTEMPTS = Math.max(
  5,
  parseInt(process.env.E2E_WAIT_ATTEMPTS || '45', 10) || 45,
);
const REQUIRE_LINE_ROWS = process.env.E2E_REQUIRE_LINE_ROWS === '1';
const GOLD_CODE = process.env.E2E_PROJECT_CODE || 'PRJ-GOLD-COMPLETE';

async function loginEmail(email, password) {
  const tryLogin = () =>
    fetch(joinUrl(API, 'auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  let loginRes = await tryLogin();
  if (loginRes.status === 429) {
    console.warn('Login rate-limited (429); waiting 65s then retry…');
    await sleep(65000);
    loginRes = await tryLogin();
  }
  if (!loginRes.ok) {
    throw new Error(`Login failed (${email}): ${loginRes.status} ${await loginRes.text()}`);
  }
  const { access_token: token } = await loginRes.json();
  return token;
}

function assertForbiddenMessage(body, label) {
  const msg =
    typeof body.message === 'string'
      ? body.message
      : JSON.stringify(body.message ?? body);
  if (!/requires role|role:/i.test(msg) && !/Your roles/i.test(msg)) {
    console.warn(
      `[e2e warn] ${label}: expected RBAC hint in message, got:`,
      msg.slice(0, 200),
    );
  }
}

async function main() {
  console.log(`E2E — API base: ${API}`);
  console.log(`E2E — target project code: ${GOLD_CODE}`);
  console.log(`E2E — health poll: up to ${WAIT_ATTEMPTS} attempts × 2s`);

  let healthOk = false;
  let lastErr = '';
  for (let i = 0; i < WAIT_ATTEMPTS; i++) {
    try {
      const h = await fetch(joinUrl(API, 'health'));
      if (h.ok) {
        const text = await h.text();
        try {
          console.log('Health OK', JSON.parse(text));
        } catch {
          console.log('Health OK (status', h.status, ', non-JSON body)');
        }
        healthOk = true;
        break;
      }
      lastErr = `HTTP ${h.status}`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    if (i < WAIT_ATTEMPTS - 1) {
      if (i > 0 && i % 5 === 0) {
        console.log(`… still waiting (${i}/${WAIT_ATTEMPTS}) last: ${lastErr}`);
      }
      await sleep(2000);
    }
  }

  if (!healthOk) {
    let hint = '';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(lastErr)) {
      hint =
        '\n  (Connection error — is the API running? For Docker: `docker compose up -d`.)';
    }
    throw new Error(
      `API /health not reachable after ${WAIT_ATTEMPTS} attempts. Last error: ${lastErr || 'unknown'}` +
        hint +
        `\n  API_URL=${API}`,
    );
  }

  const adminToken = await loginEmail('admin@example.com', 'Admin123!');
  console.log('Admin login OK');

  const engToken = await loginEmail('engineering@example.com', 'Engineering123!');
  console.log('Engineering login OK');

  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const engAuth = { Authorization: `Bearer ${engToken}` };

  const forbiddenRes = await fetch(joinUrl(API, 'projects'), {
    method: 'POST',
    headers: { ...engAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: 'E2E-RBAC-FORBIDDEN-TEST' }),
  });
  if (forbiddenRes.status !== 403) {
    throw new Error(
      `Expected POST /projects as engineer → 403, got ${forbiddenRes.status} ${await forbiddenRes.text()}`,
    );
  }
  const forbiddenJson = await forbiddenRes.json();
  assertForbiddenMessage(forbiddenJson, 'POST /projects');
  console.log('RBAC 403 OK:', String(forbiddenJson.message).slice(0, 120));

  const projects = await fetch(joinUrl(API, 'projects'), { headers: adminAuth });
  if (!projects.ok) throw new Error(`GET /projects failed: ${await projects.text()}`);
  const projList = await projects.json();
  if (!Array.isArray(projList) || !projList.length) {
    throw new Error('No projects — run prisma db seed on the API');
  }
  const gold = projList.find((p) => p.projectId === GOLD_CODE);
  const projectId = gold?.id ?? projList[0].id;
  if (!gold) {
    console.warn(`Project ${GOLD_CODE} not found; using first project ${projList[0].projectId}`);
  } else {
    console.log('Gold project id=', projectId);
  }

  const lines = await fetch(joinUrl(API, `projects/${projectId}`), { headers: adminAuth });
  if (!lines.ok) throw new Error(`GET /projects/:id failed`);
  const detail = await lines.json();
  const firstLineId = detail.lineItems?.[0]?.id;
  if (firstLineId) {
    const gate = await fetch(joinUrl(API, `line-items/${firstLineId}/handover-gate`), {
      headers: adminAuth,
    });
    if (!gate.ok) throw new Error(`handover-gate failed: ${await gate.text()}`);
    const g = await gate.json();
    console.log('handover-gate:', g.ready ? 'ready' : 'blocked', 'errors:', g.errors?.length ?? 0);
  }

  const rep = await fetch(
    joinUrl(API, `reports/project-status?projectId=${encodeURIComponent(projectId)}`),
    { headers: adminAuth },
  );
  if (!rep.ok) throw new Error(`Report JSON failed: ${await rep.text()}`);
  const rows = await rep.json();
  if (!Array.isArray(rows)) throw new Error('Report JSON is not an array');
  console.log('Project-status rows:', rows.length);
  if (REQUIRE_LINE_ROWS && rows.length === 0) {
    throw new Error('E2E_REQUIRE_LINE_ROWS=1 but project-status returned 0 rows');
  }

  const pdf = await fetch(
    joinUrl(API, `reports/project-status.pdf?projectId=${encodeURIComponent(projectId)}`),
    { headers: adminAuth },
  );
  if (!pdf.ok) throw new Error(`PDF failed: ${pdf.status} ${await pdf.text()}`);
  const pdfBuf = Buffer.from(await pdf.arrayBuffer());
  console.log('PDF bytes:', pdfBuf.length);
  if (pdfBuf.length < 100) throw new Error('PDF too small');

  const csv = await fetch(
    joinUrl(API, `reports/project-status.csv?projectId=${encodeURIComponent(projectId)}`),
    { headers: adminAuth },
  );
  if (!csv.ok) throw new Error(`CSV failed: ${await csv.text()}`);
  const csvText = await csv.text();
  console.log('Project-status CSV chars:', csvText.length);

  const costJ = await fetch(
    joinUrl(API, `reports/cost-summary?projectId=${encodeURIComponent(projectId)}`),
    { headers: adminAuth },
  );
  if (!costJ.ok) throw new Error(`Cost summary JSON failed: ${await costJ.text()}`);
  const costRows = await costJ.json();
  console.log(
    'Cost-summary rows:',
    Array.isArray(costRows) ? costRows.length : 'invalid',
  );

  const costCsv = await fetch(
    joinUrl(API, `reports/cost-summary.csv?projectId=${encodeURIComponent(projectId)}`),
    { headers: adminAuth },
  );
  if (!costCsv.ok) throw new Error(`Cost summary CSV failed: ${await costCsv.text()}`);
  console.log('Cost-summary CSV chars:', (await costCsv.text()).length);

  const costEng = await fetch(
    joinUrl(API, `reports/cost-summary?projectId=${encodeURIComponent(projectId)}`),
    { headers: engAuth },
  );
  if (!costEng.ok) throw new Error(`Engineer cost-summary should succeed (JWT): ${await costEng.text()}`);

  console.log('\nE2E PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
