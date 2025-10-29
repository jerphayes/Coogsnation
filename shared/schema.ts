import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  serial,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(), // This serves as the handle
  handle: varchar("handle").unique(), // Custom handle for display
  nickname: varchar("nickname"),
  title: varchar("title"),
  bio: text("bio"),
  
  // Address information
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  location: varchar("location", { length: 100 }), // Keep for backward compatibility
  
  // Personal information
  dateOfBirth: timestamp("date_of_birth"),
  fanType: varchar("fan_type", { length: 50 }), // Graduate, Faculty, Staff, Coog Crazy Fan
  interest: varchar("interest", { length: 100 }),
  suggestionBox: text("suggestion_box"),
  
  // Enhanced membership fields
  aboutMe: text("about_me"),
  interests: varchar("interests", { length: 1000 }),
  affiliation: varchar("affiliation", { length: 40 }),
  defaultAvatarChoice: integer("default_avatar_choice"),
  graduationYear: integer("graduation_year"),
  majorOrDepartment: varchar("major_or_department", { length: 120 }),
  socialLinks: jsonb("social_links"),
  addressLine1: varchar("address_line_1", { length: 100 }),
  country: varchar("country", { length: 50 }).default("USA"),
  optInOffers: boolean("opt_in_offers").default(false),
  
  // Member category
  memberCategory: varchar("member_category", { length: 20 }), // Alum, Undergrad, Post Grad, Faculty, Staff, Fan
  
  // Authentication fields for local accounts
  backupEmail: varchar("backup_email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  isLocalAccount: boolean("is_local_account").default(false),
  
  // Email verification fields for local accounts
  emailVerifiedAt: timestamp("email_verified_at"),
  emailVerificationTokenHash: varchar("email_verification_token_hash", { length: 255 }),
  emailVerificationSentAt: timestamp("email_verification_sent_at"),
  verificationResendCount: integer("verification_resend_count").default(0),
  verificationLastResentAt: timestamp("verification_last_resent_at"),
  scheduledDeletionAt: timestamp("scheduled_deletion_at"),
  
  
  // Security fields for account lockout and MFA
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastFailedAttempt: timestamp("last_failed_attempt"),
  mfaToken: varchar("mfa_token", { length: 255 }),
  mfaTokenExpiry: timestamp("mfa_token_expiry"),
  mfaAttempts: integer("mfa_attempts").default(0),
  mfaLockedUntil: timestamp("mfa_locked_until"),
  mfaLastAttemptAt: timestamp("mfa_last_attempt_at"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  
  // Privacy and consent
  hasConsentedToDataUse: boolean("has_consented_to_data_use").default(false),
  hasConsentedToMarketing: boolean("has_consented_to_marketing").default(false),
  consentedAt: timestamp("consented_at"),
  
  // Profile completion
  isProfileComplete: boolean("is_profile_complete").default(false),
  profileCompletedAt: timestamp("profile_completed_at"),
  
  favoriteTeam: varchar("favorite_team", { length: 50 }),
  
  // User comments and preferences
  commentsAndSuggestions: text("comments_and_suggestions"),
  favoriteSports: varchar("favorite_sports", { length: 255 }), // JSON array of sports: ["football", "basketball", "other"]
  otherSportComment: varchar("other_sport_comment", { length: 255 }),
  
  postCount: integer("post_count").default(0),
  threadCount: integer("thread_count").default(0),
  achievementLevel: varchar("achievement_level", { length: 50 }).default("Rookie"),
  lastAchievementDate: timestamp("last_achievement_date"),
  reputation: integer("reputation").default(0),
  isOnline: boolean("is_online").default(false),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Indexes for email verification optimization
  index("idx_users_email_verification_token").on(table.emailVerificationTokenHash),
  index("idx_users_email_verification_sent").on(table.emailVerificationSentAt),
  index("idx_users_scheduled_deletion").on(table.scheduledDeletionAt),
  index("idx_users_local_account_verified").on(table.isLocalAccount, table.emailVerifiedAt),
]);

