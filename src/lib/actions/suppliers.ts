'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/slug';
import type { Region } from '@/lib/supabase/types';

export async function createSupplierRecord(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get('name'));
  const contact_name = (formData.get('contact_name') as string) || null;
  const contact_email = (formData.get('contact_email') as string) || null;
  const slug = await generateUniqueSlug(supabase, 'suppliers', name);

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name, contact_name, contact_email, slug })
    .select('id, name, slug')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/suppliers');
  return data;
}

async function updateSupplierField(
  supplierSlug: string,
  field: string,
  value: string | null,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('suppliers')
    .update({ [field]: value })
    .eq('slug', supplierSlug);

  if (error) throw new Error(error.message);

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${supplierSlug}`);
}

export async function updateSupplierName(
  supplierId: string,
  currentSlug: string,
  name: string,
) {
  const supabase = await createSupabaseServerClient();

  const newSlug = await generateUniqueSlug(
    supabase,
    'suppliers',
    name,
    supplierId,
  );

  if (newSlug !== currentSlug) {
    const { error: historyError } = await supabase
      .from('supplier_slug_history')
      .insert({ supplier_id: supplierId, slug: currentSlug });
    if (historyError) throw new Error(historyError.message);
  }

  const { error } = await supabase
    .from('suppliers')
    .update({ name, slug: newSlug })
    .eq('id', supplierId);
  if (error) throw new Error(error.message);

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${currentSlug}`);
  revalidatePath(`/suppliers/${newSlug}`);

  return newSlug;
}

export async function updateSupplierContactName(
  supplierSlug: string,
  contactName: string,
) {
  await updateSupplierField(supplierSlug, 'contact_name', contactName || null);
}

export async function updateSupplierContactNameTitle(
  supplierSlug: string,
  title: string,
) {
  await updateSupplierField(supplierSlug, 'contact_name_title', title || null);
}

export async function updateSupplierContactEmail(
  supplierSlug: string,
  email: string,
) {
  await updateSupplierField(supplierSlug, 'contact_email', email || null);
}

export async function updateSupplierPhone(supplierSlug: string, phone: string) {
  await updateSupplierField(supplierSlug, 'phone', phone || null);
}

export async function updateSupplierAddress(
  supplierSlug: string,
  address: string,
) {
  await updateSupplierField(supplierSlug, 'address', address || null);
}

export async function updateSupplierRegion(
  supplierSlug: string,
  region: Region | null,
) {
  await updateSupplierField(supplierSlug, 'region', region);
}

export async function updateSupplierNotes(supplierSlug: string, notes: string) {
  await updateSupplierField(supplierSlug, 'notes', notes || null);
}

export async function deleteSupplier(supplierId: string) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) throw new Error(error.message);

  revalidatePath('/suppliers');
}
