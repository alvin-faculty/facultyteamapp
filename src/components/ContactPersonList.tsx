'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PencilIcon, TrashIcon, Plus } from 'lucide-react';
import {
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
} from '@/lib/actions/contact-people';
import type { ContactPerson } from '@/lib/supabase/types';

type ParentType = 'client' | 'supplier';

function ContactPersonForm({
  parentType,
  parentId,
  contact,
  onDone,
}: {
  parentType: ParentType;
  parentId: string;
  contact?: ContactPerson;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        if (contact) {
          await updateContactPerson(parentType, contact.id, parentId, formData);
        } else {
          await createContactPerson(parentType, parentId, formData);
        }
        onDone();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save contact',
        );
      }
    });
  }

  return (
    <form action={submit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='name'>Name</Label>
        <Input id='name' name='name' defaultValue={contact?.name} required />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='title'>Title</Label>
        <Input id='title' name='title' defaultValue={contact?.title ?? ''} />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          name='email'
          type='email'
          defaultValue={contact?.email ?? ''}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='phone'>Phone</Label>
        <Input
          id='phone'
          name='phone'
          type='tel'
          defaultValue={contact?.phone ?? ''}
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='address'>Address</Label>
        <Input
          id='address'
          name='address'
          defaultValue={contact?.address ?? ''}
        />
      </div>
      <Button type='submit' disabled={isPending} className='w-full'>
        {contact ? 'Save contact' : 'Add contact'}
      </Button>
    </form>
  );
}

function ContactPersonRow({
  parentType,
  parentId,
  contact,
}: {
  parentType: ParentType;
  parentId: string;
  contact: ContactPerson;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        await deleteContactPerson(parentType, contact.id, parentId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete contact',
        );
      }
    });
  }

  return (
    <div className='space-y-1 rounded-md border bg-background p-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold'>{contact.name}</p>
          {contact.title && (
            <p className='text-xs text-muted-foreground'>{contact.title}</p>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger
              render={
                <Button type='button' variant='ghost' size='icon-xs'>
                  <PencilIcon className='size-3' />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit contact</DialogTitle>
              </DialogHeader>
              <ContactPersonForm
                parentType={parentType}
                parentId={parentId}
                contact={contact}
                onDone={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
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
      </div>
      <div className='flex flex-wrap gap-x-3 text-xs text-muted-foreground'>
        {contact.email && <span>{contact.email}</span>}
        {contact.phone && <span>{contact.phone}</span>}
        {contact.address && <span>{contact.address}</span>}
      </div>
    </div>
  );
}

export function ContactPersonList({
  parentType,
  parentId,
  contacts,
}: {
  parentType: ParentType;
  parentId: string;
  contacts: ContactPerson[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className='space-y-3'>
      <div className='flex items-baseline justify-between'>
        <h2 className='text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase'>
          Additional contacts
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button size='sm' variant='outline'>
                <Plus className='size-4' />
                Add contact
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add contact</DialogTitle>
            </DialogHeader>
            <ContactPersonForm
              parentType={parentType}
              parentId={parentId}
              onDone={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className='space-y-2'>
        {contacts.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No additional contacts yet.
          </p>
        ) : (
          contacts.map((c) => (
            <ContactPersonRow
              key={c.id}
              parentType={parentType}
              parentId={parentId}
              contact={c}
            />
          ))
        )}
      </div>
    </div>
  );
}
