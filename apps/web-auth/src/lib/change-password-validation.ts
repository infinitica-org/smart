/** Client-side checks before POST /users/me/password (contract min length is 8). */
export function validateChangePasswordInput(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  if (!input.currentPassword.trim()) {
    return 'Enter your current password.';
  }
  if (input.newPassword.length < 8) {
    return 'New password must be at least 8 characters.';
  }
  if (input.newPassword.length > 200) {
    return 'New password must be at most 200 characters.';
  }
  if (input.newPassword === input.currentPassword) {
    return 'New password must be different from your current password.';
  }
  if (input.newPassword !== input.confirmPassword) {
    return 'New password and confirmation do not match.';
  }
  return null;
}
