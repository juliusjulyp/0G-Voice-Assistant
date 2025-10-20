import { useEffect, useRef, useCallback } from 'react';

// Hook for managing focus
export const useFocusManagement = () => {
  const getFocusableElements = useCallback((container: HTMLElement = document.body) => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }

      if (event.key === 'Escape') {
        const closeButton = container.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
        closeButton?.click();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [getFocusableElements]);

  const restoreFocus = useCallback((element: HTMLElement) => {
    element?.focus();
  }, []);

  return {
    getFocusableElements,
    trapFocus,
    restoreFocus
  };
};

// Hook for screen reader announcements
export const useScreenReader = () => {
  const announcementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Create live region for screen reader announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('aria-relevant', 'text');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(liveRegion);
    announcementRef.current = liveRegion;

    return () => {
      if (liveRegion.parentNode) {
        liveRegion.parentNode.removeChild(liveRegion);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      // Clear first to ensure the message is announced even if it's the same
      announcementRef.current.textContent = '';
      // Use setTimeout to ensure the screen reader picks up the change
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      }, 10);
    }
  }, []);

  return { announce };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = () => {
  const handleKeyboardNavigation = useCallback((
    event: KeyboardEvent,
    options: {
      onEnter?: () => void;
      onSpace?: () => void;
      onEscape?: () => void;
      onArrowKeys?: {
        up?: () => void;
        down?: () => void;
        left?: () => void;
        right?: () => void;
      };
    }
  ) => {
    const { onEnter, onSpace, onEscape, onArrowKeys } = options;

    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter();
        }
        break;
      case ' ':
      case 'Space':
        if (onSpace) {
          event.preventDefault();
          onSpace();
        }
        break;
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'ArrowUp':
        if (onArrowKeys?.up) {
          event.preventDefault();
          onArrowKeys.up();
        }
        break;
      case 'ArrowDown':
        if (onArrowKeys?.down) {
          event.preventDefault();
          onArrowKeys.down();
        }
        break;
      case 'ArrowLeft':
        if (onArrowKeys?.left) {
          event.preventDefault();
          onArrowKeys.left();
        }
        break;
      case 'ArrowRight':
        if (onArrowKeys?.right) {
          event.preventDefault();
          onArrowKeys.right();
        }
        break;
    }
  }, []);

  return { handleKeyboardNavigation };
};

// Hook for ARIA attributes management
export const useAriaAttributes = () => {
  const generateId = useCallback((prefix = 'element') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getAriaProps = useCallback((
    options: {
      label?: string;
      describedBy?: string;
      expanded?: boolean;
      selected?: boolean;
      disabled?: boolean;
      required?: boolean;
      invalid?: boolean;
      live?: 'polite' | 'assertive' | 'off';
      role?: string;
      level?: number;
    } = {}
  ) => {
    const {
      label,
      describedBy,
      expanded,
      selected,
      disabled,
      required,
      invalid,
      live,
      role,
      level
    } = options;

    const ariaProps: Record<string, any> = {};

    if (label) ariaProps['aria-label'] = label;
    if (describedBy) ariaProps['aria-describedby'] = describedBy;
    if (expanded !== undefined) ariaProps['aria-expanded'] = expanded;
    if (selected !== undefined) ariaProps['aria-selected'] = selected;
    if (disabled !== undefined) ariaProps['aria-disabled'] = disabled;
    if (required !== undefined) ariaProps['aria-required'] = required;
    if (invalid !== undefined) ariaProps['aria-invalid'] = invalid;
    if (live) ariaProps['aria-live'] = live;
    if (role) ariaProps['role'] = role;
    if (level) ariaProps['aria-level'] = level;

    return ariaProps;
  }, []);

  return {
    generateId,
    getAriaProps
  };
};

// Hook for reduced motion support
export const useReducedMotion = () => {
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
    };

    // Set initial state
    if (mediaQuery.matches) {
      document.body.classList.add('reduce-motion');
    }

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return { prefersReducedMotion };
};

// Hook for color contrast and theme support
export const useColorScheme = () => {
  const prefersDarkScheme = useCallback(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  const prefersHighContrast = useCallback(() => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }, []);

  useEffect(() => {
    const darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleDarkSchemeChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        document.body.classList.add('dark-scheme');
      } else {
        document.body.classList.remove('dark-scheme');
      }
    };

    const handleHighContrastChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    };

    // Set initial state
    if (darkSchemeQuery.matches) {
      document.body.classList.add('dark-scheme');
    }
    if (highContrastQuery.matches) {
      document.body.classList.add('high-contrast');
    }

    // Listen for changes
    darkSchemeQuery.addEventListener('change', handleDarkSchemeChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      darkSchemeQuery.removeEventListener('change', handleDarkSchemeChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  return {
    prefersDarkScheme,
    prefersHighContrast
  };
};

// Combined accessibility hook
export const useAccessibility = () => {
  const focusManagement = useFocusManagement();
  const screenReader = useScreenReader();
  const keyboardNavigation = useKeyboardNavigation();
  const ariaAttributes = useAriaAttributes();
  const reducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();

  return {
    ...focusManagement,
    ...screenReader,
    ...keyboardNavigation,
    ...ariaAttributes,
    ...reducedMotion,
    ...colorScheme
  };
};