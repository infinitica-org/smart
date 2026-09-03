/**
 * CN-T01 post-auth destinations. Uses AuthenticatedUser server flags only —
 * never localStorage drafts.
 */
export function destinationAfterAuth(user: {
  institutionId: string | null;
  primaryTrack: string | null;
  onboardingCompleted: boolean;
}): '/institution-picker' | '/enroll' | '/onboarding' | '/dashboard' {
  if (!user.institutionId) return '/institution-picker';
  if (!user.primaryTrack) return '/enroll';
  if (!user.onboardingCompleted) return '/onboarding';
  return '/dashboard';
}

/** After PUT /users/me/track the student already has a primary track. */
export function destinationAfterEnrollment(user: {
  onboardingCompleted: boolean;
}): '/onboarding' | '/dashboard' {
  return user.onboardingCompleted ? '/dashboard' : '/onboarding';
}
