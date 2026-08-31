import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  AssessmentHeader,
  QuestionCard,
  AnswerOption,
  ProgressIndicator,
  AssessmentNavigation,
} from '@smart/ui';

describe('Assessment Components', () => {
  describe('AssessmentHeader', () => {
    it('renders title and right slot', () => {
      render(
        <AssessmentHeader
          title="Test Title"
          rightSlot={<div data-testid="right-slot">Timer</div>}
        />,
      );
      expect(screen.getByText('Test Title')).toBeDefined();
      expect(screen.getByTestId('right-slot')).toBeDefined();
    });
  });

  describe('QuestionCard', () => {
    it('renders question text and children', () => {
      render(
        <QuestionCard questionText="What is 2+2?">
          <div data-testid="child">4</div>
        </QuestionCard>,
      );
      expect(screen.getByText('What is 2+2?')).toBeDefined();
      expect(screen.getByTestId('child')).toBeDefined();
    });
  });

  describe('AnswerOption', () => {
    it('renders label and handles clicks', () => {
      const handleClick = vi.fn();
      render(<AnswerOption label="Option A" onClick={handleClick} selected={false} />);

      const button = screen.getByRole('radio');
      expect(button).toBeDefined();
      expect(screen.getByText('Option A')).toBeDefined();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('ProgressIndicator', () => {
    it('renders current and total progress', () => {
      render(<ProgressIndicator current={3} total={10} />);
      expect(screen.getByText('Question 3 of 10')).toBeDefined();
    });
  });

  describe('AssessmentNavigation', () => {
    it('renders buttons and handles navigation clicks', () => {
      const handlePrev = vi.fn();
      const handleNext = vi.fn();

      render(<AssessmentNavigation onPrevious={handlePrev} onNext={handleNext} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      const nextButton = screen.getByRole('button', { name: /next/i });

      fireEvent.click(prevButton);
      expect(handlePrev).toHaveBeenCalled();

      fireEvent.click(nextButton);
      expect(handleNext).toHaveBeenCalled();
    });

    it('disables buttons based on props', () => {
      render(<AssessmentNavigation canPrevious={false} canNext={false} />);

      const prevButton = screen.getByRole('button', { name: /previous/i }) as HTMLButtonElement;
      const nextButton = screen.getByRole('button', { name: /next/i }) as HTMLButtonElement;

      expect(prevButton.disabled).toBe(true);
      expect(nextButton.disabled).toBe(true);
    });
  });
});
