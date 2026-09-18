/** Browser Web Speech API helpers for project defense turns. */

export type BrowserSpeechRecognition = {
  lang: string;

  continuous: boolean;

  interimResults: boolean;

  maxAlternatives: number;

  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;

  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;

  onend: (() => void) | null;

  start: () => void;

  stop: () => void;

  abort: () => void;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;

  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;

  [index: number]: {
    isFinal: boolean;

    0: { transcript: string };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;

  message?: string;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

export type LiveTranscriptionSession = {
  stop: () => Promise<string>;

  abort: () => void;
};

export const DEFAULT_SILENCE_MS = 2_000;

export const DEFAULT_MIN_SPEECH_MS = 800;

export const DEFAULT_MIN_WORD_COUNT = 2;

/** Pause after TTS before opening the mic — Chrome needs time to release audio output. */

export const POST_TTS_MIC_DELAY_MS = 350;

export function getBrowserSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;

    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const NATURAL_VOICE_PATTERNS = [
  /Google US English/i,

  /Google UK English Female/i,

  /Microsoft .*Natural.* English/i,

  /Microsoft .* Online \(Natural\)/i,

  /Samantha/i,

  /Karen/i,

  /Daniel/i,

  /Moira/i,

  /Tessa/i,
];

function pickNaturalVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const pattern of NATURAL_VOICE_PATTERNS) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.toLowerCase().startsWith('en'));

    if (match) return match;
  }

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

  return english.find((v) => v.localService) ?? english[0] ?? null;
}

function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  const synth = window.speechSynthesis;

  const existing = synth.getVoices();

  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices());

    synth.onvoiceschanged = finish;

    setTimeout(finish, 300);
  });
}

function configureNaturalUtterance(
  utterance: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | null,
): void {
  if (voice) utterance.voice = voice;

  utterance.rate = 0.93;

  utterance.pitch = 1.02;

  utterance.volume = 1;
}

export function speakAgentPrompt(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  void loadSpeechVoices().then((voices) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    configureNaturalUtterance(utterance, pickNaturalVoice(voices));

    window.speechSynthesis.speak(utterance);
  });
}

/** Resolves when browser TTS finishes (or fails). */

export async function speakAgentPromptAsync(text: string): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  const voices = await loadSpeechVoices();

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    configureNaturalUtterance(utterance, pickNaturalVoice(voices));

    utterance.onend = () => resolve();

    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

let activeAgentAudio: HTMLAudioElement | null = null;

export function playAgentAudioUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAgentSpeech();
    const audio = new Audio(url);
    activeAgentAudio = audio;
    audio.onended = () => {
      if (activeAgentAudio === audio) activeAgentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAgentAudio === audio) activeAgentAudio = null;
      reject(new Error('Could not play agent audio'));
    };
    void audio.play().catch((err) => {
      if (activeAgentAudio === audio) activeAgentAudio = null;
      reject(err);
    });
  });
}

export function stopAgentSpeech(): void {
  if (activeAgentAudio) {
    activeAgentAudio.pause();
    activeAgentAudio.currentTime = 0;
    activeAgentAudio = null;
  }
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/** Combines all result segments from a recognition event. */

export function transcriptFromResults(results: SpeechRecognitionResultList): string {
  let combined = '';

  for (let i = 0; i < results.length; i++) {
    combined += results[i]?.[0]?.transcript ?? '';
  }

  return combined.trim();
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type UtteranceCompleteInput = {
  transcript: string;

  speechStartedAt: number | null;

  lastSpeechAt: number | null;

  now: number;

  silenceMs: number;

  minSpeechMs: number;

  minWordCount: number;
};

/** Pure helper — when silence + minimum content means the student finished speaking. */

export function shouldCompleteUtterance(input: UtteranceCompleteInput): boolean {
  const { transcript, speechStartedAt, lastSpeechAt, now, silenceMs, minSpeechMs, minWordCount } =
    input;

  if (!speechStartedAt || !lastSpeechAt) return false;

  if (countWords(transcript) < minWordCount) return false;

  if (now - speechStartedAt < minSpeechMs) return false;

  return now - lastSpeechAt >= silenceMs;
}

export type AudioUtteranceCompleteInput = {
  speechStartedAt: number | null;

  lastSpeechAt: number | null;

  now: number;

  silenceMs: number;

  minSpeechMs: number;
};

/** Server STT path — end the turn after enough speech and silence (no live transcript). */

export function shouldCompleteAudioUtterance(input: AudioUtteranceCompleteInput): boolean {
  const { speechStartedAt, lastSpeechAt, now, silenceMs, minSpeechMs } = input;

  if (!speechStartedAt || !lastSpeechAt) return false;

  if (now - speechStartedAt < minSpeechMs) return false;

  return now - lastSpeechAt >= silenceMs;
}

/** RMS threshold for microphone energy detection in server STT mode. */

export const AUDIO_SPEECH_RMS_THRESHOLD = 0.02;

export function supportsMicrophoneCapture(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

function recognitionLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }

  return 'en-US';
}

export function mapRecognitionError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was blocked. Allow the mic in your browser settings and reload.';

    case 'no-speech':
      return 'No speech was detected. Check your mic and speak clearly.';

    case 'audio-capture':
      return 'Could not access your microphone. Close other apps using the mic and try again.';

    case 'network':
      return 'Speech recognition needs an internet connection in Chrome.';

    case 'aborted':
      return '';

    default:
      return `Speech recognition error: ${error}`;
  }
}

