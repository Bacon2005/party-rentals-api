import { verifyUser } from "@/lib/auth";
import { signOut } from "./actions";
import { SummaryTotal } from "./summary-total";

export default async function Dashboard() {
  const profile = await verifyUser();

  return (
    <div className="w-full">
      <div className="mt-4 flex flex-col items-baseline justify-between">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p>Overview of your events, bookings, and performance.</p>
      </div>
      {/* Dashboard Components */}
      <div className="flex flex-col justify-between ">
        <SummaryTotal />
      </div>

      {/* Temp Signout */}
      <form action={signOut}>
        <span className="mr-4 text-neutral-500">
          {profile.email} · {profile.role} · {profile.name}
        </span>
        <button className="underline">Sign out</button>
      </form>
    </div>
  );
}
