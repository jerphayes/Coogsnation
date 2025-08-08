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
            <div className="relative group"
                 onMouseEnter={(e) => {
                   console.log('Forums hover enter');
                   const dropdown = e.currentTarget.querySelector('.forums-header-dropdown') as HTMLElement;
                   console.log('Forums dropdown found:', dropdown);
                   if (dropdown) {
                     dropdown.style.opacity = '1';
                     dropdown.style.visibility = 'visible';
                     console.log('Forums dropdown shown');
                   }
                 }}
                 onMouseLeave={(e) => {
                   console.log('Forums hover leave');
                   const dropdown = e.currentTarget.querySelector('.forums-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '0';
                     dropdown.style.visibility = 'hidden';
                   }
                 }}>
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Forums
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              <div className="forums-header-dropdown absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible transition-all duration-200 z-50 max-h-96 overflow-y-auto">
                <Link href="/forums/categories/1" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-football-ball mr-2"></i>
                  Football
                  <div className="text-xs text-gray-500 mt-1">Houston Cougar Football discussions</div>
                </Link>
                <Link href="/forums/categories/2" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-basketball-ball mr-2"></i>
                  Basketball
                  <div className="text-xs text-gray-500 mt-1">UH Basketball - Men's and Women's teams</div>
                </Link>
                <Link href="/forums/categories/18" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-baseball-ball mr-2"></i>
                  Baseball
                  <div className="text-xs text-gray-500 mt-1">Houston Cougar Baseball discussion</div>
                </Link>
                <Link href="/forums/categories/19" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-running mr-2"></i>
                  Track & Field
                  <div className="text-xs text-gray-500 mt-1">Houston Cougar Track & Field athletics</div>
                </Link>
                <Link href="/forums/categories/20" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-golf-ball mr-2"></i>
                  Golf
                  <div className="text-xs text-gray-500 mt-1">Houston Cougar Golf team discussions</div>
                </Link>
                <Link href="/forums/categories/45" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-female mr-2"></i>
                  Women's Sports
                  <div className="text-xs text-gray-500 mt-1">All Houston Cougar women's athletics</div>
                </Link>
                <Link href="/forums/categories/21" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-trophy mr-2"></i>
                  Other Sports
                  <div className="text-xs text-gray-500 mt-1">All other Houston Cougar athletics</div>
                </Link>
                <Link href="/forums/categories/4" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-user-plus mr-2"></i>
                  Recruiting
                  <div className="text-xs text-gray-500 mt-1">Latest recruiting news and commitments</div>
                </Link>
                <Link href="/forums/categories/5" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-university mr-2"></i>
                  Cougar Corner
                  <div className="text-xs text-gray-500 mt-1">General UH discussion and campus life</div>
                </Link>
                <Link href="/forums/categories/6" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-globe mr-2"></i>
                  Politics & Current Events
                  <div className="text-xs text-gray-500 mt-1">Political discussions and current events</div>
                </Link>
                <Link href="/forums/categories/7" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-briefcase mr-2"></i>
                  Business & Finance
                  <div className="text-xs text-gray-500 mt-1">Career advice and business discussions</div>
                </Link>
                <Link href="/forums/categories/8" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-laptop mr-2"></i>
                  Technology Hub
                  <div className="text-xs text-gray-500 mt-1">Tech discussions and programming</div>
                </Link>
                <Link href="/forums/categories/9" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-film mr-2"></i>
                  Entertainment
                  <div className="text-xs text-gray-500 mt-1">Movies, TV shows, music, and pop culture</div>
                </Link>
                <Link href="/forums/categories/10" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-utensils mr-2"></i>
                  Food & Dining
                  <div className="text-xs text-gray-500 mt-1">Restaurant recommendations and food discussions</div>
                </Link>
                <Link href="/forums/categories/11" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-home mr-2"></i>
                  Real Estate
                  <div className="text-xs text-gray-500 mt-1">Houston area real estate and housing</div>
                </Link>
                <Link href="/forums/categories/12" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-tags mr-2"></i>
                  Classifieds
                  <div className="text-xs text-gray-500 mt-1">Buy, sell, and trade with fellow Coogs</div>
                </Link>
                <Link href="/forums/categories/13" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-crown mr-2"></i>
                  Premium Lounge
                  <div className="text-xs text-gray-500 mt-1">Exclusive content for premium members</div>
                </Link>
                <Link href="/forums/categories/14" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-gamepad mr-2"></i>
                  Game Day Central
                  <div className="text-xs text-gray-500 mt-1">Live game discussions and watch parties</div>
                </Link>
                <Link href="/forums/categories/15" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-graduation-cap mr-2"></i>
                  Alumni Network
                  <div className="text-xs text-gray-500 mt-1">Connect with fellow UH graduates</div>
                </Link>
                <Link href="/forums/categories/25" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-star mr-2"></i>
                  UH Hall of Fame
                  <div className="text-xs text-gray-500 mt-1">Celebrating famous UH alumni and athletes</div>
                </Link>
                <Link href="/forums/categories/46" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-handshake mr-2"></i>
                  Professional Networking
                  <div className="text-xs text-gray-500 mt-1">Job opportunities and career connections</div>
                </Link>
                <Link href="/forums" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                  <i className="fas fa-list mr-2"></i>
                  All Forums
                  <div className="text-xs text-gray-500 mt-1">Browse All Categories</div>
                </Link>
              </div>
            </div>
            
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
            
            <div className="relative group"
                 onMouseEnter={(e) => {
                   const dropdown = e.currentTarget.querySelector('.community-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '1';
                     dropdown.style.visibility = 'visible';
                   }
                 }}
                 onMouseLeave={(e) => {
                   const dropdown = e.currentTarget.querySelector('.community-header-dropdown') as HTMLElement;
                   if (dropdown) {
                     dropdown.style.opacity = '0';
                     dropdown.style.visibility = 'hidden';
                   }
                 }}>
              <button className="text-uh-black hover:text-uh-red font-medium transition-colors flex items-center">
                Community
                <i className="fas fa-chevron-down ml-1 text-xs"></i>
              </button>
              
              <div className="community-header-dropdown absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible transition-all duration-200 z-50">
                <Link href="/forums/categories/24" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-heart mr-2"></i>
                  Heartbeats
                  <div className="text-xs text-gray-500 mt-1">Dating & Relationships</div>
                </Link>
                <Link href="/forums/categories/23" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-coffee mr-2"></i>
                  Water Cooler Talk
                  <div className="text-xs text-gray-500 mt-1">General Discussions</div>
                </Link>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resources</div>
                </div>
                <Link href="/life-happens" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors border-b border-gray-100">
                  <i className="fas fa-wallet mr-2"></i>
                  Life Happens
                  <div className="text-xs text-gray-500 mt-1">Bills & Payments</div>
                </Link>
                <Link href="/life-solutions" className="block px-4 py-3 text-uh-black hover:bg-red-50 hover:text-uh-red transition-colors">
                  <i className="fas fa-tools mr-2"></i>
                  Life Solutions
                  <div className="text-xs text-gray-500 mt-1">Houston Resources & Support</div>
                </Link>
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
