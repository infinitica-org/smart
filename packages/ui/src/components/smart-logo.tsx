import type { HTMLAttributes } from 'react';
import { SMART_MARK_TEAL } from '../brand/colors';
import { cn } from '../lib/cn';

export { SMART_MARK_TEAL } from '../brand/colors';

const WORD_PATHS = [
  'M208.79,106.76l11.08-11.75c4.53,8.22,14.6,16.61,29.2,16.61,8.06,0,13.26-2.85,13.26-8.73s-6.21-8.06-15.27-10.24l-10.91-2.68c-12.92-3.02-24.84-8.73-24.84-23.66s12.25-24.5,31.05-24.5c17.45,0,29.7,8.39,34.74,17.62l-11.08,11.75c-5.71-9.06-14.43-14.43-25-14.43-7.22,0-12.08,3.02-12.08,8.56,0,5.87,4.36,8.06,15.44,10.91l9.9,2.52c18.29,4.7,25,12.08,25,23.83,0,16.11-13.59,24.17-30.88,24.17s-33.4-7.05-39.6-19.97Z',
  'M282.3,125.05V43.32h18.79v22.32c3.02-12.92,11.08-24,26.52-24s22.99,8.73,23.83,24.17c2.85-12.92,10.91-24.17,26.52-24.17s23.83,9.57,23.83,26.52v56.89h-18.8v-51.18c0-11.24-4.7-16.95-15.77-16.95s-15.78,8.89-15.78,22.32v45.81h-18.79v-51.18c0-11.24-4.7-16.95-15.77-16.95s-15.78,8.89-15.78,22.32v45.81h-18.79Z',
  'M406.99,107.43c0-11.58,8.05-18.63,21.31-23.83l27.35-11.58c-.67-8.22-4.36-13.76-15.61-13.76s-19.47,6.38-24.17,14.94l-11.24-13.43c6.38-8.73,19.13-18.12,37.25-18.12,20.31,0,31.72,11.58,31.72,31.72v30.71c0,3.69,1.34,4.87,4.36,4.87h5.2v16.11h-11.58c-8.73,0-15.61-4.03-15.61-15.77v-6.04c-2.52,10.74-10.4,23.49-27.52,23.49-13.43,0-21.48-7.55-21.48-19.3ZM435.18,112.13c12.42,0,20.81-7.38,20.81-18.46v-8.73l-20.98,9.4c-7.05,3.19-9.9,6.04-9.9,10.24,0,4.7,3.19,7.55,10.07,7.55Z',
  'M487.54,125.05V43.32h18.79v23.16c3.02-13.09,11.24-24.84,25.84-24.84,10.24,0,17.79,6.71,17.79,18.8,0,7.89-2.18,13.76-3.69,16.28h-19.3c2.69-2.69,5.2-8.06,5.2-12.75s-2.18-8.22-7.72-8.22c-9.4,0-18.12,10.74-18.12,24.33v44.97h-18.79Z',
  'M557.52,102.73v-44.81h-12.75v-14.6h12.75v-9.9l18.79-11.92v21.82h25v14.6h-25v40.28c0,8.89,4.2,11.08,9.73,11.08,6.38,0,11.08-5.2,13.43-9.9l5.87,16.78c-3.52,5.2-11.58,10.74-23.49,10.74-15.44,0-24.33-9.73-24.33-24.17Z',
] as const;

const WORDMARK_MARK_PATH =
  'M120.42,50.26l-24.78,25.1c3.92,5.59,3.41,13.35-1.56,18.38-4.96,5.02-12.71,5.63-18.34,1.78l-35.17,35.63L5.28,166.94h48.38l11.43-11.57,30.73-31.18,24.22-24.42,46.91,46.35v-49.9l-46.51-45.97ZM113.29,0l-11.43,11.57-30.72,31.18-24.22,24.42L0,20.82v49.89l46.51,45.97,25.11-25.44c-3.47-5.54-2.81-12.91,1.97-17.76,4.78-4.83,12.14-5.57,17.72-2.19l35.05-35.51L161.66,0h-48.38Z';

