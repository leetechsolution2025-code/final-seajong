import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        width: '100%',
      }}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!checked);
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        style={{
          width: '38px',
          height: '20px',
          borderRadius: '9999px',
          backgroundColor: checked ? 'var(--color-primary, #0284c7)' : '#cbd5e1',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          position: 'relative',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          padding: '2px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform 0.15s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
          }}
        />
      </div>

      {(label || description) && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {label && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
              {label}
            </span>
          )}
          {description && (
            <span style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '2px', lineHeight: 1.2 }}>
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};

export default Toggle;
