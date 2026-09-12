/**
 * Local smoke test: work experience save → employer verification dispatch.
 * HTTP-only (uses the running api-core instance's DB connection).
 * Run: node scripts/smoke-we-flow.mjs
 */
const API = process.env.API_URL ?? 'http://localhost:3000';
const STUDENT_EMAIL = process.env.SMOKE_STUDENT_EMAIL ?? 'student@smart.local';
const STUDENT_PASSWORD = process.env.SMOKE_STUDENT_PASSWORD ?? 'ChangeMe!Dev';
const VERIFIER_EMAIL = process.env.SMOKE_VERIFIER_EMAIL ?? 'hr@acme-corp.test';

const results = [];

function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ''}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function main() {
  console.log('=== WE smoke test (HTTP) ===\n');

  const ready = await api('/ready');
  if (ready.status === 200 && ready.json?.status === 'ok') {
    const pg = ready.json.checks?.postgres?.status;
    const redis = ready.json.checks?.redis?.status;
    pass('Readiness', `postgres=${pg}, redis=${redis}`);
  } else {
    fail('Readiness', `HTTP ${ready.status}`);
    printSummary();
    process.exit(1);
  }

  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  });
  if (!isSuccessStatus(login.status) || !login.json?.accessToken) {
    fail('Student login', `HTTP ${login.status} ${JSON.stringify(login.json)}`);
    printSummary();
    process.exit(1);
  }
  pass('Student login', STUDENT_EMAIL);
  const token = login.json.accessToken;

  const companyName = `Smoke Test Co ${Date.now()}`;
  const createPayload = {
    companyName,
    companyWebsite: 'https://acme-corp.test',
    companyLinkedinUrl: 'https://linkedin.com/company/acme-corp-test',
    role: 'Backend Engineer',
    employmentType: 'FULL_TIME',
    domain: 'Software Engineering',
    workLocation: 'Remote',
    startDate: '2023-01-01T00:00:00.000Z',
    isCurrent: true,
    responsibilities: 'Smoke test — built and maintained backend services.',
    skillsClaimed: ['PYTHON_APPLICATION_BACKEND_DEVELOPMENT'],
    verifierName: 'Jane HR',
    verifierEmail: VERIFIER_EMAIL,
    verifierDesignation: 'HR Manager',
    documents: [
      {
        documentType: 'OFFER_LETTER',
        fileUrl: 'storage/smoke/offer.pdf',
        fileName: 'offer.pdf',
        fileSizeBytes: 1024,
        mimeType: 'application/pdf',
      },
    ],
  };

  const created = await api('/api/v1/users/me/work-experiences', {
    method: 'POST',
    token,
    body: createPayload,
  });

  let experienceId;
  if (isSuccessStatus(created.status) && created.json?.id) {
    experienceId = created.json.id;
    pass('Create work experience', `id=${experienceId}, status=${created.json.status}`);
    if (created.json.evidence?.experienceId) {
      pass('Evidence embed on create', `employer=${created.json.evidence.employer}`);
    } else if (created.json.evidence === undefined) {
      fail('Evidence embed on create', 'missing — evidence sync may have been skipped');
    } else {
      fail('Evidence embed on create', JSON.stringify(created.json.evidence));
    }
  } else {
    fail('Create work experience', `HTTP ${created.status} ${JSON.stringify(created.json)}`);
    if (
      created.json?.message?.includes('evidence_records') ||
      created.json?.raw?.includes('evidence_records')
    ) {
      fail('Likely root cause', 'evidence_records table missing — run evidence migration (VV)');
    }
    printSummary();
    process.exit(1);
  }

  const listed = await api('/api/v1/users/me/work-experiences', { token });
  if (listed.status === 200 && Array.isArray(listed.json)) {
    const found = listed.json.some((row) => row.id === experienceId);
    if (found) pass('List work experiences', 'created row visible');
    else fail('List work experiences', 'created row not in list');
  } else {
    fail('List work experiences', `HTTP ${listed.status}`);
  }

  const sent = await api(`/api/v1/users/me/work-experiences/${experienceId}/send-verification`, {
    method: 'POST',
    token,
  });

  if (isSuccessStatus(sent.status)) {
    pass('Send employer verification', `response status=${sent.json?.status ?? 'ok'}`);
  } else {
    fail('Send employer verification', `HTTP ${sent.status} ${JSON.stringify(sent.json)}`);
  }

  const afterSend = await api(`/api/v1/users/me/work-experiences/${experienceId}`, { token });
  if (afterSend.status === 200 && afterSend.json?.status === 'PENDING_EMPLOYER') {
    pass('WE status after send', 'PENDING_EMPLOYER');
  } else {
    fail('WE status after send', afterSend.json?.status ?? `HTTP ${afterSend.status}`);
  }

  // Cleanup via API
  const deleted = await api(`/api/v1/users/me/work-experiences/${experienceId}`, {
    method: 'DELETE',
    token,
  });
  if (deleted.status === 204 || deleted.status === 200) {
    pass('Cleanup', `deleted ${experienceId}`);
  } else {
    fail('Cleanup', `HTTP ${deleted.status} — manual cleanup may be needed for ${experienceId}`);
  }

  console.log(
    '\nNote: employer email delivery requires BullMQ worker + SMTP (default 127.0.0.1:1025).',
  );

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => !r.ok);
  console.log('\n=== Summary ===');
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailed:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