const MARK_PATH =
  'M138.45,73.34l-24.78,25.1c3.92,5.59,3.41,13.35-1.56,18.38-4.96,5.02-12.71,5.63-18.34,1.78l-35.17,35.63-35.29,35.79h48.38l11.43-11.57,30.73-31.18,24.22-24.42,46.91,46.35v-49.9l-46.51-45.97ZM131.32,23.09l-11.43,11.57-30.72,31.18-24.22,24.42L18.03,43.9v49.89l46.51,45.97,25.11-25.44c-3.47-5.54-2.81-12.91,1.97-17.76,4.78-4.83,12.14-5.57,17.72-2.19l35.05-35.51,35.3-35.79h-48.38Z';

/** `text` is the plain lowercase "smart" wordmark (no diamond) and the default everywhere. */
export type SmartLogoKind = 'text' | 'wordmark' | 'mark';
export type SmartLogoTone = 'auto' | 'on-light' | 'on-dark';

export interface SmartLogoProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  kind?: SmartLogoKind;
  /**
   * `auto` — COLOURED artwork: teal diamond + `currentColor` word (follows
   * `text-*` / sidebar foreground, so light and dark themes both read).
   * `on-light` / `on-dark` lock letter colour to black / white; for `kind="mark"`,
   * the favicon uses black / white instead of teal.
   */
  tone?: SmartLogoTone;
  title?: string;
}

function lettersFillForTone(tone: SmartLogoTone): string {
  if (tone === 'on-light') return '#131313';
  if (tone === 'on-dark') return '#ffffff';
  return 'currentColor';
}

function markFillForTone(tone: SmartLogoTone): string {
  if (tone === 'on-light') return '#131313';
  if (tone === 'on-dark') return '#ffffff';
  return SMART_MARK_TEAL;
}

function wordmarkMarkFill(lettersFill: string): string {
  return lettersFill === '#131313' ? '#131313' : SMART_MARK_TEAL;
}

function TextSvg({ fill, title }: { fill: string; title: string }) {
  return (
    <svg
      viewBox="205 18 403 118"
      role="img"
      aria-label={title}
      className="block h-full w-auto shrink-0"
    >
      <title>{title}</title>
      <g fill={fill}>
        {WORD_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
    </svg>
  );
}

function WordmarkSvg({ lettersFill, title }: { lettersFill: string; title: string }) {
  const markFill = wordmarkMarkFill(lettersFill);
  return (
    <svg
      viewBox="0 0 605.34 166.94"
      role="img"
      aria-label={title}
      className="block h-full w-auto shrink-0"
    >
      <title>{title}</title>
      <g fill={lettersFill}>
        {WORD_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
      <path fill={markFill} d={WORDMARK_MARK_PATH} />
    </svg>
  );
}

function MarkSvg({ title, fill }: { title: string; fill: string }) {
  return (
    <svg
      viewBox="0 0 202.67 211.56"
      role="img"
      aria-label={title}
      className="block size-full shrink-0"
    >
      <title>{title}</title>
      <path fill={fill} d={MARK_PATH} />
    </svg>
  );
}

/**
 * SMART logo. The default is the plain text logo ("smart"), which follows the surrounding
 * text colour (`auto`) or locks to black / white (`on-light` / `on-dark`). The diamond lockup
 * (`wordmark`) and icon-only `mark` remain for favicons and special cases.
 */
export function SmartLogo({
  kind = 'text',
  tone = 'auto',
  title = 'SMART',
  className,
  ...props
}: SmartLogoProps) {
  if (kind === 'text') {
    return (
      <span className={cn('inline-flex h-8 w-auto shrink-0 items-center', className)} {...props}>
        <TextSvg fill={lettersFillForTone(tone)} title={title} />
      </span>
    );
  }

  if (kind === 'mark') {
    return (
      <span
        className={cn('inline-flex size-8 shrink-0 items-center justify-center', className)}
        {...props}
      >
        <MarkSvg title={title} fill={markFillForTone(tone)} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex h-8 w-auto shrink-0 items-center', className)} {...props}>
      <WordmarkSvg lettersFill={lettersFillForTone(tone)} title={title} />
    </span>
  );
}
