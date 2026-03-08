import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all roles for the current user from user_roles table.
 * Returns role booleans and a loading flag.
 */
export function useUserRoles() {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRoles([]);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (!error && data) {
          setRoles(data.map((r) => r.role));
        } else {
          setRoles([]);
        }
      } catch {
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  const isAdmin = roles.includes('admin');
  const isQA = roles.includes('qa');
  const hasAnyRole = roles.length > 0;

  return { roles, isAdmin, isQA, hasAnyRole, loading };
}
