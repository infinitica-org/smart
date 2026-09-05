import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/proctoring/crypto', () => ({
  isProctoringEnabled: () => false,
  deviceFingerprintHash: () => 'a'.repeat(64),
  signProctoringEvent: vi.fn(),
}));

import { ProctoringShell } from './proctoring-shell';

describe('ProctoringShell', () => {
  it('renders children when proctoring is disabled', () => {
    render(
      <ProctoringShell attemptId="55555555-5555-4555-8555-555555555555">
        <p>exam body</p>
      </ProctoringShell>,
    );
    expect(screen.getByText('exam body')).toBeDefined();
  });

  it('notifies onReady once when proctoring is disabled', async () => {
    const onReady = vi.fn();
    render(
      <ProctoringShell attemptId="55555555-5555-4555-8555-555555555555" onReady={onReady}>
        <p>exam body</p>
      </ProctoringShell>,
    );
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });
});
