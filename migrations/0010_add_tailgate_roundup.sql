BEGIN;

INSERT INTO forum_categories
(
  name,
  description,
  slug,
  icon,
  color,
  sort_order,
  is_active
)
VALUES
(
  'Tailgate Roundup',
  'Tailgate plans, parking lots, food, meetups, watch parties, and game-day gatherings',
  'tailgate-roundup',
  'utensils',
  'amber',
  135,
  TRUE
)
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

COMMIT;
