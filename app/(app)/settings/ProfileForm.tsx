"use client";

import { Camera } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile } from "./actions";
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

type Props = {
  name: string;
  email: string;
  phone: string | null;
  hostName: string | null;
  avatarUrl: string | null;
};

// Formats a stored Philippine mobile number into a display-friendly format for the form fields.
function formatPhone(value: string | null) {
  const m = value?.match(/^\+63(\d{3})(\d{3})(\d{4})$/);
  return m ? `+63 ${m[1]} ${m[2]} ${m[3]}` : (value ?? "");
}

// Displays the editable profile section, including contact details, host branding, and avatar
// upload handling, and submits the updated profile to the server action.
export default function ProfileForm({
  name,
  email,
  phone,
  hostName,
  avatarUrl,
}: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateProfile,
    null,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the temporary preview URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Once saved, the server-provided avatarUrl takes over from the local preview.
  useEffect(() => {
    if (state?.ok) {
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state]);

  // Validates and previews a newly selected image before the form submits it to the server.
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setClientError(null);
    if (!file) return setPreview(null);
    if (file.size > 2 * 1024 * 1024) {
      setClientError("Image must be 2 MB or smaller.");
      e.target.value = "";
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(file));
  }

  const shownAvatar = preview ?? avatarUrl;
  const errors = state?.fieldErrors ?? {};
  const avatarError = clientError ?? errors.avatar;

  return (
    <section className={cardClass} aria-labelledby="profile-heading">
      <h2 id="profile-heading" className={cardTitleClass}>
        Profile Information
      </h2>
      <p className={cardSubtitleClass}>
        Update your personal and host information.
      </p>

      <form action={formAction} className="mt-4" noValidate>
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="shrink-0">
            <div className="relative h-20 w-20 sm:mt-5 sm:h-20.5 sm:w-20.5">
              {shownAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownAvatar}
                  alt="Your profile photo"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-form-button/10 text-2xl font-semibold text-form-button">
                  {(name || email).charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border-color bg-background shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-form-button"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input
                ref={fileRef}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileChange}
                className="sr-only"
                tabIndex={-1}
              />
            </div>
            {avatarError && (
              <p className={`${errorTextClass} max-w-24`} role="alert">
                {avatarError}
              </p>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={name}
                autoComplete="name"
                aria-invalid={!!errors.name}
                className={inputClass}
              />
              {errors.name && <p className={errorTextClass}>{errors.name}</p>}
            </div>

            {/* Email stays read-only: it's the Supabase login identity. See SETUP.md. */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <input
                id="email"
                value={email}
                readOnly
                disabled
                className={`${inputClass} bg-slate-50 text-dashboard-text`}
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={formatPhone(phone)}
                placeholder="+63 917 123 4567"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                className={inputClass}
              />
              {errors.phone && <p className={errorTextClass}>{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="hostName" className={labelClass}>
                Host Name / Brand Name
              </label>
              <input
                id="hostName"
                name="hostName"
                defaultValue={hostName ?? ""}
                aria-invalid={!!errors.hostName}
                aria-describedby="hostName-hint"
                className={inputClass}
              />
              <p
                id="hostName-hint"
                className="mt-1 text-[11px] text-dashboard-text"
              >
                This name will be displayed to guests.
              </p>
              {errors.hostName && (
                <p className={errorTextClass}>{errors.hostName}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
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
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
