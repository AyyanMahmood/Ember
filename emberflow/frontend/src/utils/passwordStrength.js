const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty123', 'qwertyuiop',
  'letmein', 'iloveyou', 'admin123', 'welcome1', 'monkey123', 'football1',
  'abc12345', 'passw0rd', 'trustno1', '1q2w3e4r', 'sunshine1', 'princess1',
]);

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', level: '' };

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { score: 1, label: 'Weak — this password is very common', level: 'weak' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Weak', level: 'weak' };
  if (score <= 3) return { score, label: 'Fair', level: 'fair' };
  if (score === 4) return { score, label: 'Good', level: 'good' };
  return { score, label: 'Strong', level: 'strong' };
}
