import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguagesSection } from './LanguagesSection';

const listLanguages = vi.fn();
const createLanguage = vi.fn();
const updateLanguage = vi.fn();
const deleteLanguage = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      listLanguages: (...args: unknown[]) => listLanguages(...args),
      createLanguage: (...args: unknown[]) => createLanguage(...args),
      updateLanguage: (...args: unknown[]) => updateLanguage(...args),
      deleteLanguage: (...args: unknown[]) => deleteLanguage(...args),
    },
  },
}));

const mockLangItem = {
  id: 'lang-123',
  studentId: 'user-1',
  language: 'French',
  proficiency: 'Full Professional',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('LanguagesSection', () => {
  beforeEach(() => {
    listLanguages.mockReset().mockResolvedValue([mockLangItem]);
    createLanguage.mockReset();
    updateLanguage.mockReset();
    deleteLanguage.mockReset();
  });

  it('renders language items correctly', async () => {
    render(<LanguagesSection />);
    expect(await screen.findByText('French')).toBeTruthy();
    expect(screen.getByText('Full Professional')).toBeTruthy();
  });

  it('opens create modal and adds new language', async () => {
    listLanguages.mockResolvedValueOnce([]).mockResolvedValueOnce([mockLangItem]);
    createLanguage.mockResolvedValueOnce(mockLangItem);

    render(<LanguagesSection />);
    const addButton = await screen.findByRole('button', { name: /Add Language/i });
    fireEvent.click(addButton);

    fireEvent.change(screen.getByPlaceholderText(/English, German, Spanish/i), {
      target: { value: 'French' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));

    await waitFor(() => expect(createLanguage).toHaveBeenCalledTimes(1));
    expect(createLanguage).toHaveBeenCalledWith({
      language: 'French',
      proficiency: 'Professional Working',
    });
  });
});
