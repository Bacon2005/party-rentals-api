"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { deleteAccount } from "./actions";
import {
  cardClass,
  cardSubtitleClass,
  cardTitleClass,
  type FormState,
} from "./ui";

// Displays the account deletion action and confirmation dialog before submitting the destructive
// request to delete the signed-in user's account.
export default function DangerZone() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async () => deleteAccount(),
    null,
  );

  const openDialog = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    dialogRef.current?.showModal();
    setIsOpen(true);
  };

  const closeDialog = () => {
    if (pending) return;
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      dialogRef.current?.close();
      closeTimerRef.current = null;
    }, 180);
  };

  return (
    <section className={cardClass} aria-labelledby="danger-heading">
      <h2 id="danger-heading" className={cardTitleClass}>
        Danger Zone
      </h2>
      <p className={cardSubtitleClass}>
        Permanently delete your account and all data.
      </p>

      <button
        type="button"
        onClick={openDialog}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-300 bg-red-50 text-sm font-medium text-red-600 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-500"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete Account
      </button>

      {/* Native <dialog>: focus trap, Esc to close, and backdrop come built in. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        onClose={() => setIsOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current && !pending) closeDialog();
        }}
        className={[
          "m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border-color bg-background p-0 backdrop:bg-black/50",
          "origin-center transition-all duration-200 ease-out",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
        ].join(" ")}
      >
        <form action={formAction} className="p-6">
          <h3 id="delete-title" className="text-lg font-semibold text-black">
            Delete your account?
          </h3>
          <p id="delete-desc" className="mt-2 text-sm text-dashboard-text">
            This permanently deletes your profile, events, and bookings. You
            can&apos;t undo this.
          </p>

          {state && !state.ok && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {state.message}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={closeDialog}
              className="h-10 rounded-md border border-border-color px-4 text-sm font-medium text-black hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
