import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { User, ForumTopic, NewsArticle, Order, Notification } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  // Recent forum activity
  const { data: recentTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ["/api/forums/recent"],
    enabled: isAuthenticated,
  });

  // Recent news
  const { data: recentNews, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news", { limit: 3 }],
    enabled: isAuthenticated,
  });

  // User's notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/users", (user as any)?.id, "notifications", { unread: true }],
    enabled: !!(user as any)?.id,
  });

  // User's recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/users", (user as any)?.id, "orders", { limit: 3 }],
    enabled: !!(user as any)?.id,
  });

  // Community stats
  const { data: communityStats } = useQuery({
    queryKey: ["/api/community/stats"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to CoogsNation</h2>
            <p className="text-gray-600 mb-6">Please log in to access your personalized dashboard.</p>
            <Button className="bg-uh-red hover:bg-red-700">
              Log In
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black mb-2">
            Welcome back, {(user as any)?.firstName}!
          </h1>
          <p className="text-gray-600">Here's what's happening in your CoogsNation community</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-uh-red">{(user as any)?.postCount || 0}</div>
                  <div className="text-sm text-gray-600">Your Posts</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-uh-red">{(user as any)?.reputation || 0}</div>
                  <div className="text-sm text-gray-600">Reputation</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-uh-red">{communityStats?.totalMembers || 0}</div>
                  <div className="text-sm text-gray-600">Total Members</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-uh-red">{communityStats?.onlineMembers || 0}</div>
                  <div className="text-sm text-gray-600">Online Now</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Forum Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <i className="fas fa-comments text-uh-red mr-2"></i>
                    Recent Forum Activity
                  </CardTitle>
                  <Link href="/forums">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {topicsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentTopics && (recentTopics as any[])?.length > 0 ? (
                  <div className="space-y-4">
                    {(recentTopics as any[])?.slice(0, 5).map((topic: any) => (
                      <div key={topic.id} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                        <div>
                          <h4 className="font-medium text-uh-black line-clamp-1">{topic.title}</h4>
                          <p className="text-sm text-gray-600">
                            by {topic.authorName} in {topic.categoryName}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{topic.replyCount} replies</div>
                          <div>{new Date(topic.lastReplyAt || topic.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent forum activity</p>
                )}
              </CardContent>
            </Card>

            {/* Latest News */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <i className="fas fa-newspaper text-uh-red mr-2"></i>
                    Latest News
                  </CardTitle>
                  <Link href="/news">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex space-x-4">
                        <div className="w-16 h-12 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentNews && (recentNews as any[])?.length > 0 ? (
                  <div className="space-y-4">
                    {(recentNews as any[])?.map((article: any) => (
                      <div key={article.id} className="flex space-x-4 border-b pb-4 last:border-b-0">
                        <img 
                          src={article.imageUrl || "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=100&h=80&fit=crop"} 
                          alt={article.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-uh-black line-clamp-2">{article.title}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent news</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/forums">
                  <Button className="w-full justify-start bg-uh-red hover:bg-red-700">
                    <i className="fas fa-plus mr-2"></i>
                    New Forum Post
                  </Button>
                </Link>
                <Link href="/store">
                  <Button variant="outline" className="w-full justify-start">
                    <i className="fas fa-shopping-cart mr-2"></i>
                    Shop Merchandise
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline" className="w-full justify-start">
                    <i className="fas fa-calendar mr-2"></i>
                    View Events
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="w-full justify-start">
                    <i className="fas fa-user mr-2"></i>
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notifications</CardTitle>
                  {notifications && (notifications as any[])?.length > 0 && (
                    <Badge variant="destructive">{(notifications as any[])?.length}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : notifications && (notifications as any[])?.length > 0 ? (
                  <div className="space-y-3">
                    {(notifications as any[])?.slice(0, 5).map((notification: any) => (
                      <div key={notification.id} className="border-l-4 border-uh-red pl-3 py-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    <Link href="/profile?tab=notifications">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Notifications
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No new notifications</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : recentOrders && (recentOrders as any[])?.length > 0 ? (
                  <div className="space-y-3">
                    {(recentOrders as any[])?.map((order: any) => (
                      <div key={order.id} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">Order #{order.id}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-uh-red">${order.totalAmount}</p>
                            <Badge variant="secondary" className="text-xs">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link href="/profile?tab=orders">
                      <Button variant="outline" size="sm" className="w-full">
                        View All Orders
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No recent orders</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}