import { type ReactNode, useEffect, useId, useRef } from "react";

/** Native <dialog>: focus trapping and Escape-to-close come from the browser. */
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
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      {open && (
        <div className="space-y-4 p-6">
          <h2 id={titleId} className="text-3xl">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
