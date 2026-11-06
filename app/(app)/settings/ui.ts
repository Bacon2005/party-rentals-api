// Shared styling tokens used across the settings forms so cards, inputs, and buttons stay
// visually consistent throughout the page.
export const cardClass =
  "rounded-lg border border-border-color bg-background p-5";
export const cardTitleClass = "text-base font-semibold text-black";
export const cardSubtitleClass = "mt-0.5 text-sm text-dashboard-text";
export const labelClass = "mb-1 block text-xs text-dashboard-text";
export const inputClass =
  "h-10 w-full rounded-md border border-border-color bg-background px-3 text-sm text-black placeholder:text-dashboard-text/70 focus:border-form-button focus:outline-none focus:ring-2 focus:ring-form-button/20 disabled:cursor-not-allowed";
export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-form-button px-5 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-form-button disabled:cursor-not-allowed disabled:opacity-60";
export const errorTextClass = "mt-1 text-xs text-red-600";

export type FormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
} | null;
