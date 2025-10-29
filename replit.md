# Overview

This is a University of Houston community platform called "CoogsNation" - a comprehensive full-stack web application that serves as the premier online community for Houston Cougar fans, students, alumni, and supporters. The platform provides advanced forums with specific categories, news management, real-time messaging, event management, merchandise store, enhanced user profiles with achievement badges, and robust community features.

## Recent Major Enhancements (January 2025)

✅ **Enhanced Forum System**: Organized forums with specific requested categories including "Water Cooler Talk", "Coogpaws" for dating, sports-specific forums (Track & Field, Baseball, Golf), and "UH Hall of Fame" for notable alumni
✅ **Content Management System**: Full NewsAdmin panel for creating, editing, and managing articles with categories and publication status
✅ **Advanced User Profiles**: Enhanced profiles with achievement badges, activity tracking, engagement levels, and privacy settings
✅ **Real-time Messaging**: Complete messaging system with conversation management and online status
✅ **Event Management**: Comprehensive event creation, RSVP system, calendar views, and category filtering
✅ **Enhanced Dashboard**: Personalized dashboard with activity feeds, quick actions, community stats, and engagement tracking
✅ **Database Integration**: Full PostgreSQL implementation with proper schema for all features
✅ **Production Deployment**: Platform successfully deployed to Replit with custom domain coogsnation.com configured
✅ **Admin Dashboard**: Simplified admin interface at `/admin` route with platform statistics and management tools
✅ **Enhanced Site-wide Navigation**: Implemented comprehensive dropdown functionality across all major navigation sections in header (Forums, Sports News, Store, Events) and landing page cards, providing quick access to subcategories from any page on the site
✅ **Community Navigation Fix**: Converted Community header button from dropdown to direct navigation link for one-click access to dedicated community page
✅ **External Link Disclaimer**: Implemented site-wide disclaimer modal that appears when users click external links, informing them they're leaving CoogsNation.com
✅ **Basketball Schedule Integration**: Added Basketball Schedule link to Sports News dropdown menu linking to official UH Athletics website
✅ **reCAPTCHA Bot Protection**: Integrated Google reCAPTCHA v2 into local account registration system to prevent spam and automated account creation, including both frontend widget and backend verification
✅ **Authentication System Fix**: Resolved critical database schema mismatch that was preventing user login and registration. Fixed by aligning schema definitions with actual database structure (January 22, 2025)
✅ **Enhanced Membership System**: Successfully implemented comprehensive membership enhancement with 11 new profile fields including About Me, interests, affiliation dropdown, avatar selection (1-5 options), graduation year, major/department, social media links (Twitter, LinkedIn, Instagram, Facebook, Website), marketing opt-in, and enhanced address fields (Address Line 1, Address Line 2, Country). Includes full database migration, frontend form validation, and secure API endpoints with Zod validation (January 22, 2025)
✅ **Avatar Upload System**: Implemented complete avatar upload and management system with disk storage, automatic image resizing to 256x256px using Sharp, file validation (JPG/PNG, 2MB limit), Cache-Control headers for performance, automatic cleanup of old avatars on replacement (supports both disk and object storage), deletion API endpoint, ProfileDisplay component, and /api/profile endpoint for profile data (January 22, 2025)
✅ **Simplified Header with Join Dropdown**: Streamlined header with CoogsNation logo (red text) and Join dropdown button featuring multi-provider OAuth options (Sign Up, Google, Apple, LinkedIn, Facebook, X/Twitter, Other) with color-coded styling (October 14, 2025)
✅ **Login & Signup Pages**: Implemented dedicated signup and login pages with localStorage-based authentication for demo purposes. Signup flow: users register at `/signup`, data stored in localStorage, then redirected to `/login/other` for authentication. LoginLocal page (`/login/other`) authenticates against localStorage and redirects to `/member-dashboard` on success. Join dropdown includes "Sign Up" link to `/signup`, Login dropdown includes "Login with Other" to `/login/other`. Separate from OAuth/backend authentication paths (October 14, 2025)
✅ **Member Dashboard**: Added MemberDashboard component at `/member-dashboard` for localStorage-authenticated users, displaying welcome message with user's name/email and delete membership functionality. Integrates with localStorage demo authentication flow (October 14, 2025)
✅ **Enhanced Join Page with Avatar**: Created comprehensive JoinPage at `/join` with avatar upload functionality supporting phone/desktop uploads, automatic default avatar generation (first letter on red background), preview display, form reset/exit buttons, and localStorage integration. Avatar is stored as base64 and displayed on member dashboard (October 14, 2025)

