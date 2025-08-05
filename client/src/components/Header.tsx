import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export function Header() {
  const { isAuthenticated, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b-2 border-uh-red sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Branding */}
          <Link href="/" className="flex items-center space-x-4">
            <div className="flex items-center">
              {/* Mini Cougar Logo */}
              <div className="relative w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                <div className="relative w-10 h-8">
                  {/* Mini cougar body */}
                  <div className="absolute bottom-0 left-1 w-8 h-4 bg-uh-red rounded-2xl shadow-sm">
                    <div className="absolute bottom-0 left-1 w-1.5 h-1 bg-red-700 rounded"></div>
                    <div className="absolute bottom-0 right-1 w-1.5 h-1 bg-red-700 rounded"></div>
                  </div>
                  {/* Mini cougar head */}
                  <div className="absolute top-0 left-0 w-6 h-5 bg-uh-red rounded-lg">
                    {/* Mini ears */}
                    <div className="absolute -top-0.5 left-1 w-1 h-1.5 bg-uh-red rounded-t-full"></div>
                    <div className="absolute -top-0.5 right-1 w-1 h-1.5 bg-uh-red rounded-t-full"></div>
                    {/* Mini eyes */}
                    <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full"></div>
                    <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full"></div>
                    {/* Mini nose */}
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-2 h-1.5 bg-white rounded-lg">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-0.5 bg-black rounded-full"></div>
                    </div>
                  </div>
                  {/* Mini tail */}
                  <div className="absolute bottom-1 right-0 w-1.5 h-3 bg-uh-red rounded-full transform rotate-45"></div>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-uh-black">CoogsNation</h1>
                <p className="text-xs text-gray-600">Houston Cougar Community</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-uh-black hover:text-uh-red font-medium transition-colors">
              Home
            </Link>
            <Link href="/forums" className="text-uh-black hover:text-uh-red font-medium transition-colors">
              Forums
            </Link>
            <Link href="/news" className="text-uh-black hover:text-uh-red font-medium transition-colors">
              News
            </Link>
            <Link href="/store" className="text-uh-black hover:text-uh-red font-medium transition-colors">
              Store
            </Link>
            <Link href="/events" className="text-uh-black hover:text-uh-red font-medium transition-colors">
              Events
            </Link>
          </nav>

          {/* Search and Auth */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block relative">
              <Input 
                type="search" 
                placeholder="Search forums..." 
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uh-red focus:border-transparent"
              />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            </div>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                  {user?.profileImageUrl && (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-uh-black font-medium">
                    {user?.firstName || user?.username || 'User'}
                  </span>
                </div>
                <Button
                  onClick={() => window.location.href = "/api/logout"}
                  variant="outline"
                  className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white"
                >
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  variant="ghost"
                  className="text-uh-red hover:text-uh-black font-medium"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-uh-red text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button 
              className="md:hidden text-uh-black"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-uh-black hover:text-uh-red font-medium">
                Home
              </Link>
              <Link href="/forums" className="text-uh-black hover:text-uh-red font-medium">
                Forums
              </Link>
              <Link href="/news" className="text-uh-black hover:text-uh-red font-medium">
                News
              </Link>
              <Link href="/store" className="text-uh-black hover:text-uh-red font-medium">
                Store
              </Link>
              <Link href="/events" className="text-uh-black hover:text-uh-red font-medium">
                Events
              </Link>
              <div className="pt-4 border-t border-gray-200">
                <Input 
                  type="search" 
                  placeholder="Search forums..." 
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
