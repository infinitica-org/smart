import { describe, expect, it, beforeEach } from 'vitest';
import {
  dismissEmployerFromQueue,
  isValidExtraDomainInput,
  loadAutoApproveInvites,
  loadDismissedEmployerIds,
  loadExtraEmailDomains,
  saveAutoApproveInvites,
  saveExtraEmailDomains,
} from './tpo-institution-settings';

const inst = '11111111-1111-4111-8111-111111111111';

describe('tpo-institution-settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults auto-approve invites to true', () => {
    expect(loadAutoApproveInvites(inst)).toBe(true);
  });

  it('persists extra domains and auto-approve flag', () => {
    saveExtraEmailDomains(inst, ['north.riverdale.edu', 'riverdale.edu']);
    saveAutoApproveInvites(inst, false);
    expect(loadExtraEmailDomains(inst)).toEqual(['north.riverdale.edu', 'riverdale.edu']);
    expect(loadAutoApproveInvites(inst)).toBe(false);
  });

  it('tracks dismissed employers in the approval queue', () => {
    dismissEmployerFromQueue(inst, 'emp-1');
    dismissEmployerFromQueue(inst, 'emp-1');
    expect(loadDismissedEmployerIds(inst)).toEqual(['emp-1']);
  });

  it('validates extra domain input', () => {
    expect(isValidExtraDomainInput('@riverdale.edu')).toBe(true);
    expect(isValidExtraDomainInput('not a domain')).toBe(false);
  });
});
