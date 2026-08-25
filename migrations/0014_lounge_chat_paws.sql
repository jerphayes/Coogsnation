CREATE TABLE IF NOT EXISTS lounge_chat_messages (
  id uuid PRIMARY KEY,
  room_id varchar(100) NOT NULL,
  user_id varchar(255) NOT NULL,
  display_name varchar(120) NOT NULL,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  system boolean NOT NULL DEFAULT false,
  CONSTRAINT lounge_chat_message_length
    CHECK (char_length(message) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_lounge_chat_messages_room_sent
  ON lounge_chat_messages (room_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS lounge_message_paws (
  message_id uuid NOT NULL
    REFERENCES lounge_chat_messages(id)
    ON DELETE CASCADE,
  user_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lounge_message_paws_user
  ON lounge_message_paws (user_id);
