"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword } from "./actions";
import {
  cardClass,
  cardSubtitleClass,
  cardTitleClass,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  type FormState,
} from "./ui";

// Renders a single password field with a show/hide toggle and validation feedback.
function PasswordField({
  id,
  label,
  placeholder,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-dashboard-text hover:text-black focus-visible:outline-2 focus-visible:outline-form-button"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
}

// Presents the password-change form and submits the current and new password values to the
// server for validation and update.
export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePassword,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const errors = state?.fieldErrors ?? {};

  return (
    <section className={cardClass} aria-labelledby="password-heading">
      <h2 id="password-heading" className={cardTitleClass}>
        Change Password
      </h2>
      <p className={cardSubtitleClass}>Update your account password.</p>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 space-y-3"
        noValidate
      >
        <PasswordField
          id="currentPassword"
          label="Current Password"
          placeholder="Enter current password"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <PasswordField
          id="newPassword"
          label="New Password"
          placeholder="Enter new password"
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm New Password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          {state && !state.fieldErrors && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}
            >
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </section>
  );
}
