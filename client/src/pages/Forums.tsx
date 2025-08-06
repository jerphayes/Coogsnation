import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const { data: forumCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/forums/categories"],
  });

  const getCategoryIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      'Football': 'football-ball',
      'Basketball': 'basketball-ball',
      'Baseball': 'baseball-ball',
      'Track & Field': 'running',
      'Golf': 'golf-ball',
      'Water Cooler Talk': 'coffee',
      'Heartbeats': 'heart',
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
      'Water Cooler Talk': 'bg-blue-600',
      'Heartbeats': 'bg-pink-500',
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
      'Water Cooler Talk': 'General discussions, off-topic conversations, and community chat',
      'Heartbeats': 'Dating, relationships, and connections within the Coogs community',
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
  const sportsCategories = filteredCategories.filter(cat => 
    ['Football', 'Basketball', 'Baseball', 'Track & Field', 'Golf'].includes(cat.name)
  );
  
  const communityCategories = filteredCategories.filter(cat => 
    ['Water Cooler Talk', 'Heartbeats', 'UH Hall of Fame'].includes(cat.name)
  );
  
  const academicCategories = filteredCategories.filter(cat => 
    ['Academic Discussion', 'Student Life'].includes(cat.name)
  );

  const otherCategories = filteredCategories.filter(cat => 
    ![...sportsCategories, ...communityCategories, ...academicCategories].includes(cat)
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
          
          <TabsContent value="sports" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Houston Cougar Sports</h2>
              <p className="text-gray-600">Discuss all UH athletics and follow your favorite teams</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sportsCategories.map((category) => (
                <Link key={category.id} href={`/forums/categories/${category.id}`}>
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
          
          <TabsContent value="community" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Community Connection</h2>
              <p className="text-gray-600">Connect with fellow Coogs and celebrate our community</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityCategories.map((category) => (
                <Link key={category.id} href={`/forums/categories/${category.id}`}>
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
                          {category.name === "Heartbeats" && (
                            <Badge className="mt-2 bg-pink-100 text-pink-800">
                              <i className="fas fa-heart mr-1"></i>
                              Special Community
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="academic" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">Academic & Student Life</h2>
              <p className="text-gray-600">Academic support, campus life, and student resources</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {academicCategories.map((category) => (
                <Link key={category.id} href={`/forums/categories/${category.id}`}>
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
          
          <TabsContent value="all" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-uh-black mb-2">All Forum Categories</h2>
              <p className="text-gray-600">Browse all available discussion forums</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <Link key={category.id} href={`/forums/categories/${category.id}`}>
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
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Avatar>
                    <AvatarFallback className="bg-uh-red text-white">
                      U{i}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">User{i}</span> posted in{" "}
                      <Link href="/forums/categories/1" className="text-uh-red hover:underline">
                        Football Discussion
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistance(new Date(Date.now() - i * 1000 * 60 * 15), new Date(), { addSuffix: true })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-uh-red">
                    View
                  </Button>
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
                <Link href="/api/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <i className="fas fa-sign-in-alt mr-2"></i>
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