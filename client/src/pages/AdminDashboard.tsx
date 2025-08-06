import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, Calendar, ShoppingCart, FileText, BarChart3, Settings, Shield } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalEvents: number;
  totalOrders: number;
  totalArticles: number;
  activeForums: number;
  todaySignups: number;
  monthlyRevenue: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'new_post' | 'order_placed' | 'event_created';
  description: string;
  timestamp: string;
  user?: string;
}

export default function AdminDashboard() {
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: activities } = useQuery<RecentActivity[]>({
    queryKey: ['/api/admin/activities'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: forums } = useQuery({
    queryKey: ['/api/forums/categories'],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CoogsNation Admin Dashboard</h1>
          <p className="text-gray-600">Manage your Houston Cougar community platform</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.todaySignups || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forum Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats?.activeForums || 0} forums
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store Revenue</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.monthlyRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="forums">Forums</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activities?.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.user && `by ${activity.user}`}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/admin/news">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        Manage News
                      </Button>
                    </Link>
                    <Link href="/event-management">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="mr-2 h-4 w-4" />
                        Manage Events
                      </Button>
                    </Link>
                    <Link href="/forums">
                      <Button variant="outline" className="w-full justify-start">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Monitor Forums
                      </Button>
                    </Link>
                    <Link href="/store">
                      <Button variant="outline" className="w-full justify-start">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Manage Store
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="mr-2 h-4 w-4" />
                      Moderation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users && Array.isArray(users) && users.slice(0, 10).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{user.displayName || user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Published Articles</span>
                      <Badge>{stats?.totalArticles || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Events</span>
                      <Badge>{stats?.totalEvents || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Forum Posts</span>
                      <Badge>{stats?.totalPosts || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/admin/news">
                      <Button className="w-full">Create News Article</Button>
                    </Link>
                    <Link href="/event-management">
                      <Button variant="outline" className="w-full">Create Event</Button>
                    </Link>
                    <Button variant="outline" className="w-full">
                      Moderate Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forums Tab */}
          <TabsContent value="forums" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Forum Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forums && Array.isArray(forums) && forums.map((forum: any) => (
                    <div key={forum.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{forum.name}</p>
                        <p className="text-sm text-gray-500">{forum.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={forum.isActive ? "default" : "secondary"}>
                          {forum.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8 text-gray-500">
                    <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                    <p>Advanced analytics and reporting features coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-8 text-gray-500">
                    <Settings className="mx-auto h-12 w-12 mb-4" />
                    <p>System configuration and settings panel</p>
                    <p className="text-sm mt-2">Platform maintenance and configuration options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}