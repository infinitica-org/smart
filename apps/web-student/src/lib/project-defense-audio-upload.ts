import { api } from './api';

export type DefenseAudioUploadResult =
  { ok: true; objectKey: string } | { ok: false; message: string };

/** Upload a defense turn recording via presigned PUT (required when sttMode=server). */
export async function uploadDefenseTurnAudio(
  projectId: string,
  blob: Blob,
): Promise<DefenseAudioUploadResult> {
  if (blob.size === 0) {
    return { ok: false, message: 'No audio was captured for this answer.' };
  }

  try {
    const upload = await api.projects.defenseAudioUploadUrl(projectId, {
      contentType: 'audio/webm',
      fileName: 'turn.webm',
    });
    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'audio/webm' },
    });
    if (!put.ok) {
      return {
        ok: false,
        message: `Audio upload failed (${put.status}). Check MinIO CORS and that storage is running.`,
      };
    }
    return { ok: true, objectKey: upload.objectKey };
  } catch {
    return {
      ok: false,
      message:
        'Could not upload your recording. If testing locally, run pnpm infra:up and re-apply MinIO CORS.',
    };
  }
}
