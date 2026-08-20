'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { projectDotColorClass } from '@/lib/project-color';
import { cn } from '@/lib/utils';
import type { Client, Project, Task } from '@/lib/supabase/types';

type ProjectWithClient = Project & { clients: Client | null };

const DAY_WIDTH = 28; // px per day column
const ROW_HEIGHT = 36; // px per row
const MIN_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 180;

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

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

  // Always include today in the visible range
  if (today < start) start = today;
  if (today > end) end = today;

  // Pad a few days on each side for breathing room
  start = new Date(start.getTime() - 3 * 86400000);
  end = new Date(end.getTime() + 3 * 86400000);

  // Clamp overall span
  const span = daysBetween(start, end);
  if (span < MIN_RANGE_DAYS) {
    const extra = MIN_RANGE_DAYS - span;
    end = new Date(end.getTime() + extra * 86400000);
  } else if (span > MAX_RANGE_DAYS) {
    end = new Date(start.getTime() + MAX_RANGE_DAYS * 86400000);
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

function BarBackground({ days }: { days: Date[] }) {
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
          style={{ width: DAY_WIDTH }}
        />
      ))}
    </div>
  );
}

function GanttBar({
  startDate,
  endDate,
  rangeStart,
  colorClass,
  label,
  href,
}: {
  startDate: Date | null;
  endDate: Date | null;
  rangeStart: Date;
  colorClass: string;
  label: string;
  href?: string;
}) {
  if (!startDate && !endDate) {
    return (
      <span className='pl-2 text-xs text-muted-foreground'>No dates set</span>
    );
  }

  const effectiveStart = startDate ?? endDate!;
  const effectiveEnd = endDate ?? startDate!;
  const offsetDays = daysBetween(rangeStart, effectiveStart);
  const spanDays = Math.max(1, daysBetween(effectiveStart, effectiveEnd) + 1);

  const bar = (
    <div
      className={cn(
        'absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90 transition-opacity hover:opacity-100',
        colorClass,
      )}
      style={{ left: offsetDays * DAY_WIDTH, width: spanDays * DAY_WIDTH - 4 }}
      title={label}
    >
      <span className='block truncate px-2 text-[10px] leading-5 text-white'>
        {label}
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className='absolute inset-0'>
      {bar}
    </Link>
  ) : (
    bar
  );
}

function MonthHeader({ days }: { days: Date[] }) {
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
          style={{ width: g.count * DAY_WIDTH }}
        >
          {g.label}
        </div>
      ))}
    </div>
  );
}

function DayHeader({ days }: { days: Date[] }) {
  return (
    <div className='flex border-b bg-card'>
      {days.map((d, i) => (
        <div
          key={i}
          className={cn(
            'shrink-0 border-r border-border/40 py-1 text-center text-[10px] text-muted-foreground',
            isToday(d) && 'bg-primary/5 font-semibold text-foreground',
          )}
          style={{ width: DAY_WIDTH }}
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

  function toggle(projectId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.parent_task_id) continue; // skip subtasks in the timeline for now
      (
        map.get(t.project_id) ?? map.set(t.project_id, []).get(t.project_id)!
      ).push(t);
    }
    return map;
  }, [tasks]);

  const chartWidth = range.days.length * DAY_WIDTH;

  return (
    <div className='flex overflow-hidden rounded-xl border'>
      {/* Sidebar */}
      <div className='w-64 shrink-0 divide-y overflow-y-auto border-r bg-card'>
        <div className='h-[52px] border-b' />{' '}
        {/* spacer matching the two header rows */}
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
      <div className='flex-1 overflow-x-auto'>
        <div style={{ width: chartWidth }}>
          <MonthHeader days={range.days} />
          <DayHeader days={range.days} />
          <div className='relative divide-y'>
            {projects.map((project) => {
              const projectTasks = tasksByProject.get(project.id) ?? [];
              const isExpanded = expanded.has(project.id);
              return (
                <div key={project.id}>
                  <div className='relative' style={{ height: ROW_HEIGHT }}>
                    <BarBackground days={range.days} />
                    <GanttBar
                      startDate={parseDate(project.start_date)}
                      endDate={parseDate(project.end_date)}
                      rangeStart={range.start}
                      colorClass={projectDotColorClass(
                        project.color,
                        null,
                      ).replace('bg-', 'bg-')}
                      label={project.name}
                      href={`/projects/${project.id}`}
                    />
                  </div>
                  {isExpanded &&
                    projectTasks.map((task) => (
                      <div
                        key={task.id}
                        className='relative'
                        style={{ height: ROW_HEIGHT }}
                      >
                        <BarBackground days={range.days} />
                        <GanttBar
                          startDate={parseDate(task.start_date)}
                          endDate={parseDate(task.due_date)}
                          rangeStart={range.start}
                          colorClass='bg-muted-foreground/60'
                          label={task.title}
                          href={`/projects/${project.id}?task=${task.id}`}
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
  );
}
