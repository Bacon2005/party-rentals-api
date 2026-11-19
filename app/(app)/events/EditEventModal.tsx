"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Event } from "./types";
import { updateEvent } from "./actions";
import { fromInputValue, toInputValue } from "./format";

interface Props {
  event: Event;
  onClose: () => void;
}

const field =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700";
const label = "block text-xs font-medium text-slate-600";

export default function EditEventModal({ event, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: event.name,
    description: event.description,
    location: event.location,
    startTime: toInputValue(event.startTime),
    endTime: toInputValue(event.endTime),
  });

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.endTime <= form.startTime) {
      setError("The end time must be after the start time.");
      return;
    }

    startTransition(async () => {
      const res = await updateEvent({
        eventId: event.id,
        name: form.name,
        description: form.description,
        location: form.location,
        startTime: fromInputValue(form.startTime),
        endTime: fromInputValue(form.endTime),
      });
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog itself (not its content) is a click on the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-full max-w-md rounded-xl bg-cards p-0 text-slate-900 backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold">Edit Event</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-violet-600 hover:text-violet-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className={label} htmlFor="ev-name">
            Event name
          </label>
          <input
            id="ev-name"
            required
            value={form.name}
            onChange={set("name")}
            disabled={isPending}
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="ev-desc">
            Description
          </label>
          <textarea
            id="ev-desc"
            rows={3}
            value={form.description}
            onChange={set("description")}
            disabled={isPending}
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="ev-loc">
            Location
          </label>
          <input
            id="ev-loc"
            required
            value={form.location}
            onChange={set("location")}
            disabled={isPending}
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="ev-start">
              Starts
            </label>
            <input
              id="ev-start"
              type="datetime-local"
              required
              value={form.startTime}
              onChange={set("startTime")}
              disabled={isPending}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="ev-end">
              Ends
            </label>
            <input
              id="ev-end"
              type="datetime-local"
              required
              value={form.endTime}
              onChange={set("endTime")}
              disabled={isPending}
              className={field}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
