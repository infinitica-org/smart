import type { HTMLAttributes, ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from './card';
import { cn } from '../lib/cn';

export interface QuestionCardProps extends HTMLAttributes<HTMLDivElement> {
  questionText: string | ReactNode;
  children?: ReactNode;
}

export function QuestionCard({ questionText, children, className, ...props }: QuestionCardProps) {
  return (
    <Card className={cn('flex flex-col gap-6', className)} {...props}>
      <CardHeader className="mb-0">
        <CardTitle className="text-xl font-medium leading-relaxed">{questionText}</CardTitle>
      </CardHeader>
      {children && <div className="flex flex-col gap-3">{children}</div>}
    </Card>
  );
}
