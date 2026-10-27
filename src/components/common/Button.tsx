import React, { forwardRef } from 'react';
import { ArrowRepeat } from 'react-bootstrap-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      icon,
      className = '',
      disabled,
      style,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const effectiveLeftIcon = leftIcon || icon;
    return (
      <button
        ref={ref}
        type={type}
        className={`btn btn-${variant} btn-${size} ${className}`}
        disabled={disabled || isLoading}
        style={{ fontFamily: "'Roboto Condensed', sans-serif", ...style }}
        {...props}
      >
        {isLoading ? (
          <ArrowRepeat size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin inline-block mr-1.5" />
        ) : (
          effectiveLeftIcon && <span className="inline-flex items-center mr-1.5">{effectiveLeftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="inline-flex items-center ml-1.5">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
