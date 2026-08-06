#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
let assertions = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

function sourceFiles(relativeRoot) {
  const base = path.join(root, relativeRoot);
  const results = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (["node_modules", "dist", "build"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) results.push(absolute);
    }
  };
  walk(base);
  return results;
}

const clientFiles = sourceFiles("client/src");
const clientSource = clientFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const app = read("client/src/App.tsx");
const header = read("client/src/components/Header.tsx");
const footer = read("client/src/components/Footer.tsx");
const forums = read("client/src/pages/Forums.tsx");
const forumCategory = read("client/src/pages/ForumCategory.tsx");
const forumTopic = read("client/src/pages/ForumTopic.tsx");
const lounge = read("client/src/pages/CoogpawsChat.tsx");
const eventManagement = read("client/src/pages/EventManagement.tsx");
const dashboard = read("client/src/pages/MemberDashboard.tsx");
const routes = read("server/routes.ts");
const storage = read("server/storage.ts");
const schema = read("shared/schema.ts");
const seed = read("server/seed.ts");
const migration = read("migrations/0008_forum_navigation_cleanup.sql");

// Canonical routes and mobile navigation.
assert(app.includes('<Route path="/forums/:categorySlug" component={ForumCategory} />'), "Canonical forum slug route is missing.");
assert(app.includes('<Route path="/forums/categories/:categoryId" component={ForumCategory} />'), "Legacy numeric forum route is missing for compatibility.");
assert(app.includes('<Route path="/reset-password" component={ResetPassword} />'), "Password reset route is missing.");
assert(header.includes('data-testid="button-mobile-menu"'), "Mobile navigation trigger is missing.");
assert(header.includes('id="mobile-navigation"'), "Mobile navigation drawer is missing.");
assert(header.includes("Standard Board") && header.includes("Coog Paws Lounge") && header.includes("Water Cooler Talk"), "Mobile/header community destinations are incomplete.");
function openingButtonTagForTestId(source, testId) {
  const marker = `data-testid="${testId}"`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = source.lastIndexOf("<button", markerIndex);
  const end = source.indexOf(">", markerIndex);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end + 1);
}

for (const testId of [
  "button-community-menu",
  "button-login-dropdown",
  "button-join-dropdown",
  "button-mobile-menu",
]) {
  const buttonTag = openingButtonTagForTestId(header, testId);
  assert(buttonTag.includes("onClick="), `${testId} must be operated by click/touch.`);
  assert(buttonTag.includes("aria-expanded="), `${testId} must expose its open state to assistive technology.`);
}
assert(!header.includes("group-hover:"), "Header navigation must not depend on hover-only CSS state.");

// Water Cooler and category routing.
assert(exists("client/src/lib/forumNavigation.ts"), "Forum navigation helper is missing.");
assert(read("client/src/lib/forumNavigation.ts").includes('slug: "water-cooler"'), "Water Cooler canonical slug is missing.");
assert(!/\/forums\/categories\/\d+/.test(clientSource), "A hard-coded forum database ID remains in client navigation.");
assert(forumCategory.includes("resolveForumCategory") && forumCategory.includes("forumCategoryPath(currentCategory.slug)"), "Numeric-to-slug category resolution/redirect is missing.");
assert(forumCategory.includes("Forum category not found"), "Invalid forum category safeguard is missing.");
assert(forumCategory.includes('currentCategory.slug === "water-cooler"'), "Water Cooler guidelines are not bound to the canonical slug.");

// Standard board correctness.
assert(forums.includes('/api/forums/categories'), "Forums page does not load real categories.");
assert(forums.includes('/api/forums/recent?limit=6'), "Forums page does not load real recent activity.");
assert(!/User[1-5]/.test(forums), "Static fake forum users remain.");
assert(!/(2,847|15,429|89,341)/.test(forums), "Fabricated forum statistics remain.");
assert(!forums.includes("Coogs Lounge"), "Legacy Coogs Lounge placeholder remains.");
assert(forumTopic.includes('apiRequest("POST", "/api/forums/posts", data)'), "Forum reply API request order is incorrect.");
assert(forumTopic.includes("Topic not found"), "Invalid forum topic safeguard is missing.");
assert(!forumTopic.includes("Previous Topic") && !forumTopic.includes("Next Topic"), "Inert topic navigation controls remain.");
assert(forumTopic.includes('/api/forums/posts/${postId}/report'), "Forum post report control is not connected to the server.");
assert(routes.includes("app.post('/api/forums/posts/:postId/report'"), "Forum post report endpoint is missing.");
assert(routes.includes("This topic is locked") && routes.includes("Forum category not found"), "Forum reply endpoint does not reject locked or retired discussions.");
assert(storage.includes("getRecentForumTopics") && storage.includes("createForumPostReport"), "Forum storage support is incomplete.");
assert(schema.includes('pgTable("forum_post_reports"'), "Forum report schema is missing.");