// User identities table for multi-provider authentication
// SECURITY: Token fields removed - tokens never stored in database for security
export const userIdentities = pgTable("user_identities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar("provider", { length: 50 }).notNull(), // replit, facebook, linkedin, local
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(), // Provider-specific user ID
  emailAtAuth: varchar("email_at_auth", { length: 255 }), // Email captured during auth (for matching)
  profileData: jsonb("profile_data"), // Store provider profile data
  isVerified: boolean("is_verified").default(true), // Whether this identity is verified
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure unique provider-user combinations
  unique("unique_provider_user").on(table.provider, table.providerUserId),
  // Index for efficient lookups
  index("idx_user_identities_user_id").on(table.userId),
  index("idx_user_identities_provider").on(table.provider),
  index("idx_user_identities_email").on(table.emailAtAuth),
]);

// Forum categories
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum topics
export const forumTopics = pgTable("forum_topics", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => forumCategories.id),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  viewCount: integer("view_count").default(0),
  replyCount: integer("reply_count").default(0),
  lastReplyAt: timestamp("last_reply_at"),
  lastReplyById: varchar("last_reply_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Forum posts/replies
export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => forumTopics.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// News articles
export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  authorId: varchar("author_id").notNull().references(() => users.id),
  category: varchar("category", { length: 50 }),
  isPublished: boolean("is_published").default(false),
  viewCount: integer("view_count").default(0),
  commentCount: integer("comment_count").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// News comments
export const newsComments = pgTable("news_comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => newsArticles.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campus locations for events and map
export const campusLocations = pgTable("campus_locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 200 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // academic, athletic, dining, parking, recreation, library, housing, etc.
  icon: varchar("icon", { length: 50 }), // Font Awesome icon class
  capacity: integer("capacity"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 200 }),
  campusLocationId: integer("campus_location_id").references(() => campusLocations.id),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  category: varchar("category", { length: 50 }),
  isPublic: boolean("is_public").default(true),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products for e-commerce
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url"),
  category: varchar("category", { length: 50 }),
  isActive: boolean("is_active").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  
  // POD (Print on Demand) Integration fields
  podProvider: varchar("pod_provider", { length: 20 }), // printful, teelaunch, trendsi, null for local products
  podProductId: varchar("pod_product_id", { length: 100 }), // External API product ID
  podData: jsonb("pod_data"), // Store additional API response data
  podCategory: varchar("pod_category", { length: 50 }), // Provider's original category
  podType: varchar("pod_type", { length: 50 }), // Provider's product type (e.g., "mug", "polo", "necklace")
  podSyncAt: timestamp("pod_sync_at"), // When this product was last synced from POD API
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shopping cart
export const shoppingCart = pgTable("shopping_cart", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: text("shipping_address"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// UH Hall of Fame
export const hallOfFame = pgTable("hall_of_fame", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // alumni, athlete, coach, faculty
  description: text("description"),
  achievements: text("achievements"),
  imageUrl: varchar("image_url"),
  graduationYear: integer("graduation_year"),
  sport: varchar("sport", { length: 50 }),
  department: varchar("department", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event RSVPs
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("attending"), // attending, maybe, not_attending
  createdAt: timestamp("created_at").defaultNow(),
});

// Coog Paws Community Connection Tables

// Coog Paws user profiles for community connections
export const coogpawsProfiles = pgTable("coogpaws_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio").notNull(),
  age: integer("age").notNull(),
  lookingFor: varchar("looking_for", { length: 100 }).notNull(), // "friendship", "dating", "serious relationship", "networking"
  interests: varchar("interests", { length: 500 }), // Comma-separated interests
  photos: varchar("photos", { length: 1000 }).array().notNull().default(sql`'{}'::varchar[]`), // Array of photo URLs
  isActive: boolean("is_active").default(true),
  locationPreference: varchar("location_preference", { length: 50 }).default("on-campus"), // "on-campus", "nearby", "anywhere"
  ageRangeMin: integer("age_range_min").default(18),
  ageRangeMax: integer("age_range_max").default(99),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track all swipes (likes and passes)
export const coogpawsSwipes = pgTable("coogpaws_swipes", {
  id: serial("id").primaryKey(),
  swiperId: varchar("swiper_id").notNull().references(() => users.id),
  swipedUserId: varchar("swiped_user_id").notNull().references(() => users.id),
  isLike: boolean("is_like").notNull(), // true for like, false for pass
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_swipe").on(table.swiperId, table.swipedUserId),
]);

// Store mutual matches
export const coogpawsMatches = pgTable("coogpaws_matches", {
  id: serial("id").primaryKey(),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true), // Can be deactivated if one user blocks/unmatches
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_match").on(table.user1Id, table.user2Id),
]);

// Messages between matched users
export const coogpawsMessages = pgTable("coogpaws_messages", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => coogpawsMatches.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User blocking system for safety
export const coogpawsBlocks = pgTable("coogpaws_blocks", {
  id: serial("id").primaryKey(),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedUserId: varchar("blocked_user_id").notNull().references(() => users.id),
  reason: varchar("reason", { length: 100 }), // harassment, inappropriate, spam, fake, other
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_block").on(table.blockerId, table.blockedUserId),
]);

// User reporting system for moderation
export const coogpawsReports = pgTable("coogpaws_reports", {
  id: serial("id").primaryKey(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // profile, message, behavior
  reason: varchar("reason", { length: 100 }).notNull(), // harassment, inappropriate_content, fake_profile, spam, other
  description: text("description"), // Additional details from reporter
  status: varchar("status", { length: 20 }).default("pending"), // pending, reviewed, resolved, dismissed
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many, one }) => ({
  identities: many(userIdentities),
  forumTopics: many(forumTopics),
  forumPosts: many(forumPosts),
  newsArticles: many(newsArticles),
  newsComments: many(newsComments),
  events: many(events),
  shoppingCart: many(shoppingCart),
  orders: many(orders),
  notifications: many(notifications),
  eventRsvps: many(eventRsvps),
  coogpawsProfile: one(coogpawsProfiles),
  swipesMade: many(coogpawsSwipes, { relationName: "swiper" }),
  swipesReceived: many(coogpawsSwipes, { relationName: "swiped" }),
  messagesSent: many(coogpawsMessages),
}));

export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  user: one(users, {
    fields: [userIdentities.userId],
    references: [users.id],
  }),
}));

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  topics: many(forumTopics),
}));

