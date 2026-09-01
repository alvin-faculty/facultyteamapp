'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import { updateTimeEntry, deleteTimeEntry } from '@/lib/actions/time-entries';
import { profileColorClass } from '@/lib/profile-color';
import { projectDotColorClass } from '@/lib/project-color';
import {
  formatCurrency,
  formatDurationBetween,
  formatMinutes,
  formatTimeOfDay,
} from '@/lib/format';
import { cn } from '@/lib/utils';

export interface TrackedEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  billable: boolean;
  rate_snapshot: number;
  description: string | null;
  user_id: string;
  user_name: string;
  project_id: string | null;
  project_name: string | null;
  project_color: string | null;
  client_id: string | null;
  task_id: string | null;
  task_title: string | null;
  my_task_id: string | null;
  my_task_title: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

type RangeKey = 'today' | 'week' | 'month' | 'all';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  all: 'All time',
};

function localDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

function localDateWithTimeFrom(dateStr: string, sourceISO: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const source = new Date(sourceISO);
  return new Date(
    year,
    month - 1,
    day,
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
  );
}

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === 'today')
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function entryAmount(entry: TrackedEntry): number {
  if (!entry.billable) return 0;
  return ((entry.duration_minutes ?? 0) / 60) * entry.rate_snapshot;
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

function shortDayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'));
}

interface GroupedEntry {
  key: string;
  id: string | null;
  user_id: string;
  user_name: string;
  project_id: string | null;
  project_name: string | null;
  task_id: string | null;
  task_title: string | null;
  description: string | null;
  billable: boolean;
  minutes: number;
  amount: number;
  count: number;
  earliestStart: string;
  latestEnd: string | null;
  sessions: TrackedEntry[];
}

