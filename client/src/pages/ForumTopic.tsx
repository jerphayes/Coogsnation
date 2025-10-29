import { useState } from "react";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertForumPostSchema } from "@shared/schema";
import { formatDistance } from "date-fns";
import { RichContentRenderer } from "@/components/RichContentRenderer";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CompactAchievementBadge } from "@/components/ui/AchievementBadge";
import type { ForumTopic, ForumPost } from "@shared/schema";
import { z } from "zod";

const createPostSchema = insertForumPostSchema.omit({ authorId: true });

export default function ForumTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Check for localStorage demo auth
  const hasLocalAuth = typeof window !== 'undefined' && localStorage.getItem('currentUser');
  const canPost = isAuthenticated || hasLocalAuth;

  const form = useForm<z.infer<typeof createPostSchema>>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
      topicId: parseInt(topicId || "1"),
    },
  });

  // Topic details
  const { data: topic, isLoading: topicLoading } = useQuery<ForumTopic>({
    queryKey: ["/api/forums/topics", topicId],
  });

  // Posts in topic
  const { data: posts, isLoading: postsLoading } = useQuery<ForumPost[]>({
    queryKey: ["/api/forums/topics", topicId, "posts"],
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: z.infer<typeof createPostSchema>) =>
      apiRequest("/api/forums/posts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forums/topics", topicId, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forums/topics", topicId] });
      form.reset();
      toast({ title: "Reply posted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to post reply", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof createPostSchema>) => {
    createPostMutation.mutate(data);
  };

  // Removed formatPostContent function - now using RichContentRenderer

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {topicLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          </div>
        ) : topic ? (
          <>
            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex text-sm text-gray-600">
                <Link href="/forums" className="hover:text-uh-red">Forums</Link>
                <span className="mx-2">/</span>
                <Link href={`/forums/categories/${topic.categoryId}`} className="hover:text-uh-red">
                  Category
                </Link>
                <span className="mx-2">/</span>
                <span className="text-uh-black font-medium">{topic.title}</span>
              </nav>
            </div>

            {/* Topic Header */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h1 className="text-2xl font-bold text-uh-black">{topic.title}</h1>
                      {topic.isPinned && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <i className="fas fa-thumbtack mr-1"></i>
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Started by {topic.authorId}</span>
                      <span>•</span>
                      <span>{topic.createdAt ? formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true }) : 'Unknown date'}</span>
                      <span>•</span>
                      <span>{topic.replyCount || 0} replies</span>
                      <span>•</span>
                      <span>{topic.viewCount || 0} views</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </>
        ) : null}

        {/* Posts */}
        <div className="space-y-6">
          {postsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post, index) => (
              <Card key={post.id} className={index === 0 ? "border-uh-red border-2" : ""}>
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-uh-red text-white">
                          {(post.authorId || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center mt-2">
                        <div className="text-xs text-gray-500 font-medium">
                          {post.authorId}
                        </div>
                        <div className="flex flex-col items-center gap-1 mt-1">
                          {/* TODO: Replace with actual user achievement level from post author data */}
                          <CompactAchievementBadge 
                            level="Bronze Star" 
                            postCount={250}
                            data-testid={`forum-post-badge-${post.id}`}
                          />
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Original Post
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500">
                          Posted {post.createdAt ? formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true }) : 'Unknown date'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-uh-red">
                            <i className="fas fa-reply mr-1"></i>
                            Reply
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">
                            <i className="fas fa-flag mr-1"></i>
                            Report
                          </Button>
                        </div>
                      </div>
                      
                      <RichContentRenderer 
                        content={post.content} 
                        className="prose prose-sm max-w-none text-gray-700"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mb-4">
                  <i className="fas fa-comments text-4xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600">Be the first to reply to this topic!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        {canPost ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-reply mr-2"></i>
                Post a Reply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Reply</FormLabel>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Share your thoughts on this topic... You can paste images, YouTube videos, and other rich content!"
                            className="min-h-[150px]"
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
                      onClick={() => form.reset()}
                    >
                      <i className="fas fa-times mr-2"></i>
                      Clear
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-uh-red hover:bg-red-700"
                      disabled={createPostMutation.isPending}
                    >
                      {createPostMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Posting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane mr-2"></i>
                          Post Reply
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-8 bg-gray-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <i className="fas fa-sign-in-alt text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Join the Discussion</h3>
              <p className="text-gray-600 mb-6">
                You need to be logged in to reply to this topic
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = "/join"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Sign Up
                </Button>
                <Button 
                  onClick={() => window.location.href = "/login"}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Log In
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Navigation */}
        <div className="mt-8 flex justify-between">
          <Link href="/forums">
            <Button variant="outline">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Forums
            </Button>
          </Link>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <i className="fas fa-chevron-left mr-1"></i>
              Previous Topic
            </Button>
            <Button variant="outline" size="sm">
              Next Topic
              <i className="fas fa-chevron-right ml-1"></i>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}