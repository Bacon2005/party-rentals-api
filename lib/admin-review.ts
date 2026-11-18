import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { ID_BUCKET } from "@/lib/id-storage";
import type { IdSubmission } from "@/lib/id-validation";

export async function requireAdmin() {
  const {data:{user},error:authError} = await (await createClient()).auth.getUser();
  if (authError || !user?.email_confirmed_at) redirect("/login");
  const admin = createAdminClient();
  const {data,error} = await admin.from("profiles").select("is_admin").eq("id",user.id).single();
  if (error || data?.is_admin !== true) notFound();
  return {userId:user.id,admin};
}

export async function getReviewQueue() {
  // This authorization check is also the boundary for all signed URL creation.
  const {admin} = await requireAdmin();
  const {data:pending,error} = await admin.from("id_submissions").select("*").eq("status","pending")
    .order("created_at",{ascending:true}).limit(50).returns<IdSubmission[]>();
  if (error) throw new Error("Could not load review queue.");
  const {data:cleanup,error:cleanupError} = await admin.from("id_submissions").select("*").neq("status","pending")
    .not("file_path","is",null).order("created_at",{ascending:true}).limit(50).returns<IdSubmission[]>();
  if (cleanupError) throw new Error("Could not load deletion retries.");
  const ids = [...new Set((pending ?? []).map(s => s.user_id))];
  const {data:profiles,error:profileError} = ids.length ? await admin.from("profiles").select("id,name,date_of_birth")
    .in("id",ids).returns<{id:string;name:string;date_of_birth:string|null}[]>() : {data:[],error:null};
  if (profileError) throw new Error("Could not read account details.");
  const rows = await Promise.all((pending ?? []).map(async submission => {
    const profile = profiles?.find(p => p.id === submission.user_id);
    let signedUrl: string | null = null;
    if (submission.uploaded_at && submission.file_path) {
      const {data,error:signError} = await admin.storage.from(ID_BUCKET).createSignedUrl(submission.file_path,60);
      if (!signError) signedUrl = data.signedUrl;
    }
    // Do not serialize storage paths or service responses into the client form.
    return {id:submission.id,createdAt:submission.created_at,idType:submission.id_type,
      name:profile?.name ?? "Deleted account",dob:profile?.date_of_birth ?? "Missing DOB",
      uploaded:!!submission.uploaded_at,signedUrl};
  }));
  return {rows,cleanup:(cleanup ?? []).map(s => ({id:s.id,status:s.status,reviewedAt:s.reviewed_at}))};
}
