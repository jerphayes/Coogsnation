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
import type { z } from 'zod';
import { Header } from "@/components/Header";

import SecurePasswordGenerator from "@/components/SecurePasswordGenerator";
import MemberMfaPanel from "@/components/MemberMfaPanel";
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

  const registrationParams =
    new URLSearchParams(
      window.location.search,
    );

  const setupToken =
    registrationParams
      .get("setupToken")
      ?.trim() ||
    "";

  const requestedReturnTo =
    registrationParams
      .get("returnTo") ||
    "/dashboard";

  const registrationReturnTo =
    requestedReturnTo.startsWith("/") &&
    !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/dashboard";

  // CANONICAL_PROFILE_V2_MERGE
  // This is the ONE CoogsNation profile/setup page.
  const isIntramuralOrigin =
    registrationReturnTo.startsWith("/intramurals");

  const [setupContextLoading, setSetupContextLoading] =
    useState(Boolean(setupToken));

  const [setupContextError, setSetupContextError] =
    useState("");

  const [verifiedEmail, setVerifiedEmail] =
    useState("");

  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleCheckError, setHandleCheckError] = useState<string | null>(null);
  const handleCheckController = useRef<AbortController | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setupMfaAfterRegistration, setSetupMfaAfterRegistration] = useState(false);
  const [showPostRegistrationMfa, setShowPostRegistrationMfa] = useState(false);
  const [postRegistrationDestination, setPostRegistrationDestination] = useState("/dashboard");
  const [postRegistrationMfaEnabled, setPostRegistrationMfaEnabled] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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
  const {
    data: user,
    isLoading: userLoading,
  } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

  const isLocalRegistration =
    Boolean(setupToken) &&
    !user;

  /*
   * PROFILE_ESTABLISHED_EDIT_V1
   * /complete-profile remains one-time onboarding.
   * /profile/edit is the established-member editor.
   */
  const isProfileEditMode =
    window.location.pathname === "/profile/edit";

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const form = useForm<ProfileCompletionData | LocalRegistrationData>({
    resolver: isProfileEditMode
      ? undefined
      : zodResolver(
          isLocalRegistration
            ? localAccountRegistrationSchema
            : userProfileCompletionSchema,
        ),
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
      age: 18,
      phoneNumber: '',

      dateOfBirth: undefined as any,
      graduationYear: undefined as any,
      memberCategory: undefined as any,
      commentsAndSuggestions: '',
      favoriteSports: [] as any,
      otherSportComment: '',
      hasConsentedToDataUse: false,
      hasAcceptedTerms: false,
      intramuralAgreementAccepted: false,

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

  useEffect(() => {
    if (userLoading) {
      return;
    }

    /*
     * PROFILE_ONBOARDING_ONE_TIME_V1
     * /complete-profile remains one-time onboarding.
     * /profile/edit is the established-member editor.
     */
    if (isProfileEditMode) {
      if (!user) {
        setLocation("/login");
        return;
      }

      if (!user.isProfileComplete) {
        setLocation("/complete-profile");
        return;
      }

      return;
    }

    if (user?.isProfileComplete) {
      setLocation("/profile");
      return;
    }

    if (user || setupToken) {
      return;
    }

    setLocation("/join");
  }, [
    userLoading,
    user,
    setupToken,
    isProfileEditMode,
    setLocation,
  ]);

  useEffect(() => {
    if (!isLocalRegistration) {
      setSetupContextLoading(false);
      return;
    }

    let cancelled =
      false;

    setSetupContextLoading(true);
    setSetupContextError("");

    fetch(
      "/api/auth/email-registration-context?setupToken=" +
        encodeURIComponent(
          setupToken,
        ),
      {
        credentials:
          "include",
      },
    )
      .then(async (response) => {
        const data =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (!response.ok) {
          throw new Error(
            data?.message ||
            "Unable to load verified registration.",
          );
        }

        if (
          !data?.email ||
          typeof data.email !==
            "string"
        ) {
          throw new Error(
            "Verified email is unavailable.",
          );
        }

        if (cancelled) {
          return;
        }

        setVerifiedEmail(
          data.email,
        );

        form.setValue(
          "email",
          data.email,
          {
            shouldValidate:
              true,
          },
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setSetupContextError(
          error instanceof Error
            ? error.message
            : "Unable to load verified registration.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setSetupContextLoading(false);
        }
      });

    return () => {
      cancelled =
        true;
    };
  }, [
    isLocalRegistration,
    setupToken,
    form,
  ]);

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
        favoriteSports: (() => {
          const raw = user.favoriteSports;
          if (Array.isArray(raw)) return raw;
          if (typeof raw !== "string" || !raw.trim()) return [];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
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

    const currentHandle =
      String(user?.handle || user?.username || "")
        .trim()
        .toLowerCase();

    if (
      isProfileEditMode &&
      currentHandle &&
      normalizedHandle.toLowerCase() === currentHandle
    ) {
      handleCheckController.current?.abort();
      setHandleAvailable(true);
      setHandleCheckError(null);
      setIsCheckingHandle(false);
      return;
    }
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

  /*
   * PROFILE_ESTABLISHED_UPDATE_V1
   * Established members update only the server's explicit self-service allowlist.
   * Onboarding/legal/password fields are deliberately excluded.
   */
  const buildProfileUpdatePayload = (value: any) => {
    const nullableText = (input: any) =>
      typeof input === "string" && input.trim()
        ? input.trim()
        : null;

    const normalizedState = (() => {
      if (typeof value.state !== "string") return null;
      const state = value.state.trim();
      return state.length === 2 ? state.toUpperCase() : null;
    })();

    const sourceLinks = value.socialLinks || {};
    const socialLinks = {
      twitter: nullableText(sourceLinks.twitter) || '',
      linkedin: nullableText(sourceLinks.linkedin) || '',
      instagram: nullableText(sourceLinks.instagram) || '',
      facebook: nullableText(sourceLinks.facebook) || '',
      website: nullableText(sourceLinks.website) || '',
    };

    return {
      firstName: nullableText(value.firstName),
      lastName: nullableText(value.lastName),
      handle: nullableText(value.handle),
      nickname: nullableText(value.nickname),
      address: nullableText(value.address),
      city: nullableText(value.city),
      state: normalizedState,
      zipCode: nullableText(value.zipCode),
      dateOfBirth: value.dateOfBirth || null,
      aboutMe: nullableText(value.aboutMe),
      interests: nullableText(value.interests),
      affiliation: value.affiliation || null,
      defaultAvatarChoice: value.defaultAvatarChoice ?? null,
      graduationYear: value.graduationYear ?? null,
      majorOrDepartment: nullableText(value.majorOrDepartment),
      socialLinks,
      addressLine1: nullableText(value.addressLine1),
      country: nullableText(value.country),
      optInOffers: Boolean(value.optInOffers),
      memberCategory: value.memberCategory || null,
      phoneNumber: nullableText(value.phoneNumber),
      commentsAndSuggestions: nullableText(value.commentsAndSuggestions),
      favoriteSports: Array.isArray(value.favoriteSports)
        ? JSON.stringify(value.favoriteSports)
        : nullableText(value.favoriteSports),
      otherSportComment: nullableText(value.otherSportComment),
      hasConsentedToDataUse: Boolean(value.hasConsentedToDataUse),
      hasConsentedToMarketing: Boolean(value.hasConsentedToMarketing),
    };
  };

  const profileUpdateMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest(
        'PUT',
        '/api/auth/update-profile',
        buildProfileUpdatePayload(data),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['/api/auth/user'],
      });
      toast({
        title: 'Profile Updated',
        description: 'Your profile changes have been saved.',
      });
      setLocation('/profile');
    },
    onError: (error: any) => {
      toast({
        title: 'Profile Update Failed',
        description:
          error.message || 'Unable to save your profile changes.',
        variant: 'destructive',
      });
    },
  });

  // Complete an authenticated member profile
  const profileCompletionMutation = useMutation({
    mutationFn: async (data: ProfileCompletionData) => {
      return apiRequest('POST', '/api/auth/complete-profile', data);
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

  // Verified email registration completion.
  // Membership becomes active only after this succeeds.
  const localRegistrationMutation = useMutation({
    mutationFn: async (data: LocalRegistrationData) => {
      if (!setupToken) {
        throw new Error(
          "Verified registration token is missing.",
        );
      }

      const response = await apiRequest(
        'POST',
        '/api/auth/complete-email-registration',
        {
          setupToken,
          returnTo: registrationReturnTo,
          profile: {
            ...data,
            email: verifiedEmail || data.email,
          },
        },
      );

      return response
        .json()
        .catch(
          () => ({}),
        );
    },

    onSuccess: async (result: any) => {
      await queryClient.invalidateQueries({
        queryKey: ['/api/auth/user'],
      });

      if (pendingAvatarFile) {
        try {
          await uploadAvatarFile(
            pendingAvatarFile,
          );
        } catch (error) {
          console.error(
            "Post-registration avatar upload failed:",
            error,
          );

          toast({
            title:
              'Membership Created',
            description:
              'Your membership is active. You can add your profile image later.',
          });
        }
      }

      toast({
        title:
          'Welcome to CoogsNation!',
        description:
          'Your membership is active.',
      });

      const destination =
        typeof result?.returnTo ===
          'string' &&
        result.returnTo.startsWith('/') &&
        !result.returnTo.startsWith('//')
          ? result.returnTo
          : registrationReturnTo;

      if (setupMfaAfterRegistration) {
        setPostRegistrationDestination(
          destination,
        );

        setPostRegistrationMfaEnabled(
          false,
        );

        setShowPostRegistrationMfa(
          true,
        );

        return;
      }

      window.location.href =
        destination;
    },

    onError: (error: any) => {
      toast({
        title:
          'Registration Failed',
        description:
          error.message ||
          'Failed to complete membership. Please try again.',
        variant:
          'destructive',
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
    
    
    if (
      isLocalRegistration &&
      isIntramuralOrigin &&
      (data as LocalRegistrationData)
        .intramuralAgreementAccepted !== true
    ) {
      toast({
        title: "Intramural Agreement Required",
        description:
          "You entered membership through Intramurals. Accept the Intramural Sports & Activities Participation Agreement to complete your membership.",
        variant: "destructive",
      });
      return;
    }

    if (isProfileEditMode) {
      profileUpdateMutation.mutate(data);
    } else if (isLocalRegistration) {
      localRegistrationMutation.mutate(data as LocalRegistrationData);
    } else {
      profileCompletionMutation.mutate(data as ProfileCompletionData);
    }
  };

  if (showPostRegistrationMfa) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
        data-testid="post-registration-mfa-step"
      >
        <Header />

        <div className="mx-auto max-w-3xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>
                Account Security
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Your CoogsNation membership is active. Complete the authenticator setup below to add the extra protection you selected.
              </p>

              <MemberMfaPanel
                autoStart
                onEnabled={() =>
                  setPostRegistrationMfaEnabled(
                    true,
                  )
                }
              />

              <div className="border-t pt-4">
                <Button
                  type="button"
                  className="bg-red-700 text-white hover:bg-red-800"
                  onClick={() => {
                    window.location.href =
                      postRegistrationDestination;
                  }}
                >
                  {postRegistrationMfaEnabled
                    ? "I SAVED MY RECOVERY CODES — CONTINUE"
                    : "CONTINUE WITHOUT 2FA"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {!isLocalRegistration && (
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="mb-6 inline-flex items-center font-semibold text-red-700 hover:text-red-800"
            data-testid="button-back-dashboard"
          >
            ← Back to Dashboard
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-page-title">
            {isProfileEditMode
              ? "Edit Your CoogsNation Profile"
              : "Complete Your CoogsNation Profile"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {isProfileEditMode
              ? "Update your member information and preferences. Account activation and onboarding records are not changed."
              : "Complete your CoogsNation member profile once. All fields marked required must be completed before membership activation."}
          </p>
        </div>

        {isLocalRegistration && setupContextError && (
          <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            {setupContextError}
            <div className="mt-3">
              <a
                href={`/join/email?returnTo=${encodeURIComponent(registrationReturnTo)}`}
                className="underline"
              >
                Request a new verification email
              </a>
            </div>
          </div>
        )}

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
                      <FormLabel>
                        {isLocalRegistration
                          ? "CoogsNation Handle *"
                          : "Handle (Optional)"}
                      </FormLabel>
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
                        {isLocalRegistration
                          ? "Your CoogsNation handle is required. Use letters, numbers, and underscores only."
                          : "Leave this blank to use your name. A custom handle may use letters, numbers, and underscores only."}
                      </p>
                      {handleCheckError && (
                        <p className="text-sm text-red-600" role="alert" data-testid="handle-check-error">
                          {handleCheckError} Choose a different handle or retry after the service is available.
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
                            readOnly
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
                          Verified email — this cannot be changed during membership setup.
                        </p>
                      </FormItem>
                    )}
                  />

                  <SecurePasswordGenerator
                    onUse={(value) => {
                      form.setValue(
                        "password" as any,
                        value,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );

                      form.setValue(
                        "confirmPassword" as any,
                        value,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                    }}
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

                  <div
                    className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900"
                    data-testid="signup-2fa-security-step"
                  >
                    <h4 className="font-bold text-gray-950 dark:text-white">
                      Protect Your Account
                    </h4>

                    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      We strongly suggest that you register for two-factor authentication (2FA). 2FA adds an extra layer of protection of your data we take account security seriously, an will employ the latest protections an updates as technology advances. to do so.
                    </p>

                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 text-sm font-semibold dark:bg-gray-950">
                      <input
                        type="checkbox"
                        checked={setupMfaAfterRegistration}
                        onChange={(event) =>
                          setSetupMfaAfterRegistration(
                            event.target.checked,
                          )
                        }
                        className="mt-1 h-4 w-4"
                        data-testid="checkbox-signup-2fa"
                      />

                      <span>
                        Set up 2FA as the next security step.
                      </span>
                    </label>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Optional. If selected, authenticator setup will open immediately after your membership is created.
                    </p>
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

                {isLocalRegistration && (
                  <div className="mb-6">
                    <FormField
                      control={form.control as any}
                      name={"age" as any}
                      render={({ field }: any) => (
                        <FormItem className="max-w-xs">
                          <FormLabel>Age — 18 or Older Required *</FormLabel>

                          <FormControl>
                            <Input
                              type="number"
                              min={18}
                              max={130}
                              step={1}
                              value={
                                Number.isFinite(Number(field.value))
                                  ? field.value
                                  : 18
                              }
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === ""
                                    ? ""
                                    : Number(event.target.value)
                                )
                              }
                              data-testid="input-age"
                            />
                          </FormControl>

                          <p className="text-sm font-semibold">
                            CoogsNation membership is limited to persons
                            18 years of age or older.
                          </p>

                          <p className="text-sm text-gray-600">
                            By completing membership, you certify that
                            you are at least 18 years old.
                          </p>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth (Optional)</FormLabel>
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

                      <p className="text-sm text-gray-600">
                        Providing your date of birth is optional.
                        It can help CoogsNation recognize your birthday
                        and make you eligible for birthday-related
                        member benefits or special offers.
                        Your date of birth is not required to establish
                        membership eligibility; the 18-or-older
                        certification above controls membership.
                      </p>
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
              {/* PROFILE V2 REQUIRED MEMBERSHIP INFORMATION */}
            {isLocalRegistration && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Membership Requirements
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">
                    <p className="font-bold">
                      Complete Member Information Required
                    </p>
                    <p className="mt-1">
                      CoogsNation membership requires complete and
                      accurate contact information. We take the
                      protection of member information seriously and
                      use security safeguards designed to protect the
                      information entrusted to us.
                    </p>
                  </div>

                  <FormField
                    control={form.control as any}
                    name={"phoneNumber" as any}
                    render={({ field }: any) => (
                      <FormItem>
                        <FormLabel>
                          Mobile Phone — Optional for Membership
                        </FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            autoComplete="tel"
                            placeholder="+1 713 555 1234"
                            data-testid="input-phone"
                          />
                        </FormControl>

                        <p className="text-sm text-gray-600">
                          Used for account security, recovery, and
                          transactional/service notifications.
                          <strong>
                            {" "}We do not use your phone number for
                            marketing.
                          </strong>
                        </p>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control as any}
                    name={"hasAcceptedTerms" as any}
                    render={({ field }: any) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === true}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-terms"
                          />
                        </FormControl>

                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium">
                            I have read and agree to the{" "}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-red-700 underline"
                            >
                              Terms of Use
                            </a>
                            . *
                          </FormLabel>

                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div
                    className={
                      isIntramuralOrigin
                        ? "rounded-lg border-2 border-red-500 bg-red-50 p-5 dark:bg-red-950/30"
                        : "rounded-lg border border-gray-300 bg-gray-50 p-5 dark:bg-gray-800"
                    }
                  >
                    <h3 className="text-lg font-bold">
                      Intramural Sports & Activities
                    </h3>

                    <p className="mt-1 mb-4 text-sm">
                      {isIntramuralOrigin
                        ? "Required because you entered membership through Intramurals."
                        : "Optional during membership setup. Accept now if you may participate in Intramurals later."}
                    </p>

                    <FormField
                      control={form.control as any}
                      name={"intramuralAgreementAccepted" as any}
                      render={({ field }: any) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-intramural-agreement"
                            />
                          </FormControl>

                          <div className="space-y-2">
                            <FormLabel className="text-sm font-normal leading-6">
                              I have read and agree to the{" "}
                              <a
                                href="/intramurals/agreement"
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-red-700 underline"
                              >
                                Intramural Sports & Activities
                                Participation Agreement
                              </a>
                              {isIntramuralOrigin ? ". *" : "."}
                            </FormLabel>

                            <p className="text-sm">
                              I understand these teams and activities
                              are independently organized by members,
                              not operated or controlled by NGF
                              Productions LLC.
                            </p>

                            <p className="text-sm font-semibold">
                              I voluntarily participate and accept the
                              risks involved in physical sports and
                              activities.
                            </p>

                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

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
                          I consent to NGF Productions LLC collecting and using my personal information as described in the Privacy Policy. *
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
                          I want to receive CoogsNation news, updates, special offers and promotional communications by email.
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


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full max-w-xs border-2 border-gray-400 bg-white text-gray-950 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() =>
                  setLocation(
                    isProfileEditMode
                      ? '/profile'
                      : '/',
                  )
                }
                data-testid="button-exit"
              >
                Exit
              </Button>
              <Button
                type="submit"
                size="lg"
                className="w-full max-w-xs bg-red-700 text-white hover:bg-red-800 disabled:bg-gray-400 disabled:text-gray-800"
                disabled={
                  profileUpdateMutation.isPending ||
                  profileCompletionMutation.isPending ||
                  localRegistrationMutation.isPending ||
                  setupContextLoading ||
                  Boolean(setupContextError) ||
                  isUploadingAvatar ||
                  isCheckingHandle ||
                  (
                    isLocalRegistration
                      ? handleAvailable !== true
                      : Boolean(form.watch('handle')?.trim()) &&
                        handleAvailable !== true
                  )
                }
                data-testid={
                  isProfileEditMode
                    ? "button-save-profile"
                    : "button-complete-profile"
                }
              >
                {(
                  profileUpdateMutation.isPending ||
                  profileCompletionMutation.isPending ||
                  localRegistrationMutation.isPending
                ) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isProfileEditMode
                      ? "Saving Profile..."
                      : "Completing Profile..."}
                  </div>
                ) : (
                  isProfileEditMode
                    ? 'Save Profile Changes'
                    : 'Complete Profile & Join CoogsNation'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
      </div>
    </div>
  );
}
