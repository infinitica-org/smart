import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CameraIntegrityDock } from './camera-integrity-dock';
import { ProctorLiveProvider } from './proctor-live-context';

describe('CameraIntegrityDock', () => {
  it('shows a tick when the live sample is clear', () => {
    render(
      <ProctorLiveProvider
        value={{
          cameraEnabled: true,
          liveKind: null,
          sampled: true,
          warningCount: 0,
          warningLimit: 5,
          bindPreview: vi.fn(),
        }}
      >
        <CameraIntegrityDock />
      </ProctorLiveProvider>,
    );
    expect(screen.getByText('Camera clear')).toBeDefined();
    expect(screen.getByLabelText('Proctoring camera preview')).toBeDefined();
  });

  it('shows the live integrity issue when a face is missing', () => {
    render(
      <ProctorLiveProvider
        value={{
          cameraEnabled: true,
          liveKind: 'NO_FACE',
          sampled: true,
          warningCount: 2,
          warningLimit: 5,
          bindPreview: vi.fn(),
        }}
      >
        <CameraIntegrityDock />
      </ProctorLiveProvider>,
    );
    expect(screen.getByText('Face not visible')).toBeDefined();
    expect(screen.getByText('2 / 5 warnings')).toBeDefined();
  });
});
