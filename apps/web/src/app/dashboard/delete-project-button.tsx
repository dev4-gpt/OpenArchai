"use client";

import { useState } from "react";
import { deleteProject } from "./new-project-actions";

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
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="px-3 text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
