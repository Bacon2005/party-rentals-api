"use client";
import { useActionState } from "react";
import { uploadId, discardInterruptedUpload } from "./actions";

export function UploadForm() {
  const [state,action,pending] = useActionState(uploadId,{message:""});
  return <form action={action} className="flex flex-col gap-4">
    <p className="text-sm text-neutral-500">The admin team manually reviews this image and deletes it right after review. Upload only the front of your ID. Name and photo must be clearly readable. You may cover ID numbers.</p>
    <label htmlFor="idType" className="font-bold">ID type</label>
    <select id="idType" name="idType" required className="border px-4 py-2"><option value="government">Government ID</option><option value="student">Student ID</option></select>
    <label htmlFor="image" className="font-bold">Front of ID (JPEG, PNG or WebP, up to 5 MB)</label>
    <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="border px-4 py-2" />
    {state.message && <p role="alert">{state.message}</p>}
    <button type="submit" disabled={pending} className="rounded-lg bg-form-button px-4 py-2 text-white disabled:opacity-50">{pending ? "Uploading…" : "Submit ID for review"}</button>
  </form>;
}
export function DiscardUploadForm({id}:{id:string}) {
  const [state,action,pending] = useActionState(discardInterruptedUpload,{message:""});
  return <form action={action} className="space-y-3"><input type="hidden" name="submissionId" value={id} />
    <p>An unfinished upload can be discarded after 10 minutes.</p>
    <button type="submit" disabled={pending} className="rounded-lg border px-4 py-2 disabled:opacity-50">Discard interrupted upload</button>
    <p role="status">{state.message}</p>
  </form>;
}
