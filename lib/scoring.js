// dsh-model-radar — deterministic scoring.
//
// Pompeii and Candy are program-scored; Qin and Pelican come from the judge
// module. A combo total is only reported when every task has a real score:
// timeouts, API errors and judge failures leave the total empty instead of
// silently counting as zero.

import { getTask, TASKS, TASK_WEIGHTS } from "./tasks.js";

const LABELS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);

function asText(raw) {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object") return JSON.stringify(raw);
  return "";
}

function stripFence(text) {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return match === null ? trimmed : match[1].trim();
}

export function normalizeEdge(a, b) {
  if (!LABELS.has(a) || !LABELS.has(b) || a === b) return null;
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Validate a Pompeii answer against output_schema.json semantics.
 * @returns {{ok: boolean, formatError: string|null, edges: string[]}}
 */
export function validatePompeii(raw) {
  const text = stripFence(asText(raw));
  if (text === "") return { ok: false, formatError: "empty answer", edges: [] };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, formatError: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`, edges: [] };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, formatError: "answer is not an object", edges: [] };
  }
  for (const key of Object.keys(parsed)) {
    if (key !== "edges") return { ok: false, formatError: `unexpected key: ${key}`, edges: [] };
  }
  if (!Array.isArray(parsed.edges)) return { ok: false, formatError: "edges is not an array", edges: [] };
  if (parsed.edges.length > 36) return { ok: false, formatError: "too many edges", edges: [] };
  const edges = [];
  const seen = new Set();
  for (const entry of parsed.edges) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, formatError: "edge is not an object", edges: [] };
    }
    for (const key of Object.keys(entry)) {
      if (key !== "a" && key !== "b") return { ok: false, formatError: `unexpected edge key: ${key}`, edges: [] };
    }
    const a = entry.a;
    const b = entry.b;
    if (typeof a !== "string" || typeof b !== "string" || !LABELS.has(a) || !LABELS.has(b)) {
      return { ok: false, formatError: "edge label outside A-I", edges: [] };
    }
    if (a === b) return { ok: false, formatError: "self edge", edges: [] };
    const normalized = normalizeEdge(a, b);
    if (normalized === null) return { ok: false, formatError: "invalid edge", edges: [] };
    if (seen.has(normalized)) return { ok: false, formatError: "duplicate edge", edges: [] };
    seen.add(normalized);
    edges.push(normalized);
  }
  return { ok: true, formatError: null, edges };
}

/**
 * Pompeii F1 score: 2TP / (2TP + FP + FN), scaled to the 45 point task.
 * @param {string|object} raw model_answer.json content
 * @param {Array<[string, string]>|string[]} goldEdges
 */
export function scorePompeii(raw, goldEdges) {
  const validation = validatePompeii(raw);
  const gold = new Set(
    goldEdges
      .map((edge) => (Array.isArray(edge) ? normalizeEdge(edge[0], edge[1]) : String(edge)))
      .filter((edge) => typeof edge === "string" && edge !== ""),
  );
  if (!validation.ok) {
    return {
      score: 0,
      score100: 0,
      maxScore: 45,
      f1: 0,
      tp: 0,
      fp: 0,
      fn: gold.size,
      formatError: validation.formatError,
      answer: { edges: [] },
    };
  }
  const predicted = new Set(validation.edges);
  let tp = 0;
  for (const edge of predicted) if (gold.has(edge)) tp += 1;
  const fp = predicted.size - tp;
  const fn = gold.size - tp;
  const denominator = 2 * tp + fp + fn;
  const f1 = denominator === 0 ? 0 : (2 * tp) / denominator;
  const score100 = Number((f1 * 100).toFixed(2));
  return {
    score: Number(((score100 * TASK_WEIGHTS.pompeii) / 100).toFixed(2)),
    score100,
    maxScore: 45,
    f1: Number(f1.toFixed(6)),
    tp,
    fp,
    fn,
    formatError: null,
    answer: { edges: [...predicted].sort() },
  };
}

/**
 * Candy answer extraction. Models often restate the construction after the
 * conclusion ("先取 6 颗圆形，再取 9 颗五角星形"), so a bare "last integer" rule
 * would read the construction instead of the answer. Explicit answer markers
 * win; the last integer remains the fallback.
 * @param {string} finalText
 */
export function extractCandyAnswer(finalText) {
  const text = asText(finalText);
  const patterns = [
    /\\boxed\{\s*(\d{1,3})\s*\}/g,
    /(?:最终答案|final answer)\s*[:：]?\s*[*_`\s]*(\d{1,3})/gi,
    /(?:答案|answer)\s*(?:是|为|:|：)?\s*[*_`\s]*(\d{1,3})/gi,
    /(?:最少|至少)\s*(?:取|需要|要|取出)?\s*[*_`\s]*(\d{1,3})/g,
  ];
  for (const pattern of patterns) {
    let value = null;
    for (const match of text.matchAll(pattern)) value = Number(match[1]);
    if (value !== null) return value;
  }
  const numbers = [...text.matchAll(/-?\d+/g)].map((match) => Number(match[0]));
  return numbers.length === 0 ? null : numbers[numbers.length - 1];
}

