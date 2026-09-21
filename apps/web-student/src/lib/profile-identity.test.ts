import { describe, expect, it } from 'vitest';

import {
  primaryBatchLabel,
  primaryDepartmentName,
  primaryInstitutionName,
} from './profile-identity';

describe('primaryInstitutionName', () => {
  it('prefers the current education entry', () => {
    const name = primaryInstitutionName(
      [
        { institutionName: 'Old College', current: false } as never,
        { institutionName: 'RV College of Engineering', current: true } as never,
      ],
      undefined,
    );
    expect(name).toBe('RV College of Engineering');
  });

  it('falls back to first education then account institution', () => {
    expect(
      primaryInstitutionName([{ institutionName: 'MIT', current: false } as never], undefined),
    ).toBe('MIT');
    expect(primaryInstitutionName([], { institutionName: 'Stanford University' } as never)).toBe(
      'Stanford University',
    );
  });

  it('returns null when no institution data exists', () => {
    expect(primaryInstitutionName([], undefined)).toBeNull();
  });

  it('shows school only when institution includes a board suffix', () => {
    expect(
      primaryInstitutionName(
        [{ institutionName: 'Delhi Public School · CBSE', current: true } as never],
        undefined,
      ),
    ).toBe('Delhi Public School');
  });
});

describe('primaryDepartmentName', () => {
  it('uses field of study from the current education entry', () => {
    expect(
      primaryDepartmentName([
        { fieldOfStudy: 'Mechanical Engineering', current: false } as never,
        { fieldOfStudy: 'Computer Science', current: true } as never,
      ]),
    ).toBe('Computer Science');
  });
});

describe('primaryBatchLabel', () => {
  it('formats start and end years from the primary education entry', () => {
    expect(
      primaryBatchLabel([
        {
          startDate: '2022-01-01',
          endDate: '2026-01-01',
          current: true,
        } as never,
      ]),
    ).toBe('Batch 2022 – 2026');
  });

  it('uses Present when the student is still enrolled without an end date', () => {
    expect(
      primaryBatchLabel([{ startDate: '2022-09-01', endDate: null, current: true } as never]),
    ).toBe('Batch 2022 – Present');
  });

  it('returns null when education has no batch dates', () => {
    expect(
      primaryBatchLabel([{ institutionName: 'SMART Pilot Institute', current: true } as never]),
    ).toBeNull();
  });
});
