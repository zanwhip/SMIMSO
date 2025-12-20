import { getSession } from 'next-auth/react';
import { Session } from 'next-auth';

export interface ExtendedSession extends Session {
  accessToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    first_name?: string;
    last_name?: string;
  };
}

export async function getAuthSession(): Promise<ExtendedSession | null> {
  const session = await getSession();
  return session as ExtendedSession | null;
}

export async function getAuthToken(): Promise<string | null> {
  const session = await getSession();
  return (session as ExtendedSession)?.accessToken || null;
}

