'use client';

import { createContext, useContext } from 'react';

export type Session = {
  userId: string;
  email: string;
  nickname: string;
  role: string;
} | null;

const SessionContext = createContext<Session>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
