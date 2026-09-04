import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_VISIBILITY,
  getVisibilitySettings,
  saveVisibilitySettings,
  parseLoomEmbedUrl,
  VISIBILITY_STORAGE_KEY,
  subscribeVisibilitySettings,
} from './public-profile-visibility';

describe('public-profile-visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns default visibility settings when storage is empty', () => {
    expect(getVisibilitySettings()).toEqual(DEFAULT_VISIBILITY);
  });

  it('saves and reads visibility settings from localStorage', () => {
    const custom = {
      showSkills: true,
      showCertificates: false,
      showProjects: true,
      showCognitive: false,
    };
    saveVisibilitySettings(custom);
    expect(getVisibilitySettings()).toEqual(custom);
    expect(localStorage.getItem(VISIBILITY_STORAGE_KEY)).toContain('"showCertificates":false');
  });

  it('triggers listener callbacks when visibility changes', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeVisibilitySettings(callback);

    const updated = {
      showSkills: false,
      showCertificates: true,
      showProjects: false,
      showCognitive: true,
    };
    saveVisibilitySettings(updated);

    expect(callback).toHaveBeenCalledWith(updated);
    unsubscribe();
  });

  it('parses valid Loom share URLs into embed URLs', () => {
    const shareUrl = 'https://www.loom.com/share/abc123def456';
    expect(parseLoomEmbedUrl(shareUrl)).toBe('https://www.loom.com/embed/abc123def456');
  });

  it('parses valid Loom embed URLs directly', () => {
    const embedUrl = 'https://www.loom.com/embed/xyz789';
    expect(parseLoomEmbedUrl(embedUrl)).toBe('https://www.loom.com/embed/xyz789');
  });

  it('returns null for invalid or non-Loom URLs', () => {
    expect(parseLoomEmbedUrl('')).toBeNull();
    expect(parseLoomEmbedUrl(undefined)).toBeNull();
    expect(parseLoomEmbedUrl('https://youtube.com/watch?v=123')).toBeNull();
  });
});
