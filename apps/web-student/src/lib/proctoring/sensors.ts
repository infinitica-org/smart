import type { ProctoringViolationKind } from '@smart/contracts';

const DEVTOOLS_KEYS = new Set(['i', 'j', 'c', 'k']);

function isFunctionKey(key: string, code: string): boolean {
  if (/^F([1-9]|1[0-2]|1[3-9]|2[0-4])$/u.test(key)) return true;
  return /^F([1-9]|1[0-2]|1[3-9]|2[0-4])$/u.test(code);
}

export function classifyProctorKey(event: KeyboardEvent): ProctoringViolationKind | null {
  const key = event.key;
  const lower = key.toLowerCase();
  const code = event.code;
  if (
    key === 'Meta' ||
    key === 'OS' ||
    code.startsWith('Meta') ||
    code === 'OSLeft' ||
    code === 'OSRight'
  ) {
    return 'OS_KEY';
  }
  if (key === 'Escape' || code === 'Escape') return 'OS_KEY';
  if (code === 'ContextMenu' || key === 'ContextMenu') return 'OS_KEY';
  if (event.altKey && (key === 'Tab' || key === 'F4' || key === 'Escape')) return 'OS_KEY';
  if (key === 'F12' || code === 'F12') return 'DEVTOOLS_OPEN';
  if (isFunctionKey(key, code)) return 'OS_KEY';
  if (event.ctrlKey && event.shiftKey && DEVTOOLS_KEYS.has(lower)) return 'DEVTOOLS_OPEN';
  if (event.ctrlKey && lower === 'u') return 'DEVTOOLS_OPEN';
  if (code === 'PrintScreen' || key === 'PrintScreen') {
    return 'PRINT_SCREEN';
  }
  if (event.metaKey && event.shiftKey && lower === 's') return 'PRINT_SCREEN';
  if (event.altKey && (code === 'PrintScreen' || key === 'PrintScreen')) {
    return 'PRINT_SCREEN';
  }
  if (event.ctrlKey && lower === 'c') return 'COPY_ATTEMPT';
  if (event.ctrlKey && lower === 'x') return 'CUT_ATTEMPT';
  if (event.ctrlKey && lower === 'v') return 'PASTE_DETECTED';
  if (event.ctrlKey && (lower === 's' || lower === 'p' || lower === 'o')) return 'OS_KEY';
  return null;
}

/** Trackpad pinch, 2-finger history swipe, or 2+ contact points. Vertical mouse-wheel scroll is not a gesture. */
export function classifyTrackpadGesture(event: {
  type: string;
  ctrlKey?: boolean;
  deltaX?: number;
  deltaY?: number;
  touches?: number;
}): ProctoringViolationKind | null {
  if (
    event.type === 'gesturestart' ||
    event.type === 'gesturechange' ||
    event.type === 'gestureend'
  ) {
    return 'OS_KEY';
  }
  if ((event.touches ?? 0) >= 2) return 'OS_KEY';
  if (event.type === 'wheel') {
    if (event.ctrlKey) return 'OS_KEY';
    const dx = Math.abs(event.deltaX ?? 0);
    const dy = Math.abs(event.deltaY ?? 0);
    if (dx > 12 && dx >= dy) return 'OS_KEY';
  }
  return null;
}

/** DevTools docked to the side/bottom grows outer−inner gap; normal tab chrome is stable at attach. */
export function devtoolsDockOpenedSinceBaseline(
  baseline: { widthGap: number; heightGap: number },
  current: { widthGap: number; heightGap: number },
  deltaThreshold = 120,
): boolean {
  const deltaW = current.widthGap - baseline.widthGap;
  const deltaH = current.heightGap - baseline.heightGap;
  return deltaW > deltaThreshold || deltaH > deltaThreshold;
}

export function readWindowChromeGap(): { widthGap: number; heightGap: number } {
  return {
    widthGap: window.outerWidth - window.innerWidth,
    heightGap: window.outerHeight - window.innerHeight,
  };
}

export async function scrambleScreenshotClipboard(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
  try {
    await navigator.clipboard.writeText('');
  } catch {
    // Clipboard permission is optional; PrintScreen still reports.
  }
}

