import { useState, useEffect } from 'react';
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
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';
import { userProfileCompletionSchema, localAccountRegistrationSchema } from '@shared/schema';
import { User, UserPlus, MapPin, Calendar, Shield, Info, Eye, EyeOff, Lock, MessageSquare } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { ReCaptcha } from '@/components/ReCaptcha';
import type { z } from 'zod';

type ProfileCompletionData = z.infer<typeof userProfileCompletionSchema>;
type LocalRegistrationData = z.infer<typeof localAccountRegistrationSchema>;

const MEMBER_CATEGORIES = [
  { value: 'Student', label: 'Student', description: 'Currently enrolled student' },
  { value: 'Ex-Student', label: 'Ex-Student', description: 'Former University of Houston student' },
  { value: 'Graduate', label: 'Graduate', description: 'Graduate of University of Houston' },
  { value: 'Post Graduate', label: 'Post Graduate', description: 'Post graduate degree holder' },
  { value: 'Faculty', label: 'Faculty Member', description: 'University of Houston faculty' },
  { value: 'Staff', label: 'Staff Member', description: 'University of Houston staff' },
  { value: 'Coog Crazy Fan', label: 'Coog Crazy Fan', description: 'Enthusiastic Houston Cougars supporter' },
  { value: 'Friend', label: 'Friend', description: 'Friend of the University of Houston community' },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLocalRegistration, setIsLocalRegistration] = useState(true); // Start directly in email registration mode
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [uploadedAvatarPath, setUploadedAvatarPath] = useState<string | null>(null);

  // Avatar upload functions
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/avatar-upload') as any;
      return {
        method: response.method as "PUT",
        url: response.url,
      };
    } catch (error) {
      console.error('Error getting avatar upload URL:', error);
      throw error;
    }
  };

  const handleAvatarUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const file = result.successful?.[0];
      if (file && file.uploadURL) {
        // Complete the avatar upload process
        const response = await apiRequest('PUT', '/api/objects/avatar-complete', {
          avatarURL: file.uploadURL
        }) as any;
        
        setUploadedAvatarPath(response.objectPath);
        
        toast({
          title: 'Avatar Uploaded!',
          description: 'Your profile picture has been uploaded successfully.',
        });
      }
    } catch (error) {
      console.error('Error completing avatar upload:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to complete avatar upload. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get current user info
  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

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
      state: 'TX',
      zipCode: '',
      dateOfBirth: new Date(),
      graduationYear: '' as any, // Use empty string instead of undefined
      memberCategory: '' as any, // Use empty string instead of undefined
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
      affiliation: '' as any,
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
        state: user.state || 'TX',
        zipCode: user.zipCode || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : new Date(),
        graduationYear: user.graduationYear || '',
        memberCategory: user.memberCategory || '',
        commentsAndSuggestions: user.commentsAndSuggestions || '',
        favoriteSports: user.favoriteSports ? JSON.parse(user.favoriteSports) : [],
        otherSportComment: user.otherSportComment || '',
        hasConsentedToDataUse: user.hasConsentedToDataUse || false,
        hasConsentedToMarketing: user.hasConsentedToMarketing || false,
        // New membership fields
        aboutMe: user.aboutMe || '',
        interests: user.interests || '',
        affiliation: user.affiliation || '',
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
        checkHandle(handle);
      }
    }
  }, [user, form]);

  // Check handle availability
  const checkHandle = async (handle: string) => {
    if (handle.length < 3) return;
    setIsCheckingHandle(true);
    try {
      const response = await fetch(`/api/auth/check-handle?handle=${encodeURIComponent(handle)}`);
      const data = await response.json();
      setHandleAvailable(data.available);
    } catch (error) {
      console.error('Error checking handle:', error);
      setHandleAvailable(null);
    } finally {
      setIsCheckingHandle(false);
    }
  };

  // Profile completion mutation (for Replit Auth users)
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

  // Local registration mutation (for password-based accounts)
  const localRegistrationMutation = useMutation({
    mutationFn: async (data: LocalRegistrationData) => {
      // Include reCAPTCHA token in the payload
      const payload = {
        ...data,
        "g-recaptcha-response": recaptchaToken
      };
      return apiRequest('POST', '/api/auth/register-local', payload);
    },
    onSuccess: () => {
      toast({
        title: 'Account Created Successfully!',
        description: 'Your CoogsNation account has been created. You can now log in.',
      });
      setLocation('/login'); // Would need to create a login page
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileCompletionData | LocalRegistrationData) => {
    if (!handleAvailable) {
      toast({
        title: 'Handle Not Available',
        description: 'Please choose a different handle.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check reCAPTCHA for local registration (disabled for development/testing)
    // if (isLocalRegistration && !recaptchaToken) {
    //   toast({
    //     title: 'reCAPTCHA Required',
    //     description: 'Please complete the reCAPTCHA verification to continue.',
    //     variant: 'destructive',
    //   });
    //   return;
    // }
    
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

  // Show local registration option if no user is logged in and not already in local registration mode
  if (!user && !isLocalRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Join CoogsNation</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose how you'd like to create your account:
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.href = '/api/login'} 
                    className="w-full"
                    data-testid="button-replit-auth"
                  >
                    Continue with Replit Auth
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-gray-50 dark:bg-gray-900 px-2 text-gray-500">Or</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsLocalRegistration(true)}
                    className="w-full"
                    data-testid="button-local-registration"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Create Password-Based Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            Join the Houston Cougar community! Create your handle and provide member information to get full access to CoogsNation.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Handle Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Create Your Handle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="your_handle"
                            data-testid="input-handle"
                            onChange={(e) => {
                              field.onChange(e);
                              const value = e.target.value;
                              if (value && value.length >= 3) {
                                checkHandle(value);
                              } else {
                                setHandleAvailable(null);
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
                        Your unique handle will be visible to other community members. Use letters, numbers, and underscores only.
                      </p>
                    </FormItem>
                  )}
                />

                {/* Avatar Upload - Right under handle box as requested */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile Avatar (Optional)
                  </h4>
                  <div className="flex flex-col space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Upload a profile picture to personalize your account. Accepts JPG, PNG and other safe image formats.
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleAvatarUploadComplete}
                      buttonClassName="w-fit"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Upload Avatar</span>
                      </div>
                    </ObjectUploader>
                    {uploadedAvatarPath && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        ✓ Avatar uploaded successfully
                      </div>
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

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="john@example.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          data-testid="input-dob"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
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
                        <Input {...field} placeholder="123 Main St" data-testid="input-address" />
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
                          <Input {...field} placeholder="Houston" data-testid="input-city" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {US_STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
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
                          <Input {...field} placeholder="77204" data-testid="input-zipcode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Enhanced address fields */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Additional Address Details (Optional)</h4>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street address, P.O. box, etc." data-testid="input-address-line1" />
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
                            <Input {...field} placeholder="USA" data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Member Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="memberCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-member-category">
                            <SelectValue placeholder="Select your category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MEMBER_CATEGORIES.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              <div>
                                <div className="font-medium">{category.label}</div>
                                <div className="text-sm text-gray-600">{category.description}</div>
                              </div>
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
                  name="graduationYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year (If Applicable)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number"
                          min="1950"
                          max={new Date().getFullYear() + 10}
                          placeholder="2024"
                          data-testid="input-graduation-year"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Enhanced membership fields */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Additional Membership Details</h4>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="affiliation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Affiliation</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-affiliation">
                                <SelectValue placeholder="Select your affiliation" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">-- Choose --</SelectItem>
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

                    <FormField
                      control={form.control}
                      name="majorOrDepartment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Major or Department</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Computer Science, Engineering, Business, etc." data-testid="input-major-department" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
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
                      <FormLabel>About Me</FormLabel>
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
                      <FormLabel>Interests</FormLabel>
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

            {/* reCAPTCHA for Local Registration - Temporarily disabled for testing */}
            {/* {isLocalRegistration && (
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
                  {!import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                    <p className="text-sm text-red-600 mt-2 text-center">
                      reCAPTCHA site key not configured
                    </p>
                  )}
                </CardContent>
              </Card>
            )} */}

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
                disabled={profileCompletionMutation.isPending || !handleAvailable}
                data-testid="button-complete-profile"
              >
                {profileCompletionMutation.isPending ? (
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