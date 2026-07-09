import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function PasswordField({ label = 'Password', value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {label}
      <span className="password-control">
        <input
          required
          type={visible ? 'text' : 'password'}
          minLength={8}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
