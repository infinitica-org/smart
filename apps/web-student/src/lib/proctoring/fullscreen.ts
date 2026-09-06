type KeyboardLockNavigator = Navigator & {
  keyboard?: {
    lock: (keyCodes?: string[]) => Promise<void>;
    unlock: () => void;
  };
};

/** Chrome re-shows “Hold Esc to exit” on every lock() — call once per fullscreen stay. */
let keyboardLockHeld = false;

function keyboardApi(): KeyboardLockNavigator['keyboard'] | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as KeyboardLockNavigator).keyboard;
}

/** Chromium Fullscreen Keyboard Lock — hold Esc to exit; F-keys / Alt reach the page. */
export async function lockAssessmentKeyboard(): Promise<boolean> {
  const keyboard = keyboardApi();
  if (!keyboard?.lock || typeof document === 'undefined') {
    return false;
  }
  if (keyboardLockHeld && document.fullscreenElement) return true;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!document.fullscreenElement) return false;
    try {
      await keyboard.lock();
      keyboardLockHeld = true;
      return true;
    } catch {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }
  return false;
}

export function unlockAssessmentKeyboard(): void {
  keyboardLockHeld = false;
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
