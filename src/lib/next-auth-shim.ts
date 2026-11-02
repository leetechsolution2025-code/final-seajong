import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useSession() {
  const { user } = useAuth();
  return useMemo(
    () => ({
      data: user ? { user } : null,
      status: user ? 'authenticated' : 'unauthenticated',
    }),
    [user]
  );
}

export default { useSession };
