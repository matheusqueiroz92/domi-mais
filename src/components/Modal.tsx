import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import clsx from 'clsx';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  showCloseButton?: boolean;
  autoClose?: number; // milliseconds
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  showCloseButton = true,
  autoClose,
}: ModalProps) {
  useEffect(() => {
    if (isOpen && autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={clsx('modal', `modal--${type}`)}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', duration: 0.3 }}
            onClick={(event) => event.stopPropagation()}
          >
            {title && <h2 className="modal__title">{title}</h2>}
            <div className="modal__content">{children}</div>
            {showCloseButton && onClose && (
              <button type="button" className="modal__close" onClick={onClose}>
                Fechar
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

