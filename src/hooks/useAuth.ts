import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

export type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  bio: string | null;
  role: "user" | "admin";
  authType: "oauth" | "local";
  createdAt: Date;
};

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const {
    data: localUser,
    isLoading: localLoading,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.localAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate(redirectPath);
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const user: UnifiedUser | null = useMemo(() => {
    if (!localUser) return null;
    return {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      avatar: localUser.avatar,
      bio: localUser.bio,
      role: localUser.role as "user" | "admin",
      authType: "local" as const,
      createdAt: localUser.createdAt,
    };
  }, [localUser]);

  const isLoading = localLoading;

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      logout,
      refresh: () => utils.invalidate(),
    }),
    [user, isLoading, logoutMutation.isPending, logout, utils],
  );
}
