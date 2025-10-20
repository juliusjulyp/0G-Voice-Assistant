import React, { forwardRef } from 'react';
import { WithClassName, PropsWithLoading } from '../../types';
import LoadingSpinner from './LoadingSpinner';
import { useAccessibility } from '../../hooks/useAccessibility';

interface ButtonProps extends WithClassName, PropsWithLoading {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  autoFocus?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  type = 'button',
  className = '',
  loading = false,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  autoFocus = false,
  ...props
}, ref) => {
  const { getAriaProps, handleKeyboardNavigation } = useAccessibility();

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'outline':
        return 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500';
      case 'ghost':
        return 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    }
  };

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

  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'border border-transparent',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-95 transform transition-transform',
    fullWidth ? 'w-full' : '',
    getVariantClasses(),
    getSizeClasses(),
    className
  ].filter(Boolean).join(' ');

  const ariaProps = getAriaProps({
    ...(ariaLabel && { label: ariaLabel }),
    ...(ariaDescribedBy && { describedBy: ariaDescribedBy }),
    disabled: disabled || loading
  });

  const handleClick = () => {
    if (!loading && !disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    handleKeyboardNavigation(event.nativeEvent, {
      onEnter: handleClick,
      onSpace: handleClick
    });
  };

  const renderIcon = (position: 'left' | 'right') => {
    if (!icon || iconPosition !== position) return null;
    
    return (
      <i 
        className={`fas fa-${icon} ${
          position === 'left' ? 'mr-2' : 'ml-2'
        }`}
        aria-hidden="true"
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <LoadingSpinner size="sm" color="white" />
          <span className="ml-2" aria-live="polite">
            Loading...
          </span>
        </>
      );
    }

    return (
      <>
        {renderIcon('left')}
        {children}
        {renderIcon('right')}
      </>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
      className={baseClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      autoFocus={autoFocus}
      {...ariaProps}
      {...props}
    >
      {renderContent()}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;