import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertNewsArticleSchema } from "@shared/schema";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const createArticleSchema = insertNewsArticleSchema.extend({
  category: z.string().default("general"),
});

type CreateArticleFormData = z.infer<typeof createArticleSchema>;

export default function NewsAdmin() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check if user has admin privileges (simplified check)
  const isAdmin = user?.email?.includes("admin") || user?.id === "46031129";

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["/api/news"],
    enabled: isAuthenticated && isAdmin,
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: CreateArticleFormData) =>
      apiRequest("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Article created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive",
      });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/news/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
    },
  });

  const form = useForm<CreateArticleFormData>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      category: "general",
    },
  });

  const onSubmit = (data: CreateArticleFormData) => {
    createArticleMutation.mutate({
      ...data,
      authorId: user?.id || "",
      slug: data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
    });
  };

  // Filter articles based on selected filters
  const filteredArticles = Array.isArray(articles) ? articles.filter((article: any) => {
    const categoryMatch = selectedCategory === "all" || article.category === selectedCategory;
    return categoryMatch;
  }) : [];

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      sports: "bg-green-500",
      academics: "bg-blue-500",
      campus: "bg-purple-500",
      alumni: "bg-yellow-500",
      general: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-uh-black mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the admin panel.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-uh-black mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-uh-black mb-2">News Administration</h1>
              <p className="text-gray-600">Manage news articles and content for CoogsNation</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-uh-red hover:bg-red-700">
                  <i className="fas fa-plus mr-2"></i>
                  Create Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Article</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter article title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="excerpt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Excerpt</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief summary of the article..."
                              className="resize-none"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Write your article content here..."
                              className="min-h-[200px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sports">Sports</SelectItem>
                              <SelectItem value="academics">Academics</SelectItem>
                              <SelectItem value="campus">Campus Life</SelectItem>
                              <SelectItem value="alumni">Alumni</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createArticleMutation.isPending}
                        className="bg-uh-red hover:bg-red-700"
                      >
                        {createArticleMutation.isPending ? "Creating..." : "Create Article"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-newspaper text-3xl text-uh-red"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">{filteredArticles.length}</h3>
              <p className="text-gray-600">Total Articles</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-eye text-3xl text-green-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">
                {filteredArticles.filter((a: any) => a.isPublished).length}
              </h3>
              <p className="text-gray-600">Published</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-edit text-3xl text-yellow-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">
                {filteredArticles.filter((a: any) => !a.isPublished).length}
              </h3>
              <p className="text-gray-600">Drafts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-2">
                <i className="fas fa-chart-line text-3xl text-purple-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-uh-black">
                {filteredArticles.reduce((sum: number, a: any) => sum + (a.viewCount || 0), 0)}
              </h3>
              <p className="text-gray-600">Total Views</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="academics">Academics</SelectItem>
                    <SelectItem value="campus">Campus Life</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        <Card>
          <CardHeader>
            <CardTitle>Articles Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-newspaper text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600">Create your first article to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article: any) => (
                  <div
                    key={article.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-uh-black truncate">
                            {article.title}
                          </h3>
                          <Badge className={`${getCategoryColor(article.category)} text-white`}>
                            {article.category}
                          </Badge>
                          <Badge className={`${article.isPublished ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                            {article.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {article.excerpt || article.content?.substring(0, 150) + "..."}
                        </p>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span>By {article.authorId}</span>
                          <span>
                            {formatDistance(new Date(article.createdAt || new Date()), new Date(), { addSuffix: true })}
                          </span>
                          <span>{article.viewCount || 0} views</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this article?")) {
                              deleteArticleMutation.mutate(article.id);
                            }
                          }}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}