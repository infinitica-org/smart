import { PROCTORING_WARNING_LIMIT_DEFAULT } from '@smart/contracts';

export function skillVerifyRuleItems(
  warningLimit = PROCTORING_WARNING_LIMIT_DEFAULT,
): readonly string[] {
  const limit = String(warningLimit);
  return [
    'Use Google Chrome on a computer. Other browsers cannot enter this challenge.',
    'Keep one clearly lit face in the camera for the whole challenge. If you leave the frame, look away, cover the camera, or a second person appears, the challenge blacks out until you are aligned again.',
    `You have ${limit} integrity warnings. The ${limit}th warning ends the challenge and flags it for review. Saved answers are kept.`,
    'Stay in fullscreen on this tab. Do not switch apps, open another window, or use a second monitor.',
    'Do not copy, cut, paste, right-click, print screen, or open developer tools.',
    'Do not use notes, another device, or help from anyone else.',
    'The camera is used only for this challenge. We scan the live feed for one face; we do not upload the preview video from this screen.',
  ];
}
