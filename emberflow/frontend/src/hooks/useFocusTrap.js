import { useEffect } from 'react';

/**
 * Shared focus-trap + body-scroll-lock behavior for Modal and Drawer:
 * traps Tab navigation within the ref'd element, closes on Escape, locks
 * body scroll while open, and restores focus to whatever was focused
 * before the overlay opened.
 */
export function useFocusTrap(ref, { isOpen, onClose, closeOnEscape = true }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousActiveElement = document.activeElement;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();

    const trapFocus = (event) => {
      const focusableElements = ref.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
      if (event.key === 'Tab') {
        trapFocus(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose, closeOnEscape, ref]);
}
