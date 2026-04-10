"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  getMe,
  login,
  logout,
  type AdminSession,
  type LoginPayload,
} from "@/lib/auth";
import { ApiError } from "@/lib/api";

type AuthContextValue = {
  user: AdminSession | null;
  isLoading: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldCheckAdminSession =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/login");
  const [user, setUser] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getMe();
      setUser(session);
    } catch (error) {
      setUser(null);

      if (
        error instanceof ApiError &&
        error.statusCode === 401 &&
        (pathname.startsWith("/dashboard") || pathname.startsWith("/events"))
      ) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!shouldCheckAdminSession) {
      setIsLoading(false);
      return;
    }

    void refreshSession();
  }, [refreshSession, shouldCheckAdminSession]);

  const signIn = useCallback(
    async (payload: LoginPayload) => {
      await login(payload);
      await refreshSession();
    },
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Session may already be invalid; continue to local sign-out.
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signIn,
      signOut,
      refreshSession,
    }),
    [isLoading, refreshSession, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
