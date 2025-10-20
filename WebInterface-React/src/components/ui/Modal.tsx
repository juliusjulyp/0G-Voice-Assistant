import React, { useEffect, useRef } from 'react';
import { WithChildren, WithClassName } from '../../types';
import { useAccessibility } from '../../hooks/useAccessibility';
import Button from './Button';

interface ModalProps extends WithChildren, WithClassName {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabel,
  ariaDescribedBy,
  children,
  className = ''
}) => {
  const { trapFocus, restoreFocus, generateId, getAriaProps, announce } = useAccessibility();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = generateId('modal-title');
  const contentId = generateId('modal-content');

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening to screen readers
      announce(title ? `${title} dialog opened` : 'Dialog opened');
      
      // Set up focus trap
      if (modalRef.current) {
        return trapFocus(modalRef.current);
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previously focused element
      if (previouslyFocusedElement.current) {
        restoreFocus(previouslyFocusedElement.current);
      }
      
      // Announce modal closing
      announce('Dialog closed');
    }
    
    return undefined;
  }, [isOpen, title, trapFocus, restoreFocus, announce]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      default:
        return 'max-w-lg';
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const finalLabel = ariaLabel || title;
  const finalDescribedBy = ariaDescribedBy || (title ? titleId : contentId);
  const ariaProps = getAriaProps({
    ...(finalLabel && { label: finalLabel }),
    ...(finalDescribedBy && { describedBy: finalDescribedBy })
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative w-full ${getSizeClasses()} 
            bg-white rounded-lg shadow-xl 
            transform transition-all
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          {...ariaProps}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {title && (
                <h2 
                  id={titleId}
                  className="text-xl font-semibold text-gray-900"
                >
                  {title}
                </h2>
              )}
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  ariaLabel="Close dialog"
                  icon="times"
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <span className="sr-only">Close</span>
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div 
            id={contentId}
            className="p-6"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal components for common patterns
export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return 'fas fa-exclamation-triangle text-red-500';
      case 'warning':
        return 'fas fa-exclamation-triangle text-yellow-500';
      case 'info':
      default:
        return 'fas fa-info-circle text-blue-500';
    }
  };

  const getConfirmVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'primary';
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <i className={`${getIcon()} text-xl`} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-gray-700 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              variant={getConfirmVariant()}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Modal;