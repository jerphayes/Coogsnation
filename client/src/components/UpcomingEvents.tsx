import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export function UpcomingEvents() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-l-4 border-gray-200 pl-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'football': return 'border-uh-red';
      case 'basketball': return 'border-orange-500';
      case 'baseball': return 'border-green-500';
      case 'alumni': return 'border-purple-500';
      case 'campus': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
        <i className="fas fa-calendar text-uh-red mr-2"></i>
        Upcoming Events
      </h3>
      <div className="space-y-4">
        {events && events.length > 0 ? (
          events.slice(0, 4).map((event: any) => (
            <div key={event.id} className={`border-l-4 ${getCategoryColor(event.category)} pl-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-uh-black">{event.title}</h4>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-uh-red">
                    {new Date(event.eventDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(event.eventDate).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-calendar text-2xl mb-2"></i>
            <p>No upcoming events</p>
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link href="/events" className="text-uh-red hover:text-uh-black font-medium text-sm">
          View Full Calendar
        </Link>
      </div>
    </Card>
  );
}
