import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MessageSquare, Calendar, FileText, TrendingUp, Activity, Award, Search, SortAsc, SortDesc, UserPlus, Crown } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalThreads: number;
  totalEvents: number;
  totalArticles: number;
  activeForums: number;
  todaySignups: number;
  monthlyActiveUsers: number;
  topContributors: Array<{ userId: string; email: string; postCount: number; threadCount: number }>;
}

interface UserWithStats {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  handle?: string;
  achievementLevel: string;
  postCount: number;
  threadCount: number;
  daysSinceSignup: number;
  lastActivityDays: number;
  createdAt: Date | null;
  lastActiveAt?: Date | null;
  memberCategory?: string;
}

interface RecentMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  handle?: string;
  achievementLevel: string;
  memberCategory?: string;
  daysSinceSignup: number;
  createdAt: Date | null;
}

interface AchievementSummary {
  level: string;
  count: number;
  percentage: number;
}

type SortField = 'email' | 'postCount' | 'threadCount' | 'daysSinceSignup' | 'lastActivityDays' | 'achievementLevel';
type SortDirection = 'asc' | 'desc';

export default function SimpleAdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('daysSinceSignup');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterAchievement, setFilterAchievement] = useState<string>('all');

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserWithStats[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: recentMembers, isLoading: recentMembersLoading } = useQuery<RecentMember[]>({
    queryKey: ['/api/admin/recent-members'],
  });

  const { data: achievementSummary, isLoading: achievementLoading } = useQuery<AchievementSummary[]>({
    queryKey: ['/api/admin/achievement-summary'],
  });

  // Sort and filter users
  const filteredAndSortedUsers = users ? users
    .filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        user.email?.toLowerCase().includes(searchLower) ||
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.handle?.toLowerCase().includes(searchLower);
      
      const matchesAchievement = filterAchievement === 'all' || user.achievementLevel === filterAchievement;
      
      return matchesSearch && matchesAchievement;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }) : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  const getAchievementBadgeVariant = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Rookie': 'outline',
      'Bronze Star': 'secondary',
      'Silver Star': 'secondary',
      'Gold Star': 'default',
      'Diamond Star': 'default',
      'Platinum Member': 'default',
      'MVP Status': 'destructive',
      'Captain of the Team': 'destructive',
      'Heisman': 'destructive',
      'Grad Asst Coach': 'destructive',
      'Assistant Coach': 'destructive',
      'Head Coach': 'destructive'
    };
    return variants[level] || 'outline';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CoogsNation Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your Houston Cougar community platform</p>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card data-testid="card-total-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {statsLoading ? "Loading..." : (stats?.totalUsers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                +{stats?.todaySignups || 0} today
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-forum-posts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forum Posts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-posts">
                {statsLoading ? "Loading..." : (stats?.totalPosts || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalThreads || 0} topics
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-monthly-active">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-monthly-active">
                {statsLoading ? "Loading..." : (stats?.monthlyActiveUsers || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-events">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-events">
                {statsLoading ? "Loading..." : (stats?.totalEvents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Scheduled events
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-articles">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-articles">
                {statsLoading ? "Loading..." : (stats?.totalArticles || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeForums || 0} active forums
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors & Recent Members */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card data-testid="card-top-contributors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statsLoading ? (
                  <p>Loading contributors...</p>
                ) : stats?.topContributors ? (
                  stats.topContributors.slice(0, 5).map((contributor, index) => (
                    <div key={contributor.userId} className="flex items-center justify-between p-2 border rounded" data-testid={`contributor-${index}`}>
                      <div>
                        <p className="font-medium text-sm">{contributor.email}</p>
                        <p className="text-xs text-gray-500">{contributor.postCount} posts, {contributor.threadCount} topics</p>
                      </div>
                      <Badge variant="default" className="text-xs">#{index + 1}</Badge>
                    </div>
                  ))
                ) : (
                  <p>No contributors found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-recent-members">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Recent Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMembersLoading ? (
                  <p>Loading recent members...</p>
                ) : recentMembers ? (
                  recentMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 border rounded" data-testid={`recent-member-${member.id}`}>
                      <div>
                        <p className="font-medium text-sm">{member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.email}</p>
                        <p className="text-xs text-gray-500">{member.daysSinceSignup} days ago • {member.memberCategory || 'Unknown'}</p>
                      </div>
                      <Badge variant={getAchievementBadgeVariant(member.achievementLevel)} className="text-xs">{member.achievementLevel}</Badge>
                    </div>
                  ))
                ) : (
                  <p>No recent members found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-achievement-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Achievement Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievementLoading ? (
                  <p>Loading achievements...</p>
                ) : achievementSummary ? (
                  achievementSummary.slice(0, 6).map((achievement) => (
                    <div key={achievement.level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getAchievementBadgeVariant(achievement.level)} className="text-xs min-w-0">
                          {achievement.level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{achievement.count}</span>
                        <span className="text-xs text-gray-500">({achievement.percentage}%)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No achievement data found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/news">
                <Button className="w-full" variant="outline" data-testid="button-create-article">
                  Create Article
                </Button>
              </Link>
              <Link href="/event-management">
                <Button className="w-full" variant="outline" data-testid="button-create-event">
                  Create Event
                </Button>
              </Link>
              <Link href="/forums">
                <Button className="w-full" variant="outline" data-testid="button-view-forums">
                  View Forums
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="w-full" variant="outline" data-testid="button-user-dashboard">
                  User Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* User Management Table */}
        <Card data-testid="card-user-management">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name, email, or handle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-user-search"
                />
              </div>
              <Select value={filterAchievement} onValueChange={setFilterAchievement}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-achievement-filter">
                  <SelectValue placeholder="Filter by achievement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Achievements</SelectItem>
                  <SelectItem value="Rookie">Rookie</SelectItem>
                  <SelectItem value="Bronze Star">Bronze Star</SelectItem>
                  <SelectItem value="Silver Star">Silver Star</SelectItem>
                  <SelectItem value="Gold Star">Gold Star</SelectItem>
                  <SelectItem value="Diamond Star">Diamond Star</SelectItem>
                  <SelectItem value="Platinum Member">Platinum Member</SelectItem>
                  <SelectItem value="MVP Status">MVP Status</SelectItem>
                  <SelectItem value="Captain of the Team">Captain of the Team</SelectItem>
                  <SelectItem value="Heisman">Heisman</SelectItem>
                  <SelectItem value="Grad Asst Coach">Grad Asst Coach</SelectItem>
                  <SelectItem value="Assistant Coach">Assistant Coach</SelectItem>
                  <SelectItem value="Head Coach">Head Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('email')}
                        data-testid="header-email"
                      >
                        <div className="flex items-center gap-1">
                          User
                          {sortField === 'email' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('daysSinceSignup')}
                        data-testid="header-signup"
                      >
                        <div className="flex items-center gap-1">
                          Signup Date
                          {sortField === 'daysSinceSignup' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('postCount')}
                        data-testid="header-posts"
                      >
                        <div className="flex items-center gap-1">
                          Posts
                          {sortField === 'postCount' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('threadCount')}
                        data-testid="header-threads"
                      >
                        <div className="flex items-center gap-1">
                          Threads
                          {sortField === 'threadCount' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('achievementLevel')}
                        data-testid="header-achievement"
                      >
                        <div className="flex items-center gap-1">
                          Achievement
                          {sortField === 'achievementLevel' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none" 
                        onClick={() => handleSort('lastActivityDays')}
                        data-testid="header-activity"
                      >
                        <div className="flex items-center gap-1">
                          Last Activity
                          {sortField === 'lastActivityDays' && (
                            sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No users found matching the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.handle ? `@${user.handle}` : user.email}
                              </div>
                              {user.memberCategory && (
                                <Badge variant="outline" className="text-xs mt-1">{user.memberCategory}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{formatDate(user.createdAt)}</div>
                              <div className="text-xs text-gray-500">{user.daysSinceSignup} days ago</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium" data-testid={`user-posts-${user.id}`}>{user.postCount}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium" data-testid={`user-threads-${user.id}`}>{user.threadCount}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getAchievementBadgeVariant(user.achievementLevel)} data-testid={`user-achievement-${user.id}`}>
                              {user.achievementLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.lastActivityDays === 0 ? 'Today' : 
                               user.lastActivityDays === 1 ? 'Yesterday' : 
                               `${user.lastActivityDays} days ago`}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}