import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { NewClientDialog } from '@/components/NewClientDialog';
import type { Client } from '@/lib/supabase/types';

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  const allClients = (clients as Client[]) ?? [];

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex items-center justify-between gap-2'>
        <h1>Clients</h1>
        <NewClientDialog />
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {allClients.map((client) => (
          <Link key={client.id} href={`/clients/${client.slug}`}>
            <Card className='transition-colors hover:bg-muted/50'>
              <CardContent className='space-y-1 py-4'>
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-semibold'>{client.name}</p>
                  {client.region && (
                    <span className='rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold tracking-wide text-muted-foreground uppercase'>
                      {client.region.replace('_', '/')}
                    </span>
                  )}
                </div>
                {client.contact_name && (
                  <p className='text-sm text-muted-foreground'>
                    {client.contact_name}
                    {client.contact_name_title
                      ? ` · ${client.contact_name_title}`
                      : ''}
                  </p>
                )}
                {client.contact_email && (
                  <p className='text-xs text-muted-foreground'>
                    {client.contact_email}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {allClients.length === 0 && (
          <p className='text-sm text-muted-foreground'>No clients yet.</p>
        )}
      </div>
    </div>
  );
}
