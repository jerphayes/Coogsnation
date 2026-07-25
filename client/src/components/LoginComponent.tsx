import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Apple, Users, Briefcase, Mail, ArrowRight, Eye, EyeOff } from "lucide-react";
import { FaFacebook, FaLinkedin, FaTwitter } from "react-icons/fa";

const localLoginSchema = z.object({
  handle: z.string().min(3, "Username or email must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

type LocalLoginFormData = z.infer<typeof localLoginSchema>;

interface LoginComponentProps {
  onSuccess?: () => void;
  showTitle?: boolean;
  compact?: boolean;
  defaultToLocal?: boolean;
}

export default function LoginComponent({ onSuccess, showTitle = true, compact = false, defaultToLocal = false }: LoginComponentProps) {
  const [showLocalLogin, setShowLocalLogin] = useState(defaultToLocal);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LocalLoginFormData>({
    resolver: zodResolver(localLoginSchema),
    defaultValues: {
      handle: "",
      password: "",
    },
  });

  const localLoginMutation = useMutation({
    mutationFn: async (data: LocalLoginFormData) => {
      return apiRequest("POST", "/api/auth/login-local", data);
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome back to Cougar Connect!",
      });
      if (onSuccess) onSuccess();
      else window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  // SECURITY: Use server-side only redirect handling via returnTo query param
  const handleOAuthLogin = (provider: string) => {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/api/auth/${provider}?returnTo=${returnTo}`;
  };

  const handleReplitLogin = () => {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/api/login?returnTo=${returnTo}`;
  };

  const onSubmit = (data: LocalLoginFormData) => {
    localLoginMutation.mutate(data);
  };

  const providers = [
    {
      name: "Replit (Google, Apple, GitHub)",
      icon: Chrome,
      color: "bg-gray-700 hover:bg-gray-800",
      textColor: "text-white",
      action: handleReplitLogin,
      description: "Continue with Replit Auth"
    },
    {
      name: "Facebook",
      icon: FaFacebook,
      color: "bg-blue-600 hover:bg-blue-700",
      textColor: "text-white",
      action: () => handleOAuthLogin("facebook"),
      description: "Continue with Facebook"
    },
    {
      name: "LinkedIn",
      icon: FaLinkedin,
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white",
      action: () => handleOAuthLogin("linkedin"),
      description: "Continue with LinkedIn"
    }
  ];

  return (
    <Card className={`w-full ${compact ? 'max-w-md' : 'max-w-lg'} mx-auto shadow-lg border-2 border-uh-red/20`} data-testid="login-component">
      <CardHeader className="text-center space-y-2">
        {showTitle && (
          <>
            <CardTitle className="text-2xl font-bold text-uh-red" data-testid="login-title">
              Welcome to Cougar Connect
            </CardTitle>
            <CardDescription className="text-gray-600" data-testid="login-description">
              Choose your preferred way to sign in
            </CardDescription>
          </>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!showLocalLogin ? (
          <div className="space-y-3">
            {/* OAuth Provider Buttons */}
            {providers.map((provider, index) => {
              const IconComponent = provider.icon;
              return (
                <Button
                  key={provider.name}
                  onClick={provider.action}
                  className={`w-full h-12 ${provider.color} ${provider.textColor} font-medium flex items-center gap-3 transition-all duration-200 hover:scale-[1.02] transform`}
                  data-testid={`button-login-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="flex-1 text-left">{provider.description}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              );
            })}

            <div className="relative my-6">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white px-3 text-sm text-gray-800 font-semibold">or</span>
              </div>
            </div>

            {/* Local Login Button */}
            <Button
              onClick={() => setShowLocalLogin(true)}
              variant="outline"
              className="w-full h-12 border-2 border-uh-red text-uh-red hover:bg-uh-red hover:text-white font-medium flex items-center gap-3 transition-all duration-200 hover:scale-[1.02] transform"
              data-testid="button-show-local-login"
            >
              <Mail className="w-5 h-5" />
              <span className="flex-1 text-left">Continue with Email & Password</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="text-center pt-4 space-y-3">
              <p className="text-sm text-gray-800">
                New to Cougar Connect?{" "}
                <a 
                  href="/register" 
                  className="text-uh-red hover:underline font-medium"
                  data-testid="link-register"
                >
                  Create an account
                </a>
              </p>
              <div className="relative my-4">
                <Separator />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white px-3 text-sm text-gray-600">or</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  localStorage.setItem("guestMode", "true");
                  window.location.href = "/forums";
                }}
                variant="ghost"
                className="w-full text-gray-600 hover:text-uh-red font-medium"
                data-testid="button-continue-guest"
              >
                👤 Continue as Guest
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Local Login Form */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                onClick={() => setShowLocalLogin(false)}
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-uh-red hover:text-uh-red/80"
                data-testid="button-back-to-providers"
              >
                ← Back to all options
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Username, Email, or Social Media Account</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter username, email, or social media account"
                          className="border-gray-300 focus:border-uh-red focus:ring-uh-red"
                          data-testid="input-handle"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="border-gray-300 focus:border-uh-red focus:ring-uh-red pr-10"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-uh-red hover:bg-uh-red/90 text-white font-medium h-12"
                  disabled={localLoginMutation.isPending}
                  data-testid="button-submit-local-login"
                >
                  {localLoginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="text-center pt-2">
              <a 
                href="/reset-password" 
                className="text-sm text-uh-red hover:underline"
                data-testid="link-reset-password"
              >
                Forgot your password?
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}