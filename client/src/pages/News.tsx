import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function News() {
  const { data: newsArticles, isLoading } = useQuery({
    queryKey: ["/api/news"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black mb-2">Latest News</h1>
          <p className="text-gray-600">Stay up to date with University of Houston athletics and campus news</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : newsArticles && newsArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsArticles.map((article: any) => (
              <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <img 
                  src={article.imageUrl || "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=400&h=250&fit=crop"} 
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className={`${
                      article.category === 'football' ? 'bg-uh-red text-white' :
                      article.category === 'basketball' ? 'bg-orange-500 text-white' :
                      article.category === 'recruiting' ? 'bg-green-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {article.category?.toUpperCase() || 'NEWS'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg text-uh-black mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  
                  {article.excerpt && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <span><i className="fas fa-eye mr-1"></i>{article.viewCount || 0}</span>
                      <span><i className="fas fa-comment mr-1"></i>{article.commentCount || 0}</span>
                    </div>
                    <span className="text-uh-red font-medium hover:text-uh-black">Read More</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <i className="fas fa-newspaper text-6xl mb-6"></i>
              <h3 className="text-xl font-semibold mb-2">No News Articles</h3>
              <p>Check back soon for the latest University of Houston news and updates!</p>
            </div>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}
