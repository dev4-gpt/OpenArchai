"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "./new-project-actions";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm(`Delete "${projectName}"? This permanently removes its floorplans, models, and renders.`)) {
      return;
    }
    setPending(true);
    try {
      await deleteProject(projectId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="danger" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