function groupEntries(dayEntries: TrackedEntry[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>();
  for (const e of dayEntries) {
    const key = `${e.user_id}|${e.project_id ?? 'personal'}|${e.task_id ?? e.my_task_id ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.id = null;
      existing.minutes += e.duration_minutes ?? 0;
      existing.amount += entryAmount(e);
      existing.count += 1;
      existing.billable = existing.billable || e.billable;
      existing.sessions.push(e);
      if (e.started_at < existing.earliestStart)
        existing.earliestStart = e.started_at;
      if (
        e.ended_at &&
        (!existing.latestEnd || e.ended_at > existing.latestEnd)
      )
        existing.latestEnd = e.ended_at;
      if (existing.description !== e.description) existing.description = null;
    } else {
      map.set(key, {
        key,
        id: e.id,
        user_id: e.user_id,
        user_name: e.user_name,
        project_id: e.project_id,
        project_name: e.project_name,
        task_id: e.task_id,
        task_title: e.task_title,
        description: e.description,
        billable: e.billable,
        minutes: e.duration_minutes ?? 0,
        amount: entryAmount(e),
        count: 1,
        earliestStart: e.started_at,
        latestEnd: e.ended_at,
        sessions: [e],
      });
    }
  }
  for (const g of map.values()) {
    g.sessions.sort((a, b) => a.started_at.localeCompare(b.started_at));
  }
  return Array.from(map.values()).sort((a, b) =>
    b.earliestStart.localeCompare(a.earliestStart),
  );
}

function BarRow({
  colorClass,
  label,
  minutes,
  amount,
  pct,
}: {
  colorClass: string;
  label: string;
  minutes: number;
  amount: number;
  pct: number;
}) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between gap-2 text-sm'>
        <span className='flex min-w-0 items-center gap-1.5'>
          <span className={cn('size-2 shrink-0 rounded-full', colorClass)} />
          <span className='truncate'>{label}</span>
        </span>
        <span className='shrink-0 text-muted-foreground'>
          {formatMinutes(minutes)}
          {amount > 0 && <> · {formatCurrency(amount)}</>}
        </span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
        <div
          className={cn('h-full rounded-full', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface EditableEntry {
  id: string;
  started_at: string;
  duration_minutes: number | null;
  description: string | null;
  billable: boolean;
}

type EditMode = 'duration' | 'times';

function formatTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function EditEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: EditableEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<EditMode>('duration');
  const [date, setDate] = useState(() => dayKey(entry.started_at));
  const [hours, setHours] = useState(() =>
    ((entry.duration_minutes ?? 0) / 60).toString(),
  );
  const [startTime, setStartTime] = useState(() =>
    formatTimeInput(entry.started_at),
  );
  const [endTime, setEndTime] = useState(() => {
    const start = new Date(entry.started_at);
    const end = new Date(
      start.getTime() + (entry.duration_minutes ?? 0) * 60000,
    );
    return formatTimeInput(end.toISOString());
  });
  const [description, setDescription] = useState(entry.description ?? '');
  const [billable, setBillable] = useState(entry.billable);
  const [isPending, startTransition] = useTransition();

  function submit() {
    let started: Date;
    let ended: Date;

    if (mode === 'duration') {
      const hoursNum = Number(hours);
      if (!date || !Number.isFinite(hoursNum) || hoursNum <= 0) {
        toast.error('Please enter a valid date and duration');
        return;
      }
      started = localDateWithTimeFrom(date, entry.started_at);
      ended = new Date(started.getTime() + Math.round(hoursNum * 60) * 60000);
    } else {
      if (!date || !startTime || !endTime) {
        toast.error('Please enter a date, start time, and end time');
        return;
      }
      started = localDateTime(date, startTime);
      ended = localDateTime(date, endTime);
      if (ended <= started) {
        toast.error('End time must be after start time');
        return;
      }
    }

    const formData = new FormData();
    formData.set('started_at', started.toISOString());
    formData.set('ended_at', ended.toISOString());
    formData.set('description', description);
    if (billable) formData.set('billable', 'on');

    startTransition(async () => {
      try {
        await updateTimeEntry(entry.id, formData);
        toast.success('Entry updated');
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update entry',
        );
      }
    });
  }

  const isValid =
    mode === 'duration'
      ? Boolean(date) && Boolean(hours) && Number(hours) > 0
      : Boolean(date) && Boolean(startTime) && Boolean(endTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit time entry</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='inline-flex rounded-md border p-0.5'>
            <button
              type='button'
              onClick={() => setMode('duration')}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'duration'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Duration
            </button>
            <button
              type='button'
              onClick={() => setMode('times')}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                mode === 'times'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Start &amp; end time
            </button>
          </div>

          {mode === 'duration' ? (
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-date'>Date</Label>
                <Input
                  id='edit-date'
                  type='date'
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-hours'>Hours</Label>
                <Input
                  id='edit-hours'
                  type='number'
                  min='0'
                  step='0.25'
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-date-times'>Date</Label>
                <Input
                  id='edit-date-times'
                  type='date'
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-start-time'>Start time</Label>
                <Input
                  id='edit-start-time'
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-end-time'>End time</Label>
                <Input
                  id='edit-end-time'
                  type='time'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='edit-description'>Description</Label>
            <Input
              id='edit-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What did you work on?'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              checked={billable}
              onCheckedChange={(c) => setBillable(c === true)}
              id='edit-billable'
            />
            <Label htmlFor='edit-billable' className='font-normal'>
              Billable
            </Label>
          </div>
          <Button
            className='w-full'
            disabled={isPending || !isValid}
            onClick={submit}
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SessionRow({ session }: { session: TrackedEntry }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    startTransition(async () => {
      try {
        await deleteTimeEntry(session.id);
        toast.success('Entry deleted');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete entry',
        );
      }
    });
  }

  return (
    <>
      <div className='flex items-center gap-3 py-2 pl-9 text-sm'>
        <span className='min-w-0 flex-1 truncate text-muted-foreground'>
          {session.description || '—'}
        </span>
        {!session.billable && (
          <span className='shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground uppercase'>
            Non-billable
          </span>
        )}
        <span className='hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline'>
          {formatTimeOfDay(session.started_at)}
          {session.ended_at && <> – {formatTimeOfDay(session.ended_at)}</>}
        </span>
        <span className='shrink-0 font-mono text-xs text-muted-foreground'>
          {formatMinutes(session.duration_minutes ?? 0)}
        </span>
        <span className='w-20 shrink-0 text-right text-muted-foreground'>
          {session.billable && entryAmount(session) > 0
            ? formatCurrency(entryAmount(session))
            : '—'}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          className='shrink-0'
          onClick={() => setEditOpen(true)}
        >
          <PencilIcon className='size-3' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          disabled={isPending}
          onClick={remove}
        >
          <TrashIcon className='size-3' />
        </Button>
      </div>
      <EditEntryDialog
        entry={session}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function EntryRow({
  entry,
  router,
}: {
  entry: GroupedEntry;
  router: ReturnType<typeof useRouter>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isGrouped = entry.count > 1;

  function remove() {
    if (!entry.id) return;
    if (!confirm('Delete this time entry? This cannot be undone.')) return;
    startTransition(async () => {
      try {
        await deleteTimeEntry(entry.id!);
        toast.success('Entry deleted');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete entry',
        );
      }
    });
  }

  return (
    <>
      <div
        onClick={() =>
          isGrouped
            ? setExpanded((v) => !v)
            : entry.project_id
              ? router.push(
                  entry.task_id
                    ? `/projects/${entry.project_id}?task=${entry.task_id}`
                    : `/projects/${entry.project_id}`,
                )
              : router.push('/my-tasks')
        }
        className='flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40'
      >
        {isGrouped ? (
          expanded ? (
            <ChevronDownIcon className='size-3.5 shrink-0 text-muted-foreground' />
          ) : (
            <ChevronRightIcon className='size-3.5 shrink-0 text-muted-foreground' />
          )
        ) : (
          <span className='size-3.5 shrink-0' />
        )}
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            profileColorClass(entry.user_id),
          )}
        />
        <span className='w-24 shrink-0 truncate text-muted-foreground'>
          {entry.user_name}
        </span>
        <span className='min-w-0 flex-1 truncate'>
          <span className='font-medium'>{entry.project_name}</span>
          {entry.task_title && (
            <span className='text-muted-foreground'> · {entry.task_title}</span>
          )}
          {entry.count === 1 && entry.description && (
            <span className='text-muted-foreground'>
              {' '}
              — {entry.description}
            </span>
          )}
          {entry.count > 1 && (
            <span className='text-muted-foreground'>
              {' '}
              · {entry.count} sessions
            </span>
          )}
        </span>
        {!entry.billable && (
          <span className='shrink-0 rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground uppercase'>
            Non-billable
          </span>
        )}
        <span className='hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline'>
          {formatTimeOfDay(entry.earliestStart)}
          {entry.latestEnd && <> – {formatTimeOfDay(entry.latestEnd)}</>}
        </span>
        <span className='shrink-0 font-mono text-xs text-muted-foreground'>
          {entry.count === 1 && entry.latestEnd
            ? formatDurationBetween(entry.earliestStart, entry.latestEnd)
            : formatMinutes(entry.minutes)}
        </span>
        <span className='w-20 shrink-0 text-right font-medium'>
          {entry.billable && entry.amount > 0
            ? formatCurrency(entry.amount)
            : '—'}
        </span>
        {entry.id && (
          <div className='flex shrink-0 items-center gap-0.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              onClick={(e) => {
                e.stopPropagation();
                setEditOpen(true);
              }}
            >
              <PencilIcon className='size-3' />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon-xs'
              disabled={isPending}
              onClick={(e) => {
                e.stopPropagation();
                remove();
              }}
            >
              <TrashIcon className='size-3' />
            </Button>
          </div>
        )}
        {isGrouped && <span className='size-[52px] shrink-0' />}
      </div>
      {expanded && isGrouped && (
        <div className='divide-y border-t bg-muted/20'>
          {entry.sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}
      {entry.id && (
        <EditEntryDialog
          entry={{
            id: entry.id,
            started_at: entry.earliestStart,
            duration_minutes: entry.minutes,
            description: entry.description,
            billable: entry.billable,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}

export function TrackedTimeReport({
  entries,
  teamMembers,
}: {
  entries: TrackedEntry[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('week');
  const showByPerson = teamMembers.length > 1;

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    if (!start) return entries;
    return entries.filter((e) => new Date(e.started_at) >= start);
  }, [entries, range]);

  const totalMinutes = filtered.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0,
  );
  const totalAmount = filtered.reduce((sum, e) => sum + entryAmount(e), 0);

  const byProject = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string | null; minutes: number; amount: number }
    >();
    for (const e of filtered) {
      const key = e.project_id ?? 'personal';
      const entry = map.get(key) ?? {
        name: e.project_name ?? 'Personal',
        color: e.project_color,
        minutes: 0,
        amount: 0,
      };
      entry.minutes += e.duration_minutes ?? 0;
      entry.amount += entryAmount(e);
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const byPerson = useMemo(() => {
    const map = new Map<
      string,
      { name: string; minutes: number; amount: number }
    >();
    for (const e of filtered) {
      const entry = map.get(e.user_id) ?? {
        name: e.user_name,
        minutes: 0,
        amount: 0,
      };
      entry.minutes += e.duration_minutes ?? 0;
      entry.amount += entryAmount(e);
      map.set(e.user_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const byDay = useMemo(() => {
    const map = new Map<string, TrackedEntry[]>();
    for (const e of filtered) {
      const key = dayKey(e.started_at);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const dailySummary = useMemo(() => {
    const perDayPerUser = new Map<string, Map<string, number>>();
    for (const [day, dayEntries] of byDay) {
      const perUser = new Map<string, number>();
      for (const e of dayEntries) {
        perUser.set(
          e.user_id,
          (perUser.get(e.user_id) ?? 0) + (e.duration_minutes ?? 0),
        );
      }
      perDayPerUser.set(day, perUser);
    }
    return perDayPerUser;
  }, [byDay]);

  const memberTotals = useMemo(() => {
    return teamMembers.map((m) => ({
      ...m,
      minutes: Array.from(dailySummary.values()).reduce(
        (sum, perUser) => sum + (perUser.get(m.id) ?? 0),
        0,
      ),
    }));
  }, [teamMembers, dailySummary]);

  const maxProjectMinutes = byProject[0]?.minutes ?? 0;
  const maxPersonMinutes = byPerson[0]?.minutes ?? 0;

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex items-center justify-between mt-8 mb-12 pl-5 pr-5 gap-2'>
        <h1>Tracked Time</h1>
        <Select
          value={range}
          onValueChange={(v) => setRange((v as RangeKey) ?? 'week')}
          items={RANGE_LABELS}
        >
          <SelectTrigger className='w-36'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {RANGE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='grid grid-cols-3 gap-4 pl-5 pr-5'>
        <div className='rounded-xl border bg-card p-4'>
          <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
            Total time
          </p>
          <p className='mt-1 text-2xl font-semibold'>
            {formatMinutes(totalMinutes)}
          </p>
        </div>
        <div className='rounded-xl border bg-card p-4'>
          <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
            Billable
          </p>
          <p className='mt-1 text-2xl font-semibold'>
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className='rounded-xl border bg-card p-4'>
          <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
            Entries
          </p>
          <p className='mt-1 text-2xl font-semibold'>{filtered.length}</p>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-6 pl-5 pr-5',
          showByPerson ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <div className='space-y-3 rounded-xl border bg-card p-4'>
          <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
            By project
          </p>
          {byProject.length === 0 && (
            <p className='text-sm text-muted-foreground'>
              No tracked time yet.
            </p>
          )}
          <div className='space-y-3'>
            {byProject.map((p) => (
              <BarRow
                key={p.id}
                colorClass={projectDotColorClass(p.color, null)}
                label={p.name}
                minutes={p.minutes}
                amount={p.amount}
                pct={
                  maxProjectMinutes > 0
                    ? (p.minutes / maxProjectMinutes) * 100
                    : 0
                }
              />
            ))}
          </div>
        </div>

        {showByPerson && (
          <div className='space-y-3 rounded-xl border bg-card p-4'>
            <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
              By team member
            </p>
            {byPerson.length === 0 && (
              <p className='text-sm text-muted-foreground'>
                No tracked time yet.
              </p>
            )}
            <div className='space-y-3'>
              {byPerson.map((p) => (
                <BarRow
                  key={p.id}
                  colorClass={profileColorClass(p.id)}
                  label={p.name}
                  minutes={p.minutes}
                  amount={p.amount}
                  pct={
                    maxPersonMinutes > 0
                      ? (p.minutes / maxPersonMinutes) * 100
                      : 0
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='space-y-3 pl-5 pr-5'>
        <h4>Tracked Time Summary</h4>
        <div className='overflow-x-auto rounded-xl border bg-card'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-xs text-muted-foreground'>
                <th className='px-4 py-2 text-left font-light'>Day</th>
                {showByPerson &&
                  teamMembers.map((m) => (
                    <th
                      key={m.id}
                      className='px-4 py-2 text-right font-light whitespace-nowrap'
                    >
                      <span className='flex items-center justify-end gap-1.5'>
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            profileColorClass(m.id),
                          )}
                        />
                        {m.name}
                      </span>
                    </th>
                  ))}
                <th className='px-4 py-2 text-right font-light'>Total</th>
              </tr>
            </thead>
            <tbody>
              {byDay.length === 0 && (
                <tr>
                  <td
                    colSpan={showByPerson ? teamMembers.length + 2 : 2}
                    className='px-4 py-4 text-center text-sm text-muted-foreground'
                  >
                    No tracked time in this range.
                  </td>
                </tr>
              )}
              {byDay.map(([day]) => {
                const perUser =
                  dailySummary.get(day) ?? new Map<string, number>();
                const dayTotal = Array.from(perUser.values()).reduce(
                  (sum, m) => sum + m,
                  0,
                );
                return (
                  <tr key={day} className='border-b last:border-0'>
                    <td className='px-4 py-2 whitespace-nowrap'>
                      {shortDayLabel(day)}
                    </td>
                    {showByPerson &&
                      teamMembers.map((m) => {
                        const minutes = perUser.get(m.id) ?? 0;
                        return (
                          <td
                            key={m.id}
                            className='px-4 py-2 text-right text-muted-foreground'
                          >
                            {minutes > 0 ? formatMinutes(minutes) : '—'}
                          </td>
                        );
                      })}
                    <td className='px-4 py-2 text-right font-light'>
                      {formatMinutes(dayTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {byDay.length > 0 && (
              <tfoot>
                <tr className='border-t bg-muted/30'>
                  <td className='px-4 py-2 font-light'>Total</td>
                  {showByPerson &&
                    memberTotals.map((m) => (
                      <td
                        key={m.id}
                        className='px-4 py-2 text-right font-light'
                      >
                        {m.minutes > 0 ? formatMinutes(m.minutes) : '—'}
                      </td>
                    ))}
                  <td className='px-4 py-2 text-right font-semibold'>
                    {formatMinutes(totalMinutes)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className='space-y-4 pl-5 pr-5'>
        <h4>Entries</h4>
        {byDay.length === 0 && (
          <p className='text-sm text-muted-foreground'>
            No tracked time in this range.
          </p>
        )}
        {byDay.map(([day, dayEntries]) => {
          const dayMinutes = dayEntries.reduce(
            (sum, e) => sum + (e.duration_minutes ?? 0),
            0,
          );
          const grouped = groupEntries(dayEntries);
          return (
            <div key={day} className='space-y-1.5'>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span className='font-light text-foreground'>
                  {dayLabel(day)}
                </span>
                <span>{formatMinutes(dayMinutes)}</span>
              </div>
              <div className='divide-y rounded-xl border bg-card'>
                {grouped.map((e) => (
                  <EntryRow key={e.key} entry={e} router={router} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
