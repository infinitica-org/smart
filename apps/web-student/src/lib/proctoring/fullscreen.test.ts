import { describe, expect, it, vi } from 'vitest';
import {
  enterAssessmentFullscreen,
  hidePlayerForFullscreen,
  lockAssessmentKeyboard,
  unlockAssessmentKeyboard,
} from './fullscreen';

describe('proctoring fullscreen helpers', () => {
  it('hides the player whenever fullscreen is lost', () => {
    expect(hidePlayerForFullscreen(true)).toBe(true);
    expect(hidePlayerForFullscreen(false)).toBe(false);
  });

  it('locks the Chromium keyboard after fullscreen is already active', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', { fullscreenElement: {}, documentElement: {} });
    vi.stubGlobal('navigator', { keyboard: { lock, unlock: vi.fn() } });
    await expect(enterAssessmentFullscreen()).resolves.toBe(true);
    expect(lock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('does not lock the keyboard when the page is not fullscreen', async () => {
    const lock = vi.fn();
    vi.stubGlobal('document', { fullscreenElement: null });
    vi.stubGlobal('navigator', { keyboard: { lock, unlock: vi.fn() } });
    await expect(lockAssessmentKeyboard()).resolves.toBe(false);
    expect(lock).not.toHaveBeenCalled();
    unlockAssessmentKeyboard();
    vi.unstubAllGlobals();
  });

  it('returns false when requestFullscreen is not available', async () => {
    vi.stubGlobal('document', {
      fullscreenElement: null,
      documentElement: {},
    });
    await expect(enterAssessmentFullscreen()).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
