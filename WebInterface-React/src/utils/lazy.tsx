import React, { Suspense, ComponentType } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Higher-order component for lazy loading with error boundaries
export const withLazyLoading = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWrapperProps = {}
) => {
  const LazyComponent = React.lazy(importFunc);

  const WrappedComponent: React.FC<P> = (props) => {
    const {
      fallback = (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner size="md" text="Loading component..." />
        </div>
      ),
      errorFallback,
      onError
    } = options;

    const errorBoundaryProps = {
      fallback: errorFallback,
      ...(onError && { onError })
    };

    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Suspense fallback={fallback}>
          <LazyComponent {...(props as any)} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  // Copy static properties and displayName
  const componentName = (LazyComponent as any).displayName || (LazyComponent as any).name || 'Component';
  WrappedComponent.displayName = `LazyLoaded(${componentName})`;
  
  return WrappedComponent;
};

// Preload function for eager loading
export const preloadComponent = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  return importFunc();
};

// Hook for component preloading
export const usePreloadComponent = (
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  trigger: 'hover' | 'focus' | 'visible' | 'immediate' = 'hover'
) => {
  const [preloaded, setPreloaded] = React.useState(false);

  const preload = React.useCallback(() => {
    if (!preloaded) {
      importFunc().then(() => {
        setPreloaded(true);
      });
    }
  }, [importFunc, preloaded]);

  React.useEffect(() => {
    if (trigger === 'immediate') {
      preload();
    }
  }, [trigger, preload]);

  const getPreloadProps = () => {
    switch (trigger) {
      case 'hover':
        return { onMouseEnter: preload };
      case 'focus':
        return { onFocus: preload };
      case 'visible':
        // This would need intersection observer implementation
        return {};
      default:
        return {};
    }
  };

  return {
    preload,
    preloaded,
    preloadProps: getPreloadProps()
  };
};

// Lazy route component wrapper
export const LazyRoute: React.FC<{
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  props?: Record<string, unknown>;
}> = ({ importFunc, fallback, props = {} }) => {
  const LazyComponent = React.lazy(importFunc);

  return (
    <Suspense 
      fallback={
        fallback || (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="lg" text="Loading page..." />
          </div>
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Bundle splitting utilities
export const createAsyncComponent = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>
) => {
  const AsyncComponent = React.lazy(importFunc);
  
  const Component = ({ fallback, ...props }: P & { fallback?: React.ReactNode }) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <AsyncComponent {...(props as any)} />
    </Suspense>
  );

  Component.displayName = 'AsyncComponent';
  (Component as any).preload = importFunc;

  return Component;
};

// Resource preloading
export const preloadResources = {
  component: (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
    // Add to module cache
    importFunc();
  },
  
  route: (routePath: string) => {
    // Prefetch route
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);
  },
  
  image: (src: string) => {
    const img = new Image();
    img.src = src;
  },
  
  css: (href: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'style';
    document.head.appendChild(link);
  }
};

export default withLazyLoading;