/**

 * Keeps the browser mic recognizer alive for the whole answer.

 * Chrome stops recognition after pauses unless we restart on `onend`.

 *

 * Uses Web Speech API only — do not open a parallel getUserMedia stream here;

 * Chrome often fails to transcribe when both compete for the mic.

 */

export function createLiveTranscriptionSession(
  onUpdate: (text: string) => void,

  onError?: (message: string) => void,
): LiveTranscriptionSession | null {
  const Ctor = getBrowserSpeechRecognition();

  if (!Ctor) return null;

  const recognition = new Ctor();

  let active = true;

  let latest = '';

  recognition.lang = recognitionLanguage();

  recognition.continuous = true;

  recognition.interimResults = true;

  recognition.maxAlternatives = 1;

  const restartIfActive = () => {
    if (!active) return;

    try {
      recognition.start();
    } catch {
      /* duplicate start while still running */
    }
  };

  recognition.onresult = (event) => {
    latest = transcriptFromResults(event.results);

    onUpdate(latest);
  };

  recognition.onerror = (event) => {
    if (!active) return;

    if (event.error === 'no-speech' || event.error === 'aborted') {
      restartIfActive();
      return;
    }

    const message = mapRecognitionError(event.error);

    if (message) onError?.(message);

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') return;

    restartIfActive();
  };

  recognition.onend = () => {
    restartIfActive();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    abort: () => {
      active = false;

      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    },

    stop: () =>
      new Promise((resolve) => {
        active = false;

        let settled = false;

        const done = (text: string) => {
          if (settled) return;

          settled = true;

          clearTimeout(timer);

          resolve(text.trim());
        };

        const timer = setTimeout(() => done(latest), 3_000);

        recognition.onend = () => done(latest);

        recognition.onerror = () => done(latest);

        try {
          recognition.stop();
        } catch {
          done(latest);
        }
      }),
  };
}

export type ConversationCaptureOptions = {
  onTranscriptUpdate: (text: string) => void;

  onSpeechDetected?: () => void;

  onUtteranceComplete: () => void;

  onRecognitionError?: (message: string) => void;

  silenceMs?: number;

  minSpeechMs?: number;

  minWordCount?: number;

  /** server = record audio for Whisper; browser = Web Speech live transcript. */

  sttMode?: 'browser' | 'server';
};

export type ConversationCapture = {
  abort: () => void;

  finish: () => Promise<{ transcript: string; blob: Blob }>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;

  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';

  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';

  return undefined;
}

function computeAudioRms(analyser: AnalyserNode, scratch: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(scratch);

  let sum = 0;

  for (let i = 0; i < scratch.length; i++) {
    const sample = ((scratch[i] ?? 128) - 128) / 128;

    sum += sample * sample;
  }

  return Math.sqrt(sum / scratch.length);
}

/**

 * Record mic audio and detect end-of-turn via energy (no Web Speech — avoids mic conflicts).

 */

