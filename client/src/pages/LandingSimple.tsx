import bannerImage from "@assets/file_00000000881861f9be677e55822b57a5_1757784057972.png";
import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { FORUM_NAVIGATION, forumCategoryPath } from "@/lib/forumNavigation";

const destinations = [
  {
    title: "Standard Discussion Board",
    description: "Traditional forums, topics, replies, and community conversation.",
    href: "/forums",
    icon: "💬",
  },
  {
    title: "Coog Paws Lounge",
    description: "Optional immersive lounge with live multi-chat and community presence.",
    href: "/coogpaws-chat",
    icon: "🐾",
  },
  {
    title: "Water Cooler Talk",
    description: "General conversation beyond the sports boards.",
    href: forumCategoryPath(FORUM_NAVIGATION.waterCooler.slug),
    icon: "☕",
  },
  {
    title: "Merchandise Marketplace",
    description: "Licensed products, CoogsNation originals, gifts, and premium merchandise.",
    href: "/store",
    icon: "🛍️",
  },
  {
    title: "Members",
    description: "Find people across the CoogsNation community.",
    href: "/members",
    icon: "👥",
  },
  {
    title: "Events",
    description: "Community events, campus activities, and gatherings.",
    href: "/events",
    icon: "📅",
  },
] as const;

const forumShortcuts = [
  FORUM_NAVIGATION.football,
  FORUM_NAVIGATION.basketball,
  FORUM_NAVIGATION.baseball,
  FORUM_NAVIGATION.recruiting,
  FORUM_NAVIGATION.hallOfFame,
  FORUM_NAVIGATION.campusEvents,
] as const;

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section
        className="relative isolate overflow-hidden bg-gray-950 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.78)), url(${bannerImage})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto flex min-h-[560px] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <img src={logoImage} alt="CoogsNation" className="mb-6 h-24 w-24 rounded-2xl object-cover shadow-2xl" />
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-red-300">Next-generation fan community</p>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">CoogsNation</h1>
          <p className="mt-5 max-w-3xl text-lg text-gray-200 sm:text-xl">
            Use the familiar discussion board, enter an immersive lounge, follow the community, and shop on your own terms.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/forums"><Button size="lg" className="bg-uh-red hover:bg-red-700">Enter Standard Board</Button></Link>
            <Link href="/coogpaws-chat"><Button size="lg" variant="outline" className="border-white bg-black/30 text-white hover:bg-white hover:text-black">Enter Coog Paws Lounge</Button></Link>
            {!isAuthenticated && (
              <Link href="/join"><Button size="lg" variant="outline" className="border-white bg-black/30 text-white hover:bg-white hover:text-black">Join CoogsNation</Button></Link>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-950">Choose how you participate</h2>
          <p className="mt-3 text-gray-600">Simple by default. Immersive by choice.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <Link key={destination.href} href={destination.href} className="block h-full">
              <Card className="h-full transition hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="p-7">
                  <div className="mb-4 text-4xl" aria-hidden="true">{destination.icon}</div>
                  <h3 className="text-xl font-bold text-gray-950">{destination.title}</h3>
                  <p className="mt-2 text-gray-600">{destination.description}</p>
                  <p className="mt-5 font-semibold text-uh-red">Open →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-14 rounded-2xl bg-gray-950 p-8 text-white">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Popular discussion boards</h2>
              <p className="mt-2 text-gray-300">Permanent category links that do not depend on database ID numbers.</p>
            </div>
            <Link href="/forums" className="font-bold text-red-300 hover:text-red-200">View all forums →</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {forumShortcuts.map((category) => (
              <Link
                key={category.slug}
                href={forumCategoryPath(category.slug)}
                className="rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold hover:border-red-400 hover:text-red-300"
              >
                {category.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
