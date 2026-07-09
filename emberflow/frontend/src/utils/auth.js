export function authRedirectUrl(path) {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return new URL(path, baseUrl).toString();
}

export function friendlyAuthError(error) {
  const message = typeof error === 'string' ? error : error?.message || 'Authentication failed.';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'An account already exists for this email. Try logging in instead.';
  }

  if (normalized.includes('password') && normalized.includes('weak')) {
    return 'Use a stronger password with at least 8 characters.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  if (normalized.includes('expired') || normalized.includes('invalid token')) {
    return 'This link is invalid or expired. Request a new link and try again.';
  }

  return message;
}
