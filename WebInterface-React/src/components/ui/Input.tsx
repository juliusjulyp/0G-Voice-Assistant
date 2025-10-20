import React, { forwardRef, useState } from 'react';
import { WithClassName } from '../../types';
import { useAccessibility } from '../../hooks/useAccessibility';

interface InputProps extends WithClassName {
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  error?: string;
  helperText?: string;
  label?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outline';
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  readOnly = false,
  autoFocus = false,
  autoComplete,
  id,
  name,
  ariaLabel,
  ariaDescribedBy,
  error,
  helperText,
  label,
  hideLabel = false,
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  onRightIconClick,
  maxLength,
  minLength,
  pattern,
  className = '',
  ...props
}, ref) => {
  const { generateId, getAriaProps } = useAccessibility();
  const [, setIsFocused] = useState(false);
  
  const inputId = id || generateId('input');
  const errorId = error ? generateId('error') : undefined;
  const helperTextId = helperText ? generateId('helper') : undefined;
  
  const describedByIds = [
    ariaDescribedBy,
    errorId,
    helperTextId
  ].filter(Boolean).join(' ');

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-base';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getVariantClasses = () => {
    const baseClasses = 'border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'filled':
        return `${baseClasses} bg-gray-100 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500`;
      case 'outline':
        return `${baseClasses} bg-transparent border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
      case 'default':
      default:
        return `${baseClasses} bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
    }
  };

  const getStateClasses = () => {
    if (error) {
      return 'border-red-500 focus:border-red-500 focus:ring-red-500';
    }
    if (disabled) {
      return 'opacity-50 cursor-not-allowed bg-gray-50';
    }
    if (readOnly) {
      return 'bg-gray-50 cursor-default';
    }
    return '';
  };

  const inputClasses = [
    'w-full',
    getSizeClasses(),
    getVariantClasses(),
    getStateClasses(),
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
    className
  ].filter(Boolean).join(' ');

  const finalLabel = ariaLabel || (hideLabel ? label : undefined);
  const ariaProps = getAriaProps({
    ...(finalLabel && { label: finalLabel }),
    ...(describedByIds && { describedBy: describedByIds }),
    required,
    invalid: !!error,
    disabled
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  const handleFocus = (_: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = (_: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  const renderIcon = (icon: string, position: 'left' | 'right') => {
    const iconClasses = [
      'absolute top-1/2 transform -translate-y-1/2',
      'text-gray-400',
      position === 'left' ? 'left-3' : 'right-3',
      onRightIconClick && position === 'right' ? 'cursor-pointer hover:text-gray-600' : ''
    ].filter(Boolean).join(' ');

    return (
      <i
        className={`fas fa-${icon} ${iconClasses}`}
        onClick={position === 'right' && onRightIconClick ? onRightIconClick : undefined}
        aria-hidden="true"
        role={onRightIconClick && position === 'right' ? 'button' : undefined}
        tabIndex={onRightIconClick && position === 'right' ? 0 : undefined}
      />
    );
  };

  return (
    <div className="w-full">
      {label && !hideLabel && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium mb-1 ${
            error ? 'text-red-700' : 'text-gray-700'
          } ${required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && renderIcon(leftIcon, 'left')}
        
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          {...ariaProps}
          {...props}
        />
        
        {rightIcon && renderIcon(rightIcon, 'right')}
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <i className="fas fa-exclamation-circle mr-1" aria-hidden="true" />
          {error}
        </p>
      )}

      {helperText && !error && (
        <p
          id={helperTextId}
          className="mt-1 text-sm text-gray-600"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;