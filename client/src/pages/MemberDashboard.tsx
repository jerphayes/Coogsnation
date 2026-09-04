import MemberAvatar from "@/components/MemberAvatar";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import MemberMfaPanel from "@/components/MemberMfaPanel";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const DASHBOARD_TABS = [
  "overview",
  "posts",
  "orders",
  "notifications",
  "stats",
  "account",
] as const;

type DashboardTab =
  (typeof DASHBOARD_TABS)[number];

function requestedTab(): DashboardTab {
  const value =
    new URLSearchParams(
      window.location.search,
    ).get("tab");

  return DASHBOARD_TABS.includes(
    value as DashboardTab,
  )
    ? (value as DashboardTab)
    : "overview";
}

export default function MemberDashboard() {
  const {
    user,
    isLoading,
    isAuthenticated,
  } = useAuth();

  const [, navigate] = useLocation();

  const member = user as any;

  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);

  const [deleteConfirmed, setDeleteConfirmed] =
    useState(false);

  const [deletingMembership, setDeletingMembership] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const [tab, setTab] =
    useState<DashboardTab>(() => requestedTab());

  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated
    ) {
      navigate(
        "/login?returnTo=%2Fdashboard",
        {
          replace: true,
        },
      );
    }
  }, [
    isLoading,
    isAuthenticated,
    navigate,
  ]);

  /*
   * One personal control center.
   * Legacy /profile and /member-dashboard
   * aliases canonicalize to /dashboard.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (
      window.location.pathname ===
        "/profile" ||
      window.location.pathname ===
        "/member-dashboard"
    ) {
      navigate(
        `/dashboard${window.location.search}`,
        {
          replace: true,
        },
      );
    }
  }, [
    isAuthenticated,
    navigate,
  ]);

  const userId =
    member?.id;

  /*
   * Recovered useful legacy-profile statistics.
   * Source remains the established member stats endpoint.
   */
  const {
    data: memberStats,
  } = useQuery<any>({
    queryKey: [
      "/api/users/stats",
      userId,
    ],
    enabled: Boolean(userId),
  });

  const achievementBadgeCount =
    memberStats
      ? [
          Number(memberStats.postsCount || 0) >= 100,
          Number(memberStats.likesReceived || 0) >= 500,
          Number(memberStats.yearsActive || 0) >= 3,
          Number(memberStats.helpfulAnswers || 0) >= 50,
          Boolean(memberStats.forumModerator),
        ].filter(Boolean).length
      : 0;

  const {
    data: userPosts = [],
    isLoading: postsLoading,
  } = useQuery<any[]>({
    queryKey: [
      "/api/users",
      userId,
      "posts",
    ],
    enabled: Boolean(userId),
  });

  const {
    data: userOrders = [],
    isLoading: ordersLoading,
  } = useQuery<any[]>({
    queryKey: [
      "/api/users",
      userId,
      "orders",
    ],
    enabled: Boolean(userId),
  });

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
  } = useQuery<any[]>({
    queryKey: [
      "/api/users",
      userId,
      "notifications",
    ],
    enabled: Boolean(userId),
  });

  const markNotificationRead =
    useMutation({
      mutationFn:
        async (
          notificationId: number,
        ) => {
          const response =
            await fetch(
              `/api/notifications/${notificationId}/read`,
              {
                method: "PUT",
                credentials:
                  "include",
              },
            );

          if (!response.ok) {
            throw new Error(
              "Unable to update notification.",
            );
          }
        },

      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [
            "/api/users",
            userId,
            "notifications",
          ],
        });
      },
    });

  if (
    isLoading ||
    !isAuthenticated ||
    !user
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-600">
          Loading your dashboard…
        </main>

        <Footer />
      </div>
    );
  }

  const firstName =
    member.firstName || "";

  const lastName =
    member.lastName || "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    member.email ||
    "CoogsNation Member";

  const handle =
    member.handle ||
    member.username ||
    "";

  const initials =
    (
      `${firstName?.[0] || ""}${
        lastName?.[0] || ""
      }` ||
      handle?.slice(0, 2) ||
      "CN"
    ).toUpperCase();

  const avatarUrl =
    member.profileImageUrl ||
    member.avatarUrl ||
    member.profileImage ||
    member.avatar ||
    "";

  const reputation =
    member.reputation || 0;

  const postCount =
    userPosts.length ||
    member.postCount ||
    0;

  const unreadNotifications =
    notifications.filter(
      (item: any) =>
        !item.isRead,
    ).length;

  const memberSince =
    member.createdAt
      ? new Date(
          member.createdAt,
        ).toLocaleDateString()
      : "—";

  async function permanentlyDeleteMembership() {
    if (!deleteConfirmed || deletingMembership) {
      return;
    }

    setDeleteError("");
    setDeletingMembership(true);

    try {
      const response =
        await fetch(
          "/api/users/profile",
          {
            method: "DELETE",
            credentials: "include",
          },
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data?.message ||
            "Unable to delete membership.",
        );
      }

      await fetch(
        "/api/logout",
        {
          method: "POST",
          credentials: "include",
        },
      ).catch(() => undefined);

      queryClient.clear();

      window.location.href = "/";
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete membership.",
      );

      setDeletingMembership(false);
    }
  }

  function changeTab(
    nextTab: string,
  ) {
    if (
      !DASHBOARD_TABS.includes(
        nextTab as DashboardTab,
      )
    ) {
      return;
    }

    const safeTab =
      nextTab as DashboardTab;

    setTab(safeTab);

    navigate(
      `/dashboard?tab=${safeTab}`,
      {
        replace: true,
      },
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        data-testid="member-dashboard"
      >
        <div className="mb-7">
          <h1 className="text-3xl font-black text-gray-950">
            Your Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Your CoogsNation activity,
            account and community
            information in one place.
          </p>
        </div>

        {/* MEMBER COMMUNITY STATS — recovered from useful legacy profile UI */}
        <div
          className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4"
          data-testid="member-community-stats"
        >
          <Card>
            <CardContent className="p-5 text-center">
              <div className="mb-2 text-3xl" aria-hidden="true">💬</div>
              <div className="text-3xl font-black text-red-700">
                {Number(memberStats?.postsCount || 0)}
              </div>
              <div className="mt-1 font-bold text-red-700">
                Forum Posts
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="mb-2 text-3xl" aria-hidden="true">♥</div>
              <div className="text-3xl font-black text-red-700">
                {Number(memberStats?.likesReceived || 0)}
              </div>
              <div className="mt-1 font-bold text-red-700">
                Likes Received
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="mb-2 text-3xl" aria-hidden="true">🏆</div>
              <div className="text-3xl font-black text-red-700">
                {achievementBadgeCount}
              </div>
              <div className="mt-1 font-bold text-red-700">
                Achievement Badges
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="mb-2 text-3xl" aria-hidden="true">★</div>
              <div className="text-3xl font-black text-red-700">
                {Number(memberStats?.reputationScore || 0)}
              </div>
              <div className="mt-1 font-bold text-red-700">
                Reputation Score
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* MEMBER IDENTITY */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-red-700 text-2xl font-black text-white">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-gray-950">
                    {fullName}
                  </h2>

                  {handle && (
                    <p className="truncate text-sm font-medium text-gray-600">
                      @{handle}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {reputation} Rep
                    </Badge>

                    <Badge variant="outline">
                      {postCount} Posts
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t pt-4 text-sm text-gray-600">
                Member since{" "}
                <span className="font-semibold text-gray-900">
                  {memberSince}
                </span>
              </div>

              <Link
                href="/profile/edit"
                className="mt-5 flex min-h-11 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 font-semibold text-gray-900 transition hover:bg-gray-50"
                data-testid="button-edit-profile"
              >
                ✎&nbsp;&nbsp;Edit Profile
              </Link>

              <button
                type="button"
                onClick={() =>
                  changeTab(
                    "account",
                  )
                }
                className="mt-3 min-h-11 w-full rounded-md border border-gray-300 bg-white px-4 font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Account & Security
              </button>
            </CardContent>
          </Card>

          {/* DASHBOARD CONTENT */}
          <Tabs
            value={tab}
            onValueChange={changeTab}
            className="min-w-0"
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-gray-100 p-1 sm:grid-cols-6">
              <TabsTrigger value="overview">
                Overview
              </TabsTrigger>

              <TabsTrigger value="posts">
                Posts
              </TabsTrigger>

              <TabsTrigger value="orders">
                Orders
              </TabsTrigger>

              <TabsTrigger value="notifications">
                Notifications
              </TabsTrigger>

              <TabsTrigger value="stats">
                Stats
              </TabsTrigger>

              <TabsTrigger value="account">
                Account
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent
              value="overview"
              className="mt-5 space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStat
                  label="Posts"
                  value={postCount}
                  href="/dashboard?tab=posts"
                />

                <DashboardStat
                  label="Orders"
                  value={userOrders.length}
                  href="/dashboard?tab=orders"
                />

                <DashboardStat
                  label="Notifications"
                  value={unreadNotifications}
                  href="/dashboard?tab=notifications"
                />

                <DashboardStat
                  label="Messages"
                  value="Open"
                  href="/messages"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Quick Access
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DashboardLink
                      href="/forums"
                      label="Forums"
                    />

                    <DashboardLink
                      href="/event-management"
                      label="Events"
                    />

                    <DashboardLink
                      href="/store"
                      label="Shopping"
                    />

                    <DashboardLink
                      href="/messages"
                      label="Messages"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Recent Activity
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {postsLoading ? (
                    <LoadingRows />
                  ) : userPosts.length >
                    0 ? (
                    <div className="space-y-4">
                      {userPosts
                        .slice(
                          0,
                          4,
                        )
                        .map(
                          (
                            post:
                              any,
                          ) => (
                            <PostRow
                              key={
                                post.id
                              }
                              post={
                                post
                              }
                            />
                          ),
                        )}
                    </div>
                  ) : (
                    <EmptyState text="No posts yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* POSTS */}
            <TabsContent
              value="posts"
              className="mt-5"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    Your Posts
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {postsLoading ? (
                    <LoadingRows />
                  ) : userPosts.length >
                    0 ? (
                    <div className="space-y-4">
                      {userPosts.map(
                        (
                          post:
                            any,
                        ) => (
                          <PostRow
                            key={
                              post.id
                            }
                            post={
                              post
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState text="No posts yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ORDERS */}
            <TabsContent
              value="orders"
              className="mt-5"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    Order History
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {ordersLoading ? (
                    <LoadingRows />
                  ) : userOrders.length >
                    0 ? (
                    <div className="space-y-4">
                      {userOrders.map(
                        (
                          order:
                            any,
                        ) => (
                          <div
                            key={
                              order.id
                            }
                            className="rounded-lg border p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">
                                  Order #
                                  {
                                    order.id
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {order.createdAt
                                    ? new Date(
                                        order.createdAt,
                                      ).toLocaleDateString()
                                    : ""}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="font-bold text-red-700">
                                  $
                                  {
                                    order.totalAmount
                                  }
                                </p>

                                <Badge
                                  variant="secondary"
                                  className="mt-1"
                                >
                                  {
                                    order.status
                                  }
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState text="No orders yet" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* NOTIFICATIONS */}
            <TabsContent
              value="notifications"
              className="mt-5"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    Notifications
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {notificationsLoading ? (
                    <LoadingRows />
                  ) : notifications.length >
                    0 ? (
                    <div className="space-y-3">
                      {notifications.map(
                        (
                          notification:
                            any,
                        ) => (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              markNotificationRead.mutate(
                                notification.id,
                              )
                            }
                            className={`w-full rounded-lg border p-4 text-left transition hover:bg-gray-50 ${
                              notification.isRead
                                ? "bg-gray-50"
                                : "border-red-300 bg-white"
                            }`}
                          >
                            <p className="font-semibold text-gray-950">
                              {
                                notification.title
                              }
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              {
                                notification.message
                              }
                            </p>

                            <p className="mt-2 text-xs text-gray-500">
                              {notification.createdAt
                                ? new Date(
                                    notification.createdAt,
                                  ).toLocaleDateString()
                                : ""}
                            </p>
                          </button>
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState text="No notifications" />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* STATS */}
            <TabsContent
              value="stats"
              className="mt-5"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Community Activity
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <StatRow
                      label="Posts"
                      value={postCount}
                    />

                    <StatRow
                      label="Reputation"
                      value={
                        reputation
                      }
                    />

                    <StatRow
                      label="Member Since"
                      value={
                        memberSince
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      Account
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <StatRow
                      label="Email"
                      value={
                        member.email
                      }
                    />

                    <StatRow
                      label="Handle"
                      value={
                        handle
                          ? `@${handle}`
                          : "—"
                      }
                    />

                    <StatRow
                      label="Status"
                      value={
                        member.accountStatus ||
                        "active"
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ACCOUNT */}
            <TabsContent
              value="account"
              className="mt-5 space-y-5"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    Profile & Personal Information
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="mb-4 text-sm leading-6 text-gray-600">
                    Update your name,
                    CoogsNation handle,
                    avatar, contact
                    information and member
                    preferences from the
                    canonical profile editor.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Account & Security
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <MemberMfaPanel />
                </CardContent>
              </Card>

              <Card className="border-red-300">
                <CardHeader>
                  <CardTitle className="text-red-700">
                    Delete Membership
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {!showDeleteConfirmation ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setDeleteConfirmed(false);
                        setDeleteError("");
                        setShowDeleteConfirmation(true);
                      }}
                      data-testid="button-delete-membership"
                    >
                      DELETE MEMBERSHIP
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <p className="font-bold text-red-700">
                        Delete Your Membership?
                      </p>

                      <p className="text-sm font-semibold text-gray-800">
                        This action is permanent and cannot be undone.
                        All records will be unrecoverable.
                      </p>

                      <label className="flex items-start gap-3 text-sm font-semibold text-gray-800">
                        <input
                          type="checkbox"
                          checked={deleteConfirmed}
                          onChange={(event) =>
                            setDeleteConfirmed(
                              event.target.checked,
                            )
                          }
                          className="mt-1 h-4 w-4"
                          data-testid="checkbox-confirm-delete-membership"
                        />

                        <span>
                          I understand and want to permanently
                          delete my membership.
                        </span>
                      </label>

                      {deleteError && (
                        <p
                          role="alert"
                          className="text-sm font-semibold text-red-700"
                        >
                          {deleteError}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={
                            !deleteConfirmed ||
                            deletingMembership
                          }
                          onClick={
                            permanentlyDeleteMembership
                          }
                          data-testid="button-confirm-delete-membership"
                        >
                          {deletingMembership
                            ? "DELETING…"
                            : "PERMANENTLY DELETE MY MEMBERSHIP"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={deletingMembership}
                          onClick={() => {
                            setShowDeleteConfirmation(false);
                            setDeleteConfirmed(false);
                            setDeleteError("");
                          }}
                        >
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DashboardStat({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md"
    >
      <p className="text-sm font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-gray-950">
        {value}
      </p>
    </Link>
  );
}

function DashboardLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-center rounded-lg border bg-white px-4 text-center font-semibold text-gray-900 transition hover:border-red-300 hover:bg-red-50"
    >
      {label}
    </Link>
  );
}

function PostRow({
  post,
}: {
  post: any;
}) {
  return (
    <div className="border-b pb-4 last:border-b-0">
      <p className="font-semibold text-gray-950">
        {post.topicTitle ||
          post.title ||
          "Forum post"}
      </p>

      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
        {post.content}
      </p>

      {post.createdAt && (
        <p className="mt-2 text-xs text-gray-500">
          {new Date(
            post.createdAt,
          ).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(
        (item) => (
          <div
            key={item}
            className="animate-pulse"
          >
            <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        ),
      )}
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <p className="py-10 text-center text-gray-500">
      {text}
    </p>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b pb-3 last:border-b-0">
      <span className="text-gray-600">
        {label}
      </span>

      <span className="font-semibold text-gray-950">
        {value ?? "—"}
      </span>
    </div>
  );
}