export function attachProctorSensors(
  report: (kind: ProctoringViolationKind) => void,
  options?: { listenFullscreen?: boolean },
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const kind = classifyProctorKey(event);
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    if (kind === 'PRINT_SCREEN') void scrambleScreenshotClipboard();
    report(kind);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const kind = classifyProctorKey(event);
    if (kind !== 'PRINT_SCREEN') return;
    event.preventDefault();
    event.stopPropagation();
    void scrambleScreenshotClipboard();
    report(kind);
  };
  const onContext = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    report('RIGHT_CLICK');
  };
  const onCopy = (event: Event) => {
    event.preventDefault();
    report('COPY_ATTEMPT');
  };
  const onCut = (event: Event) => {
    event.preventDefault();
    report('CUT_ATTEMPT');
  };
  const onPaste = (event: Event) => {
    event.preventDefault();
    report('PASTE_DETECTED');
  };
  const onSelect = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
  };
  const onDrag = (event: Event) => {
    event.preventDefault();
    report('COPY_ATTEMPT');
  };
  const onVis = () => {
    if (document.hidden) report('TAB_BLUR');
  };
  const onBlur = () => {
    if (document.hidden || !document.hasFocus()) report('TAB_BLUR');
  };
  const onFs = () => {
    if (!document.fullscreenElement) report('FULLSCREEN_EXIT');
  };
  const onOffline = () => report('NETWORK_LOSS');
  const onWheel = (event: WheelEvent) => {
    const kind = classifyTrackpadGesture({
      type: 'wheel',
      ctrlKey: event.ctrlKey,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    });
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    report(kind);
  };
  const onTouch = (event: TouchEvent) => {
    const kind = classifyTrackpadGesture({ type: event.type, touches: event.touches.length });
    if (!kind) return;
    event.preventDefault();
    event.stopPropagation();
    report(kind);
  };
  const onGesture = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    report('OS_KEY');
  };
  const activePointers = new Set<number>();
  const onPointerDown = (event: PointerEvent) => {
    activePointers.add(event.pointerId);
    if (activePointers.size < 2) return;
    event.preventDefault();
    report('OS_KEY');
  };
  const onPointerUp = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
  };
  const onPopState = () => {
    history.pushState(null, '', location.href);
    report('TAB_BLUR');
  };

  const html = document.documentElement;
  const previousOverscroll = html.style.overscrollBehavior;
  html.style.overscrollBehavior = 'none';
  history.pushState(null, '', location.href);

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('contextmenu', onContext, true);
  document.addEventListener('copy', onCopy, true);
  document.addEventListener('cut', onCut, true);
  document.addEventListener('paste', onPaste, true);
  document.addEventListener('selectstart', onSelect, true);
  document.addEventListener('dragstart', onDrag, true);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('blur', onBlur);
  if (options?.listenFullscreen !== false) {
    document.addEventListener('fullscreenchange', onFs);
  }
  document.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('touchstart', onTouch, { capture: true, passive: false });
  document.addEventListener('touchmove', onTouch, { capture: true, passive: false });
  document.addEventListener('gesturestart', onGesture, true);
  document.addEventListener('gesturechange', onGesture, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
  window.addEventListener('offline', onOffline);
  window.addEventListener('popstate', onPopState);

  if ('webdriver' in navigator && navigator.webdriver) {
    report('AUTOMATION_DETECTED');
  }

  const chromeBaseline = readWindowChromeGap();
  let devtoolsDockSuspicious = false;
  let skipDevtoolsProbe = true;
  const devtoolsTick = window.setInterval(() => {
    if (skipDevtoolsProbe) {
      skipDevtoolsProbe = false;
      return;
    }
    const suspicious = devtoolsDockOpenedSinceBaseline(chromeBaseline, readWindowChromeGap());
    if (suspicious && !devtoolsDockSuspicious) {
      devtoolsDockSuspicious = true;
      report('DEVTOOLS_OPEN');
    } else if (!suspicious) {
      devtoolsDockSuspicious = false;
    }
  }, 2000);

  return () => {
    window.clearInterval(devtoolsTick);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    document.removeEventListener('contextmenu', onContext, true);
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('cut', onCut, true);
    document.removeEventListener('paste', onPaste, true);
    document.removeEventListener('selectstart', onSelect, true);
    document.removeEventListener('dragstart', onDrag, true);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('wheel', onWheel, true);
    document.removeEventListener('touchstart', onTouch, true);
    document.removeEventListener('touchmove', onTouch, true);
    document.removeEventListener('gesturestart', onGesture, true);
    document.removeEventListener('gesturechange', onGesture, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('popstate', onPopState);
    html.style.overscrollBehavior = previousOverscroll;
  };
}
