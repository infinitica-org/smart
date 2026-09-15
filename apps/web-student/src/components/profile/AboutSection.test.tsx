import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutSection } from './AboutSection';

const saveOnboarding = vi.fn();
const useOnboarding = vi.fn();

vi.mock('@/lib/use-onboarding', () => ({
  useOnboarding: () => useOnboarding(),
}));

vi.mock('@smart/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@smart/ui')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
  };
});

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      saveOnboarding: (...args: unknown[]) => saveOnboarding(...args),
    },
  },
}));

describe('AboutSection', () => {
  beforeEach(() => {
    saveOnboarding.mockReset();
    saveOnboarding.mockResolvedValue({});
    useOnboarding.mockReturnValue({
      data: {
        profile: { about: 'Existing summary.' },
        draft: null,
        onboardingCompleted: true,
      },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders saved about content and supports edit/save/cancel', async () => {
    render(<AboutSection />);
    expect(await screen.findByText('Existing summary.')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated summary.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveOnboarding).toHaveBeenCalledWith({ about: 'Updated summary.' });
      expect(screen.getByText('About section saved.')).toBeDefined();
    });
  });

  it('resets draft content when cancel is clicked', async () => {
    render(<AboutSection />);
    await screen.findByText('Existing summary.');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Temporary draft.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Existing summary.')).toBeDefined();
    expect(screen.queryByDisplayValue('Temporary draft.')).toBeNull();
  });
});
