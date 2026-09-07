import type { HTMLAttributes, ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from './card';
import { cn } from '../lib/cn';

export interface QuestionCardProps extends HTMLAttributes<HTMLDivElement> {
  questionText: string | ReactNode;
  /** Small label above the stem, e.g. "Question 1 of 14". */
  eyebrow?: ReactNode;
  children?: ReactNode;
}

export function QuestionCard({
  questionText,
  eyebrow,
  children,
  className,
  ...props
}: QuestionCardProps) {
  return (
    <Card className={cn('flex flex-col gap-6', className)} {...props}>
      <CardHeader className="mb-0">
        {eyebrow ? <div className="mb-3">{eyebrow}</div> : null}
        <CardTitle className="text-xl font-medium leading-relaxed">{questionText}</CardTitle>
      </CardHeader>
      {children && <div className="flex flex-col gap-3">{children}</div>}
    </Card>
  );
}
