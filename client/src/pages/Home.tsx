import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CommunityStats } from "@/components/CommunityStats";
import { ActiveMembers } from "@/components/ActiveMembers";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { MerchandisePreview } from "@/components/MerchandisePreview";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data: newsArticles, isLoading: newsLoading } = useQuery({
    queryKey: ["/api/news"],
  });

  const { data: forumCategories, isLoading: forumsLoading } = useQuery({
    queryKey: ["/api/forums/categories"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-uh-red to-red-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-black mb-2 transform -rotate-1 inline-block">WHOSE HOUSE?</h1>
          <h2 className="text-4xl font-black mb-4 transform rotate-1 inline-block">COOGS' HOUSE!</h2>
          <p className="text-lg opacity-90">Welcome back to the premier University of Houston community</p>
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
                <a href="/news" className="text-uh-red hover:text-uh-black font-medium">View All</a>
              </div>
              
              {newsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="w-24 h-16 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : newsArticles && newsArticles.length > 0 ? (
                <div className="space-y-6">
                  {newsArticles.slice(0, 5).map((article: any) => (
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
                        {article.excerpt && (
                          <p className="text-sm text-gray-600 mt-1">{article.excerpt}</p>
                        )}
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <span><i className="fas fa-eye mr-1"></i>{article.viewCount || 0}</span>
                          <span><i className="fas fa-comment mr-1"></i>{article.commentCount || 0}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-newspaper text-4xl mb-4"></i>
                  <p>No news articles available yet</p>
                </div>
              )}
            </Card>

            {/* Community Forums */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-uh-black flex items-center">
                  <i className="fas fa-comments text-uh-red mr-3"></i>
                  Community Forums
                </h2>
                <a href="/forums" className="text-uh-red hover:text-uh-black font-medium">View All Forums</a>
              </div>

              {forumsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : forumCategories && forumCategories.length > 0 ? (
                <div className="space-y-4">
                  {forumCategories.slice(0, 6).map((category: any) => (
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-comments text-4xl mb-4"></i>
                  <p>No forum categories available</p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CommunityStats />
            <ActiveMembers />
            <UpcomingEvents />
            <MerchandisePreview />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
