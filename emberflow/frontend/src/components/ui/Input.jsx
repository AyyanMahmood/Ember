import { forwardRef, useEffect, useId, useRef } from 'react';
import React from 'react';

export const Input = forwardRef(function Input({
  label,
  error,
  hint,
  className = '',
  type = 'text',
  leftAddon,
  rightAddon,
  id: providedId,
  disabled,
  required,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = Boolean(error);

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(' ') || undefined;

  const inputClasses = [
    'input',
    hasError ? 'input--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-1)' }}>*</span>}
        </label>
      )}
      {(leftAddon || rightAddon) ? (
        <div className={`input-with-addon${hasError ? ' input-with-addon--error' : ''}`} role="group">
          {leftAddon && (
            <span className="input-addon" aria-hidden="true">{leftAddon}</span>
          )}
          <input
            ref={ref}
            id={id}
            type={type}
            className={inputClasses}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            {...props}
          />
          {rightAddon && (
            <span className="input-addon" aria-hidden="true">{rightAddon}</span>
          )}
        </div>
      ) : (
        <input
          ref={ref}
          id={id}
          type={type}
          className={inputClasses}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          {...props}
        />
      )}
      {error && (
        <p id={errorId} className="input-error" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p id={hintId} className="input-hint">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(function Textarea({
  label,
  error,
  hint,
  className = '',
  id: providedId,
  disabled,
  required,
  rows = 4,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = Boolean(error);

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(' ') || undefined;

  const textareaClasses = [
    'textarea',
    hasError ? 'input--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-1)' }}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={textareaClasses}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        rows={rows}
        {...props}
      />
      {error && (
        <p id={errorId} className="input-error" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p id={hintId} className="input-hint">{hint}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export const Select = forwardRef(function Select({
  label,
  error,
  hint,
  className = '',
  id: providedId,
  disabled,
  required,
  options = [],
  placeholder,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = Boolean(error);

  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ].filter(Boolean).join(' ') || undefined;

  const selectClasses = [
    'select',
    hasError ? 'input--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-1)' }}>*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={selectClasses}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="input-error" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p id={hintId} className="input-hint">{hint}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export const Checkbox = forwardRef(function Checkbox({
  label,
  className = '',
  id: providedId,
  disabled,
  required,
  indeterminate = false,
  ...props
}, forwardedRef) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const setRefs = (node) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return (
    <label className={`checkbox-wrapper ${className}`.trim()}>
      <input
        ref={setRefs}
        type="checkbox"
        id={id}
        className="checkbox-input"
        disabled={disabled}
        required={required}
        {...props}
      />
      <span className="checkbox-box" aria-hidden="true" />
      {label && <span className="checkbox-label">{label}</span>}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export const Radio = forwardRef(function Radio({
  label,
  className = '',
  id: providedId,
  disabled,
  required,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;

  return (
    <label className={`radio-wrapper ${className}`.trim()}>
      <input
        ref={ref}
        type="radio"
        id={id}
        className="radio-input"
        disabled={disabled}
        required={required}
        {...props}
      />
      <span className="radio-box" aria-hidden="true" />
      {label && <span className="radio-label">{label}</span>}
    </label>
  );
});

Radio.displayName = 'Radio';

export const RadioGroup = function RadioGroup({ name, value, onChange, children, className = '', ...props }) {
  return (
    <fieldset className={`radio-group ${className}`.trim()} {...props}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { name, value, onChange });
      })}
    </fieldset>
  );
};

export const Switch = forwardRef(function Switch({
  label,
  className = '',
  id: providedId,
  disabled,
  ...props
}, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;

  return (
    <label className={`switch ${className}`.trim()}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className="switch-input"
        disabled={disabled}
        {...props}
      />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
});

Switch.displayName = 'Switch';

export const FileUpload = forwardRef(function FileUpload({
  label = 'Upload file',
  accept,
  multiple,
  className = '',
  onChange,
  disabled,
  ...props
}, ref) {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleFileChange = (event) => {
    if (onChange) onChange(event);
  };

  return (
    <label className={`file-upload ${className}`.trim()} onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <span aria-hidden="true">{label}</span>
    </label>
  );
});

FileUpload.displayName = 'FileUpload';