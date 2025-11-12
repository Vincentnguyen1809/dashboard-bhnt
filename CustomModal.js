/**
 * CustomModal Component
 * A modern, reusable modal dialog with dark theme styling
 *
 * Props:
 * - isOpen: Boolean - Controls modal visibility
 * - onClose: Function - Called when modal should close
 * - title: String - Modal title/heading
 * - message: String - Modal content/message
 * - onConfirm: Function - Called when user clicks Confirm
 * - confirmText: String - Confirm button text (default: "Confirm")
 * - cancelText: String - Cancel button text (default: "Cancel")
 * - confirmColor: String - Confirm button color (default: "teal")
 * - showCancel: Boolean - Show cancel button (default: true)
 */

import React, { useEffect } from 'react';

const CustomModal = ({
  isOpen = false,
  onClose,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'teal',
  showCancel = true
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click (click outside modal)
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle confirm click
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Confirm button color styles
  const confirmButtonColors = {
    teal: {
      bg: '#14b8a6',
      hover: '#0d9488',
      focus: '#0f766e'
    },
    cyan: {
      bg: '#06b6d4',
      hover: '#0891b2',
      focus: '#0e7490'
    },
    blue: {
      bg: '#3b82f6',
      hover: '#2563eb',
      focus: '#1d4ed8'
    },
    red: {
      bg: '#ef4444',
      hover: '#dc2626',
      focus: '#b91c1c'
    },
    green: {
      bg: '#10b981',
      hover: '#059669',
      focus: '#047857'
    }
  };

  const selectedColor = confirmButtonColors[confirmColor] || confirmButtonColors.teal;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxWidth: '500px',
          width: '100%',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#ffffff',
              lineHeight: '1.5'
            }}
          >
            {title}
          </h3>

          {/* Close button (X) */}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#334155';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          className="modal-body"
          style={{
            padding: '1.5rem',
            color: '#e2e8f0',
            fontSize: '1rem',
            lineHeight: '1.6'
          }}
        >
          {message}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '1.5rem',
            borderTop: '1px solid #334155',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}
        >
          {/* Cancel Button */}
          {showCancel && (
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#475569',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#64748b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#475569';
              }}
            >
              {cancelText}
            </button>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: selectedColor.bg,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = selectedColor.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = selectedColor.bg;
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CustomModal;
