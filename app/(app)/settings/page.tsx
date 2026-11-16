import { verifyUser } from "@/lib/auth"; // <-- adjust to wherever your auth file lives
import ChangePasswordForm from "./ChangePasswordForm";
import DangerZone from "./DangerZone";
import ProfileForm from "./ProfileForm";
import { Suspense } from "react";
import { SettingsContentSkeleton } from "@/components/Skeletons";
import { connection } from "next/server";

// Renders the main settings page, loading the current user and displaying the profile,
// password, and account-deletion sections in a single dashboard layout.
export default function SettingsPage() {
  return (
    <div className="rounded-xl bg-background p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-black">Settings</h1>
      <p className="mt-1 text-sm text-form-button/70">
        Manage your account, event preferences, and platform settings.
      </p>

      <Suspense fallback={<SettingsContentSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

// Dynamic part: verifyUser() reads cookies, so it must live inside <Suspense>.
async function SettingsContent() {
  await connection();
  const profile = await verifyUser();

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <ProfileForm
          name={profile.name}
          email={profile.email}
          phone={profile.phone}
          hostName={profile.hostName}
          avatarUrl={profile.avatarUrl}
        />
        {/* Notification Preferences card goes here later */}
      </div>

      <div className="space-y-6">
        <ChangePasswordForm />
        <DangerZone />
      </div>
    </div>
  );
}
