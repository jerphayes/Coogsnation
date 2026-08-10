BEGIN;

INSERT INTO forum_categories
(id, name, description, slug, icon, color, sort_order, is_active)
VALUES

(1, 'Football',
 'Houston Cougar football discussions, games, players, recruiting, and strategy',
 'football', 'football-ball', 'green', 10, TRUE),

(2, 'Basketball',
 'Houston Cougar basketball discussions, game analysis, players, and team news',
 'basketball', 'basketball-ball', 'orange', 20, TRUE),

(4, 'Recruiting',
 'Latest Houston Cougar recruiting news, prospects, commitments, and discussion',
 'recruiting', 'user-plus', 'red', 30, TRUE),

(5, 'Cougar Corner',
 'General University of Houston discussion and campus life',
 'cougar-corner', 'home', 'red', 40, TRUE),

(6, 'Politics',
 'Political discussions and current events',
 'politics', 'globe', 'blue', 50, TRUE),

(7, 'Business',
 'Career advice, entrepreneurship, markets, and business discussions',
 'business', 'briefcase', 'gray', 60, TRUE),

(8, 'Technology',
 'Technology discussions, computing, AI, gadgets, and programming',
 'technology', 'laptop', 'blue', 70, TRUE),

(9, 'Entertainment',
 'Movies, television, music, entertainment, and pop culture',
 'entertainment', 'film', 'purple', 80, TRUE),

(10, 'Food & Dining',
 'Restaurant recommendations, recipes, food, and dining discussions',
 'food-dining', 'utensils', 'orange', 90, TRUE),

(11, 'Real Estate',
 'Houston-area real estate, housing, property, and neighborhood discussion',
 'real-estate', 'home', 'green', 100, TRUE),

(12, 'Classifieds',
 'Buy, sell, and trade with fellow Coogs',
 'classifieds', 'shopping-cart', 'blue', 110, TRUE),

(13, 'Premium Lounge',
 'Exclusive discussion area for premium members',
 'premium-lounge', 'star', 'gold', 120, TRUE),

(14, 'Game Day Central',
 'Live game discussions, watch parties, reactions, and game-day conversation',
 'game-day-central', 'calendar', 'red', 130, TRUE),

(15, 'Alumni Network',
 'Connect and communicate with fellow University of Houston graduates',
 'alumni-network', 'graduation-cap', 'red', 140, TRUE),

(18, 'Baseball',
 'Houston Cougar baseball talk, games, players, and season discussion',
 'baseball', 'baseball-ball', 'blue', 150, TRUE),

(19, 'Track & Field',
 'Houston Cougar Track & Field athletics, meets, athletes, and results',
 'track-field', 'running', 'purple', 160, TRUE),

(20, 'Golf',
 'Houston Cougar Golf team discussions and tournament coverage',
 'golf', 'golf-ball', 'green', 170, TRUE),

(21, 'Other Sports Men',
 'All other Houston Cougar men''s athletics',
 'other-sports-men', 'trophy', 'blue', 180, TRUE),

(23, 'Water Cooler Talk',
 'General discussions, off-topic conversations, and community chat',
 'water-cooler-talk', 'coffee', 'blue', 190, TRUE),

(24, 'Coogs Lounge',
 'Community discussions, current events, science, education, and announcements',
 'coogs-lounge', 'users', 'purple', 200, TRUE),

(25, 'UH Hall of Fame',
 'Celebrate notable UH alumni, athletes, achievements, and university history',
 'uh-hall-of-fame', 'trophy', 'gold', 210, TRUE),

(45, 'Women''s Sports',
 'All Houston Cougar women''s athletics',
 'womens-sports', 'female', 'red', 220, TRUE),

(46, 'Professional Networking',
 'Job opportunities, professional development, and career connections',
 'professional-networking', 'handshake', 'blue', 230, TRUE),

(47, 'Women''s Basketball',
 'Houston Cougar Women''s Basketball discussions and game analysis',
 'womens-basketball', 'basketball-ball', 'orange', 240, TRUE),

(48, 'Women''s Golf',
 'Houston Cougar Women''s Golf discussions and tournament coverage',
 'womens-golf', 'golf-ball', 'green', 250, TRUE),

(49, 'Women''s Soccer',
 'Houston Cougar Women''s Soccer news, matches, and player discussion',
 'womens-soccer', 'futbol', 'cyan', 260, TRUE),

(50, 'Softball',
 'Houston Cougar Softball team discussions, games, and season coverage',
 'softball', 'baseball-ball', 'amber', 270, TRUE),

(51, 'Women''s Tennis',
 'Houston Cougar Women''s Tennis matches, tournaments, and discussion',
 'womens-tennis', 'table-tennis', 'lime', 280, TRUE),

(52, 'Women''s Track & Field',
 'Houston Cougar Women''s Track & Field events and athlete discussion',
 'womens-track-field', 'running', 'violet', 290, TRUE),

(53, 'Women''s Swimming & Diving',
 'Houston Cougar Swimming & Diving meets, records, and discussion',
 'womens-swimming-diving', 'swimmer', 'teal', 300, TRUE),

(54, 'Academic Discussion',
 'Academic discussion, study groups, courses, and educational topics',
 'academic-discussion', 'graduation-cap', 'indigo', 310, TRUE),

(55, 'Student Life',
 'Campus events, student organizations, activities, and university life',
 'student-life', 'university', 'teal', 320, TRUE)

ON CONFLICT DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('forum_categories', 'id'),
  GREATEST(
    COALESCE((SELECT MAX(id) FROM forum_categories), 1),
    55
  ),
  TRUE
);

COMMIT;
