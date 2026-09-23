import {
  API_PREFIX,
  ReplaceProjectRequestSchema,
  ReplaceProjectResponseSchema,
  type ReplaceProjectResponse,
} from '@smart/contracts';
import { apiClient } from './api';

export async function replaceStudentProject(
  projectId: string,
  body: unknown,
): Promise<ReplaceProjectResponse> {
  const payload = ReplaceProjectRequestSchema.parse(body);
  return apiClient.post(`${API_PREFIX}/projects/${projectId}/replace`, payload, {
    schema: ReplaceProjectResponseSchema,
  });
}
