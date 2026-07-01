"use client";

import { useTransition } from "react";
import { addTaskComment } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import type { TaskComment } from "@/lib/supabase/types";

export function TaskCommentThread({
  projectId,
  taskId,
  comments,
}: {
  projectId: string;
  taskId: string;
  comments: (TaskComment & { profiles?: { name: string } | null })[];
}) {
  const [isPending, startTransition] = useTransition();
  const action = addTaskComment.bind(null, projectId, taskId);

  return (
    <div className="space-y-4">
      <div className="max-h-56 space-y-3 overflow-y-auto">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{c.profiles?.name ?? "Someone"}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(c.created_at.slice(0, 10))}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
      <form
        action={(formData) => startTransition(() => action(formData))}
        className="flex gap-2"
      >
        <Textarea name="body" placeholder="Add a comment…" className="min-h-16" required />
        <Button type="submit" disabled={isPending} className="self-end">
          Post
        </Button>
      </form>
    </div>
  );
}
