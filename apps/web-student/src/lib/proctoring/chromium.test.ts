import { describe, expect, it } from 'vitest';
import { isGoogleChrome } from './chromium';

describe('isGoogleChrome', () => {
  it('accepts Client Hints that name Google Chrome', () => {
    expect(
      isGoogleChrome('Mozilla/5.0 Safari/605.1.15', [
        { brand: 'Chromium' },
        { brand: 'Google Chrome' },
      ]),
    ).toBe(true);
  });

  it('rejects Edge and Brave even when Chromium is in the brand list', () => {
    expect(
      isGoogleChrome('Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0', [
        { brand: 'Chromium' },
        { brand: 'Microsoft Edge' },
      ]),
    ).toBe(false);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        [{ brand: 'Chromium' }, { brand: 'Brave' }],
      ),
    ).toBe(false);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        undefined,
        { brave: true },
      ),
    ).toBe(false);
  });

  it('accepts a desktop Chrome UA and rejects Edge, Firefox, Safari, and iOS Chrome', () => {
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      ),
    ).toBe(true);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
      ),
    ).toBe(false);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
      ),
    ).toBe(false);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(
      isGoogleChrome(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
  });
});