/**
 * Candy: the extracted answer must be 15.
 * @param {string} finalText
 */
export function scoreCandy(finalText) {
  const text = asText(finalText);
  const answer = extractCandyAnswer(text);
  const ok = answer === 15;
  const score100 = ok ? 100 : 0;
  return {
    score: Number(((score100 * TASK_WEIGHTS.candy) / 100).toFixed(2)),
    score100,
    maxScore: 22.5,
    answer,
    ok,
  };
}

/** Convert a 0-100 rubric score into the task's weighted contribution. */
export function score100ToWeighted(taskId, score100) {
  const weight = TASK_WEIGHTS[taskId];
  if (weight === undefined) throw new Error(`unknown task: ${taskId}`);
  const value = Number(score100);
  if (!Number.isFinite(value)) return 0;
  return Number(((Math.min(100, Math.max(0, value)) * weight) / 100).toFixed(2));
}

/**
 * Completion-gate cap for the qin task, mirroring the codexradar
 * `CORE_COMPLETENESS` protocol: missing core relations limit the final
 * 100-point score even when the additive rubric is generous.
 *
 * @param core - map of R1..R7 to "confirmed" | "partial" | "not_met".
 * @returns {{cap:number, notMet:number, partial:number, confirmed:number, missing:boolean}}
 */
export function qinCompletionCap(core) {
  const statuses = [];
  let missing = false;
  const normalized = {};
  if (core !== null && typeof core === "object") {
    for (const [key, value] of Object.entries(core)) {
      normalized[String(key).trim().toUpperCase().replace(/[.。]+$/, "")] = value;
    }
  }
  for (let index = 1; index <= 7; index += 1) {
    const raw = normalized[`R${index}`];
    const value = typeof raw === "string" ? raw.trim().toLowerCase().replace(/[.。]+$/, "").replace(/[-\s]+/g, "_") : "";
    if (value === "confirmed") statuses.push("confirmed");
    else if (value === "partial") statuses.push("partial");
    else if (value === "not_met" || value === "not-met" || value === "not met") statuses.push("not_met");
    else {
      statuses.push("partial");
      missing = true;
    }
  }
  const notMet = statuses.filter((value) => value === "not_met").length;
  const partial = statuses.filter((value) => value === "partial").length;
  const confirmed = statuses.filter((value) => value === "confirmed").length;
  let cap = 100;
  if (notMet >= 2) cap = 59;
  else if (notMet === 1) cap = 69;
  else if (partial >= 2) cap = 69;
  else if (partial === 1) cap = 79;
  return { cap, notMet, partial, confirmed, missing };
}

