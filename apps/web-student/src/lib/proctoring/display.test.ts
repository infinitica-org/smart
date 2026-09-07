import { describe, expect, it } from 'vitest';
import { hasExtendedDisplay } from './display';

describe('hasExtendedDisplay', () => {
  it('is true when Chromium reports screen.isExtended', () => {
    Object.defineProperty(window, 'screen', {
      value: { isExtended: true },
      configurable: true,
    });
    expect(hasExtendedDisplay()).toBe(true);
    Object.defineProperty(window, 'screen', {
      value: { isExtended: false },
      configurable: true,
    });
    expect(hasExtendedDisplay()).toBe(false);
  });

  it('is false when isExtended is missing', () => {
    Object.defineProperty(window, 'screen', {
      value: {},
      configurable: true,
    });
    expect(hasExtendedDisplay()).toBe(false);
  });
});
