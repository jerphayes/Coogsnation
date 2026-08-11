import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { formatDistance } from "date-fns";
import type { ForumCategory, ForumTopic } from "@shared/schema";
import { forumCategoryPath, isVisibleForumCategory } from "@/lib/forumNavigation";

const sportsSlugs = new Set([
  "football",
  "basketball",
  "baseball",
  "recruiting",
  "game-day-central",
  "tailgate-roundup",
  "golf",
  "track-field",
  "other-sports",
  "other-sports-men",
  "womens-sports",
  "womens-basketball",
  "womens-golf",
  "womens-soccer",
  "softball",
  "womens-tennis",
  "womens-track-field",
  "womens-swimming-diving",
]);


type CommunityGroupDefinition = {
  title: string;
  description: string;
  headerClasses: string;
  uhAlternating?: boolean;
  alternateStart?: "red" | "white";
  items: {
    slug: string;
    label: string;
  }[];
};

type CommunityGroup = CommunityGroupDefinition & {
  categories: {
    category: ForumCategory;
    label: string;
  }[];
};

const communityGroupDefinitions: CommunityGroupDefinition[] = [
  {
    title: "Coogs Life",
    description:
      "Campus life, alumni, careers, academics, business, technology, and everyday Cougar conversation",
    headerClasses: "bg-red-700 text-white",
    uhAlternating: true,
    alternateStart: "red",
    items: [
      {
        slug: "cougar-corner",
        label: "Cougar Corner",
      },
      {
        slug: "student-life",
        label: "Student Life",
      },
      {
        slug: "academic-discussion",
        label: "Academic Discussion",
      },
      {
        slug: "alumni-network",
        label: "Alumni Network",
      },
      {
        slug: "uh-hall-of-fame",
        label: "UH Hall of Fame",
      },
      {
        slug: "professional-networking",
        label: "Professional Networking",
      },
      {
        slug: "business",
        label: "Business & Entrepreneurship",
      },
      {
        slug: "technology",
        label: "Technology & AI",
      },
    ],
  },

  {
    title: "Houston Events & Happenings",
    description:
      "Houston culture, entertainment, food, festivals, and things to do",
    headerClasses: "bg-[#6FA8DC] text-white",
    items: [
      {
        slug: "entertainment",
        label: "Entertainment",
      },
      {
        slug: "food-dining",
        label: "Food & Dining",
      },
    ],
  },

  {
    title: "Coogs Marketplace",
    description:
      "Buy, sell, trade, housing, property, and local opportunities",
    headerClasses: "bg-green-700 text-white",
    items: [
      {
        slug: "classifieds",
        label: "Buy, Sell & Trade",
      },
      {
        slug: "real-estate",
        label: "Real Estate & Housing",
      },
    ],
  },

  {
    title: "Current Events",
    description:
      "National and local open discussion",
    headerClasses: "bg-amber-900 text-white",
    items: [
      {
        slug: "politics",
        label: "National & Local Current Events",
      },
      {
        slug: "coogs-lounge",
        label: "Open Discussion",
      },
    ],
  },
]


function categoryIcon(category: ForumCategory): string {
  const icons: Record<string, string> = {
    football: "🏈",
    basketball: "🏀",
    baseball: "⚾",
    golf: "⛳",
    "track-field": "🏃",
    recruiting: "📣",
    "tailgate-roundup": "🍔",
    "water-cooler-talk": "☕",
    "uh-hall-of-fame": "🏆",
    "womens-sports": "🏅",
  };
  return icons[category.slug] || "💬";
}

