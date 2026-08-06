import { useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { ForumCategory, ForumTopic, ForumPost } from "@shared/schema";
import { z } from "zod";
import { forumCategoryPath } from "@/lib/forumNavigation";

const createPostSchema = insertForumPostSchema.omit({ authorId: true });
type CreatePost = z.infer<typeof createPostSchema>;

export default function ForumTopicPage() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const numericTopicId = /^\d+$/.test(topicId) ? Number(topicId) : 0;
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const replySectionRef = useRef<HTMLDivElement | null>(null);
  const [reportPost, setReportPost] = useState<ForumPost | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");

  const topicUrl = `/api/forums/topics/${numericTopicId}`;
  const postsUrl = `/api/forums/topics/${numericTopicId}/posts`;

  const {
    data: topic,
    isLoading: topicLoading,
    error: topicError,
  } = useQuery<ForumTopic>({
    queryKey: [topicUrl],
    enabled: numericTopicId > 0,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<ForumPost[]>({
    queryKey: [postsUrl],
    enabled: numericTopicId > 0 && Boolean(topic),
  });

  const { data: categories = [] } = useQuery<ForumCategory[]>({
    queryKey: ["/api/forums/categories"],
  });
  const category = topic ? categories.find((item) => item.id === topic.categoryId) : undefined;

  const form = useForm<CreatePost>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "", topicId: numericTopicId },
  });

  const createPostMutation = useMutation({
    mutationFn: (data: CreatePost) => apiRequest("POST", "/api/forums/posts", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [postsUrl] });
      void queryClient.invalidateQueries({ queryKey: [topicUrl] });
      void queryClient.invalidateQueries({ queryKey: ["/api/forums/recent?limit=6"] });
      form.reset({ content: "", topicId: numericTopicId });
      toast({ title: "Reply posted successfully" });
    },
    onError: () => toast({ title: "Failed to post reply", variant: "destructive" }),
  });

  const reportMutation = useMutation({
    mutationFn: (postId: number) =>
      apiRequest("POST", `/api/forums/posts/${postId}/report`, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      }),
    onSuccess: () => {
      setReportPost(null);
      setReportReason("spam");
      setReportDetails("");
      toast({ title: "Report submitted for moderator review" });
    },
    onError: () => toast({ title: "Failed to submit report", variant: "destructive" }),
  });

  const replyToPost = (post: ForumPost) => {
    if (!isAuthenticated) {
      toast({ title: "Log in to reply", variant: "destructive" });
      return;
    }
    form.setValue("content", `@${post.authorId} `, { shouldDirty: true });
    replySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openReport = (post: ForumPost) => {
    if (!isAuthenticated) {
      toast({ title: "Log in to report a post", variant: "destructive" });
      return;
    }
    setReportPost(post);
  };

  if (numericTopicId < 1 || (!topicLoading && (topicError || !topic))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Card><CardContent className="p-10">
            <h1 className="text-2xl font-bold">Topic not found</h1>
            <p className="mt-3 text-gray-600">This discussion does not exist or is no longer available.</p>
            <Link href="/forums"><Button className="mt-6 bg-uh-red hover:bg-red-700">Return to Standard Board</Button></Link>
          </CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {topicLoading || !topic ? (
          <Card className="animate-pulse"><CardContent className="h-40 p-8" /></Card>
        ) : (
          <>
            <nav className="mb-6 flex flex-wrap text-sm text-gray-600" aria-label="Breadcrumb">
              <Link href="/forums" className="hover:text-uh-red">Forums</Link>
              <span className="mx-2">/</span>
              {category ? (
                <Link href={forumCategoryPath(category.slug)} className="hover:text-uh-red">{category.name}</Link>
              ) : (
                <span>Category</span>
              )}
              <span className="mx-2">/</span>
              <span className="font-medium text-uh-black">{topic.title}</span>
            </nav>

            <Card className="mb-6 border-uh-red border-2">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">{topic.title}</CardTitle>
                  {topic.isPinned && <Badge variant="secondary">Pinned</Badge>}
                  {topic.isLocked && <Badge variant="outline">Locked</Badge>}
                </div>
                <p className="text-sm text-gray-500">
                  Started by {topic.authorId} · {topic.createdAt ? formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true }) : "Unknown date"}
                </p>
              </CardHeader>
              <CardContent>
                <RichContentRenderer content={topic.content} className="prose max-w-none text-gray-800" />
              </CardContent>
            </Card>

            <section className="space-y-5" aria-label="Topic replies">
              {postsLoading ? (
                [1, 2, 3].map((item) => <Card key={item} className="h-36 animate-pulse bg-gray-100" />)
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="shrink-0 text-center">
                          <Avatar className="h-12 w-12"><AvatarFallback className="bg-uh-red text-white">{(post.authorId || "C").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                          <p className="mt-2 max-w-20 truncate text-xs text-gray-500">{post.authorId}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <p className="text-sm text-gray-500">
                              {post.createdAt ? formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true }) : "Unknown date"}
                            </p>
                            <div className="flex gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => replyToPost(post)}>Reply</Button>
                              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => openReport(post)}>Report</Button>
                            </div>
                          </div>
                          <RichContentRenderer content={post.content} className="prose prose-sm max-w-none text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card><CardContent className="p-10 text-center text-gray-600">No replies yet.</CardContent></Card>
              )}
            </section>

            <div ref={replySectionRef} id="forum-reply-editor" className="scroll-mt-24">
              {isAuthenticated && !topic.isLocked ? (
                <Card className="mt-8">
                  <CardHeader><CardTitle>Post a Reply</CardTitle></CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createPostMutation.mutate({ ...data, topicId: numericTopicId }))} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Reply</FormLabel>
                              <FormControl><RichTextEditor value={field.value} onChange={field.onChange} placeholder="Share your thoughts…" className="min-h-[150px]" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => form.reset({ content: "", topicId: numericTopicId })}>Clear</Button>
                          <Button type="submit" className="bg-uh-red hover:bg-red-700" disabled={createPostMutation.isPending}>
                            {createPostMutation.isPending ? "Posting…" : "Post Reply"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              ) : topic.isLocked ? (
                <Card className="mt-8"><CardContent className="p-8 text-center text-gray-600">This topic is locked and no longer accepts replies.</CardContent></Card>
              ) : (
                <Card className="mt-8">
                  <CardContent className="p-8 text-center">
                    <h2 className="text-xl font-bold">Join the discussion</h2>
                    <p className="mt-2 text-gray-600">Log in or create an account to reply.</p>
                    <div className="mt-5 flex justify-center gap-3">
                      <Link href="/join"><Button className="bg-uh-red hover:bg-red-700">Sign Up</Button></Link>
                      <Link href="/login"><Button variant="outline">Log In</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-8">
              <Link href={category ? forumCategoryPath(category.slug) : "/forums"}>
                <Button variant="outline">← Back to {category?.name || "Forums"}</Button>
              </Link>
            </div>
          </>
        )}
      </main>

      <Dialog open={Boolean(reportPost)} onOpenChange={(open) => !open && setReportPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report forum post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger id="report-reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="hate">Hateful content</SelectItem>
                  <SelectItem value="misinformation">Misleading information</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">Additional details</Label>
              <Textarea id="report-details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} />
            </div>
            <Button
              type="button"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={!reportPost || reportMutation.isPending}
              onClick={() => reportPost && reportMutation.mutate(reportPost.id)}
            >
              {reportMutation.isPending ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
