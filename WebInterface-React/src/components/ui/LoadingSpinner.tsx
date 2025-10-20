import React from 'react';
import { WithClassName } from '../../types';

interface LoadingSpinnerProps extends WithClassName {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'border-blue-500',
    secondary: 'border-gray-500',
    white: 'border-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <div className="relative">
        <div 
          className={`
            ${sizeClasses[size]} 
            border-2 
            ${colorClasses[color]} 
            border-t-transparent 
            rounded-full 
            animate-spin
          `}
        />
        <div 
          className={`
            absolute 
            inset-0 
            ${sizeClasses[size]} 
            border-2 
            border-transparent 
            border-t-current 
            rounded-full 
            animate-pulse
          `}
        />
      </div>
      {text && (
        <span className="text-sm text-gray-400 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;