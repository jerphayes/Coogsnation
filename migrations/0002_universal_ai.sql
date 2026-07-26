CREATE TABLE IF NOT EXISTS ai_knowledge (
  id serial PRIMARY KEY,
  question_hash varchar(64) NOT NULL UNIQUE,
  normalized_question text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  context varchar(100) DEFAULT 'assistant',
  provider varchar(50) NOT NULL,
  model varchar(200) NOT NULL,
  score integer NOT NULL DEFAULT 0,
  approved boolean NOT NULL DEFAULT false,
  created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_score ON ai_knowledge(score);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_approved ON ai_knowledge(approved);

CREATE TABLE IF NOT EXISTS ai_knowledge_feedback (
  id serial PRIMARY KEY,
  knowledge_id integer NOT NULL REFERENCES ai_knowledge(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value integer NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_ai_feedback_user_knowledge UNIQUE (knowledge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_knowledge ON ai_knowledge_feedback(knowledge_id);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id serial PRIMARY KEY,
  request_id varchar(64) NOT NULL UNIQUE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id varchar(100),
  request_type varchar(30) NOT NULL,
  provider varchar(50) NOT NULL,
  model varchar(200) NOT NULL,
  prompt_hash varchar(64) NOT NULL,
  user_message text,
  assistant_message text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_micros integer NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_created ON ai_interactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_status ON ai_interactions(status);
