'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { minutesBetween } from '@/lib/format';
import type { TimeEntry } from '@/lib/supabase/types';

export type RunningTimeEntry = TimeEntry & {
  projects: { name: string } | null;
  tasks: { title: string } | null;
  my_tasks: { title: string | null } | null;
};

async function resolveRate(projectId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase
      .from('projects')
      .select('hourly_rate_override')
      .eq('id', projectId)
      .single(),
    supabase.from('profiles').select('hourly_rate').eq('id', userId).single(),
  ]);
  return project?.hourly_rate_override ?? profile?.hourly_rate ?? 0;
}

async function resolvePersonalRate(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_rate')
    .eq('id', userId)
    .single();
  return profile?.hourly_rate ?? 0;
}

async function resolveTaskBillable(taskId: string | null) {
  if (!taskId) return true;
  const supabase = await createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('billable')
    .eq('id', taskId)
    .single();
  return task?.billable ?? true;
}

export async function startTimer(
  projectId: string,
  taskId: string | null,
  description: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await stopAnyRunningTimer(user.id);

  const [rate_snapshot, billable] = await Promise.all([
    resolveRate(projectId, user.id),
    resolveTaskBillable(taskId),
  ]);

  const insertPayload = {
    project_id: projectId,
    task_id: taskId,
    user_id: user.id,
    description: description || null,
    started_at: new Date().toISOString(),
    ended_at: null,
    billable,
    rate_snapshot,
  };

  const { error } = await supabase.from('time_entries').insert(insertPayload);

  if (error) {
    // Unique-violation on the "one running timer per user" index — someone else
    // (or a double-click) started a timer in the moment between our check and
    // this insert. Stop whatever won the race and retry once.
    if (error.code === '23505') {
      await stopAnyRunningTimer(user.id);
      const { error: retryError } = await supabase
        .from('time_entries')
        .insert(insertPayload);
      if (retryError) throw new Error(retryError.message);
    } else {
      throw new Error(error.message);
    }
  }

  revalidatePath('/', 'layout');
}

export async function startMyTaskTimer(myTaskId: string, description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await stopAnyRunningTimer(user.id);

  const rate_snapshot = await resolvePersonalRate(user.id);

  const insertPayload = {
    project_id: null,
    task_id: null,
    my_task_id: myTaskId,
    user_id: user.id,
    description: description || null,
    started_at: new Date().toISOString(),
    ended_at: null,
    billable: false,
    rate_snapshot,
  };

  const { error } = await supabase.from('time_entries').insert(insertPayload);

  if (error) {
    if (error.code === '23505') {
      await stopAnyRunningTimer(user.id);
      const { error: retryError } = await supabase
        .from('time_entries')
        .insert(insertPayload);
      if (retryError) throw new Error(retryError.message);
    } else {
      throw new Error(error.message);
    }
  }

  revalidatePath('/', 'layout');
  revalidatePath('/my-tasks');
}

async function stopAnyRunningTimer(userId: string) {
  const supabase = await createClient();
  const { data: running } = await supabase
    .from('time_entries')
    .select('id, started_at')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();

  if (!running) return;

  const ended_at = new Date().toISOString();
  await supabase
    .from('time_entries')
    .update({
      ended_at,
      duration_minutes: minutesBetween(running.started_at, ended_at),
    })
    .eq('id', running.id);
}

