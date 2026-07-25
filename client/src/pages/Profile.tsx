import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, ForumPost, ForumTopic, Order } from "@shared/schema";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    bio: (user as any)?.bio || "",
    location: (user as any)?.location || "",
    graduationYear: (user as any)?.graduationYear || "",
    major: (user as any)?.major || "",
    favoriteTeam: (user as any)?.favoriteTeam || "Football",
  });
  const { toast } = useToast();

  // User's forum posts
  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["/api/users", (user as any)?.id, "posts"],
    enabled: !!(user as any)?.id,
  });

  // User's orders
  const { data: userOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/users", (user as any)?.id, "orders"],
    enabled: !!(user as any)?.id,
  });

  // User's notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/users", (user as any)?.id, "notifications"],
    enabled: !!(user as any)?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/users/profile", "PUT", data),
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/notifications/${notificationId}/read`, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", (user as any)?.id, "notifications"] });
    },
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view your profile</h2>
            <p className="text-gray-600">You need to be logged in to access your profile page.</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-uh-red rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{(user as any)?.firstName} {(user as any)?.lastName}</CardTitle>
                    <p className="text-gray-600">@{(user as any)?.username}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{(user as any)?.reputation || 0} Rep</Badge>
                      <Badge variant="outline">{(user as any)?.postCount || 0} Posts</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                      <Input
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                    <Textarea
                      placeholder="Bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={3}
                    />
                    <Input
                      placeholder="Location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                    <Input
                      placeholder="Graduation Year"
                      type="number"
                      value={formData.graduationYear}
                      onChange={(e) => setFormData({...formData, graduationYear: e.target.value})}
                    />
                    <Input
                      placeholder="Major"
                      value={formData.major}
                      onChange={(e) => setFormData({...formData, major: e.target.value})}
                    />
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleSave} 
                        disabled={updateProfileMutation.isPending}
                        className="bg-uh-red hover:bg-red-700"
                      >
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(user as any)?.bio && <p className="text-gray-700">{(user as any)?.bio}</p>}
                    <div className="space-y-2 text-sm">
                      {(user as any)?.location && (
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-map-marker-alt text-gray-500"></i>
                          <span>{(user as any)?.location}</span>
                        </div>
                      )}
                      {(user as any)?.graduationYear && (
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-graduation-cap text-gray-500"></i>
                          <span>Class of {(user as any)?.graduationYear}</span>
                        </div>
                      )}
                      {(user as any)?.major && (
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-book text-gray-500"></i>
                          <span>{(user as any)?.major}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      <i className="fas fa-edit mr-2"></i>
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {postsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : userPosts && (userPosts as any[])?.length > 0 ? (
                      <div className="space-y-4">
                        {(userPosts as any[])?.map((post: any) => (
                          <div key={post.id} className="border-b pb-4 last:border-b-0">
                            <h4 className="font-medium text-uh-black">{post.topicTitle}</h4>
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{post.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No posts yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          </div>
                        ))}
                      </div>
                    ) : userOrders && (userOrders as any[])?.length > 0 ? (
                      <div className="space-y-4">
                        {(userOrders as any[])?.map((order: any) => (
                          <div key={order.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">Order #{order.id}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-uh-red">${order.totalAmount}</p>
                                <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No orders yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : notifications && (notifications as any[])?.length > 0 ? (
                      <div className="space-y-4">
                        {(notifications as any[])?.map((notification: any) => (
                          <div 
                            key={notification.id} 
                            className={`border rounded-lg p-4 cursor-pointer ${
                              notification.isRead ? 'bg-gray-50' : 'bg-white border-uh-red'
                            }`}
                            onClick={() => markNotificationReadMutation.mutate(notification.id)}
                          >
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No notifications</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Forum Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Posts</span>
                          <span className="font-bold">{(user as any)?.postCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Reputation</span>
                          <span className="font-bold text-uh-red">{(user as any)?.reputation || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Member Since</span>
                          <span className="font-bold">
                            {new Date((user as any)?.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Email</span>
                          <span className="font-bold">{(user as any)?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Username</span>
                          <span className="font-bold">@{(user as any)?.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status</span>
                          <Badge variant={(user as any)?.isOnline ? 'default' : 'secondary'}>
                            {(user as any)?.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}