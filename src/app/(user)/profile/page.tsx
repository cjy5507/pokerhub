import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function ProfileRedirectPage() {
  const session = await getSession();

  if (!session?.userId) {
    redirect('/login?redirect=/profile');
  }

  redirect(`/profile/${session.userId}`);
}
