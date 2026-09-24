import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileViewsSettingCard } from './ProfileViewsSettingCard';

const { users } = vi.hoisted(() => ({
  users: { getProfileViewSetting: vi.fn(), updateProfileViewSetting: vi.fn() },
}));

vi.mock('@/lib/api', () => ({ api: { users } }));

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ProfileViewsSettingCard />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe('ProfileViewsSettingCard', () => {
  beforeEach(() => {
    users.getProfileViewSetting.mockReset().mockResolvedValue({ showEmployerViewCount: false });
    users.updateProfileViewSetting.mockReset();
  });

  it('is off by default and explains that institution staff views are not counted', async () => {
    renderCard();

    const toggle = await screen.findByRole('switch', { name: /profile-view count/i });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    expect(screen.getByText(/not counted/i)).toBeTruthy();
  });

  it('turns the count on and refreshes the dashboard', async () => {
    users.updateProfileViewSetting.mockResolvedValue({ showEmployerViewCount: true });
    const { invalidate } = renderCard();

    const toggle = await screen.findByRole('switch', { name: /profile-view count/i });
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(users.updateProfileViewSetting).toHaveBeenCalledWith({ showEmployerViewCount: true }),
    );
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me', 'dashboard'] }));
  });

  it('reports a failure and leaves the setting unchanged', async () => {
    users.updateProfileViewSetting.mockRejectedValue(new Error('network'));
    renderCard();

    const toggle = await screen.findByRole('switch', { name: /profile-view count/i });
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle);

    expect((await screen.findByRole('alert')).textContent).toMatch(/could not update/i);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
