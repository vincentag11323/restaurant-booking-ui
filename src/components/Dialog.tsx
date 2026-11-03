import { type ReactNode, useEffect, useId, useRef } from "react";

/**
 * Native <dialog> shown as a bottom sheet (thumb reach on phones).
 * Focus trapping and Escape-to-close come from the browser.
 */
export function Dialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="mx-auto mb-0 mt-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-card)] border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && (
        <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Focus starts on the title, so long sheets open at the top and screen readers announce them. */}
          <h2 id={titleId} className="text-3xl focus:outline-none" tabIndex={-1} autoFocus>
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
