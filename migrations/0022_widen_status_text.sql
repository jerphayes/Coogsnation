-- Widen status_text: some sources emit status strings over 100 chars,
-- which threw on INSERT and failed the entire poll for that game,
-- discarding every source's observation in the batch.
ALTER TABLE ngf_sports_observations ALTER COLUMN status_text TYPE varchar(300);
ALTER TABLE ngf_sports_current      ALTER COLUMN status_text TYPE varchar(300);
