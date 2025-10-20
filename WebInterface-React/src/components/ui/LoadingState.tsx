import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { WithChildren, WithClassName } from '../../types';

interface LoadingStateProps extends WithClassName, WithChildren {
  loading: boolean;
  error?: string | null | undefined;
  empty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  loadingText?: string;
  retryAction?: () => void;
  skeleton?: React.ReactNode;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  error,
  empty = false,
  emptyMessage = 'No data available',
  errorMessage = 'An error occurred while loading data',
  loadingText = 'Loading...',
  retryAction,
  skeleton,
  children,
  className = ''
}) => {
  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-red-500 mb-4">
          <i className="fas fa-exclamation-triangle text-4xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          {typeof error === 'string' ? error : errorMessage}
        </p>
        {retryAction && (
          <button
            onClick={retryAction}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            <i className="fas fa-redo mr-2"></i>
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    if (skeleton) {
      return <div className={className}>{skeleton}</div>;
    }

    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" text={loadingText} />
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-4">
          <i className="fas fa-inbox text-4xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No data found
        </h3>
        <p className="text-gray-600 max-w-md">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Success state - render children
  return <div className={className}>{children}</div>;
};

// Higher-order component for async data loading
export const withLoadingState = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P & LoadingStateProps>((props, ref) => {
    const {
      loading,
      error,
      empty,
      emptyMessage,
      errorMessage,
      loadingText,
      retryAction,
      skeleton,
      className,
      ...componentProps
    } = props;

    const loadingStateProps = {
      loading,
      error,
      empty: empty || false,
      emptyMessage: emptyMessage || 'No data available',
      errorMessage: errorMessage || 'An error occurred while loading data',
      loadingText: loadingText || 'Loading...',
      className: className || '',
      ...(retryAction && { retryAction }),
      ...(skeleton && { skeleton })
    };

    return (
      <LoadingState {...loadingStateProps}>
        <Component {...(componentProps as P)} ref={ref} />
      </LoadingState>
    );
  });
};

export default LoadingState;