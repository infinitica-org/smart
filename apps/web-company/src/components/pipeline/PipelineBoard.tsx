'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  EMPLOYER_APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type EmployerApplicantCard,
} from '@smart/contracts';
import { BOARD_COLUMNS, canDrop, dropTargets, groupByStatus } from '@/lib/pipeline-board';

const BAND_LABEL = { STRONG: 'Strong fit', MODERATE: 'Good fit', STRETCH: 'Stretch' } as const;

function CandidateCard({
  applicant,
  overlay = false,
}: {
  applicant: EmployerApplicantCard;
  overlay?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 text-left shadow-2xs ${overlay ? 'shadow-lg ring-2 ring-emerald-500/40' : ''}`}
    >
      <p className="truncate text-sm font-semibold">{applicant.candidateName}</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {applicant.fit
          ? `${BAND_LABEL[applicant.fit.band]} · ${applicant.fit.matchPercent}%`
          : 'Not scored'}
      </p>
    </div>
  );
}

function DraggableCard({ applicant }: { applicant: EmployerApplicantCard }) {
  // A finished application has nowhere to go, so it is not draggable.
  const movable = applicant.allowedNext.length > 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: applicant.applicationId,
    disabled: !movable,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`card-${applicant.applicationId}`}
      aria-label={`${applicant.candidateName}, ${applicant.statusLabel}${movable ? '. Drag to move, or use the status menu in the list view.' : ''}`}
      className={`${isDragging ? 'opacity-40' : ''} ${movable ? 'cursor-grab touch-none' : 'opacity-80'}`}
    >
      <CandidateCard applicant={applicant} />
    </div>
  );
}

function Column({
  status,
  applicants,
  active,
}: {
  status: ApplicationStatus;
  applicants: EmployerApplicantCard[];
  active: EmployerApplicantCard | null;
}) {
  const allowed = active ? canDrop(active, status) : false;
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: !allowed });
  // While dragging, only valid targets light up; everything else fades back.
  const state = !active ? 'idle' : allowed ? (isOver ? 'over' : 'target') : 'blocked';
  const style = {
    idle: 'border-zinc-200 bg-zinc-50',
    target: 'border-emerald-400 bg-emerald-50/60',
    over: 'border-emerald-600 bg-emerald-100 ring-2 ring-emerald-500/40',
    blocked: 'border-zinc-200 bg-zinc-50 opacity-50',
  }[state];
  return (
    <section
      ref={setNodeRef}
      aria-label={`${EMPLOYER_APPLICATION_STATUS_LABELS[status]} column`}
      data-testid={`column-${status}`}
      data-drop-state={state}
      className={`flex min-h-40 w-56 shrink-0 flex-col gap-2 rounded-xl border p-2 ${style}`}
    >
      <h3 className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide text-zinc-600">
        {EMPLOYER_APPLICATION_STATUS_LABELS[status]}
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px]">{applicants.length}</span>
      </h3>
      {applicants.length === 0 ? (
        <p className="px-1 text-xs text-zinc-400">No candidates</p>
      ) : (
        applicants.map((applicant) => (
          <DraggableCard key={applicant.applicationId} applicant={applicant} />
        ))
      )}
    </section>
  );
}

interface PipelineBoardProps {
  applicants: EmployerApplicantCard[];
  /** Called when a card is dropped on a valid column. The parent does the optimistic move. */
  onMove: (applicant: EmployerApplicantCard, to: ApplicationStatus) => void;
}

/** Drag-and-drop board (Th6-414), one column per status. Only valid drop targets highlight. */
export function PipelineBoard({ applicants, onMove }: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    // A small drag distance keeps clicks and scrolling from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const groups = groupByStatus(applicants);
  const active = applicants.find((a) => a.applicationId === activeId) ?? null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const applicant = applicants.find((a) => a.applicationId === event.active.id);
    const to = event.over?.id as ApplicationStatus | undefined;
    // Re-check with the shared rules: a drop the server would refuse never leaves the browser.
    if (applicant && to && dropTargets(applicant).includes(to)) onMove(applicant, to);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3" data-testid="pipeline-board">
        {BOARD_COLUMNS.map((status) => (
          <Column key={status} status={status} applicants={groups[status]} active={active} />
        ))}
      </div>
      <DragOverlay>{active ? <CandidateCard applicant={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
