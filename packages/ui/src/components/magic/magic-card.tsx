'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { cn } from '../../lib/cn';

export interface MagicCardProps {
  children?: ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = 'rgba(0, 250, 208, 0.12)',
  gradientOpacity = 0.8,
  gradientFrom = '#00fad0',
  gradientTo = '#004c63',
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const sizeRef = useRef(gradientSize);

  useEffect(() => {
    sizeRef.current = gradientSize;
  }, [gradientSize]);

  const reset = useCallback(() => {
    mouseX.set(-sizeRef.current);
    mouseY.set(-sizeRef.current);
  }, [mouseX, mouseY]);

  const spotlight = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor},
      transparent 100%
    )
  `;
  const borderFill = useMotionTemplate`
    linear-gradient(var(--surface, #070707) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom},
      ${gradientTo},
      var(--surface-border, rgb(244 244 244 / 0.14)) 100%
    ) border-box
  `;

  return (
    <motion.div
      className={cn(
        'group relative isolate overflow-hidden rounded-2xl border border-transparent',
        className,
      )}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left);
        mouseY.set(event.clientY - rect.top);
      }}
      onPointerLeave={reset}
      style={{ background: borderFill }}
    >
      <div
        className="absolute inset-px z-20 rounded-[inherit] bg-[var(--surface,#070707)]"
        style={{
          position: 'absolute',
          inset: 1,
          zIndex: 20,
          borderRadius: 'inherit',
          background: 'var(--surface, #070707)',
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-px z-30 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          position: 'absolute',
          inset: 1,
          zIndex: 30,
          borderRadius: 'inherit',
          background: spotlight,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative z-40" style={{ position: 'relative', zIndex: 40 }}>
        {children}
      </div>
    </motion.div>
  );
}
