import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../common/guards/jwt-auth.guard.js';
import { PublicProfileService } from './public-profile.service.js';

const studentId = '123e4567-e89b-12d3-a456-426614174000';
const companyId = '223e4567-e89b-12d3-a456-426614174001';

const employer: RequestUser = { sub: 'employer-1', role: 'COMPANY', inst: null, companyId };

describe('PublicProfileService employer view tracking (STU-03)', () => {
  const prisma = {
    user: { findUnique: vi.fn() },
    profileView: { findFirst: vi.fn(), create: vi.fn() },
  };
  const storage = { getSignedUrl: vi.fn() };
  let service: PublicProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: studentId, profileVisible: true });
    prisma.profileView.findFirst.mockResolvedValue(null);
    prisma.profileView.create.mockResolvedValue({});
    service = new PublicProfileService(prisma as never, storage as never);
    vi.spyOn(service as never, 'build').mockResolvedValue({ fullName: 'Ada' } as never);
  });

  it('records who viewed, from which organisation and where, when an employer opens the profile', async () => {
    await service.getBySlug('ada', employer);

    expect(prisma.profileView.create).toHaveBeenCalledWith({
      data: {
        studentId,
        viewerId: 'employer-1',
        viewerRole: 'COMPANY',
        viewerOrganizationId: companyId,
        source: 'public_link',
      },
    });
  });

  it('counts one view per employer per day, not one per refresh', async () => {
    prisma.profileView.findFirst.mockResolvedValue({ id: 'existing' });

    await service.getBySlug('ada', employer);

    expect(prisma.profileView.create).not.toHaveBeenCalled();
    const where = prisma.profileView.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ studentId, viewerId: 'employer-1' });
    expect(where.createdAt.gte).toBeInstanceOf(Date);
  });

  it.each([
    ['an anonymous visitor', null],
    ['a student', { sub: 's1', role: 'STUDENT', inst: null } as RequestUser],
    ['institution staff', { sub: 'i1', role: 'INSTITUTION_ADMIN', inst: 'inst-1' } as RequestUser],
    [
      'a placement staff member',
      { sub: 'p1', role: 'PLACEMENT_STAFF', inst: 'inst-1' } as RequestUser,
    ],
  ])('does not count a view from %s', async (_label, viewer) => {
    await service.getBySlug('ada', viewer);

    expect(prisma.profileView.create).not.toHaveBeenCalled();
    expect(prisma.profileView.findFirst).not.toHaveBeenCalled();
  });

  it('still returns the profile when the counter write fails', async () => {
    prisma.profileView.create.mockRejectedValue(new Error('db down'));

    await expect(service.getBySlug('ada', employer)).resolves.toEqual({ fullName: 'Ada' });
  });

  it('does not record a view for a profile that is not public', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: studentId, profileVisible: false });

    await expect(service.getBySlug('ada', employer)).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.profileView.create).not.toHaveBeenCalled();
  });

  it('works unchanged for callers that pass no viewer', async () => {
    await expect(service.getBySlug('ada')).resolves.toEqual({ fullName: 'Ada' });
    expect(prisma.profileView.create).not.toHaveBeenCalled();
  });
});
