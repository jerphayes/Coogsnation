import {
  users,
  forumCategories,
  forumTopics,
  forumPosts,
  newsArticles,
  newsComments,
  events,
  products,
  shoppingCart,
  orders,
  orderItems,
  notifications,
  hallOfFame,
  eventRsvps,
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
  type ShoppingCart,
  type InsertShoppingCart,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Notification,
  type InsertNotification,
  type HallOfFame,
  type InsertHallOfFame,
  type EventRsvp,
  type InsertEventRsvp,
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
  
  // Shopping cart operations
  getCartItems(userId: string): Promise<ShoppingCart[]>;
  addToCart(item: InsertShoppingCart): Promise<ShoppingCart>;
  updateCartQuantity(itemId: number, quantity: number): Promise<ShoppingCart>;
  removeFromCart(itemId: number): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrders(userId: string, limit?: number): Promise<Order[]>;
  getOrder(orderId: number): Promise<Order | undefined>;
  updateOrderStatus(orderId: number, status: string): Promise<Order>;
  
  // Notification operations
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(notificationId: number): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // Hall of Fame operations
  getHallOfFameEntries(category?: string): Promise<HallOfFame[]>;
  createHallOfFameEntry(entry: InsertHallOfFame): Promise<HallOfFame>;
  
  // Event RSVP operations
  rsvpToEvent(eventId: number, userId: string, status: string): Promise<EventRsvp>;
  getEventRsvps(eventId: number): Promise<EventRsvp[]>;
  getUserRsvps(userId: string): Promise<EventRsvp[]>;
  
  // User profile operations
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  getUserPosts(userId: string, limit?: number): Promise<ForumPost[]>;
  
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

  // Shopping cart operations
  async getCartItems(userId: string): Promise<ShoppingCart[]> {
    return await db
      .select({
        id: shoppingCart.id,
        userId: shoppingCart.userId,
        productId: shoppingCart.productId,
        quantity: shoppingCart.quantity,
        createdAt: shoppingCart.createdAt,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          category: products.category,
          imageUrl: products.imageUrl,
          stockQuantity: products.stockQuantity,
          isActive: products.isActive,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        },
      })
      .from(shoppingCart)
      .innerJoin(products, eq(shoppingCart.productId, products.id))
      .where(eq(shoppingCart.userId, userId));
  }

  async addToCart(item: InsertShoppingCart): Promise<ShoppingCart> {
    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(shoppingCart)
      .where(and(
        eq(shoppingCart.userId, item.userId),
        eq(shoppingCart.productId, item.productId)
      ));

    if (existingItem) {
      // Update quantity if item exists
      const [updatedItem] = await db
        .update(shoppingCart)
        .set({ quantity: existingItem.quantity + item.quantity })
        .where(eq(shoppingCart.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Create new cart item
      const [newItem] = await db
        .insert(shoppingCart)
        .values(item)
        .returning();
      return newItem;
    }
  }

  async updateCartQuantity(itemId: number, quantity: number): Promise<ShoppingCart> {
    const [updatedItem] = await db
      .update(shoppingCart)
      .set({ quantity })
      .where(eq(shoppingCart.id, itemId))
      .returning();
    return updatedItem;
  }

  async removeFromCart(itemId: number): Promise<void> {
    await db
      .delete(shoppingCart)
      .where(eq(shoppingCart.id, itemId));
  }

  async clearCart(userId: string): Promise<void> {
    await db
      .delete(shoppingCart)
      .where(eq(shoppingCart.userId, userId));
  }

  // Order operations
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();

    // Add order items with the order ID
    const orderItemsWithOrderId = items.map(item => ({
      ...item,
      orderId: newOrder.id,
    }));

    await db
      .insert(orderItems)
      .values(orderItemsWithOrderId);

    return newOrder;
  }

  async getOrders(userId: string, limit = 20): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getOrder(orderId: number): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    return order;
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updatedOrder;
  }

  // Notification operations
  async getUserNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    return await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Hall of Fame operations
  async getHallOfFameEntries(category?: string): Promise<HallOfFame[]> {
    const conditions = [];
    if (category) {
      conditions.push(eq(hallOfFame.category, category));
    }

    return await db
      .select()
      .from(hallOfFame)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(hallOfFame.name);
  }

  async createHallOfFameEntry(entry: InsertHallOfFame): Promise<HallOfFame> {
    const [newEntry] = await db
      .insert(hallOfFame)
      .values(entry)
      .returning();
    return newEntry;
  }

  // Event RSVP operations
  async rsvpToEvent(eventId: number, userId: string, status: string): Promise<EventRsvp> {
    // Check if RSVP already exists
    const [existingRsvp] = await db
      .select()
      .from(eventRsvps)
      .where(and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, userId)
      ));

    if (existingRsvp) {
      // Update existing RSVP
      const [updatedRsvp] = await db
        .update(eventRsvps)
        .set({ status })
        .where(eq(eventRsvps.id, existingRsvp.id))
        .returning();
      return updatedRsvp;
    } else {
      // Create new RSVP
      const [newRsvp] = await db
        .insert(eventRsvps)
        .values({ eventId, userId, status })
        .returning();
      return newRsvp;
    }
  }

  async getEventRsvps(eventId: number): Promise<EventRsvp[]> {
    return await db
      .select()
      .from(eventRsvps)
      .where(eq(eventRsvps.eventId, eventId));
  }

  async getUserRsvps(userId: string): Promise<EventRsvp[]> {
    return await db
      .select()
      .from(eventRsvps)
      .where(eq(eventRsvps.userId, userId))
      .orderBy(desc(eventRsvps.createdAt));
  }

  // User profile operations
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserPosts(userId: string, limit = 20): Promise<ForumPost[]> {
    return await db
      .select({
        id: forumPosts.id,
        content: forumPosts.content,
        createdAt: forumPosts.createdAt,
        topicId: forumPosts.topicId,
        authorId: forumPosts.authorId,
        isDeleted: forumPosts.isDeleted,
        topicTitle: forumTopics.title,
      })
      .from(forumPosts)
      .innerJoin(forumTopics, eq(forumPosts.topicId, forumTopics.id))
      .where(and(eq(forumPosts.authorId, userId), eq(forumPosts.isDeleted, false)))
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit);
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