export const forumTopicsRelations = relations(forumTopics, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumTopics.categoryId],
    references: [forumCategories.id],
  }),
  author: one(users, {
    fields: [forumTopics.authorId],
    references: [users.id],
  }),
  posts: many(forumPosts),
}));

export const forumPostsRelations = relations(forumPosts, ({ one }) => ({
  topic: one(forumTopics, {
    fields: [forumPosts.topicId],
    references: [forumTopics.id],
  }),
  author: one(users, {
    fields: [forumPosts.authorId],
    references: [users.id],
  }),
}));

export const newsArticlesRelations = relations(newsArticles, ({ one, many }) => ({
  author: one(users, {
    fields: [newsArticles.authorId],
    references: [users.id],
  }),
  comments: many(newsComments),
}));

export const newsCommentsRelations = relations(newsComments, ({ one }) => ({
  article: one(newsArticles, {
    fields: [newsComments.articleId],
    references: [newsArticles.id],
  }),
  author: one(users, {
    fields: [newsComments.authorId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [events.createdById],
    references: [users.id],
  }),
  rsvps: many(eventRsvps),
}));

export const shoppingCartRelations = relations(shoppingCart, ({ one }) => ({
  user: one(users, {
    fields: [shoppingCart.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [shoppingCart.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));

// Coog Paws Relations
export const coogpawsProfilesRelations = relations(coogpawsProfiles, ({ one }) => ({
  user: one(users, {
    fields: [coogpawsProfiles.userId],
    references: [users.id],
  }),
}));

export const coogpawsSwipesRelations = relations(coogpawsSwipes, ({ one }) => ({
  swiper: one(users, {
    fields: [coogpawsSwipes.swiperId],
    references: [users.id],
    relationName: "swiper",
  }),
  swipedUser: one(users, {
    fields: [coogpawsSwipes.swipedUserId],
    references: [users.id],
    relationName: "swiped",
  }),
}));

export const coogpawsMatchesRelations = relations(coogpawsMatches, ({ one, many }) => ({
  user1: one(users, {
    fields: [coogpawsMatches.user1Id],
    references: [users.id],
    relationName: "match_user1",
  }),
  user2: one(users, {
    fields: [coogpawsMatches.user2Id],
    references: [users.id],
    relationName: "match_user2",
  }),
  messages: many(coogpawsMessages),
}));

export const coogpawsMessagesRelations = relations(coogpawsMessages, ({ one }) => ({
  match: one(coogpawsMatches, {
    fields: [coogpawsMessages.matchId],
    references: [coogpawsMatches.id],
  }),
  sender: one(users, {
    fields: [coogpawsMessages.senderId],
    references: [users.id],
  }),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User identity types  
export type InsertUserIdentity = typeof userIdentities.$inferInsert;
export type UserIdentity = typeof userIdentities.$inferSelect;

// Safe user type for API responses - excludes sensitive fields
export type SafeUser = Omit<User, 'passwordHash' | 'backupEmail' | 'hasConsentedToDataUse' | 'hasConsentedToMarketing' | 'consentedAt'>;

// Utility function to create safe user response
export function createSafeUser(user: User): SafeUser {
  const { passwordHash, backupEmail, hasConsentedToDataUse, hasConsentedToMarketing, consentedAt, ...safeUser } = user;
  return safeUser;
}

export type InsertForumCategory = typeof forumCategories.$inferInsert;
export type ForumCategory = typeof forumCategories.$inferSelect;

export type InsertForumTopic = typeof forumTopics.$inferInsert;
export type ForumTopic = typeof forumTopics.$inferSelect;

export type InsertForumPost = typeof forumPosts.$inferInsert;
export type ForumPost = typeof forumPosts.$inferSelect;

export type InsertNewsArticle = typeof newsArticles.$inferInsert;
export type NewsArticle = typeof newsArticles.$inferSelect;

export type InsertNewsComment = typeof newsComments.$inferInsert;
export type NewsComment = typeof newsComments.$inferSelect;

export type InsertEvent = typeof events.$inferInsert;
export type Event = typeof events.$inferSelect;

export type InsertProduct = typeof products.$inferInsert;
export type Product = typeof products.$inferSelect;

export type InsertShoppingCart = typeof shoppingCart.$inferInsert;
export type ShoppingCart = typeof shoppingCart.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

export type InsertHallOfFame = typeof hallOfFame.$inferInsert;
export type HallOfFame = typeof hallOfFame.$inferSelect;

export type InsertEventRsvp = typeof eventRsvps.$inferInsert;
export type EventRsvp = typeof eventRsvps.$inferSelect;

export type InsertCampusLocation = typeof campusLocations.$inferInsert;
export type CampusLocation = typeof campusLocations.$inferSelect;

// Coog Paws Community App Types
export type InsertCoogpawsProfile = typeof coogpawsProfiles.$inferInsert;
export type CoogpawsProfile = typeof coogpawsProfiles.$inferSelect;

export type InsertCoogpawsSwipe = typeof coogpawsSwipes.$inferInsert;
export type CoogpawsSwipe = typeof coogpawsSwipes.$inferSelect;

export type InsertCoogpawsMatch = typeof coogpawsMatches.$inferInsert;
export type CoogpawsMatch = typeof coogpawsMatches.$inferSelect;

export type InsertCoogpawsMessage = typeof coogpawsMessages.$inferInsert;
export type CoogpawsMessage = typeof coogpawsMessages.$inferSelect;

// Coog Paws Block and Report types
export type CoogpawsBlock = typeof coogpawsBlocks.$inferSelect;
export type InsertCoogpawsBlock = typeof coogpawsBlocks.$inferInsert;
export type CoogpawsReport = typeof coogpawsReports.$inferSelect;
export type InsertCoogpawsReport = typeof coogpawsReports.$inferInsert;

// Zod schemas for validation
export const insertUserIdentitySchema = createInsertSchema(userIdentities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForumCategorySchema = createInsertSchema(forumCategories).omit({
  id: true,
  createdAt: true,
});

export const insertForumTopicSchema = createInsertSchema(forumTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  replyCount: true,
  lastReplyAt: true,
  lastReplyById: true,
});

// Safe update schemas for user edits (only allow title and content)
export const updateForumTopicSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const updateForumPostSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
  commentCount: true,
  slug: true,
});

export const insertNewsCommentSchema = createInsertSchema(newsComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShoppingCartSchema = createInsertSchema(shoppingCart).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertHallOfFameSchema = createInsertSchema(hallOfFame).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});

export const insertCampusLocationSchema = createInsertSchema(campusLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Coog Paws Zod schemas for validation
export const insertCoogpawsProfileSchema = createInsertSchema(coogpawsProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoogpawsSwipeSchema = createInsertSchema(coogpawsSwipes).omit({
  id: true,
  createdAt: true,
});

export const insertCoogpawsMatchSchema = createInsertSchema(coogpawsMatches).omit({
  id: true,
  createdAt: true,
});

export const insertCoogpawsMessageSchema = createInsertSchema(coogpawsMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCoogpawsBlockSchema = createInsertSchema(coogpawsBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertCoogpawsReportSchema = createInsertSchema(coogpawsReports).omit({
  id: true,
  createdAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
});

// Password validation requirements
export const passwordRequirements = {
  minLength: 9,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialCharsRegex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
};

// Password validation schema with comprehensive requirements
export const passwordSchema = z.string()
  .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(passwordRequirements.specialCharsRegex, "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\"\\,.<>?/)");

// Backup email validation schema
export const backupEmailSchema = z.string().email("Please enter a valid email address").optional();

// User profile completion schema with all required fields and validation
export const userProfileCompletionSchema = z.object({
  handle: z.string().min(3, "Handle must be at least 3 characters").max(30, "Handle must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  nickname: z.string().optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, "State must be 2 characters").regex(/^[A-Z]{2}$/, "State must be in format like TX").optional(),
  zipCode: z.string().min(5, "ZIP code must be at least 5 characters").max(10).optional(),
  dateOfBirth: z.coerce.date().optional(), // Converts string to Date automatically
  graduationYear: z.number().int().min(1950).max(2050, "Please enter a valid graduation year").optional(),
  fanType: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"]).optional(),
  interest: z.string().optional(),
  suggestionBox: z.string().optional(),
  memberCategory: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"], { required_error: "Please select a member category" }),
  // Comments and favorite sports
  commentsAndSuggestions: z.string().optional(),
  favoriteSports: z.array(z.enum(["football", "basketball", "other"])).optional(),
  otherSportComment: z.string().optional(),
  hasConsentedToDataUse: z.boolean().refine(val => val === true, "You must consent to data use to continue"),
  hasConsentedToMarketing: z.boolean().optional(),
  
  // Enhanced membership fields
  aboutMe: z.string().max(2000, "About me must be less than 2000 characters").optional(),
  interests: z.string().max(1000, "Interests must be less than 1000 characters").optional(),
  affiliation: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"]).optional(),
  defaultAvatarChoice: z.number().int().min(1).max(5, "Avatar choice must be between 1 and 5").optional(),
  majorOrDepartment: z.string().max(120, "Major/Department must be less than 120 characters").optional(),
  socialLinks: z.object({
    twitter: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal('')),
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal('')),
    instagram: z.string().url("Please enter a valid Instagram URL").optional().or(z.literal('')),
    facebook: z.string().url("Please enter a valid Facebook URL").optional().or(z.literal('')),
    website: z.string().url("Please enter a valid website URL").optional().or(z.literal('')),
  }).optional(),
  addressLine1: z.string().max(100, "Address line 1 must be less than 100 characters").optional(),

  country: z.string().max(50, "Country must be less than 50 characters").optional(),
  optInOffers: z.boolean().optional(),
  
  // Optional password fields for local account creation
  password: passwordSchema.optional(),
  confirmPassword: z.string().optional(),
  backupEmail: backupEmailSchema,
}).refine((data) => {
  // If password is provided, confirmPassword must match
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

// User profile update schema (for existing users)
export const userProfileUpdateSchema = createInsertSchema(users).omit({
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  postCount: true,
  threadCount: true,
  achievementLevel: true,
  lastAchievementDate: true,
  reputation: true,
  isOnline: true,
  lastActiveAt: true,
}).extend({
  handle: z.string().min(3, "Handle must be at least 3 characters").max(30, "Handle must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores").optional(),
  state: z.string().length(2, "State must be 2 characters").regex(/^[A-Z]{2}$/, "State must be in format like TX").optional(),
  memberCategory: z.enum(["Alum", "Undergrad", "Post Grad", "Faculty", "Staff", "Fan"]).optional(),
  
  // Enhanced membership fields
  aboutMe: z.string().max(2000, "About me must be less than 2000 characters").optional(),
  interests: z.string().max(1000, "Interests must be less than 1000 characters").optional(),
  affiliation: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"]).optional(),
  defaultAvatarChoice: z.number().int().min(1).max(5, "Avatar choice must be between 1 and 5").optional(),
  graduationYear: z.number().int().min(1950).max(2050, "Please enter a valid graduation year").optional(),
  majorOrDepartment: z.string().max(120, "Major/Department must be less than 120 characters").optional(),
  socialLinks: z.object({
    twitter: z.string().url("Please enter a valid Twitter URL").optional(),
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional(),
    instagram: z.string().url("Please enter a valid Instagram URL").optional(),
    facebook: z.string().url("Please enter a valid Facebook URL").optional(),
    website: z.string().url("Please enter a valid website URL").optional(),
  }).optional(),
  addressLine1: z.string().max(100, "Address line 1 must be less than 100 characters").optional(),

  country: z.string().max(50, "Country must be less than 50 characters").optional(),
  optInOffers: z.boolean().optional(),
});

// Local account registration schema (password-based registration)
export const localAccountRegistrationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  handle: z.string().min(3, "Handle must be at least 3 characters").max(30, "Handle must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, and underscores"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  nickname: z.string().optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
  backupEmail: backupEmailSchema,
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 characters").regex(/^[A-Z]{2}$/, "State must be in format like TX"),
  zipCode: z.string().min(5, "ZIP code is required").max(10),
  dateOfBirth: z.coerce.date(),
  graduationYear: z.number().int().min(1950).max(2050, "Please enter a valid graduation year").optional(),
  fanType: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"]).optional(),
  interest: z.string().optional(),
  suggestionBox: z.string().optional(),
  memberCategory: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"], { required_error: "Please select a member category" }),
  // Comments and favorite sports
  commentsAndSuggestions: z.string().optional(),
  favoriteSports: z.array(z.enum(["football", "basketball", "other"])).optional(),
  otherSportComment: z.string().optional(),
  hasConsentedToDataUse: z.boolean().refine(val => val === true, "You must consent to data use to continue"),
  hasConsentedToMarketing: z.boolean().optional(),
  
  // Enhanced membership fields
  aboutMe: z.string().max(2000, "About me must be less than 2000 characters").optional(),
  interests: z.string().max(1000, "Interests must be less than 1000 characters").optional(),
  affiliation: z.enum(["Student", "Ex-Student", "Graduate", "Post Graduate", "Faculty", "Staff", "Coog Crazy Fan", "Friend"]).optional(),
  defaultAvatarChoice: z.number().int().min(1).max(5, "Avatar choice must be between 1 and 5").optional(),
  majorOrDepartment: z.string().max(120, "Major/Department must be less than 120 characters").optional(),
  socialLinks: z.object({
    twitter: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal('')),
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal('')),
    instagram: z.string().url("Please enter a valid Instagram URL").optional().or(z.literal('')),
    facebook: z.string().url("Please enter a valid Facebook URL").optional().or(z.literal('')),
    website: z.string().url("Please enter a valid website URL").optional().or(z.literal('')),
  }).optional(),
  addressLine1: z.string().max(100, "Address line 1 must be less than 100 characters").optional(),

  country: z.string().max(50, "Country must be less than 50 characters").optional(),
  optInOffers: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

// Local login schema - accepts username, email, or social media account
export const localLoginSchema = z.object({
  handle: z.string().min(3, "Username or email must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

// Password strength calculation utility
export function calculatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  color: string;
  label: string;
} {
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= passwordRequirements.minLength) {
    score += 20;
  } else {
    feedback.push(`Use at least ${passwordRequirements.minLength} characters`);
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add lowercase letters");
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add uppercase letters");
  }
  
  // Numbers check
  if (/[0-9]/.test(password)) {
    score += 20;
  } else {
    feedback.push("Add numbers");
  }
  
  // Special characters check
  if (passwordRequirements.specialCharsRegex.test(password)) {
    score += 20;
  } else {
    feedback.push("Add special characters (!@#$%^&*...)");
  }
  
  // Additional points for length
  if (password.length >= 12) score += 5;
  if (password.length >= 16) score += 5;
  
  // Determine color and label
  let color: string;
  let label: string;
  
  if (score < 40) {
    color = "red";
    label = "Very Weak";
  } else if (score < 60) {
    color = "orange";
    label = "Weak";
  } else if (score < 80) {
    color = "yellow";
    label = "Fair";
  } else if (score < 100) {
    color = "green";
    label = "Strong";
  } else {
    color = "darkgreen";
    label = "Very Strong";
  }
  
  return { score, feedback, color, label };
}

// Achievement levels system with exact ranks and thresholds
export const achievementLevels = [
  { level: "Rookie", threshold: 0, description: "Just getting started" },
  { level: "Bronze Star", threshold: 200, description: "Active community member" },
  { level: "Silver Star", threshold: 500, description: "Regular contributor" },
  { level: "Gold Star", threshold: 1000, description: "Valued member" },
  { level: "Diamond Star", threshold: 2000, description: "Exceptional contributor" },
  { level: "Platinum Member", threshold: 3000, description: "Elite community member" },
  { level: "MVP Status", threshold: 4000, description: "Most valuable player" },
  { level: "Captain of the Team", threshold: 5000, description: "Team leader" },
  { level: "Heisman", threshold: 10000, description: "Outstanding performer" },
  { level: "Grad Asst Coach", threshold: 15000, description: "Mentor and guide" },
  { level: "Assistant Coach", threshold: 20000, description: "Community leader" },
  { level: "Head Coach", threshold: 25000, description: "Ultimate achievement" },
] as const;

export type AchievementLevel = typeof achievementLevels[number]["level"];

// Helper function to determine achievement level based on post count
export function getAchievementLevel(postCount: number): AchievementLevel {
  // Find the highest achievement level the user qualifies for
  let currentLevel: typeof achievementLevels[number] = achievementLevels[0]; // Default to "Rookie"
  
  for (const level of achievementLevels) {
    if (postCount >= level.threshold) {
      currentLevel = level;
    } else {
      break;
    }
  }
  
  return currentLevel.level;
}

// Helper function to get next achievement level and posts needed
export function getNextAchievement(postCount: number): { 
  nextLevel: AchievementLevel | null, 
  postsNeeded: number,
  currentLevel: AchievementLevel 
} {
  const currentLevel = getAchievementLevel(postCount);
  const currentLevelIndex = achievementLevels.findIndex(level => level.level === currentLevel);
  
  if (currentLevelIndex < achievementLevels.length - 1) {
    const nextLevel = achievementLevels[currentLevelIndex + 1];
    return {
      nextLevel: nextLevel.level,
      postsNeeded: nextLevel.threshold - postCount,
      currentLevel
    };
  }
  
  return {
    nextLevel: null,
    postsNeeded: 0,
    currentLevel
  };
}

// Helper function to check if user earned a new achievement
export function checkForNewAchievement(
  oldPostCount: number, 
  newPostCount: number
): { earned: boolean, newLevel?: AchievementLevel } {
  const oldLevel = getAchievementLevel(oldPostCount);
  const newLevel = getAchievementLevel(newPostCount);
  
  if (oldLevel !== newLevel) {
    return { earned: true, newLevel };
  }
  
  return { earned: false };
}

// User statistics interface for backend calculations
export interface UserStatistics {
  userId: string;
  postCount: number;
  threadCount: number;
  achievementLevel: AchievementLevel;
  signupDate: Date;
  lastAchievementDate?: Date;
  daysSinceSignup: number;
  postsThisWeek: number;
  postsThisMonth: number;
}

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  identifier: z.string().min(1, "Email or handle is required"), // Can be email or handle
});

export const passwordResetVerifyMfaSchema = z.object({
  identifier: z.string().min(1, "Email or handle is required"),
  mfaToken: z.string().length(6, "MFA token must be 6 digits").regex(/^\d{6}$/, "MFA token must contain only digits"),
});

export const passwordResetCompleteSchema = z.object({
  identifier: z.string().min(1, "Email or handle is required"),
  mfaToken: z.string().length(6, "MFA token must be 6 digits").regex(/^\d{6}$/, "MFA token must contain only digits"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

// Phone number validation schema
export const phoneNumberSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be less than 15 digits")
  .regex(/^[\+]?[\d\s\-\(\)]+$/, "Phone number contains invalid characters")
  .optional();

// Rate limiting table for durable rate limiting
export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull(), // IP address or user ID
  type: varchar("type", { length: 50 }).notNull(), // 'password_reset', 'login', 'mfa', etc.
  attempts: integer("attempts").default(1).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  lastAttempt: timestamp("last_attempt").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for efficient lookups
  index("idx_rate_limits_key_type").on(table.key, table.type),
  index("idx_rate_limits_window_start").on(table.windowStart),
  // Ensure unique key-type combinations
  unique("unique_key_type").on(table.key, table.type),
]);

// Rate limiting types and schemas
export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;

export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AI Chat and Learning Schemas
export const aiChatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000, "Message too long"),
  timestamp: z.date(),
  userId: z.string().optional(),
});

export const aiConversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  messages: z.array(aiChatMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const aiLearningDataSchema = z.object({
  id: z.number(),
  userInput: z.string(),
  aiOutput: z.string(),
  feedback: z.enum(["1", "-1"]).optional(), // "1" = good, "-1" = bad
  userId: z.string().optional(),
  createdAt: z.date(),
});

export const aiChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  conversationId: z.string().optional(),
});

export const aiFeedbackSchema = z.object({
  id: z.number(),
  feedback: z.enum(["1", "-1"]),
});

// AI Chat Types
export type AIChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AIConversation = z.infer<typeof aiConversationSchema>;
export type AILearningData = z.infer<typeof aiLearningDataSchema>;
export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AIFeedback = z.infer<typeof aiFeedbackSchema>;
