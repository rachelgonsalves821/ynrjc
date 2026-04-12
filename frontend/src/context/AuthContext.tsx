import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Profile {
  id: string;
  email: string;
  target_language: string;
  proficiency_level?: number;
}

export interface AuthContextType {
  user: any;
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => void;
  /** Re-read token/profile from localStorage (e.g. after login). */
  syncFromStorage: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

function parseProfile(raw: string): Profile | null {
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    if (!p?.id) return null;
    return {
      id: p.id,
      email: typeof p.email === "string" ? p.email : "",
      target_language:
        typeof p.target_language === "string" ? p.target_language : "",
      proficiency_level:
        typeof p.proficiency_level === "number"
          ? p.proficiency_level
          : undefined,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncFromStorage = useCallback(() => {
    const t = localStorage.getItem("token");
    const raw = localStorage.getItem("profile");
    if (t && raw) {
      const p = parseProfile(raw);
      if (p) {
        setToken(t);
        setProfile(p);
        return;
      }
    }
    setToken(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    syncFromStorage();
    setLoading(false);
  }, [syncFromStorage]);

  const signOut = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
    window.location.reload();
  }, []);

  const user = useMemo(() => profile, [profile]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      profile,
      loading,
      signOut,
      syncFromStorage,
    }),
    [user, token, profile, loading, signOut, syncFromStorage]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
