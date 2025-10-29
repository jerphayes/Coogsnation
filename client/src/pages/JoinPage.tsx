import { useState } from "react";

export default function JoinPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const validatePassword = (pw: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword(password)) {
      setMessage("Password must be 8+ chars with one capital letter and one number.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("coogsnationUsers") || "[]");

    if (users.some((u: any) => u.username?.toLowerCase() === username.toLowerCase())) {
      setMessage("That username is already taken.");
      return;
    }
    if (users.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())) {
      setMessage("That email is already registered.");
      return;
    }

    const newUser = { username, email, password, avatar: "" };
    users.push(newUser);
    localStorage.setItem("coogsnationUsers", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(newUser));

    setMessage("");
    setMessage(`✅ Welcome, ${username}! Redirecting to your dashboard…`);
    setTimeout(() => (window.location.href = "/dashboard"), 1000);
  };

  const handleReset = () => {
    if (!confirm("Clear all fields and start over?")) return;
    setUsername("");
    setEmail("");
    setPassword("");
    setMessage("");
  };

  const handleExit = () => {
    if (!confirm("Exit without saving?")) return;
    window.location.href = "/";
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow" data-testid="join-card">
      <h2 className="text-2xl font-bold text-center text-red-700 mb-3" data-testid="join-title">
        Join CoogsNation
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="join-form">
        <input
          type="text"
          inputMode="text"
          autoComplete="username"
          placeholder="Create a username"
          className="border p-2 rounded text-black placeholder-gray-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          data-testid="input-username"
        />

        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email address"
          className="border p-2 rounded text-black placeholder-gray-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="input-email"
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Password (8+ chars, 1 capital & number)"
            className="border p-2 rounded w-full pr-10 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            pattern="^(?=.*[A-Z])(?=.*\d).{8,}$"
            title="Password must be 8+ chars with one capital letter and one number."
            required
            data-testid="input-password"
            style={{
              WebkitTextSecurity: showPassword ? "none" : "disc",
              color: "#000",
              backgroundColor: "#fff",
            } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-red-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
            data-testid="button-toggle-password"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" className="bg-red-600 text-white py-2 rounded hover:bg-red-700" data-testid="button-submit">
          Create Account
        </button>
      </form>

      {message && (
        <p 
          className={`text-center mt-3 text-sm font-semibold ${
            message.includes('✅') 
              ? 'text-green-600 bg-green-50 p-3 rounded border border-green-200' 
              : 'text-red-600 bg-red-50 p-3 rounded border border-red-200'
          }`} 
          data-testid="text-message"
        >
          {message}
        </p>
      )}

      <div className="flex justify-center mt-6 gap-4">
        <button onClick={handleReset} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600" data-testid="button-reset">
          🔄 Reset
        </button>
        <button onClick={handleExit} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700" data-testid="button-exit">
          🚪 Exit
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-4">
        Already a member? <a href="/login/other" className="text-red-600 hover:underline" data-testid="link-login">Log in</a>
      </p>
    </div>
  );
}
