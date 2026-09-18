import { describe, expect, it } from 'vitest';

import {
  studentBadgeVerifiedClass,
  studentInputClass,
  studentWarningBannerClass,
} from './student-ui-classes';

describe('student-ui-classes', () => {
  it('references centralized student tokens', () => {
    expect(studentWarningBannerClass).toMatch(/var\(--student-warning/);
    expect(studentBadgeVerifiedClass).toMatch(/var\(--student-success/);
    expect(studentInputClass).toMatch(/var\(--student-accent\)/);
  });
});
