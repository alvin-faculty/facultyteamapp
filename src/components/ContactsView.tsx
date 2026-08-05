'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewClientDialog } from '@/components/NewClientDialog';
import { NewSupplierDialog } from '@/components/NewSupplierDialog';
import type { Client, Supplier, Region } from '@/lib/supabase/types';

const REGION_ORDER: Region[] = ['canada', 'usa', 'asia', 'uk_europe'];

const REGION_LABELS: Record<Region, string> = {
  canada: 'Canada',
  usa: 'USA',
  asia: 'Asia',
  uk_europe: 'UK/Europe',
};

function groupByRegion<T extends { region: Region | null }>(
  items: T[],
): Record<Region, T[]> {
  const groups: Record<Region, T[]> = {
    canada: [],
    usa: [],
    asia: [],
    uk_europe: [],
  };
  for (const item of items) {
    const region = item.region ?? 'canada';
    groups[region].push(item);
  }
  return groups;
}

function matchesQuery(
  item: {
    name: string;
    contact_name: string | null;
    contact_email: string | null;
  },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    (item.contact_name?.toLowerCase().includes(q) ?? false) ||
    (item.contact_email?.toLowerCase().includes(q) ?? false)
  );
}

function ClientCard({ client }: { client: Client }) {
  return (
    <Link href={`/clients/${client.slug}`}>
      <Card className='cursor-pointer rounded-lg bg-card transition-colors hover:bg-muted/40 ring-0'>
        <CardContent className='space-y-1 py-0'>
          <p className='text-sm font-semibold'>{client.name}</p>
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
          {client.phone && (
            <p className='text-xs text-muted-foreground'>{client.phone}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Link href={`/suppliers/${supplier.slug}`}>
      <Card className='cursor-pointer rounded-lg bg-card transition-colors hover:bg-muted/40 ring-0'>
        <CardContent className='space-y-1 py-0'>
          <p className='text-sm font-semibold'>{supplier.name}</p>
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
          {supplier.phone && (
            <p className='text-xs text-muted-foreground'>{supplier.phone}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function RegionSection<T>({
  region,
  items,
  renderItem,
}: {
  region: Region;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <div className='pt-8 pr-5 pb-14 pl-5 mb-0 border-b border-b-[#e3e3e3] first:border-t first:border-t-[#e3e3e3] last:border-b-0'>
      <h4 className='mb-4'>{REGION_LABELS[region]}</h4>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {items.map((item, i) => (
          <div key={i}>{renderItem(item)}</div>
        ))}
      </div>
    </div>
  );
}

export function ContactsView({
  clients,
  suppliers,
}: {
  clients: Client[];
  suppliers: Supplier[];
}) {
  const [query, setQuery] = useState('');

  const filteredClients = useMemo(
    () => clients.filter((c) => matchesQuery(c, query)),
    [clients, query],
  );
  const filteredSuppliers = useMemo(
    () => suppliers.filter((s) => matchesQuery(s, query)),
    [suppliers, query],
  );

  const clientsByRegion = groupByRegion(filteredClients);
  const suppliersByRegion = groupByRegion(filteredSuppliers);

  return (
    <div className='col-span-12 space-y-6'>
      <div className='flex flex-col justify-between mt-8 mb-12 gap-12 pl-5 pr-5'>
        <h1>Contacts</h1>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <div className='relative w-full max-w-xs'>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search contacts…'
            />
          </div>
          <div className='flex justify-end'>
            <NewClientDialog />
          </div>
        </div>
      </div>

      <Tabs defaultValue='clients'>
        <TabsList>
          <TabsTrigger value='clients'>Clients</TabsTrigger>
          <TabsTrigger value='suppliers'>Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value='clients' className='space-y-6'>
          {filteredClients.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {query ? 'No clients match your search.' : 'No clients yet.'}
            </p>
          ) : (
            REGION_ORDER.map((region) => (
              <RegionSection
                key={region}
                region={region}
                items={clientsByRegion[region]}
                renderItem={(client) => <ClientCard client={client} />}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value='suppliers' className='space-y-6'>
          <div className='flex justify-end'>
            <NewSupplierDialog />
          </div>
          {filteredSuppliers.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {query ? 'No suppliers match your search.' : 'No suppliers yet.'}
            </p>
          ) : (
            REGION_ORDER.map((region) => (
              <RegionSection
                key={region}
                region={region}
                items={suppliersByRegion[region]}
                renderItem={(supplier) => <SupplierCard supplier={supplier} />}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
