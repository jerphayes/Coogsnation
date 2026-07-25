import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertEventSchema } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const createEventSchema = insertEventSchema.extend({
  category: z.string().default("community"),
  location: z.string().optional(),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function EventManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check if user has admin privileges
  const isAdmin = user?.email?.includes("admin") || user?.id === "46031129";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
  });

  const { data: myEvents = [], isLoading: myEventsLoading } = useQuery({
    queryKey: ["/api/events/my"],
    enabled: isAuthenticated,
  });

  const { data: rsvpEvents = [], isLoading: rsvpLoading } = useQuery({
    queryKey: ["/api/events/rsvp"],
    enabled: isAuthenticated,
  });

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventFormData) =>
      apiRequest("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: number; status: "attending" | "not_attending" }) =>
      apiRequest(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/rsvp"] });
      toast({
        title: "Success",
        description: "RSVP updated successfully",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) =>
      apiRequest(`/api/events/${eventId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    },
  });

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "community",
      location: "",
      price: 0,
      maxAttendees: 0,
    },
  });

  const onSubmit = (data: CreateEventFormData) => {
    createEventMutation.mutate({
      ...data,
      organizerId: user?.id || "",
      eventDate: selectedDate,
    });
  };

  const filteredEvents = Array.isArray(events) ? events.filter((event: any) => {
    const categoryMatch = selectedCategory === "all" || event.category === selectedCategory;
    return categoryMatch;
  }) : [];

  const getEventsByDate = (date: Date) => {
    return filteredEvents.filter((event: any) => {
      const eventDate = new Date(event.eventDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      sports: "bg-green-500",
      academic: "bg-blue-500",
      social: "bg-purple-500",
      community: "bg-yellow-500",
      alumni: "bg-red-500",
    };
    return colors[category] || "bg-gray-500";
  };

  const getEventStatusColor = (event: any) => {
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    
    if (eventDate < now) return "bg-gray-500"; // Past event
    if (event.isFull) return "bg-red-500"; // Full event
    return "bg-green-500"; // Available
  };

  // Simplified calendar view - show current week
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + i);
    return date;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-uh-black mb-4">Please Log In</h1>
          <p className="text-gray-600">You need to be logged in to manage events.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-uh-black mb-2">Event Management</h1>
              <p className="text-gray-600">Discover and manage CoogsNation community events</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <i className="fas fa-list mr-2"></i>
                  List
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <i className="fas fa-calendar mr-2"></i>
                  Calendar
                </Button>
              </div>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-uh-red hover:bg-red-700">
                    <i className="fas fa-plus mr-2"></i>
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter event title..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your event..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="sports">Sports</SelectItem>
                                  <SelectItem value="academic">Academic</SelectItem>
                                  <SelectItem value="social">Social</SelectItem>
                                  <SelectItem value="community">Community</SelectItem>
                                  <SelectItem value="alumni">Alumni</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Event location" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="maxAttendees"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Attendees</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0 for unlimited"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-base">Event Date</Label>
                        <div className="p-4 border rounded-lg">
                          <p className="text-gray-600 mb-2">Select Event Date:</p>
                          <input
                            type="date"
                            value={selectedDate.toISOString().split('T')[0]}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createEventMutation.isPending}
                          className="bg-uh-red hover:bg-red-700"
                        >
                          {createEventMutation.isPending ? "Creating..." : "Create Event"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filter Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="my-events">My Events</TabsTrigger>
            <TabsTrigger value="rsvp">My RSVPs</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-6">
            {viewMode === "calendar" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-4 mb-4">
                    {weekDays.map((day, index) => (
                      <div key={index} className="text-center">
                        <div className="font-semibold text-uh-black mb-2">
                          {format(day, "EEE d")}
                        </div>
                        <div className="space-y-2">
                          {getEventsByDate(day).map((event: any) => (
                            <div
                              key={event.id}
                              className={`${getCategoryColor(event.category)} text-white p-2 rounded text-xs`}
                            >
                              <div className="font-semibold truncate">{event.title}</div>
                              <div>{format(new Date(event.eventDate), "HH:mm")}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <i className="fas fa-calendar-times text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                    <p className="text-gray-600">Be the first to create an event for the community!</p>
                  </div>
                ) : (
                  filteredEvents.map((event: any) => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-uh-black mb-2">{event.title}</h3>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={`${getCategoryColor(event.category)} text-white`}>
                                {event.category}
                              </Badge>
                              <Badge className={`${getEventStatusColor(event)} text-white`}>
                                {event.isFull ? "Full" : "Available"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        
                        <div className="space-y-2 text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <i className="fas fa-calendar-alt mr-2"></i>
                            {format(new Date(event.eventDate), "PPP")}
                          </div>
                          <div className="flex items-center">
                            <i className="fas fa-clock mr-2"></i>
                            {format(new Date(event.eventDate), "p")}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <i className="fas fa-map-marker-alt mr-2"></i>
                              {event.location}
                            </div>
                          )}
                          <div className="flex items-center">
                            <i className="fas fa-users mr-2"></i>
                            {event.attendeeCount || 0} attending
                            {event.maxAttendees > 0 && ` / ${event.maxAttendees}`}
                          </div>
                          {event.price > 0 && (
                            <div className="flex items-center">
                              <i className="fas fa-dollar-sign mr-2"></i>
                              ${event.price}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "attending" })}
                              disabled={event.isFull || rsvpMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <i className="fas fa-check mr-1"></i>
                              Going
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rsvpMutation.mutate({ eventId: event.id, status: "not_attending" })}
                              disabled={rsvpMutation.isPending}
                            >
                              <i className="fas fa-times mr-1"></i>
                              Can't Go
                            </Button>
                          </div>
                          
                          {(isAdmin || event.organizerId === user?.id) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this event?")) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my-events">
            <Card>
              <CardHeader>
                <CardTitle>Events I'm Organizing</CardTitle>
              </CardHeader>
              <CardContent>
                {myEventsLoading ? (
                  <div>Loading your events...</div>
                ) : (myEvents as any[]).length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-calendar-plus text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No events organized</h3>
                    <p className="text-gray-600">Create your first event to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(myEvents as any[]).map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-uh-black">{event.title}</h4>
                        <p className="text-gray-600 text-sm">{event.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">
                            {format(new Date(event.eventDate), "PPP")}
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.attendeeCount || 0} attendees
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rsvp">
            <Card>
              <CardHeader>
                <CardTitle>Events I'm Attending</CardTitle>
              </CardHeader>
              <CardContent>
                {rsvpLoading ? (
                  <div>Loading your RSVPs...</div>
                ) : (rsvpEvents as any[]).length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-calendar-check text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
                    <p className="text-gray-600">RSVP to events to see them here!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(rsvpEvents as any[]).map((event) => (
                      <div key={event.id} className="border rounded-lg p-4">
                        <h4 className="font-semibold text-uh-black">{event.title}</h4>
                        <p className="text-gray-600 text-sm">{event.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">
                            {format(new Date(event.eventDate), "PPP")}
                          </span>
                          <Badge className="bg-green-500 text-white">Attending</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Past Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <i className="fas fa-history text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No past events</h3>
                  <p className="text-gray-600">Past events will appear here for your reference.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}