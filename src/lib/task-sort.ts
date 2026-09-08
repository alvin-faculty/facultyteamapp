import type { Task } from '@/lib/supabase/types';

export function sortByPriorityThen<T extends Pick<Task, 'high_priority'>>(
  items: T[],
  compareFn: (a: T, b: T) => number,
): T[] {
  return [...items].sort((a, b) => {
    if (a.high_priority !== b.high_priority) return a.high_priority ? -1 : 1;
    return compareFn(a, b);
  });
}
