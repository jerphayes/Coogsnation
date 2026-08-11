import type { ForumCategory } from "@shared/schema";

/**
 * Canonical forum navigation uses category slugs, never database IDs.
 * IDs are database implementation details and can change after reseeding,
 * restoring a backup, or moving the app to a new environment.
 */
export function forumCategoryPath(slug: string): string {
  return `/forums/${encodeURIComponent(slug)}`;
}

export const FORUM_NAVIGATION = {
  football: { label: "Football", slug: "football" },
  basketball: { label: "Basketball", slug: "basketball" },
  baseball: { label: "Baseball", slug: "baseball" },
  recruiting: { label: "Recruiting", slug: "recruiting" },
  waterCooler: { label: "Water Cooler Talk", slug: "water-cooler-talk" },
  hallOfFame: { label: "UH Hall of Fame", slug: "uh-hall-of-fame" },
} as const;

export const LEGACY_COOGPAWS_FORUM_SLUG = "coogpaws";

/**
 * The retired profile-matching category must not reappear in forum
 * navigation. The immersive lounge remains available at /coogpaws-chat.
 */
export function isVisibleForumCategory(category: ForumCategory): boolean {
  return (
    category.isActive !== false &&
    category.slug !== LEGACY_COOGPAWS_FORUM_SLUG &&
    category.slug !== "premium-lounge"
  );
}

export function resolveForumCategory(
  categories: ForumCategory[] | undefined,
  params: { categorySlug?: string; categoryId?: string },
): ForumCategory | undefined {
  if (!categories) return undefined;

  if (params.categorySlug) {
    const decodedSlug = decodeURIComponent(params.categorySlug).toLowerCase();
    return categories.find((category) => category.slug.toLowerCase() === decodedSlug);
  }

  if (params.categoryId && /^\d+$/.test(params.categoryId)) {
    const id = Number(params.categoryId);
    return categories.find((category) => category.id === id);
  }

  return undefined;
}
