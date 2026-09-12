"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
) {
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  if (membership?.role !== "owner") throw new Error("Only the project owner can manage members");
}

export async function addProjectMember(projectId: string, email: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await requireOwner(supabase, projectId, user.id);

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) throw new Error("Email is required");

  const { data: memberUserId, error: lookupError } = await supabase.rpc("get_user_id_by_email", {
    lookup_email: trimmedEmail,
  });
  if (lookupError) throw new Error(lookupError.message);
  if (!memberUserId) throw new Error(`No account found for ${trimmedEmail} — they need to sign up first`);

  const { error: insertError } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: memberUserId, role: "editor" });
  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/dashboard/${projectId}`);
}

export async function removeProjectMember(projectId: string, memberUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await requireOwner(supabase, projectId, user.id);

  if (memberUserId === user.id) {
    const { count } = await supabase
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) throw new Error("Can't remove the last owner — transfer ownership first");
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${projectId}`);
}

export async function listProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_project_members", { target_project_id: projectId });
  if (error) throw new Error(error.message);
  return data as { user_id: string; email: string; role: "owner" | "editor"; created_at: string }[];
}
