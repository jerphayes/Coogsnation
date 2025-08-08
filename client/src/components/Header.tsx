import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import uhSeal from "@assets/1200px-University_of_Houston_seal.svg_1754451467648.png";

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
              {/* University of Houston Seal */}
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src={uhSeal} 
                  alt="University of Houston Official Seal"
                  className="w-12 h-12 object-contain"
                />
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
            
            {/* Community Dropdown */}
            <div className="relative group">
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Community
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60] max-h-96 overflow-y-auto">
                
                {/* Heartbeats Section */}
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 bg-red-50">
                    <div className="text-sm font-semibold text-uh-red flex items-center">
                      <i className="fas fa-heart mr-2"></i>
                      HEARTBEATS
                    </div>
                  </div>
                  <Link href="/forums/categories/24" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    Dating & Relationships
                  </Link>
                  <Link href="/forums/categories/24" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    Meetups & Social Events
                  </Link>
                  <Link href="/forums/categories/24" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    Relationship Advice
                  </Link>
                </div>

                {/* Water Cooler Talk Section */}
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 bg-gray-50">
                    <div className="text-sm font-semibold text-gray-700 flex items-center">
                      <i className="fas fa-coffee mr-2"></i>
                      WATER COOLER TALK
                    </div>
                  </div>
                  <Link href="/forums/categories/23" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    General Discussion
                  </Link>
                  <Link href="/forums/categories/23" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    Random Thoughts
                  </Link>
                  <Link href="/forums/categories/23" className="block px-6 py-2 text-sm text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                    Off-Topic
                  </Link>
                </div>

                {/* Resources Section */}
                <div>
                  <div className="px-4 py-2 bg-purple-50">
                    <div className="text-sm font-semibold text-purple-700 flex items-center">
                      <i className="fas fa-toolbox mr-2"></i>
                      RESOURCES
                    </div>
                  </div>
                  
                  {/* Life Happens Subsection */}
                  <div className="bg-blue-25">
                    <div className="px-6 py-1 bg-blue-100">
                      <div className="text-xs font-semibold text-blue-700 flex items-center">
                        <i className="fas fa-wallet mr-2"></i>
                        Life Happens
                      </div>
                    </div>
                    <Link href="/life-happens" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Utility Payments (Electric, Gas, Water)
                    </Link>
                    <Link href="/life-happens" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Emergency Bill Assistance
                    </Link>
                    <Link href="/life-happens" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Payment Centers & Cash Options
                    </Link>
                    <Link href="/life-happens" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Financial Emergency Resources
                    </Link>
                  </div>
                  
                  {/* Life Solutions Subsection */}
                  <div className="bg-green-25">
                    <div className="px-6 py-1 bg-green-100">
                      <div className="text-xs font-semibold text-green-700 flex items-center">
                        <i className="fas fa-tools mr-2"></i>
                        Life Solutions
                      </div>
                    </div>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Housing & Apartments
                    </Link>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Transportation & METRO
                    </Link>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Healthcare & Medical Resources
                    </Link>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Career & Professional Development
                    </Link>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Legal & Safety Resources
                    </Link>
                    <Link href="/life-solutions" className="block px-8 py-1 text-xs text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                      Emergency Contacts & Crisis Support
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            {user && (
              <>
                <Link href="/dashboard" className="text-uh-black hover:text-uh-red font-medium transition-colors">
                  Dashboard
                </Link>
                <Link href="/cart" className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                  <i className="fas fa-shopping-cart mr-1"></i>Cart
                </Link>
              </>
            )}
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
                  {(user as any)?.profileImageUrl && (
                    <img 
                      src={(user as any).profileImageUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-uh-black font-medium">
                    {(user as any)?.firstName || (user as any)?.username || 'User'}
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
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Community</div>
                <Link href="/forums/categories/24" className="text-uh-black hover:text-uh-red font-medium block mb-2">
                  Heartbeats (Dating)
                </Link>
                <Link href="/forums/categories/23" className="text-uh-black hover:text-uh-red font-medium block mb-2">
                  Water Cooler Talk
                </Link>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 mt-3">Resources</div>
                <Link href="/life-happens" className="text-uh-black hover:text-uh-red font-medium block mb-2">
                  Life Happens
                </Link>
                <Link href="/life-solutions" className="text-uh-black hover:text-uh-red font-medium block">
                  Life Solutions
                </Link>
              </div>
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
