import { getSession } from '@/lib/auth/session';
import { BaccaratTableClient } from './BaccaratTableClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function BaccaratPage({ params }: { params: Promise<{ tableId: string }> }) {
    const session = await getSession();
    const { tableId } = await params;

    return (
        <BaccaratTableClient
            tableId={tableId}
            userId={session?.userId ?? null}
            nickname={session?.nickname ?? null}
        />
    );
}
