"use client";

import { useState } from "react";
import { deleteProject } from "./new-project-actions";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm(`Delete "${projectName}"? This permanently removes its floorplans, models, and renders.`)) {
      return;
    }
    setPending(true);
    await deleteProject(projectId);
  }

  return (
    <Button type="button" variant="danger" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
