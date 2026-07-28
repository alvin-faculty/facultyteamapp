'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, TrashIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { EditableField, EditableRegionField } from '@/components/EditableField';
import { ContactPersonList } from '@/components/ContactPersonList';
import {
  updateClientName,
  updateClientContactName,
  updateClientContactNameTitle,
  updateClientContactEmail,
  updateClientPhone,
  updateClientRegion,
  updateClientNotes,
  deleteClient,
} from '@/lib/actions/clients';
import type { Client, ClientContact } from '@/lib/supabase/types';

export function ClientDetailView({
  client,
  contacts,
}: {
  client: Client;
  contacts: ClientContact[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function saveName(name: string) {
    const newSlug = await updateClientName(client.id, client.slug, name);
    if (newSlug !== client.slug) {
      router.replace(`/clients/${newSlug}`);
    }
  }

  function remove() {
    if (!confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteClient(client.id);
        router.push('/clients');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete client',
        );
      }
    });
  }

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex items-center justify-between'>
        <Link
          href='/contacts'
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft className='size-4' />
          All Contacts
        </Link>
        <Link
          href='/clients'
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft className='size-4' />
          All Clients
        </Link>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          disabled={isPending}
          onClick={remove}
        >
          <TrashIcon className='size-4' />
          Delete client
        </Button>
      </div>

      <EditableField label='Name' value={client.name} onSave={saveName} />

      <Card>
        <CardContent className='grid grid-cols-2 gap-4 py-4 md:grid-cols-3'>
          <EditableField
            label='Contact name'
            value={client.contact_name ?? ''}
            onSave={(v) => updateClientContactName(client.slug, v)}
          />
          <EditableField
            label='Contact title'
            value={client.contact_name_title ?? ''}
            onSave={(v) => updateClientContactNameTitle(client.slug, v)}
          />
          <EditableField
            label='Contact email'
            value={client.contact_email ?? ''}
            type='email'
            onSave={(v) => updateClientContactEmail(client.slug, v)}
          />
          <EditableField
            label='Phone'
            value={client.phone ?? ''}
            type='tel'
            onSave={(v) => updateClientPhone(client.slug, v)}
          />
          <EditableRegionField
            label='Region'
            value={client.region}
            onSave={(v) => updateClientRegion(client.slug, v)}
          />
          <EditableField
            label='Notes'
            value={client.notes ?? ''}
            multiline
            onSave={(v) => updateClientNotes(client.slug, v)}
          />
        </CardContent>
      </Card>

      <ContactPersonList
        parentType='client'
        parentId={client.id}
        contacts={contacts}
      />
    </div>
  );
}
