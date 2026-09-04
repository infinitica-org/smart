type ExtendedScreen = Screen & { isExtended?: boolean };

export function hasExtendedDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.screen as ExtendedScreen).isExtended === true;
}
