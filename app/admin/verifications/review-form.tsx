"use client";
import { useActionState } from "react";
import { REJECT_REASONS } from "@/lib/id-validation";
import {
  reviewSubmission,
  retryImageDeletion,
  discardAdminUpload,
} from "./actions";

export function ReviewForm({
  id,
  decision,
}: {
  id: string;
  decision: "approved" | "rejected";
}) {
  const [state, action, pending] = useActionState(reviewSubmission, {
    message: "",
  });
  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="submissionId" value={id} />
      <input type="hidden" name="decision" value={decision} />
      {decision === "approved" ? (
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="confirmReview" required />
          <span>
            I checked that the ID name matches the account, the photo is readable,
            and any DOB shown matches the account DOB. For a student ID without
            DOB, age relies on the entered DOB.
          </span>
        </label>
      ) : (
        <label className="block text-sm">
          Rejection reason
          <select
            name="reason"
            required
            className="mt-1 block w-full border p-2"
          >
            <option value="">Choose a reason</option>
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-form-button px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : decision === "approved" ? "Approve" : "Reject"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function CleanupForm({
  id,
  incomplete = false,
}: {
  id: string;
  incomplete?: boolean;
}) {
  const [state, action, pending] = useActionState(
    incomplete ? discardAdminUpload : retryImageDeletion,
    { message: "" },
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="submissionId" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border px-4 py-2 disabled:opacity-50"
      >
        {incomplete
          ? "Discard interrupted upload (after 10 min)"
          : "Retry image deletion"}
      </button>
      <p role="status">{state.message}</p>
    </form>
  );
}
