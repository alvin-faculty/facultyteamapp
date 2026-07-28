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
  updateSupplierName,
  updateSupplierContactName,
  updateSupplierContactNameTitle,
  updateSupplierContactEmail,
  updateSupplierPhone,
  updateSupplierAddress,
  updateSupplierRegion,
  updateSupplierNotes,
  deleteSupplier,
} from '@/lib/actions/suppliers';
import type { Supplier, SupplierContact } from '@/lib/supabase/types';

export function SupplierDetailView({
  supplier,
  contacts,
}: {
  supplier: Supplier;
  contacts: SupplierContact[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function saveName(name: string) {
    const newSlug = await updateSupplierName(supplier.id, supplier.slug, name);
    if (newSlug !== supplier.slug) {
      router.replace(`/suppliers/${newSlug}`);
    }
  }

  function remove() {
    if (!confirm(`Delete ${supplier.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteSupplier(supplier.id);
        router.push('/suppliers');
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete supplier',
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
          href='/suppliers'
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft className='size-4' />
          Suppliers
        </Link>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          disabled={isPending}
          onClick={remove}
        >
          <TrashIcon className='size-4' />
          Delete supplier
        </Button>
      </div>

      <EditableField label='Name' value={supplier.name} onSave={saveName} />

      <Card>
        <CardContent className='grid grid-cols-2 gap-4 py-4 md:grid-cols-3'>
          <EditableField
            label='Contact name'
            value={supplier.contact_name ?? ''}
            onSave={(v) => updateSupplierContactName(supplier.slug, v)}
          />
          <EditableField
            label='Contact title'
            value={supplier.contact_name_title ?? ''}
            onSave={(v) => updateSupplierContactNameTitle(supplier.slug, v)}
          />
          <EditableField
            label='Contact email'
            value={supplier.contact_email ?? ''}
            type='email'
            onSave={(v) => updateSupplierContactEmail(supplier.slug, v)}
          />
          <EditableField
            label='Phone'
            value={supplier.phone ?? ''}
            type='tel'
            onSave={(v) => updateSupplierPhone(supplier.slug, v)}
          />
          <EditableField
            label='Address'
            value={supplier.address ?? ''}
            multiline
            onSave={(v) => updateSupplierAddress(supplier.slug, v)}
          />
          <EditableRegionField
            label='Region'
            value={supplier.region}
            onSave={(v) => updateSupplierRegion(supplier.slug, v)}
          />
          <EditableField
            label='Notes'
            value={supplier.notes ?? ''}
            multiline
            onSave={(v) => updateSupplierNotes(supplier.slug, v)}
          />
        </CardContent>
      </Card>

      <ContactPersonList
        parentType='supplier'
        parentId={supplier.id}
        contacts={contacts}
      />
    </div>
  );
}
