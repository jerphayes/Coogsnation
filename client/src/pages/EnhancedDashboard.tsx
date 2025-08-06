import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistance } from "date-fns";

export default function EnhancedDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "all">("week");

  const { data: dashboardData = {}, isLoading } = useQuery({
    queryKey: ["/api/dashboard/enhanced"],
    enabled: isAuthenticated,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["/api/dashboard/activity", selectedPeriod],
    enabled: isAuthenticated,
  });

  const { data: communityStats = {} } = useQuery({
    queryKey: ["/api/community/stats"],
    enabled: isAuthenticated,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["/api/events/upcoming", 5],
    enabled: isAuthenticated,
  });

  const { data: forumHighlights = [] } = useQuery({
    queryKey: ["/api/forums/highlights"],
    enabled: isAuthenticated,
  });

  const { data: newsHighlights = [] } = useQuery({
    queryKey: ["/api/news/recent", 3],
    enabled: isAuthenticated,
  });

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["/api/messages/unread/count"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-uh-black mb-4">Please Log In</h1>
          <p className="text-gray-600">Access your personalized CoogsNation dashboard.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 1000) return { level: "Elite", color: "text-purple-600", progress: 100 };
    if (score >= 500) return { level: "Veteran", color: "text-blue-600", progress: 80 };
    if (score >= 100) return { level: "Active", color: "text-green-600", progress: 60 };
    if (score >= 25) return { level: "Member", color: "text-yellow-600", progress: 40 };
    return { level: "Newcomer", color: "text-gray-600", progress: 20 };
  };

  const engagement = getEngagementLevel(dashboardData.reputationScore || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-uh-red to-red-700 rounded-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20 border-4 border-white">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-white text-uh-red text-2xl font-bold">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.name?.split(' ')[0] || 'Coogs Fan'}! 🐾
                </h1>
                <p className="text-red-100 mb-2">
                  Ready to Go Coogs! Here's what's happening in your community.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <i className="fas fa-trophy mr-2"></i>
                    {dashboardData.reputationScore || 0} Reputation
                  </span>
                  <span className="flex items-center">
                    <i className="fas fa-comments mr-2"></i>
                    {dashboardData.totalPosts || 0} Posts
                  </span>
                  <span className="flex items-center">
                    <i className="fas fa-heart mr-2"></i>
                    {dashboardData.likesReceived || 0} Likes
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-lg font-semibold ${engagement.color}`}>
                {engagement.level} Member
              </div>
              <Progress value={engagement.progress} className="w-32 mt-2 bg-red-800" />
              <p className="text-xs text-red-200 mt-1">Community Status</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-uh-black">{unreadMessages}</h3>
                  <p className="text-gray-600">Unread Messages</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-envelope text-2xl text-blue-600"></i>
                </div>
              </div>
              <Link href="/messages">
                <Button size="sm" className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  View Messages
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-uh-black">{upcomingEvents.length}</h3>
                  <p className="text-gray-600">Upcoming Events</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar text-2xl text-green-600"></i>
                </div>
              </div>
              <Link href="/event-management">
                <Button size="sm" className="w-full mt-4 bg-green-600 hover:bg-green-700">
                  Manage Events
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-uh-black">{communityStats.totalMembers || 0}</h3>
                  <p className="text-gray-600">Community Members</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-2xl text-purple-600"></i>
                </div>
              </div>
              <Link href="/forums">
                <Button size="sm" className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                  Join Discussion
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-uh-black">{dashboardData.achievementBadges || 0}</h3>
                  <p className="text-gray-600">Achievement Badges</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-medal text-2xl text-yellow-600"></i>
                </div>
              </div>
              <Link href="/profile/advanced">
                <Button size="sm" className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700">
                  View Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Activity & News */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                  <div className="flex space-x-2">
                    {["week", "month", "all"].map((period) => (
                      <Button
                        key={period}
                        size="sm"
                        variant={selectedPeriod === period ? "default" : "outline"}
                        onClick={() => setSelectedPeriod(period as any)}
                      >
                        {period === "all" ? "All Time" : `Last ${period}`}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-12 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-clock text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600">Start participating to see your activity here!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 8).map((activity: any, index) => (
                      <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 bg-uh-red rounded-full flex items-center justify-center">
                          <i className={`${activity.icon || 'fas fa-user'} text-white text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistance(new Date(activity.createdAt || new Date()), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest News */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Latest CoogsNation News</CardTitle>
                  <Link href="/news">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {newsHighlights.slice(0, 3).map((article: any) => (
                    <div key={article.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-semibold text-uh-black mb-2 hover:text-uh-red cursor-pointer">
                        {article.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Badge className="bg-blue-100 text-blue-800">
                          {article.category}
                        </Badge>
                        <span>{formatDistance(new Date(article.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Highlights */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/forums" className="block">
                  <Button className="w-full justify-start bg-uh-red hover:bg-red-700">
                    <i className="fas fa-comments mr-2"></i>
                    Join Forum Discussion
                  </Button>
                </Link>
                <Link href="/event-management" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <i className="fas fa-calendar-plus mr-2"></i>
                    Create Event
                  </Button>
                </Link>
                <Link href="/store" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <i className="fas fa-shopping-bag mr-2"></i>
                    Shop Merchandise
                  </Button>
                </Link>
                <Link href="/messages" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <i className="fas fa-envelope mr-2"></i>
                    Send Message
                  </Button>
                </Link>
                {(user?.email?.includes("admin") || user?.id === "46031129") && (
                  <Link href="/admin/news" className="block">
                    <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                      <i className="fas fa-cog mr-2"></i>
                      Admin Panel
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <i className="fas fa-calendar-times text-3xl text-gray-400 mb-2"></i>
                    <p className="text-gray-600 text-sm">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.slice(0, 3).map((event: any) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-uh-black text-sm mb-1">{event.title}</h4>
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <i className="fas fa-calendar-alt mr-1"></i>
                          {new Date(event.eventDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {event.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {event.attendeeCount || 0} attending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Forum Highlights */}
            <Card>
              <CardHeader>
                <CardTitle>Hot Forum Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forumHighlights.slice(0, 4).map((topic: any, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded transition-colors">
                      <div className="w-2 h-2 bg-uh-red rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-uh-black truncate">
                          {topic.title || `Popular discussion in ${topic.category}`}
                        </h5>
                        <p className="text-xs text-gray-500">
                          {topic.replies || Math.floor(Math.random() * 50)} replies • {topic.category || 'General'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Community Pulse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Today</span>
                  <span className="font-semibold text-uh-black">{communityStats.onlineMembers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Week's Posts</span>
                  <span className="font-semibold text-uh-black">{communityStats.weeklyPosts || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New Members</span>
                  <span className="font-semibold text-uh-black">{communityStats.newMembers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Events This Month</span>
                  <span className="font-semibold text-uh-black">{communityStats.monthlyEvents || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}