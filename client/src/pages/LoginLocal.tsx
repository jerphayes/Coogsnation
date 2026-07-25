import { useEffect, useState } from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState("");

  // One-time migration: convert any old {handle} to {username} for local test data
  useEffect(() => {
    const raw = localStorage.getItem("coogsnationUsers");
    if (!raw) return;
    let users = JSON.parse(raw);
    let changed = false;

    users = users.map((u: any) => {
      if (u.handle && !u.username) {
        changed = true;
        return { ...u, username: u.handle, handle: undefined };
      }
      return u;
    });

    if (changed) localStorage.setItem("coogsnationUsers", JSON.stringify(users));
    
    // DEBUG: Log stored users
    console.log("Stored users in localStorage:", users);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const users = JSON.parse(localStorage.getItem("coogsnationUsers") || "[]");
    const id = identifier.trim().toLowerCase();

    console.log("Login attempt - identifier:", identifier);
    console.log("Login attempt - password:", password);
    console.log("Available users:", users);
    
    // Debug each user
    users.forEach((u: any, index: number) => {
      console.log(`User ${index}:`, {
        username: u.username,
        email: u.email,
        password: u.password,
        usernameMatch: u.username?.toLowerCase() === id,
        emailMatch: u.email?.toLowerCase() === id,
        passwordMatch: u.password === password
      });
    });

    const user = users.find(
      (u: any) =>
        (u.username?.toLowerCase() === id || u.email?.toLowerCase() === id) &&
        u.password === password
    );

    console.log("Found user:", user);

    if (!user) {
      setMessage("Invalid username/email or password.");
      return;
    }

    // Clear any error messages
    setMessage("");
    
    // Save user and redirect
    localStorage.setItem("currentUser", JSON.stringify(user));
    setMessage("✅ Welcome back! Redirecting…");
    setTimeout(() => (window.location.href = "/dashboard"), 800);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow" data-testid="login-local-card">
      <h2 className="text-2xl font-bold text-center text-red-700 mb-3" data-testid="login-local-title">
        Welcome to Cougar Connect
      </h2>
      <p className="text-center text-gray-600 mb-6">
        Sign in with your username <em>or</em> email
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4" data-testid="login-local-form">
        <input
          type="text"
          inputMode="text"
          autoComplete="username email"
          placeholder="Username or Email"
          className="border p-2 rounded text-black placeholder-gray-500"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          data-testid="input-identifier"
        />

        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Password"
            className="border p-2 rounded w-full pr-10 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="input-password"
            style={{
              WebkitTextSecurity: showPw ? "none" : "disc",
              color: "#000",
              backgroundColor: "#fff",
            } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-red-600"
            aria-label={showPw ? "Hide password" : "Show password"}
            data-testid="button-toggle-password"
          >
            {showPw ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" className="bg-red-600 text-white py-2 rounded hover:bg-red-700" data-testid="button-submit-login">
          Sign In
        </button>
      </form>

      {message && (
        <p 
          className={`text-center mt-3 text-sm font-semibold ${
            message.includes('Invalid') 
              ? 'text-red-600 bg-red-50 p-3 rounded border border-red-200' 
              : 'text-green-600 bg-green-50 p-3 rounded border border-green-200'
          }`} 
          data-testid="text-message"
        >
          {message}
        </p>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="font-semibold text-blue-800 mb-1">🔧 Debug Info:</p>
        <p className="text-blue-700">Open browser console (F12) to see what's stored in localStorage</p>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
        <p className="font-semibold text-yellow-900 mb-2">⚠️ Note: This is the Demo Login</p>
        <p className="text-sm text-yellow-800 mb-2">
          This page uses browser localStorage for demo purposes only. If you registered via the main login system, 
          please use the <a href="/login" className="text-red-600 font-bold underline">main login page</a> instead.
        </p>
        <p className="text-xs text-yellow-700">
          Don't have a demo account? <a href="/join" className="text-red-600 font-bold underline">Sign up here</a>
        </p>
      </div>
    </div>
  );
}
