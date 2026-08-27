'use client';

import { useMemo, useState, useRef, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { projectDotColorClass } from '@/lib/project-color';
import { cn } from '@/lib/utils';
import type { Client, Project, Task } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { updateProjectDates } from '@/lib/actions/projects';
import { updateTaskDates } from '@/lib/actions/tasks';

type ProjectWithClient = Project & { clients: Client | null };
type ZoomLevel = 'day' | 'week' | 'month';

const ROW_HEIGHT = 36; // px per row
const MIN_RANGE_DAYS = 30;

const ZOOM_DAY_WIDTH: Record<ZoomLevel, number> = {
  day: 28,
  week: 10,
  month: 4,
};
const ZOOM_UNIT_DAYS: Record<ZoomLevel, number> = {
  day: 1,
  week: 7,
  month: 30,
};
const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Days',
  week: 'Weeks',
  month: 'Months',
};

function parseDate(d: string | null): Date | null {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { day: 'numeric' });
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface DateRange {
  start: Date;
  end: Date;
  days: Date[];
}

function computeRange(projects: ProjectWithClient[], tasks: Task[]): DateRange {
  const dates: Date[] = [];
  for (const p of projects) {
    const s = parseDate(p.start_date);
    const e = parseDate(p.end_date);
    if (s) dates.push(s);
    if (e) dates.push(e);
  }
  for (const t of tasks) {
    const s = parseDate(t.start_date);
    const e = parseDate(t.due_date);
    if (s) dates.push(s);
    if (e) dates.push(e);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start =
    dates.length > 0
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : today;
  let end =
    dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : today;

  if (today < start) start = today;
  if (today > end) end = today;

  start = new Date(start.getTime() - 3 * 86400000);
  end = new Date(end.getTime() + 3 * 86400000);

  const span = daysBetween(start, end);
  if (span < MIN_RANGE_DAYS) {
    const extra = MIN_RANGE_DAYS - span;
    end = new Date(end.getTime() + extra * 86400000);
  }

  const days: Date[] = [];
  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getTime() + 86400000)
  ) {
    days.push(d);
  }

  return { start, end, days };
}