## Technical Notes

### Demo Authentication (localStorage)
- **Purpose**: Quick demonstration/testing flow separate from production OAuth
- **Routes**: `/signup`, `/login/other`, `/member-dashboard`
- **Storage**: Browser localStorage (client-side only)
- **Security Warning**: Demo implementation stores plaintext passwords - NOT for production use
- **Scope**: Isolated from backend authentication - purely client-side demo flow
- **Production Auth**: Use OAuth providers (Google, Apple, LinkedIn, Facebook, X/Twitter) or `/login/email` for real authentication with backend validation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent, accessible UI components
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query for server state management and caching
- **Styling**: University of Houston brand colors (red: #DC2626, black, gray) with CSS custom properties for theming

## Backend Architecture
- **Runtime**: Node.js with TypeScript and ESM modules
- **Framework**: Express.js for RESTful API endpoints
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit's OpenID Connect (OIDC) authentication system with Passport.js
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple

## Database Design
- **ORM**: Drizzle with PostgreSQL dialect for schema definition and migrations
- **Schema**: Comprehensive schema covering users, forums (categories, topics, posts), news articles with comments, events, products for merchandise, and session storage
- **Relationships**: Properly structured foreign key relationships between entities (users to posts, categories to topics, etc.)

## Authentication & Authorization
- **Provider**: Replit Auth using OpenID Connect flow
- **Session Storage**: Secure HTTP-only cookies with PostgreSQL backend storage
- **Middleware**: Authentication middleware that protects routes and provides user context
- **User Management**: Automatic user creation/update on login with profile information sync

## API Structure
- **Pattern**: RESTful API design with resource-based endpoints
- **Routes**: Organized by feature domains (auth, forums, news, events, products, community)
- **Validation**: Zod schemas for request/response validation integrated with Drizzle
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

## Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Database**: Drizzle Kit for schema migrations and database management
- **Development**: Hot reload support with Vite integration and Replit-specific development tools

# External Dependencies

## Database & ORM
- **@neondatabase/serverless**: Neon PostgreSQL serverless database client with WebSocket support
- **drizzle-orm**: Type-safe ORM for PostgreSQL operations
- **drizzle-kit**: Database migration and schema management tools

## Authentication
- **openid-client**: OpenID Connect client for Replit authentication
- **passport**: Authentication middleware framework
- **express-session**: Session management with PostgreSQL storage via connect-pg-simple

## UI & Frontend
- **@radix-ui/react-***: Comprehensive set of accessible, unstyled UI primitives (accordion, dialog, dropdown, etc.)
- **@tanstack/react-query**: Powerful data fetching and caching library
- **tailwindcss**: Utility-first CSS framework with custom University of Houston theming
- **class-variance-authority**: Type-safe variant API for component styling
- **wouter**: Minimalist routing library for React

## Development & Build
- **vite**: Fast build tool with React plugin and Replit-specific development enhancements
- **tsx**: TypeScript execution engine for Node.js development
- **esbuild**: Fast JavaScript bundler for production builds

## Utilities
- **zod**: TypeScript-first schema validation library
- **date-fns**: Modern JavaScript date utility library
- **clsx**: Utility for constructing className strings conditionally