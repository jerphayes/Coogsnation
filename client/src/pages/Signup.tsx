import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "" 
  });
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const existing = localStorage.getItem("coogsnationUsers");
    const users = existing ? JSON.parse(existing) : [];
    
    const exists = users.find((u: any) => u.email === form.email);
    if (exists) {
      setMessage("This email is already registered. Try logging in instead.");
      toast({
        title: "Email Already Registered",
        description: "Try logging in instead.",
        variant: "destructive",
      });
      return;
    }
    
    users.push(form);
    localStorage.setItem("coogsnationUsers", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(form));
    
    setMessage("Account created! Redirecting to dashboard...");
    toast({
      title: "Account Created!",
      description: "Welcome to CoogsNation!",
    });
    
    setTimeout(() => (window.location.href = "/dashboard"), 1500);
  };

  const handleReset = () => {
    if (!window.confirm("Clear all entered fields and start fresh?")) return;
    setForm({ name: "", email: "", password: "" });
    setMessage("");
    toast({
      title: "Form Cleared",
      description: "All fields have been reset.",
    });
  };

  const handleExit = () => {
    if (!window.confirm("Exit signup page without saving?")) return;
    setForm({ name: "", email: "", password: "" });
    setMessage("");
    localStorage.removeItem("currentUser");
    setTimeout(() => (window.location.href = "/"), 800);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full shadow-lg" data-testid="signup-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-700" data-testid="signup-title">
              Join CoogsNation
            </CardTitle>
            <CardDescription>Create your account to get started</CardDescription>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ Demo Mode: This is a demonstration account stored locally in your browser only.
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="signup-form">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="bg-red-600 text-white hover:bg-red-700"
                data-testid="button-submit-signup"
              >
                Create Account
              </Button>
            </form>
            
            {message && (
              <p className="text-center mt-3 text-green-600" data-testid="text-message">
                {message}
              </p>
            )}

            {/* Reset and Exit */}
            <div className="flex justify-center mt-6 gap-4">
              <Button
                type="button"
                onClick={handleReset}
                className="bg-yellow-500 text-white hover:bg-yellow-600"
                data-testid="button-reset"
              >
                🔄 Reset
              </Button>

              <Button
                type="button"
                onClick={handleExit}
                className="bg-gray-600 text-white hover:bg-gray-700"
                data-testid="button-exit"
              >
                🚪 Exit
              </Button>
            </div>

            <p className="text-center mt-4 text-sm" data-testid="text-login-link">
              Already a member?{" "}
              <a href="/login/other" className="text-red-600 hover:underline" data-testid="link-login">
                Log in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
