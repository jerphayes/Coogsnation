import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routes = read("server/routes.ts");
const commerceRoutes = read("server/commerce/routes.ts");
const store = read("client/src/pages/Store.tsx");
const catalog = read("client/src/components/store/StorefrontCatalog.tsx");
const shared = read("shared/commerce.ts");
const seed = read("server/seed.ts");
const migration = read("migrations/0007_provider_neutral_commerce.sql");

assert(!routes.includes("app.post('/api/checkout'"), "Legacy fake checkout route must remain retired");
assert(!routes.includes("app.post('/api/cart'"), "Legacy local cart mutation must remain retired");
assert(!routes.includes("PODManagerService"), "Legacy POD provider manager must remain retired");
assert(commerceRoutes.includes('/api/commerce/storefront'), "Unified storefront endpoint is required");
assert(commerceRoutes.includes('/api/commerce/inquiries'), "High-value inquiry endpoint is required");
assert(store.includes("StorefrontCatalog"), "Store page must use the unified storefront");
assert(catalog.includes("Legacy Jewelry & Class Rings") || read("server/commerce/collections.ts").includes("Legacy Jewelry & Class Rings"), "Legacy jewelry collection is required");
assert(shared.includes('"shopify_product"') && shared.includes('"affiliate_redirect"') && shared.includes('"inquiry"'), "All purchase modes must remain distinct");
assert(!seed.includes("sampleProducts"), "Fake sample merchandise must not be seeded");
assert(migration.includes("commerce_click_events") && migration.includes("commerce_inquiries"), "Revenue tracking tables are required");

console.log("commerce architecture regression: 10/10 checks passed");
