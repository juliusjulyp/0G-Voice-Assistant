import React from 'react';
import { WithClassName } from '../../types';

interface SkeletonLoaderProps extends WithClassName {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width = '100%',
  height,
  lines = 1,
  animation = 'pulse',
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'card':
        return 'rounded-lg';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getAnimationClasses = () => {
    switch (animation) {
      case 'wave':
        return 'animate-wave';
      case 'pulse':
        return 'animate-pulse';
      case 'none':
      default:
        return '';
    }
  };

  const getDefaultHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text':
        return '1rem';
      case 'circular':
        return '3rem';
      case 'card':
        return '12rem';
      case 'rectangular':
      default:
        return '2rem';
    }
  };

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof getDefaultHeight() === 'number' ? `${getDefaultHeight()}px` : getDefaultHeight(),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`
              bg-gray-300 
              ${getVariantClasses()} 
              ${getAnimationClasses()}
            `}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : width // Make last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-gray-300 
        ${getVariantClasses()} 
        ${getAnimationClasses()} 
        ${className}
      `}
      style={skeletonStyle}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<WithClassName> = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <SkeletonLoader variant="circular" width={48} height={48} />
      <div className="flex-1">
        <SkeletonLoader variant="text" width="60%" height="1.25rem" className="mb-2" />
        <SkeletonLoader variant="text" width="40%" height="1rem" />
      </div>
    </div>
    <SkeletonLoader variant="text" lines={3} className="mb-4" />
    <div className="flex space-x-2">
      <SkeletonLoader variant="rectangular" width={80} height={32} />
      <SkeletonLoader variant="rectangular" width={80} height={32} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonLoader 
          key={`header-${index}`}
          variant="text" 
          width="100%" 
          height="1.5rem" 
          className="flex-1"
        />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLoader 
            key={`cell-${rowIndex}-${colIndex}`}
            variant="text" 
            width="100%" 
            height="1rem" 
            className="flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<WithClassName> = ({ className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center">
          <SkeletonLoader variant="circular" width={48} height={48} className="mr-4" />
          <div className="flex-1">
            <SkeletonLoader variant="text" width="60%" height="2rem" className="mb-2" />
            <SkeletonLoader variant="text" width="40%" height="1rem" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 6 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
        <SkeletonLoader variant="circular" width={40} height={40} />
        <div className="flex-1">
          <SkeletonLoader variant="text" width="70%" height="1.25rem" className="mb-2" />
          <SkeletonLoader variant="text" width="50%" height="1rem" />
        </div>
        <SkeletonLoader variant="rectangular" width={60} height={32} />
      </div>
    ))}
  </div>
);

export default SkeletonLoader;