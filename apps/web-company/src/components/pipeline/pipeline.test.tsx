/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EmployerApplicantCard } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom has no layout, so drag geometry cannot run. Mock dnd-kit so the test drives onDragStart/onDragEnd
// directly and checks what the board does with them.
const dnd = vi.hoisted(() => ({ props: {} as Record<string, any> }));
vi.mock('@dnd-kit/core', () => ({
  DndContext: (props: any) => {
    dnd.props = props;
    return props.children;
  },
  DragOverlay: ({ children }: any) => children ?? null,
  KeyboardSensor: class {},
  PointerSensor: class {},
  useSensor: (sensor: unknown) => sensor,
  useSensors: (...sensors: unknown[]) => sensors,
  useDraggable: ({ disabled }: { disabled?: boolean }) => ({
    attributes: { 'aria-disabled': disabled ? 'true' : 'false' },
    listeners: {},
    setNodeRef: () => undefined,
    isDragging: false,
  }),
  useDroppable: ({ disabled }: { disabled?: boolean }) => ({
    setNodeRef: () => undefined,
    isOver: false,
    disabled,
  }),
}));

import { PipelineBoard } from './PipelineBoard';
import { StatusSelect } from './StatusSelect';

const card = (
  id: string,
  status: EmployerApplicantCard['status'],
  allowedNext: EmployerApplicantCard['allowedNext'],
  over: Partial<EmployerApplicantCard> = {},
): EmployerApplicantCard => ({
  applicationId: id,
  candidateName: `Candidate ${id}`,
  fit: { band: 'STRONG', matchPercent: 90, topReason: null },
  fitRecalculated: false,
  status,
  statusLabel: status === 'APPLIED' ? 'Applied' : status,
  allowedNext,
  appliedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('PipelineBoard (Th6-414)', () => {
  afterEach(cleanup);

  const applicants = [card('a1', 'APPLIED', ['REVIEWING', 'REJECTED']), card('h1', 'HIRED', [])];

  it('shows one column per stage with its candidates and counts', () => {
    render(<PipelineBoard applicants={applicants} onMove={vi.fn()} />);
    for (const label of [
      'Applied',
      'Reviewing',
      'Interviewing',
      'Offered',
      'Hired',
      'Rejected',
      'Withdrawn',
    ]) {
      expect(screen.getByLabelText(`${label} column`)).toBeTruthy();
    }
    expect(within(screen.getByTestId('column-APPLIED')).getByText('Candidate a1')).toBeTruthy();
    expect(within(screen.getByTestId('column-REVIEWING')).getByText('No candidates')).toBeTruthy();
  });

  it('cannot drag a finished candidate, but can drag an open one', () => {
    render(<PipelineBoard applicants={applicants} onMove={vi.fn()} />);
    expect(screen.getByTestId('card-h1').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByTestId('card-a1').getAttribute('aria-disabled')).toBe('false');
  });

  it('highlights only valid drop targets while dragging, and fades the rest', async () => {
    const { rerender } = render(<PipelineBoard applicants={applicants} onMove={vi.fn()} />);
    expect(screen.getByTestId('column-REVIEWING').getAttribute('data-drop-state')).toBe('idle');
    const { act } = await import('@testing-library/react');
    act(() => dnd.props.onDragStart({ active: { id: 'a1' } }));
    rerender(<PipelineBoard applicants={applicants} onMove={vi.fn()} />);
    expect(screen.getByTestId('column-REVIEWING').getAttribute('data-drop-state')).toBe('target');
    expect(screen.getByTestId('column-REJECTED').getAttribute('data-drop-state')).toBe('target');
    for (const blocked of ['INTERVIEWING', 'OFFERED', 'HIRED', 'WITHDRAWN']) {
      expect(screen.getByTestId(`column-${blocked}`).getAttribute('data-drop-state')).toBe(
        'blocked',
      );
    }
    act(() => dnd.props.onDragCancel());
    expect(screen.getByTestId('column-REVIEWING').getAttribute('data-drop-state')).toBe('idle');
  });

  it('moves a card dropped on an allowed column', () => {
    const onMove = vi.fn();
    render(<PipelineBoard applicants={applicants} onMove={onMove} />);
    dnd.props.onDragEnd({ active: { id: 'a1' }, over: { id: 'REVIEWING' } });
    expect(onMove).toHaveBeenCalledWith(applicants[0], 'REVIEWING');
  });

  it.each(['OFFERED', 'INTERVIEWING', 'HIRED', 'WITHDRAWN'])(
    'never sends a drop on %s (the server would refuse it)',
    (target) => {
      const onMove = vi.fn();
      render(<PipelineBoard applicants={applicants} onMove={onMove} />);
      dnd.props.onDragEnd({ active: { id: 'a1' }, over: { id: target } });
      expect(onMove).not.toHaveBeenCalled();
    },
  );

  it('ignores a drop outside every column and a drop of a finished candidate', () => {
    const onMove = vi.fn();
    render(<PipelineBoard applicants={applicants} onMove={onMove} />);
    dnd.props.onDragEnd({ active: { id: 'a1' }, over: null });
    dnd.props.onDragEnd({ active: { id: 'h1' }, over: { id: 'REVIEWING' } });
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe('StatusSelect (Th6-414)', () => {
  afterEach(cleanup);

  it('offers the current status plus only the allowed next stages', () => {
    render(
      <StatusSelect
        applicant={card('a1', 'APPLIED', ['REVIEWING', 'REJECTED'])}
        onChange={vi.fn()}
      />,
    );
    const select = screen.getByLabelText('Status for Candidate a1') as HTMLSelectElement;
    expect([...select.options].map((o) => o.text)).toEqual([
      'Applied',
      'Move to Reviewing',
      'Move to Rejected',
    ]);
    expect(select.value).toBe('APPLIED');
  });

  it('reports the chosen stage', () => {
    const onChange = vi.fn();
    render(
      <StatusSelect
        applicant={card('a1', 'APPLIED', ['REVIEWING', 'REJECTED'])}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Status for Candidate a1'), {
      target: { value: 'REJECTED' },
    });
    expect(onChange).toHaveBeenCalledWith('REJECTED');
  });

  it('shows plain text when the application is finished', () => {
    render(
      <StatusSelect
        applicant={card('h1', 'HIRED', [], { statusLabel: 'Hired' })}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Hired')).toBeTruthy();
  });
});
