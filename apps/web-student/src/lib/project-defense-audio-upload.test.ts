import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadDefenseTurnAudio } from './project-defense-audio-upload';

vi.mock('./api', () => ({
  api: {
    projects: {
      defenseAudioUploadUrl: vi.fn(),
    },
  },
}));

const { api } = await import('./api');

describe('uploadDefenseTurnAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty blobs', async () => {
    const result = await uploadDefenseTurnAudio('project-id', new Blob([]));
    expect(result).toEqual({ ok: false, message: 'No audio was captured for this answer.' });
  });

  it('uploads via presigned PUT and returns object key', async () => {
    vi.mocked(api.projects.defenseAudioUploadUrl).mockResolvedValue({
      uploadUrl: 'http://127.0.0.1:9000/smart/project-defense/p1/turn.webm?sig=1',
      objectKey: 'project-defense/p1/turn.webm',
      expiresInSeconds: 900,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const result = await uploadDefenseTurnAudio(
      'project-id',
      new Blob(['audio'], { type: 'audio/webm' }),
    );

    expect(result).toEqual({ ok: true, objectKey: 'project-defense/p1/turn.webm' });
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:9000/smart/project-defense/p1/turn.webm?sig=1',
      expect.objectContaining({ method: 'PUT' }),
    );
    vi.unstubAllGlobals();
  });

  it('surfaces upload HTTP failures', async () => {
    vi.mocked(api.projects.defenseAudioUploadUrl).mockResolvedValue({
      uploadUrl: 'http://127.0.0.1:9000/smart/project-defense/p1/turn.webm?sig=1',
      objectKey: 'project-defense/p1/turn.webm',
      expiresInSeconds: 900,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const result = await uploadDefenseTurnAudio(
      'project-id',
      new Blob(['audio'], { type: 'audio/webm' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('403');
    }
    vi.unstubAllGlobals();
  });
});
