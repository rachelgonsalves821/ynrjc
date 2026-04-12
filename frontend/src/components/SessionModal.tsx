import React, { useEffect } from "react";

export type SessionModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
};

/**
 * Modal shell for end-of-session summary (score, snippet, actions).
 */
export function SessionModal({
  open,
  title = "Session complete",
  onClose,
  children,
}: SessionModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="session-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="session-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="session-modal-header">
          <h2 id="session-modal-title">{title}</h2>
          <button type="button" className="session-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="session-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default SessionModal;
