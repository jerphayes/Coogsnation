import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { userProfileCompletionSchema, localAccountRegistrationSchema } from '@shared/schema';
import { User, UserPlus, MapPin, Calendar, Shield, Info, Eye, EyeOff, Lock, MessageSquare } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { ReCaptcha } from '@/components/ReCaptcha';
import type { z } from 'zod';

type ProfileCompletionData = z.infer<typeof userProfileCompletionSchema>;
type LocalRegistrationData = z.infer<typeof localAccountRegistrationSchema>;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function ProfileCompletion() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleCheckError, setHandleCheckError] = useState<string | null>(null);
  const handleCheckController = useRef<AbortController | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [uploadedAvatarPath, setUploadedAvatarPath] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => handleCheckController.current?.abort();
  }, []);

  const uploadAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/auth/upload-avatar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Avatar upload failed");
      }
      const result = await response.json();
      setUploadedAvatarPath(result.avatarUrl);
      return result.avatarUrl as string;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarFileChange = async (file?: File) => {
    if (!file) {
      setPendingAvatarFile(null);
      setAvatarPreviewUrl(null);
      return;
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast({
        title: "Unsupported Image",
        description: "Choose a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Image Too Large",
        description: "Avatar files must be 10 MB or smaller. CoogsNation will optimize the image automatically.",
        variant: "destructive",
      });
      return;
    }

    setPendingAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));

    if (!user) {
      toast({
        title: "Avatar Selected",
        description: "It will be uploaded securely after your account is created.",
      });
      return;
    }

    try {
      await uploadAvatarFile(file);
      toast({ title: "Avatar Uploaded", description: "Your profile picture has been saved." });
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Avatar upload failed",
        variant: "destructive",
      });
    }
  };

  // Get current user info
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });
  const isLocalRegistration = !user;

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const form = useForm<ProfileCompletionData | LocalRegistrationData>({
    resolver: zodResolver(isLocalRegistration ? localAccountRegistrationSchema : userProfileCompletionSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nickname: '',
      handle: '',
      email: '',
      address: '',
      city: '',
      state: '' as any,
      zipCode: '',
      dateOfBirth: undefined as any,
      graduationYear: undefined as any,
      memberCategory: undefined as any,
      commentsAndSuggestions: '',
      favoriteSports: [] as any,
      otherSportComment: '',
      hasConsentedToDataUse: false,
      hasConsentedToMarketing: false,
      password: '',
      confirmPassword: '',
      backupEmail: '',
      // New membership fields
      aboutMe: '',
      interests: '',
      affiliation: undefined as any,
      defaultAvatarChoice: undefined as any,
      majorOrDepartment: '',
      socialLinks: {
        twitter: '',
        linkedin: '',
        instagram: '',
        facebook: '',
        website: '',
      },
      addressLine1: '',
      country: 'USA',
      optInOffers: false,
    },
  });

  // Reset form with user data when it loads
  useEffect(() => {
    if (user) {
      const handle = user.handle || user.username || '';
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        nickname: user.nickname || '',
        handle: handle,
        email: user.email || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
        graduationYear: user.graduationYear || undefined,
        memberCategory: user.memberCategory || undefined,
        commentsAndSuggestions: user.commentsAndSuggestions || '',
        favoriteSports: user.favoriteSports ? JSON.parse(user.favoriteSports) : [],
        otherSportComment: user.otherSportComment || '',
        hasConsentedToDataUse: user.hasConsentedToDataUse || false,
        hasConsentedToMarketing: user.hasConsentedToMarketing || false,
        // New membership fields
        aboutMe: user.aboutMe || '',
        interests: user.interests || '',
        affiliation: user.affiliation || undefined,
        defaultAvatarChoice: user.defaultAvatarChoice || undefined,
        majorOrDepartment: user.majorOrDepartment || '',
        socialLinks: user.socialLinks || {
          twitter: '',
          linkedin: '',
          instagram: '',
          facebook: '',
          website: '',
        },
        addressLine1: user.addressLine1 || '',
        country: user.country || 'USA',
        optInOffers: user.optInOffers || false,
      });
      
      // Automatically check handle availability for existing users
      if (handle && handle.length >= 3) {
        void checkHandle(handle);
      }
    }
  }, [user, form]);

  // Check handle availability. Abort the previous request so an older response
  // cannot overwrite the result for the member's newest input.
  const checkHandle = async (handle: string) => {
    const normalizedHandle = handle.trim();
    if (normalizedHandle.length < 3) {
      handleCheckController.current?.abort();
      setHandleAvailable(null);
      setHandleCheckError(null);
      setIsCheckingHandle(false);
      return;
    }

    handleCheckController.current?.abort();
    const controller = new AbortController();
    handleCheckController.current = controller;
    setHandleAvailable(null);
    setHandleCheckError(null);
    setIsCheckingHandle(true);

    try {
      const response = await fetch(
        `/api/auth/check-handle?handle=${encodeURIComponent(normalizedHandle)}`,
        { signal: controller.signal },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.available !== 'boolean') {
        throw new Error(data.message || 'Handle availability service is unavailable.');
      }
      if (!controller.signal.aborted) {
        setHandleAvailable(data.available);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error checking handle:', error);
      if (!controller.signal.aborted) {
        setHandleAvailable(null);
        setHandleCheckError(
          error instanceof Error ? error.message : 'Unable to verify this handle right now.',
        );
      }
    } finally {
      if (handleCheckController.current === controller) {
        setIsCheckingHandle(false);
      }
    }
  };

  // Complete an authenticated member profile
  const profileCompletionMutation = useMutation({
    mutationFn: async (data: ProfileCompletionData) => {
      // Include reCAPTCHA token in the payload for profile completion too
      const payload = {
        ...data,
        "g-recaptcha-response": recaptchaToken
      };
      return apiRequest('POST', '/api/auth/complete-profile', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Profile Completed!',
        description: 'Welcome to CoogsNation! Your profile has been successfully set up.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Local registration mutation.
  // Membership remains pending until email confirmation.
  const localRegistrationMutation = useMutation({
    mutationFn: async (data: LocalRegistrationData) => {
      const payload = {
        ...data,
        "g-recaptcha-response": recaptchaToken
      };

      const response = await apiRequest(
        'POST',
        '/api/auth/register-local',
        payload
      );

      const result =
        await response.json().catch(() => ({}));

      return {
        email: data.email,
        verificationRequired:
          result?.verificationRequired === true,
      };
    },

    onSuccess: ({ email }) => {
      toast({
        title: 'Check Your Email',
        description:
          'Your membership is pending. Click the confirmation link within 24 hours to activate CoogsNation membership.',
      });

      setLocation(
        `/verify-email-pending?email=${encodeURIComponent(email)}`
      );
    },

    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description:
          error.message ||
          'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileCompletionData | LocalRegistrationData) => {
    const requestedHandle = typeof data.handle === 'string' ? data.handle.trim() : '';
    if (requestedHandle && handleAvailable !== true) {
      toast({
        title: 'Handle Not Available',
        description: 'Please choose a different handle.',
        variant: 'destructive',
      });
      return;
    }
    
    const recaptchaConfigured = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);
    if (isLocalRegistration && recaptchaConfigured && !recaptchaToken) {
      toast({
        title: 'reCAPTCHA Required',
        description: 'Please complete the reCAPTCHA verification to continue.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isLocalRegistration) {
      // Include reCAPTCHA token in the form data
      const registrationData = {
        ...data,
        'g-recaptcha-response': recaptchaToken
      } as any;
      localRegistrationMutation.mutate(registrationData);
    } else {
      profileCompletionMutation.mutate(data as ProfileCompletionData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-page-title">
            Complete Your CoogsNation Profile
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join the Houston Cougar community. Only the essentials are required; everything marked optional can be left blank.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Optional handle and avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Display Name & Avatar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="your_handle"
                            data-testid="input-handle"
                            onChange={(e) => {
                              field.onChange(e);
                              const value = e.target.value;
                              if (value.trim().length >= 3) {
                                void checkHandle(value);
                              } else {
                                handleCheckController.current?.abort();
                                setHandleAvailable(null);
                                setHandleCheckError(null);
                                setIsCheckingHandle(false);
                              }
                            }}
                            className="pr-24"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {isCheckingHandle && (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                            )}
                            {!isCheckingHandle && handleAvailable === true && (
                              <Badge variant="secondary" className="text-green-700 bg-green-100">Available</Badge>
                            )}
                            {!isCheckingHandle && handleAvailable === false && (
                              <Badge variant="destructive">Taken</Badge>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-gray-600">
                        Leave this blank to use your name. A custom handle may use letters, numbers, and underscores only.
                      </p>
                      {handleCheckError && (
                        <p className="text-sm text-red-600" role="alert" data-testid="handle-check-error">
                          {handleCheckError} Clear the optional handle to continue, or retry after the service is available.
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Avatar selection works during signup and authenticated edits. */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile Avatar (Optional)
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Choose a JPG, PNG, or WebP image up to 10 MB. CoogsNation automatically corrects orientation, crops it square, resizes it, removes metadata, and optimizes it.
                    </p>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={isUploadingAvatar}
                      onChange={(event) => void handleAvatarFileChange(event.target.files?.[0])}
                      data-testid="input-avatar-file"
                    />
                    {avatarPreviewUrl && (
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarPreviewUrl}
                          alt="Selected avatar preview"
                          className="h-20 w-20 rounded-full border object-cover"
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {user ? 'Preview of your uploaded avatar.' : 'Preview — this will upload after account creation.'}
                        </div>
                      </div>
                    )}
                    {uploadedAvatarPath && (
                      <div className="text-sm text-green-600 dark:text-green-400">✓ Avatar uploaded successfully</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email and Password (for local registration) */}
            {isLocalRegistration && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your.email@example.com"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-600">
                          This will be your login email and primary contact method.
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="backupEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backup Email (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="backup@example.com"
                            data-testid="input-backup-email"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-600">
                          Used for account recovery and important notifications.
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              data-testid="input-password"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        {field.value && (
                          <PasswordStrengthIndicator 
                            password={field.value} 
                            className="mt-2"
                          />
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Re-enter your password"
                              data-testid="input-confirm-password"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Password Requirements
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• At least 9 characters long</li>
                      <li>• Contains uppercase and lowercase letters</li>
                      <li>• Contains at least one number</li>
                      <li>• Contains at least one special character (!@#$%^&*...)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" data-testid="input-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" data-testid="input-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Johnny" data-testid="input-nickname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isLocalRegistration && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" data-testid="input-profile-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date" 
                          max={new Date().toISOString().split('T')[0]}
                          data-testid="input-dob"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(`${e.target.value}T12:00:00.000Z`) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Required Contact Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Contact Address
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 Main St"
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Houston"
                            data-testid="input-city"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>

                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem
                                key={state}
                                value={state}
                              >
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="77204"
                            data-testid="input-zipcode"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="USA"
                          data-testid="input-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* About Me & Interests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  About Me & Interests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="aboutMe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Me (Optional)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Tell us about yourself, your interests, goals, or anything you'd like the community to know..."
                          data-testid="textarea-about-me"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interests (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Sports, Music, Technology, Gaming, Reading, etc." data-testid="input-interests" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Avatar Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Choose Your Avatar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="defaultAvatarChoice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a default avatar (optional)</FormLabel>
                      <FormControl>
                        <div className="flex gap-3 flex-wrap">
                          {[
                            { id: 1, emoji: '🐾', label: 'Paw' },
                            { id: 2, emoji: '🔥', label: 'Fire' },
                            { id: 3, emoji: '🎓', label: 'Graduate' },
                            { id: 4, emoji: '🏈', label: 'Football' },
                            { id: 5, emoji: '🎉', label: 'Party' },
                          ].map((avatar) => (
                            <button
                              key={avatar.id}
                              type="button"
                              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl transition-all ${
                                field.value === avatar.id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              onClick={() => field.onChange(field.value === avatar.id ? undefined : avatar.id)}
                              data-testid={`button-avatar-${avatar.id}`}
                            >
                              {avatar.emoji}
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Social Links (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter/X</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://twitter.com/username" data-testid="input-twitter" />
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
                          <Input {...field} placeholder="https://linkedin.com/in/username" data-testid="input-linkedin" />
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
                          <Input {...field} placeholder="https://instagram.com/username" data-testid="input-instagram" />
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
                          <Input {...field} placeholder="https://facebook.com/username" data-testid="input-facebook" />
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
                          <Input {...field} placeholder="https://yourwebsite.com" data-testid="input-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Comments and Favorite Sports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments & Sports Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="commentsAndSuggestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments and Suggestions</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Share any comments, suggestions, or feedback about CoogsNation..."
                          data-testid="textarea-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="favoriteSports"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Sports</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {(['football', 'basketball', 'other'] as const).map((sport) => (
                            <div key={sport} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={sport}
                                checked={field.value?.includes(sport) || false}
                                onChange={(e) => {
                                  const currentSports = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentSports, sport]);
                                  } else {
                                    field.onChange(currentSports.filter((s: typeof sport) => s !== sport));
                                  }
                                }}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                data-testid={`checkbox-sport-${sport}`}
                              />
                              <label htmlFor={sport} className="text-sm font-medium capitalize">
                                {sport === 'other' ? 'Other Sport' : sport}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="otherSportComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>If Other Sport, Please Specify</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Tennis, Baseball, Swimming..."
                          data-testid="input-other-sport"
                          disabled={!form.watch('favoriteSports')?.includes('other')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Privacy and Consent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Consent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <h4 className="font-semibold mb-2">CoogsNation Data Privacy Notice</h4>
                      <p className="mb-3">
                        Your data will be used for internal CoogsNation purposes to provide you with community features, 
                        forums, news, events, and other platform services. We will <strong>NOT</strong> share your personal 
                        information with third parties unless you explicitly consent below.
                      </p>
                      <p>
                        By completing this form, you agree to our data collection and usage for operating the CoogsNation platform.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="hasConsentedToDataUse"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-data-consent"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          I consent to CoogsNation collecting and using my data for internal platform purposes *
                        </FormLabel>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Required to create your account and participate in the community
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasConsentedToMarketing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-marketing-consent"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          I want to receive CoogsNation special offers and promotional communications
                        </FormLabel>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Optional - You can change this preference anytime in your account settings
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="optInOffers"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-offers-optin"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          I want to receive special offers from CoogsNation affiliates and partners
                        </FormLabel>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Optional - Receive exclusive deals and discounts from our partners and sponsors
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* reCAPTCHA appears when a site key is configured. Codespaces can
                use the explicit non-production server bypass instead. */}
            {isLocalRegistration && import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <ReCaptcha
                      siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''}
                      onChange={(token) => setRecaptchaToken(token)}
                      onExpired={() => setRecaptchaToken(null)}
                      onError={() => {
                        setRecaptchaToken(null);
                        toast({
                          title: 'reCAPTCHA Error',
                          description: 'There was an error loading reCAPTCHA. Please refresh the page.',
                          variant: 'destructive',
                        });
                      }}
                      theme="light"
                      size="normal"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full max-w-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setLocation('/')}
                data-testid="button-exit"
              >
                Exit
              </Button>
              <Button
                type="submit"
                size="lg"
                className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white"
                disabled={
                  profileCompletionMutation.isPending ||
                  localRegistrationMutation.isPending ||
                  isUploadingAvatar ||
                  isCheckingHandle ||
                  (Boolean(form.watch('handle')?.trim()) && handleAvailable !== true)
                }
                data-testid="button-complete-profile"
              >
                {(profileCompletionMutation.isPending || localRegistrationMutation.isPending) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Completing Profile...
                  </div>
                ) : (
                  'Complete Profile & Join CoogsNation'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}