"use client";

import {
  Calendar,
  CreditCard,
  Copy,
  Mail,
  Banknote,
  Ticket,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Booking } from "./types";
import { StatusBadge } from "./Badges";

interface Props {
  booking: Booking;
  onClose: () => void;
  onSendConfirmation?: (b: Booking) => void;
  onCancel?: (b: Booking) => void;
}

function Row({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <span className="flex items-center gap-2 text-slate-500 ">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium text-slate-900 ">{value}</span>
    </div>
  );
}

export default function BookingDetails({
  booking: b,
  onClose,
  onSendConfirmation,
  onCancel,
}: Props) {
  const ic = 14;
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!paymentOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPaymentOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paymentOpen]);

  return (
    <>
      <aside className="rounded-xl bg-white p-5 ">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Booking Details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="text-violet-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-4 flex gap-3 border-b border-slate-200 pb-4 ">
          <span className="h-10 w-10 shrink-0 rounded-full bg-slate-300" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 ">
                {b.name}
              </span>
              <StatusBadge status={b.status} className="px-2 py-1" />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {b.email}
              <br />
              {b.phone}
            </p>
          </div>
        </div>

        <h3 className="mb-2 text-xs font-bold text-slate-900 ">
          Booking Information
        </h3>
        <Row icon={<Calendar size={ic} />} label="Event" value={b.event} />
        <Row icon={<Ticket size={ic} />} label="Booking Type" value={b.type} />
        <Row
          icon={<Users size={ic} />}
          label="Number of Guests"
          value={b.guests}
        />
        <Row
          icon={<CreditCard size={ic} />}
          label="Amount Paid"
          value={`₱${b.amount.toLocaleString()}`}
        />
        <Row
          icon={<Calendar size={ic} />}
          label="Booking Date"
          value={`${b.bookingDate} · ${b.bookingTime}`}
        />
        <Row
          icon={<Wallet size={ic} />}
          label="Payment Method"
          value={b.paymentMethod}
        />

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-500 ">
            <Ticket size={ic} />
            Booking ID
          </span>
          <span className="flex min-w-30 items-center justify-between rounded-md bg-slate-100 px-2.5 py-2 font-medium text-slate-900 ">
            #{b.id}
            <button
              aria-label="Copy booking ID"
              onClick={() => navigator.clipboard?.writeText(`#${b.id}`)}
            >
              <Copy size={14} />
            </button>
          </span>
        </div>

        <hr className="my-4 border-slate-200 " />
        <h3 className="mb-2 text-xs font-bold text-slate-900 ">Actions</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setPaymentOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            <Banknote size={14} /> See Payment
          </button>
          <button
            onClick={() => onSendConfirmation?.(b)}
            className="flex items-center justify-center gap-2 rounded-lg border border-violet-500 bg-violet-50 py-2.5 text-xs font-semibold text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20"
          >
            <Mail size={14} /> Send Confirmation
          </button>
          <button
            onClick={() => onCancel?.(b)}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
          >
            <Trash2 size={14} /> Cancel Booking
          </button>
        </div>
      </aside>
      {paymentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPaymentOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-proof-title"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setPaymentOpen(false)}
              aria-label="Close payment proof"
              className="absolute right-3 top-3 rounded-full p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
            <h2
              id="payment-proof-title"
              className="mb-4 pr-8 text-base font-semibold text-slate-900"
            >
              {b.name}&apos;s Payment Screenshot
            </h2>
            {b.screenshotUrl ? (
              <img
                src={b.screenshotUrl}
                alt={`${b.name}'s payment screenshot`}
                className="mx-auto max-h-[75vh] w-full rounded-lg border border-slate-200 object-contain"
              />
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No payment screenshot has been submitted.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-zinc-500">Item</dt>
              <dd className="font-medium capitalize">
                {b.event} (₱{b.amount})
              </dd>
              <dt className="text-zinc-500">Guests</dt>
              <dd className="font-medium capitalize">{b.guests}</dd>
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium capitalize">{b.status}</dd>
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
