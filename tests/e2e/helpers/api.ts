import type { APIRequestContext } from '@playwright/test';
import { apiV1 } from './env.js';

export interface AuthSession {
  accessToken: string;
  userId: string;
}

export interface WorkExperienceRecord {
  id: string;
  status: string;
  companyName: string;
}

export interface OpsDashboardRow {
  experienceId: string;
  status: string;
  nextAction: string;
  companyName: string;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status()} ${response.url()}: ${body}`);
  }
  return (await response.json()) as T;
}

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await request.post(`${apiV1}/auth/login`, {
    data: { email, password },
  });
  const body = await parseJson<{
    accessToken: string;
    user: { userId: string };
  }>(response);
  return { accessToken: body.accessToken, userId: body.user.userId };
}

export async function createWorkExperience(
  request: APIRequestContext,
  token: string,
  payload: {
    companyName: string;
    role: string;
    companyWebsite: string;
    companyLinkedinUrl: string;
    verifierEmail: string;
    verifierName?: string;
  },
): Promise<WorkExperienceRecord> {
  const offerLetterDataUri = `data:application/pdf;base64,${Buffer.from(
    '%PDF-1.4 SMART E2E offer letter stub',
  ).toString('base64')}`;

  const response = await request.post(`${apiV1}/users/me/work-experiences`, {
    headers: authHeaders(token),
    data: {
      companyName: payload.companyName,
      role: payload.role,
      employmentType: 'FULL_TIME',
      companyWebsite: payload.companyWebsite,
      companyLinkedinUrl: payload.companyLinkedinUrl,
      startDate: '2022-01-01T00:00:00.000Z',
      isCurrent: true,
      verifierEmail: payload.verifierEmail,
      verifierName: payload.verifierName ?? 'E2E Manager',
      documents: [
        {
          documentType: 'OFFER_LETTER',
          fileUrl: offerLetterDataUri,
          fileName: 'offer-letter.pdf',
          fileSizeBytes: 256,
          mimeType: 'application/pdf',
        },
      ],
    },
  });

  return parseJson<WorkExperienceRecord>(response);
}

export async function sendVerification(
  request: APIRequestContext,
  token: string,
  experienceId: string,
): Promise<{ status: string; message: string }> {
  const response = await request.post(
    `${apiV1}/users/me/work-experiences/${experienceId}/send-verification`,
    {
      headers: authHeaders(token),
      data: {},
    },
  );
  return parseJson(response);
}

export async function listWorkExperiences(
  request: APIRequestContext,
  token: string,
): Promise<WorkExperienceRecord[]> {
  const response = await request.get(`${apiV1}/users/me/work-experiences`, {
    headers: authHeaders(token),
  });
  return parseJson<WorkExperienceRecord[]>(response);
}

export async function getOpsDashboard(
  request: APIRequestContext,
  token: string,
): Promise<OpsDashboardRow[]> {
  const response = await request.get(`${apiV1}/users/me/work-experiences/ops-dashboard`, {
    headers: authHeaders(token),
  });
  return parseJson<OpsDashboardRow[]>(response);
}

export async function deleteWorkExperience(
  request: APIRequestContext,
  token: string,
  experienceId: string,
): Promise<void> {
  const response = await request.delete(`${apiV1}/users/me/work-experiences/${experienceId}`, {
    headers: authHeaders(token),
  });
  if (!response.ok() && response.status() !== 404) {
    const body = await response.text();
    throw new Error(`Failed to delete work experience ${experienceId}: ${body}`);
  }
}

export async function getVerificationByToken(
  request: APIRequestContext,
  rawToken: string,
): Promise<{ status: string; isExpired: boolean; companyName: string }> {
  const response = await request.get(`${apiV1}/users/work-experiences/verify-token/${rawToken}`);
  return parseJson(response);
}
