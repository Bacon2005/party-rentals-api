import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getReviewQueue } from "@/lib/admin-review";
import { RefreshStatus } from "@/components/refresh-status";
import { ReviewForm, CleanupForm } from "./review-form";

async function Content() {
  await connection();
  const { rows, cleanup } = await getReviewQueue();
  return (
    <>
      <h1 className="text-3xl font-bold">ID review queue</h1>
      <p>
        Check the ID name against the account, confirm the photo is readable,
        and compare any DOB shown. Student IDs without a birth date rely on the
        entered DOB. No selfie or liveness check is performed.
      </p>
      <p className="text-sm">
        Image links expire in 60 seconds. Refresh the list if an image expires.
        Do not download or copy ID images.
      </p>
      <RefreshStatus />
      {cleanup.length > 0 && (
        <section className="space-y-3 rounded-lg border border-red-400 p-4">
          <h2 className="text-xl font-bold">Image deletion needs attention</h2>
          <p>These decisions were saved, but the images still need deletion.</p>
          {cleanup.map((s) => (
            <div key={s.id} className="border-t pt-3">
              <p>
                {s.status} · {s.reviewedAt}
              </p>
              <CleanupForm id={s.id} />
            </div>
          ))}
        </section>
      )}
      {rows.length === 0 && <p>No pending submissions.</p>}
      {rows.map((row) => (
        <article
          key={row.id}
          className="space-y-4 rounded-xl border bg-white p-5"
        >
          <h2 className="text-xl font-bold">{row.name}</h2>
          <p>
            Account DOB: {row.dob} ·{" "}
            {row.idType === "government" ? "Government ID" : "Student ID"}
          </p>
          <p>
            Submitted: <time dateTime={row.createdAt}>{row.createdAt}</time>
          </p>
          {row.signedUrl ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: private ID images must bypass Next image optimization and its persistent cache. */}
              <img
                src={row.signedUrl}
                alt="Submitted ID for manual review"
                referrerPolicy="no-referrer"
                className="max-h-96 max-w-full object-contain"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ReviewForm id={row.id} decision="approved" />
                <ReviewForm id={row.id} decision="rejected" />
              </div>
            </>
          ) : row.uploaded ? (
            <p role="alert">
              Image link could not be generated. Refresh to retry before
              reviewing.
            </p>
          ) : (
            <>
              <p>Upload has not finished. It cannot be reviewed yet.</p>
              <CleanupForm id={row.id} incomplete />
            </>
          )}
        </article>
      ))}
      <p className="text-sm">
        Showing the oldest 50 pending submissions and oldest 50 deletion
        retries. Complete them and refresh for the next batch.
      </p>
    </>
  );
}
export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <Link href="/dashboard" className="text-active underline">
        Party Link dashboard
      </Link>
      <Suspense fallback={<p>Loading review queue…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
