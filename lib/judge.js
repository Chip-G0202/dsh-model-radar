// dsh-model-radar — judge calls and strict JSON parsing.

import { randomUUID } from "node:crypto";
//
// The judge is an ordinary LLM route (default ali/deepseek-v4.1-flash-1017/high).
// It receives the task, the candidate's final text and the produced artifact,
// never the candidate's identity, and must answer with one JSON object.

// A hung judge route must not stall the whole batch until the batch timeout.
const JUDGE_TIMEOUT_MS = 1_800_000;

function truncate(text, limit) {
  const value = typeof text === "string" ? text : "";
  return value.length > limit ? `${value.slice(0, limit)}\n…（已截断）` : value;
}

function asText(raw) {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object") return JSON.stringify(raw);
  return "";
}

/** Parse one judge reply. Returns `{ok:false}` for anything ambiguous. */
export function parseJudgeReply(raw, maxScore) {
  const text = asText(raw).trim();
  if (text === "") return { ok: false, error: "empty judge reply" };
  const unfenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  const candidate = unfenced !== null ? unfenced[1].trim() : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "judge reply contains no JSON object" };
  let parsed;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    return { ok: false, error: `judge JSON is invalid: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "judge JSON is not an object" };
  }
  const score = Number(parsed.score);
  if (!Number.isFinite(score) || score < 0 || score > maxScore) {
    return { ok: false, error: `judge score outside 0-${maxScore}: ${String(parsed.score)}` };
  }
  const breakdown =
    parsed.breakdown !== null && typeof parsed.breakdown === "object" && !Array.isArray(parsed.breakdown)
      ? parsed.breakdown
      : {};
  const core =
    parsed.core !== null && typeof parsed.core === "object" && !Array.isArray(parsed.core) ? parsed.core : null;
  const reason = typeof parsed.reason === "string" ? parsed.reason : "";
  return {
    ok: true,
    score: Number(score.toFixed(2)),
    breakdown,
    core,
    reason: reason.slice(0, 800),
  };
}

function buildJudgePrompt({ rubric, prompt, finalText, artifactText, artifactLabel, compact = false }) {
  const sections = [
    rubric,
    "",
    "【题目原文】",
    truncate(prompt, 6000),
    "",
    "【模型最终回答（截断）】",
    truncate(finalText, 20 * 1024) || "（无最终文本）",
  ];
  if (artifactText) {
    const limit = compact ? 24 * 1024 : 100 * 1024;
    sections.push("", `【产物 ${artifactLabel ?? ""}（截断）】`, truncate(artifactText, limit));
  }
  if (compact) {
    sections.push("", "【输出要求】直接给出完整 JSON 评分；不要复述输入、不要长篇推理，reason 控制在 120 字以内。");
  }
  return sections.join("\n");
}

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

function addUsage(target, usage) {
  if (usage === null || usage === undefined) return;
  target.inputTokens += Number(usage.inputTokens) || 0;
  target.outputTokens += Number(usage.outputTokens) || 0;
  target.cacheReadTokens += Number(usage.cacheReadTokens) || 0;
  target.cacheWriteTokens += Number(usage.cacheWriteTokens) || 0;
}

async function callJudge(ctx, { judge, prompt, maxTokens, signal }) {
  const llm = ctx.get("llm");
  if (llm === undefined) throw new Error("LLM service is unavailable");
  const options = {
    provider: judge.provider,
    model: judge.model,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    // Omit the cap when the catalog did not provide one so the adapter applies
    // the model's own configured default (e.g. 128k).
    ...(Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0 ? { maxTokens: Number(maxTokens) } : {}),
    // Some gateway routes (e.g. opencode-go) require a routing session id even
    // for one-shot calls; a fresh UUID keeps judge calls independent.
    sessionId: randomUUID(),
  };
  if (judge.reasoningEffort !== null && judge.reasoningEffort !== undefined && judge.reasoningEffort !== "") {
    options.reasoningEffort = judge.reasoningEffort;
  }
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, JUDGE_TIMEOUT_MS);
  timer.unref?.();
  const forwardAbort = () => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }
  options.signal = controller.signal;
  let text = "";
  let usage = emptyUsage();
  let finishReason = null;
  try {
    for await (const chunk of llm.stream(options)) {
      if (chunk?.type === "text-delta") text += chunk.text ?? "";
      else if (chunk?.type === "usage") addUsage(usage, chunk.usage);
      else if (chunk?.type === "finish") finishReason = chunk.reason ?? null;
    }
    if (timedOut) {
      const error = new Error(`judge call exceeded ${JUDGE_TIMEOUT_MS}ms`);
      error.code = "judge-timeout";
      throw error;
    }
    if (finishReason !== null && finishReason.kind === "error") {
      const failure = finishReason.failure ?? {};
      const error = new Error(failure.message ?? "judge request failed");
      error.code = failure.code ?? "judge-request";
      throw error;
    }
    if (text.trim() === "" && finishReason !== null && finishReason.kind === "max-tokens") {
      const error = new Error("judge used the whole output budget on reasoning before answering");
      error.code = "judge-max-tokens";
      throw error;
    }
    return { text, usage, finish: finishReason };
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(`judge call exceeded ${JUDGE_TIMEOUT_MS}ms`);
      timeoutError.code = "judge-timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (signal !== undefined) signal.removeEventListener("abort", forwardAbort);
  }
}

/**
 * Judge one subjective task with retries.
 *
 * The judge always answers on a 0-100 scale; the weighted contribution is
 * computed by the caller.
 *
 * @returns {Promise<{
 *   ok: boolean, score: number|null, score100: number|null, maxScore: number,
 *   breakdown: object, core: object|null, reason: string, usage: object,
 *   attempts: number, error: string|null
 * }>}
 */
export async function judgeTask(
  ctx,
  { judge, taskId, rubric, prompt, finalText, artifactText, artifactLabel, maxScore, maxTokens, maxAttempts = 2, signal, wait },
) {
  const usage = emptyUsage();
  let lastError = null;
  const attempts = Math.max(1, Number(maxAttempts) || 1);
  const judgePrompt = buildJudgePrompt({ rubric, prompt, finalText, artifactText, artifactLabel });
  const compactPrompt = buildJudgePrompt({ rubric, prompt, finalText, artifactText, artifactLabel, compact: true });
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (signal?.aborted) {
      return {
        ok: false,
        score: null,
        score100: null,
        maxScore,
        breakdown: {},
        core: null,
        reason: "",
        usage,
        attempts: attempt - 1,
        error: "aborted",
      };
    }
    try {
      // A reasoning-heavy judge can burn the whole output budget before
      // answering, or produce an unparseable reply; the compact retry gives it
      // a smaller input and a stricter output reminder.
      const useCompact =
        attempt > 1 && lastError !== null && /output budget|JSON|parse|invalid|empty judge|timeout|exceeded/i.test(lastError);
      const { text, usage: attemptUsage } = await callJudge(ctx, {
        judge,
        prompt: useCompact ? compactPrompt : judgePrompt,
        maxTokens,
        signal,
      });
      addUsage(usage, attemptUsage);
      const parsed = parseJudgeReply(text, maxScore);
      if (parsed.ok) {
        return {
          ok: true,
          score: parsed.score,
          score100: parsed.score,
          maxScore,
          breakdown: parsed.breakdown,
          core: parsed.core,
          reason: parsed.reason,
          usage,
          attempts: attempt,
          error: null,
          raw: text.slice(0, 2000),
        };
      }
      lastError = parsed.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (error?.code === "aborted") break;
    }
    if (attempt < attempts && wait !== undefined) await wait(800);
  }
  return {
    ok: false,
    score: null,
    score100: null,
    maxScore,
    breakdown: {},
    core: null,
    reason: "",
    usage,
    attempts,
    error: lastError ?? "judge failed",
  };
}