export async function createManualEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const project_id = String(formData.get('project_id'));
  const task_id = (formData.get('task_id') as string) || null;
  const description = (formData.get('description') as string) || null;
  const date = String(formData.get('date'));
  const hours = Number(formData.get('hours'));
  const billable = formData.get('billable') === 'on';

  if (!project_id || !date || !Number.isFinite(hours) || hours <= 0) {
    throw new Error('Please fill in a project, date, and duration');
  }

  const rate_snapshot = await resolveRate(project_id, user.id);
  const duration_minutes = Math.round(hours * 60);
  const started_at = new Date(`${date}T09:00:00`).toISOString();
  const ended_at = new Date(
    new Date(started_at).getTime() + duration_minutes * 60000,
  ).toISOString();

  const { error } = await supabase.from('time_entries').insert({
    project_id,
    task_id,
    user_id: user.id,
    description,
    started_at,
    ended_at,
    duration_minutes,
    billable,
    rate_snapshot,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function updateTimeEntry(entryId: string, formData: FormData) {
  const supabase = await createClient();

  const date = String(formData.get('date'));
  const hours = Number(formData.get('hours'));
  const description = (formData.get('description') as string) || null;
  const billable = formData.get('billable') === 'on';

  if (!date || !Number.isFinite(hours) || hours <= 0) {
    throw new Error('Please enter a valid date and duration');
  }

  const { data: entry } = await supabase
    .from('time_entries')
    .select('started_at')
    .eq('id', entryId)
    .single();
  if (!entry) throw new Error('Entry not found');

  // Keep the original time-of-day, just move it to the new date, so a real
  // timer session's actual clock time isn't silently reset to a fake anchor.
  const originalTime = new Date(entry.started_at);
  const [year, month, day] = date.split('-').map(Number);
  const started_at = new Date(
    year,
    month - 1,
    day,
    originalTime.getHours(),
    originalTime.getMinutes(),
    originalTime.getSeconds(),
  ).toISOString();

  const duration_minutes = Math.round(hours * 60);
  const ended_at = new Date(
    new Date(started_at).getTime() + duration_minutes * 60000,
  ).toISOString();

  const { error } = await supabase
    .from('time_entries')
    .update({ started_at, ended_at, duration_minutes, description, billable })
    .eq('id', entryId);

  if (error) throw new Error(error.message);
  revalidatePath('/tracked-time');
  revalidatePath('/my-time');
}

export async function updateTimeEntryTimes(
  entryId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const date = String(formData.get('date'));
  const startTime = String(formData.get('start_time'));
  const endTime = String(formData.get('end_time'));
  const description = (formData.get('description') as string) || null;
  const billable = formData.get('billable') === 'on';

  if (!date || !startTime || !endTime) {
    throw new Error('Please enter a date, start time, and end time');
  }

  const started_at = new Date(`${date}T${startTime}:00`);
  const ended_at = new Date(`${date}T${endTime}:00`);

  if (ended_at <= started_at) {
    throw new Error('End time must be after start time');
  }

  const duration_minutes = Math.round(
    (ended_at.getTime() - started_at.getTime()) / 60000,
  );

  const { error } = await supabase
    .from('time_entries')
    .update({
      started_at: started_at.toISOString(),
      ended_at: ended_at.toISOString(),
      duration_minutes,
      description,
      billable,
    })
    .eq('id', entryId);

  if (error) throw new Error(error.message);
  revalidatePath('/tracked-time');
  revalidatePath('/my-time');
}

export async function updateTimeEntryDuration(entryId: string, hours: number) {
  const supabase = await createClient();

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('Please enter a valid duration');
  }

  const { data: entry } = await supabase
    .from('time_entries')
    .select('started_at')
    .eq('id', entryId)
    .single();
  if (!entry) throw new Error('Entry not found');

  const duration_minutes = Math.round(hours * 60);
  const ended_at = new Date(
    new Date(entry.started_at).getTime() + duration_minutes * 60000,
  ).toISOString();

  const { error } = await supabase
    .from('time_entries')
    .update({ ended_at, duration_minutes })
    .eq('id', entryId);

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw new Error(error.message);
  revalidatePath('/tracked-time');
  revalidatePath('/my-time');
}

export async function stopTimer(entryId: string) {
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', entryId)
    .single();
  if (!entry) throw new Error('Entry not found');

  const ended_at = new Date().toISOString();
  const duration_minutes = minutesBetween(entry.started_at, ended_at);

  const { error } = await supabase
    .from('time_entries')
    .update({ ended_at, duration_minutes })
    .eq('id', entryId);

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}
