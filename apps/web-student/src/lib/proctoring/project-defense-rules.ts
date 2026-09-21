import { PROCTORING_WARNING_LIMIT_DEFAULT } from '@smart/contracts';

export function projectDefenseRuleItems(
  warningLimit = PROCTORING_WARNING_LIMIT_DEFAULT,
): readonly string[] {
  const limit = String(warningLimit);
  return [
    'Use Google Chrome on a computer. Other browsers cannot enter this interview.',
    'Keep one clearly lit face in the camera for the whole interview. If you leave the frame, look away, cover the camera, or a second person appears, the interview blacks out until you are aligned again.',
    `You have ${limit} integrity warnings. The ${limit}th warning ends the interview and flags it for review.`,
    'Stay in fullscreen on this tab. Do not switch apps, open another window, or use a second monitor — the timer keeps running while you are away.',
    'Do not copy, cut, paste, right-click, print screen, or open developer tools.',
    'Do not use notes, another device, or help from anyone else.',
    'The camera monitors integrity only; your voice answers are transcribed separately.',
  ];
}
