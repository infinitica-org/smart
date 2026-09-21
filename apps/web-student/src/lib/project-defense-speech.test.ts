import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countWords,
  mapRecognitionError,
  playAgentAudioUrl,
  shouldCompleteAudioUtterance,
  shouldCompleteUtterance,
  stopAgentSpeech,
  transcriptFromResults,
} from './project-defense-speech';

describe('stopAgentSpeech', () => {
  afterEach(() => {
    stopAgentSpeech();
    vi.restoreAllMocks();
  });

  it('pauses active agent audio playback', async () => {
    const pause = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      vi.fn(function MockAudio() {
        return {
          pause,
          play,
          onended: null,
          onerror: null,
          currentTime: 0,
        };
      }),
    );

    void playAgentAudioUrl('https://example.com/prompt.mp3');
    stopAgentSpeech();

    expect(pause).toHaveBeenCalledTimes(1);
  });
});

describe('transcriptFromResults', () => {
  it('joins all recognition segments', () => {
    const results = {
      length: 2,
      0: { isFinal: true, 0: { transcript: 'I built the websocket ' } },
      1: { isFinal: true, 0: { transcript: 'ingest myself.' } },
    };
    expect(transcriptFromResults(results)).toBe('I built the websocket ingest myself.');
  });
});

describe('countWords', () => {
  it('counts non-empty words', () => {
    expect(countWords('I built the websocket ingest')).toBe(5);
    expect(countWords('   ')).toBe(0);
  });
});

describe('mapRecognitionError', () => {
  it('maps permission errors to actionable copy', () => {
    expect(mapRecognitionError('not-allowed')).toContain('Microphone access');
    expect(mapRecognitionError('network')).toContain('internet');
  });

  it('returns empty string for aborted sessions', () => {
    expect(mapRecognitionError('aborted')).toBe('');
  });
});

describe('shouldCompleteUtterance', () => {
  const base = {
    transcript: 'I built the websocket ingest myself',
    speechStartedAt: 1_000,
    lastSpeechAt: 3_000,
    silenceMs: 2_000,
    minSpeechMs: 800,
    minWordCount: 2,
  };

  it('returns true after enough silence and content', () => {
    expect(shouldCompleteUtterance({ ...base, now: 5_100 })).toBe(true);
  });

  it('returns false before silence threshold', () => {
    expect(shouldCompleteUtterance({ ...base, now: 3_500 })).toBe(false);
  });

  it('returns false when transcript is too short', () => {
    expect(
      shouldCompleteUtterance({
        ...base,
        transcript: 'yes',
        now: 5_100,
      }),
    ).toBe(false);
  });

  it('returns false when speech has not started', () => {
    expect(
      shouldCompleteUtterance({
        ...base,
        speechStartedAt: null,
        lastSpeechAt: null,
        now: 5_000,
      }),
    ).toBe(false);
  });
});

describe('shouldCompleteAudioUtterance', () => {
  const base = {
    speechStartedAt: 1_000,
    lastSpeechAt: 3_000,
    silenceMs: 2_000,
    minSpeechMs: 800,
  };

  it('returns true after enough silence without needing a transcript', () => {
    expect(shouldCompleteAudioUtterance({ ...base, now: 5_100 })).toBe(true);
  });

  it('returns false before minimum speech duration', () => {
    expect(
      shouldCompleteAudioUtterance({
        ...base,
        speechStartedAt: 4_500,
        lastSpeechAt: 4_900,
        now: 5_000,
      }),
    ).toBe(false);
  });
});