// Coog Paws is the immersive lounge only; retired profile-matching code stays gone.
assert(lounge.includes('navigate("/forums")') && lounge.includes("Standard Board"), "Coog Paws lacks a Standard Board exit.");
assert(lounge.includes('navigate("/community")') && lounge.includes("Exit Lounge"), "Coog Paws lacks a community exit.");
assert(!exists("client/src/components/CoogpawsApp.tsx"), "Retired Coogpaws profile-matching component still exists.");
for (const forbidden of [
  "/api/coogpaws/",
  "coogpaws_profiles",
  "coogpaws_swipes",
  "coogpaws_matches",
  "coogpaws_messages",
  "coogpaws_blocks",
  "coogpaws_reports",
  "Dating & Relationships",
  "Coogs Lounge",
]) {
  assert(!`${clientSource}\n${routes}\n${storage}\n${schema}\n${seed}`.includes(forbidden), `Retired community code remains: ${forbidden}`);
}
assert(!/slug:\s*["']coogpaws["']/.test(seed), "Retired Coogpaws forum category is still seeded.");
assert(migration.includes("UPDATE forum_topics") && migration.includes("SET is_active = false"), "Legacy category migration does not preserve topics and retire the category.");
assert(migration.includes("AND is_active = true"), "Legacy category migration must run only for the active legacy category.");
assert(!migration.includes("updated_at = now()"), "Administrative topic relocation must preserve original activity dates.");
assert(migration.includes("slug = 'coogpaws'") && migration.includes("slug = 'water-cooler'"), "Legacy category migration must resolve categories by slug.");

// Event/dashboard links and reset page.
assert(dashboard.includes('href="/event-management?create=1"'), "Dashboard Create Event action does not open the creation flow.");
assert(eventManagement.includes('new URLSearchParams(query).get("create") === "1"'), "Event manager does not consume the create query parameter.");
assert(exists("client/src/pages/ResetPassword.tsx"), "Password reset page is missing.");

// Static internal link audit against the application router.
const registeredRoutes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const staticLinkPatterns = [
  /\b(?:href|to)\s*=\s*["'](\/[^"']*)["']/g,
  /\bnavigate\(\s*["'](\/[^"']*)["']/g,
  /\bsetLocation\(\s*["'](\/[^"']*)["']/g,
  /window\.location\.href\s*=\s*["'](\/[^"']*)["']/g,
];
const internalTargets = new Set();
for (const file of clientFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of staticLinkPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const target = match[1].split("?")[0].split("#")[0] || "/";
      if (!target.startsWith("/api/")) internalTargets.add(target);
    }
  }
}
function routeMatches(route, target) {
  const routeParts = route.split("/").filter(Boolean);
  const targetParts = target.split("/").filter(Boolean);
  if (routeParts.length !== targetParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(":") || part === targetParts[index]);
}
for (const target of [...internalTargets].sort()) {
  assert(registeredRoutes.some((route) => routeMatches(route, target)), `Internal link has no registered route: ${target}`);
}

// Broken/placeholder links and known duplicate dead pages.
assert(!/href\s*=\s*["']#["']/.test(clientSource), "Placeholder href=\"#\" remains in client source.");
for (const retiredFile of [
  "client/src/pages/Landing.tsx",
  "client/src/pages/LandingClean.tsx",
  "client/src/pages/LandingCougarPhoto.tsx",
  "client/src/pages/LandingExact.tsx",
  "client/src/pages/LandingFinal.tsx",
  "client/src/pages/LandingHTML.tsx",
  "client/src/pages/LandingNew.tsx",
  "client/src/pages/LandingTest.tsx",
  "client/src/pages/Home.tsx",
  "client/src/pages/AdminDashboard.tsx",
  "client/src/pages/SimpleAdminDashboard.tsx",
  "client/src/pages/TestAdmin.tsx",
]) {
  assert(!exists(retiredFile), `Dead duplicate page remains: ${retiredFile}`);
}

if (failures.length) {
  console.error(`Navigation/community regression FAILED: ${failures.length}/${assertions} assertions failed.`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Navigation/community regression PASS: ${assertions}/${assertions} assertions.`);
