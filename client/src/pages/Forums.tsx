import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export default function Forums() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: forumCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/forums/categories"],
  });

  const { data: forumTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ["/api/forums/categories", selectedCategory, "topics"],
    enabled: !!selectedCategory,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black mb-2">Community Forums</h1>
          <p className="text-gray-600">Join the conversation with fellow Coogs</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-lg font-bold text-uh-black mb-4">Categories</h2>
              
              {categoriesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : forumCategories && forumCategories.length > 0 ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === null 
                        ? 'bg-uh-red text-white' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    All Categories
                  </button>
                  {forumCategories.map((category: any) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id 
                          ? 'bg-uh-red text-white' 
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <i className={`${category.icon || 'fas fa-comments'} text-sm`}></i>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No categories available</p>
                </div>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCategory === null ? (
              /* All Categories View */
              <div className="space-y-6">
                {forumCategories && forumCategories.map((category: any) => (
                  <Card key={category.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 ${category.color || 'bg-uh-red'} rounded-full flex items-center justify-center`}>
                          <i className={`${category.icon || 'fas fa-comments'} text-white`}></i>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-uh-black">{category.name}</h3>
                          <p className="text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedCategory(category.id)}
                        variant="outline"
                        className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white"
                      >
                        View Topics
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              /* Selected Category Topics */
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={() => setSelectedCategory(null)}
                      variant="ghost"
                      className="text-uh-red hover:text-uh-black"
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Back to Categories
                    </Button>
                  </div>
                  {isAuthenticated && (
                    <Button className="bg-uh-red hover:bg-red-700 text-white">
                      <i className="fas fa-plus mr-2"></i>
                      New Topic
                    </Button>
                  )}
                </div>

                {topicsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="animate-pulse border-b border-gray-200 pb-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : forumTopics && forumTopics.length > 0 ? (
                  <div className="space-y-4">
                    {forumTopics.map((topic: any) => (
                      <div key={topic.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {topic.isPinned && (
                                <i className="fas fa-thumbtack text-uh-red text-sm"></i>
                              )}
                              {topic.isLocked && (
                                <i className="fas fa-lock text-gray-500 text-sm"></i>
                              )}
                              <h4 className="font-semibold text-uh-black hover:text-uh-red cursor-pointer">
                                {topic.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              by {topic.authorId} • {new Date(topic.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div className="flex items-center space-x-4">
                              <span><i className="fas fa-eye mr-1"></i>{topic.viewCount || 0}</span>
                              <span><i className="fas fa-comment mr-1"></i>{topic.replyCount || 0}</span>
                            </div>
                            {topic.lastReplyAt && (
                              <div className="text-xs mt-1">
                                Last: {new Date(topic.lastReplyAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-comments text-4xl mb-4"></i>
                    <p>No topics in this category yet</p>
                    {isAuthenticated && (
                      <Button className="bg-uh-red hover:bg-red-700 text-white mt-4">
                        Be the first to post!
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
