// Client-facing API response types.
//
// These describe the JSON shapes returned by the Express API as observed by the
// React client. They are derived from the Drizzle row types in ./schema so that
// they stay aligned with the database, while accounting for two facts about the
// wire format:
//   1. JSON has no Date type: server Date columns arrive as ISO strings.
//   2. Several endpoints return computed aggregates that are not table rows.
//
// Endpoints whose handlers return `storage` results with a declared return type
// reuse that type here. Where the server composes a bespoke object, the shape is
// defined explicitly and annotated with the source handler for traceability.

import type {
  User,
  CampusLocation,
  Event,
  ForumCategory,
  ForumTopic,
  ForumPost,
  NewsArticle,
  Product,
  Notification,
  Order,
  ShoppingCart,
  CoogpawsProfile,
} from "./schema";

// JSON serialization turns Date into string. JsonOf<T> applies that transform
// recursively so a client type mirrors what actually arrives over the wire.
export type JsonOf<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonOf<U>>
    : T extends object
      ? { [K in keyof T]: JsonOf<T[K]> }
      : T;

// --- Community ---------------------------------------------------------------

// server: GET /api/community/stats  ->  storage.getCommunityStats()
export interface CommunityStats {
  totalMembers: number;
  onlineMembers: number;
  postsToday: number;
  newMembersToday: number;
  activeToday: number;
  newThisMonth: number;
  topContributors: number;
}

// server: GET /api/community/members/active  ->  storage.getActiveMembers()  (User[])
export type ActiveMember = JsonOf<User>;

// --- Campus ------------------------------------------------------------------

// server: GET /api/campus/locations  ->  storage.getCampusLocations()  (CampusLocation[])
export type CampusLocationResponse = JsonOf<CampusLocation>;

// server: GET /api/events/with-locations
//   -> storage.getEventsWithLocations(): Array<Event & { campusLocation?: CampusLocation }>
export type EventWithLocation = JsonOf<Event> & {
  campusLocation?: JsonOf<CampusLocation>;
};

// --- CoogPaws ----------------------------------------------------------------

// server: GET /api/coogpaws/profile   ->  storage.getCoogpawsProfile()  (may be undefined)
export type CoogpawsProfileResponse = JsonOf<CoogpawsProfile>;

// server: GET /api/coogpaws/profiles  ->  storage.getActiveCoogpawsProfiles()
// Joined with safe owner display fields (see shared/schema CoogpawsBrowseProfile).
export type { CoogpawsBrowseProfile } from "./schema";

// --- Auth --------------------------------------------------------------------

// server: GET /api/auth/user  ->  createSelfUser(user)  (own profile, sensitive fields stripped)
// Kept permissive-but-typed: the self shape is a subset of User minus secrets.
export type AuthUser = JsonOf<User>;

// server: GET /api/auth/providers
export interface AuthProviders {
  local: boolean;
  facebook: boolean;
  linkedin: boolean;
}

// --- Forums ------------------------------------------------------------------

export type ForumCategoryResponse = JsonOf<ForumCategory>;
export type ForumTopicResponse = JsonOf<ForumTopic>;
export type ForumPostResponse = JsonOf<ForumPost>;

// server: GET /api/forums/highlights  (category with a nested recent-topic summary)
export interface ForumHighlight {
  id: number;
  name: string;
  description: string | null;
  topicCount: number;
  postCount: number;
  latestTopic?: {
    id: number;
    title: string;
    createdAt: string;
  } | null;
}

// --- News --------------------------------------------------------------------

export type NewsArticleResponse = JsonOf<NewsArticle>;

// --- Events ------------------------------------------------------------------

export type EventResponse = JsonOf<Event>;

// --- Store -------------------------------------------------------------------

export type ProductResponse = JsonOf<Product>;

// --- Messages ----------------------------------------------------------------

// server: GET /api/messages/conversations
export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

// server: GET /api/messages?with=:userId
export interface DirectMessage {
  id: number;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

// server: GET /api/messages/unread/count
export interface UnreadCount {
  count: number;
}

// --- Notifications / Orders / Cart -------------------------------------------

export type NotificationResponse = JsonOf<Notification>;
export type OrderResponse = JsonOf<Order>;
export type CartItemResponse = JsonOf<ShoppingCart>;

// --- Admin -------------------------------------------------------------------

// server: GET /api/admin/stats
export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalEvents: number;
  totalProducts: number;
  newUsersToday: number;
  activeUsers: number;
}

// server: GET /api/admin/activities  (currently returns [] pending a real audit log)
export interface AdminActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

// server: GET /api/admin/recent-members  (User[])
export type RecentMember = JsonOf<User>;

// server: GET /api/admin/achievement-summary
export interface AchievementSummary {
  level: string;
  count: number;
}
