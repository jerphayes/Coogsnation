import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function Events() {
  const { isAuthenticated } = useAuth();
  
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'football': return 'bg-uh-red text-white';
      case 'basketball': return 'bg-orange-500 text-white';
      case 'baseball': return 'bg-green-500 text-white';
      case 'alumni': return 'bg-purple-500 text-white';
      case 'campus': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'football': return 'fas fa-football-ball';
      case 'basketball': return 'fas fa-basketball-ball';
      case 'baseball': return 'fas fa-baseball-ball';
      case 'alumni': return 'fas fa-graduation-cap';
      case 'campus': return 'fas fa-university';
      default: return 'fas fa-calendar';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-uh-black mb-2">Upcoming Events</h1>
            <p className="text-gray-600">Stay connected with University of Houston events and activities</p>
          </div>
          {isAuthenticated && (
            <Button className="bg-uh-red hover:bg-red-700 text-white">
              <i className="fas fa-plus mr-2"></i>
              Create Event
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getCategoryColor(event.category)}>
                      <i className={`${getCategoryIcon(event.category)} mr-1`}></i>
                      {event.category?.toUpperCase() || 'EVENT'}
                    </Badge>
                    <div className="text-right">
                      <div className="text-lg font-bold text-uh-red">
                        {new Date(event.eventDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(event.eventDate).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg text-uh-black mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  
                  {event.location && (
                    <div className="flex items-center text-gray-600 mb-3">
                      <i className="fas fa-map-marker-alt mr-2 text-uh-red"></i>
                      <span className="text-sm">{event.location}</span>
                    </div>
                  )}
                  
                  {event.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <i className="fas fa-clock mr-1"></i>
                      {new Date(event.eventDate) > new Date() ? 'Upcoming' : 'Past Event'}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <i className="fas fa-calendar text-6xl mb-6"></i>
              <h3 className="text-xl font-semibold mb-2">No Upcoming Events</h3>
              <p>Check back soon for the latest University of Houston events and activities!</p>
              {isAuthenticated && (
                <Button className="bg-uh-red hover:bg-red-700 text-white mt-4">
                  <i className="fas fa-plus mr-2"></i>
                  Create the First Event
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Event Categories */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-uh-black mb-6">Event Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Football', icon: 'fas fa-football-ball', color: 'bg-uh-red' },
              { name: 'Basketball', icon: 'fas fa-basketball-ball', color: 'bg-orange-500' },
              { name: 'Baseball', icon: 'fas fa-baseball-ball', color: 'bg-green-500' },
              { name: 'Alumni', icon: 'fas fa-graduation-cap', color: 'bg-purple-500' },
              { name: 'Campus', icon: 'fas fa-university', color: 'bg-blue-500' },
              { name: 'Other', icon: 'fas fa-calendar', color: 'bg-gray-500' },
            ].map((category) => (
              <Card key={category.name} className="p-4 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <i className={`${category.icon} text-white`}></i>
                  </div>
                  <h4 className="font-semibold text-uh-black">{category.name}</h4>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
