import { useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Dialog({ open, onClose, children, title, description, size = "md" }: DialogProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  // Rendered through a portal to <body>, deliberately.
  //
  // Several pages animate their root with `animate-fade-in`, whose keyframes
  // end on `transform: translateY(0)` with `forwards`. A non-none transform
  // makes that element the containing block for any `position: fixed` child —
  // so a dialog rendered inside such a page is trapped in that (tall, narrow)
  // container instead of the viewport: the backdrop dims only the content
  // column and the centred box lands far below the fold, off-screen. The
  // admin panel's delete dialog did exactly that. Portalling to body puts the
  // dialog above every transformed ancestor, where `fixed` means the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-2xl border border-dark-600 bg-dark-800 shadow-2xl animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
              {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 pt-4 border-t border-dark-600 mt-4 ${className}`}
    >
      {children}
    </div>
  );
}
