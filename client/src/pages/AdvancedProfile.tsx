import { useState, useRef } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AchievementProgress, CompactAchievementProgress } from "@/components/ui/AchievementProgress";
import { AchievementBadge } from "@/components/ui/AchievementBadge";
import { userProfileUpdateSchema } from "@shared/schema";
import { z } from "zod";

type ProfileUpdateData = z.infer<typeof userProfileUpdateSchema>;

export default function AdvancedProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/users/profile", (user as any)?.id],
    enabled: !!(user as any)?.id,
  });

  const { data: userActivity, isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/users/activity", (user as any)?.id],
    enabled: !!(user as any)?.id,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/users/stats", (user as any)?.id],
    enabled: !!(user as any)?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) =>
      apiRequest("PATCH", `/api/users/profile/${(user as any)?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile", (user as any)?.id] });
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

  const deleteProfileMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/users/profile/${(user as any)?.id}`),
    onSuccess: () => {
      toast({
        title: "Profile Deleted",
        description: "Your profile has been permanently deleted",
      });
      // Redirect to logout or home page
      window.location.href = '/api/logout';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete profile",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      firstName: userProfile?.firstName || (user as any)?.firstName || "",
      lastName: userProfile?.lastName || (user as any)?.lastName || "",
      nickname: userProfile?.nickname || "",
      bio: userProfile?.bio || "",
      fanType: userProfile?.fanType || undefined,
      city: userProfile?.city || "",
      // Enhanced membership fields
      aboutMe: userProfile?.aboutMe || "",
      interests: userProfile?.interests || "",
      affiliation: userProfile?.affiliation || undefined,
      defaultAvatarChoice: userProfile?.defaultAvatarChoice || undefined,
      graduationYear: userProfile?.graduationYear || undefined,
      majorOrDepartment: userProfile?.majorOrDepartment || "",
      socialLinks: {
        twitter: userProfile?.socialLinks?.twitter || "",
        linkedin: userProfile?.socialLinks?.linkedin || "",
        instagram: userProfile?.socialLinks?.instagram || "",
        facebook: userProfile?.socialLinks?.facebook || "",
        website: userProfile?.socialLinks?.website || "",
      },
      addressLine1: userProfile?.addressLine1 || "",
      addressLine2: userProfile?.addressLine2 || "",
      country: userProfile?.country || "USA",
      optInOffers: userProfile?.optInOffers || false,
    },
  });

  const onSubmit = (data: ProfileUpdateData) => {
    updateProfileMutation.mutate(data);
  };

  const getEngagementLevel = (stats: any) => {
    if (!stats) return { level: "New Member", color: "text-uh-red", progress: 20 };
    const totalActivity = (stats.postsCount || 0) + (stats.commentsCount || 0) + (stats.likesGiven || 0);
    if (totalActivity > 500) return { level: "Highly Active", color: "text-green-600", progress: 100 };
    if (totalActivity > 200) return { level: "Very Active", color: "text-blue-600", progress: 80 };
    if (totalActivity > 50) return { level: "Active", color: "text-yellow-600", progress: 60 };
    if (totalActivity > 10) return { level: "Engaged", color: "text-purple-600", progress: 40 };
    return { level: "New Member", color: "text-uh-red", progress: 20 };
  };

  const getReputationBadges = (stats: any) => {
    if (!stats) return [];
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
              <AvatarImage src={userProfile?.avatarUrl} alt={userProfile?.displayName || (user as any)?.name} />
              <AvatarFallback className="bg-white text-uh-red text-2xl font-bold">
                {(userProfile?.displayName || (user as any)?.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-3 text-white drop-shadow-lg">
                {userProfile?.displayName || (user as any)?.name || "Coogs Fan"}
              </h1>
              <p className="text-black text-lg font-bold mb-3 drop-shadow-md">
                {userProfile?.bio || "Proud member of the CoogsNation community"}
              </p>
              <div className="flex items-center space-x-4 text-base font-semibold text-white">
                <span className="flex items-center">
                  <i className="fas fa-calendar-alt mr-2 text-white"></i>
                  Joined {formatDistance(new Date(userProfile?.joinedAt || (user as any)?.createdAt || new Date()), new Date(), { addSuffix: true })}
                </span>
                {userProfile?.graduationYear && (
                  <span className="flex items-center">
                    <i className="fas fa-graduation-cap mr-2"></i>
                    Class of {userProfile?.graduationYear}
                  </span>
                )}
                {userProfile?.hometown && (
                  <span className="flex items-center">
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    {userProfile?.hometown}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-bold text-white bg-uh-red px-4 py-2 rounded-lg border-2 border-white">
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
              <h3 className="text-3xl font-bold text-uh-red">{userStats?.postsCount || 0}</h3>
              <p className="text-uh-red text-lg font-bold">Forum Posts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-heart text-3xl text-pink-600"></i>
              </div>
              <h3 className="text-3xl font-bold text-uh-red">{userStats?.likesReceived || 0}</h3>
              <p className="text-uh-red text-lg font-bold">Likes Received</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-trophy text-3xl text-yellow-600"></i>
              </div>
              <h3 className="text-3xl font-bold text-uh-red">{badges.length}</h3>
              <p className="text-uh-red text-lg font-bold">Achievement Badges</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-star text-3xl text-purple-600"></i>
              </div>
              <h3 className="text-3xl font-bold text-uh-red">{userStats?.reputationScore || 0}</h3>
              <p className="text-uh-red text-lg font-bold">Reputation Score</p>
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
                        name="fanType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type of Fan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your fan type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Graduate">Graduate</SelectItem>
                                <SelectItem value="Under Grad">Under Grad</SelectItem>
                                <SelectItem value="Faculty">Faculty</SelectItem>
                                <SelectItem value="Staff">Staff</SelectItem>
                                <SelectItem value="Coog Crazy Fan">Coog Crazy Fan</SelectItem>
                              </SelectContent>
                            </Select>
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
                        name="interest"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interest</FormLabel>
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
                      name="suggestionBox"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suggestion Box</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Sports, Music, Technology" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="your.email@example.com" 
                              {...field} 
                            />
                          </FormControl>
                          <p className="text-sm text-gray-600">
                            For password recovery and platform updates
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Enhanced Membership Fields */}
                    <div className="space-y-6 mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-uh-red">Enhanced Profile Information</h3>
                      
                      <FormField
                        control={form.control}
                        name="aboutMe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>About Me</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell us about yourself, your interests, goals, or anything you'd like the community to know..."
                                className="min-h-[100px]"
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
                          name="interests"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interests</FormLabel>
                              <FormControl>
                                <Input placeholder="Sports, Music, Technology, Gaming, Reading, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="affiliation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Affiliation</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your affiliation" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Current Student">Current Student</SelectItem>
                                  <SelectItem value="Ex-Student">Ex-Student</SelectItem>
                                  <SelectItem value="Graduate">Graduate</SelectItem>
                                  <SelectItem value="Faculty">Faculty</SelectItem>
                                  <SelectItem value="Staff">Staff</SelectItem>
                                  <SelectItem value="Coog Crazy Fan">Coog Crazy Fan</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="graduationYear"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Graduation Year</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1950" 
                                  max="2050" 
                                  placeholder="e.g., 2024"
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="majorOrDepartment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Major/Department</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Computer Science" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3">
                          <Label>Choose Avatar</Label>
                          <div className="flex flex-col gap-3">
                            {/* Avatar Preview */}
                            {(avatarPreview || userProfile?.profileImageUrl) && (
                              <div className="flex items-center gap-3">
                                <Avatar className="w-20 h-20 border-2 border-gray-300">
                                  <AvatarImage src={avatarPreview || userProfile?.profileImageUrl} alt="Avatar preview" />
                                  <AvatarFallback>
                                    {((user as any)?.name || "U").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-sm text-gray-600">
                                  {avatarPreview ? "New avatar selected" : "Current avatar"}
                                </div>
                              </div>
                            )}
                            
                            {/* File Input */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // Validate file type
                                if (!['image/jpeg', 'image/png'].includes(file.type)) {
                                  toast({
                                    title: "Invalid file type",
                                    description: "Please select a JPG or PNG image",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                // Validate file size (2MB limit)
                                if (file.size > 2 * 1024 * 1024) {
                                  toast({
                                    title: "File too large",
                                    description: "Please select an image under 2MB",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                setAvatarFile(file);
                                
                                // Create preview
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAvatarPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);

                                // Upload immediately
                                setIsUploadingAvatar(true);
                                const formData = new FormData();
                                formData.append('avatar', file);
                                formData.append('userId', (user as any)?.id);

                                try {
                                  const response = await fetch('/api/upload-avatar', {
                                    method: 'POST',
                                    body: formData,
                                  });

                                  if (!response.ok) {
                                    throw new Error('Upload failed');
                                  }

                                  const data = await response.json();
                                  
                                  toast({
                                    title: "Avatar uploaded!",
                                    description: "Your avatar has been updated successfully",
                                  });

                                  // Refresh profile data
                                  queryClient.invalidateQueries({ queryKey: ["/api/users/profile", (user as any)?.id] });
                                } catch (error) {
                                  toast({
                                    title: "Upload failed",
                                    description: "Failed to upload avatar. Please try again.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsUploadingAvatar(false);
                                }
                              }}
                            />
                            
                            {/* Upload Button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingAvatar}
                              className="w-full border-uh-red text-uh-red hover:bg-uh-red hover:text-white"
                            >
                              {isUploadingAvatar ? (
                                <>
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-upload mr-2"></i>
                                  Choose Avatar (JPG/PNG, max 2MB)
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500">
                              Image will be automatically resized to 256x256 pixels
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Social Media Links */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-uh-black">Social Media Links</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="socialLinks.twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter/X</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url" 
                                    placeholder="https://twitter.com/yourusername" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
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
                                  <Input 
                                    type="url" 
                                    placeholder="https://linkedin.com/in/yourusername" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
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
                                  <Input 
                                    type="url" 
                                    placeholder="https://instagram.com/yourusername" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="socialLinks.facebook"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url" 
                                    placeholder="https://facebook.com/yourusername" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="socialLinks.website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Personal Website</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="url" 
                                    placeholder="https://yourwebsite.com" 
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-uh-black">Address Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="addressLine1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 1</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="addressLine2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 2</FormLabel>
                                <FormControl>
                                  <Input placeholder="Apartment, suite, etc. (optional)" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., USA" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Marketing Preferences */}
                      <FormField
                        control={form.control}
                        name="optInOffers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value || false}
                                onChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Marketing Communications
                              </FormLabel>
                              <p className="text-sm text-gray-600">
                                Receive updates about CoogsNation events, merchandise, and community news
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-4 mt-8">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="bg-uh-red hover:bg-red-700"
                      >
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteProfileMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="button-delete-profile"
                          >
                            {deleteProfileMutation.isPending ? "Deleting..." : "Delete Profile"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently Delete Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProfileMutation.mutate()}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="button-confirm-delete"
                            >
                              Click to Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                ) : !userActivity || userActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-clock text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                    <p className="text-gray-600">Start participating in the community to see your activity here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userActivity?.map((activity: any, index: number) => (
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