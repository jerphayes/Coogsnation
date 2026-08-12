import {
  QueryClient,
  QueryFunction,
} from "@tanstack/react-query";

async function throwIfResNotOk(
  res: Response,
) {
  if (!res.ok) {
    const text =
      (await res.text()) ||
      res.statusText;

    throw new Error(
      `${res.status}: ${text}`,
    );
  }
}

/*
 * During development/testing we want anonymous visitors
 * to exercise the entire MEMBER experience without
 * creating accounts over and over.
 *
 * Account/authentication pages are deliberately excluded
 * so the real Join/Login/CAPTCHA/email-verification flows
 * can still be tested separately.
 */
function isAccountFlowPage(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const path =
    window.location.pathname;

  return (
    path === "/join" ||
    path === "/signup" ||
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/reset-password" ||
    path === "/verify-email" ||
    path === "/verify-email-pending" ||
    path === "/complete-profile"
  );
}

/*
 * Prevent several React queries from trying to establish
 * the guest session simultaneously.
 */
let guestSessionPromise:
  Promise<boolean> | null = null;

export async function ensureDevGuestSession():
  Promise<boolean> {

  if (isAccountFlowPage()) {
    return false;
  }

  if (guestSessionPromise) {
    return guestSessionPromise;
  }

  guestSessionPromise =
    (async () => {
      try {
        const statusResponse =
          await fetch(
            "/api/auth/dev-guest/status",
            {
              credentials: "include",
              cache: "no-store",
            },
          );

        if (!statusResponse.ok) {
          return false;
        }

        const status =
          await statusResponse
            .json()
            .catch(() => ({}));

        if (!status?.enabled) {
          return false;
        }

        const loginResponse =
          await fetch(
            "/api/auth/dev-guest",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: "{}",
            },
          );

        return loginResponse.ok;

      } catch {
        return false;

      } finally {
        /*
         * Allow a later retry if the Codespaces session
         * or development server was restarted.
         */
        window.setTimeout(() => {
          guestSessionPromise = null;
        }, 1000);
      }
    })();

  return guestSessionPromise;
}

async function fetchWithGuestAccess(
  url: string,
  init?: RequestInit,
): Promise<Response> {

  let response =
    await fetch(url, {
      ...init,
      credentials: "include",
    });

  /*
   * A normal member-protected API returned 401.
   * During development, establish GuestTestPass and
   * retry the original request once.
   */
  if (
    response.status === 401 &&
    !isAccountFlowPage()
  ) {
    const guestReady =
      await ensureDevGuestSession();

    if (guestReady) {
      response =
        await fetch(url, {
          ...init,
          credentials: "include",
        });
    }
  }

  return response;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {

  const res =
    await fetchWithGuestAccess(
      url,
      {
        method,

        headers: data
          ? {
              "Content-Type":
                "application/json",
            }
          : {},

        body: data
          ? JSON.stringify(data)
          : undefined,
      },
    );

  await throwIfResNotOk(res);

  return res;
}

type UnauthorizedBehavior =
  | "returnNull"
  | "throw";

export const getQueryFn:
  <T>(options: {
    on401: UnauthorizedBehavior;
  }) => QueryFunction<T> =

  ({ on401: unauthorizedBehavior }) =>

  async ({ queryKey }) => {

    const url =
      queryKey.join("/") as string;

    const res =
      await fetchWithGuestAccess(url);

    if (
      unauthorizedBehavior ===
        "returnNull" &&
      res.status === 401
    ) {
      return null;
    }

    await throwIfResNotOk(res);

    return await res.json();
  };

export const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        queryFn:
          getQueryFn({
            on401: "throw",
          }),

        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        retry: false,
      },

      mutations: {
        retry: false,
      },
    },
  });