/**
 * Apply a judge verdict to a judge-scored task: keep the 0-100 raw score, apply
 * the qin completion gate, then convert to the task weight.
 *
 * @param taskId - "qin" | "pelican"
 * @param judged - judgeTask result ({ok, score100, core, breakdown})
 * @returns {{score:number, score100:number, grade:object}|null}
 */
export function gradeJudgeResult(taskId, judged) {
  if (judged === null || judged === undefined || judged.ok !== true) return null;
  const raw100 = Number(judged.score100);
  if (!Number.isFinite(raw100)) return null;
  if (taskId === "qin") {
    const completion = qinCompletionCap(judged.core);
    const final100 = Math.min(raw100, completion.cap);
    const score = score100ToWeighted("qin", final100);
    return {
      score,
      score100: final100,
      grade: {
        score100: raw100,
        cap: completion.cap,
        final100,
        weighted: score,
        maxScore: TASK_WEIGHTS.qin,
        core: judged.core,
        completion,
        breakdown: judged.breakdown,
      },
    };
  }
  if (taskId === "pelican") {
    const score = score100ToWeighted("pelican", raw100);
    return {
      score,
      score100: raw100,
      grade: {
        score100: raw100,
        weighted: score,
        maxScore: TASK_WEIGHTS.pelican,
        breakdown: judged.breakdown,
      },
    };
  }
  throw new Error(`task ${taskId} is not judge-scored`);
}

/**
 * Aggregate one combo's runs into per-task scores and a total.
 * @param {Array<object>} runs
 */
export function comboTotal(runs) {
  const byTask = new Map();
  for (const run of runs ?? []) byTask.set(run.taskId, run);
  const scores = {};
  const statuses = {};
  const missing = [];
  for (const task of TASKS) {
    const run = byTask.get(task.id);
    statuses[task.id] = run?.status ?? "missing";
    if (run === undefined) {
      scores[task.id] = null;
      missing.push(task.id);
      continue;
    }
    if (run.status === "done" && typeof run.score === "number" && Number.isFinite(run.score)) {
      scores[task.id] = Number(run.score.toFixed(2));
    } else {
      scores[task.id] = null;
      missing.push(task.id);
    }
  }
  const complete = missing.length === 0;
  const total = complete
    ? Number(TASKS.reduce((sum, task) => sum + (scores[task.id] ?? 0), 0).toFixed(2))
    : null;
  return {
    scores,
    statuses,
    missing,
    complete,
    total,
    maxScore: TASKS.reduce((sum, task) => sum + task.maxScore, 0),
  };
}

export function taskMaxScore(taskId) {
  return getTask(taskId).maxScore;
}

/** True when the last turn was cut off by the model's output-token budget. */
export function turnCutByMaxTokens(events) {
  for (let index = (events ?? []).length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type !== "turn/end") continue;
    return event.data?.reason?.kind === "max-tokens";
  }
  return false;
}

/** Extract the last non-empty assistant text from a session event list. */
export function lastAssistantText(events) {
  let text = "";
  for (const event of events ?? []) {
    if (event?.type !== "assistant/message") continue;
    const content = event.data?.message?.content;
    if (!Array.isArray(content)) continue;
    const joined = content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (joined !== "") text = joined;
  }
  return text;
}

/** Fold DSH usage events from a session into token totals. */
export function foldUsage(events) {
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
  };
  for (const event of events ?? []) {
    if (event?.type !== "assistant/message") continue;
    const row = event.data?.usage;
    if (row === null || row === undefined) continue;
    usage.inputTokens += Number(row.inputTokens) || 0;
    usage.outputTokens += Number(row.outputTokens) || 0;
    usage.cacheReadTokens += Number(row.cacheReadTokens) || 0;
    usage.cacheWriteTokens += Number(row.cacheWriteTokens) || 0;
    usage.reasoningTokens += Number(row.reasoningTokens) || 0;
  }
  return usage;
}