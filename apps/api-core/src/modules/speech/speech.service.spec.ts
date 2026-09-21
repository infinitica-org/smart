import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectDefenseSttMode, SpeechService } from './speech.service.js';

vi.mock('../../platform/config/env.js', () => ({
  env: {
    NODE_ENV: 'development',
    SPEECH_STT_PROVIDER: 'stub',
    SPEECH_TTS_PROVIDER: 'stub',
    OPENAI_API_KEY: undefined,
    SPEECH_WHISPER_MODEL: 'whisper-1',
  },
}));

const storage = {
  getObjectBuffer: vi.fn(),
};

describe('projectDefenseSttMode', () => {
  it('returns browser when STT is stubbed', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'stub';
    env.OPENAI_API_KEY = 'sk-test';
    expect(projectDefenseSttMode()).toBe('browser');
  });

  it('returns server when Whisper is configured', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'whisper';
    env.OPENAI_API_KEY = 'sk-test';
    expect(projectDefenseSttMode()).toBe('server');
  });
});

describe('SpeechService.transcribe', () => {
  let service: SpeechService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpeechService(storage as never);
  });

  it('prefers client transcript in stub mode', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'stub';

    await expect(service.transcribe({ clientTranscript: ' I built the API ' })).resolves.toBe(
      'I built the API',
    );
  });

  it('throws when stub mode has no transcript', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'stub';

    await expect(service.transcribe({})).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('transcribes uploaded audio with Whisper when configured', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'whisper';
    env.OPENAI_API_KEY = 'sk-test';

    storage.getObjectBuffer.mockResolvedValue(Buffer.from('fake-audio'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ text: ' I owned the websocket layer ' }),
      }),
    );

    await expect(
      service.transcribe({
        audioObjectKey: 'project-defense/p1/turn.webm',
        clientTranscript: 'browser fallback',
      }),
    ).resolves.toBe('I owned the websocket layer');

    expect(storage.getObjectBuffer).toHaveBeenCalledWith('project-defense/p1/turn.webm');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer sk-test' },
      }),
    );

    vi.unstubAllGlobals();
  });

  it('requires audio when Whisper is configured but no client transcript exists', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'whisper';
    env.OPENAI_API_KEY = 'sk-test';

    await expect(service.transcribe({})).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toMatchObject({
        error: 'audio_required',
      });
      return true;
    });
  });

  it('surfaces Whisper API failures', async () => {
    const { env } = await import('../../platform/config/env.js');
    env.SPEECH_STT_PROVIDER = 'whisper';
    env.OPENAI_API_KEY = 'sk-test';

    storage.getObjectBuffer.mockResolvedValue(Buffer.from('fake-audio'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'upstream error',
      }),
    );

    await expect(
      service.transcribe({ audioObjectKey: 'project-defense/p1/turn.webm' }),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toMatchObject({
        error: 'stt_failed',
      });
      return true;
    });

    vi.unstubAllGlobals();
  });
});
