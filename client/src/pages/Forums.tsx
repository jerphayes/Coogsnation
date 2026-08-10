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
  "golf",
  "track-field",
  "other-sports",
  "womens-sports",
  "womens-basketball",
  "womens-golf",
  "womens-soccer",
  "softball",
  "womens-tennis",
  "womens-track-field",
  "womens-swimming-diving",
]);

const communitySlugs = new Set(["recruiting", "water-cooler", "hall-of-fame", "campus-events"]);

function categoryIcon(category: ForumCategory): string {
  const icons: Record<string, string> = {
    football: "🏈",
    basketball: "🏀",
    baseball: "⚾",
    golf: "⛳",
    "track-field": "🏃",
    recruiting: "📣",
    "water-cooler": "☕",
    "hall-of-fame": "🏆",
    "campus-events": "📅",
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

  const sportsCategories = filteredCategories.filter((category) => sportsSlugs.has(category.slug));
  const communityCategories = filteredCategories.filter((category) => communitySlugs.has(category.slug));

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
              <div className="text-3xl font-bold text-uh-red">{visibleCategories.length}</div>
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
          <Tabs defaultValue="all" className="mb-10">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Boards</TabsTrigger>
              <TabsTrigger value="sports">Sports</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <CategoryGrid categories={filteredCategories} />
            </TabsContent>
            <TabsContent value="sports" className="mt-6">
              <CategoryGrid categories={sportsCategories} />
            </TabsContent>
            <TabsContent value="community" className="mt-6">
              <CategoryGrid categories={communityCategories} />
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

function CategoryGrid({ categories }: { categories: ForumCategory[] }) {
  if (categories.length === 0) {
    return <Card><CardContent className="p-10 text-center text-gray-600">No matching forum categories.</CardContent></Card>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link key={category.id} href={forumCategoryPath(category.slug)} className="block h-full">
          <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="mb-3 text-3xl" aria-hidden="true">{categoryIcon(category)}</div>
              <h2 className="text-lg font-bold text-uh-black">{category.name}</h2>
              <p className="mt-2 text-sm text-gray-600">{category.description || "Community discussion board"}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
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
