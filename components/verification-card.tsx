import Link from "next/link";

export function VerificationCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10 sm:p-8">
        <Link href="/dashboard" className="text-sm font-bold text-active">
          Party Link
        </Link>
        {children}
      </div>
    </main>
  );
}
