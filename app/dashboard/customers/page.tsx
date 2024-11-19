import { Metadata } from 'next';
import CustomersTable from '@/app/ui/customers/table';
import Search from '@/app/ui/search';
import { fetchFilteredCustomers } from '@/app/lib/data';

export const metadata: Metadata = {
  title: 'Customers',
};

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const customers = await fetchFilteredCustomers(query);
  return (
    <div>
      <CustomersTable customers={customers} />
    </div>
  );
}