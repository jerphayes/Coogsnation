import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCoogpawsProfileSchema } from "@shared/schema";
import { formatDistance } from "date-fns";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

const profileSchema = insertCoogpawsProfileSchema.omit({ userId: true });

// UH email domain verification function
function isUHEmail(email: string | undefined): boolean {
  if (!email) return false;
  
  const uhDomains = [
    '@uh.edu',
    '@cougarnet.uh.edu', 
    '@central.uh.edu',
    '@uhcl.edu',
    '@uhd.edu',
    '@uhv.edu'
  ];
  
  return uhDomains.some(domain => email.toLowerCase().endsWith(domain.toLowerCase()));
}

export default function CoogpawsApp() {
  const { user, isAuthenticated } = useAuth();
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const { toast } = useToast();

  // UH email verification check
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
        <Card className="w-full max-w-md mx-4" data-testid="coogpaws-login-required">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please sign in to access Coogs Lounge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isUHEmail(user?.email)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950 dark:to-red-900">
        <Card className="w-full max-w-md mx-4" data-testid="coogpaws-uh-required">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">UH Community Access Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Coogs Lounge is exclusively for University of Houston community members.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please use your official UH email address (@uh.edu, @cougarnet.uh.edu, etc.) to access the dating platform.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Current email: {user?.email || 'None'}<br/>
                Please contact support if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has a Coogs Lounge profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/coogpaws/profile"],
    enabled: isAuthenticated && isUHEmail(user?.email),
  });

  // Get profiles to swipe on
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["/api/coogpaws/profiles"],
    enabled: isAuthenticated && !!userProfile,
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      age: 18,
      lookingFor: "dating",
      interests: "",
      photos: [],
      isActive: true,
      locationPreference: "on-campus",
      ageRangeMin: 18,
      ageRangeMax: 30,
    },
  });

  // Create/Update profile mutation
  const profileMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) =>
      apiRequest("POST", "/api/coogpaws/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coogpaws/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coogpaws/profiles"] });
      setIsProfileSetupOpen(false);
      toast({ title: "Profile saved successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to save profile", variant: "destructive" });
    },
  });

  // Swipe mutation
  const swipeMutation = useMutation({
    mutationFn: (data: { swipedUserId: string; isLike: boolean }) =>
      apiRequest("POST", "/api/coogpaws/swipe", {
        swiperId: user?.id,
        swipedUserId: data.swipedUserId,
        isLike: data.isLike,
      }),
    onSuccess: (data) => {
      if (data.isMatch) {
        setMatchedUser(profiles[currentProfileIndex]);
        setIsMatchModalOpen(true);
      }
      
      // Move to next profile
      if (currentProfileIndex < profiles.length - 1) {
        setCurrentProfileIndex(currentProfileIndex + 1);
      }
      
      // Reset swipe direction after animation
      setTimeout(() => setSwipeDirection(null), 500);
    },
    onError: () => {
      toast({ title: "Failed to record swipe", variant: "destructive" });
      setSwipeDirection(null);
    },
  });

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    profileMutation.mutate(data);
  };

  const handleSwipe = (isLike: boolean) => {
    if (currentProfileIndex >= profiles.length) return;
    
    setSwipeDirection(isLike ? 'right' : 'left');
    const profile = profiles[currentProfileIndex];
    
    swipeMutation.mutate({
      swipedUserId: profile.userId,
      isLike,
    });
  };

  const getAgeFromBirthDate = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Load existing profile data when modal opens
  useEffect(() => {
    if (userProfile && isProfileSetupOpen) {
      form.reset({
        bio: userProfile.bio || "",
        age: userProfile.age || 18,
        lookingFor: userProfile.lookingFor || "dating",
        interests: userProfile.interests || "",
        photos: userProfile.photos || [],
        isActive: userProfile.isActive ?? true,
        locationPreference: userProfile.locationPreference || "on-campus",
        ageRangeMin: userProfile.ageRangeMin || 18,
        ageRangeMax: userProfile.ageRangeMax || 30,
      });
    }
  }, [userProfile, isProfileSetupOpen, form]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <i className="fas fa-heart text-4xl text-uh-red"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Join Coogpaws</h3>
          <p className="text-gray-600 mb-6">
            Connect with fellow Coogs! Sign in to start meeting amazing people in the UH community.
          </p>
          <a href="/api/login" className="bg-uh-red text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Sign In to Continue
          </a>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <i className="fas fa-heart text-4xl text-uh-red animate-pulse"></i>
          </div>
          <p className="text-gray-600">Loading your Coogpaws profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <i className="fas fa-heart text-4xl text-uh-red"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Welcome to Coogpaws</h3>
          <p className="text-gray-600 mb-6">
            Create your dating profile to start connecting with fellow Coogs!
          </p>
          
          <Dialog open={isProfileSetupOpen} onOpenChange={setIsProfileSetupOpen}>
            <DialogTrigger asChild>
              <Button className="bg-uh-red hover:bg-red-700" data-testid="button-create-profile">
                <i className="fas fa-plus mr-2"></i>
                Create / Your Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center text-uh-red">
                  <i className="fas fa-heart mr-2"></i>
                  Create Your Heartbeats Profile
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About You</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell people a bit about yourself... your interests, what you're studying, what you enjoy doing..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-bio"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="18"
                              max="99"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-age"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lookingFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Looking For</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-looking-for">
                                <SelectValue placeholder="What are you looking for?" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="friendship">Friendship</SelectItem>
                              <SelectItem value="dating">Dating</SelectItem>
                              <SelectItem value="serious relationship">Serious Relationship</SelectItem>
                              <SelectItem value="networking">Networking</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <FormLabel>Interests (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Sports, music, reading, hiking, gaming..."
                            {...field}
                            data-testid="input-interests"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ageRangeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Age Preference</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="18"
                              max="99"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-age-min"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ageRangeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Age Preference</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="18"
                              max="99"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-age-max"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="locationPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="Where would you like to meet people?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="on-campus">On Campus</SelectItem>
                            <SelectItem value="nearby">Nearby Houston</SelectItem>
                            <SelectItem value="anywhere">Anywhere</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsProfileSetupOpen(false)}
                      data-testid="button-cancel-profile"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-uh-red hover:bg-red-700"
                      disabled={profileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {profileMutation.isPending ? "Saving..." : "Create Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  if (profilesLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <i className="fas fa-heart text-4xl text-uh-red animate-pulse"></i>
          </div>
          <p className="text-gray-600">Finding amazing Coogs for you...</p>
        </CardContent>
      </Card>
    );
  }

  if (profiles.length === 0 || currentProfileIndex >= profiles.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <i className="fas fa-heart text-4xl text-gray-400"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No more profiles</h3>
          <p className="text-gray-600 mb-6">
            You've seen all available profiles for now. Check back later for new Coogs!
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => {
                setCurrentProfileIndex(0);
                queryClient.invalidateQueries({ queryKey: ["/api/coogpaws/profiles"] });
              }}
              variant="outline"
              data-testid="button-refresh-profiles"
            >
              <i className="fas fa-refresh mr-2"></i>
              Refresh
            </Button>
            <Button
              onClick={() => setIsProfileSetupOpen(true)}
              className="bg-uh-red hover:bg-red-700"
              data-testid="button-edit-profile"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProfile = profiles[currentProfileIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-uh-red rounded-lg flex items-center justify-center">
            <i className="fas fa-heart text-2xl text-white"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-uh-black">Heartbeats</h2>
            <p className="text-gray-600">Connect with fellow Coogs</p>
          </div>
        </div>
        <Button
          onClick={() => setIsProfileSetupOpen(true)}
          variant="outline"
          size="sm"
          data-testid="button-manage-profile"
        >
          <i className="fas fa-user mr-2"></i>
          My Profile
        </Button>
      </div>

      {/* Profile Card */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfileIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
                rotate: swipeDirection === 'left' ? -15 : swipeDirection === 'right' ? 15 : 0
              }}
              exit={{ 
                scale: 0.8, 
                opacity: 0,
                x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0
              }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <Card className="overflow-hidden shadow-lg">
                <div className="relative h-96 bg-gradient-to-br from-uh-red/10 to-gray-100">
                  {currentProfile.photos && currentProfile.photos.length > 0 ? (
                    <img
                      src={currentProfile.photos[0]}
                      alt={`${user?.firstName || 'User'}'s photo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="w-32 h-32">
                        <AvatarFallback className="text-4xl">
                          {user?.firstName?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Profile info overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-2xl font-bold">
                      {user?.firstName} {user?.lastName}, {currentProfile.age}
                    </h3>
                    {user?.major && (
                      <p className="text-sm opacity-90">{user.major}</p>
                    )}
                    {user?.graduationYear && (
                      <p className="text-sm opacity-90">Class of {user.graduationYear}</p>
                    )}
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {currentProfile.bio || "No bio available."}
                      </p>
                    </div>

                    {currentProfile.interests && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentProfile.interests.split(',').map((interest, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {interest.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Looking For</h4>
                      <Badge className="bg-uh-red hover:bg-red-700">
                        {currentProfile.lookingFor}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-6">
        <Button
          onClick={() => handleSwipe(false)}
          variant="outline"
          size="lg"
          className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          disabled={swipeMutation.isPending}
          data-testid="button-pass"
        >
          <i className="fas fa-times text-xl text-gray-600"></i>
        </Button>
        
        <Button
          onClick={() => handleSwipe(true)}
          size="lg"
          className="w-16 h-16 rounded-full bg-uh-red hover:bg-red-700 border-2 border-uh-red"
          disabled={swipeMutation.isPending}
          data-testid="button-like"
        >
          <i className="fas fa-heart text-xl text-white"></i>
        </Button>
      </div>

      {/* Progress */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          {currentProfileIndex + 1} of {profiles.length} profiles
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-uh-red h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentProfileIndex + 1) / profiles.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Match Modal */}
      <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl text-uh-red flex items-center justify-center">
              <i className="fas fa-heart mr-2 animate-pulse"></i>
              It's a Match!
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex justify-center items-center space-x-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
              </Avatar>
              <i className="fas fa-heart text-2xl text-uh-red animate-pulse"></i>
              <Avatar className="w-16 h-16">
                <AvatarFallback>{matchedUser?.firstName?.[0]}</AvatarFallback>
              </Avatar>
            </div>
            
            <p className="text-gray-700 mb-6">
              You and {matchedUser?.firstName} liked each other!
            </p>
            
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setIsMatchModalOpen(false)}
                data-testid="button-keep-swiping"
              >
                Keep Swiping
              </Button>
              <Button
                className="bg-uh-red hover:bg-red-700"
                onClick={() => {
                  setIsMatchModalOpen(false);
                  // TODO: Navigate to messages
                  toast({ title: "Start chatting with your match!" });
                }}
                data-testid="button-send-message"
              >
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Setup Dialog - for editing existing profile */}
      <Dialog open={isProfileSetupOpen} onOpenChange={setIsProfileSetupOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-uh-red">
              <i className="fas fa-heart mr-2"></i>
              Edit Your Heartbeats Profile
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About You</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell people a bit about yourself..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-edit-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="18"
                          max="99"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-edit-age"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lookingFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Looking For</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-looking-for">
                            <SelectValue placeholder="What are you looking for?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="friendship">Friendship</SelectItem>
                          <SelectItem value="dating">Dating</SelectItem>
                          <SelectItem value="serious relationship">Serious Relationship</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Interests (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Sports, music, reading, hiking, gaming..."
                        {...field}
                        data-testid="input-edit-interests"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ageRangeMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Age Preference</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="18"
                          max="99"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-edit-age-min"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageRangeMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Age Preference</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="18"
                          max="99"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-edit-age-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="locationPreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-location">
                          <SelectValue placeholder="Where would you like to meet people?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="on-campus">On Campus</SelectItem>
                        <SelectItem value="nearby">Nearby Houston</SelectItem>
                        <SelectItem value="anywhere">Anywhere</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsProfileSetupOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-uh-red hover:bg-red-700"
                  disabled={profileMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {profileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}