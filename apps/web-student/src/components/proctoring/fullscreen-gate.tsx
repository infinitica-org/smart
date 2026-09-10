'use client';

import { Alert, Button } from '@smart/ui';

export function FullscreenGate({ blocked, onResume }: { blocked: boolean; onResume: () => void }) {
  if (!blocked) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreen-exit-title"
    >
      <Alert tone="warning" title="You left fullscreen" className="max-w-md bg-[#141414]">
        <p id="fullscreen-exit-title" className="mb-2 font-medium">
          This is recorded as an integrity warning. Questions stay hidden until you return.
        </p>
        <p className="mb-4 text-sm text-white/70">
          Click Return to fullscreen to continue. The browser always allows leaving fullscreen (hold
          Esc or the browser control); that cannot be turned off on the web.
        </p>
        <Button type="button" className="bg-teal text-ink hover:bg-teal/90" onClick={onResume}>
          Return to fullscreen
        </Button>
      </Alert>
    </div>
  );
}

export function DisplayGate({ blocked }: { blocked: boolean }) {
  if (!blocked) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="external-display-title"
    >
      <Alert tone="warning" title="External display detected" className="max-w-md bg-[#141414]">
        <p id="external-display-title" className="mb-2 font-medium">
          An extra monitor is connected. This is flagged for integrity review. Questions stay hidden
          until only one display is active.
        </p>
        <p className="text-sm text-white/70">
          Disconnect or disable the extra display. The page will unlock automatically. Extra screens
          cannot be turned off from the browser.
        </p>
      </Alert>
    </div>
  );
}
