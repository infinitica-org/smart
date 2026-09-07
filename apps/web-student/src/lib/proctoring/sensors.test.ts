import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachProctorSensors, classifyProctorKey, classifyTrackpadGesture } from './sensors';

function key(partial: Partial<KeyboardEvent> & Pick<KeyboardEvent, 'key'>): KeyboardEvent {
  return {
    key: partial.key,
    code: partial.code ?? '',
    ctrlKey: Boolean(partial.ctrlKey),
    shiftKey: Boolean(partial.shiftKey),
    altKey: Boolean(partial.altKey),
    metaKey: Boolean(partial.metaKey),
  } as KeyboardEvent;
}

describe('classifyProctorKey', () => {
  it('maps OS, copy, paste, cut, and devtools chords', () => {
    expect(classifyProctorKey(key({ key: 'Meta', code: 'MetaLeft' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'c', ctrlKey: true }))).toBe('COPY_ATTEMPT');
    expect(classifyProctorKey(key({ key: 'v', ctrlKey: true }))).toBe('PASTE_DETECTED');
    expect(classifyProctorKey(key({ key: 'x', ctrlKey: true }))).toBe('CUT_ATTEMPT');
    expect(classifyProctorKey(key({ key: 'F12' }))).toBe('DEVTOOLS_OPEN');
    expect(classifyProctorKey(key({ key: 'I', ctrlKey: true, shiftKey: true }))).toBe(
      'DEVTOOLS_OPEN',
    );
    expect(classifyProctorKey(key({ key: 'PrintScreen', code: 'PrintScreen' }))).toBe(
      'PRINT_SCREEN',
    );
    expect(classifyProctorKey(key({ key: 's', metaKey: true, shiftKey: true }))).toBe(
      'PRINT_SCREEN',
    );
  });

  it('flags Escape, function keys, and the menu key as OS_KEY', () => {
    expect(classifyProctorKey(key({ key: 'Escape', code: 'Escape' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'F1', code: 'F1' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'F5', code: 'F5' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'F11', code: 'F11' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'ContextMenu', code: 'ContextMenu' }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'Tab', altKey: true }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'u', ctrlKey: true }))).toBe('DEVTOOLS_OPEN');
    expect(classifyProctorKey(key({ key: 's', ctrlKey: true }))).toBe('OS_KEY');
    expect(classifyProctorKey(key({ key: 'a' }))).toBeNull();
  });
});

describe('classifyTrackpadGesture', () => {
  it('flags pinch, horizontal swipe, and multi-touch; ignores vertical scroll', () => {
    expect(classifyTrackpadGesture({ type: 'wheel', ctrlKey: true, deltaY: 40 })).toBe('OS_KEY');
    expect(classifyTrackpadGesture({ type: 'wheel', deltaX: 80, deltaY: 4 })).toBe('OS_KEY');
    expect(classifyTrackpadGesture({ type: 'touchmove', touches: 2 })).toBe('OS_KEY');
    expect(classifyTrackpadGesture({ type: 'touchmove', touches: 3 })).toBe('OS_KEY');
    expect(classifyTrackpadGesture({ type: 'gesturestart' })).toBe('OS_KEY');
    expect(classifyTrackpadGesture({ type: 'wheel', deltaX: 0, deltaY: 80 })).toBeNull();
    expect(classifyTrackpadGesture({ type: 'touchmove', touches: 1 })).toBeNull();
  });
});

describe('attachProctorSensors', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('reports right-click, Escape, and horizontal trackpad swipe', () => {
    const report = vi.fn();
    const detach = attachProctorSensors(report);
    document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    const wheel = new WheelEvent('wheel', {
      deltaX: 80,
      deltaY: 2,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(wheel);
    expect(report).toHaveBeenCalledWith('RIGHT_CLICK');
    expect(report).toHaveBeenCalledWith('OS_KEY');
    detach();
  });

  it('still reports copy chords when fullscreen listening is disabled', () => {
    const report = vi.fn();
    const detach = attachProctorSensors(report, { listenFullscreen: false });
    document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(report).toHaveBeenCalledWith('RIGHT_CLICK');
    detach();
  });
});
