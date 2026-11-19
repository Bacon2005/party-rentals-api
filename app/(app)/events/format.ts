// format.ts
const TZ = "Asia/Manila";

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TZ,
  });

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });

export const formatTimeRange = (start: string, end: string) =>
  `${time(start)} - ${time(end)}`;


// ISO string -> "YYYY-MM-DDTHH:mm" in Manila time (for <input type="datetime-local">)
export function toInputValue(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// "YYYY-MM-DDTHH:mm" (Manila time) -> ISO string
export const fromInputValue = (v: string) =>
  new Date(`${v}:00+08:00`).toISOString();