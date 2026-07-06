/**
 * Modal Component
 * Reusable modal dialog with overlay, title, body content (children), and action buttons.
 * Supports confirm/cancel patterns. Accessible with focus trap and Escape key close.
 * Accepts isOpen, onClose, title, children, actions props.
 * @module Modal
 */

import { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Modal component for rendering a dialog overlay with title, body, and action buttons.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when the modal is closed (overlay click, Escape key, or close button)
 * @param {string} [props.title] - Optional modal title displayed in the header
 * @param {React.ReactNode} props.children - Modal body content
 * @param {Array<{label: string, onClick: Function, variant?: 'primary' | 'secondary' | 'danger', disabled?: boolean}>} [props.actions] - Array of action button configurations
 * @param {string} [props.size='md'] - Modal size: 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} [props.closeOnOverlayClick=true] - Whether clicking the overlay closes the modal
 * @param {boolean} [props.showCloseButton=true] - Whether to show the X close button in the header
 * @param {string} [props.className] - Additional CSS classes for the modal panel
 * @returns {React.ReactElement|null} The modal component or null if not open
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size,
  closeOnOverlayClick,
  showCloseButton,
  className,
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const effectiveSize = size || 'md';
  const effectiveCloseOnOverlay = closeOnOverlayClick !== false;
  const effectiveShowClose = showCloseButton !== false;

  /**
   * Returns the Tailwind max-width class for the given size.
   * @param {string} sz - The size variant
   * @returns {string} Tailwind max-width class
   */
  const getSizeClass = (sz) => {
    switch (sz) {
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'md':
      default:
        return 'max-w-lg';
    }
  };

  /**
   * Returns the Tailwind classes for a button variant.
   * @param {'primary' | 'secondary' | 'danger'} variant - The button variant
   * @returns {string} Tailwind CSS classes
   */
  const getButtonClasses = (variant) => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500';
      case 'danger':
        return 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500';
      case 'secondary':
      default:
        return 'bg-white text-brand-gray-700 border border-brand-gray-200 hover:bg-brand-gray-50 focus:ring-brand-500';
    }
  };

  /**
   * Handles Escape key press to close the modal.
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Handles overlay click to close the modal.
   * @param {React.MouseEvent} e - The mouse event
   */
  const handleOverlayClick = useCallback(
    (e) => {
      if (effectiveCloseOnOverlay && e.target === e.currentTarget) {
        onClose();
      }
    },
    [effectiveCloseOnOverlay, onClose]
  );

  /**
   * Traps focus within the modal when open.
   */
  const handleFocusTrap = useCallback(
    (e) => {
      if (!modalRef.current || e.key !== 'Tab') {
        return;
      }

      const focusableElements = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    },
    []
  );

  // Manage focus and body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus the modal panel after render
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 0);

      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = '';

      // Restore focus to the previously active element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Add keydown listeners for Escape and focus trap
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDownEvent = (e) => {
      handleKeyDown(e);
      handleFocusTrap(e);
    };

    document.addEventListener('keydown', handleKeyDownEvent);
    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [isOpen, handleKeyDown, handleFocusTrap]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        className={`relative z-50 w-full ${getSizeClass(effectiveSize)} bg-white rounded-lg shadow-xl transform transition-all ${className ? ` ${className}` : ''}`}
      >
        {/* Header */}
        {(title || effectiveShowClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-200">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-brand-gray-900 truncate"
              >
                {title}
              </h2>
            )}
            {!title && <div />}
            {effectiveShowClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-brand-gray-400 hover:text-brand-gray-600 hover:bg-brand-gray-100 transition-colors flex-shrink-0 ml-3"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {children}
        </div>

        {/* Footer with actions */}
        {Array.isArray(actions) && actions.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-brand-gray-200">
            {actions.map((action, index) => {
              const variant = action.variant || 'secondary';
              const isDisabled = action.disabled === true;

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={isDisabled}
                  className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonClasses(variant)}`}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
      disabled: PropTypes.bool,
    })
  ),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  closeOnOverlayClick: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  className: PropTypes.string,
};

Modal.defaultProps = {
  title: undefined,
  children: undefined,
  actions: undefined,
  size: 'md',
  closeOnOverlayClick: true,
  showCloseButton: true,
  className: undefined,
};