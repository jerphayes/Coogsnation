import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertForumTopicSchema } from "@shared/schema";
import { formatDistance } from "date-fns";
import type { ForumTopic, ForumCategory } from "@shared/schema";
import { z } from "zod";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichContentRenderer } from "@/components/RichContentRenderer";
import { forumCategoryPath, isVisibleForumCategory, resolveForumCategory } from "@/lib/forumNavigation";

const createTopicSchema = insertForumTopicSchema.omit({ authorId: true, slug: true });
type TopicForm = z.infer<typeof createTopicSchema>;

export default function ForumCategoryPage() {
  const params = useParams<{ categorySlug?: string; categoryId?: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ForumCategory[]>({
    queryKey: ["/api/forums/categories"],
  });

  const currentCategory = resolveForumCategory(categories, params);
  const categoryIsVisible = currentCategory ? isVisibleForumCategory(currentCategory) : false;
  const topicsUrl = currentCategory ? `/api/forums/categories/${currentCategory.id}/topics` : "/api/forums/categories/unresolved/topics";

  const { data: topics = [], isLoading: topicsLoading } = useQuery<ForumTopic[]>({
    queryKey: [topicsUrl],
    enabled: Boolean(currentCategory && categoryIsVisible),
  });

  useEffect(() => {
    if (params.categoryId && currentCategory && categoryIsVisible) {
      navigate(forumCategoryPath(currentCategory.slug), { replace: true });
    }
  }, [params.categoryId, currentCategory, categoryIsVisible, navigate]);

  const form = useForm<TopicForm>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: { title: "", content: "", categoryId: 0 },
  });

  const editForm = useForm<TopicForm>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: { title: "", content: "", categoryId: 0 },
  });

  useEffect(() => {
    if (!currentCategory) return;
    form.reset({ title: "", content: "", categoryId: currentCategory.id });
    editForm.setValue("categoryId", currentCategory.id);
  }, [currentCategory, form, editForm]);

  useEffect(() => {
    if (!editingTopic) return;
    editForm.reset({
      title: editingTopic.title,
      content: editingTopic.content || "",
      categoryId: editingTopic.categoryId,
    });
  }, [editingTopic, editForm]);

  const invalidateTopics = () => queryClient.invalidateQueries({ queryKey: [topicsUrl] });

  const createTopicMutation = useMutation({
    mutationFn: (data: TopicForm) => apiRequest("POST", "/api/forums/topics", data),
    onSuccess: () => {
      void invalidateTopics();
      setIsCreateDialogOpen(false);
      if (currentCategory) form.reset({ title: "", content: "", categoryId: currentCategory.id });
      toast({ title: "Topic created successfully" });
    },
    onError: () => toast({ title: "Failed to create topic", variant: "destructive" }),
  });

  const editTopicMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TopicForm> }) =>
      apiRequest("PATCH", `/api/forums/topics/${id}`, data),
    onSuccess: () => {
      void invalidateTopics();
      setIsEditDialogOpen(false);
      setEditingTopic(null);
      toast({ title: "Topic updated successfully" });
    },
    onError: () => toast({ title: "Failed to update topic", variant: "destructive" }),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId: number) => apiRequest("DELETE", `/api/forums/topics/${topicId}`),
    onSuccess: () => {
      void invalidateTopics();
      toast({ title: "Topic deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete topic", variant: "destructive" }),
  });

  const submitNewTopic = (data: TopicForm) => {
    if (!currentCategory || !categoryIsVisible) return;
    createTopicMutation.mutate({ ...data, categoryId: currentCategory.id });
  };

  const submitEditedTopic = (data: TopicForm) => {
    if (!editingTopic || !currentCategory || !categoryIsVisible) return;
    editTopicMutation.mutate({
      id: editingTopic.id,
      data: { ...data, categoryId: currentCategory.id },
    });
  };

  if (!categoriesLoading && (!currentCategory || !categoryIsVisible)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Card>
            <CardContent className="p-10">
              <h1 className="text-2xl font-bold">Forum category not found</h1>
              <p className="mt-3 text-gray-600">This board does not exist or is no longer available.</p>
              <Link href="/forums"><Button className="mt-6 bg-uh-red hover:bg-red-700">Return to Standard Board</Button></Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {categoriesLoading || !currentCategory ? (
          <Card><CardContent className="p-10 text-center text-gray-600">Loading forum…</CardContent></Card>
        ) : (
          <>
            <nav className="mb-6 flex text-sm text-gray-600" aria-label="Breadcrumb">
              <Link href="/forums" className="hover:text-uh-red">Forums</Link>
              <span className="mx-2">/</span>
              <span className="font-medium text-uh-black">{currentCategory.name}</span>
            </nav>

            <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h1 className="text-3xl font-bold text-uh-black">{currentCategory.name}</h1>
                <p className="mt-2 max-w-3xl text-gray-600">{currentCategory.description || "Community discussion board"}</p>
                <p className="mt-2 text-sm text-gray-500">{topics.length} topics</p>
              </div>

              {isAuthenticated && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-uh-red hover:bg-red-700">New Topic</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Create New Topic in {currentCategory.name}</DialogTitle></DialogHeader>
                    <TopicEditor form={form} onSubmit={submitNewTopic} busy={createTopicMutation.isPending} submitLabel="Create Topic" />
                  </DialogContent>
                </Dialog>
              )}
            </section>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Edit Topic</DialogTitle></DialogHeader>
                <TopicEditor form={editForm} onSubmit={submitEditedTopic} busy={editTopicMutation.isPending} submitLabel="Update Topic" />
              </DialogContent>
            </Dialog>

            <section className="space-y-4">
              {topicsLoading ? (
                [1, 2, 3].map((item) => <Card key={item} className="h-28 animate-pulse bg-gray-100" />)
              ) : topics.length > 0 ? (
                topics.map((topic) => (
                  <Card key={topic.id} className="transition hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Avatar><AvatarFallback className="bg-uh-red text-white">{(topic.authorId || "C").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row">
                            <div className="min-w-0 flex-1">
                              <Link href={`/forums/topics/${topic.id}`} className="text-lg font-semibold text-uh-black hover:text-uh-red">
                                {topic.title}
                              </Link>
                              <RichContentRenderer content={topic.content?.substring(0, 300) || ""} className="mt-2 line-clamp-3 text-sm text-gray-600" />
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span>by {topic.authorId}</span>
                                <span>•</span>
                                <span>{topic.createdAt ? formatDistance(new Date(topic.createdAt), new Date(), { addSuffix: true }) : "Unknown"}</span>
                                {topic.isPinned && <Badge variant="secondary">Pinned</Badge>}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              <div>{topic.replyCount || 0} replies</div>
                              <div>{topic.viewCount || 0} views</div>
                              {user?.id === topic.authorId && (
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTopic(topic);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    disabled={deleteTopicMutation.isPending}
                                    onClick={() => {
                                      if (window.confirm("Delete this topic?")) deleteTopicMutation.mutate(topic.id);
                                    }}
                                  >
                                    Delete
                                  </Button>
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
                    <h2 className="text-xl font-bold">No topics yet</h2>
                    <p className="mt-2 text-gray-600">Be the first to start a discussion in {currentCategory.name}.</p>
                    {isAuthenticated ? (
                      <Button className="mt-6 bg-uh-red hover:bg-red-700" onClick={() => setIsCreateDialogOpen(true)}>Create First Topic</Button>
                    ) : (
                      <Link href="/login" className="mt-6 inline-block font-semibold text-uh-red hover:underline">Log in to start a topic</Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </section>

            {currentCategory.slug === "water-cooler" && (
              <Card className="mt-8 border-blue-200 bg-blue-50">
                <CardHeader><CardTitle className="text-blue-900">Water Cooler Guidelines</CardTitle></CardHeader>
                <CardContent className="text-sm text-blue-800">
                  General and off-topic conversation is welcome. Keep discussions civil, avoid spam, and respect other members.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function TopicEditor(props: {
  form: UseFormReturn<TopicForm>;
  onSubmit: (data: TopicForm) => void;
  busy: boolean;
  submitLabel: string;
}) {
  return (
    <Form {...props.form}>
      <form onSubmit={props.form.handleSubmit(props.onSubmit)} className="space-y-6">
        <FormField
          control={props.form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic Title</FormLabel>
              <FormControl><Input placeholder="Enter a descriptive title" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={props.form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <RichTextEditor value={field.value || ""} onChange={field.onChange} placeholder="Share your thoughts…" className="min-h-[180px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-uh-red hover:bg-red-700" disabled={props.busy}>
          {props.busy ? "Saving…" : props.submitLabel}
        </Button>
      </form>
    </Form>
  );
}
