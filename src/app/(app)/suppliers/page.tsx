import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { NewSupplierDialog } from '@/components/NewSupplierDialog';
import type { Supplier } from '@/lib/supabase/types';

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');

  const allSuppliers = (suppliers as Supplier[]) ?? [];

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex items-center justify-between gap-2'>
        <h1>Suppliers</h1>
        <NewSupplierDialog />
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {allSuppliers.map((supplier) => (
          <Link key={supplier.id} href={`/suppliers/${supplier.slug}`}>
            <Card className='transition-colors hover:bg-muted/50'>
              <CardContent className='space-y-1 py-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold'>{supplier.name}</p>
                  {supplier.region && (
                    <span className='rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase'>
                      {supplier.region.replace('_', '/')}
                    </span>
                  )}
                </div>
                {supplier.contact_name && (
                  <p className='text-sm text-muted-foreground'>
                    {supplier.contact_name}
                    {supplier.contact_name_title
                      ? ` · ${supplier.contact_name_title}`
                      : ''}
                  </p>
                )}
                {supplier.contact_email && (
                  <p className='text-xs text-muted-foreground'>
                    {supplier.contact_email}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {allSuppliers.length === 0 && (
          <p className='text-sm text-muted-foreground'>No suppliers yet.</p>
        )}
      </div>
    </div>
  );
}
