/**
 * Writes S6-VB-01-work-experience-verification.xlsx (Office Open XML).
 * No extra deps — zip + XML only.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, 'S6-VB-01-work-experience-verification.xlsx');

function colLetter(n) {
  let s = '';
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sheetXml(_name, rows) {
  const built = rows
    .map((row, rIdx) => {
      const r = String(rIdx + 1);
      const inner = row
        .map((value, cIdx) => {
          const ref = `${colLetter(cIdx + 1)}${r}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value ?? '')}</t></is></c>`;
        })
        .join('');
      return `<row r="${r}">${inner}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${built}</sheetData>
</worksheet>`;
}

const ticket = [
  [
    'Ticket ID',
    'Epic',
    'Title',
    'Owner',
    'Support',
    'Priority',
    'Sprint / version',
    'Est hours',
    'Status',
    'Depends on',
  ],
  [
    'S6-VB-01',
    'Trust / Work Experience',
    'Work experience verification — collect, validate proof, employer voucher, 48h restart',
    'Vishal Bharath R',
    'Sathesh (UI), Vishal V (mail/Redis/Prisma), Ramansh (OCR via gateway)',
    'P0',
    'v1.1.0 — 15 Sep 2026',
    '40',
    'Ready',
    'PR #168 Phase 1 CRUD on dev',
  ],
];

const collect = [
  ['#', 'Field', 'Who', 'Required', 'Purpose', 'Notes'],
  [
    '1',
    'Employer / company name',
    'Candidate',
    'Yes',
    'Identify employer',
    'Match later to OCR + catalog',
  ],
  ['2', 'Job title / role', 'Candidate', 'Yes', 'Verify designation', 'ROLE_MATCH / ROLE_VARIANCE'],
  [
    '3',
    'Employment type',
    'Candidate',
    'Yes',
    'FT / PT / intern / contract',
    'Ask employer the same question',
  ],
  ['4', 'Start date', 'Candidate', 'Yes', 'Period', 'Compare to joining / start on letter'],
  ['5', 'End date', 'Candidate', 'If not current', 'Period', 'Last working day on letter'],
  ['6', 'Work location', 'Candidate', 'No', 'Context', ''],
  ['7', 'Domain', 'Candidate', 'Yes', 'Claimed professional domain', 'Employer confirms broadly'],
  ['8', 'Department / team', 'Candidate', 'No', 'Find the verifier', ''],
  [
    '9',
    'Description / responsibilities',
    'Candidate',
    'Yes',
    'What they claim they did',
    'Max 4000',
  ],
  ['10', 'Skills used', 'Candidate', 'Yes', 'Skill tags', 'Employer confirms'],
  ['11', 'Projects worked on', 'Candidate', 'No', 'Optional support', ''],
  ['12', 'Reason for leaving', 'Candidate', 'No', 'Optional', ''],
  ['13', 'Candidate LinkedIn', 'Candidate', 'No', 'Identity context', ''],
  ['14', 'Experience proof file', 'Candidate', 'Yes', 'Completion proof', 'Offer letter ≠ proof'],
  ['15', 'Company website', 'Candidate', 'Yes if exists', 'Employer exists', 'Domain match'],
  [
    '16',
    'Company LinkedIn handle / URL',
    'Candidate',
    'Mandatory where available',
    'Second existence signal',
    'Allen: do not skip',
  ],
  [
    '17',
    'Company email domain',
    'Candidate / inferred',
    'Preferred',
    'Verifier allowlist',
    '@abctech.com',
  ],
  ['18', 'Company location / industry / size', 'Candidate', 'No', 'Context', ''],
];

const validate = [
  ['Check', 'Pass looks like', 'Fail / review code', 'Auto action'],
  [
    'Document type',
    'Experience / completion / relieving / service / employment certificate',
    'INVALID_DOCUMENT_TYPE (offer, joining, appointment, internship offer)',
    'Request new proof',
  ],
  ['Candidate identity', 'Name or employee id or email matches', 'IDENTITY_MISMATCH', 'Review'],
  [
    'Company identity',
    'Claim ≈ OCR ≈ website / LinkedIn',
    'COMPANY_MISMATCH',
    'Review — do not auto-fraud',
  ],
  ['Dates', 'Start / end / LWD align', 'DATE_DISCREPANCY', 'Review'],
  ['Role', 'Same or equivalent title', 'ROLE_VARIANCE (not auto-reject)', 'Record + continue'],
  [
    'Completion language',
    'worked with / relieved / tenure',
    'Offer language: pleased to offer',
    'Reject as offer',
  ],
  [
    'Integrity signals',
    'Letterhead, issue date, signature if present, OCR confidence',
    'ILLEGIBLE / TAMPER_SUSPECTED',
    'NEEDS_MANUAL_REVIEW only',
  ],
];

const statuses = [
  ['State', 'Kind', 'Meaning', 'Next action'],
  ['EXPERIENCE_DRAFT', 'progress', 'Editing', 'Submit'],
  ['SUBMITTED', 'progress', 'Locked claim', 'Document processing'],
  ['DOCUMENT_PROCESSING', 'progress', 'OCR / classify', 'Valid or reject'],
  ['DOCUMENT_VALIDATED', 'progress', 'Proof accepted', 'Verifier details'],
  ['DOCUMENT_REJECTED', 'fail', 'Bad / offer letter', 'New proof'],
  ['VERIFIER_PENDING', 'progress', 'Need official email', 'Collect verifier'],
  ['VERIFIER_INVALID', 'fail', 'Personal inbox / bad domain', 'New verifier'],
  ['EMAIL_SENT', 'progress', 'T=0', 'Wait'],
  ['WAITING_FOR_EMPLOYER', 'progress', 'Clock running', '6h reminder'],
  ['REMINDER_SENT', 'progress', 'Reminder n of 7', 'Wait or expire'],
  ['EMPLOYER_RESPONDED', 'progress', 'YES / NO / PARTIAL / CLARIFY', 'Review response'],
  ['RESPONSE_UNDER_REVIEW', 'progress', 'Partial / clarify', 'Human'],
  ['VERIFIED', 'terminal ok', 'Employer confirmed', 'Stop reminders'],
  ['EMPLOYER_REJECTED', 'terminal fail', 'Employer said no', 'Do not verify'],
  ['VERIFICATION_FAILED', 'terminal fail', 'Process failed', 'Support'],
  [
    'VERIFICATION_EXPIRED',
    'terminal timeout',
    '48h no response',
    'RESTART from step 1 — new verificationAttemptId',
  ],
];

const reminders = [
  ['Hour', 'Action'],
  ['0', 'Initial employer email'],
  ['6', 'Reminder 1'],
  ['12', 'Reminder 2'],
  ['18', 'Reminder 3'],
  ['24', 'Reminder 4'],
  ['30', 'Reminder 5'],
  ['36', 'Reminder 6'],
  ['42', 'Reminder 7'],
  ['48', 'VERIFICATION_EXPIRED — restart, do not verify'],
];

const ac = [
  ['#', 'Acceptance criterion'],
  ['1', 'Experience + company identity collected; LinkedIn handle/URL mandatory where available'],
  ['2', 'Offer / joining / appointment letters rejected as INVALID_DOCUMENT_TYPE'],
  ['3', 'OCR outcomes are VALID / INVALID / NEEDS_MANUAL_REVIEW — never auto-fraud'],
  ['4', 'Official-domain verifier; structured YES / NO / PARTIAL / NEED CLARIFICATION'],
  ['5', '6-hour reminders; 48-hour expiry; restart from beginning with new attempt id'],
  ['6', 'Dashboard: candidate, company, status, step, email, time remaining'],
  ['7', 'RBAC + rate-limit on every new route; LLM only via ai-gateway'],
  ['8', 'Tests: happy path, invalid type, company mismatch, expiry, restart'],
];

const slices = [
  ['Slice', 'Owner', 'Max LOC hint', 'Notes'],
  [
    'Contracts: statuses, flags, DTOs, routes, rate limits',
    'VB propose / Tino merge',
    '≤400',
    'First PR',
  ],
  [
    'Prisma tables + attempt history (VV authors migration)',
    'VV',
    'migration only',
    'VB opens issue',
  ],
  ['API: submit / document / validate / verifier', 'VB', '≤400', 'No mail yet'],
  ['Mail + 6h job + 48h expire + restart', 'VB + VV', '≤400', 'Redis TTL on reminder keys'],
  ['Student UI: form, proof, status, restart copy', 'SV', '≤400', 'Honest empty / expired states'],
  ['TPO / admin tracking dashboard', 'VB + SV', '≤400', 'Ops can answer “where is this?”'],
];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function zipStore(entries) {
  const chunks = [];
  const centrals = [];
  let offset = 0;
  for (const [name, body] of entries) {
    const data = Buffer.from(body, 'utf8');
    const compressed = deflateSync(data, { level: 9 });
    const crc = crc32(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const localFull = Buffer.concat([local, nameBuf, compressed]);
    chunks.push(localFull);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localFull.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralDir, end]);
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet6.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet7.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet5.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet6.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet7.xml"/>
</Relationships>`;

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Ticket" sheetId="1" r:id="rId1"/>
    <sheet name="Collect" sheetId="2" r:id="rId2"/>
    <sheet name="Validate" sheetId="3" r:id="rId3"/>
    <sheet name="Statuses" sheetId="4" r:id="rId4"/>
    <sheet name="Reminders" sheetId="5" r:id="rId5"/>
    <sheet name="Acceptance" sheetId="6" r:id="rId6"/>
    <sheet name="Slices" sheetId="7" r:id="rId7"/>
  </sheets>
</workbook>`;

mkdirSync(dir, { recursive: true });
writeFileSync(
  out,
  zipStore([
    ['[Content_Types].xml', contentTypes],
    ['_rels/.rels', rels],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', wbRels],
    ['xl/worksheets/sheet1.xml', sheetXml('Ticket', ticket)],
    ['xl/worksheets/sheet2.xml', sheetXml('Collect', collect)],
    ['xl/worksheets/sheet3.xml', sheetXml('Validate', validate)],
    ['xl/worksheets/sheet4.xml', sheetXml('Statuses', statuses)],
    ['xl/worksheets/sheet5.xml', sheetXml('Reminders', reminders)],
    ['xl/worksheets/sheet6.xml', sheetXml('Acceptance', ac)],
    ['xl/worksheets/sheet7.xml', sheetXml('Slices', slices)],
  ]),
);
