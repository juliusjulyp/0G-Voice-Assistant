import { useState, useCallback, useRef, useEffect } from 'react';
import { AsyncState } from '../types';

interface UseAsyncStateOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  resetOnNewRequest?: boolean;
}

export const useAsyncState = <T = unknown>(
  options: UseAsyncStateOptions<T> = {}
) => {
  const {
    initialData,
    onSuccess,
    onError,
    resetOnNewRequest = true
  } = options;

  const [state, setState] = useState<AsyncState<T>>(() => ({
    status: 'idle' as const,
    ...(initialData !== undefined && { data: initialData }),
    error: undefined,
    lastUpdated: undefined
  }));

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const setLoading = useCallback(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      status: 'loading',
      error: resetOnNewRequest ? undefined : prev.error
    }));

    return abortControllerRef.current.signal;
  }, [resetOnNewRequest]);

  const setSuccess = useCallback((data: T) => {
    setState({
      status: 'success',
      data,
      error: undefined,
      lastUpdated: Date.now()
    });
    
    if (onSuccess) {
      onSuccess(data);
    }
    
    abortControllerRef.current = null;
  }, [onSuccess]);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      error,
      lastUpdated: Date.now()
    }));
    
    if (onError) {
      onError(error);
    }
    
    abortControllerRef.current = null;
  }, [onError]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setState({
      status: 'idle',
      ...(initialData !== undefined && { data: initialData }),
      error: undefined,
      lastUpdated: undefined
    });
  }, [initialData]);

  const execute = useCallback(async <R = T>(
    asyncFunction: (signal: AbortSignal) => Promise<R>
  ): Promise<R | null> => {
    const signal = setLoading();
    
    try {
      const result = await asyncFunction(signal);
      setSuccess(result as unknown as T);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setSuccess, setError]);

  const mutate = useCallback((newData: T) => {
    setState(prev => ({
      ...prev,
      data: newData,
      lastUpdated: Date.now()
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Computed state
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    
    // Actions
    execute,
    setLoading,
    setSuccess,
    setError,
    reset,
    mutate,
    
    // Utils
    abort: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  };
};

// Specialized hook for API calls
export const useApiCall = <T = unknown>(
  apiFunction: (signal: AbortSignal, ...args: unknown[]) => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
) => {
  const asyncState = useAsyncState<T>(options);

  const call = useCallback((...args: unknown[]) => {
    return asyncState.execute((signal) => apiFunction(signal, ...args));
  }, [asyncState.execute, apiFunction]);

  return {
    ...asyncState,
    call
  };
};

// Hook for managing multiple async operations
export const useAsyncGroup = <T extends Record<string, unknown>>() => {
  const [states, setStates] = useState<Record<keyof T, AsyncState>>({} as Record<keyof T, AsyncState>);

  const updateState = useCallback((key: keyof T, state: Partial<AsyncState>) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...state }
    }));
  }, []);

  const setLoading = useCallback((key: keyof T) => {
    updateState(key, { status: 'loading', error: undefined });
  }, [updateState]);

  const setSuccess = useCallback((key: keyof T, data: unknown) => {
    updateState(key, { 
      status: 'success', 
      data, 
      error: undefined,
      lastUpdated: Date.now()
    });
  }, [updateState]);

  const setError = useCallback((key: keyof T, error: string) => {
    updateState(key, { 
      status: 'error', 
      error,
      lastUpdated: Date.now()
    });
  }, [updateState]);

  const isLoading = useCallback((key?: keyof T) => {
    if (key) {
      return states[key]?.status === 'loading';
    }
    return Object.values(states).some(state => state.status === 'loading');
  }, [states]);

  const hasError = useCallback((key?: keyof T) => {
    if (key) {
      return states[key]?.status === 'error';
    }
    return Object.values(states).some(state => state.status === 'error');
  }, [states]);

  const isSuccess = useCallback((key?: keyof T) => {
    if (key) {
      return states[key]?.status === 'success';
    }
    return Object.values(states).every(state => state.status === 'success');
  }, [states]);

  return {
    states,
    setLoading,
    setSuccess,
    setError,
    isLoading,
    hasError,
    isSuccess,
    getData: (key: keyof T) => states[key]?.data,
    getError: (key: keyof T) => states[key]?.error
  };
};