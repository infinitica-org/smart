import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CandidateEducationDto } from '@smart/contracts';
import {
  CandidateEducationSchema,
  CreateCandidateEducationSchema,
  UpdateCandidateEducationSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class CandidateEducationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForStudent(userId: string): Promise<CandidateEducationDto[]> {
    const records = await this.prisma.candidateEducation.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length > 0) {
      return records.map((r) => this.mapToDto(r));
    }

    // Auto-sync fallback from user.onboardingDetails if 0 records exist in DB
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.onboardingDetails) return [];

    const details = user.onboardingDetails as Record<string, unknown>;
    const rawEducations = Array.isArray(details.education) ? details.education : [];
    if (rawEducations.length === 0) return [];

    const created: CandidateEducationDto[] = [];
    for (const raw of rawEducations) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const instName = typeof item.institutionName === 'string' ? item.institutionName.trim() : '';
      if (!instName) continue;

      const newRow = await this.prisma.candidateEducation.create({
        data: {
          studentId: userId,
          institutionName: instName,
          degree: typeof item.degree === 'string' ? item.degree : null,
          fieldOfStudy: typeof item.fieldOfStudy === 'string' ? item.fieldOfStudy : null,
          startDate: typeof item.startDate === 'string' ? item.startDate : null,
          endDate: typeof item.endDate === 'string' ? item.endDate : null,
          current: Boolean(item.current),
          grade: typeof item.grade === 'string' ? item.grade : null,
        },
      });
      created.push(this.mapToDto(newRow));
    }

    return created;
  }

  async getForStudent(userId: string, id: string): Promise<CandidateEducationDto> {
    const record = await this.prisma.candidateEducation.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Education entry not found.',
        statusCode: 404,
      });
    }
    if (record.studentId !== userId) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'Access denied.',
        statusCode: 403,
      });
    }
    return this.mapToDto(record);
  }

  async create(userId: string, body: unknown): Promise<CandidateEducationDto> {
    const parsed = CreateCandidateEducationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate education payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const created = await this.prisma.candidateEducation.create({
      data: {
        studentId: userId,
        institutionName: parsed.data.institutionName,
        degree: parsed.data.degree || null,
        fieldOfStudy: parsed.data.fieldOfStudy || null,
        startDate: parsed.data.startDate || null,
        endDate: parsed.data.endDate || null,
        current: parsed.data.current ?? false,
        grade: parsed.data.grade || null,
      },
    });

    return this.mapToDto(created);
  }

  async update(userId: string, id: string, body: unknown): Promise<CandidateEducationDto> {
    await this.getForStudent(userId, id);
    const parsed = UpdateCandidateEducationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate education update payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const updated = await this.prisma.candidateEducation.update({
      where: { id },
      data: {
        ...(parsed.data.institutionName !== undefined
          ? { institutionName: parsed.data.institutionName }
          : {}),
        ...(parsed.data.degree !== undefined ? { degree: parsed.data.degree || null } : {}),
        ...(parsed.data.fieldOfStudy !== undefined
          ? { fieldOfStudy: parsed.data.fieldOfStudy || null }
          : {}),
        ...(parsed.data.startDate !== undefined
          ? { startDate: parsed.data.startDate || null }
          : {}),
        ...(parsed.data.endDate !== undefined ? { endDate: parsed.data.endDate || null } : {}),
        ...(parsed.data.current !== undefined ? { current: parsed.data.current } : {}),
        ...(parsed.data.grade !== undefined ? { grade: parsed.data.grade || null } : {}),
      },
    });

    return this.mapToDto(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getForStudent(userId, id);
    await this.prisma.candidateEducation.delete({ where: { id } });
  }

  private mapToDto(r: {
    id: string;
    studentId: string;
    institutionName: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
    grade: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CandidateEducationDto {
    return CandidateEducationSchema.parse({
      id: r.id,
      studentId: r.studentId,
      institutionName: r.institutionName,
      degree: r.degree,
      fieldOfStudy: r.fieldOfStudy,
      startDate: r.startDate,
      endDate: r.endDate,
      current: r.current,
      grade: r.grade,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    });
  }
}
