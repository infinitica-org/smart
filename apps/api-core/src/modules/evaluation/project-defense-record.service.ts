import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ProjectDefensePersistedRecordSchema,
  type DefenseTurn,
  type ProjectDefenseGrade,
  type ProjectDefensePersistedRecord,
} from '@smart/contracts';
import { StorageService } from '../../platform/storage/storage.service.js';

export function defenseRecordObjectKey(projectId: string): string {
  return `project-defense/${projectId}/record.json`;
}

@Injectable()
export class ProjectDefenseRecordService {
  private readonly logger = new Logger(ProjectDefenseRecordService.name);

  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  async load(projectId: string): Promise<ProjectDefensePersistedRecord | null> {
    try {
      const buffer = await this.storage.getObjectBuffer(defenseRecordObjectKey(projectId));
      const parsed = ProjectDefensePersistedRecordSchema.safeParse(
        JSON.parse(buffer.toString('utf8')),
      );
      if (!parsed.success) {
        this.logger.warn(`Invalid defense record for project ${projectId}`);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  async saveCompleted(params: {
    projectId: string;
    sessionId: string;
    studentId: string;
    consentAt: string | null;
    proctoringSessionId: string;
    transcript: DefenseTurn[];
    grade: ProjectDefenseGrade;
  }): Promise<ProjectDefensePersistedRecord> {
    const existing = await this.load(params.projectId);
    const record = ProjectDefensePersistedRecordSchema.parse({
      projectId: params.projectId,
      sessionId: params.sessionId,
      studentId: params.studentId,
      consentAt: params.consentAt ?? existing?.consentAt ?? null,
      proctoringSessionId: params.proctoringSessionId,
      transcript: params.transcript,
      grade: params.grade,
      completedAt: new Date().toISOString(),
      appeals: existing?.appeals ?? [],
      reviewResolutions: existing?.reviewResolutions ?? [],
    });
    await this.write(record);
    return record;
  }

  async appendAppeal(
    projectId: string,
    reason: string,
  ): Promise<{ record: ProjectDefensePersistedRecord; appealId: string }> {
    const existing = await this.load(projectId);
    if (!existing) {
      throw new Error('defense_record_missing');
    }
    const appealId = randomUUID();
    const record = ProjectDefensePersistedRecordSchema.parse({
      ...existing,
      appeals: [
        ...existing.appeals,
        { appealId, reason, createdAt: new Date().toISOString(), status: 'OPEN' as const },
      ],
    });
    await this.write(record);
    return { record, appealId };
  }

  async appendResolution(
    projectId: string,
    entry: ProjectDefensePersistedRecord['reviewResolutions'][number],
  ): Promise<ProjectDefensePersistedRecord> {
    const existing = await this.load(projectId);
    if (!existing) {
      throw new Error('defense_record_missing');
    }
    const appeals = existing.appeals.map((row) =>
      row.status === 'OPEN' ? { ...row, status: 'RESOLVED' as const } : row,
    );
    const record = ProjectDefensePersistedRecordSchema.parse({
      ...existing,
      appeals,
      reviewResolutions: [...existing.reviewResolutions, entry],
    });
    await this.write(record);
    return record;
  }

  private async write(record: ProjectDefensePersistedRecord): Promise<void> {
    await this.storage.putObjectBuffer({
      objectKey: defenseRecordObjectKey(record.projectId),
      buffer: Buffer.from(JSON.stringify(record), 'utf8'),
      contentType: 'application/json',
    });
  }
}
