import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Placeholder for checking token or local user state
      setLoading(false);
    };
    checkAuth();
  }, []);

  return { user, loading };
};
