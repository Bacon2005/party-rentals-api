import {
  Calendar,
  CreditCard,
  Copy,
  Mail,
  Pencil,
  Ticket,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Booking } from "./types";
import { StatusBadge } from "./Badges";

interface Props {
  booking: Booking;
  onClose: () => void;
  onEdit?: (b: Booking) => void;
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
      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

export default function BookingDetails({
  booking: b,
  onClose,
  onEdit,
  onSendConfirmation,
  onCancel,
}: Props) {
  const ic = 14;
  return (
    <aside className="rounded-xl bg-white p-5 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
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

      <div className="my-4 flex gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <span className="h-10 w-10 shrink-0 rounded-full bg-slate-300" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
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

      <h3 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">
        Booking Information
      </h3>
      <Row icon={<Calendar size={ic} />} label="Event" value={b.event} />
      <Row
        icon={<Calendar size={ic} />}
        label="Date & Time"
        value={`${b.eventDate} · ${b.eventTime}`}
      />
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
        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Ticket size={ic} />
          Booking ID
        </span>
        <span className="flex min-w-30 items-center justify-between rounded-md bg-slate-100 px-2.5 py-2 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          #{b.id}
          <button
            aria-label="Copy booking ID"
            onClick={() => navigator.clipboard?.writeText(`#${b.id}`)}
          >
            <Copy size={14} />
          </button>
        </span>
      </div>

      <hr className="my-4 border-slate-200 dark:border-slate-800" />
      <h3 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">
        Actions
      </h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onEdit?.(b)}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-xs font-semibold text-white hover:bg-violet-700"
        >
          <Pencil size={14} /> Edit Booking
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
  );
}
