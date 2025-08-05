import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function Landing() {
  const { data: newsArticles } = useQuery({
    queryKey: ["/api/news"],
    retry: false,
  });

  const { data: forumCategories } = useQuery({
    queryKey: ["/api/forums/categories"],
    retry: false,
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["/api/events"],
    retry: false,
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: communityStats } = useQuery({
    queryKey: ["/api/community/stats"],
    retry: false,
  });

  const { data: activeMembers } = useQuery({
    queryKey: ["/api/community/members/active"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-uh-red to-red-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-black mb-4 transform -rotate-2 inline-block">WHOSE HOUSE?</h1>
            <div className="flex justify-center mb-6">
              {/* Cougar Mascot Illustration */}
              <div className="w-32 h-24 bg-white rounded-lg flex items-center justify-center mx-4">
                <div className="w-20 h-16 bg-uh-red rounded-full relative">
                  <div className="absolute top-2 left-3 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute top-2 right-3 w-3 h-3 bg-white rounded-full"></div>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
            <h2 className="text-6xl font-black mb-6 transform rotate-2 inline-block">COOGS' HOUSE!</h2>
          </div>
          
          <h3 className="text-2xl font-semibold mb-4">Welcome to CoogsNation.com</h3>
          <p className="text-xl mb-8 opacity-90">The online community for University of Houston fans.</p>
          
          <Button 
            onClick={() => window.location.href = "/api/login"}
            className="bg-white text-uh-red px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Get Started
          </Button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Latest News */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-uh-black flex items-center">
                  <i className="fas fa-newspaper text-uh-red mr-3"></i>
                  Latest News
                </h2>
                <a href="#" className="text-uh-red hover:text-uh-black font-medium">View All</a>
              </div>
              
              <div className="space-y-6">
                {newsArticles && newsArticles.length > 0 ? (
                  newsArticles.slice(0, 4).map((article: any) => (
                    <article key={article.id} className="flex space-x-4 border-b border-gray-200 pb-4 last:border-b-0">
                      <img 
                        src={article.imageUrl || "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=150&h=100&fit=crop"} 
                        alt={article.title}
                        className="w-24 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center text-xs text-gray-600 mb-1">
                          <span className="bg-uh-red text-white px-2 py-1 rounded text-xs font-medium mr-2">
                            {article.category?.toUpperCase() || 'NEWS'}
                          </span>
                          <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-semibold text-uh-black hover:text-uh-red cursor-pointer">
                          {article.title}
                        </h4>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <span><i className="fas fa-eye mr-1"></i>{article.viewCount || 0}</span>
                          <span><i className="fas fa-comment mr-1"></i>{article.commentCount || 0}</span>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-newspaper text-4xl mb-4"></i>
                    <p>No news articles available yet. Check back soon!</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Community Forums */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-uh-black flex items-center">
                  <i className="fas fa-comments text-uh-red mr-3"></i>
                  Community Forums
                </h2>
                <a href="#" className="text-uh-red hover:text-uh-black font-medium">View All Forums</a>
              </div>

              <div className="space-y-4">
                {forumCategories && forumCategories.length > 0 ? (
                  forumCategories.slice(0, 6).map((category: any) => (
                    <div key={category.id} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 cursor-pointer rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 ${category.color || 'bg-uh-red'} rounded-full flex items-center justify-center`}>
                          <i className={`${category.icon || 'fas fa-comments'} text-white text-sm`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-uh-black">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div className="text-xs">Active Forum</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-comments text-4xl mb-4"></i>
                    <p>No forum categories available yet. Check back soon!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
                <i className="fas fa-chart-line text-uh-red mr-2"></i>
                Community Stats
              </h3>
              <div className="space-y-4">
                {communityStats ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Members</span>
                      <span className="font-bold text-uh-black">{communityStats.totalMembers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Online Now</span>
                      <span className="font-bold text-green-600">{communityStats.onlineMembers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Posts Today</span>
                      <span className="font-bold text-uh-black">{communityStats.postsToday.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">New Members</span>
                      <span className="font-bold text-blue-600">{communityStats.newMembersToday.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Loading community stats...</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Upcoming Events */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
                <i className="fas fa-calendar text-uh-red mr-2"></i>
                Upcoming Events
              </h3>
              <div className="space-y-4">
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 4).map((event: any) => (
                    <div key={event.id} className="border-l-4 border-uh-red pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-uh-black">{event.title}</h4>
                          <p className="text-sm text-gray-600">{event.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-uh-red">
                            {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(event.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <i className="fas fa-calendar text-2xl mb-2"></i>
                    <p>No upcoming events</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Merchandise Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
                <i className="fas fa-shopping-bag text-uh-red mr-2"></i>
                Cougar Store
              </h3>
              <div className="space-y-4">
                {products && products.length > 0 ? (
                  products.slice(0, 3).map((product: any) => (
                    <div key={product.id} className="flex space-x-3">
                      <img 
                        src={product.imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop"} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-uh-black">{product.name}</h4>
                        <p className="text-xs text-gray-600">{product.description}</p>
                        <p className="text-sm font-bold text-uh-red">${product.price}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <i className="fas fa-shopping-bag text-2xl mb-2"></i>
                    <p>Store coming soon!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
