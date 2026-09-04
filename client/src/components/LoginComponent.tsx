import { useState } from "react";
import MemberMfaLoginChallenge from "@/components/MemberMfaLoginChallenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { FaFacebook, FaLinkedin } from "react-icons/fa";

const localLoginSchema = z.object({
  handle: z.string().min(3, "Username or email must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

type LocalLoginFormData = z.infer<typeof localLoginSchema>;
type AuthProviders = { local: boolean; facebook: boolean; linkedin: boolean };

function safeLoginReturnTo(): string {
  const value =
    new URLSearchParams(
      window.location.search,
    ).get("returnTo") ||
    "/dashboard";

  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  return value;
}


interface LoginComponentProps {
  onSuccess?: () => void;
  showTitle?: boolean;
  compact?: boolean;
  defaultToLocal?: boolean;
}

export default function LoginComponent({ onSuccess, showTitle = true, compact = false }: LoginComponentProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loginWarning, setLoginWarning] = useState("");
  const { toast } = useToast();
  const { data: providers } = useQuery<AuthProviders>({ queryKey: ["/api/auth/providers"] });

  const form = useForm<LocalLoginFormData>({
    resolver: zodResolver(localLoginSchema),
    defaultValues: { handle: "", password: "" },
  });

  const localLoginMutation = useMutation({
    mutationFn: async (data: LocalLoginFormData) => {
      const response = await apiRequest(
        "POST",
        "/api/auth/login-local",
        data,
      );

      return response.json();
    },
    onSuccess: (data: any) => {
      setLoginWarning("");
      if (data?.mfaRequired) {
        setMfaRequired(true);

        toast({
          title: "Two-Factor Authentication",
          description:
            "Enter your authenticator or recovery code to finish signing in.",
        });

        return;
      }

      toast({
        title: "Login Successful",
        description: "Welcome back to CoogsNation!",
      });

      if (onSuccess) onSuccess();
      else window.location.href =
        safeLoginReturnTo();
    },
    onError: (error: Error) => {
      const errorText =
        error.message || "";

      let serverMessage =
        errorText;

      const jsonStart =
        errorText.indexOf("{");

      if (jsonStart >= 0) {
        try {
          const parsed =
            JSON.parse(
              errorText.slice(
                jsonStart,
              ),
            );

          if (
            typeof parsed?.message ===
            "string"
          ) {
            serverMessage =
              parsed.message;
          }
        } catch {
          // Keep the original error text.
        }
      }

      if (
        errorText.startsWith(
          "423:",
        )
      ) {
        setLoginWarning("");

        const identifier =
          form
            .getValues("handle")
            .trim();

        toast({
          title:
            "Account Temporarily Locked",
          description:
            "Three unsuccessful sign-in attempts were detected. Account recovery is available now.",
          variant:
            "destructive",
        });

        window.location.href =
          "/reset-password?identifier=" +
          encodeURIComponent(
            identifier,
          ) +
          "&locked=1";

        return;
      }

      if (
        serverMessage.includes(
          "attempts remaining",
        )
      ) {
        setLoginWarning(
          serverMessage,
        );

        toast({
          title:
            "Security Warning",
          description:
            serverMessage,
          variant:
            "destructive",
        });

        return;
      }

      setLoginWarning("");

      toast({
        title:
          "Login Failed",
        description:
          serverMessage ||
          "Please check your credentials and try again.",
        variant:
          "destructive",
      });
    },
  });

  const handleOAuthLogin = (provider: "facebook" | "linkedin") => {
    const returnTo =
      encodeURIComponent(
        safeLoginReturnTo(),
      );
    window.location.href = `/api/auth/${provider}?returnTo=${returnTo}`;
  };

  return (
    <Card className={`w-full ${compact ? "max-w-md" : "max-w-lg"} mx-auto shadow-lg border-2 border-uh-red/20`} data-testid="login-component">
      <CardHeader className="text-center space-y-2">
        {showTitle && (
          <>
            <CardTitle className="text-2xl font-bold text-uh-red" data-testid="login-title">
              Welcome to CoogsNation
            </CardTitle>
            <CardDescription className="text-gray-600" data-testid="login-description">
              Sign in with your CoogsNation account
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loginWarning && (
          <div
            role="alert"
            className="rounded-md border-2 border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-950"
            data-testid="login-attempt-warning"
          >
            {loginWarning}
          </div>
        )}
        {mfaRequired && (
          <MemberMfaLoginChallenge
            onSuccess={() => {
              toast({
                title: "Login Successful",
                description: "Welcome back to CoogsNation!",
              });

              if (onSuccess) {
                onSuccess();
              } else {
                window.location.href =
                  safeLoginReturnTo();
              }
            }}
          />
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => localLoginMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Username or Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter your username or email"
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
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        data-testid="button-toggle-password"
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
              disabled={localLoginMutation.isPending || mfaRequired}
              data-testid="button-submit-local-login"
            >
              {localLoginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

        {(providers?.facebook || providers?.linkedin) && (
          <>
            <div className="relative py-2">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-white px-3 text-sm text-gray-600">Optional social login</span>
              </div>
            </div>
            <div className="space-y-3">
              {providers.facebook && (
                <Button
                  type="button"
                  onClick={() => handleOAuthLogin("facebook")}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FaFacebook className="w-5 h-5 mr-3" />
                  <span className="flex-1 text-left">Continue with Facebook</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {providers.linkedin && (
                <Button
                  type="button"
                  onClick={() => handleOAuthLogin("linkedin")}
                  className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FaLinkedin className="w-5 h-5 mr-3" />
                  <span className="flex-1 text-left">Continue with LinkedIn</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </>
        )}

        <div className="text-center pt-2 space-y-2">
          <a href="/reset-password" className="text-sm text-uh-red hover:underline">
            Forgot your password?
          </a>
          <p className="text-sm text-gray-700">
            New to CoogsNation?{" "}
            <a
              href={
                `/signup?returnTo=` +
                encodeURIComponent(
                  safeLoginReturnTo(),
                )
              }
              className="text-uh-red hover:underline font-medium"
            >
              Create an account
            </a>
          </p>
          <Button
            type="button"
            onClick={() => {
              localStorage.setItem("guestMode", "true");
              window.location.href = "/forums";
            }}
            variant="ghost"
            className="w-full text-gray-600 hover:text-uh-red"
          >
            Continue as Guest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
