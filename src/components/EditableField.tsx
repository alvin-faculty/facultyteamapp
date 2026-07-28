'use client';

import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PencilIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Region } from '@/lib/supabase/types';

const REGION_LABELS: Record<Region, string> = {
  canada: 'Canada',
  usa: 'USA',
  asia: 'Asia',
  uk_europe: 'UK/Europe',
};

export function EditableRegionField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: Region | null;
  onSave: (value: Region | null) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function save(next: string | null) {
    startTransition(async () => {
      try {
        await onSave(next === 'none' ? null : (next as Region));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save');
      }
    });
  }

  return (
    <Field label={label}>
      <Select value={value ?? 'none'} onValueChange={save} disabled={isPending}>
        <SelectTrigger className='h-8 text-sm'>
          <SelectValue placeholder='—' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='none'>—</SelectItem>
          {(Object.entries(REGION_LABELS) as [Region, string][]).map(
            ([val, lbl]) => (
              <SelectItem key={val} value={val}>
                {lbl}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
        {label}
      </p>
      {children}
    </div>
  );
}

export function EditableField({
  label,
  value,
  displayValue,
  onSave,
  type = 'text',
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  displayValue?: ReactNode;
  onSave: (value: string) => Promise<void>;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save');
      }
    });
  }

  return (
    <Field label={label}>
      {editing ? (
        multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            disabled={isPending}
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <Input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            disabled={isPending}
            placeholder={placeholder}
            autoFocus
          />
        )
      ) : (
        <div className='flex min-w-0 items-center gap-1.5'>
          <div className='min-w-0 truncate text-sm'>
            {displayValue ??
              (value.trim() ? (
                value
              ) : (
                <span className='text-muted-foreground'>—</span>
              ))}
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon-xs'
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            <PencilIcon className='size-3' />
          </Button>
        </div>
      )}
    </Field>
  );
}
