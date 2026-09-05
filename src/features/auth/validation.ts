/**
 * Form validation shared by the auth screens.
 *
 * Client-side validation is a courtesy, not a control: Supabase and the database
 * CHECK constraints reject bad input regardless. Its job is to catch mistakes
 * before a round trip and say something useful about them.
 */

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Email is required.";
  // Deliberately permissive: the definitive check is the confirmation email.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "Password is required.";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateRequired(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required.`;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  if (!confirmation) return "Confirm your password.";
  if (password !== confirmation) return "Passwords don't match.";
  return undefined;
}

/** True when every entry is `undefined`. */
export function isValid(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).every((message) => message === undefined);
}