function BarBackground({ days, dayWidth }: { days: Date[]; dayWidth: number }) {
  return (
    <div className='absolute inset-0 flex'>
      {days.map((d, i) => (
        <div
          key={i}
          className={cn(
            'shrink-0 border-r border-border/40',
            (d.getDay() === 0 || d.getDay() === 6) && 'bg-muted/30',
            isToday(d) && 'bg-primary/5',
          )}
          style={{ width: dayWidth }}
        />
      ))}
    </div>
  );
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

function GanttBar({
  startDate,
  endDate,
  rangeStart,
  colorClass,
  label,
  href,
  onDatesChange,
  dayWidth,
  unitDays,
}: {
  startDate: Date | null;
  endDate: Date | null;
  rangeStart: Date;
  colorClass: string;
  label: string;
  href?: string;
  onDatesChange?: (start: Date, end: Date) => void;
  dayWidth: number;
  unitDays: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [draftDates, setDraftDates] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const movedRef = useRef(false);
  const latestDatesRef = useRef<{ start: Date; end: Date } | null>(null);

  if (!startDate && !endDate) {
    return (
      <span className='pl-2 text-xs text-muted-foreground'>No dates set</span>
    );
  }

  const baseStart = startDate ?? endDate!;
  const baseEnd = endDate ?? startDate!;
  const effectiveStart = draftDates?.start ?? baseStart;
  const effectiveEnd = draftDates?.end ?? baseEnd;
  const offsetDays = daysBetween(rangeStart, effectiveStart);
  const spanDays = Math.max(1, daysBetween(effectiveStart, effectiveEnd) + 1);

  function beginDrag(mode: DragMode, e: React.PointerEvent) {
    if (!onDatesChange) return;
    const handleDatesChange = onDatesChange;

    e.preventDefault();
    e.stopPropagation();
    movedRef.current = false;
    latestDatesRef.current = null;
    setIsDragging(true);

    const originStart = baseStart;
    const originEnd = baseEnd;
    const startX = e.clientX;
    const snapWidth = dayWidth * unitDays;

    function handleMove(ev: PointerEvent) {
      const deltaUnits = Math.round((ev.clientX - startX) / snapWidth);
      const deltaDays = deltaUnits * unitDays;
      if (deltaDays !== 0) movedRef.current = true;

      let newStart = originStart;
      let newEnd = originEnd;
      if (mode === 'move') {
        newStart = new Date(originStart.getTime() + deltaDays * 86400000);
        newEnd = new Date(originEnd.getTime() + deltaDays * 86400000);
      } else if (mode === 'resize-start') {
        newStart = new Date(originStart.getTime() + deltaDays * 86400000);
        if (newStart > originEnd) newStart = originEnd;
      } else {
        newEnd = new Date(originEnd.getTime() + deltaDays * 86400000);
        if (newEnd < originStart) newEnd = originStart;
      }
      latestDatesRef.current = { start: newStart, end: newEnd };
      setDraftDates({ start: newStart, end: newEnd });
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setIsDragging(false);
      setDraftDates(null);
      if (movedRef.current && latestDatesRef.current) {
        handleDatesChange(
          latestDatesRef.current.start,
          latestDatesRef.current.end,
        );
      }
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  const bar = (
    <div
      className={cn(
        'group absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90 transition-opacity hover:opacity-100',
        colorClass,
        isDragging && 'opacity-100 ring-2 ring-foreground/30',
        onDatesChange && 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        left: offsetDays * dayWidth,
        width: spanDays * dayWidth - Math.min(4, dayWidth * 0.3),
      }}
      title={`${label} · ${toISODate(effectiveStart)} – ${toISODate(effectiveEnd)}`}
      onPointerDown={(e) => beginDrag('move', e)}
    >
      {onDatesChange && (
        <div
          className='absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100'
          onPointerDown={(e) => beginDrag('resize-start', e)}
        />
      )}
      <span className='block truncate px-2 text-[10px] leading-5 text-white select-none'>
        {label}
      </span>
      {onDatesChange && (
        <div
          className='absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100'
          onPointerDown={(e) => beginDrag('resize-end', e)}
        />
      )}
    </div>
  );

  return href ? (
    <Link
      href={href}
      className='absolute inset-0'
      onClickCapture={handleClickCapture}
    >
      {bar}
    </Link>
  ) : (
    bar
  );
}

function MonthHeader({ days, dayWidth }: { days: Date[]; dayWidth: number }) {
  const groups: { label: string; count: number }[] = [];
  for (const d of days) {
    const label = d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.count += 1;
    } else {
      groups.push({ label, count: 1 });
    }
  }
  return (
    <div className='flex border-b bg-card'>
      {groups.map((g, i) => (
        <div
          key={i}
          className='shrink-0 border-r px-2 py-1.5 text-xs font-semibold text-muted-foreground'
          style={{ width: g.count * dayWidth }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

function WeekHeader({ days, dayWidth }: { days: Date[]; dayWidth: number }) {
  const groups: { label: string; count: number }[] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) {
      groups.push({
        label: d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        count: 1,
      });
    } else {
      groups[groups.length - 1].count += 1;
    }
  });
  return (
    <div className='flex border-b bg-card'>
      {groups.map((g, i) => (
        <div
          key={i}
          className='shrink-0 border-r border-border/40 py-1 text-center text-[10px] text-muted-foreground'
          style={{ width: g.count * dayWidth }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

function DayHeader({ days, dayWidth }: { days: Date[]; dayWidth: number }) {
  return (
    <div className='flex border-b bg-card'>
      {days.map((d, i) => (
        <div
          key={i}
          className={cn(
            'shrink-0 border-r border-border/40 py-1 text-center text-[10px] text-muted-foreground',
            isToday(d) && 'bg-primary/5 font-semibold text-foreground',
          )}
          style={{ width: dayWidth }}
        >
          {formatDay(d)}
        </div>
      ))}
    </div>
  );
}

export function TimelineView({
  projects,
  tasks,
}: {
  projects: ProjectWithClient[];
  tasks: Task[];
}) {
  const range = useMemo(() => computeRange(projects, tasks), [projects, tasks]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    if (typeof window === 'undefined') return 'day';
    const stored = window.localStorage.getItem('timeline-zoom');
    return stored === 'day' || stored === 'week' || stored === 'month'
      ? stored
      : 'day';
  });
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const dayWidth = ZOOM_DAY_WIDTH[zoom];
  const unitDays = ZOOM_UNIT_DAYS[zoom];

  useEffect(() => {
    localStorage.setItem('timeline-zoom', zoom);
  }, [zoom]);

  useEffect(() => {
    if (!chartScrollRef.current) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offsetDays = daysBetween(range.start, today);
    const scrollTarget = Math.max(0, offsetDays * dayWidth - 200);
    chartScrollRef.current.scrollLeft = scrollTarget;
  }, [range, dayWidth]);

  function toggle(projectId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function handleProjectDatesChange(projectId: string, start: Date, end: Date) {
    startTransition(async () => {
      try {
        await updateProjectDates(projectId, toISODate(start), toISODate(end));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update project dates',
        );
      }
    });
  }

  function handleTaskDatesChange(
    taskId: string,
    projectId: string,
    start: Date,
    end: Date,
  ) {
    startTransition(async () => {
      try {
        await updateTaskDates(
          taskId,
          projectId,
          toISODate(start),
          toISODate(end),
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to update task dates',
        );
      }
    });
  }

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.parent_task_id) continue;
      (
        map.get(t.project_id) ?? map.set(t.project_id, []).get(t.project_id)!
      ).push(t);
    }
    return map;
  }, [tasks]);

  const chartWidth = range.days.length * dayWidth;

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-start pl-5 mb-12'>
        <div className='inline-flex rounded-md border p-0.5'>
          {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type='button'
              onClick={() => setZoom(z)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                zoom === z
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      <div className='flex overflow-hidden border'>
        {/* Sidebar */}
        <div className='w-64 shrink-0 divide-y overflow-y-auto border-r bg-card'>
          <div className='h-[73px] border-b' />
          {projects.map((project) => {
            const projectTasks = tasksByProject.get(project.id) ?? [];
            const isExpanded = expanded.has(project.id);
            return (
              <div key={project.id}>
                <button
                  type='button'
                  onClick={() => toggle(project.id)}
                  className='flex w-full items-center gap-1.5 px-2 text-left text-sm hover:bg-muted/40'
                  style={{ height: ROW_HEIGHT }}
                >
                  {projectTasks.length > 0 ? (
                    isExpanded ? (
                      <ChevronDownIcon className='size-3.5 shrink-0 text-muted-foreground' />
                    ) : (
                      <ChevronRightIcon className='size-3.5 shrink-0 text-muted-foreground' />
                    )
                  ) : (
                    <span className='size-3.5 shrink-0' />
                  )}
                  <span className='truncate font-medium'>
                    {project.clients
                      ? `${project.clients.name} — ${project.name}`
                      : project.name}
                  </span>
                </button>
                {isExpanded &&
                  projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className='flex items-center px-2 pl-8 text-sm text-muted-foreground'
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className='truncate'>{task.title}</span>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div ref={chartScrollRef} className='flex-1 overflow-x-auto'>
          <div style={{ width: chartWidth }}>
            <MonthHeader days={range.days} dayWidth={dayWidth} />
            {zoom === 'day' && (
              <DayHeader days={range.days} dayWidth={dayWidth} />
            )}
            {zoom === 'week' && (
              <WeekHeader days={range.days} dayWidth={dayWidth} />
            )}
            {zoom === 'month' && <div className='h-[25px] border-b bg-card' />}
            <div className='relative divide-y'>
              {projects.map((project) => {
                const projectTasks = tasksByProject.get(project.id) ?? [];
                const isExpanded = expanded.has(project.id);
                return (
                  <div key={project.id}>
                    <div className='relative' style={{ height: ROW_HEIGHT }}>
                      <BarBackground days={range.days} dayWidth={dayWidth} />
                      <GanttBar
                        startDate={parseDate(project.start_date)}
                        endDate={parseDate(project.end_date)}
                        rangeStart={range.start}
                        colorClass={projectDotColorClass(project.color, null)}
                        label={project.name}
                        href={`/projects/${project.id}`}
                        onDatesChange={(start, end) =>
                          handleProjectDatesChange(project.id, start, end)
                        }
                        dayWidth={dayWidth}
                        unitDays={unitDays}
                      />
                    </div>
                    {isExpanded &&
                      projectTasks.map((task) => (
                        <div
                          key={task.id}
                          className='relative'
                          style={{ height: ROW_HEIGHT }}
                        >
                          <BarBackground
                            days={range.days}
                            dayWidth={dayWidth}
                          />
                          <GanttBar
                            startDate={parseDate(task.start_date)}
                            endDate={parseDate(task.due_date)}
                            rangeStart={range.start}
                            colorClass='bg-muted-foreground/60'
                            label={task.title}
                            href={`/projects/${project.id}?task=${task.id}`}
                            onDatesChange={(start, end) =>
                              handleTaskDatesChange(
                                task.id,
                                project.id,
                                start,
                                end,
                              )
                            }
                            dayWidth={dayWidth}
                            unitDays={unitDays}
                          />
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
