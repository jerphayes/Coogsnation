import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoungeChatOverlay } from "@/components/lounge/LoungeChatOverlay";
import { useLoungeRoom } from "@/hooks/useLoungeRoom";
import { useAuth } from "@/hooks/useAuth";
import { forumCategoryPath } from "@/lib/forumNavigation";

import type { ForumCategory, ForumTopic } from "@shared/schema";

export default function ForumTopicPage() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const numericTopicId = /^\d+$/.test(topicId) ? Number(topicId) : 0;
  const roomId = numericTopicId > 0 ? `forum-topic-${numericTopicId}` : "";

  const { isAuthenticated } = useAuth();

  const topicUrl = `/api/forums/topics/${numericTopicId}`;

  const {
    data: topic,
    isLoading: topicLoading,
    error: topicError,
  } = useQuery<ForumTopic>({
    queryKey: [topicUrl],
    enabled: numericTopicId > 0,
  });

  const { data: categories = [] } = useQuery<ForumCategory[]>({
    queryKey: ["/api/forums/categories"],
  });

  const category = topic
    ? categories.find((item) => item.id === topic.categoryId)
    : undefined;

  const discussion = useLoungeRoom(roomId, {
    enabled:
      numericTopicId > 0 &&
      Boolean(topic) &&
      isAuthenticated,
  });

  if (
    numericTopicId < 1 ||
    (!topicLoading && (topicError || !topic))
  ) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Header />

        <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-xl border border-white/10 bg-black/50 p-8 text-center">
            <h1 className="text-2xl font-bold">Discussion not found</h1>

            <p className="mt-3 text-sm text-white/60">
              This discussion does not exist or is no longer available.
            </p>

            <Link href="/forums">
              <Button className="mt-6">
                Return to Forums
              </Button>
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {topicLoading || !topic ? (
            <div className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ) : (
            <>
              <nav
                className="mb-4 flex flex-wrap items-center gap-2 text-xs text-white/55"
                aria-label="Breadcrumb"
              >
                <Link href="/forums" className="hover:text-white">
                  Forums
                </Link>

                <span>/</span>

                {category ? (
                  <Link
                    href={forumCategoryPath(category.slug)}
                    className="hover:text-white"
                  >
                    {category.name}
                  </Link>
                ) : (
                  <span>Community</span>
                )}

                <span>/</span>

                <span className="text-white/80">
                  {topic.title}
                </span>
              </nav>

              <section className="mb-4 rounded-xl border border-white/10 bg-black/50 px-5 py-4 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold sm:text-2xl">
                    {topic.title}
                  </h1>

                  {topic.isPinned && (
                    <Badge variant="secondary">
                      Pinned
                    </Badge>
                  )}

                  {topic.isLocked && (
                    <Badge
                      variant="outline"
                      className="border-amber-400/50 text-amber-200"
                    >
                      Locked
                    </Badge>
                  )}

                  <span className="ml-auto text-xs text-white/50">
                    {discussion.occupants.length} online
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
                  <span>
                    {category?.name || "CoogsNation Discussion"}
                  </span>

                  <span>•</span>

                  <span>
                    {topic.replyCount ?? 0} replies
                  </span>

                  <span>•</span>

                  <span>Live discussion</span>
                </div>
              </section>

              {!isAuthenticated && (
                <section className="rounded-xl border border-amber-300/20 bg-black/50 p-5 text-center backdrop-blur-md">
                  <h2 className="text-lg font-semibold">
                    Enter the discussion
                  </h2>

                  <p className="mt-2 text-sm text-white/60">
                    Use Guest Mode or sign in to participate.
                  </p>

                  <div className="mt-4 flex justify-center gap-3">
                    <Link href="/">
                      <Button variant="outline">
                        Guest Mode
                      </Button>
                    </Link>

                    <Link href="/login">
                      <Button>
                        Log In
                      </Button>
                    </Link>
                  </div>
                </section>
              )}

              {isAuthenticated && (
                <div className="relative min-h-[70vh]">
                  <LoungeChatOverlay
                    roomLabel={topic.title}
                    state={discussion.state}
                    problem={discussion.problem}
                    inRoom={discussion.inRoom}
                    occupants={discussion.occupants}
                    messages={discussion.messages}
                    blockedUserIds={discussion.blockedUserIds}
                    canSend={discussion.canSend && !topic.isLocked}
                    onSend={
                      topic.isLocked
                        ? () => false
                        : discussion.sendMessage
                    }
                    onTogglePaw={discussion.togglePaw}
                    onReport={discussion.reportMessage}
                    onToggleBlock={discussion.toggleBlock}
                    onRetry={discussion.reconnect}
                  />
                </div>
              )}

              <div className="mt-6">
                <Link
                  href={
                    category
                      ? forumCategoryPath(category.slug)
                      : "/forums"
                  }
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-black/30 text-white hover:bg-white/10"
                  >
                    ← Back to {category?.name || "Forums"}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
