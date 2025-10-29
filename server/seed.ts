import { db } from "./db";
import { 
  forumCategories, 
  hallOfFame, 
  products,
  newsArticles,
  events
} from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Seed forum categories with the requested new ones
  const categories = [
    {
      name: "Football",
      description: "Houston Cougar Football discussion, news, and analysis",
      slug: "football",
      icon: "fas fa-football-ball",
      color: "#DC2626",
      sortOrder: 1
    },
    {
      name: "Basketball",
      description: "Houston Cougar Basketball - Men's and Women's teams",
      slug: "basketball", 
      icon: "fas fa-basketball-ball",
      color: "#EA580C",
      sortOrder: 2
    },
    {
      name: "Other Sports Men",
      description: "All other Houston Cougar men's athletics",
      slug: "other-sports",
      icon: "fas fa-trophy",
      color: "#0284C7",
      sortOrder: 3
    },
    {
      name: "Recruiting",
      description: "Houston Cougar recruiting news and discussions",
      slug: "recruiting",
      icon: "fas fa-search",
      color: "#DC2626",
      sortOrder: 4
    },
    {
      name: "Water Cooler Talk",
      description: "General discussions and off-topic conversations",
      slug: "water-cooler",
      icon: "fas fa-coffee",
      color: "#6B7280",
      sortOrder: 5
    },
    {
      name: "Coogpaws",
      description: "Dating, relationships, and meeting fellow Coogs",
      slug: "coogpaws",
      icon: "fas fa-heart",
      color: "#EC4899",
      sortOrder: 6
    },
    {
      name: "UH Hall of Fame",
      description: "Celebrating famous UH alumni, athletes, coaches, and faculty",
      slug: "hall-of-fame",
      icon: "fas fa-medal",
      color: "#DC2626",
      sortOrder: 7
    },
    {
      name: "Baseball",
      description: "Houston Cougar Baseball discussion and updates",
      slug: "baseball",
      icon: "fas fa-baseball-ball",
      color: "#16A34A",
      sortOrder: 8
    },
    {
      name: "Golf",
      description: "Houston Cougar Golf team discussions",
      slug: "golf",
      icon: "fas fa-golf-ball",
      color: "#059669",
      sortOrder: 9
    },
    {
      name: "Track & Field",
      description: "Houston Cougar Track & Field athletics",
      slug: "track-field",
      icon: "fas fa-running",
      color: "#7C3AED",
      sortOrder: 10
    },
    {
      name: "Women's Sports",
      description: "All Houston Cougar women's athletics",
      slug: "womens-sports",
      icon: "fas fa-venus",
      color: "#EC4899",
      sortOrder: 11
    },
    {
      name: "Women's Basketball",
      description: "Houston Cougar Women's Basketball team",
      slug: "womens-basketball",
      icon: "fas fa-basketball-ball",
      color: "#F97316",
      sortOrder: 12
    },
    {
      name: "Women's Golf",
      description: "Houston Cougar Women's Golf team",
      slug: "womens-golf",
      icon: "fas fa-golf-ball",
      color: "#10B981",
      sortOrder: 13
    },
    {
      name: "Women's Soccer",
      description: "Houston Cougar Women's Soccer team",
      slug: "womens-soccer",
      icon: "fas fa-futbol",
      color: "#06B6D4",
      sortOrder: 14
    },
    {
      name: "Softball",
      description: "Houston Cougar Softball team",
      slug: "softball",
      icon: "fas fa-baseball-ball",
      color: "#F59E0B",
      sortOrder: 15
    },
    {
      name: "Women's Tennis",
      description: "Houston Cougar Women's Tennis team",
      slug: "womens-tennis",
      icon: "fas fa-table-tennis",
      color: "#84CC16",
      sortOrder: 16
    },
    {
      name: "Women's Track & Field",
      description: "Houston Cougar Women's Track & Field athletics",
      slug: "womens-track-field",
      icon: "fas fa-running",
      color: "#8B5CF6",
      sortOrder: 17
    },
    {
      name: "Women's Swimming & Diving",
      description: "Houston Cougar Women's Swimming & Diving teams",
      slug: "womens-swimming-diving",
      icon: "fas fa-swimmer",
      color: "#14B8A6",
      sortOrder: 18
    },
    {
      name: "Campus Events",
      description: "Discuss and share campus events, meetups, and social gatherings",
      slug: "campus-events",
      icon: "fas fa-calendar-alt",
      color: "#0891B2",
      sortOrder: 19
    }
  ];

  console.log("📁 Seeding forum categories...");
  for (const category of categories) {
    await db.insert(forumCategories).values(category).onConflictDoUpdate({
      target: forumCategories.slug,
      set: {
        description: category.description,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        isActive: true
      }
    });
  }

  // Seed Hall of Fame entries
  const hallOfFameEntries = [
    {
      name: "Case Keenum",
      category: "athlete",
      description: "Former Houston Cougar quarterback who led the team to multiple successful seasons",
      achievements: "NFL quarterback, led UH to Conference USA championship, holder of multiple NCAA passing records",
      sport: "football",
      graduationYear: 2011,
      imageUrl: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=400&h=400&fit=crop"
    },
    {
      name: "Hakeem Olajuwon",
      category: "athlete", 
      description: "Basketball legend and NBA Hall of Famer",
      achievements: "NBA Champion, NBA Finals MVP, NBA MVP, Basketball Hall of Fame inductee",
      sport: "basketball",
      graduationYear: 1984,
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop"
    },
    {
      name: "Tom Herman",
      category: "coach",
      description: "Former Houston Cougar football head coach",
      achievements: "Led UH to multiple bowl games and top 25 rankings, developed explosive offensive system",
      sport: "football",
      imageUrl: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400&h=400&fit=crop"
    },
    {
      name: "Dr. Paula M. Short",
      category: "faculty",
      description: "Renowned education administrator and former UH College of Education dean",
      achievements: "Pioneer in educational leadership, published researcher, administrative excellence",
      department: "Education",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop"
    }
  ];

  console.log("🏆 Seeding Hall of Fame entries...");
  for (const entry of hallOfFameEntries) {
    await db.insert(hallOfFame).values(entry).onConflictDoNothing();
  }

  // Seed some sample products
  const sampleProducts = [
    {
      name: "CoogsNation Baseball Cap",
      description: "Official Houston Cougars baseball cap with embroidered logo",
      price: "29.99",
      category: "apparel",
      stockQuantity: 50,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    },
    {
      name: "UH Hoodie - Red",
      description: "Comfortable Houston Cougars hoodie in signature red",
      price: "49.99", 
      category: "apparel",
      stockQuantity: 30,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    },
    {
      name: "Cougar Pride T-Shirt",
      description: "Classic Houston Cougars t-shirt for every fan",
      price: "19.99",
      category: "apparel", 
      stockQuantity: 75,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    }
  ];

  console.log("🛍️ Seeding products...");
  for (const product of sampleProducts) {
    await db.insert(products).values(product).onConflictDoNothing();
  }

  console.log("✅ Database seeding completed!");
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };