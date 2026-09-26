import { expect, test, type APIRequestContext } from '@playwright/test';
import { apiV1, e2eEnv } from '../helpers/env.js';
import { apiAs, bearer, login, uniqueSuffix, waitForMail } from '../helpers/flows.js';

/**
 * S6-VV-146 — wave 1 flows 2 and 3: an employer onboards through the public wizard API, can't sign
 * in while pending, is approved by a platform admin, sets a password from the emailed invite, and
 * sees its real verification status (S6-VV-139: the portal fails closed). Holding the company
 * blocks the very next call.
 */
test.describe.serial('employer self-serve onboarding', () => {
  let api: APIRequestContext;
  const suffix = uniqueSuffix();
  const domain = `e2e-${suffix}.example.com`;
  const workEmail = `hr@${domain}`;
  const password = `E2e!${suffix}`;
  let sessionToken = '';
  let companyId = '';
  let adminToken = '';
  let companyToken = '';

  const onboarding = (path = '') =>
    `${apiV1}/public/company/onboarding/sessions${sessionToken ? `/${sessionToken}` : ''}${path}`;

  test.beforeAll(async () => {
    api = await apiAs();
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test('a free-mail address is refused at the first step (S6-VV-140)', async () => {
    const response = await api.post(onboarding(), {
      data: { representative: { fullName: 'Asha Rao', workEmail: `asha.${suffix}@gmail.com` } },
    });
    expect(response.status()).toBe(422);
    expect(await response.text()).toContain('company email');
  });

  test('the representative starts, fills in the company and confirms their email', async () => {
    const start = await api.post(onboarding(), {
      data: {
        representative: { fullName: 'Asha Rao', workEmail },
        website: `https://${domain}`,
      },
    });
    expect(start.ok(), await start.text()).toBeTruthy();
    sessionToken = (await start.json()).sessionToken;

    const address = { line1: '1 MG Road', city: 'Bengaluru', country: 'IN' };
    const draft = await api.patch(onboarding(), {
      data: {
        profile: {
          displayName: `E2E Corp ${suffix}`,
          legalName: `E2E Corp ${suffix} Private Limited`,
          website: `https://${domain}`,
          sector: 'Software',
          mode: 'PRODUCT',
          sizeBand: '11-50',
          publicEmail: `contact@${domain}`,
          address,
        },
        representative: {
          fullName: 'Asha Rao',
          workEmail,
          phone: '+919876543210',
          jobTitle: 'HR Lead',
          relationship: 'HR',
        },
        verification: {
          registrationCountry: 'IN',
          legalName: `E2E Corp ${suffix} Private Limited`,
          registeredAddress: address,
          businessRegistrationNumber: `U72900KA2020PTC${suffix.slice(0, 6)}`,
        },
      },
    });
    expect(draft.ok(), await draft.text()).toBeTruthy();

    const send = await api.post(onboarding('/email/send'), { data: {} });
    expect(send.ok(), await send.text()).toBeTruthy();
    const [, code] = await waitForMail(api, workEmail, /\b(\d{6})\b/);
    const verify = await api.post(onboarding('/email/verify'), { data: { code } });
    expect(verify.ok(), await verify.text()).toBeTruthy();
  });

  test('submits for review, then attaches a registration document', async () => {
    const submit = await api.post(onboarding('/submit'), {
      data: { attestations: { authorizedToRepresent: true, informationAccurate: true } },
    });
    expect(submit.ok(), await submit.text()).toBeTruthy();
    const body = await submit.json();
    companyId = body.companyId;
    expect(body.verificationStatus).toBe('PENDING');

    // Documents are accepted once the application is in review (PENDING_REVIEW).
    const upload = await api.post(onboarding('/documents'), {
      multipart: {
        documentType: 'BUSINESS_REGISTRATION',
        file: {
          name: 'registration.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% SMART e2e registration certificate\n%%EOF\n'),
        },
      },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
  });

  test('a pending employer has no sign-in yet', async () => {
    const response = await login(api, workEmail, password);
    expect(response.status()).toBe(401);
  });

  test('a platform admin approves the company, and the approval is audited', async () => {
    const adminLogin = await login(
      api,
      `admin@${e2eEnv.studentEmail.split('@')[1]}`,
      e2eEnv.password,
    );
    expect(adminLogin.ok(), await adminLogin.text()).toBeTruthy();
    adminToken = (await adminLogin.json()).accessToken;

    const resolve = await api.post(`${apiV1}/admin/verification-queue/${companyId}/resolve`, {
      headers: bearer(adminToken),
      data: {
        tenantType: 'company',
        decision: 'APPROVED',
        reason: 'E2E: registration document matches the company details.',
      },
    });
    expect(resolve.ok(), await resolve.text()).toBeTruthy();

    await expect
      .poll(async () => {
        const audit = await api.get(
          `${apiV1}/admin/audit-logs?action=company.verification.approved&resourceId=${companyId}`,
          { headers: bearer(adminToken) },
        );
        return JSON.stringify(await audit.json());
      })
      .toContain(companyId);
  });

  test('the representative sets a password from the invite and sees APPROVED', async () => {
    const [, inviteToken] = await waitForMail(api, workEmail, /\/invite\/([A-Za-z0-9_-]{20,})/);
    const accept = await api.post(`${apiV1}/auth/invitations/${inviteToken}/accept`, {
      data: { password },
    });
    expect(accept.ok(), await accept.text()).toBeTruthy();

    const companyLogin = await login(api, workEmail, password);
    expect(companyLogin.ok(), await companyLogin.text()).toBeTruthy();
    const session = await companyLogin.json();
    expect(session.user.role).toBe('COMPANY');
    companyToken = session.accessToken;

    const account = await api.get(`${apiV1}/auth/company/account`, {
      headers: bearer(companyToken),
    });
    expect(account.ok(), await account.text()).toBeTruthy();
    expect((await account.json()).companyVerificationStatus).toBe('APPROVED');
  });

  test('holding the company blocks its very next call (S6-VV-139 fails closed)', async () => {
    const hold = await api.post(`${apiV1}/admin/companies/${companyId}/hold`, {
      headers: bearer(adminToken),
      data: { reason: 'E2E: checking that a hold takes effect immediately.' },
    });
    expect(hold.ok(), await hold.text()).toBeTruthy();

    const account = await api.get(`${apiV1}/auth/company/account`, {
      headers: bearer(companyToken),
    });
    expect(account.status()).toBe(403);
    expect((await account.json()).error).toBe('company_held');
  });
});
