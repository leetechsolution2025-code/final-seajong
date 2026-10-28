import { useAuth } from '@/context/AuthContext';

export function useSession() {
  const { user } = useAuth();
  return {
    data: user ? { user } : null,
    status: user ? 'authenticated' : 'unauthenticated',
  };
}

export default { useSession };
