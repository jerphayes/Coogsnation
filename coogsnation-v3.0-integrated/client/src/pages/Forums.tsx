import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopperDropdown } from "@/components/ui/PopperDropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { formatDistance } from "date-fns";

type CategoryType = {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

export default function Forums() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [coogsLoungeOpen, setCoogsLoungeOpen] = useState(false);
  const [otherSportsMenOpen, setOtherSportsMenOpen] = useState(false);
  const [womensSportsOpen, setWomensSportsOpen] = useState(false);

  const { data: forumCategories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["/api/forums/categories"],
  });

  const getCategoryIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      'Football': 'football-ball',
      'Basketball': 'basketball-ball',
      'Baseball': 'baseball-ball',
      'Track & Field': 'running',
      'Golf': 'golf-ball',
      'Women\'s Basketball': 'basketball-ball',
      'Women\'s Golf': 'golf-ball',
      'Women\'s Soccer': 'futbol',
      'Softball': 'baseball-ball',
      'Women\'s Tennis': 'table-tennis',
      'Women\'s Track & Field': 'running',
      'Women\'s Swimming & Diving': 'swimmer',
      'Water Cooler Talk': 'coffee',
      'Coogs Lounge': 'users',
      'Current Events': 'newspaper',
      'Science': 'flask',
      'Education': 'graduation-cap',
      'Event Announcements': 'bullhorn',
      'UH Hall of Fame': 'trophy',
      'Academic Discussion': 'graduation-cap',
      'Student Life': 'university',
    };
    return iconMap[name] || 'comments';
  };

  const getCategoryColor = (name: string) => {
    const colorMap: { [key: string]: string } = {
      'Football': 'bg-green-500',
      'Basketball': 'bg-orange-500',
      'Baseball': 'bg-blue-500',
      'Track & Field': 'bg-purple-500',
      'Golf': 'bg-green-600',
      'Women\'s Basketball': 'bg-orange-600',
      'Women\'s Golf': 'bg-emerald-500',
      'Women\'s Soccer': 'bg-cyan-500',
      'Softball': 'bg-amber-500',
      'Women\'s Tennis': 'bg-lime-500',
      'Women\'s Track & Field': 'bg-violet-500',
      'Women\'s Swimming & Diving': 'bg-teal-600',
      'Water Cooler Talk': 'bg-blue-600',
      'Coogs Lounge': 'bg-purple-500',
      'Current Events': 'bg-blue-500',
      'Science': 'bg-green-500',
      'Education': 'bg-indigo-500',
      'Event Announcements': 'bg-orange-500',
      'UH Hall of Fame': 'bg-yellow-600',
      'Academic Discussion': 'bg-indigo-500',
      'Student Life': 'bg-teal-500',
    };
    return colorMap[name] || 'bg-uh-red';
  };

  const getCategoryDescription = (name: string) => {
    const descriptions: { [key: string]: string } = {
      'Football': 'Discuss Houston Cougar football, games, players, recruiting, and strategy',
      'Basketball': 'Basketball discussions including game analysis, player stats, and team news',
      'Baseball': 'Houston Cougar baseball talk, game reviews, and season discussions',
      'Track & Field': 'Track and field events, athlete achievements, and meet results',
      'Golf': 'Golf team discussions, tournament results, and course talk',
      'Women\'s Basketball': 'Houston Cougar Women\'s Basketball team discussions and game analysis',
      'Women\'s Golf': 'Women\'s Golf team discussions, tournament results, and achievements',
      'Women\'s Soccer': 'Houston Cougar Women\'s Soccer team news, matches, and player highlights',
      'Softball': 'Houston Cougar Softball team discussions, games, and season coverage',
      'Women\'s Tennis': 'Women\'s Tennis team matches, tournaments, and player achievements',
      'Women\'s Track & Field': 'Women\'s Track & Field events, records, and athlete spotlights',
      'Women\'s Swimming & Diving': 'Swimming & Diving team meets, records, and competitions',
      'Water Cooler Talk': 'General discussions, off-topic conversations, and community chat',
      'Coogs Lounge': 'Community discussions, current events, science, education, and announcements',
      'Current Events': 'Discuss current events, news, and trending topics',
      'Science': 'Science discussions, research, and STEM topics',
      'Education': 'Educational resources, learning discussions, and academic topics',
      'Event Announcements': 'Community event announcements and upcoming activities',
      'UH Hall of Fame': 'Celebrating notable UH alumni, achievements, and university history',
      'Academic Discussion': 'Course discussions, study groups, and academic support',
      'Student Life': 'Campus events, student organizations, and university life',
    };
    return descriptions[name] || 'Forum discussions and community conversations';
  };

  // Filter categories based on search
  const filteredCategories = forumCategories ? (forumCategories as CategoryType[]).filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCategoryDescription(category.name).toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];


  // Group categories by type
  const mainSportsCategories = filteredCategories.filter(cat => 
    ['Football', 'Basketball'].includes(cat.name)
  );

  const otherSportsMenCategories = filteredCategories.filter(cat => 
    ['Baseball', 'Track & Field', 'Golf'].includes(cat.name)
  );

  const otherSportsMenParent = filteredCategories.find(cat => 
    cat.name === 'Other Sports Men'
  );

  const womensSportsCategories = filteredCategories.filter(cat => 
    ['Women\'s Basketball', 'Women\'s Golf', 'Women\'s Soccer', 'Softball', 'Women\'s Tennis', 'Women\'s Track & Field', 'Women\'s Swimming & Diving'].includes(cat.name)
  );

  const womensSportsParent = filteredCategories.find(cat => 
    cat.name === 'Women\'s Sports'
  );

  // Coogs Lounge subcategories (as static data for dropdown)
  const coogsLoungeSubcategories = [
    { id: 101, name: "Current Events", categoryId: 24 },
    { id: 102, name: "Science", categoryId: 24 },
    { id: 103, name: "Education", categoryId: 24 },
    { id: 104, name: "Event Announcements", categoryId: 24 }
  ];

  const coogsLoungeParent = filteredCategories.find(cat => 
    cat.name === 'Coogs Lounge'
  );
  
  const communityCategories = filteredCategories.filter(cat => 
    ['Water Cooler Talk', 'UH Hall of Fame', 'Recruiting'].includes(cat.name)
  );
  
  const academicCategories = filteredCategories.filter(cat => 
    ['Academic Discussion', 'Student Life'].includes(cat.name)
  );

  const otherCategories = filteredCategories.filter(cat => 
    ![...mainSportsCategories, ...otherSportsMenCategories, ...womensSportsCategories, ...communityCategories, ...academicCategories].includes(cat) &&
    cat.name !== 'Other Sports Men' && cat.name !== 'Women\'s Sports'
  );


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-uh-black mb-4">CoogsNation Forums</h1>
          <p className="text-xl text-gray-600 mb-6">
            Connect, discuss, and engage with the Houston Cougar community
          </p>
          <div className="max-w-2xl mx-auto">
            <Input
              type="search"
              placeholder="Search forums and topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-lg py-3 pl-4 pr-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-uh-red focus:border-transparent"
            />
            <i className="fas fa-search absolute right-4 top-3 text-gray-400 text-lg"></i>
          </div>
        </div>

        {/* Forum Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-comments text-3xl text-uh-red"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{filteredCategories.length}</h3>
              <p className="text-gray-600">Active Forums</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-users text-3xl text-blue-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">2,847</h3>
              <p className="text-gray-600">Members</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-file-alt text-3xl text-green-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">15,429</h3>
              <p className="text-gray-600">Topics</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-comment text-3xl text-purple-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">89,341</h3>
              <p className="text-gray-600">Posts</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Categories */}
        <Tabs defaultValue="sports" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sports">Sports</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="all">All Forums</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sports" className="mt-6" style={{overflow: 'visible'}}>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Houston Cougar Sports</h2>
              <p className="text-gray-600">Discuss all UH athletics and follow your favorite teams</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{overflow: 'visible'}}>
              {/* Main Sports Categories */}
              {mainSportsCategories.map((category) => (
                <Link key={category.id} to={`/forums/categories/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${getCategoryColor(category.name)} rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-${getCategoryIcon(category.name)} text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1">{category.name}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {getCategoryDescription(category.name)}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{0 || 0} topics</span>
                            <span>Last: {formatDistance(new Date(category.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* Other Sports Men Dropdown Category - USING AbsoluteDropdown */}
              {otherSportsMenParent && otherSportsMenCategories.length > 0 && (
                <PopperDropdown
                  open={otherSportsMenOpen}
                  onOpenChange={setOtherSportsMenOpen}
                  trigger={
                    <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" data-testid="card-other-sports-men">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center`}>
                            <i className={`fas fa-trophy text-white text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-uh-black mb-1 flex items-center">
                              {otherSportsMenParent.name}
                              <i className="fas fa-chevron-down ml-2 text-sm text-gray-400"></i>
                            </h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              All other Houston Cougar men's athletics
                            </p>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>{otherSportsMenCategories.length} categories</span>
                              <span>Hover to expand</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  {otherSportsMenCategories.map((subCategory) => (
                    <Link key={subCategory.id} to={`/forums/categories/${subCategory.id}`} className="block" data-testid={`link-sports-category-${subCategory.id}`}>
                      <div className="px-4 py-3 text-uh-black hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <i className={`fas fa-${getCategoryIcon(subCategory.name)} mr-3 text-lg`}></i>
                          <div>
                            <div className="font-medium">{subCategory.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {getCategoryDescription(subCategory.name).substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </PopperDropdown>
              )}

              {/* Women's Sports Dropdown Category - USING AbsoluteDropdown */}
              {womensSportsParent && womensSportsCategories.length > 0 && (
                <PopperDropdown
                  open={womensSportsOpen}
                  onOpenChange={setWomensSportsOpen}
                  trigger={
                    <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" data-testid="card-womens-sports">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center`}>
                            <i className={`fas fa-venus text-white text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-uh-black mb-1 flex items-center">
                              {womensSportsParent.name}
                              <i className="fas fa-chevron-down ml-2 text-sm text-gray-400"></i>
                            </h3>
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              All Houston Cougar women's athletics
                            </p>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>{womensSportsCategories.length} categories</span>
                              <span>Hover to expand</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  {womensSportsCategories.map((subCategory) => (
                    <Link key={subCategory.id} to={`/forums/categories/${subCategory.id}`} className="block" data-testid={`link-womens-category-${subCategory.id}`}>
                      <div className="px-4 py-3 text-uh-black hover:bg-pink-50 hover:text-pink-600 transition-colors border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <i className={`fas fa-${getCategoryIcon(subCategory.name)} mr-3 text-lg`}></i>
                          <div>
                            <div className="font-medium">{subCategory.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {getCategoryDescription(subCategory.name).substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </PopperDropdown>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="community" className="mt-6" style={{overflow: 'visible'}}>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Community Connection</h2>
              <p className="text-gray-600">Connect with fellow Coogs and celebrate our community</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{overflow: 'visible'}}>
              {/* Community Categories - FILL POSITIONS 1-16 (Everything to the left) */}
              {communityCategories.slice(0, 16).map((category) => (
                <Link key={category.id} to={`/forums/categories/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${getCategoryColor(category.name)} rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-${getCategoryIcon(category.name)} text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1">{category.name}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {getCategoryDescription(category.name)}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{0 || 0} topics</span>
                            <span>Last: {formatDistance(new Date(category.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {/* Coogs Lounge - USING AbsoluteDropdown */}
              <PopperDropdown
                open={coogsLoungeOpen}
                onOpenChange={setCoogsLoungeOpen}
                trigger={
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" data-testid="card-coogs-lounge">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-users text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1 flex items-center">
                            Coogs Lounge
                            <i className="fas fa-chevron-down ml-2 text-sm text-gray-400"></i>
                          </h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            Community discussions, current events, science, education, and announcements
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>4 categories</span>
                            <span>Hover to expand</span>
                          </div>
                          <Badge className="mt-2 bg-purple-100 text-purple-800">
                            <i className="fas fa-users mr-1"></i>
                            Community Hub
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                }
              >
                <Link to="/forums/categories/24" className="block" data-testid="link-current-events">
                  <div className="px-4 py-3 text-uh-black hover:bg-purple-50 hover:text-purple-600 transition-colors border-b border-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-newspaper mr-3 text-lg"></i>
                      <div>
                        <div className="font-medium">Current Events</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Discuss current events, news, and trending topics
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/forums/categories/24" className="block" data-testid="link-science">
                  <div className="px-4 py-3 text-uh-black hover:bg-purple-50 hover:text-purple-600 transition-colors border-b border-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-flask mr-3 text-lg"></i>
                      <div>
                        <div className="font-medium">Science</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Science discussions, research, and STEM topics
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/forums/categories/24" className="block" data-testid="link-education">
                  <div className="px-4 py-3 text-uh-black hover:bg-purple-50 hover:text-purple-600 transition-colors border-b border-gray-100">
                    <div className="flex items-center">
                      <i className="fas fa-graduation-cap mr-3 text-lg"></i>
                      <div>
                        <div className="font-medium">Education</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Educational resources, learning discussions, and academic topics
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link to="/forums/categories/24" className="block" data-testid="link-event-announcements">
                  <div className="px-4 py-3 text-uh-black hover:bg-purple-50 hover:text-purple-600 transition-colors">
                    <div className="flex items-center">
                      <i className="fas fa-bullhorn mr-3 text-lg"></i>
                      <div>
                        <div className="font-medium">Event Announcements</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Community event announcements and upcoming activities
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </PopperDropdown>

              {/* Remaining Community Categories - FILL AFTER COOGS LOUNGE */}
              {communityCategories.slice(16).map((category) => (
                <Link key={category.id} to={`/forums/categories/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${getCategoryColor(category.name)} rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-${getCategoryIcon(category.name)} text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1">{category.name}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {getCategoryDescription(category.name)}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{0 || 0} topics</span>
                            <span>Last: {formatDistance(new Date(category.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="academic" className="mt-6" style={{overflow: 'visible'}}>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Academic & Student Life</h2>
              <p className="text-gray-600">Academic support, campus life, and student resources</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{overflow: 'visible'}}>
              {academicCategories.map((category) => (
                <Link key={category.id} to={`/forums/categories/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${getCategoryColor(category.name)} rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-${getCategoryIcon(category.name)} text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1">{category.name}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {getCategoryDescription(category.name)}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{0 || 0} topics</span>
                            <span>Last: {formatDistance(new Date(category.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="mt-6" style={{overflow: 'visible'}}>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">All Forum Categories</h2>
              <p className="text-gray-600">Browse all available discussion forums</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{overflow: 'visible'}}>
              {filteredCategories.map((category) => (
                <Link key={category.id} to={`/forums/categories/${category.id}`}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 ${getCategoryColor(category.name)} rounded-lg flex items-center justify-center`}>
                          <i className={`fas fa-${getCategoryIcon(category.name)} text-white text-lg`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-uh-black mb-1">{category.name}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {getCategoryDescription(category.name)}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>{0 || 0} topics</span>
                            <span>Last: {formatDistance(new Date(category.createdAt || new Date()), new Date(), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-clock mr-2"></i>
              Recent Forum Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: 1, user: "User1", category: "Football Discussion", categoryId: 1 },
                { id: 2, user: "User2", category: "Basketball Discussion", categoryId: 2 },
                { id: 3, user: "User3", category: "Other Sports", categoryId: 3 },
                { id: 4, user: "User4", category: "Water Cooler Talk", categoryId: 4 },
                { id: 5, user: "User5", category: "Coogs Lounge", categoryId: 5 }
              ].map((item, i) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Avatar>
                    <AvatarFallback className="bg-uh-red text-white">
                      U{item.id}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{item.user}</span> posted in{" "}
                      <Link to={`/forums/categories/${item.categoryId}`} className="text-uh-red hover:underline">
                        {item.category}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistance(new Date(Date.now() - (i + 1) * 1000 * 60 * 15), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <Link to={`/forums/topics/${item.id}`}>
                    <Button variant="ghost" size="sm" className="text-uh-red" data-testid={`button-view-topic-${item.id}`}>
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forum Guidelines */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <i className="fas fa-info-circle mr-2"></i>
              Community Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Be Respectful</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Treat all members with dignity and respect</li>
                  <li>• No personal attacks or harassment</li>
                  <li>• Keep discussions civil and constructive</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Stay On Topic</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Post in relevant forum categories</li>
                  <li>• Use descriptive topic titles</li>
                  <li>• Search before creating duplicate topics</li>
                </ul>
              </div>
            </div>
            {!isAuthenticated && (
              <div className="mt-6 text-center">
                <Link to="/forums/categories/1">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <i className="fas fa-football-ball mr-2"></i>
                    Join the Discussion
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}