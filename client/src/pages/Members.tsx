import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { ActiveMembers } from "@/components/ActiveMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Calendar, Trophy } from "lucide-react";

interface Member {
  id: string;
  displayName: string;
  profilePicture?: string;
  joinedDate: string;
  lastActiveDate: string;
  postCount: number;
  level: string;
  badges: string[];
}

export default function Members() {
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/community/members"],
    retry: false,
  });

  const { data: stats } = useQuery<{
    totalMembers: number;
    onlineMembers: number;
    postsToday: number;
    newMembersToday: number;
    activeToday: number;
    newThisMonth: number;
    topContributors: number;
  }>({
    queryKey: ["/api/community/stats"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black mb-2">CoogsNation Members</h1>
          <p className="text-gray-600 text-lg">Connect with fellow Houston Cougar fans, students, alumni, and supporters</p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-uh-red">{stats?.totalMembers || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-uh-red">{stats?.activeToday || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-uh-red">{stats?.newThisMonth || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Contributors</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-uh-red">{stats?.topContributors || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Members List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-uh-red">Community Members</CardTitle>
                <CardDescription>
                  Browse and connect with fellow Houston Cougar fans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-4">
                    {members.map((member: Member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-uh-red text-white rounded-full flex items-center justify-center font-bold">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-uh-black">{member.displayName}</h3>
                            <p className="text-sm text-gray-600">
                              Joined {new Date(member.joinedDate).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary">{member.level}</Badge>
                              <span className="text-xs text-gray-500">{member.postCount} posts</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {member.badges && member.badges.length > 0 && (
                            <div className="flex space-x-1">
                              {member.badges.slice(0, 3).map((badge, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-gray-500">
                            Last active: {new Date(member.lastActiveDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
                    <p className="text-gray-600">Be the first to join the CoogsNation community!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Members Widget */}
            <ActiveMembers />
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-uh-red">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a 
                  href="/forums" 
                  className="block p-3 bg-white border border-uh-red text-uh-red rounded-lg hover:bg-red-50 transition-colors text-center font-semibold"
                  data-testid="link-join-forums"
                >
                  Join Forum Discussions
                </a>
                <a 
                  href="/events" 
                  className="block p-3 border border-uh-red text-uh-red rounded-lg hover:bg-red-50 transition-colors text-center font-semibold"
                  data-testid="link-view-events"
                >
                  View Upcoming Events
                </a>
                <a 
                  href="/community" 
                  className="block p-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-semibold"
                  data-testid="link-community-resources"
                >
                  Community Resources
                </a>
              </CardContent>
            </Card>

            {/* Member Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-uh-red">Community Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <p>• Be respectful to all members</p>
                <p>• Keep discussions on-topic</p>
                <p>• No spam or self-promotion</p>
                <p>• Follow University of Houston values</p>
                <p>• Help fellow Cougars succeed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}