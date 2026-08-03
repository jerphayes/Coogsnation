import { useQuery } from "@tanstack/react-query";
import type { SelfUser } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<SelfUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
