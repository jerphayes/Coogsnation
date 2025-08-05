import {
  users,
  forumCategories,
  forumTopics,
  forumPosts,
  newsArticles,
  newsComments,
  events,
  products,
  type User,
  type UpsertUser,
  type ForumCategory,
  type InsertForumCategory,
  type ForumTopic,
  type InsertForumTopic,
  type ForumPost,
  type InsertForumPost,
  type NewsArticle,
  type InsertNewsArticle,
  type NewsComment,
  type InsertNewsComment,
  type Event,
  type InsertEvent,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, like, isNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Forum operations
  getForumCategories(): Promise<ForumCategory[]>;
  createForumCategory(category: InsertForumCategory): Promise<ForumCategory>;
  getForumTopicsByCategory(categoryId: number, limit?: number): Promise<ForumTopic[]>;
  getForumTopic(id: number): Promise<ForumTopic | undefined>;
  createForumTopic(topic: InsertForumTopic): Promise<ForumTopic>;
  getForumPostsByTopic(topicId: number): Promise<ForumPost[]>;
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  
  // News operations
  getNewsArticles(limit?: number): Promise<NewsArticle[]>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  getNewsCommentsByArticle(articleId: number): Promise<NewsComment[]>;
  createNewsComment(comment: InsertNewsComment): Promise<NewsComment>;
  
  // Event operations
  getUpcomingEvents(limit?: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  
  // Product operations
  getProducts(limit?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  
  // Community stats
  getCommunityStats(): Promise<{
    totalMembers: number;
    onlineMembers: number;
    postsToday: number;
    newMembersToday: number;
  }>;
  
  // Active members
  getActiveMembers(limit?: number): Promise<User[]>;
  
  // Search
  searchContent(query: string): Promise<{
    topics: ForumTopic[];
    articles: NewsArticle[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Forum operations
  async getForumCategories(): Promise<ForumCategory[]> {
    return await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.isActive, true))
      .orderBy(forumCategories.sortOrder, forumCategories.name);
  }
  
  async createForumCategory(category: InsertForumCategory): Promise<ForumCategory> {
    const [newCategory] = await db
      .insert(forumCategories)
      .values(category)
      .returning();
    return newCategory;
  }
  
  async getForumTopicsByCategory(categoryId: number, limit = 20): Promise<ForumTopic[]> {
    return await db
      .select()
      .from(forumTopics)
      .where(eq(forumTopics.categoryId, categoryId))
      .orderBy(desc(forumTopics.isPinned), desc(forumTopics.lastReplyAt))
      .limit(limit);
  }
  
  async getForumTopic(id: number): Promise<ForumTopic | undefined> {
    const [topic] = await db
      .select()
      .from(forumTopics)
      .where(eq(forumTopics.id, id));
    return topic;
  }
  
  async createForumTopic(topic: InsertForumTopic): Promise<ForumTopic> {
    const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [newTopic] = await db
      .insert(forumTopics)
      .values({
        ...topic,
        slug: `${slug}-${Date.now()}`,
      })
      .returning();
    return newTopic;
  }
  
  async getForumPostsByTopic(topicId: number): Promise<ForumPost[]> {
    return await db
      .select()
      .from(forumPosts)
      .where(and(eq(forumPosts.topicId, topicId), eq(forumPosts.isDeleted, false)))
      .orderBy(forumPosts.createdAt);
  }
  
  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const [newPost] = await db
      .insert(forumPosts)
      .values(post)
      .returning();
    
    // Update topic reply count and last reply info
    await db
      .update(forumTopics)
      .set({
        replyCount: sql`${forumTopics.replyCount} + 1`,
        lastReplyAt: new Date(),
        lastReplyById: post.authorId,
      })
      .where(eq(forumTopics.id, post.topicId));
    
    return newPost;
  }
  
  // News operations
  async getNewsArticles(limit = 20): Promise<NewsArticle[]> {
    return await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.isPublished, true))
      .orderBy(desc(newsArticles.publishedAt))
      .limit(limit);
  }
  
  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id));
    return article;
  }
  
  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [newArticle] = await db
      .insert(newsArticles)
      .values({
        ...article,
        slug: `${slug}-${Date.now()}`,
      })
      .returning();
    return newArticle;
  }
  
  async getNewsCommentsByArticle(articleId: number): Promise<NewsComment[]> {
    return await db
      .select()
      .from(newsComments)
      .where(and(eq(newsComments.articleId, articleId), eq(newsComments.isDeleted, false)))
      .orderBy(newsComments.createdAt);
  }
  
  async createNewsComment(comment: InsertNewsComment): Promise<NewsComment> {
    const [newComment] = await db
      .insert(newsComments)
      .values(comment)
      .returning();
    
    // Update article comment count
    await db
      .update(newsArticles)
      .set({
        commentCount: sql`${newsArticles.commentCount} + 1`,
      })
      .where(eq(newsArticles.id, comment.articleId));
    
    return newComment;
  }
  
  // Event operations
  async getUpcomingEvents(limit = 10): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(and(eq(events.isPublic, true), sql`${events.eventDate} >= NOW()`))
      .orderBy(events.eventDate)
      .limit(limit);
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }
  
  // Product operations
  async getProducts(limit = 20): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.name)
      .limit(limit);
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }
  
  // Community stats
  async getCommunityStats(): Promise<{
    totalMembers: number;
    onlineMembers: number;
    postsToday: number;
    newMembersToday: number;
  }> {
    const [totalMembers] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users);
    
    const [onlineMembers] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(eq(users.isOnline, true));
    
    const [postsToday] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(forumPosts)
      .where(sql`DATE(${forumPosts.createdAt}) = CURRENT_DATE`);
    
    const [newMembersToday] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`DATE(${users.createdAt}) = CURRENT_DATE`);
    
    return {
      totalMembers: totalMembers.count,
      onlineMembers: onlineMembers.count,
      postsToday: postsToday.count,
      newMembersToday: newMembersToday.count,
    };
  }
  
  // Active members
  async getActiveMembers(limit = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(isNull(users.lastActiveAt))
      .orderBy(desc(users.lastActiveAt))
      .limit(limit);
  }
  
  // Search
  async searchContent(query: string): Promise<{
    topics: ForumTopic[];
    articles: NewsArticle[];
  }> {
    const searchPattern = `%${query}%`;
    
    const topics = await db
      .select()
      .from(forumTopics)
      .where(like(forumTopics.title, searchPattern))
      .limit(10);
    
    const articles = await db
      .select()
      .from(newsArticles)
      .where(and(
        like(newsArticles.title, searchPattern),
        eq(newsArticles.isPublished, true)
      ))
      .limit(10);
    
    return { topics, articles };
  }
}

export const storage = new DatabaseStorage();
