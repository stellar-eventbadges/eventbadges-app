import type { ReactNode } from 'react';

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  onChange: (value: string) => void;
  readonly hint?: ReactNode;
  readonly error?: string | null;
  readonly type?: 'text' | 'datetime-local';
  readonly inputMode?: 'numeric' | 'text';
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly mono?: boolean;
}

/**
 * A labelled input with its hint and error wired up through
 * `aria-describedby`/`aria-invalid`, so a screen reader reads the same
 * explanation the page shows. Labels wrap the control's own text, never a
 * placeholder standing in for a label.
 */
export function Field({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  type = 'text',
  inputMode = 'text',
  placeholder,
  required = false,
  disabled = false,
  mono = false,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint !== undefined ? hintId : null, error != null ? errorId : null]
      .filter((part): part is string => part !== null)
      .join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className={mono ? 'mono' : undefined}
        aria-invalid={error != null || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint !== undefined && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
      {error != null && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
