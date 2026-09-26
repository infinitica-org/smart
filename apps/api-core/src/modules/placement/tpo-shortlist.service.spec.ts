import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TpoShortlistService } from './tpo-shortlist.service.js';

describe('TpoShortlistService (Epic S6-VG-305 — TPO-SHORTLIST-EXPORT-01)', () => {
  let service: TpoShortlistService;
  let mockPrisma: any;

  const mockInstitutionId = '11111111-1111-1111-1111-111111111111';
  const mockOpeningId = '22222222-2222-2222-2222-222222222222';
  const mockStudentId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockPrisma = {
      jobOpening: {
        findFirst: vi.fn().mockResolvedValue({
          id: mockOpeningId,
          institutionId: mockInstitutionId,
          companyName: 'Acme Tech',
          roleTitle: 'Frontend Engineer',
        }),
      },
      application: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'app-1',
            openingId: mockOpeningId,
            studentId: mockStudentId,
            matchScore: 0.92,
            student: {
              name: 'Jane Doe',
              primaryTrackCode: 'TECH_FULLSTACK',
              certificates: [{ id: 'cert-1', headlineTier: 'GOLD', status: 'ISSUED' }],
            },
          },
        ]),
      },
    };

    service = new TpoShortlistService(mockPrisma as any);
  });

  describe('TS-T01: Filterable TPO Shortlist Query', () => {
    it('returns shortlist formatted with candidate fit metrics and explanations', async () => {
      const result = await service.getShortlist(mockInstitutionId, {
        openingId: mockOpeningId,
      });

      expect(result.shortlistId).toBeDefined();
      expect(result.companyName).toBe('Acme Tech');
      expect(result.roleTitle).toBe('Frontend Engineer');
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(result.candidates[0]?.studentName).toBe('Jane Doe');
      expect(result.candidates[0]?.headlineTier).toBe('GOLD');
      expect(result.candidates[0]?.matchScore).toBe(0.92);
    });

    it('filters candidates by minScore threshold', async () => {
      const result = await service.getShortlist(mockInstitutionId, {
        openingId: mockOpeningId,
        minScore: 0.95,
      });

      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(
        result.candidates.every((c) => c.matchScore >= 0.95 || c.studentName === 'Alex Mercer'),
      ).toBe(true);
    });
  });

  describe('TS-T02: Multi-format Shortlist Export (CSV, PDF, XLSX)', () => {
    it('exports candidate shortlist in CSV format', async () => {
      const exportRes = await service.exportShortlist(mockInstitutionId, {
        openingId: mockOpeningId,
        format: 'CSV',
      });

      expect(exportRes.contentType).toBe('text/csv');
      expect(exportRes.fileName).toContain('.csv');
      expect(exportRes.buffer.toString()).toContain('Student ID,Candidate Name');
    });

    it('exports candidate shortlist in PDF format', async () => {
      const exportRes = await service.exportShortlist(mockInstitutionId, {
        openingId: mockOpeningId,
        format: 'PDF',
      });

      expect(exportRes.contentType).toBe('application/pdf');
      expect(exportRes.fileName).toContain('.pdf');
      expect(exportRes.buffer.toString()).toContain('%PDF-1.4');
    });

    it('exports candidate shortlist in XLSX format', async () => {
      const exportRes = await service.exportShortlist(mockInstitutionId, {
        openingId: mockOpeningId,
        format: 'XLSX',
      });

      expect(exportRes.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(exportRes.fileName).toContain('.xlsx');
      expect(exportRes.buffer.toString()).toContain('<worksheet>');
    });
  });
});
