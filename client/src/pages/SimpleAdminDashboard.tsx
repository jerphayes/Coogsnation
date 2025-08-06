import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Calendar, FileText } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";

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

export default function SimpleAdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
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
              <div className="text-2xl font-bold">
                {statsLoading ? "Loading..." : (stats?.totalUsers || 0)}
              </div>
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
              <div className="text-2xl font-bold">
                {statsLoading ? "Loading..." : (stats?.totalPosts || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Active discussions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "Loading..." : (stats?.totalEvents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "Loading..." : (stats?.totalArticles || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Published articles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/admin/news">
                  <Button className="w-full" variant="outline">
                    Create Article
                  </Button>
                </Link>
                <Link href="/event-management">
                  <Button className="w-full" variant="outline">
                    Create Event
                  </Button>
                </Link>
                <Link href="/forums">
                  <Button className="w-full" variant="outline">
                    View Forums
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button className="w-full" variant="outline">
                    User Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usersLoading ? (
                  <p>Loading users...</p>
                ) : users && Array.isArray(users) ? (
                  users.slice(0, 3).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{user.email}</p>
                        <p className="text-xs text-gray-500">ID: {user.id}</p>
                      </div>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                  ))
                ) : (
                  <p>No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-sm text-gray-500">System Status</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats?.activeForums || 0}</div>
                <p className="text-sm text-gray-500">Active Forums</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">Ready</div>
                <p className="text-sm text-gray-500">Platform Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}