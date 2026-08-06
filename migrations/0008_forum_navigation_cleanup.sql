-- Retire the unused profile-matching forum category without discarding
-- member topics. The immersive Coog Paws Lounge is a separate feature at
-- /coogpaws-chat and does not use forum_categories.
DO $$
DECLARE
  legacy_category_id integer;
  water_cooler_id integer;
BEGIN
  SELECT id
    INTO legacy_category_id
    FROM forum_categories
   WHERE slug = 'coogpaws'
     AND is_active = true
   LIMIT 1;

  SELECT id
    INTO water_cooler_id
    FROM forum_categories
   WHERE slug = 'water-cooler'
   LIMIT 1;

  IF legacy_category_id IS NOT NULL AND water_cooler_id IS NOT NULL THEN
    -- Administrative relocation only: preserve each topic's real activity date.
    UPDATE forum_topics
       SET category_id = water_cooler_id
     WHERE category_id = legacy_category_id;

    UPDATE forum_categories
       SET is_active = false
     WHERE id = legacy_category_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS forum_post_reports (
  id serial PRIMARY KEY,
  post_id integer NOT NULL REFERENCES forum_posts(id),
  reported_by_id varchar NOT NULL REFERENCES users(id),
  reason varchar(50) NOT NULL,
  details text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_post_reports_post
  ON forum_post_reports(post_id);

CREATE INDEX IF NOT EXISTS idx_forum_post_reports_status
  ON forum_post_reports(status);
