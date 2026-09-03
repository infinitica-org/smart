import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InterviewsPage from './page';

describe('InterviewsPage', () => {
  it('shows an unavailable state instead of fixture interviews', () => {
    render(<InterviewsPage />);
    expect(screen.getByText('Interview calendar unavailable')).toBeTruthy();
    expect(screen.queryByText('Northwind')).toBeNull();
    expect(screen.queryByText('Stripe')).toBeNull();
    expect(screen.queryByText('92/100')).toBeNull();
  });
});
