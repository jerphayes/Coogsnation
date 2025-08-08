import { useState, type ReactNode } from "react";
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
            
            <div className="relative group"
                 onMouseEnter={(e) => {
                   const dropdown = e.currentTarget.querySelector('.sports-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '1';
                     dropdown.style.visibility = 'visible';
                   }
                 }}
                 onMouseLeave={(e) => {
                   const dropdown = e.currentTarget.querySelector('.sports-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '0';
                     dropdown.style.visibility = 'hidden';
                   }
                 }}>
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Sports News
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              <div className="sports-header-dropdown absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible transition-all duration-200 z-50">
                <Link href="/news?category=football" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-football-ball mr-2"></i>
                  Football News
                  <div className="text-xs text-gray-500 mt-1">Latest Cougar Football Updates</div>
                </Link>
                <Link href="/news?category=basketball" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-basketball-ball mr-2"></i>
                  Basketball News
                  <div className="text-xs text-gray-500 mt-1">Men's & Women's Basketball</div>
                </Link>
                <Link href="/news?category=big12" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-trophy mr-2"></i>
                  Big 12 News
                  <div className="text-xs text-gray-500 mt-1">Conference Updates</div>
                </Link>
                <Link href="/news" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                  <i className="fas fa-newspaper mr-2"></i>
                  All News
                  <div className="text-xs text-gray-500 mt-1">Browse All Articles</div>
                </Link>
              </div>
            </div>
            <div className="relative group"
                 onMouseEnter={(e) => {
                   const dropdown = e.currentTarget.querySelector('.store-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '1';
                     dropdown.style.visibility = 'visible';
                   }
                 }}
                 onMouseLeave={(e) => {
                   const dropdown = e.currentTarget.querySelector('.store-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '0';
                     dropdown.style.visibility = 'hidden';
                   }
                 }}>
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Store
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              <div className="store-header-dropdown absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible transition-all duration-200 z-50">
                <Link href="/store?category=apparel" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-tshirt mr-2"></i>
                  Apparel
                  <div className="text-xs text-gray-500 mt-1">T-shirts, Hoodies & More</div>
                </Link>
                <Link href="/store?category=accessories" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-hat-cowboy mr-2"></i>
                  Accessories
                  <div className="text-xs text-gray-500 mt-1">Hats, Bags & Gear</div>
                </Link>
                <Link href="/store" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                  <i className="fas fa-shopping-bag mr-2"></i>
                  All Products
                  <div className="text-xs text-gray-500 mt-1">Browse Full Store</div>
                </Link>
              </div>
            </div>
            
            <div className="relative group"
                 onMouseEnter={(e) => {
                   const dropdown = e.currentTarget.querySelector('.events-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '1';
                     dropdown.style.visibility = 'visible';
                   }
                 }}
                 onMouseLeave={(e) => {
                   const dropdown = e.currentTarget.querySelector('.events-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '0';
                     dropdown.style.visibility = 'hidden';
                   }
                 }}>
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Events
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              <div className="events-header-dropdown absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible transition-all duration-200 z-50">
                <Link href="/events?category=games" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Game Schedule
                  <div className="text-xs text-gray-500 mt-1">Upcoming Cougar Games</div>
                </Link>
                <Link href="/events?category=social" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-users mr-2"></i>
                  Social Events
                  <div className="text-xs text-gray-500 mt-1">Fan Meetups & Activities</div>
                </Link>
                <Link href="/events" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                  <i className="fas fa-calendar mr-2"></i>
                  All Events
                  <div className="text-xs text-gray-500 mt-1">Browse Full Calendar</div>
                </Link>
              </div>
            </div>
            

            {isAuthenticated && (
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
