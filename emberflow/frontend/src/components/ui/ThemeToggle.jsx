import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme.js';
import { IconButton } from './Button.jsx';

export function ThemeToggle({ className = '', size = 'md' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <IconButton
      size={size}
      className={className}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
}

ThemeToggle.displayName = 'ThemeToggle';
