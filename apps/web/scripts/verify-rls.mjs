// Cross-tenant RLS verification: proves (not just asserts) that user B
// cannot read or write user A's projects/uploads/models/renders or storage
// objects. Run with:
//   node --env-file=.env.local scripts/verify-rls.mjs
// from apps/web/. Requires NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY.
// Creates two throwaway auth users, runs assertions, then deletes
// everything it created — safe to run against a live project repeatedly.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const suffix = Date.now();
const userAEmail = `rls-test-a-${suffix}@openarchai.test`;
const userBEmail = `rls-test-b-${suffix}@openarchai.test`;
const password = `Test-${suffix}-!Aa1`;

const results = [];
function check(name, condition) {
  results.push({ name, pass: !!condition });
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}`);
}

async function signIn(email) {
  const client = createClient(url, publishableKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

let userAId, userBId, projectAId;

try {
  const { data: userA, error: errA } = await admin.auth.admin.createUser({
    email: userAEmail,
    password,
    email_confirm: true,
  });
  if (errA) throw new Error(errA.message);
  userAId = userA.user.id;

  const { data: userB, error: errB } = await admin.auth.admin.createUser({
    email: userBEmail,
    password,
    email_confirm: true,
  });
  if (errB) throw new Error(errB.message);
  userBId = userB.user.id;

  const clientA = await signIn(userAEmail);
  const clientB = await signIn(userBEmail);

  // --- Set up owned resources as user A ---
  const { data: project, error: projectErr } = await clientA
    .from("projects")
    .insert({ name: "rls-verify-project" })
    .select("id")
    .single();
  if (projectErr) throw new Error(`user A could not create own project: ${projectErr.message}`);
  projectAId = project.id;

  const { data: upload, error: uploadErr } = await clientA
    .from("uploads")
    .insert({ project_id: projectAId, storage_path: `${userAId}/${projectAId}/probe.png`, kind: "floorplan" })
    .select("id")
    .single();
  if (uploadErr) throw new Error(`user A could not create own upload: ${uploadErr.message}`);

  const { data: model, error: modelErr } = await clientA
    .from("models")
    .insert({ project_id: projectAId, upload_id: upload.id, status: "pending" })
    .select("id")
    .single();
  if (modelErr) throw new Error(`user A could not create own model: ${modelErr.message}`);

  const { error: renderErr } = await clientA
    .from("renders")
    .insert({ project_id: projectAId, model_id: model.id, status: "pending", prompt_style: "test" })
    .select("id")
    .single();
  if (renderErr) throw new Error(`user A could not create own render: ${renderErr.message}`);

  await clientA.storage
    .from("floorplans")
    .upload(`${userAId}/${projectAId}/probe.png`, new Blob([new Uint8Array([1, 2, 3])]));

  // --- Attempt cross-tenant access as user B ---
  const { data: bProjectRead } = await clientB.from("projects").select("id").eq("id", projectAId);
  check("user B cannot SELECT user A's project", (bProjectRead ?? []).length === 0);

  const { data: bUploadRead } = await clientB.from("uploads").select("id").eq("project_id", projectAId);
  check("user B cannot SELECT user A's uploads", (bUploadRead ?? []).length === 0);

  const { data: bModelRead } = await clientB.from("models").select("id").eq("project_id", projectAId);
  check("user B cannot SELECT user A's models", (bModelRead ?? []).length === 0);

  const { data: bRenderRead } = await clientB.from("renders").select("id").eq("project_id", projectAId);
  check("user B cannot SELECT user A's renders", (bRenderRead ?? []).length === 0);

  const { data: bInsertUpload, error: bInsertUploadErr } = await clientB
    .from("uploads")
    .insert({ project_id: projectAId, storage_path: "attacker/path.png", kind: "floorplan" })
    .select("id");
  check(
    "user B cannot INSERT an upload into user A's project",
    !!bInsertUploadErr || (bInsertUpload ?? []).length === 0,
  );

  const { data: bUpdateModel, error: bUpdateModelErr } = await clientB
    .from("models")
    .update({ status: "error" })
    .eq("id", model.id)
    .select("id");
  check(
    "user B cannot UPDATE user A's model",
    !!bUpdateModelErr || (bUpdateModel ?? []).length === 0,
  );

  const { data: bStorageRead, error: bStorageErr } = await clientB.storage
    .from("floorplans")
    .download(`${userAId}/${projectAId}/probe.png`);
  check("user B cannot download user A's storage object", !bStorageRead || !!bStorageErr);
} finally {
  // --- Cleanup: delete test users (cascades projects/uploads/models/renders via FK) ---
  if (projectAId) await admin.from("projects").delete().eq("id", projectAId);
  if (userAId) await admin.auth.admin.deleteUser(userAId);
  if (userBId) await admin.auth.admin.deleteUser(userBId);
  await admin.storage.from("floorplans").remove([`${userAId}/${projectAId}/probe.png`]).catch(() => {});
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error("RLS VERIFICATION FAILED");
  process.exit(1);
}
console.log("RLS verification passed — cross-tenant isolation confirmed.");
