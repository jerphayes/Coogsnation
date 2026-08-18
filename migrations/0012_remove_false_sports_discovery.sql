-- Remove false-positive game created by the retired free-text NCAA parser.
-- SAFE CLEANUP ONLY.

DELETE FROM ngf_sports_current
WHERE ngf_game_id = '2026-08-18-fcs-football-fcs-wins-fbs-teams';

DELETE FROM ngf_sports_observations
WHERE ngf_game_id = '2026-08-18-fcs-football-fcs-wins-fbs-teams';

DELETE FROM ngf_sports_games
WHERE ngf_game_id = '2026-08-18-fcs-football-fcs-wins-fbs-teams';

DELETE FROM ngf_sports_teams
WHERE ngf_team_id IN ('fcs-football-fcs-wins', 'fbs-teams')
AND NOT EXISTS (
  SELECT 1
  FROM ngf_sports_games g
  WHERE g.away_team_id = ngf_sports_teams.ngf_team_id
     OR g.home_team_id = ngf_sports_teams.ngf_team_id
);
