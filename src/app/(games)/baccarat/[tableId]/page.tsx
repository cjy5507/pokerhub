import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BaccaratPage({ params }: { params: Promise<{ tableId: string }> }) {
    await params;
    redirect('/baccarat');
}
