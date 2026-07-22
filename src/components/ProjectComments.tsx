'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PencilIcon, TrashIcon } from 'lucide-react';
import {
  createProjectComment,
  updateProjectComment,
  deleteProjectComment,
} from '@/lib/actions/project-comments';
import type { ProjectCommentWithAuthor } from '@/lib/supabase/types';

function CommentRow({
  comment,
  projectId,
  currentUserId,
  isAdmin,
}: {
  comment: ProjectCommentWithAuthor;
  projectId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [isPending, startTransition] = useTransition();

  const isOwner = comment.user_id === currentUserId;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  function save() {
    if (!draft.trim()) return;
    startTransition(async () => {
      try {
        await updateProjectComment(comment.id, projectId, draft);
        setEditing(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save comment',
        );
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteProjectComment(comment.id, projectId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete comment',
        );
      }
    });
  }

  return (
    <div className='space-y-1.5 rounded-md bg-background p-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-sm font-semibold'>
          {comment.profiles?.name ?? 'Unknown'}
        </span>
        <div className='flex items-center gap-1'>
          <span className='text-[10px] text-muted-foreground'>
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {canEdit && !editing && (
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              disabled={isPending}
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
            >
              <PencilIcon className='size-3' />
            </Button>
          )}
          {canDelete && (
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              disabled={isPending}
              onClick={remove}
            >
              <TrashIcon className='size-3' />
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className='space-y-2'>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isPending}
            autoFocus
          />
          <div className='flex gap-2'>
            <Button
              type='button'
              size='sm'
              disabled={isPending || !draft.trim()}
              onClick={save}
            >
              Save
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={isPending}
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className='text-sm whitespace-pre-wrap'>{comment.body}</p>
      )}
    </div>
  );
}

export function ProjectComments({
  projectId,
  comments,
  currentUser,
  isAdmin,
}: {
  projectId: string;
  comments: ProjectCommentWithAuthor[];
  currentUser: { id: string; name: string };
  isAdmin: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!draft.trim()) return;
    startTransition(async () => {
      try {
        await createProjectComment(projectId, draft);
        setDraft('');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to post comment',
        );
      }
    });
  }

  return (
    <div className='col-span-12 space-y-3'>
      <div className='flex items-baseline justify-between'>
        <h2 className='heading-4 uppercase'>Log</h2>
        {comments.length > 0 && (
          <span className='text-[10px] text-muted-foreground'>
            {comments.length} total
          </span>
        )}
      </div>

      <div className='flex h-[70vh] w-72 shrink-0 flex-col rounded-lg p-2 bg-card'>
        <div className='flex items-center justify-between px-1 pb-2'>
          <span className='heading-4'>Summary</span>
        </div>

        <div className='flex-1 space-y-2 overflow-y-auto pr-1 pb-2'>
          {comments.length === 0 ? (
            <p className='px-1 text-sm text-muted-foreground'>
              No comments yet.
            </p>
          ) : (
            comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                projectId={projectId}
                currentUserId={currentUser.id}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>

        <div className='space-y-2 border-t pt-2'>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='Add a comment…'
            disabled={isPending}
          />
          <Button
            type='button'
            size='sm'
            disabled={isPending || !draft.trim()}
            onClick={submit}
          >
            Post comment
          </Button>
        </div>
      </div>
    </div>
  );
}
