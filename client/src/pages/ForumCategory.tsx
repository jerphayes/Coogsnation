import { useState, useEffect } from "react";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichContentRenderer } from "@/components/RichContentRenderer";
import CoogpawsApp from "@/components/CoogpawsApp";

const createTopicSchema = insertForumTopicSchema.omit({ authorId: true, slug: true });

export default function ForumCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user, isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);
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

  const currentCategory = (categories as ForumCategory[])?.find((cat: ForumCategory) => cat.id === parseInt(categoryId || "1"));

  // Topics in category
  const { data: topics, isLoading } = useQuery({
    queryKey: ["/api/forums/categories", categoryId, "topics"],
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: (data: z.infer<typeof createTopicSchema>) =>
      apiRequest("POST", "/api/forums/topics", data),
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

  // Edit topic mutation
  const editTopicMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<z.infer<typeof createTopicSchema>> }) =>
      apiRequest("PATCH", `/api/forums/topics/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forums/categories", categoryId, "topics"] });
      setIsEditDialogOpen(false);
      setEditingTopic(null);
      toast({ title: "Topic updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update topic", variant: "destructive" });
    },
  });

  // Delete topic mutation
  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: number) =>
      apiRequest("DELETE", `/api/forums/topics/${topicId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forums/categories", categoryId, "topics"] });
      toast({ title: "Topic deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete topic", variant: "destructive" });
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof createTopicSchema>>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: parseInt(categoryId || "1"),
    },
  });

  const onEditSubmit = (data: z.infer<typeof createTopicSchema>) => {
    if (editingTopic) {
      editTopicMutation.mutate({ id: editingTopic.id, data });
    }
  };

  // Set edit form values when editing topic changes
  useEffect(() => {
    if (editingTopic) {
      editForm.reset({
        title: editingTopic.title,
        content: editingTopic.content || "",
        categoryId: editingTopic.categoryId,
      });
    }
  }, [editingTopic, editForm]);

  const getCategoryIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      'Football': 'football-ball',
      'Basketball': 'basketball-ball',
      'Baseball': 'baseball-ball',
      'Track & Field': 'running',
      'Golf': 'golf-ball',
      'Water Cooler Talk': 'coffee',
      'Coog Paws Chat': 'heart',
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
      'Coog Paws Chat': 'Real-time chat for meaningful connections in the Cougar community',
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
                              <RichTextEditor
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="What would you like to discuss? Use the toolbar to add images, videos, and links!"
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
            
            {/* Edit Topic Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Topic</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                    <FormField
                      control={editForm.control}
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
                      control={editForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="What would you like to discuss? Use the toolbar to add images, videos, and links!"
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
                        onClick={() => {
                          setIsEditDialogOpen(false);
                          setEditingTopic(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-uh-red hover:bg-red-700"
                        disabled={editTopicMutation.isPending}
                      >
                        {editTopicMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Update Topic
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
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
                          <div className="text-gray-600 text-sm mt-1 line-clamp-3">
                            <RichContentRenderer 
                              content={topic.content?.substring(0, 300) || ""} 
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                            <span>by {topic.authorId}</span>
                            <span>•</span>
                            <span>{topic.createdAt ? formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true }) : 'Unknown'}</span>
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
                          
                          {/* Owner actions */}
                          {user && topic.authorId === user.id && (
                            <div className="flex space-x-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingTopic(topic);
                                  setIsEditDialogOpen(true);
                                }}
                                data-testid={`button-edit-topic-${topic.id}`}
                              >
                                <i className="fas fa-edit mr-1"></i>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 px-2 text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this topic?')) {
                                    deleteTopicMutation.mutate(topic.id);
                                  }
                                }}
                                disabled={deleteTopicMutation.isPending}
                                data-testid={`button-delete-topic-${topic.id}`}
                              >
                                <i className="fas fa-trash mr-1"></i>
                                Delete
                              </Button>
                            </div>
                          )}
                          
                          {topic.lastReplyAt && (
                            <div className="text-xs text-gray-400 text-right">
                              Last reply<br />
                              {topic.lastReplyAt ? formatDistance(new Date(topic.lastReplyAt), new Date(), { addSuffix: true }) : 'Unknown'}
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
            // Show regular forum empty state for all categories
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
        {currentCategory?.name === "Coogs Lounge" && (
          <Card className="mt-8 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <i className="fas fa-users mr-2"></i>
                Coogs Lounge Community Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-purple-700">
              <ul className="space-y-2 text-sm">
                <li>• Be respectful and kind in all interactions</li>
                <li>• Keep discussions on-topic within each subcategory</li>
                <li>• Share knowledge and learn from fellow Coogs</li>
                <li>• This is for community connection and meaningful discussions</li>
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