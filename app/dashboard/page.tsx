import { verifyUser } from "@/lib/auth";
import { signOut } from "./actions";

export default async function Dashboard() {
  const profile = await verifyUser();

  return (
    <div className="flex">
      <h1>DashBoard</h1>

      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="text-4xl font-bold">Customers</h1>
        <form action={signOut}>
          <span className="mr-4 text-neutral-500">
            {profile.email} · {profile.role} · {profile.name}
          </span>
          <button className="underline">Sign out</button>
        </form>
      </div>
    </div>
  );
}
