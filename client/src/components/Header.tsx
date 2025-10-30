import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { useEffect } from "react";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const { isGuestMode, enableGuestMode } = useGuest();

  // Check for localStorage demo auth
  const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('currentUser');

  const handleGuestClick = () => {
    enableGuestMode();
    window.location.href = '/forums';
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Logo and main navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <img 
              src={logoImage} 
              alt="CoogsNation Logo" 
              className="h-12 w-12 object-contain"
            />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/forums" 
              className="text-white font-bold hover:text-red-500 transition-colors"
              data-testid="link-forums"
            >
              Forums
            </Link>
            <Link 
              href="/members" 
              className="text-white font-bold hover:text-red-500 transition-colors"
              data-testid="link-members"
            >
              Members
            </Link>
            <Link 
              href="/store" 
              className="text-white font-bold hover:text-red-500 transition-colors"
              data-testid="link-store"
            >
              Shopping
            </Link>
            
            {/* Community Dropdown */}
            <div className="relative group">
              <Link 
                href="/community" 
                className="text-white font-bold hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                data-testid="link-community"
              >
                Community
                <span className="text-sm">▼</span>
              </Link>
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px] z-50">
                <Link href="/coogpaws-chat" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-coogpaws">
                  🐾 Coog Paws Chat
                </Link>
                <Link href="/forums/categories/23" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-watercooler">
                  ☕ Water Cooler Talk
                </Link>
                <Link href="/forums/categories/25" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-halloffame">
                  🏆 UH Hall of Fame
                </Link>
                <Link href="/life-happens" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-lifehappens">
                  🌟 Life Happens
                </Link>
                <Link href="/life-solutions" className="block px-4 py-2 text-gray-800 hover:bg-gray-100" data-testid="link-lifesolutions">
                  💡 Life Solutions
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* Right side - Auth buttons or User info */}
        <div className="flex items-center gap-4">
          {/* Show different UI based on auth status */}
          {isAuthenticated || hasLocalAuth ? (
            <>
              {/* Authenticated User Options */}
              <Link 
                href="/dashboard" 
                className="text-white font-bold hover:text-red-500 transition-colors"
                data-testid="link-dashboard"
              >
                Dashboard
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('currentUser');
                  localStorage.removeItem('guestMode');
                  window.location.href = '/api/logout';
                }}
                className="text-white font-bold hover:text-red-500 transition-colors"
                data-testid="button-logout"
              >
                Logout
              </button>
            </>
          ) : isGuestMode ? (
            <>
              {/* Guest Mode UI */}
              <span className="text-yellow-400 font-bold text-sm" data-testid="text-guestmode">
                👤 Guest Mode
              </span>
              <Link 
                href="/join" 
                className="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800 transition-colors"
                data-testid="button-join"
              >
                Sign Up
              </Link>
              <Link 
                href="/login" 
                className="text-white font-bold hover:text-red-500 transition-colors"
                data-testid="button-login"
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Not Authenticated - Show Login/Join/Guest */}
              {/* Login Dropdown */}
              <div className="relative group">
                <button className="text-white font-bold hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1" data-testid="button-login-dropdown">
                  Login
                  <span className="text-sm">▼</span>
                </button>
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[220px] z-50">
                  <a href="/login" className="block px-4 py-2 text-red-600 font-bold hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-site">
                    🔑 Login to Site
                  </a>
                  <a href="/login/email" className="block px-4 py-2 text-red-600 font-bold hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-email">
                    Login with Email
                  </a>
                  <a href="/auth/google?redirect=/dashboard" className="block px-4 py-2 text-red-500 hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-google">
                    Login with Google
                  </a>
                  <a href="/auth/apple?redirect=/dashboard" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-apple">
                    Login with Apple
                  </a>
                  <a href="/auth/linkedin?redirect=/dashboard" className="block px-4 py-2 text-blue-600 hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-linkedin">
                    Login with LinkedIn
                  </a>
                  <a href="/auth/facebook?redirect=/dashboard" className="block px-4 py-2 text-blue-500 hover:bg-gray-100 border-b border-gray-200" data-testid="link-login-facebook">
                    Login with Facebook
                  </a>
                  <a href="/auth/x?redirect=/dashboard" className="block px-4 py-2 text-sky-500 hover:bg-gray-100" data-testid="link-login-x">
                    Login with X (Twitter)
                  </a>
                </div>
              </div>

              {/* Join Dropdown */}
              <div className="relative group">
                <button className="text-white font-bold hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1" data-testid="button-join-dropdown">
                  Join
                  <span className="text-sm">▼</span>
                </button>
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[220px] z-50">
                  <a href="/join" className="block px-4 py-2 text-red-600 font-bold hover:bg-gray-100 border-b border-gray-200" data-testid="link-signup">
                    Sign Up
                  </a>
                  <a href="/auth/google" className="block px-4 py-2 text-red-500 hover:bg-gray-100 border-b border-gray-200" data-testid="link-join-google">
                    Continue with Google
                  </a>
                  <a href="/auth/apple" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-b border-gray-200" data-testid="link-join-apple">
                    Continue with Apple
                  </a>
                  <a href="/auth/linkedin" className="block px-4 py-2 text-blue-600 hover:bg-gray-100 border-b border-gray-200" data-testid="link-join-linkedin">
                    Continue with LinkedIn
                  </a>
                  <a href="/auth/facebook" className="block px-4 py-2 text-blue-500 hover:bg-gray-100 border-b border-gray-200" data-testid="link-join-facebook">
                    Continue with Facebook
                  </a>
                  <a href="/auth/x" className="block px-4 py-2 text-sky-500 hover:bg-gray-100 border-b border-gray-200" data-testid="link-join-x">
                    Continue with X (Twitter)
                  </a>
                  <a href="/signup/other" className="block px-4 py-2 text-gray-600 hover:bg-gray-100" data-testid="link-join-other">
                    Continue with Other
                  </a>
                </div>
              </div>

              {/* Continue as Guest */}
              <button 
                onClick={handleGuestClick}
                className="text-red-500 font-bold hover:text-red-400 transition-colors"
                data-testid="button-guest"
              >
                Continue as Guest
              </button>
            </>
          )}

          {/* Terms - Always visible */}
          <Link 
            href="/terms" 
            className="text-white font-bold hover:text-red-500 transition-colors hidden lg:block"
            data-testid="link-terms"
          >
            Terms
          </Link>
        </div>
      </div>
    </header>
  );
}
