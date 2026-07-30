import { pool } from "../db";
import type { AIConfig } from "./config";
import { AIServiceError } from "./types";
import { hashText, normalizeQuestion } from "./utils";

export interface KnowledgeRecord {
  id: number;
  question: string;
  answer: string;
  score: number;
  approved: boolean;
}

export interface InteractionRecord {
  requestId: string;
  userId: string;
  conversationId?: string;
  requestType: "chat" | "stream" | "moderation";
  provider: string;
  model: string;
  prompt: string;
  response?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
  status: "success" | "error" | "blocked";
  errorCode?: string;
}

export class AIStore {
  constructor(private readonly config: AIConfig) {}

  async assertQuota(userId: string): Promise<void> {
    const daily = await pool.query(
      `SELECT
         COUNT(*)::int AS requests,
         COALESCE(SUM(input_tokens + output_tokens), 0)::bigint AS tokens
       FROM ai_interactions
       WHERE user_id = $1 AND created_at >= date_trunc('day', now())`,
      [userId],
    );
    const requests = Number(daily.rows[0]?.requests || 0);
    const tokens = Number(daily.rows[0]?.tokens || 0);
    if (requests >= this.config.dailyUserRequestLimit) {
      throw new AIServiceError("Daily AI request limit reached", "DAILY_REQUEST_LIMIT", 429, false);
    }
    if (tokens >= this.config.dailyUserTokenLimit) {
      throw new AIServiceError("Daily AI token limit reached", "DAILY_TOKEN_LIMIT", 429, false);
    }

    if (this.config.monthlyBudgetUsd > 0) {
      // v3 records the selected provider's estimated cost on every interaction.
      // The global public-AI ceiling therefore works across OpenAI and Gemini.
      const monthly = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost_micros), 0)::bigint AS cost_micros
         FROM ai_interactions
         WHERE created_at >= date_trunc('month', now())`,
      );
      const costMicros = Number(monthly.rows[0]?.cost_micros || 0);
      if (costMicros >= Math.round(this.config.monthlyBudgetUsd * 1_000_000)) {
        throw new AIServiceError("Monthly AI spending ceiling reached", "MONTHLY_BUDGET_LIMIT", 503, false);
      }
    }
  }

  async findTrustedAnswer(question: string): Promise<KnowledgeRecord | null> {
    if (!this.config.learningEnabled) return null;
    const normalized = normalizeQuestion(question);
    const result = await pool.query(
      `SELECT id, question, answer, score, approved
       FROM ai_knowledge
       WHERE question_hash = $1
         AND (approved = true OR ($3 = false AND score >= $2))
       ORDER BY approved DESC, score DESC
       LIMIT 1`,
      [hashText(normalized), this.config.learningMinScore, this.config.learningRequireApproval],
    );
    return result.rows[0] || null;
  }

  async findRelevantKnowledge(question: string, limit = 3): Promise<KnowledgeRecord[]> {
    if (!this.config.learningEnabled) return [];
    const trimmed = question.trim();
    if (!trimmed) return [];
    try {
      const result = await pool.query(
        `SELECT id, question, answer, score, approved
         FROM ai_knowledge
         WHERE (approved = true OR ($4 = false AND score >= $2))
           AND to_tsvector('english', question || ' ' || answer) @@ plainto_tsquery('english', $1)
         ORDER BY approved DESC, score DESC, updated_at DESC
         LIMIT $3`,
        [trimmed, this.config.learningMinScore, Math.max(1, Math.min(limit, 5)), this.config.learningRequireApproval],
      );
      return result.rows;
    } catch (error) {
      console.error("AI knowledge lookup failed:", error);
      return [];
    }
  }

  async saveCandidate(input: {
    question: string;
    answer: string;
    context: string;
    provider: string;
    model: string;
    userId: string;
  }): Promise<number | null> {
    if (!this.config.learningEnabled) return null;
    const normalized = normalizeQuestion(input.question);
    const result = await pool.query(
      `INSERT INTO ai_knowledge
         (question_hash, normalized_question, question, answer, context, provider, model, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (question_hash) DO UPDATE SET
         answer = CASE WHEN ai_knowledge.approved THEN ai_knowledge.answer ELSE EXCLUDED.answer END,
         context = CASE WHEN ai_knowledge.approved THEN ai_knowledge.context ELSE EXCLUDED.context END,
         provider = CASE WHEN ai_knowledge.approved THEN ai_knowledge.provider ELSE EXCLUDED.provider END,
         model = CASE WHEN ai_knowledge.approved THEN ai_knowledge.model ELSE EXCLUDED.model END,
         updated_at = now()
       RETURNING id`,
      [hashText(normalized), normalized, input.question, input.answer, input.context, input.provider, input.model, input.userId],
    );
    return result.rows[0]?.id || null;
  }

  async recordInteraction(record: InteractionRecord): Promise<void> {
    const storeContent = this.config.storeConversations;
    await pool.query(
      `INSERT INTO ai_interactions
         (request_id, user_id, conversation_id, request_type, provider, model, prompt_hash,
          user_message, assistant_message, input_tokens, output_tokens, estimated_cost_micros,
          status, error_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        record.requestId,
        record.userId,
        record.conversationId || null,
        record.requestType,
        record.provider,
        record.model,
        hashText(record.prompt),
        storeContent ? record.prompt : null,
        storeContent ? record.response || null : null,
        record.inputTokens,
        record.outputTokens,
        record.estimatedCostMicros,
        record.status,
        record.errorCode || null,
      ],
    );
  }

  async vote(knowledgeId: number, userId: string, value: 1 | -1): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const exists = await client.query("SELECT id FROM ai_knowledge WHERE id = $1 FOR UPDATE", [knowledgeId]);
      if (!exists.rowCount) throw new AIServiceError("AI answer not found", "KNOWLEDGE_NOT_FOUND", 404, false);
      await client.query(
        `INSERT INTO ai_knowledge_feedback (knowledge_id, user_id, value)
         VALUES ($1, $2, $3)
         ON CONFLICT (knowledge_id, user_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [knowledgeId, userId, value],
      );
      const scoreResult = await client.query(
        `UPDATE ai_knowledge
         SET score = COALESCE((SELECT SUM(value) FROM ai_knowledge_feedback WHERE knowledge_id = $1), 0),
             updated_at = now()
         WHERE id = $1
         RETURNING score`,
        [knowledgeId],
      );
      await client.query("COMMIT");
      return Number(scoreResult.rows[0]?.score || 0);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setApproval(knowledgeId: number, approved: boolean): Promise<void> {
    const result = await pool.query(
      `UPDATE ai_knowledge SET approved = $2, updated_at = now() WHERE id = $1 RETURNING id`,
      [knowledgeId, approved],
    );
    if (!result.rowCount) throw new AIServiceError("AI answer not found", "KNOWLEDGE_NOT_FOUND", 404, false);
  }

  async getAdminStatus() {
    const [monthUsage, knowledge] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS requests,
                COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens,
                COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
                COALESCE(SUM(estimated_cost_micros), 0)::bigint AS cost_micros,
                COUNT(*) FILTER (WHERE status = 'error')::int AS errors
         FROM ai_interactions
         WHERE created_at >= date_trunc('month', now())`,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE approved = true)::int AS approved,
                COUNT(*) FILTER (WHERE approved = false AND score >= $1)::int AS trusted_by_score
         FROM ai_knowledge`,
        [this.config.learningMinScore],
      ),
    ]);
    return {
      month: {
        requests: Number(monthUsage.rows[0]?.requests || 0),
        inputTokens: Number(monthUsage.rows[0]?.input_tokens || 0),
        outputTokens: Number(monthUsage.rows[0]?.output_tokens || 0),
        estimatedCostUsd: Number(monthUsage.rows[0]?.cost_micros || 0) / 1_000_000,
        errors: Number(monthUsage.rows[0]?.errors || 0),
      },
      knowledge: {
        total: Number(knowledge.rows[0]?.total || 0),
        approved: Number(knowledge.rows[0]?.approved || 0),
        trustedByScore: Number(knowledge.rows[0]?.trusted_by_score || 0),
      },
    };
  }
}
