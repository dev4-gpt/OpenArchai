import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "./new-project-actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <form action={createProject} className="flex gap-2">
        <input
          name="name"
          placeholder="New project name"
          required
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button className="rounded bg-black px-4 py-2 text-sm font-medium text-white">
          Create
        </button>
      </form>

      <ul className="divide-y rounded border">
        {projects?.length ? (
          projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/${project.id}`}
                className="block px-4 py-3 text-sm hover:bg-gray-50"
              >
                {project.name}
              </Link>
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-sm text-gray-500">
            No projects yet — create one above.
          </li>
        )}
      </ul>
    </div>
  );
}
