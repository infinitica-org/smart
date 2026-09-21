import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { env } from '../../platform/config/env.js';
import { StorageService } from '../../platform/storage/storage.service.js';

export type ProjectDefenseSttMode = 'browser' | 'server';

/** Whether the client should record audio and let the API transcribe turns. */
export function projectDefenseSttMode(): ProjectDefenseSttMode {
  if (env.SPEECH_STT_PROVIDER === 'stub') return 'browser';
  if (env.SPEECH_STT_PROVIDER === 'whisper' && env.OPENAI_API_KEY?.trim()) return 'server';
  return 'browser';
}

type WhisperTranscriptionResponse = {
  text?: string;
};

/**
 * Batch speech I/O for project defense turns.
 * STT: browser Web Speech when SPEECH_STT_PROVIDER=stub; optional OpenAI Whisper when configured.
 * Future: self-hosted faster-whisper sidecar (SPEECH_STT_PROVIDER=local) for cert-grade server STT.
 * TTS: returns null — the web client uses speechSynthesis.
 */
@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  async transcribe(params: {
    audioObjectKey?: string;
    clientTranscript?: string;
  }): Promise<string> {
    const audioKey = params.audioObjectKey;
    if (audioKey && this.shouldUseServerStt(audioKey)) {
      return this.transcribeWithWhisper(audioKey);
    }

    if (params.clientTranscript?.trim()) {
      return params.clientTranscript.trim();
    }

    if (env.SPEECH_STT_PROVIDER === 'stub') {
      throw new ServiceUnavailableException({
        error: 'stt_unavailable',
        message:
          'Server speech-to-text is not configured. Submit a client transcript from the browser.',
        statusCode: 503,
      });
    }

    throw new ServiceUnavailableException({
      error: 'audio_required',
      message: 'An audio recording is required for server speech-to-text.',
      statusCode: 503,
    });
  }

  /** Returns a signed GET URL for synthesized speech, or null when TTS is stubbed. */
  async synthesize(_text: string): Promise<string | null> {
    if (env.SPEECH_TTS_PROVIDER === 'stub') {
      return null;
    }
    return null;
  }

  private shouldUseServerStt(audioObjectKey?: string): boolean {
    return (
      env.SPEECH_STT_PROVIDER === 'whisper' &&
      Boolean(env.OPENAI_API_KEY?.trim()) &&
      Boolean(audioObjectKey)
    );
  }

  private async transcribeWithWhisper(audioObjectKey: string): Promise<string> {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        error: 'stt_unconfigured',
        message: 'Whisper speech-to-text requires OPENAI_API_KEY.',
        statusCode: 503,
      });
    }

    const buffer = await this.storage.getObjectBuffer(audioObjectKey);
    const fileName = audioObjectKey.split('/').pop() ?? 'turn.webm';
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: 'audio/webm' }), fileName);
    form.append('model', env.SPEECH_WHISPER_MODEL);
    form.append('language', 'en');
    form.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `Whisper transcription failed (${response.status}) for ${audioObjectKey}: ${detail.slice(0, 500)}`,
      );
      throw new ServiceUnavailableException({
        error: 'stt_failed',
        message: 'Could not transcribe your answer. Try speaking again.',
        statusCode: 503,
      });
    }

    const payload = (await response.json()) as WhisperTranscriptionResponse;
    const text = payload.text?.trim();
    if (!text) {
      throw new ServiceUnavailableException({
        error: 'stt_empty',
        message: 'No speech was detected in the recording. Try again and speak clearly.',
        statusCode: 503,
      });
    }

    return text;
  }
}
