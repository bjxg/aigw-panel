import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getUserInfo, logout, useUserAPI } from "./user-api";
import type { User } from "./user-api";

interface UserAuthContextValue {
  user: User | null;
  helpUrl: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  signOut: () => void;
}

const UserAuthContext = createContext<UserAuthContextValue>({
  user: null,
  helpUrl: null,
  loading: true,
  error: null,
  refresh: () => {},
  signOut: () => {},
});

export function useUserAuth() {
  return useContext(UserAuthContext);
}

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [helpUrl, setHelpUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useUserAPI();

  const refresh = useCallback(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setHelpUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getUserInfo()
      .then((data) => {
        setUser(data.user);
        setHelpUrl(data.help_url || null);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch user info");
        setUser(null);
        setHelpUrl(null);
      })
      .finally(() => setLoading(false));
  }, [getToken]);

  const signOut = useCallback(() => {
    logout()
      .catch(() => {})
      .finally(() => {
        setUser(null);
        setHelpUrl(null);
        setError(null);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserAuthContext.Provider
      value={{ user, helpUrl, loading, error, refresh, signOut }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}
