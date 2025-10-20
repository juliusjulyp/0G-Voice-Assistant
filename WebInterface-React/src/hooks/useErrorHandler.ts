import { useCallback } from 'react';
import { env } from '../config/env';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  reportError?: boolean;
  context?: string;
}

export const useErrorHandler = (
  addNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
) => {
  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      logToConsole = true,
      reportError = env.ENABLE_ERROR_REPORTING,
      context = 'Unknown'
    } = options;

    // Normalize error
    const normalizedError = error instanceof Error 
      ? error 
      : new Error(String(error));

    // Log to console if enabled
    if (logToConsole && env.ENABLE_DEBUG_MODE) {
      console.group(`🚨 Error in ${context}`);
      console.error('Error:', normalizedError);
      console.error('Stack:', normalizedError.stack);
      console.groupEnd();
    }

    // Show notification if enabled and handler is provided
    if (showNotification && addNotification) {
      const message = normalizedError.message || 'An unexpected error occurred';
      addNotification(message, 'error');
    }

    // Report error if enabled
    if (reportError) {
      reportErrorToService(normalizedError, context);
    }

    return normalizedError;
  }, [addNotification]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
};

// Error reporting service
const reportErrorToService = (error: Error, context: string) => {
  // In a real app, send to error reporting service
  const errorReport = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: localStorage.getItem('userId') || 'anonymous',
  };

  if (env.ENABLE_DEBUG_MODE) {
    console.log('Error report:', errorReport);
  }

  // Example: Send to error reporting service
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorReport)
  // }).catch(console.error);
};

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = (
  addNotification?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void
) => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    if (env.ENABLE_DEBUG_MODE) {
      console.group('🚨 Unhandled Promise Rejection');
      console.error('Error:', error);
      console.groupEnd();
    }

    if (addNotification) {
      addNotification('An unexpected error occurred', 'error');
    }

    if (env.ENABLE_ERROR_REPORTING) {
      reportErrorToService(error, 'Unhandled Promise Rejection');
    }

    // Prevent default browser error reporting
    event.preventDefault();
  });

  // Handle general JavaScript errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);

    if (env.ENABLE_DEBUG_MODE) {
      console.group('🚨 Global JavaScript Error');
      console.error('Error:', error);
      console.error('Source:', event.filename, ':', event.lineno, ':', event.colno);
      console.groupEnd();
    }

    if (addNotification) {
      addNotification('An unexpected error occurred', 'error');
    }

    if (env.ENABLE_ERROR_REPORTING) {
      reportErrorToService(error, 'Global JavaScript Error');
    }
  });
};