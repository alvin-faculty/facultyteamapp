'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ProjectChip } from '@/components/ProjectChip';
import { NewProjectDialog } from '@/components/NewProjectDialog';
import { NewClientDialog } from '@/components/NewClientDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sectionColorClass } from '@/lib/section-color';
import { updateProjectStatus } from '@/lib/actions/projects';
import type {
  Client,
  Profile,
  Project,
  ProjectStatus,
} from '@/lib/supabase/types';

interface ProjectSummary {
  project: Project;
  client: Client | null;
  usedMinutes: number;
  usedAmount: number;
  team: Profile[];
  lastActivityAt: string;
}

type SortKey = 'name' | 'usage' | 'recent';
type StatusFilter = 'all' | ProjectStatus;

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  usage: 'Budget usage',
  recent: 'Recently active',
};

function usagePct(s: ProjectSummary): number {
  const hoursPct = s.project.budget_hours
    ? (s.usedMinutes / 60 / s.project.budget_hours) * 100
    : null;
  const amountPct = s.project.budget_amount
    ? (s.usedAmount / s.project.budget_amount) * 100
    : null;
  return hoursPct ?? amountPct ?? -1;
}

function DraggableChip({
  summary,
  isAdmin,
}: {
  summary: ProjectSummary;
  isAdmin: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: summary.project.id,
    });

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={cn('touch-none', isDragging && 'z-10 opacity-50')}
      {...listeners}
      {...attributes}
    >
      <ProjectChip
        project={summary.project}
        client={summary.client}
        usedMinutes={summary.usedMinutes}
        usedAmount={summary.usedAmount}
        team={summary.team}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function BoardColumn({
  status,
  label,
  colorIndex,
  items,
  isAdmin,
}: {
  status: ProjectStatus;
  label: string;
  colorIndex: number;
  items: ProjectSummary[];
  isAdmin: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 shrink-0 space-y-3 rounded-lg p-1',
        isOver && 'bg-muted/50',
      )}
    >
      <div className='flex items-center gap-2 px-1'>
        <span
          className={cn('size-2 rounded-full', sectionColorClass(colorIndex))}
        />
        <span className='text-[11px] font-semibold tracking-[0.05em] uppercase'>
          {label}
        </span>
        <span className='rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground'>
          {items.length}
        </span>
      </div>
      <div className='space-y-3'>
        {items.map((s) => (
          <DraggableChip key={s.project.id} summary={s} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}

export function ProjectExplorer({
  summaries,
  clients,
  isAdmin,
}: {
  summaries: ProjectSummary[];
  clients: Client[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [prevSummaries, setPrevSummaries] = useState(summaries);
  const [localSummaries, setLocalSummaries] = useState(summaries);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (summaries !== prevSummaries) {
    setPrevSummaries(summaries);
    setLocalSummaries(summaries);
  }

  let filtered = localSummaries;
  filtered =
    statusFilter === 'all'
      ? filtered.filter((s) => s.project.status !== 'archived')
      : filtered.filter((s) => s.project.status === statusFilter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.project.name.toLowerCase().includes(q) ||
        s.client?.name.toLowerCase().includes(q),
    );
  }
  if (clientFilter !== 'all')
    filtered = filtered.filter((s) => s.client?.id === clientFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'name') return a.project.name.localeCompare(b.project.name);
    if (sortKey === 'usage') return usagePct(b) - usagePct(a);
    return b.lastActivityAt.localeCompare(a.lastActivityAt);
  });

  const columnsToShow =
    statusFilter === 'all'
      ? STATUSES.filter((s) => s.value !== 'archived')
      : STATUSES.filter((s) => s.value === statusFilter);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ProjectStatus;
    const summary = localSummaries.find((s) => s.project.id === active.id);
    if (!summary || summary.project.status === newStatus) return;

    setLocalSummaries((prev) =>
      prev.map((s) =>
        s.project.id === summary.project.id
          ? { ...s, project: { ...s.project, status: newStatus } }
          : s,
      ),
    );
    startTransition(() => updateProjectStatus(summary.project.id, newStatus));
  }

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex items-center justify-between pl-5 pr-5'>
        <h1>Project Overview</h1>
        <div className='flex gap-2'>
          <NewClientDialog />
          <NewProjectDialog clients={clients} />
        </div>
      </div>

      <div className='space-y-3'>
        <div className='flex flex-wrap items-center gap-3 pl-5 pr-5'>
          <div className='relative flex-1'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search projects…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='h-10 rounded-lg pl-9'
            />
          </div>

          <div className='inline-flex shrink-0 items-center gap-1'>
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </button>
            {STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                  statusFilter === status.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-3 pl-5 pr-5'>
          <Select
            value={clientFilter}
            onValueChange={(v) => setClientFilter(v ?? 'all')}
            items={{
              all: 'All clients',
              ...Object.fromEntries(clients.map((c) => [c.id, c.name])),
            }}
          >
            <SelectTrigger className='w-44'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey((v ?? 'name') as SortKey)}
            items={SORT_LABELS}
          >
            <SelectTrigger className='w-44'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue='list' className='pl-5 pr-5'>
        <TabsList>
          <TabsTrigger
            value='list'
            className='text-xs data-active:bg-primary data-active:text-primary-foreground'
          >
            List view
          </TabsTrigger>
          <TabsTrigger
            value='board'
            className='text-xs data-active:bg-primary data-active:text-primary-foreground'
          >
            Board view
          </TabsTrigger>
        </TabsList>

        <TabsContent value='list' className='space-y-6 pt-4'>
          {STATUSES.map((status, statusIndex) => {
            const items = sorted.filter(
              (s) => s.project.status === status.value,
            );
            if (items.length === 0) return null;
            return (
              <div key={status.value} className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      sectionColorClass(statusIndex),
                    )}
                  />
                  <span className='text-[11px] font-semibold tracking-[0.05em] uppercase'>
                    {status.label}
                  </span>
                  <span className='rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground'>
                    {items.length}
                  </span>
                </div>
                <div className='grid grid-cols-12 gap-6'>
                  {items.map((s) => (
                    <div
                      key={s.project.id}
                      className='col-span-12 sm:col-span-6 lg:col-span-4'
                    >
                      <ProjectChip
                        project={s.project}
                        client={s.client}
                        usedMinutes={s.usedMinutes}
                        usedAmount={s.usedAmount}
                        team={s.team}
                        isAdmin={isAdmin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <p className='text-sm text-muted-foreground'>
              No projects match this filter.
            </p>
          )}
        </TabsContent>

        <TabsContent value='board' className='pt-4'>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className='flex gap-4 overflow-x-auto pb-2'>
              {columnsToShow.map((status) => (
                <BoardColumn
                  key={status.value}
                  status={status.value}
                  label={status.label}
                  colorIndex={STATUSES.findIndex(
                    (s) => s.value === status.value,
                  )}
                  items={sorted.filter(
                    (s) => s.project.status === status.value,
                  )}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  );
}