async function createAudioOnlyCapture(
  options: ConversationCaptureOptions,
): Promise<ConversationCapture | null> {
  if (!supportsMicrophoneCapture()) return null;

  const silenceMs = options.silenceMs ?? DEFAULT_SILENCE_MS;

  const minSpeechMs = options.minSpeechMs ?? DEFAULT_MIN_SPEECH_MS;

  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    options.onRecognitionError?.(
      'Microphone access was blocked. Allow the mic in your browser settings and reload.',
    );

    return null;
  }

  const mimeType = pickRecorderMimeType();

  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.start(250);

  const audioContext = new AudioContext();

  const source = audioContext.createMediaStreamSource(stream);

  const analyser = audioContext.createAnalyser();

  analyser.fftSize = 2048;

  source.connect(analyser);

  const scratch = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

  let speechStartedAt: number | null = null;

  let lastSpeechAt: number | null = null;

  let utteranceCompleted = false;

  let pollId = 0;

  let speaking = false;

  const release = () => {
    stream.getTracks().forEach((track) => track.stop());

    void audioContext.close().catch(() => undefined);
  };

  const tick = () => {
    if (utteranceCompleted) return;

    const now = Date.now();

    const rms = computeAudioRms(analyser, scratch);

    if (rms >= AUDIO_SPEECH_RMS_THRESHOLD) {
      if (!speechStartedAt) speechStartedAt = now;

      lastSpeechAt = now;

      if (!speaking) {
        speaking = true;

        options.onSpeechDetected?.();

        options.onTranscriptUpdate('Listening…');
      }
    } else {
      speaking = false;
    }

    if (
      shouldCompleteAudioUtterance({
        speechStartedAt,

        lastSpeechAt,

        now,

        silenceMs,

        minSpeechMs,
      })
    ) {
      utteranceCompleted = true;

      options.onUtteranceComplete();

      return;
    }

    pollId = window.setTimeout(tick, 100);
  };

  pollId = window.setTimeout(tick, 100);

  const finishRecording = (): Promise<Blob> =>
    new Promise((resolve) => {
      recorder.onstop = () => {
        release();

        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      };

      if (recorder.state === 'inactive') {
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));

        return;
      }

      recorder.stop();
    });

  return {
    abort: () => {
      utteranceCompleted = true;

      window.clearTimeout(pollId);

      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },

    finish: async () => {
      utteranceCompleted = true;

      window.clearTimeout(pollId);

      const blob = await finishRecording();

      return { transcript: '', blob };
    },
  };
}

/**

 * Live STT + silence detection via transcript updates.

 * Calls onUtteranceComplete when the student pauses long enough after speaking.

 */

export async function createConversationCapture(
  options: ConversationCaptureOptions,
): Promise<ConversationCapture | null> {
  if (options.sttMode === 'server') {
    return createAudioOnlyCapture(options);
  }

  if (!getBrowserSpeechRecognition()) return null;

  const silenceMs = options.silenceMs ?? DEFAULT_SILENCE_MS;

  const minSpeechMs = options.minSpeechMs ?? DEFAULT_MIN_SPEECH_MS;

  const minWordCount = options.minWordCount ?? DEFAULT_MIN_WORD_COUNT;

  let transcript = '';

  let speechStartedAt: number | null = null;

  let lastSpeechAt: number | null = null;

  let utteranceCompleted = false;

  let pollId = 0;

  const transcription = createLiveTranscriptionSession(
    (text) => {
      const trimmed = text.trim();

      if (!trimmed) return;

      const changed = trimmed !== transcript;

      transcript = trimmed;

      options.onTranscriptUpdate(trimmed);

      const now = Date.now();

      if (!speechStartedAt) speechStartedAt = now;

      if (changed) {
        lastSpeechAt = now;

        options.onSpeechDetected?.();
      }
    },

    options.onRecognitionError,
  );

  if (!transcription) return null;

  const tick = () => {
    if (utteranceCompleted) return;

    const now = Date.now();

    if (
      shouldCompleteUtterance({
        transcript,

        speechStartedAt,

        lastSpeechAt,

        now,

        silenceMs,

        minSpeechMs,

        minWordCount,
      })
    ) {
      utteranceCompleted = true;

      options.onUtteranceComplete();

      return;
    }

    pollId = window.setTimeout(tick, 200);
  };

  pollId = window.setTimeout(tick, 200);

  return {
    abort: () => {
      utteranceCompleted = true;

      window.clearTimeout(pollId);

      transcription.abort();
    },

    finish: () =>
      new Promise((resolve) => {
        utteranceCompleted = true;

        window.clearTimeout(pollId);

        void (async () => {
          const finalTranscript = await transcription.stop();

          resolve({
            transcript: finalTranscript || transcript.trim(),

            blob: new Blob([], { type: 'audio/webm' }),
          });
        })();
      }),
  };
}

/** Wait after agent TTS before starting speech recognition. */

export function waitBeforeListening(): Promise<void> {
  return delay(POST_TTS_MIC_DELAY_MS);
}
