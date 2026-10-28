import type { BookingKind, BookingStatus } from "./types";

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium";

const kindStyles: Record<BookingKind, string> = {
  vip: "bg-violet-100 text-violet-700 ",
  table: "bg-sky-100 text-sky-700 ",
  general: "bg-orange-100 text-orange-700 ",
};

const statusStyles: Record<BookingStatus, string> = {
  Confirmed: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700 ",
  Cancelled: "bg-red-100 text-red-700 ",
};

export function TypeBadge({
  kind,
  label,
}: {
  kind: BookingKind;
  label: string;
}) {
  return <span className={`${base} ${kindStyles[kind]}`}>{label}</span>;
}

export function StatusBadge({
  status,
  className = "",
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <span className={`${base} ${statusStyles[status]} ${className}`}>
      {status}
    </span>
  );
}
