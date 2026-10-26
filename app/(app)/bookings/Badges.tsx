import type { BookingKind, BookingStatus } from "./types";

const base =
  "inline-block whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-medium";

const kindStyles: Record<BookingKind, string> = {
  vip: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  table: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  general:
    "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
};

const statusStyles: Record<BookingStatus, string> = {
  Confirmed:
    "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300",
  Pending:
    "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
  Cancelled: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
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
