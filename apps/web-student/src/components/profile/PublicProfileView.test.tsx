import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionVisibilityToggles } from './SectionVisibilityToggles';
import { LoomEmbed } from './LoomEmbed';
import { saveVisibilitySettings, DEFAULT_VISIBILITY } from '../../lib/public-profile-visibility';

describe('CN-T07 Public Profile Components', () => {
  beforeEach(() => {
    localStorage.clear();
    saveVisibilitySettings(DEFAULT_VISIBILITY);
  });

  describe('SectionVisibilityToggles', () => {
    it('renders all four section visibility switches', () => {
      render(<SectionVisibilityToggles />);
      expect(screen.getByRole('switch', { name: /Verified Skills/i })).toBeTruthy();
      expect(screen.getByRole('switch', { name: /Verified Certificates/i })).toBeTruthy();
      expect(screen.getByRole('switch', { name: /Verified Projects/i })).toBeTruthy();
      expect(screen.getByRole('switch', { name: /Cognitive Profile/i })).toBeTruthy();
    });

    it('toggles visibility state when clicked', () => {
      render(<SectionVisibilityToggles />);
      const skillsSwitch = screen.getByRole('switch', { name: /Verified Skills/i });

      expect(skillsSwitch.getAttribute('aria-checked')).toBe('true');
      fireEvent.click(skillsSwitch);
      expect(skillsSwitch.getAttribute('aria-checked')).toBe('false');
    });

    it('copies share link when Copy Share Link is clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(<SectionVisibilityToggles />);
      const copyBtn = screen.getByRole('button', { name: /Copy Share Link/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/p/satheshwaran'));
    });
  });

  describe('LoomEmbed', () => {
    it('renders iframe when valid Loom URL is provided', () => {
      const { container } = render(
        <LoomEmbed loomUrl="https://www.loom.com/share/1234567890abcdef" title="Demo Video" />,
      );
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe?.getAttribute('src')).toBe('https://www.loom.com/embed/1234567890abcdef');
    });

    it('renders fallback when no URL is provided', () => {
      render(<LoomEmbed />);
      expect(screen.getByText(/No project video submitted/i)).toBeTruthy();
    });

    it('renders external link fallback when non-embeddable URL is provided', () => {
      render(<LoomEmbed loomUrl="https://custom-video-host.com/video/1" title="External Demo" />);
      expect(screen.getByText(/Watch External Video/i)).toBeTruthy();
    });
  });
});
