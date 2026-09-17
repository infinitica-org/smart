import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EducationDetailsModal } from './EducationDetailsModal';
import { emptyEducationFormValues } from '@/lib/education-form';

afterEach(() => {
  cleanup();
});

describe('EducationDetailsModal', () => {
  it('opens with labeled fields and no horizontal overflow class on body', () => {
    const { container } = render(
      <EducationDetailsModal
        open
        mode="create"
        initialValues={emptyEducationFormValues()}
        submitting={false}
        formError={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('School / Institution name')).toBeTruthy();
    expect(screen.getByText('Study mode')).toBeTruthy();
    const scrollBody = container.querySelector('.overflow-x-hidden');
    expect(scrollBody).toBeTruthy();
  });

  it('shows SSC score field for 10th standard and hides backlog', () => {
    render(
      <EducationDetailsModal
        open
        mode="create"
        initialValues={{
          ...emptyEducationFormValues(),
          programDegree: '10th Standard',
        }}
        submitting={false}
        formError={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('10th (SSC) score')).toBeTruthy();
    expect(screen.queryByText(/active academic backlogs/i)).toBeNull();
    expect(screen.getByTestId('education-score-input').className).toMatch(/flex-1/);
  });

  it('shows unit selector for degree programs', () => {
    render(
      <EducationDetailsModal
        open
        mode="create"
        initialValues={{
          ...emptyEducationFormValues(),
          programDegree: 'B.Tech',
        }}
        submitting={false}
        formError={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Score unit')).toBeTruthy();
    expect(screen.getByLabelText(/Institute roll no/i)).toBeTruthy();
    expect(screen.getByText(/Course details/i)).toBeTruthy();
  });

  it('updates score section when program changes', () => {
    render(
      <EducationDetailsModal
        open
        mode="create"
        initialValues={emptyEducationFormValues()}
        submitting={false}
        formError={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Program / Degree *'), {
      target: { value: '12th Standard' },
    });

    expect(screen.getByText('12th (HSC) score')).toBeTruthy();
  });
});