export default function Forums() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<ForumCategory[]>({ queryKey: ["/api/forums/categories"] });

  const { data: recentTopics = [], isLoading: recentLoading } = useQuery<ForumTopic[]>({
    queryKey: ["/api/forums/recent?limit=6"],
  });

  const visibleCategories = useMemo(
    () => categories.filter(isVisibleForumCategory),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return visibleCategories;
    return visibleCategories.filter((category) =>
      `${category.name} ${category.description || ""}`.toLowerCase().includes(search),
    );
  }, [searchQuery, visibleCategories]);

  const sportsCategories =
    filteredCategories.filter(
      (category) =>
        sportsSlugs.has(category.slug)
    );

  /*
   * EVERYTHING that is not sports belongs in Community,
   * except Water Cooler Talk which has its own third section.
   */
  const waterCoolerCategory =
    filteredCategories.find(
      (category) =>
        category.slug === "water-cooler-talk" ||
        category.slug === "water-cooler"
    );

  const communityCategories =
    filteredCategories.filter(
      (category) =>
        !sportsSlugs.has(category.slug) &&
        category.slug !== "water-cooler-talk" &&
        category.slug !== "water-cooler"
    );


  const communityGroups = useMemo<CommunityGroup[]>(() => {
    const categoriesBySlug =
      new Map(
        communityCategories.map(
          (category) => [
            category.slug,
            category,
          ]
        )
      );

    return communityGroupDefinitions
      .map((group) => ({
        ...group,
        categories: group.items
          .map((item) => {
            const category =
              categoriesBySlug.get(item.slug);

            return category
              ? {
                  category,
                  label: item.label,
                }
              : null;
          })
          .filter(
            (
              item
            ): item is {
              category: ForumCategory;
              label: string;
            } => item !== null
          ),
      }))
      .filter(
        (group) =>
          group.categories.length > 0
      );
  }, [communityCategories]);



  const activeBoardCount = useMemo(() => {
    const displayedSportsCount =
      sportsCategories.filter(
        (category) =>
          !womensSportsDetailSlugs.has(
            category.slug
          )
      ).length;

    const displayedCommunityCount =
      communityGroups.length;

    const waterCoolerCount =
      waterCoolerCategory ? 1 : 0;

    const coogPawsCount = 1;

    // Ticket Purchase is a Sports utility card rather
    // than a discussion-board database category.
    const ticketPurchaseCount = 1;

    return (
      displayedSportsCount +
      ticketPurchaseCount +
      displayedCommunityCount +
      waterCoolerCount +
      coogPawsCount
    );
  }, [
    sportsCategories,
    communityGroups,
    waterCoolerCategory,
  ]);

  const categoryById = useMemo(
    () => new Map(visibleCategories.map((category) => [category.id, category])),
    [visibleCategories],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-uh-black">CoogsNation Forums</h1>
          <p className="mt-3 text-lg text-gray-600">The familiar standard board for topics, replies, and community conversation.</p>
          <div className="mx-auto mt-6 max-w-2xl">
            <label htmlFor="forum-category-filter" className="sr-only">Filter forum categories</label>
            <Input
              id="forum-category-filter"
              type="search"
              placeholder="Filter forum categories"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full text-lg"
            />
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-uh-red">{activeBoardCount}</div>
              <div className="text-sm text-gray-600">Active boards</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-uh-red">{recentTopics.length}</div>
              <div className="text-sm text-gray-600">Recent topics shown</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-5 text-center">
              <div className="font-bold text-purple-900">Want the immersive option?</div>
              <Link href="/coogpaws-chat" className="mt-2 inline-block font-semibold text-purple-700 hover:underline">
                Enter Coog Paws Lounge →
              </Link>
            </CardContent>
          </Card>
        </section>

        {categoriesError ? (
          <Card className="mb-10 border-red-200 bg-red-50">
            <CardContent className="p-6 text-red-800">Forum categories could not be loaded. Please try again.</CardContent>
          </Card>
        ) : categoriesLoading ? (
          <CategorySkeleton />
        ) : (
          <Tabs defaultValue="sports" className="mb-10">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sports">
                Sports
              </TabsTrigger>

              <TabsTrigger value="community">
                Community
              </TabsTrigger>

              <TabsTrigger value="conversation">
                Coog Paws & Water Cooler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sports" className="mt-6">
              <CategoryGrid
                categories={sportsCategories}
              />
            </TabsContent>

            <TabsContent value="community" className="mt-6">
              <CommunityGroupGrid
                groups={communityGroups}
              />
            </TabsContent>

            <TabsContent
              value="conversation"
              className="mt-6"
            >
              <div className="grid gap-5 md:grid-cols-2">

                <Link
                  href="/coogpaws-chat"
                  className="block h-full"
                >
                  <Card className="h-full overflow-hidden border border-gray-200 transition hover:-translate-y-0.5 hover:shadow-lg">

                    <div className="flex min-h-16 items-center gap-3 bg-red-700 px-5 py-4 text-white">
                      <span
                        className="text-2xl"
                        aria-hidden="true"
                      >
                        🐾
                      </span>

                      <h2 className="text-lg font-bold">
                        Coog Paws
                      </h2>
                    </div>

                    <CardContent className="bg-white p-5">
                      <p className="text-sm leading-6 text-gray-700">
                        Live CoogsNation community chat and lounge conversation.
                      </p>
                    </CardContent>

                  </Card>
                </Link>

                {waterCoolerCategory ? (
                  <Link
                    href={forumCategoryPath(
                      waterCoolerCategory.slug
                    )}
                    className="block h-full"
                  >
                    <Card className="h-full overflow-hidden border border-gray-200 transition hover:-translate-y-0.5 hover:shadow-lg">

                      <div className="flex min-h-16 items-center gap-3 bg-sky-500 px-5 py-4 text-white">
                        <span
                          className="text-2xl"
                          aria-hidden="true"
                        >
                          ☕
                        </span>

                        <h2 className="text-lg font-bold">
                          Water Cooler Talk
                        </h2>
                      </div>

                      <CardContent className="bg-white p-5">
                        <p className="text-sm leading-6 text-gray-700">
                          General discussion, off-topic conversation, and community talk.
                        </p>
                      </CardContent>

                    </Card>
                  </Link>
                ) : (
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="mb-3 text-3xl">
                        ☕
                      </div>

                      <h2 className="text-lg font-bold text-uh-black">
                        Water Cooler Talk
                      </h2>

                      <p className="mt-2 text-sm text-gray-600">
                        Water Cooler Talk is temporarily unavailable.
                      </p>
                    </CardContent>
                  </Card>
                )}

              </div>
            </TabsContent>
          </Tabs>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Forum Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <p className="text-sm text-gray-600">Loading recent topics…</p>
            ) : recentTopics.length === 0 ? (
              <p className="text-sm text-gray-600">No forum topics have been posted yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTopics.map((topic) => {
                  const category = categoryById.get(topic.categoryId);
                  return (
                    <div key={topic.id} className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
                      <Avatar>
                        <AvatarFallback className="bg-uh-red text-white">
                          {(topic.authorId || "C").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link href={`/forums/topics/${topic.id}`} className="font-semibold text-gray-950 hover:text-uh-red">
                          {topic.title}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {category ? (
                            <Link href={forumCategoryPath(category.slug)} className="hover:underline">{category.name}</Link>
                          ) : (
                            "Forum"
                          )}
                          {" · "}
                          {topic.createdAt
                            ? formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true })
                            : "Recently"}
                        </p>
                      </div>
                      <Link href={`/forums/topics/${topic.id}`}>
                        <Button variant="ghost" size="sm" className="text-uh-red">View</Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-blue-900">
            <h2 className="font-bold">Community basics</h2>
            <p className="mt-2 text-sm">Be respectful, use descriptive topic titles, and place discussions in the most relevant board.</p>
            {!isAuthenticated && (
              <Link href="/join" className="mt-4 inline-block font-semibold text-blue-700 hover:underline">Join to post and reply →</Link>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}


function CommunityGroupGrid({
  groups,
}: {
  groups: CommunityGroup[];
}) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-600">
          No matching community categories.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
      {groups.map((group) => (
        <details
          key={group.title}
          className="group h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-lg"
        >
          <summary
            className={`flex min-h-28 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden ${group.headerClasses}`}
          >
            <div>
              <h2 className="text-lg font-bold">
                {group.title}
              </h2>

              <p className="mt-1 text-xs leading-5 opacity-90">
                {group.description}
              </p>
            </div>

            <span
              aria-hidden="true"
              className="shrink-0 text-xl transition-transform duration-200 group-open:rotate-180"
            >
              ▼
            </span>
          </summary>

          <div className="border-t border-gray-200">
            {group.categories.map(
              (
                {
                  category,
                  label,
                },
                index
              ) => {
                let rowClasses =
                  "bg-white text-gray-800 hover:bg-gray-50";

                if (group.uhAlternating) {
                  const startRed =
                    group.alternateStart !==
                    "white";

                  const useRed =
                    startRed
                      ? index % 2 === 0
                      : index % 2 !== 0;

                  rowClasses = useRed
                    ? "bg-red-700 !text-white hover:bg-red-800"
                    : "bg-white !text-red-700 hover:bg-red-50";
                }

                return (
                  <Link
                    key={category.id}
                    href={forumCategoryPath(
                      category.slug
                    )}
                    className={`flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 font-semibold last:border-b-0 ${rowClasses}`}
                  >
                    <span>
                      {label}
                    </span>

                    <span
                      aria-hidden="true"
                      className="text-sm"
                    >
                      →
                    </span>
                  </Link>
                );
              }
            )}
          </div>
        </details>
      ))}
    </div>
  );
}


function categoryHeaderClasses(
  category: ForumCategory,
): string {
  const slug =
    String(category.slug || "").toLowerCase();

  // Football
  if (slug === "football") {
    return "bg-red-700 text-white";
  }

  // Men's Basketball
  if (slug === "basketball") {
    return "bg-white text-red-700 border-b-2 border-red-600";
  }

  // Consolidated women's athletics
  if (slug === "womens-sports") {
    return "bg-pink-300 text-red-800";
  }

  // Original category color scheme
  switch (
    String(category.color || "").toLowerCase()
  ) {
    case "red":
      return "bg-red-700 text-white";

    case "blue":
      return "bg-blue-700 text-white";

    case "green":
      return "bg-green-700 text-white";

    case "orange":
      return "bg-orange-600 text-white";

    case "purple":
      return "bg-purple-700 text-white";

    case "gray":
      return "bg-slate-700 text-white";

    case "gold":
      return "bg-amber-500 text-black";

    case "cyan":
      return "bg-cyan-700 text-white";

    case "amber":
      return "bg-amber-600 text-white";

    case "lime":
      return "bg-lime-700 text-white";

    case "violet":
      return "bg-violet-700 text-white";

    case "teal":
      return "bg-teal-700 text-white";

    case "indigo":
      return "bg-indigo-700 text-white";

    default:
      return "bg-red-700 text-white";
  }
}

const womensSportsDetailSlugs =
  new Set([
    "womens-basketball",
    "womens-golf",
    "womens-soccer",
    "softball",
    "womens-tennis",
    "womens-track-field",
    "womens-swimming-diving",
  ]);

function CategoryGrid({
  categories,
}: {
  categories: ForumCategory[];
}) {
  /*
   * Individual women's sport boards remain in the
   * underlying system but are represented here by
   * one Women Sports umbrella card.
   */
  const displayCategories =
    categories.filter(
      (category) =>
        !womensSportsDetailSlugs.has(
          category.slug
        )
    );

  if (displayCategories.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-gray-600">
          No matching forum categories.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {displayCategories.map((category) => {
        const isWomenSports =
          category.slug === "womens-sports";

        const isIntramural =
          category.slug === "other-sports-men";

        const displayName =
          isWomenSports
            ? "Women Sports"
            : isIntramural
              ? "Intramural Sports"
              : category.name;

        return (
          <Link
            key={category.id}
            href={forumCategoryPath(
              category.slug
            )}
            className="block h-full"
          >
            <Card className="h-full overflow-hidden border border-gray-200 transition hover:-translate-y-0.5 hover:shadow-lg">

              <div
                className={`flex min-h-16 items-center gap-3 px-5 py-4 ${categoryHeaderClasses(
                  category
                )}`}
              >
                <span
                  className="text-2xl"
                  aria-hidden="true"
                >
                  {categoryIcon(category)}
                </span>

                <h2 className="text-lg font-bold">
                  {displayName}
                </h2>
              </div>

              <CardContent className="bg-white p-5">

                {isIntramural ? (
                  <p className="leading-6 text-gray-700">

                    <span className="text-sm font-medium">
                      Activities
                    </span>

                    <span className="ml-1 text-xs">
                      / announcements on and off campus
                    </span>

                  </p>
                ) : (
                  <p className="text-sm leading-6 text-gray-700">
                    {category.description ||
                      "Community discussion board"}
                  </p>
                )}

              </CardContent>

            </Card>
          </Link>
        );
      })}

      <TicketPurchaseCard />
    </div>
  );
}


function TicketPurchaseCard() {
  return (
    <details className="group h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">

      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 bg-green-700 px-5 py-4 text-white [&::-webkit-details-marker]:hidden">

        <div className="flex items-center gap-3">
          <span
            className="text-2xl"
            aria-hidden="true"
          >
            🎟️
          </span>

          <h2 className="text-lg font-bold">
            Ticket Purchase
          </h2>
        </div>

        <span
          aria-hidden="true"
          className="text-lg transition-transform duration-200 group-open:rotate-180"
        >
          ▼
        </span>

      </summary>

      <div className="border-t border-gray-200">

        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <div className="font-bold text-gray-900">
              Ticketmaster
            </div>

            <div className="mt-1 text-xs text-gray-500">
              Ticket marketplace
            </div>
          </div>

          <span className="text-lg text-green-700">
            🎫
          </span>
        </div>

        <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
          <div>
            <div className="font-bold text-gray-900">
              StubHub
            </div>

            <div className="mt-1 text-xs text-gray-500">
              Ticket marketplace
            </div>
          </div>

          <span className="text-lg text-green-700">
            🎫
          </span>
        </div>

        <div className="bg-white px-5 py-3 text-xs leading-5 text-gray-500">
          Tracked affiliate purchase links will connect here.
        </div>

      </div>
    </details>
  );
}


function CategorySkeleton() {
  return (
    <div className="mb-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Card key={item} className="animate-pulse"><CardContent className="h-36 p-6"><div className="h-5 w-1/2 rounded bg-gray-200" /><div className="mt-4 h-4 rounded bg-gray-200" /></CardContent></Card>
      ))}
    </div>
  );
}
