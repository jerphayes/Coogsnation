import {
  users,
  forumCategories,
  forumTopics,
  forumPosts,
  newsArticles,
  newsComments,
  events,
  campusLocations,
  products,
  shoppingCart,
  orders,
  orderItems,
  notifications,
  hallOfFame,
  eventRsvps,
  rateLimits,
  coogpawsProfiles,
  coogpawsSwipes,
  coogpawsMatches,
  coogpawsMessages,
  coogpawsBlocks,
  coogpawsReports,
  userIdentities,
  type User,
  type UserIdentity,
  type InsertUserIdentity,
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
  type CampusLocation,
  type InsertCampusLocation,
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
  type CoogpawsProfile,
  type InsertCoogpawsProfile,
  type CoogpawsSwipe,
  type InsertCoogpawsSwipe,
  type CoogpawsMatch,
  type InsertCoogpawsMatch,
  type CoogpawsMessage,
  type InsertCoogpawsMessage,
  type CoogpawsBlock,
  type InsertCoogpawsBlock,
  type CoogpawsReport,
  type InsertCoogpawsReport,
  type UserStatistics,
  type AchievementLevel,
  getAchievementLevel,
  checkForNewAchievement,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, like, isNull, isNotNull, gte, lte } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByHandle(handle: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: UpsertUser): Promise<User>;
  
  // Duplicate checking operations for security
  checkDuplicateName(firstName: string, lastName: string, excludeUserId?: string): Promise<User | undefined>;
  checkDuplicateAddress(address: string, city: string, state: string, zipCode: string, excludeUserId?: string): Promise<User | undefined>;
  
  // User identity operations for multi-provider authentication
  getUserIdentity(provider: string, providerUserId: string): Promise<UserIdentity | undefined>;
  createUserIdentity(identity: InsertUserIdentity): Promise<UserIdentity>;
  getUserIdentities(userId: string): Promise<UserIdentity[]>;
  removeUserIdentity(identityId: number): Promise<void>;
  findUserByProviderEmail(email: string, excludeProvider?: string): Promise<User | undefined>;
  mergeUserAccounts(keepUserId: string, mergeUserId: string): Promise<User>;
  
  // Forum operations
  getForumCategories(): Promise<ForumCategory[]>;
  createForumCategory(category: InsertForumCategory): Promise<ForumCategory>;
  getForumTopicsByCategory(categoryId: number, limit?: number): Promise<ForumTopic[]>;
  getForumTopic(id: number): Promise<ForumTopic | undefined>;
  createForumTopic(topic: InsertForumTopic): Promise<ForumTopic>;
  updateForumTopic(id: number, topic: Partial<InsertForumTopic>): Promise<ForumTopic>;
  getForumPostsByTopic(topicId: number): Promise<ForumPost[]>;
  getForumPost(id: number): Promise<ForumPost | undefined>;
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  updateForumPost(id: number, post: Partial<InsertForumPost>): Promise<ForumPost>;
  deleteForumTopic(topicId: number): Promise<void>;
  deleteForumPost(postId: number): Promise<void>;
  
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
  
  // POD Product operations
  getPODProducts(provider?: string, category?: string): Promise<Product[]>;
  syncPODProduct(podProductData: any, provider: string, category: string): Promise<Product>;
  getPODProductsByCategory(category: string): Promise<Product[]>;
  updatePODProductSync(productId: number): Promise<Product>;
  getPODProductByProviderAndId(provider: string, podProductId: string): Promise<Product | undefined>;
  
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
  
  // Campus locations operations
  getCampusLocations(): Promise<CampusLocation[]>;
  getCampusLocation(id: number): Promise<CampusLocation | undefined>;
  createCampusLocation(location: InsertCampusLocation): Promise<CampusLocation>;
  updateCampusLocation(id: number, location: Partial<InsertCampusLocation>): Promise<CampusLocation>;
  deleteCampusLocation(id: number): Promise<void>;
  getCampusLocationsByCategory(category: string): Promise<CampusLocation[]>;
  
  // Event locations operations
  getEventsWithLocations(startDate?: Date, endDate?: Date): Promise<Array<Event & { campusLocation?: CampusLocation }>>;
  getActiveEventsAtLocation(locationId: number): Promise<Event[]>;
  
  // User profile operations
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  deleteUserProfile(userId: string): Promise<void>;
  getUserPosts(userId: string, limit?: number): Promise<ForumPost[]>;
  
  // Community stats
  getCommunityStats(): Promise<{
    totalMembers: number;
    onlineMembers: number;
    postsToday: number;
    newMembersToday: number;
    activeToday: number;
    newThisMonth: number;
    topContributors: number;
  }>;
  
  // Active members
  getActiveMembers(limit?: number): Promise<User[]>;
  
  // Search
  searchContent(query: string): Promise<{
    topics: ForumTopic[];
    articles: NewsArticle[];
  }>;
  
  // User statistics and achievement operations
  getUserStatistics(userId: string): Promise<UserStatistics>;
  updateUserStatistics(userId: string): Promise<UserStatistics>;
  updateUserAchievementLevel(userId: string, newLevel: AchievementLevel, achievementDate?: Date): Promise<User>;
  getUsersByAchievementLevel(level: AchievementLevel): Promise<User[]>;
  getRecentSignups(days?: number): Promise<User[]>;
  recalculateAllUserStatistics(): Promise<void>;
  
  // Admin operations
  getRecentMembers(limit?: number): Promise<Array<User & { daysSinceSignup: number }>>;
  getAllUsersWithStatistics(): Promise<Array<User & { 
    postCount: number;
    threadCount: number; 
    daysSinceSignup: number;
    lastActivityDays: number;
  }>>;
  getAchievementSummary(): Promise<Array<{ level: string; count: number; percentage: number }>>;
  getAdminStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalThreads: number;
    totalEvents: number;
    totalArticles: number;
    activeForums: number;
    todaySignups: number;
    monthlyActiveUsers: number;
    topContributors: Array<{ userId: string; email: string; postCount: number; threadCount: number }>;
  }>;

  // Security operations for account lockout
  recordFailedLoginAttempt(userId: string): Promise<void>;
  clearFailedLoginAttempts(userId: string): Promise<void>;
  lockUserAccount(userId: string, lockDurationMinutes: number): Promise<void>;
  unlockUserAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;

  // MFA operations
  storeMfaToken(userId: string, token: string, expiryDate: Date): Promise<void>;
  verifyMfaToken(userId: string, token: string): Promise<boolean>;
  clearMfaToken(userId: string): Promise<void>;
  
  // MFA attempt tracking for brute force protection
  recordMfaAttempt(userId: string): Promise<void>;
  clearMfaAttempts(userId: string): Promise<void>;
  lockMfaForUser(userId: string, durationMinutes: number): Promise<void>;

  // Password operations
  updatePassword(userId: string, newPasswordHash: string): Promise<void>;

  // Avatar operations
  updateProfileImage(userId: string, imageUrl: string): Promise<User>;

  // Rate limiting operations
  checkRateLimit(key: string, type: string, maxAttempts: number, windowMinutes: number): Promise<{ allowed: boolean; remainingTime?: number }>;
  recordRateLimitAttempt(key: string, type: string): Promise<void>;
  clearRateLimit(key: string, type: string): Promise<void>;
  cleanupExpiredRateLimits(): Promise<void>;

  // Coogpaws Dating App operations
  // Profile operations
  getCoogpawsProfile(userId: string): Promise<CoogpawsProfile | undefined>;
  createCoogpawsProfile(profile: InsertCoogpawsProfile): Promise<CoogpawsProfile>;
  updateCoogpawsProfile(userId: string, profile: Partial<InsertCoogpawsProfile>): Promise<CoogpawsProfile>;
  deleteCoogpawsProfile(userId: string): Promise<void>;
  getActiveCoogpawsProfiles(excludeUserId: string, limit?: number): Promise<CoogpawsProfile[]>;
  
  // Swipe operations
  recordSwipe(swipe: InsertCoogpawsSwipe): Promise<CoogpawsSwipe>;
  hasUserSwiped(swiperId: string, swipedUserId: string): Promise<boolean>;
  getUserSwipes(userId: string): Promise<CoogpawsSwipe[]>;
  
  // Match operations
  createMatch(user1Id: string, user2Id: string): Promise<CoogpawsMatch>;
  getUserMatches(userId: string): Promise<CoogpawsMatch[]>;
  getMatch(matchId: number): Promise<CoogpawsMatch | undefined>;
  deleteMatch(matchId: number): Promise<void>;
  
  // Message operations
  sendMessage(message: InsertCoogpawsMessage): Promise<CoogpawsMessage>;
  getMatchMessages(matchId: number): Promise<CoogpawsMessage[]>;
  markMessagesAsRead(matchId: number, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Safety & moderation operations
  blockUser(block: InsertCoogpawsBlock): Promise<CoogpawsBlock>;
  unblockUser(blockerId: string, blockedUserId: string): Promise<void>;
  isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean>;
  getUserBlocks(userId: string): Promise<CoogpawsBlock[]>;
  reportUser(report: InsertCoogpawsReport): Promise<CoogpawsReport>;
  getUserReports(userId: string): Promise<CoogpawsReport[]>;
  getReportsByStatus(status: string): Promise<CoogpawsReport[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByHandle(handle: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.handle, handle));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Duplicate checking operations for security
  async checkDuplicateName(firstName: string, lastName: string, excludeUserId?: string): Promise<User | undefined> {
    let query = db.select().from(users).where(
      and(
        eq(users.firstName, firstName),
        eq(users.lastName, lastName)
      )
    );

    if (excludeUserId) {
      query = db.select().from(users).where(
        and(
          eq(users.firstName, firstName),
          eq(users.lastName, lastName),
          sql`${users.id} != ${excludeUserId}`
        )
      );
    }

    const [user] = await query;
    return user;
  }

  async checkDuplicateAddress(address: string, city: string, state: string, zipCode: string, excludeUserId?: string): Promise<User | undefined> {
    let query = db.select().from(users).where(
      and(
        eq(users.address, address),
        eq(users.city, city),
        eq(users.state, state),
        eq(users.zipCode, zipCode)
      )
    );

    if (excludeUserId) {
      query = db.select().from(users).where(
        and(
          eq(users.address, address),
          eq(users.city, city),
          eq(users.state, state),
          eq(users.zipCode, zipCode),
          sql`${users.id} != ${excludeUserId}`
        )
      );
    }

    const [user] = await query;
    return user;
  }

  async createLocalUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        isLocalAccount: true,
      })
      .returning();
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

  // User identity operations for multi-provider authentication
  async getUserIdentity(provider: string, providerUserId: string): Promise<UserIdentity | undefined> {
    const [identity] = await db
      .select()
      .from(userIdentities)
      .where(and(
        eq(userIdentities.provider, provider),
        eq(userIdentities.providerUserId, providerUserId)
      ));
    return identity;
  }

  async createUserIdentity(identity: InsertUserIdentity): Promise<UserIdentity> {
    const [newIdentity] = await db
      .insert(userIdentities)
      .values(identity)
      .returning();
    return newIdentity;
  }

  async getUserIdentities(userId: string): Promise<UserIdentity[]> {
    return await db
      .select()
      .from(userIdentities)
      .where(eq(userIdentities.userId, userId));
  }


  async removeUserIdentity(identityId: number): Promise<void> {
    await db
      .delete(userIdentities)
      .where(eq(userIdentities.id, identityId));
  }

  async findUserByProviderEmail(email: string, excludeProvider?: string): Promise<User | undefined> {
    // First try to find by email in identities
    const whereCondition = excludeProvider 
      ? and(
          eq(userIdentities.emailAtAuth, email),
          sql`${userIdentities.provider} != ${excludeProvider}`
        )
      : eq(userIdentities.emailAtAuth, email);
    
    const [identity] = await db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(whereCondition);
    if (identity) {
      return await this.getUser(identity.userId);
    }

    // Fallback to users table email (excluding the provider if specified)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    return user;
  }

  async mergeUserAccounts(keepUserId: string, mergeUserId: string): Promise<User> {
    await db.transaction(async (tx) => {
      // Move all identities from merge user to keep user
      await tx
        .update(userIdentities)
        .set({ userId: keepUserId })
        .where(eq(userIdentities.userId, mergeUserId));

      // Update all related data to point to keep user
      await tx
        .update(forumTopics)
        .set({ authorId: keepUserId })
        .where(eq(forumTopics.authorId, mergeUserId));

      await tx
        .update(forumPosts)
        .set({ authorId: keepUserId })
        .where(eq(forumPosts.authorId, mergeUserId));

      await tx
        .update(newsArticles)
        .set({ authorId: keepUserId })
        .where(eq(newsArticles.authorId, mergeUserId));

      await tx
        .update(newsComments)
        .set({ authorId: keepUserId })
        .where(eq(newsComments.authorId, mergeUserId));

      await tx
        .update(events)
        .set({ createdById: keepUserId })
        .where(eq(events.createdById, mergeUserId));

      await tx
        .update(shoppingCart)
        .set({ userId: keepUserId })
        .where(eq(shoppingCart.userId, mergeUserId));

      await tx
        .update(orders)
        .set({ userId: keepUserId })
        .where(eq(orders.userId, mergeUserId));

      await tx
        .update(notifications)
        .set({ userId: keepUserId })
        .where(eq(notifications.userId, mergeUserId));

      await tx
        .update(eventRsvps)
        .set({ userId: keepUserId })
        .where(eq(eventRsvps.userId, mergeUserId));

      // Delete the merged user
      await tx
        .delete(users)
        .where(eq(users.id, mergeUserId));
    });

    const keepUser = await this.getUser(keepUserId);
    if (!keepUser) {
      throw new Error('Keep user not found after merge');
    }
    return keepUser;
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
    const [newTopic] = await db
      .insert(forumTopics)
      .values(topic)
      .returning();
    return newTopic;
  }
  
  async updateForumTopic(id: number, topic: Partial<InsertForumTopic>): Promise<ForumTopic> {
    const [updatedTopic] = await db
      .update(forumTopics)
      .set({
        ...topic,
        updatedAt: new Date(),
      })
      .where(eq(forumTopics.id, id))
      .returning();
    return updatedTopic;
  }
  
  async getForumPostsByTopic(topicId: number): Promise<ForumPost[]> {
    return await db
      .select()
      .from(forumPosts)
      .where(and(eq(forumPosts.topicId, topicId), eq(forumPosts.isDeleted, false)))
      .orderBy(forumPosts.createdAt);
  }
  
  async getForumPost(id: number): Promise<ForumPost | undefined> {
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, id));
    return post;
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
  
  async updateForumPost(id: number, post: Partial<InsertForumPost>): Promise<ForumPost> {
    const [updatedPost] = await db
      .update(forumPosts)
      .set({
        ...post,
        updatedAt: new Date(),
      })
      .where(eq(forumPosts.id, id))
      .returning();
    return updatedPost;
  }
  
  async deleteForumTopic(topicId: number): Promise<void> {
    // First delete all posts in the topic (soft delete)
    await db
      .update(forumPosts)
      .set({ isDeleted: true })
      .where(eq(forumPosts.topicId, topicId));
    
    // Then delete the topic itself
    await db
      .delete(forumTopics)
      .where(eq(forumTopics.id, topicId));
  }
  
  async deleteForumPost(postId: number): Promise<void> {
    // Soft delete the post
    await db
      .update(forumPosts)
      .set({ isDeleted: true })
      .where(eq(forumPosts.id, postId));
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

  // POD Product operations
  async getPODProducts(provider?: string, category?: string): Promise<Product[]> {
    let query = db
      .select()
      .from(products)
      .where(and(
        eq(products.isActive, true),
        sql`${products.podProvider} IS NOT NULL` // Include POD products only (exclude local products)
      ));

    if (provider) {
      query = db
        .select()
        .from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.podProvider, provider)
        ));
    }

    if (category) {
      query = db
        .select()
        .from(products)
        .where(and(
          eq(products.isActive, true),
          eq(products.category, category),
          provider ? eq(products.podProvider, provider) : sql`${products.podProvider} IS NOT NULL`
        ));
    }

    return await query.orderBy(products.name);
  }

  async syncPODProduct(podProductData: any, provider: string, category: string): Promise<Product> {
    const existingProduct = await this.getPODProductByProviderAndId(provider, podProductData.id);

    const productData = {
      name: podProductData.name,
      description: podProductData.description || `${podProductData.type} from ${provider}`,
      price: podProductData.price?.toString() || '25.99',
      imageUrl: podProductData.image,
      category: category,
      isActive: true,
      stockQuantity: 999, // POD products are always in stock
      podProvider: provider,
      podProductId: podProductData.id,
      podData: podProductData.originalData,
      podCategory: podProductData.category,
      podType: podProductData.type,
      podSyncAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingProduct) {
      // Update existing product
      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(eq(products.id, existingProduct.id))
        .returning();
      return updatedProduct;
    } else {
      // Create new product
      const [newProduct] = await db
        .insert(products)
        .values(productData)
        .returning();
      return newProduct;
    }
  }

  async getPODProductsByCategory(category: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(
        eq(products.isActive, true),
        eq(products.category, category),
        sql`${products.podProvider} IS NOT NULL`
      ))
      .orderBy(products.name);
  }

  async updatePODProductSync(productId: number): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({
        podSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();
    return updatedProduct;
  }

  async getPODProductByProviderAndId(provider: string, podProductId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(
        eq(products.podProvider, provider),
        eq(products.podProductId, podProductId)
      ));
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
        .set({ quantity: (existingItem.quantity || 0) + (item.quantity || 0) })
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

  async deleteUserProfile(userId: string): Promise<void> {
    // Delete user completely - this will cascade delete related data
    // due to foreign key constraints with onDelete: 'cascade'
    await db
      .delete(users)
      .where(eq(users.id, userId));
  }

  async getUserPosts(userId: string, limit = 20): Promise<ForumPost[]> {
    return await db
      .select({
        id: forumPosts.id,
        content: forumPosts.content,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        topicId: forumPosts.topicId,
        authorId: forumPosts.authorId,
        isDeleted: forumPosts.isDeleted,
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
    activeToday: number;
    newThisMonth: number;
    topContributors: number;
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

    const [newThisMonth] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.createdAt} >= date_trunc('month', CURRENT_DATE)`);
    
    const [topContributors] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(sql`${users.postCount} > 10`);
    
    return {
      totalMembers: totalMembers.count,
      onlineMembers: onlineMembers.count,
      postsToday: postsToday.count,
      newMembersToday: newMembersToday.count,
      activeToday: onlineMembers.count, // Map to expected frontend field
      newThisMonth: newThisMonth.count,
      topContributors: topContributors.count,
    };
  }
  
  // Active members
  async getActiveMembers(limit = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(isNotNull(users.lastActiveAt))
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

  // Admin statistics methods
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }

  async getPostCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(forumPosts);
    return result[0]?.count || 0;
  }

  async getEventCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(events);
    return result[0]?.count || 0;
  }

  async getArticleCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(newsArticles);
    return result[0]?.count || 0;
  }

  async getForumCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(forumCategories).where(eq(forumCategories.isActive, true));
    return result[0]?.count || 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Campus locations operations
  async getCampusLocations(): Promise<CampusLocation[]> {
    return await db
      .select()
      .from(campusLocations)
      .where(eq(campusLocations.isActive, true))
      .orderBy(campusLocations.category, campusLocations.name);
  }

  async getCampusLocation(id: number): Promise<CampusLocation | undefined> {
    const [location] = await db
      .select()
      .from(campusLocations)
      .where(eq(campusLocations.id, id));
    return location;
  }

  async createCampusLocation(location: InsertCampusLocation): Promise<CampusLocation> {
    const [newLocation] = await db
      .insert(campusLocations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateCampusLocation(id: number, location: Partial<InsertCampusLocation>): Promise<CampusLocation> {
    const [updatedLocation] = await db
      .update(campusLocations)
      .set({
        ...location,
        updatedAt: new Date(),
      })
      .where(eq(campusLocations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteCampusLocation(id: number): Promise<void> {
    await db
      .update(campusLocations)
      .set({ isActive: false })
      .where(eq(campusLocations.id, id));
  }

  async getCampusLocationsByCategory(category: string): Promise<CampusLocation[]> {
    return await db
      .select()
      .from(campusLocations)
      .where(and(
        eq(campusLocations.category, category),
        eq(campusLocations.isActive, true)
      ))
      .orderBy(campusLocations.name);
  }

  // Event locations operations
  async getEventsWithLocations(startDate?: Date, endDate?: Date): Promise<Array<Event & { campusLocation?: CampusLocation }>> {
    let conditions = [eq(events.isPublic, true)];
    
    if (startDate) {
      conditions.push(gte(events.eventDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.eventDate, endDate));
    }

    const query = db
      .select({
        // Event fields
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        campusLocationId: events.campusLocationId,
        eventDate: events.eventDate,
        endDate: events.endDate,
        category: events.category,
        isPublic: events.isPublic,
        createdById: events.createdById,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        // Campus location fields
        campusLocation: {
          id: campusLocations.id,
          name: campusLocations.name,
          description: campusLocations.description,
          address: campusLocations.address,
          latitude: campusLocations.latitude,
          longitude: campusLocations.longitude,
          category: campusLocations.category,
          icon: campusLocations.icon,
          capacity: campusLocations.capacity,
          isActive: campusLocations.isActive,
          createdAt: campusLocations.createdAt,
          updatedAt: campusLocations.updatedAt,
        }
      })
      .from(events)
      .leftJoin(campusLocations, eq(events.campusLocationId, campusLocations.id))
      .where(and(...conditions));

    const results = await query.orderBy(events.eventDate);
    
    return results.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      campusLocationId: row.campusLocationId,
      eventDate: row.eventDate,
      endDate: row.endDate,
      category: row.category,
      isPublic: row.isPublic,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      campusLocation: row.campusLocation?.id ? row.campusLocation : undefined
    }));
  }

  async getActiveEventsAtLocation(locationId: number): Promise<Event[]> {
    const now = new Date();
    return await db
      .select()
      .from(events)
      .where(and(
        eq(events.campusLocationId, locationId),
        eq(events.isPublic, true),
        gte(events.eventDate, now)
      ))
      .orderBy(events.eventDate);
  }

  // Admin operations
  async getRecentMembers(limit = 10): Promise<Array<User & { daysSinceSignup: number }>> {
    const usersData = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit);
    
    return usersData.map((user: User) => ({
      ...user,
      daysSinceSignup: Math.floor((Date.now() - (user.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))
    }));
  }

  async getAllUsersWithStatistics(): Promise<Array<User & { 
    postCount: number;
    threadCount: number; 
    daysSinceSignup: number;
    lastActivityDays: number;
  }>> {
    const usersData = await db.select().from(users).orderBy(desc(users.createdAt));
    
    const enrichedUsers = await Promise.all(
      usersData.map(async (user: User) => {
        // Get post count
        const [postCountResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(forumPosts)
          .where(and(eq(forumPosts.authorId, user.id), eq(forumPosts.isDeleted, false)));

        // Get thread count
        const [threadCountResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(forumTopics)
          .where(eq(forumTopics.authorId, user.id));

        const postCount = Number(postCountResult.count) || 0;
        const threadCount = Number(threadCountResult.count) || 0;
        const daysSinceSignup = Math.floor((Date.now() - (user.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));
        const lastActivityDays = user.lastActiveAt 
          ? Math.floor((Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
          : daysSinceSignup;

        return {
          ...user,
          postCount,
          threadCount,
          daysSinceSignup,
          lastActivityDays
        };
      })
    );

    return enrichedUsers;
  }

  async getAchievementSummary(): Promise<Array<{ level: string; count: number; percentage: number }>> {
    const [totalUsersResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    const totalUsers = Number(totalUsersResult.count) || 1;

    const achievementCounts = await db
      .select({
        level: users.achievementLevel,
        count: sql<number>`COUNT(*)`
      })
      .from(users)
      .groupBy(users.achievementLevel);

    return achievementCounts.map(item => ({
      level: item.level || 'Rookie',
      count: Number(item.count),
      percentage: Math.round((Number(item.count) / totalUsers) * 100)
    }));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalThreads: number;
    totalEvents: number;
    totalArticles: number;
    activeForums: number;
    todaySignups: number;
    monthlyActiveUsers: number;
    topContributors: Array<{ userId: string; email: string; postCount: number; threadCount: number }>;
  }> {
    // Get total counts
    const [usersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [postsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(forumPosts).where(eq(forumPosts.isDeleted, false));
    const [threadsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(forumTopics);
    const [eventsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(events);
    const [articlesCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(newsArticles).where(eq(newsArticles.isPublished, true));
    const [forumsCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(forumCategories).where(eq(forumCategories.isActive, true));

    // Today's signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todaySignupsCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gte(users.createdAt, today));

    // Monthly active users
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const [monthlyActiveCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(gte(users.lastActiveAt, monthAgo));

    // Top contributors
    const topContributors = await db
      .select({
        userId: users.id,
        email: users.email,
        postCount: users.postCount,
        threadCount: users.threadCount
      })
      .from(users)
      .orderBy(desc(users.postCount))
      .limit(5);

    return {
      totalUsers: Number(usersCount.count),
      totalPosts: Number(postsCount.count),
      totalThreads: Number(threadsCount.count),
      totalEvents: Number(eventsCount.count),
      totalArticles: Number(articlesCount.count),
      activeForums: Number(forumsCount.count),
      todaySignups: Number(todaySignupsCount.count),
      monthlyActiveUsers: Number(monthlyActiveCount.count),
      topContributors: topContributors.map(contributor => ({
        userId: contributor.userId,
        email: contributor.email || '',
        postCount: contributor.postCount || 0,
        threadCount: contributor.threadCount || 0
      }))
    };
  }

  // User statistics and achievement operations
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate actual post count from forum_posts table
    const [postCountResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(forumPosts)
      .where(and(eq(forumPosts.authorId, userId), eq(forumPosts.isDeleted, false)));

    // Calculate actual thread count from forum_topics table
    const [threadCountResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(forumTopics)
      .where(eq(forumTopics.authorId, userId));

    const actualPostCount = Number(postCountResult.count) || 0;
    const actualThreadCount = Number(threadCountResult.count) || 0;

    // Calculate posts this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [postsThisWeekResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(forumPosts)
      .where(and(
        eq(forumPosts.authorId, userId),
        eq(forumPosts.isDeleted, false),
        gte(forumPosts.createdAt, weekAgo)
      ));

    // Calculate posts this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const [postsThisMonthResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(forumPosts)
      .where(and(
        eq(forumPosts.authorId, userId),
        eq(forumPosts.isDeleted, false),
        gte(forumPosts.createdAt, monthAgo)
      ));

    // Calculate days since signup
    const daysSinceSignup = Math.floor((Date.now() - (user.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));

    return {
      userId,
      postCount: actualPostCount,
      threadCount: actualThreadCount,
      achievementLevel: getAchievementLevel(actualPostCount),
      signupDate: user.createdAt || new Date(),
      lastAchievementDate: user.lastAchievementDate || undefined,
      daysSinceSignup,
      postsThisWeek: Number(postsThisWeekResult.count) || 0,
      postsThisMonth: Number(postsThisMonthResult.count) || 0,
    };
  }

  async updateUserStatistics(userId: string): Promise<UserStatistics> {
    // Get current statistics
    const stats = await this.getUserStatistics(userId);
    
    // Get current user data
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if achievement level changed
    const oldPostCount = user.postCount || 0;
    const achievementCheck = checkForNewAchievement(oldPostCount, stats.postCount);
    
    // Update user record with new statistics
    const updates: Partial<User> = {
      postCount: stats.postCount,
      threadCount: stats.threadCount,
      achievementLevel: stats.achievementLevel,
      updatedAt: new Date(),
    };

    // If new achievement earned, update achievement date
    if (achievementCheck.earned && achievementCheck.newLevel) {
      updates.lastAchievementDate = new Date();
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));

    // Return updated statistics
    return await this.getUserStatistics(userId);
  }

  async updateUserAchievementLevel(userId: string, newLevel: AchievementLevel, achievementDate?: Date): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        achievementLevel: newLevel,
        lastAchievementDate: achievementDate || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async getUsersByAchievementLevel(level: AchievementLevel): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.achievementLevel, level))
      .orderBy(desc(users.postCount));
  }

  async getRecentSignups(days = 30): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(users)
      .where(gte(users.createdAt, cutoffDate))
      .orderBy(desc(users.createdAt));
  }

  async recalculateAllUserStatistics(): Promise<void> {
    // Get all users
    const allUsers = await db.select({ id: users.id }).from(users);
    
    // Update statistics for each user
    for (const user of allUsers) {
      try {
        await this.updateUserStatistics(user.id);
      } catch (error) {
        console.error(`Failed to update statistics for user ${user.id}:`, error);
        // Continue with other users even if one fails
      }
    }
  }

  // Security operations for account lockout
  async recordFailedLoginAttempt(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const lockUntil = newAttempts >= 3 ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30 minutes
    
    await db
      .update(users)
      .set({
        failedLoginAttempts: newAttempts,
        lastFailedAttempt: new Date(),
        lockedUntil: lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearFailedLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lastFailedAttempt: null,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async lockUserAccount(userId: string, lockDurationMinutes: number): Promise<void> {
    const lockUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    await db
      .update(users)
      .set({
        lockedUntil: lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async unlockUserAccount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedAttempt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.lockedUntil) return false;
    
    const now = new Date();
    const lockExpired = user.lockedUntil < now;
    
    if (lockExpired) {
      // Auto-unlock expired locks
      await this.clearFailedLoginAttempts(userId);
      return false;
    }
    
    return true;
  }

  // MFA operations
  async storeMfaToken(userId: string, token: string, expiryDate: Date): Promise<void> {
    await db
      .update(users)
      .set({
        mfaToken: token,
        mfaTokenExpiry: expiryDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.mfaToken || !user.mfaTokenExpiry) return false;
    
    const now = new Date();
    const tokenExpired = user.mfaTokenExpiry < now;
    
    if (tokenExpired) {
      // Clear expired token
      await this.clearMfaToken(userId);
      return false;
    }
    
    return user.mfaToken === token;
  }

  async clearMfaToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaToken: null,
        mfaTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // MFA attempt tracking for brute force protection
  async recordMfaAttempt(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const currentAttempts = user.mfaAttempts || 0;
    await db
      .update(users)
      .set({
        mfaAttempts: currentAttempts + 1,
        mfaLastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async clearMfaAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        mfaAttempts: 0,
        mfaLastAttemptAt: null,
        mfaLockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async lockMfaForUser(userId: string, durationMinutes: number): Promise<void> {
    const lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await db
      .update(users)
      .set({
        mfaLockedUntil: lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Password operations
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Avatar operations
  async updateProfileImage(userId: string, imageUrl: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        profileImageUrl: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // Rate limiting operations
  async checkRateLimit(key: string, type: string, maxAttempts: number, windowMinutes: number): Promise<{ allowed: boolean; remainingTime?: number }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const [existingLimit] = await db
      .select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.key, key),
        eq(rateLimits.type, type),
        gte(rateLimits.windowStart, windowStart)
      ));

    if (!existingLimit) {
      return { allowed: true };
    }

    if (existingLimit.attempts >= maxAttempts) {
      const remainingTime = Math.ceil((existingLimit.windowStart.getTime() + windowMinutes * 60 * 1000 - Date.now()) / 1000 / 60);
      return { allowed: false, remainingTime: Math.max(remainingTime, 0) };
    }

    return { allowed: true };
  }

  async recordRateLimitAttempt(key: string, type: string): Promise<void> {
    const now = new Date();
    
    // Try to update existing record
    const result = await db
      .update(rateLimits)
      .set({
        attempts: sql`${rateLimits.attempts} + 1`,
        lastAttempt: now,
        updatedAt: now,
      })
      .where(and(
        eq(rateLimits.key, key),
        eq(rateLimits.type, type)
      ))
      .returning();

    // If no existing record, create new one
    if (result.length === 0) {
      await db
        .insert(rateLimits)
        .values({
          key,
          type,
          attempts: 1,
          windowStart: now,
          lastAttempt: now,
        })
        .onConflictDoUpdate({
          target: [rateLimits.key, rateLimits.type],
          set: {
            attempts: sql`${rateLimits.attempts} + 1`,
            lastAttempt: now,
            updatedAt: now,
          },
        });
    }
  }

  async clearRateLimit(key: string, type: string): Promise<void> {
    await db
      .delete(rateLimits)
      .where(and(
        eq(rateLimits.key, key),
        eq(rateLimits.type, type)
      ));
  }

  async cleanupExpiredRateLimits(): Promise<void> {
    // Clean up rate limits older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .delete(rateLimits)
      .where(lte(rateLimits.windowStart, cutoff));
  }

  // Heartbeats Dating App methods implementation

  // Profile operations
  async getCoogpawsProfile(userId: string): Promise<CoogpawsProfile | undefined> {
    const [profile] = await db
      .select()
      .from(coogpawsProfiles)
      .where(eq(coogpawsProfiles.userId, userId));
    return profile;
  }

  async createCoogpawsProfile(profile: InsertCoogpawsProfile): Promise<CoogpawsProfile> {
    const [newProfile] = await db
      .insert(coogpawsProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateCoogpawsProfile(userId: string, profile: Partial<InsertCoogpawsProfile>): Promise<CoogpawsProfile> {
    const [updatedProfile] = await db
      .update(coogpawsProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(coogpawsProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  async deleteCoogpawsProfile(userId: string): Promise<void> {
    await db
      .delete(coogpawsProfiles)
      .where(eq(coogpawsProfiles.userId, userId));
  }

  async getActiveCoogpawsProfiles(excludeUserId: string, limit = 20): Promise<CoogpawsProfile[]> {
    // Subquery for already swiped users
    const swipedSubquery = db
      .select({ swipedUserId: coogpawsSwipes.swipedUserId })
      .from(coogpawsSwipes)
      .where(eq(coogpawsSwipes.swiperId, excludeUserId));

    // Subquery for blocked users (both directions)
    const blockedByMeSubquery = db
      .select({ blockedUserId: coogpawsBlocks.blockedUserId })
      .from(coogpawsBlocks)
      .where(eq(coogpawsBlocks.blockerId, excludeUserId));

    const blockingMeSubquery = db
      .select({ blockerId: coogpawsBlocks.blockerId })
      .from(coogpawsBlocks)
      .where(eq(coogpawsBlocks.blockedUserId, excludeUserId));

    const profiles = await db
      .select()
      .from(coogpawsProfiles)
      .where(
        and(
          eq(coogpawsProfiles.isActive, true),
          sql`${coogpawsProfiles.userId} != ${excludeUserId}`,
          sql`${coogpawsProfiles.userId} NOT IN (${swipedSubquery})`,
          sql`${coogpawsProfiles.userId} NOT IN (${blockedByMeSubquery})`,
          sql`${coogpawsProfiles.userId} NOT IN (${blockingMeSubquery})`
        )
      )
      .limit(limit);
    
    return profiles;
  }

  // Swipe operations
  async recordSwipe(swipe: InsertCoogpawsSwipe): Promise<CoogpawsSwipe> {
    const [newSwipe] = await db
      .insert(coogpawsSwipes)
      .values(swipe)
      .returning();

    // Check if this creates a match (mutual like)
    if (swipe.isLike) {
      const [mutualSwipe] = await db
        .select()
        .from(coogpawsSwipes)
        .where(
          and(
            eq(coogpawsSwipes.swiperId, swipe.swipedUserId),
            eq(coogpawsSwipes.swipedUserId, swipe.swiperId),
            eq(coogpawsSwipes.isLike, true)
          )
        );

      if (mutualSwipe) {
        // Create a match
        await this.createMatch(swipe.swiperId, swipe.swipedUserId);
      }
    }

    return newSwipe;
  }

  async hasUserSwiped(swiperId: string, swipedUserId: string): Promise<boolean> {
    const [swipe] = await db
      .select()
      .from(coogpawsSwipes)
      .where(
        and(
          eq(coogpawsSwipes.swiperId, swiperId),
          eq(coogpawsSwipes.swipedUserId, swipedUserId)
        )
      );
    return !!swipe;
  }

  async getUserSwipes(userId: string): Promise<CoogpawsSwipe[]> {
    return await db
      .select()
      .from(coogpawsSwipes)
      .where(eq(coogpawsSwipes.swiperId, userId))
      .orderBy(desc(coogpawsSwipes.createdAt));
  }

  // Match operations
  async createMatch(user1Id: string, user2Id: string): Promise<CoogpawsMatch> {
    // Ensure consistent ordering for uniqueness
    const [smallerId, largerId] = [user1Id, user2Id].sort();
    
    const [match] = await db
      .insert(coogpawsMatches)
      .values({
        user1Id: smallerId,
        user2Id: largerId,
      })
      .onConflictDoNothing()
      .returning();
    
    return match;
  }

  async getUserMatches(userId: string): Promise<CoogpawsMatch[]> {
    return await db
      .select()
      .from(coogpawsMatches)
      .where(
        and(
          sql`(${coogpawsMatches.user1Id} = ${userId} OR ${coogpawsMatches.user2Id} = ${userId})`,
          eq(coogpawsMatches.isActive, true)
        )
      )
      .orderBy(desc(coogpawsMatches.createdAt));
  }

  async getMatch(matchId: number): Promise<CoogpawsMatch | undefined> {
    const [match] = await db
      .select()
      .from(coogpawsMatches)
      .where(eq(coogpawsMatches.id, matchId));
    return match;
  }

  async deleteMatch(matchId: number): Promise<void> {
    await db
      .update(coogpawsMatches)
      .set({ isActive: false })
      .where(eq(coogpawsMatches.id, matchId));
  }

  // Message operations
  async sendMessage(message: InsertCoogpawsMessage): Promise<CoogpawsMessage> {
    const [newMessage] = await db
      .insert(coogpawsMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMatchMessages(matchId: number): Promise<CoogpawsMessage[]> {
    return await db
      .select()
      .from(coogpawsMessages)
      .where(eq(coogpawsMessages.matchId, matchId))
      .orderBy(coogpawsMessages.createdAt);
  }

  async markMessagesAsRead(matchId: number, userId: string): Promise<void> {
    await db
      .update(coogpawsMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(coogpawsMessages.matchId, matchId),
          sql`${coogpawsMessages.senderId} != ${userId}`
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Get all matches for the user
    const userMatches = await this.getUserMatches(userId);
    const matchIds = userMatches.map(match => match.id);

    if (matchIds.length === 0) {
      return 0;
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(coogpawsMessages)
      .where(
        and(
          sql`${coogpawsMessages.matchId} IN (${sql.join(matchIds, sql`, `)})`,
          sql`${coogpawsMessages.senderId} != ${userId}`,
          eq(coogpawsMessages.isRead, false)
        )
      );

    return result?.count || 0;
  }

  // Safety & moderation operations
  async blockUser(block: InsertCoogpawsBlock): Promise<CoogpawsBlock> {
    const [newBlock] = await db
      .insert(coogpawsBlocks)
      .values(block)
      .onConflictDoNothing()
      .returning();

    // Deactivate any existing matches between these users
    await db
      .update(coogpawsMatches)
      .set({ isActive: false })
      .where(
        sql`(${coogpawsMatches.user1Id} = ${block.blockerId} AND ${coogpawsMatches.user2Id} = ${block.blockedUserId}) OR 
            (${coogpawsMatches.user1Id} = ${block.blockedUserId} AND ${coogpawsMatches.user2Id} = ${block.blockerId})`
      );

    return newBlock;
  }

  async unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
    await db
      .delete(coogpawsBlocks)
      .where(
        and(
          eq(coogpawsBlocks.blockerId, blockerId),
          eq(coogpawsBlocks.blockedUserId, blockedUserId)
        )
      );
  }

  async isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
    const [block] = await db
      .select()
      .from(coogpawsBlocks)
      .where(
        and(
          eq(coogpawsBlocks.blockerId, blockerId),
          eq(coogpawsBlocks.blockedUserId, blockedUserId)
        )
      );
    return !!block;
  }

  async getUserBlocks(userId: string): Promise<CoogpawsBlock[]> {
    return await db
      .select()
      .from(coogpawsBlocks)
      .where(eq(coogpawsBlocks.blockerId, userId))
      .orderBy(desc(coogpawsBlocks.createdAt));
  }

  async reportUser(report: InsertCoogpawsReport): Promise<CoogpawsReport> {
    const [newReport] = await db
      .insert(coogpawsReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getUserReports(userId: string): Promise<CoogpawsReport[]> {
    return await db
      .select()
      .from(coogpawsReports)
      .where(eq(coogpawsReports.reportedUserId, userId))
      .orderBy(desc(coogpawsReports.createdAt));
  }

  async getReportsByStatus(status: string): Promise<CoogpawsReport[]> {
    return await db
      .select()
      .from(coogpawsReports)
      .where(eq(coogpawsReports.status, status))
      .orderBy(desc(coogpawsReports.createdAt));
  }
}

export const storage = new DatabaseStorage();
