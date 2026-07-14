import { useCallback, useEffect, useState } from 'react';
import { getProfile } from '../services/api.js';
import { useAuth } from './useAuth.js';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const profileRow = await getProfile();
      setProfile(profileRow);
      setError('');
      return profileRow;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, loading, error, refresh };
}
