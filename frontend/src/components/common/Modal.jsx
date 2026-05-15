import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  position = 'center',
  backdrop = true,
  className = ''
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen && !backdrop) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, backdrop]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full'
  };

  const positions = {
    center: 'justify-center items-center',
    top: 'justify-center items-start pt-20',
    bottom: 'justify-center items-end pb-20'
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className={clsx('flex min-h-screen p-4', positions[position])}>
        {backdrop &&
        <div
          className="fixed inset-0 bg-black/50"
          onClick={onClose} />

        }

        <div
          ref={modalRef}
          className={clsx(
            'relative w-full border border-gray-300 bg-white',
            sizes[size],
            className
          )}>
          
          {(title || showClose) &&
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              {title &&
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            }
              {showClose &&
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              
                  <X className="h-5 w-5" />
                </button>
            }
            </div>
          }

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;