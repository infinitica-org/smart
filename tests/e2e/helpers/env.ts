export const e2eEnv = {
  apiUrl: process.env.E2E_API_URL ?? 'http://localhost:3000',
  authAppUrl: process.env.E2E_AUTH_URL ?? 'http://localhost:3005',
  studentAppUrl: process.env.E2E_STUDENT_URL ?? 'http://localhost:3001',
  tpoAppUrl: process.env.E2E_TPO_URL ?? 'http://localhost:3002',
  verifyAppUrl: process.env.E2E_VERIFY_URL ?? 'http://localhost:3004',
  mailpitUrl: process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025',
  studentEmail: process.env.E2E_STUDENT_EMAIL ?? 'student@smart.local',
  tpoEmail: process.env.E2E_TPO_EMAIL ?? 'tpo@smart.local',
  password: process.env.E2E_PASSWORD ?? 'ChangeMe!Dev',
} as const;

export const apiV1 = `${e2eEnv.apiUrl}/api/v1`;
