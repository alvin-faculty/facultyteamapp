'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/slug';
import type { Region } from '@/lib/supabase/types';

export async function createClientRecord(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get('name'));
  const contact_name = (formData.get('contact_name') as string) || null;
  const contact_email = (formData.get('contact_email') as string) || null;
  const slug = await generateUniqueSlug(supabase, 'clients', name);

  const { data, error } = await supabase
    .from('clients')
    .insert({ name, contact_name, contact_email, slug })
    .select('id, name, slug')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/clients');
  return data;
}

async function updateClientField(
  clientSlug: string,
  field: string,
  value: string | null,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('clients')
    .update({ [field]: value })
    .eq('slug', clientSlug);

  if (error) throw new Error(error.message);

  revalidatePath('/clients');
  revalidatePath(`/clients/${clientSlug}`);
}

export async function updateClientName(
  clientId: string,
  currentSlug: string,
  name: string,
) {
  const supabase = await createSupabaseServerClient();

  const newSlug = await generateUniqueSlug(supabase, 'clients', name, clientId);

  if (newSlug !== currentSlug) {
    const { error: historyError } = await supabase
      .from('client_slug_history')
      .insert({ client_id: clientId, slug: currentSlug });
    if (historyError) throw new Error(historyError.message);
  }

  const { error } = await supabase
    .from('clients')
    .update({ name, slug: newSlug })
    .eq('id', clientId);
  if (error) throw new Error(error.message);

  revalidatePath('/clients');
  revalidatePath(`/clients/${currentSlug}`);
  revalidatePath(`/clients/${newSlug}`);

  return newSlug;
}

export async function updateClientContactName(
  clientSlug: string,
  contactName: string,
) {
  await updateClientField(clientSlug, 'contact_name', contactName || null);
}

export async function updateClientContactNameTitle(
  clientSlug: string,
  title: string,
) {
  await updateClientField(clientSlug, 'contact_name_title', title || null);
}

export async function updateClientContactEmail(
  clientSlug: string,
  email: string,
) {
  await updateClientField(clientSlug, 'contact_email', email || null);
}

export async function updateClientPhone(clientSlug: string, phone: string) {
  await updateClientField(clientSlug, 'phone', phone || null);
}

export async function updateClientRegion(
  clientSlug: string,
  region: Region | null,
) {
  await updateClientField(clientSlug, 'region', region);
}

export async function updateClientNotes(clientSlug: string, notes: string) {
  await updateClientField(clientSlug, 'notes', notes || null);
}

export async function deleteClient(clientId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('clients').delete().eq('id', clientId);

  if (error) throw new Error(error.message);

  revalidatePath('/clients');
}
