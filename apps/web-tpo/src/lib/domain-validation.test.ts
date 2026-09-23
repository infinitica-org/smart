import { describe, expect, it } from 'vitest';
import { validateInstitutionEmail } from './domain-validation';

describe('validateInstitutionEmail', () => {
  it('accepts primary domain and extras including subdomains', () => {
    expect(validateInstitutionEmail('ada@cs.riverdale.edu', 'riverdale.edu', ['partner.edu'])).toBe(
      true,
    );
    expect(validateInstitutionEmail('bob@partner.edu', 'riverdale.edu', ['partner.edu'])).toBe(
      true,
    );
    expect(validateInstitutionEmail('x@other.edu', 'riverdale.edu', [])).toBe(false);
  });
});
