'use client';

import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, type MotionProps } from 'motion/react';
import { cn } from '../../lib/cn';

export function AnimatedListItem({ children }: { children: ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { type: 'spring', stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
  delay?: number;
}

export const AnimatedList = memo(function AnimatedList({
  children,
  className,
  delay = 250,
  ...props
}: AnimatedListProps) {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children],
  );

  useEffect(() => {
    if (index >= childrenArray.length - 1) return undefined;
    const timeout = setTimeout(() => setIndex((prev) => prev + 1), delay);
    return () => clearTimeout(timeout);
  }, [index, delay, childrenArray.length]);

  const itemsToShow = childrenArray.slice(0, index + 1);

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <AnimatePresence>
        {itemsToShow.map((item, itemIndex) => (
          <AnimatedListItem key={itemIndex}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
});
