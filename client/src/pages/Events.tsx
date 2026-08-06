import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { EventResponse } from "@shared/api-types";
import { useAuth } from "@/hooks/useAuth";

export default function Events() {
  const { isAuthenticated } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const { data: events = [], isLoading } = useQuery<EventResponse[]>({
    queryKey: ["/api/events"],
  });

  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case "football": return "bg-uh-red text-white";
      case "basketball": return "bg-orange-500 text-white";
      case "baseball": return "bg-green-500 text-white";
      case "alumni": return "bg-purple-500 text-white";
      case "campus": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-uh-black">Upcoming Events</h1>
            <p className="mt-2 text-gray-600">Community events and activities shared with CoogsNation members.</p>
          </div>
          {isAuthenticated && (
            <Link href="/event-management?create=1">
              <Button className="bg-uh-red text-white hover:bg-red-700">Create Event</Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <Card key={item} className="h-64 animate-pulse bg-gray-100" />)}
          </div>
        ) : events.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden transition hover:shadow-lg">
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <Badge className={getCategoryColor(event.category)}>{event.category?.toUpperCase() || "EVENT"}</Badge>
                    <div className="text-right">
                      <div className="text-lg font-bold text-uh-red">
                        {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(event.eventDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                  <h2 className="line-clamp-2 text-lg font-bold text-uh-black">{event.title}</h2>
                  {event.location && <p className="mt-3 text-sm text-gray-600">📍 {event.location}</p>}
                  {event.description && <p className="mt-3 line-clamp-3 text-sm text-gray-600">{event.description}</p>}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{new Date(event.eventDate) > new Date() ? "Upcoming" : "Past event"}</span>
                    <Button variant="outline" size="sm" className="border-uh-red text-uh-red" onClick={() => setSelectedEvent(event)}>
                      Learn More
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <h2 className="text-xl font-semibold">No Upcoming Events</h2>
            <p className="mt-2 text-gray-600">Check back soon for new community activities.</p>
            {isAuthenticated && (
              <Link href="/event-management?create=1">
                <Button className="mt-5 bg-uh-red text-white hover:bg-red-700">Create the First Event</Button>
              </Link>
            )}
          </Card>
        )}

        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-bold text-uh-black">Event Resources</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { name: "Football", icon: "🏈", link: "https://uhcougars.com/sports/football/schedule" },
              { name: "Basketball", icon: "🏀", link: "https://uhcougars.com/sports/mens-basketball/schedule" },
              { name: "Baseball", icon: "⚾", link: "https://uhcougars.com/sports/baseball/schedule" },
              { name: "Alumni", icon: "🎓", link: "https://www.linkedin.com/school/university-of-houston/" },
              { name: "About UH", icon: "🏫", link: "https://www.uh.edu/" },
            ].map((resource) => (
              <a key={resource.name} href={resource.link} target="_blank" rel="noopener noreferrer">
                <Card className="h-full p-4 text-center transition hover:shadow-lg">
                  <div className="text-3xl" aria-hidden="true">{resource.icon}</div>
                  <h3 className="mt-2 font-semibold text-uh-black">{resource.name}</h3>
                </Card>
              </a>
            ))}
            <Link href="/event-management" className="block">
              <Card className="h-full p-4 text-center transition hover:shadow-lg">
                <div className="text-3xl" aria-hidden="true">📆</div>
                <h3 className="mt-2 font-semibold text-uh-black">Manage Events</h3>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedEvent?.title}</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Date:</strong> {new Date(selectedEvent.eventDate).toLocaleString()}</p>
              {selectedEvent.location && <p><strong>Location:</strong> {selectedEvent.location}</p>}
              {selectedEvent.description && <p className="whitespace-pre-wrap">{selectedEvent.description}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
