'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  TrashIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlayIcon,
  SquareIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createMyTask,
  updateMyTask,
  updateMyTaskStatus,
  deleteMyTask,
} from '@/lib/actions/my-tasks';
import {
  startTimer,
  stopTimer,
  startMyTaskTimer,
  type RunningTimeEntry,
} from '@/lib/actions/time-entries';
import { useTimerDisplay } from '@/hooks/useTimerDisplay';
import { InlineDurationEdit } from '@/components/InlineDurationEdit';
import type {
  MyTaskWithDetails,
  MyTaskStatus,
  MyTaskCategory,
} from '@/lib/supabase/types';

const STATUS_COLUMNS: { id: MyTaskStatus; label: string }[] = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
];

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function MyTaskTimerControl({
  projectTaskId,
  projectId,
  runningEntry,
}: {
  projectTaskId: string;
  projectId: string;
  runningEntry: RunningTimeEntry | null;
}) {
  const { lastEntry, isRunning, freeze } = useTimerDisplay(
    runningEntry,
    runningEntry?.task_id === projectTaskId,
  );
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [frozenSeconds, setFrozenSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !runningEntry) return;
    const tick = () =>
      setElapsed(
        Math.floor(
          (Date.now() - new Date(runningEntry.started_at).getTime()) / 1000,
        ),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, runningEntry]);

  function handleStop() {
    if (!runningEntry) return;
    const seconds = Math.floor(
      (Date.now() - new Date(runningEntry.started_at).getTime()) / 1000,
    );
    setFrozenSeconds(seconds);
    freeze({
      ...runningEntry,
      ended_at: new Date().toISOString(),
      duration_minutes: Math.round(seconds / 60),
    });
    startTransition(() => stopTimer(runningEntry.id));
  }

  return (
    <div
      className='flex shrink-0 items-center gap-1.5'
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isRunning && (
        <span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
          {formatElapsed(elapsed)}
        </span>
      )}
      {!isRunning && lastEntry && (
        <InlineDurationEdit
          entryId={lastEntry.id}
          seconds={frozenSeconds}
          onSaved={setFrozenSeconds}
          className='text-[10px] text-muted-foreground'
        />
      )}
      <Button
        type='button'
        size='icon-xs'
        className={cn(
          'rounded-full',
          isRunning &&
            'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        )}
        disabled={isPending}
        onClick={() =>
          isRunning && runningEntry
            ? handleStop()
            : startTransition(() => startTimer(projectId, projectTaskId, ''))
        }
      >
        {isRunning ? (
          <SquareIcon className='size-2.5 fill-current' />
        ) : (
          <PlayIcon className='size-2.5 fill-current' />
        )}
      </Button>
    </div>
  );
}

function FreeformTimerControl({
  myTaskId,
  runningEntry,
}: {
  myTaskId: string;
  runningEntry: RunningTimeEntry | null;
}) {
  const { lastEntry, isRunning, freeze } = useTimerDisplay(
    runningEntry,
    runningEntry?.my_task_id === myTaskId,
  );
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [frozenSeconds, setFrozenSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning || !runningEntry) return;
    const tick = () =>
      setElapsed(
        Math.floor(
          (Date.now() - new Date(runningEntry.started_at).getTime()) / 1000,
        ),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, runningEntry]);

  function handleStop() {
    if (!runningEntry) return;
    const seconds = Math.floor(
      (Date.now() - new Date(runningEntry.started_at).getTime()) / 1000,
    );
    setFrozenSeconds(seconds);
    freeze({
      ...runningEntry,
      ended_at: new Date().toISOString(),
      duration_minutes: Math.round(seconds / 60),
    });
    startTransition(() => stopTimer(runningEntry.id));
  }

  return (
    <div
      className='flex shrink-0 items-center gap-1.5'
      onPointerDown={(e) => e.stopPropagation()}
    >
      {isRunning && (
        <span className='font-mono text-[10px] tabular-nums text-muted-foreground'>
          {formatElapsed(elapsed)}
        </span>
      )}
      {!isRunning && lastEntry && (
        <InlineDurationEdit
          entryId={lastEntry.id}
          seconds={frozenSeconds}
          onSaved={setFrozenSeconds}
          className='text-[10px] text-muted-foreground'
        />
      )}
      <Button
        type='button'
        size='icon-xs'
        className={cn(
          'rounded-full',
          isRunning &&
            'bg-destructive text-destructive-foreground hover:bg-destructive/80',
        )}
        disabled={isPending}
        onClick={() =>
          isRunning && runningEntry
            ? handleStop()
            : startTransition(() => startMyTaskTimer(myTaskId, ''))
        }
      >
        {isRunning ? (
          <SquareIcon className='size-2.5 fill-current' />
        ) : (
          <PlayIcon className='size-2.5 fill-current' />
        )}
      </Button>
    </div>
  );
}

