import { getPasswordStrength } from '../../utils/passwordStrength.js';

const MAX_SCORE = 5;

export function PasswordStrengthMeter({ password }) {
  const { score, label, level } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength__track">
        {Array.from({ length: MAX_SCORE }).map((_, index) => (
          <span
            key={index}
            className={`password-strength__segment${index < score ? ` password-strength__segment--${level}` : ''}`}
          />
        ))}
      </div>
      {label ? <p className={`password-strength__label password-strength__label--${level}`}>{label}</p> : null}
    </div>
  );
}
