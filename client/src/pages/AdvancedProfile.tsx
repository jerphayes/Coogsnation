import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileUpdateSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  graduationYear: z.string().optional(),
  major: z.string().optional(),
  hometown: z.string().optional(),
  interests: z.string().optional(),
  socialLinks: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
  privacy: z.object({
    showEmail: z.boolean(),
    showGraduationYear: z.boolean(),
    allowMessages: z.boolean(),
  }),
});

type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

export default function AdvancedProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: userProfile = {}, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/users/profile", user?.id],
    enabled: !!user?.id,
  });

  const { data: userActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["/api/users/activity", user?.id],
    enabled: !!user?.id,
  });

  const { data: userStats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users/stats", user?.id],
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) =>
      apiRequest(`/api/users/profile/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      displayName: userProfile.displayName || user?.name || "",
      bio: userProfile.bio || "",
      graduationYear: userProfile.graduationYear || "",
      major: userProfile.major || "",
      hometown: userProfile.hometown || "",
      interests: userProfile.interests || "",
      socialLinks: {
        twitter: userProfile.socialLinks?.twitter || "",
        linkedin: userProfile.socialLinks?.linkedin || "",
        instagram: userProfile.socialLinks?.instagram || "",
      },
      privacy: {
        showEmail: userProfile.privacy?.showEmail ?? true,
        showGraduationYear: userProfile.privacy?.showGraduationYear ?? true,
        allowMessages: userProfile.privacy?.allowMessages ?? true,
      },
    },
  });

  const onSubmit = (data: ProfileUpdateData) => {
    updateProfileMutation.mutate(data);
  };

  const getEngagementLevel = (stats: any) => {
    const totalActivity = (stats.postsCount || 0) + (stats.commentsCount || 0) + (stats.likesGiven || 0);
    if (totalActivity > 500) return { level: "Highly Active", color: "text-green-600", progress: 100 };
    if (totalActivity > 200) return { level: "Very Active", color: "text-blue-600", progress: 80 };
    if (totalActivity > 50) return { level: "Active", color: "text-yellow-600", progress: 60 };
    if (totalActivity > 10) return { level: "Engaged", color: "text-purple-600", progress: 40 };
    return { level: "New Member", color: "text-gray-600", progress: 20 };
  };

  const getReputationBadges = (stats: any) => {
    const badges = [];
    if (stats.postsCount >= 100) badges.push({ name: "Prolific Writer", icon: "fas fa-pen", color: "bg-blue-500" });
    if (stats.likesReceived >= 500) badges.push({ name: "Community Favorite", icon: "fas fa-heart", color: "bg-pink-500" });
    if (stats.yearsActive >= 3) badges.push({ name: "Veteran Member", icon: "fas fa-medal", color: "bg-yellow-500" });
    if (stats.helpfulAnswers >= 50) badges.push({ name: "Helper", icon: "fas fa-hands-helping", color: "bg-green-500" });
    if (stats.forumModerator) badges.push({ name: "Moderator", icon: "fas fa-shield-alt", color: "bg-red-500" });
    return badges;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-uh-black mb-4">Please Log In</h1>
          <p className="text-gray-600">You need to be logged in to view your profile.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const engagement = getEngagementLevel(userStats);
  const badges = getReputationBadges(userStats);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-uh-red to-red-700 rounded-lg p-8 mb-8 text-white">
          <div className="flex items-center space-x-6">
            <Avatar className="w-24 h-24 border-4 border-white">
              <AvatarImage src={userProfile.avatarUrl} alt={userProfile.displayName || user?.name} />
              <AvatarFallback className="bg-white text-uh-red text-2xl font-bold">
                {(userProfile.displayName || user?.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {userProfile.displayName || user?.name || "Coogs Fan"}
              </h1>
              <p className="text-red-100 mb-2">
                {userProfile.bio || "Proud member of the CoogsNation community"}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Joined {formatDistance(new Date(userProfile.joinedAt || user?.createdAt || new Date()), new Date(), { addSuffix: true })}
                </span>
                {userProfile.graduationYear && (
                  <span className="flex items-center">
                    <i className="fas fa-graduation-cap mr-2"></i>
                    Class of {userProfile.graduationYear}
                  </span>
                )}
                {userProfile.hometown && (
                  <span className="flex items-center">
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    {userProfile.hometown}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-lg font-semibold ${engagement.color}`}>
                {engagement.level}
              </div>
              <Progress value={engagement.progress} className="w-32 mt-2 bg-red-800" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-comments text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{userStats.postsCount || 0}</h3>
              <p className="text-gray-600">Forum Posts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-heart text-3xl text-pink-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{userStats.likesReceived || 0}</h3>
              <p className="text-gray-600">Likes Received</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-trophy text-3xl text-yellow-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{badges.length}</h3>
              <p className="text-gray-600">Achievement Badges</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-star text-3xl text-purple-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{userStats.reputationScore || 0}</h3>
              <p className="text-gray-600">Reputation Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your display name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="graduationYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Graduation Year</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 2024" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about yourself..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="major"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Major/Field of Study</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Computer Science" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="hometown"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hometown</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Houston, TX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="interests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interests</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Sports, Music, Technology" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold">Social Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="socialLinks.twitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter</FormLabel>
                              <FormControl>
                                <Input placeholder="@username" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="socialLinks.linkedin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn</FormLabel>
                              <FormControl>
                                <Input placeholder="linkedin.com/in/username" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="socialLinks.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram</FormLabel>
                              <FormControl>
                                <Input placeholder="@username" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-uh-red hover:bg-red-700"
                    >
                      {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : userActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-clock text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600">Start participating in the community to see your activity here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <i className={`${activity.icon || 'fas fa-user'} text-uh-red`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistance(new Date(activity.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Achievement Badges</CardTitle>
              </CardHeader>
              <CardContent>
                {badges.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-trophy text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No badges yet</h3>
                    <p className="text-gray-600">Participate more in the community to earn achievement badges.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {badges.map((badge, index) => (
                      <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <div className={`w-12 h-12 ${badge.color} rounded-full flex items-center justify-center`}>
                          <i className={`${badge.icon} text-white text-lg`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-uh-black">{badge.name}</h4>
                          <p className="text-sm text-gray-600">Earned for community contribution</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="privacy.showEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Show Email Address</FormLabel>
                            <div className="text-sm text-gray-600">
                              Allow other users to see your email address
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="privacy.showGraduationYear"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Show Graduation Year</FormLabel>
                            <div className="text-sm text-gray-600">
                              Display your graduation year on your profile
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="privacy.allowMessages"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Allow Direct Messages</FormLabel>
                            <div className="text-sm text-gray-600">
                              Let other users send you private messages
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={updateProfileMutation.isPending}
                      className="bg-uh-red hover:bg-red-700"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Privacy Settings"}
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}