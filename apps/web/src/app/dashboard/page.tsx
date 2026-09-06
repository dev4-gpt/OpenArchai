import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "./new-project-actions";
import { DeleteProjectButton } from "./delete-project-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted">Upload a floorplan to reconstruct and render it.</p>
      </div>

      <form action={createProject} className="flex gap-2">
        <Input name="name" placeholder="New project name" required />
        <Button type="submit" variant="primary" className="shrink-0">
          Create
        </Button>
      </form>

      {projects?.length ? (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.id}
              className="group flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/40"
            >
              <Link href={`/dashboard/${project.id}`} className="flex-1 text-sm font-medium">
                {project.name}
              </Link>
              <div className="opacity-0 transition-opacity group-hover:opacity-100">
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          No projects yet — create one above.
        </p>
      )}
    </div>
  );
}
