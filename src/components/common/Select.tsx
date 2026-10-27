import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  ariaLabel?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      options,
      children,
      className = '',
      id,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`form-group ${className}`}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
        )}
        <div className="select-container">
          {leftIcon && <span className="input-icon-prefix">{leftIcon}</span>}
          <select
            id={selectId}
            ref={ref}
            aria-label={ariaLabel || props['aria-label']}
            className={`form-select ${leftIcon ? 'has-prefix' : ''} ${
              error ? 'is-error' : ''
            }`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span className="select-arrow" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        {error ? (
          <span className="form-helper is-error">{error}</span>
        ) : helperText ? (
          <span
            className="form-helper"
            style={{
              display: 'block',
              marginTop: '4px',
              fontSize: '0.75rem',
              color: typeof helperText === 'string' && helperText.includes('Không có yêu cầu')
                ? '#64748b'
                : 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
