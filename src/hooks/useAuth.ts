'use client';

import { useRouter } from 'next/navigation';

export type User = {
  id: string;
  email: string;
  nickname: string;
  level: number;
  points: number;
  role: string;
};

export function useAuth() {
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    logout,
  };
}
