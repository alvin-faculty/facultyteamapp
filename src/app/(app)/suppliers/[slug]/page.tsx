import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupplierDetailView } from '@/components/SupplierDetailView';
import type { Supplier, SupplierContact } from '@/lib/supabase/types';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!supplier) {
    const { data: historyRow } = await supabase
      .from('supplier_slug_history')
      .select('supplier_id')
      .eq('slug', slug)
      .maybeSingle();

    if (historyRow) {
      const { data: currentSupplier } = await supabase
        .from('suppliers')
        .select('slug')
        .eq('id', historyRow.supplier_id)
        .maybeSingle();

      if (currentSupplier) {
        redirect(`/suppliers/${currentSupplier.slug}`);
      }
    }
    notFound();
  }

  const { data: contacts } = await supabase
    .from('supplier_contacts')
    .select('*')
    .eq('supplier_id', supplier.id)
    .order('created_at');

  return (
    <SupplierDetailView
      supplier={supplier as Supplier}
      contacts={(contacts as SupplierContact[]) ?? []}
    />
  );
}
