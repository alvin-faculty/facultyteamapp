import { createClient } from '@/lib/supabase/server';
import { ContactsView } from '@/components/ContactsView';
import type { Client, Supplier } from '@/lib/supabase/types';

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: suppliers }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('suppliers').select('*').order('name'),
  ]);

  return (
    <ContactsView
      clients={(clients as Client[]) ?? []}
      suppliers={(suppliers as Supplier[]) ?? []}
    />
  );
}
