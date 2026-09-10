import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CandidateLanguageDto } from '@smart/contracts';
import {
  CandidateLanguageSchema,
  CreateCandidateLanguageSchema,
  UpdateCandidateLanguageSchema,
} from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

@Injectable()
export class CandidateLanguagesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForStudent(userId: string): Promise<CandidateLanguageDto[]> {
    const records = await this.prisma.candidateLanguage.findMany({
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
    const rawSkills = Array.isArray(details.skills) ? details.skills : [];
    const rawLanguages = rawSkills.filter(
      (s) => s && typeof s === 'object' && (s as Record<string, unknown>).type === 'language',
    );
    if (rawLanguages.length === 0) return [];

    const created: CandidateLanguageDto[] = [];
    for (const raw of rawLanguages) {
      const item = raw as Record<string, unknown>;
      const langName = typeof item.name === 'string' ? item.name.trim() : '';
      const prof =
        typeof item.proficiency === 'string' ? item.proficiency.trim() : 'Professional Working';
      if (!langName) continue;

      const newRow = await this.prisma.candidateLanguage.create({
        data: {
          studentId: userId,
          language: langName,
          proficiency: prof,
        },
      });
      created.push(this.mapToDto(newRow));
    }

    return created;
  }

  async getForStudent(userId: string, id: string): Promise<CandidateLanguageDto> {
    const record = await this.prisma.candidateLanguage.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({
        error: 'not_found',
        message: 'Language entry not found.',
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

  async create(userId: string, body: unknown): Promise<CandidateLanguageDto> {
    const parsed = CreateCandidateLanguageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate language payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const created = await this.prisma.candidateLanguage.create({
      data: {
        studentId: userId,
        language: parsed.data.language,
        proficiency: parsed.data.proficiency,
      },
    });

    return this.mapToDto(created);
  }

  async update(userId: string, id: string, body: unknown): Promise<CandidateLanguageDto> {
    await this.getForStudent(userId, id);
    const parsed = UpdateCandidateLanguageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'validation_error',
        message: 'Invalid candidate language update payload.',
        statusCode: 400,
        details: parsed.error.flatten(),
      });
    }

    const updated = await this.prisma.candidateLanguage.update({
      where: { id },
      data: {
        ...(parsed.data.language !== undefined ? { language: parsed.data.language } : {}),
        ...(parsed.data.proficiency !== undefined ? { proficiency: parsed.data.proficiency } : {}),
      },
    });

    return this.mapToDto(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getForStudent(userId, id);
    await this.prisma.candidateLanguage.delete({ where: { id } });
  }

  private mapToDto(r: {
    id: string;
    studentId: string;
    language: string;
    proficiency: string;
    createdAt: Date;
    updatedAt: Date;
  }): CandidateLanguageDto {
    return CandidateLanguageSchema.parse({
      id: r.id,
      studentId: r.studentId,
      language: r.language,
      proficiency: r.proficiency,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    });
  }
}
