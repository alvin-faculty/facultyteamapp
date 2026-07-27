'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

type ParentType = 'client' | 'supplier';

function tableFor(parentType: ParentType) {
  return parentType === 'client' ? 'client_contacts' : 'supplier_contacts';
}

function foreignKeyFor(parentType: ParentType) {
  return parentType === 'client' ? 'client_id' : 'supplier_id';
}

function pathFor(parentType: ParentType, parentId: string) {
  return parentType === 'client'
    ? `/clients/${parentId}`
    : `/suppliers/${parentId}`;
}

export async function createContactPerson(
  parentType: ParentType,
  parentId: string,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get('name'));
  const title = (formData.get('title') as string) || null;
  const email = (formData.get('email') as string) || null;
  const phone = (formData.get('phone') as string) || null;
  const address = (formData.get('address') as string) || null;

  const { error } = await supabase
    .from(tableFor(parentType))
    .insert({
      [foreignKeyFor(parentType)]: parentId,
      name,
      title,
      email,
      phone,
      address,
    });

  if (error) throw new Error(error.message);

  revalidatePath(pathFor(parentType, parentId));
}

export async function updateContactPerson(
  parentType: ParentType,
  contactId: string,
  parentId: string,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get('name'));
  const title = (formData.get('title') as string) || null;
  const email = (formData.get('email') as string) || null;
  const phone = (formData.get('phone') as string) || null;
  const address = (formData.get('address') as string) || null;

  const { error } = await supabase
    .from(tableFor(parentType))
    .update({ name, title, email, phone, address })
    .eq('id', contactId);

  if (error) throw new Error(error.message);

  revalidatePath(pathFor(parentType, parentId));
}

export async function deleteContactPerson(
  parentType: ParentType,
  contactId: string,
  parentId: string,
) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from(tableFor(parentType))
    .delete()
    .eq('id', contactId);

  if (error) throw new Error(error.message);

  revalidatePath(pathFor(parentType, parentId));
}
