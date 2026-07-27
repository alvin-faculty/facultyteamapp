import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientDetailView } from '@/components/ClientDetailView';
import type { Client, ClientContact } from '@/lib/supabase/types';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!client) {
    const { data: historyRow } = await supabase
      .from('client_slug_history')
      .select('client_id')
      .eq('slug', slug)
      .maybeSingle();

    if (historyRow) {
      const { data: currentClient } = await supabase
        .from('clients')
        .select('slug')
        .eq('id', historyRow.client_id)
        .maybeSingle();

      if (currentClient) {
        redirect(`/clients/${currentClient.slug}`);
      }
    }
    notFound();
  }

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at');

  return (
    <ClientDetailView
      client={client as Client}
      contacts={(contacts as ClientContact[]) ?? []}
    />
  );
}
