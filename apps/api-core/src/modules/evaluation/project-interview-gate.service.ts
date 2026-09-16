import { Inject, Injectable } from '@nestjs/common';
import { ProjectInterviewStateSchema, type ProjectInterviewState } from '@smart/contracts';
import { RedisService } from '../../platform/redis/redis.service.js';

const STATE_TTL_SECONDS = 60 * 60 * 24 * 90;

function stateKey(projectId: string): string {
  return `project:interview:state:${projectId}`;
}

@Injectable()
export class ProjectInterviewGateService {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async getState(projectId: string): Promise<ProjectInterviewState> {
    const raw = await this.redis.get(stateKey(projectId));
    if (!raw) {
      return ProjectInterviewStateSchema.parse({
        interviewRequired: false,
        interviewStatus: 'NOT_REQUIRED',
        interviewCompletedAt: null,
      });
    }
    return ProjectInterviewStateSchema.parse(JSON.parse(raw));
  }

  async markVerifyComplete(projectId: string): Promise<void> {
    await this.setState(projectId, {
      interviewRequired: true,
      interviewStatus: 'PENDING',
      interviewCompletedAt: null,
    });
  }

  async markInProgress(projectId: string): Promise<void> {
    const current = await this.getState(projectId);
    await this.setState(projectId, {
      ...current,
      interviewRequired: true,
      interviewStatus: 'IN_PROGRESS',
    });
  }

  /** Clears an in-progress attempt without marking the interview complete. */
  async markPending(projectId: string): Promise<void> {
    const current = await this.getState(projectId);
    if (current.interviewStatus === 'COMPLETED') return;
    await this.setState(projectId, {
      ...current,
      interviewRequired: true,
      interviewStatus: 'PENDING',
      interviewCompletedAt: null,
    });
  }

  async markCompleted(projectId: string): Promise<void> {
    await this.setState(projectId, {
      interviewRequired: true,
      interviewStatus: 'COMPLETED',
      interviewCompletedAt: new Date().toISOString(),
    });
  }

  private async setState(projectId: string, state: ProjectInterviewState): Promise<void> {
    const parsed = ProjectInterviewStateSchema.parse(state);
    await this.redis.set(stateKey(projectId), JSON.stringify(parsed), 'EX', STATE_TTL_SECONDS);
  }
}