function AddTaskDialog({
  category,
  status,
  targetUserId,
}: {
  category: MyTaskCategory;
  status: MyTaskStatus;
  targetUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await createMyTask(
          targetUserId,
          category,
          title.trim(),
          status,
          notes.trim(),
        );
        setTitle('');
        setNotes('');
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add task');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='w-full justify-start text-muted-foreground'
          >
            <Plus className='size-3.5' />
            Add task
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Task title'
            autoFocus
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Notes (optional)'
          />
          <Button
            type='button'
            disabled={isPending || !title.trim()}
            onClick={submit}
            className='w-full'
          >
            Add task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTaskDialog({
  item,
  open,
  onOpenChange,
}: {
  item: MyTaskWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(item.title ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await updateMyTask(item.id, title.trim(), notes.trim());
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save task');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Task title'
            autoFocus
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='Notes (optional)'
          />
          <Button
            type='button'
            disabled={isPending || !title.trim()}
            onClick={submit}
            className='w-full'
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MyTaskCardPreview({ item }: { item: MyTaskWithDetails }) {
  const isLinked = Boolean(item.project_task_id);
  const title = isLinked
    ? (item.tasks?.title ?? 'Untitled task')
    : (item.title ?? 'Untitled');

  return (
    <div className='space-y-1 rounded-md border bg-background p-2.5 shadow-lg'>
      <div className='flex min-w-0 items-center gap-1.5'>
        {isLinked && item.tasks?.high_priority && (
          <span className='size-1.5 shrink-0 rounded-full bg-destructive' />
        )}
        <p className='text-sm'>{title}</p>
      </div>
      {!isLinked && item.notes && (
        <p className='line-clamp-2 text-xs text-muted-foreground'>
          {item.notes}
        </p>
      )}
    </div>
  );
}

function MyTaskCard({
  item,
  runningEntry,
  isOwner,
}: {
  item: MyTaskWithDetails;
  runningEntry: RunningTimeEntry | null;
  isOwner: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      disabled: !isOwner,
    });
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const isLinked = Boolean(item.project_task_id);
  const title = isLinked
    ? (item.tasks?.title ?? 'Untitled task')
    : (item.title ?? 'Untitled');
  const projectName = item.tasks?.projects?.name;
  const clientName = item.tasks?.projects?.clients?.name;

  function remove() {
    startTransition(async () => {
      try {
        await deleteMyTask(item.id);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete task',
        );
      }
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={
          transform
            ? {
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
              }
            : undefined
        }
        className={cn(
          'space-y-1 rounded-md border bg-background p-2.5',
          isOwner && 'touch-none cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-0',
        )}
        {...listeners}
        {...attributes}
      >
        <div className='flex items-start justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-1.5'>
            {isLinked && item.tasks?.high_priority && (
              <span className='size-1.5 shrink-0 rounded-full bg-destructive' />
            )}
            <p className='text-sm'>{title}</p>
          </div>
          {isOwner && !isLinked && (
            <div className='flex items-center gap-0.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setEditOpen(true)}
              >
                <PencilIcon className='size-3' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                disabled={isPending}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={remove}
              >
                <TrashIcon className='size-3' />
              </Button>
            </div>
          )}
        </div>
        {!isLinked && item.notes && (
          <p className='line-clamp-2 text-xs text-muted-foreground'>
            {item.notes}
          </p>
        )}
        {isOwner && !isLinked && (
          <div className='flex justify-end'>
            <FreeformTimerControl
              myTaskId={item.id}
              runningEntry={runningEntry}
            />
          </div>
        )}
        {isLinked && item.tasks?.project_id && (
          <div className='flex items-center justify-between gap-2'>
            <Link
              href={`/projects/${item.tasks.project_id}?task=${item.project_task_id}`}
              onPointerDown={(e) => e.stopPropagation()}
              className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
            >
              <ExternalLinkIcon className='size-3' />
              {clientName
                ? `${clientName} — ${projectName ?? 'View project'}`
                : (projectName ?? 'View project')}
            </Link>
            {isOwner && (
              <MyTaskTimerControl
                projectTaskId={item.project_task_id!}
                projectId={item.tasks.project_id}
                runningEntry={runningEntry}
              />
            )}
          </div>
        )}
      </div>
      {isOwner && !isLinked && (
        <EditTaskDialog
          item={item}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

function Column({
  status,
  label,
  category,
  items,
  runningEntry,
  isOwner,
  targetUserId,
}: {
  status: MyTaskStatus;
  label: string;
  category: MyTaskCategory;
  items: MyTaskWithDetails[];
  runningEntry: RunningTimeEntry | null;
  isOwner: boolean;
  targetUserId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-[70vh] w-72 shrink-0 flex-col rounded-lg border bg-card p-2',
        isOver && 'bg-muted/50',
      )}
    >
      <div className='flex items-center justify-between px-1 pb-2'>
        <span className='text-sm font-semibold'>{label}</span>
        <span className='text-xs text-muted-foreground'>{items.length}</span>
      </div>
      <div className='flex-1 space-y-2 overflow-y-auto pr-1 pb-2'>
        {items.map((item) => (
          <MyTaskCard
            key={item.id}
            item={item}
            runningEntry={runningEntry}
            isOwner={isOwner}
          />
        ))}
      </div>
      <AddTaskDialog
        category={category}
        status={status}
        targetUserId={targetUserId}
      />
    </div>
  );
}

function StatusBoard({
  category,
  items,
  runningEntry,
  isOwner,
  targetUserId,
}: {
  category: MyTaskCategory;
  items: MyTaskWithDetails[];
  runningEntry: RunningTimeEntry | null;
  isOwner: boolean;
  targetUserId: string;
}) {
  const [prevItems, setPrevItems] = useState(items);
  const [localItems, setLocalItems] = useState(items);
  const [activeItem, setActiveItem] = useState<MyTaskWithDetails | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (items !== prevItems) {
    setPrevItems(items);
    setLocalItems(items);
  }

  function handleDragStart(event: DragStartEvent) {
    const item = localItems.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    if (!isOwner) return;
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as MyTaskStatus;
    const item = localItems.find((i) => i.id === active.id);
    if (!item || item.status === newStatus) return;

    const position = localItems.filter((i) => i.status === newStatus).length;

    setLocalItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: newStatus, position } : i,
      ),
    );
    updateMyTaskStatus(item.id, newStatus, position).catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to move task');
    });
  }

  function sortedFor(status: MyTaskStatus) {
    return localItems
      .filter((i) => i.status === status)
      .sort((a, b) => {
        const aPriority = a.tasks?.high_priority ?? false;
        const bPriority = b.tasks?.high_priority ?? false;
        if (aPriority !== bPriority) return aPriority ? -1 : 1;
        return a.position - b.position;
      });
  }

  const columns = STATUS_COLUMNS.map((col) => (
    <Column
      key={col.id}
      status={col.id}
      label={col.label}
      category={category}
      items={sortedFor(col.id)}
      runningEntry={runningEntry}
      isOwner={isOwner}
      targetUserId={targetUserId}
    />
  ));

  if (!isOwner) {
    return (
      <div className='flex items-stretch gap-4 overflow-x-auto pb-2'>
        {columns}
      </div>
    );
  }

  return (
    <DndContext
      id={`my-tasks-${category}`}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className='flex items-stretch gap-4 overflow-x-auto pb-2 pl-5 pr-5'>
        {columns}
      </div>
      <DragOverlay>
        {activeItem && <MyTaskCardPreview item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}

function PersonalList({
  items,
  runningEntry,
  isOwner,
  targetUserId,
}: {
  items: MyTaskWithDetails[];
  runningEntry: RunningTimeEntry | null;
  isOwner: boolean;
  targetUserId: string;
}) {
  return (
    <div className='flex h-[70vh] w-full max-w-md flex-col rounded-lg border bg-card p-2'>
      <div className='flex items-center justify-between px-1 pb-2'>
        <span className='text-sm font-semibold'>Personal tasks</span>
        <span className='text-xs text-muted-foreground'>{items.length}</span>
      </div>
      <div className='flex-1 space-y-2 overflow-y-auto pr-1 pb-2'>
        {items.length === 0 ? (
          <p className='px-1 text-sm text-muted-foreground'>
            No personal tasks yet.
          </p>
        ) : (
          items.map((item) => (
            <MyTaskCard
              key={item.id}
              item={item}
              runningEntry={runningEntry}
              isOwner={isOwner}
            />
          ))
        )}
      </div>
      <AddTaskDialog
        category='personal'
        status='not_started'
        targetUserId={targetUserId}
      />
    </div>
  );
}

export function MyTasksBoard({
  items,
  runningEntry,
  viewedUserId,
  isOwner,
  currentUserId,
  teamMembers,
}: {
  items: MyTaskWithDetails[];
  runningEntry: RunningTimeEntry | null;
  viewedUserId: string;
  isOwner: boolean;
  currentUserId: string;
  teamMembers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const studioItems = items.filter((i) => i.category === 'studio');
  const sortItems = items.filter((i) => i.category === 'sort');
  const personalItems = items.filter((i) => i.category === 'personal');
  const userItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of teamMembers)
      map[m.id] = m.id === currentUserId ? 'My Tasks' : m.name;
    return map;
  }, [teamMembers, currentUserId]);

  return (
    <div className='space-y-4'>
      <div className='flex justify-start pl-5 mb-8'>
        <Select
          value={viewedUserId}
          onValueChange={(v) => {
            if (!v) return;
            router.push(
              v === currentUserId ? '/my-tasks' : `/my-tasks?user=${v}`,
            );
          }}
          items={userItems}
        >
          <SelectTrigger className='w-48 border-0 border-b '>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.id === currentUserId ? 'My Tasks' : m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue='studio'>
        <TabsList>
          <TabsTrigger value='studio'>Studio</TabsTrigger>
          <TabsTrigger value='sort'>SORT</TabsTrigger>
          <TabsTrigger value='personal'>Personal</TabsTrigger>
        </TabsList>
        <TabsContent value='studio'>
          <StatusBoard
            category='studio'
            items={studioItems}
            runningEntry={runningEntry}
            isOwner={isOwner}
            targetUserId={viewedUserId}
          />
        </TabsContent>
        <TabsContent value='sort'>
          <StatusBoard
            category='sort'
            items={sortItems}
            runningEntry={runningEntry}
            isOwner={isOwner}
            targetUserId={viewedUserId}
          />
        </TabsContent>
        <TabsContent value='personal'>
          <PersonalList
            items={personalItems}
            runningEntry={runningEntry}
            isOwner={isOwner}
            targetUserId={viewedUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
