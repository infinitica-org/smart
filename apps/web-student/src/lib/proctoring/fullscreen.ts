type KeyboardLockNavigator = Navigator & {
  keyboard?: {
    lock: (keyCodes?: string[]) => Promise<void>;
    unlock: () => void;
  };
};

function keyboardApi(): KeyboardLockNavigator['keyboard'] | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as KeyboardLockNavigator).keyboard;
}

/** Chromium Fullscreen Keyboard Lock — hold Esc to exit; F-keys / Alt reach the page. */
export async function lockAssessmentKeyboard(): Promise<boolean> {
  const keyboard = keyboardApi();
  if (!keyboard?.lock || typeof document === 'undefined' || !document.fullscreenElement) {
    return false;
  }
  try {
    await keyboard.lock();
    return true;
  } catch {
    return false;
  }
}

export function unlockAssessmentKeyboard(): void {
  try {
    keyboardApi()?.unlock();
  } catch {
    // Unlock is best-effort when leaving the attempt.
  }
}

/** Hide questions whenever fullscreen is lost. Session lock uses a separate terminate UI. */
export function hidePlayerForFullscreen(blocked: boolean): boolean {
  return blocked;
}

export async function enterAssessmentFullscreen(target?: Element | null): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const node = target ?? document.documentElement;
  try {
    if (!document.fullscreenElement) {
      try {
        await node.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        await node.requestFullscreen();
      }
    }
    if (!document.fullscreenElement) return false;
    await lockAssessmentKeyboard();
    return true;
  } catch {
    return Boolean(document.fullscreenElement);
  }
}
