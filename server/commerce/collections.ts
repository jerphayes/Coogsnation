import type { StorefrontCollection } from "@shared/commerce";

export const STOREFRONT_COLLECTIONS: StorefrontCollection[] = [
  {
    slug: "wear-your-pride",
    name: "Wear Your Pride",
    description: "Officially licensed apparel, headwear, game-day gear, and CoogsNation originals.",
    icon: "fas fa-tshirt",
    featured: true,
  },
  {
    slug: "everyday-alumni",
    name: "Everyday Alumni",
    description: "Office, travel, home, and everyday products selected for alumni and longtime fans.",
    icon: "fas fa-briefcase",
    featured: true,
  },
  {
    slug: "keepsakes-gifts",
    name: "Keepsakes & Gifts",
    description: "Graduation gifts, collectibles, commemorative pieces, and fan keepsakes.",
    icon: "fas fa-gift",
    featured: true,
  },
  {
    slug: "legacy-jewelry",
    name: "Legacy Jewelry & Class Rings",
    description: "High-end class rings, pendants, watches, and custom jewelry from vetted licensed partners.",
    icon: "fas fa-ring",
    featured: true,
    highValue: true,
  },
  {
    slug: "limited-editions",
    name: "Limited Editions",
    description: "Verified limited releases, premium collaborations, and special commemorative collections.",
    icon: "fas fa-certificate",
    featured: true,
    highValue: true,
  },
  {
    slug: "coogsnation-originals",
    name: "CoogsNation Originals",
    description: "Unique CoogsNation-branded products designed for this community and future fan-site families.",
    icon: "fas fa-paw",
    featured: true,
  },
];
