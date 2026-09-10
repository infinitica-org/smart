export type UserAgentBrand = { brand: string };

function navigatorBrands(): readonly UserAgentBrand[] | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { userAgentData?: { brands?: readonly UserAgentBrand[] } })
    .userAgentData?.brands;
}

function navigatorLooksBrave(): boolean {
  return typeof navigator !== 'undefined' && 'brave' in navigator;
}

/** Google Chrome on desktop only. Edge, Brave, Opera, Safari, Firefox, and iOS are rejected. */
export function isGoogleChrome(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  brands?: readonly UserAgentBrand[],
  opts?: { brave?: boolean },
): boolean {
  if (opts?.brave ?? navigatorLooksBrave()) return false;
  const hintBrands = brands ?? navigatorBrands();
  if (hintBrands && hintBrands.length > 0) {
    const names = hintBrands.map((row) => row.brand.toLowerCase());
    if (names.some((name) => /edge|brave|opera|samsung|vivaldi/.test(name))) return false;
    return names.some((name) => name === 'google chrome');
  }
  if (/iphone|ipad|ipod|fxios|crios/i.test(userAgent)) return false;
  if (/edg\/|opr\/|firefox\//i.test(userAgent)) return false;
  return /chrome\//i.test(userAgent);
}
