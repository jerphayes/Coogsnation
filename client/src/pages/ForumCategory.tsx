import { useState } from "react";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertForumTopicSchema } from "@shared/schema";
import { formatDistance } from "date-fns";
import type { ForumTopic, ForumCategory } from "@shared/schema";
import { z } from "zod";

const createTopicSchema = insertForumTopicSchema.omit({ authorId: true, slug: true });

export default function ForumCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user, isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createTopicSchema>>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: parseInt(categoryId || "1"),
    },
  });

  // Category details
  const { data: categories } = useQuery({
    queryKey: ["/api/forums/categories"],
  });

  const currentCategory = categories?.find((cat: ForumCategory) => cat.id === parseInt(categoryId || "1"));

  // Topics in category
  const { data: topics, isLoading } = useQuery({
    queryKey: ["/api/forums/categories", categoryId, "topics"],
    queryFn: () => apiRequest(`/api/forums/categories/${categoryId}/topics`, "GET"),
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: (data: z.infer<typeof createTopicSchema>) =>
      apiRequest("/api/forums/topics", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forums/categories", categoryId, "topics"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Topic created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create topic", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof createTopicSchema>) => {
    createTopicMutation.mutate(data);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex text-sm text-gray-600">
            <Link href="/forums" className="hover:text-uh-red">Forums</Link>
            <span className="mx-2">/</span>
            <span className="text-uh-black font-medium">{currentCategory?.name}</span>
          </nav>
        </div>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-uh-red rounded-lg flex items-center justify-center">
                <i className={`fas fa-${getCategoryIcon(currentCategory?.name || "")} text-2xl text-white`}></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-uh-black">{currentCategory?.name}</h1>
                <p className="text-gray-600 mt-1">
                  {getCategoryDescription(currentCategory?.name || "")}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{(topics as ForumTopic[])?.length || 0} topics</span>
                  <span>•</span>
                  <span>Last updated {formatDistance(new Date(currentCategory?.updatedAt || new Date()), new Date(), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            
            {isAuthenticated && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-uh-red hover:bg-red-700">
                    <i className="fas fa-plus mr-2"></i>
                    New Topic
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Topic in {currentCategory?.name}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Topic Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter a descriptive title for your topic" 
                                {...field} 
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
                                placeholder="What would you like to discuss?" 
                                className="min-h-[200px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          className="bg-uh-red hover:bg-red-700"
                          disabled={createTopicMutation.isPending}
                        >
                          {createTopicMutation.isPending ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Creating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane mr-2"></i>
                              Create Topic
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : topics && (topics as ForumTopic[]).length > 0 ? (
            (topics as ForumTopic[]).map((topic) => (
              <Card key={topic.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <Avatar>
                      <AvatarFallback className="bg-uh-red text-white">
                        {(topic.authorId || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link href={`/forums/topics/${topic.id}`}>
                            <h3 className="text-lg font-semibold text-uh-black hover:text-uh-red transition-colors cursor-pointer">
                              {topic.title}
                            </h3>
                          </Link>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {topic.content?.substring(0, 200)}...
                          </p>
                          
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                            <span>by {topic.authorId}</span>
                            <span>•</span>
                            <span>{formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true })}</span>
                            {topic.isPinned && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  <i className="fas fa-thumbtack mr-1"></i>
                                  Pinned
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <div className="text-sm text-gray-500 text-right">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-comments"></i>
                              <span>{topic.replyCount || 0} replies</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <i className="fas fa-eye"></i>
                              <span>{topic.viewCount || 0} views</span>
                            </div>
                          </div>
                          
                          {topic.lastReplyAt && (
                            <div className="text-xs text-gray-400 text-right">
                              Last reply<br />
                              {formatDistance(new Date(topic.lastReplyAt), new Date(), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mb-4">
                  <i className={`fas fa-${getCategoryIcon(currentCategory?.name || "")} text-4xl text-gray-400`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No topics yet</h3>
                <p className="text-gray-600 mb-6">
                  Be the first to start a discussion in {currentCategory?.name}!
                </p>
                {isAuthenticated ? (
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-uh-red hover:bg-red-700"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Create First Topic
                  </Button>
                ) : (
                  <div className="text-gray-500">
                    <Link href="/api/login" className="text-uh-red hover:underline">
                      Log in
                    </Link> to start a topic
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category Guidelines */}
        {currentCategory?.name === "Heartbeats" && (
          <Card className="mt-8 border-pink-200 bg-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center text-pink-800">
                <i className="fas fa-heart mr-2"></i>
                Heartbeats Community Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-pink-700">
              <ul className="space-y-2 text-sm">
                <li>• Be respectful and kind in all interactions</li>
                <li>• No inappropriate content or harassment</li>
                <li>• Keep personal information private</li>
                <li>• This is for genuine connections within the UH community</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {currentCategory?.name === "Water Cooler Talk" && (
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <i className="fas fa-coffee mr-2"></i>
                Water Cooler Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li>• Keep discussions civil and respectful</li>
                <li>• Off-topic conversations are welcome here</li>
                <li>• No spam or excessive self-promotion</li>
                <li>• Have fun and engage with the community!</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
}