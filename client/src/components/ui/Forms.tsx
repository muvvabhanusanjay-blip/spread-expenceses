import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { IconType } from '../../lib/categories';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, htmlFor, className = '', children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <div className="field-head">
          <label className="field-label" htmlFor={htmlFor}>{label}</label>
          {hint && <span className="field-hint">{hint}</span>}
        </div>
      )}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  icon?: IconType;
  prefix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon: Icon, prefix, className = '', ...props },
  ref
) {
  if (!Icon && !prefix) {
    return <input ref={ref} className={`input ${className}`} {...props} />;
  }
  return (
    <div className={`input-wrap ${className}`}>
      {Icon && (
        <span className="input-icon">
          <Icon size={17} />
        </span>
      )}
      {prefix && <span className="input-prefix">{prefix}</span>}
      <input
        ref={ref}
        className={`input ${Icon ? 'has-icon' : ''} ${prefix ? 'has-prefix' : ''}`}
        {...props}
      />
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select ref={ref} className={`select ${className}`} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...props },
  ref
) {
  return <textarea ref={ref} className={`textarea ${className}`} {...props} />;
});
