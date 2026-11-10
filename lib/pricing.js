// dsh-model-radar — per-request pricing.
//
// Rates are per 1M tokens in the model's native currency. `cacheMiss` covers
// uncached input + cache writes; `cacheHit` covers cache reads. DeepSeek rows
// split busy / idle hours; every other row uses one flat standard price.

const DEFAULT_PRICING = {
  currency: "CNY",
  usdToCny: 7.1,
  fallbackModel: "deepseek-v4.1-flash",
  peakRules: {
    deepseek: "工作日 09:00–12:00 / 14:00–18:00（北京时间）",
    ali: "每日 08:00–22:00（北京时间，华北2·北京）",
  },
  models: {
    "deepseek-v4.1-flash": {
      label: "DeepSeek V4.1 Flash",
      provider: "OpenCode Go",
      vendor: "DeepSeek",
      peakRule: "deepseek",
      peak: { cacheHit: 0.04, cacheMiss: 2, output: 8 },
      offPeak: { cacheHit: 0.02, cacheMiss: 1, output: 4 },
    },
    "deepseek-v4.1-flash-1017": {
      label: "DeepSeek V4.1 Flash (1017)",
      provider: "阿里云百炼",
      vendor: "DeepSeek",
      peakRule: "ali",
      peak: { cacheHit: 0.2, cacheMiss: 2, output: 8 },
      offPeak: { cacheHit: 0.1, cacheMiss: 1, output: 4 },
    },
    "deepseek-v4-pro": {
      label: "DeepSeek V4 Pro",
      provider: "DeepSeek API",
      vendor: "DeepSeek",
      peakRule: "deepseek",
      peak: { cacheHit: 0.3, cacheMiss: 9, output: 27 },
      offPeak: { cacheHit: 0.15, cacheMiss: 4.5, output: 13.5 },
    },
    "qwen3.8-max-0902": {
      label: "Qwen3.8 Max",
      provider: "阿里云百炼",
      vendor: "Qwen",
      peak: { cacheHit: 1.5, cacheMiss: 12, output: 36 },
    },
    "qwen3.8-flash": {
      label: "Qwen3.8 Flash",
      provider: "阿里云百炼",
      vendor: "Qwen",
      peak: { cacheHit: 0.1, cacheMiss: 0.8, output: 2.7 },
    },
    "ZHIPU/GLM-5.3-Flash": {
      label: "GLM-5.3-Flash",
      provider: "阿里云百炼",
      vendor: "Zhipu",
      peak: { cacheHit: 0.23, cacheMiss: 0.8, output: 2.8 },
    },
    "glm-5.3-flash": {
      label: "GLM-5.3-Flash",
      provider: "OpenCode Go",
      vendor: "Zhipu",
      currency: "USD",
      peak: { cacheHit: 0.03, cacheMiss: 0.15, output: 0.5 },
    },
    "mimo-v2.6-flash": {
      label: "MiMo V2.6 Flash",
      provider: "OpenCode Go",
      vendor: "Xiaomi",
      peak: { cacheHit: 0.02, cacheMiss: 1, output: 2 },
    },
    "kimi-k3.1-pro": {
      label: "Kimi K3.1 Pro",
      provider: "阿里云百炼",
      vendor: "Moonshot",
      peak: { cacheHit: 1.3, cacheMiss: 13, output: 68 },
    },
    "kimi/kimi-k3.1-pro": {
      label: "Kimi K3.1 Pro",
      provider: "阿里云百炼",
      vendor: "Moonshot",
      peak: { cacheHit: 1.3, cacheMiss: 13, output: 68 },
    },
    "kimi/kimi-k3.1-pro-highspeed": {
      label: "Kimi K3.1 Pro Highspeed",
      provider: "阿里云百炼",
      vendor: "Moonshot",
      peak: { cacheHit: 1.3, cacheMiss: 26, output: 136 },
    },
    "gemini-3.8-flash-tiered": {
      label: "Gemini 3.8 Flash",
      provider: "Gemini",
      vendor: "Google",
      currency: "USD",
      peak: { cacheHit: 0.075, cacheMiss: 0.75, output: 3.75 },
    },
    "gemini-3.8-flash": {
      label: "Gemini 3.8 Flash",
      provider: "Gemini",
      vendor: "Google",
      currency: "USD",
      peak: { cacheHit: 0.075, cacheMiss: 0.75, output: 3.75 },
    },
  },
};

function rate(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeRateRow(row, fallback) {
  const source = row !== null && typeof row === "object" ? row : {};
  const base = fallback ?? { cacheHit: 0, cacheMiss: 0, output: 0 };
  return {
    cacheHit: rate(source.cacheHit, base.cacheHit),
    cacheMiss: rate(source.cacheMiss, base.cacheMiss),
    output: rate(source.output, base.output),
  };
}

function normalizeModel(model, def, base) {
  const source = def !== null && typeof def === "object" ? def : {};
  const fallback = base ?? { peak: { cacheHit: 0, cacheMiss: 0, output: 0 } };
  const peakRule = source.peakRule === "deepseek" || source.peakRule === "ali" ? source.peakRule : null;
  const peak = normalizeRateRow(source.peak !== undefined ? source.peak : source, fallback.peak);
  const offPeak = peakRule === null ? { ...peak } : normalizeRateRow(source.offPeak, fallback.offPeak ?? peak);
  return {
    model,
    label: typeof source.label === "string" && source.label.length > 0 ? source.label : model,
    provider:
      typeof source.provider === "string" && source.provider.length > 0
        ? source.provider
        : (fallback.provider ?? "自定义"),
    vendor: typeof source.vendor === "string" && source.vendor.length > 0 ? source.vendor : (fallback.vendor ?? "Other"),
    currency: source.currency === "USD" ? "USD" : "CNY",
    peakRule,
    peak,
    offPeak,
  };
}

export function normalizePricing(raw) {
  const own = raw !== null && typeof raw === "object" ? raw : {};
  const models = {};
  for (const [model, def] of Object.entries(DEFAULT_PRICING.models)) models[model] = normalizeModel(model, def);
  if (own.models !== null && own.models !== undefined && typeof own.models === "object") {
    for (const [model, table] of Object.entries(own.models)) {
      if (table === null || typeof table !== "object") continue;
      const existing = models[model];
      const source =
        existing === undefined
          ? {
              label: typeof table.label === "string" && table.label.length > 0 ? table.label : model,
              provider: table.provider,
              vendor: table.vendor,
              currency: table.currency,
              peakRule: table.peakRule,
              peak: table.peak !== undefined ? table.peak : table,
              offPeak: table.offPeak,
            }
          : {
              ...existing,
              ...table,
              peak: table.peak !== undefined ? table.peak : table,
              offPeak: table.offPeak !== undefined ? table.offPeak : existing.offPeak,
            };
      models[model] = normalizeModel(model, source, existing);
    }
  }
  const usdToCny = Number(own.usdToCny);
  const preferredFallback =
    typeof own.fallbackModel === "string" && own.fallbackModel.length > 0
      ? own.fallbackModel
      : DEFAULT_PRICING.fallbackModel;
  const holidays = Array.isArray(own.holidays)
    ? own.holidays.filter((entry) => typeof entry === "string")
    : [];
  return {
    currency: DEFAULT_PRICING.currency,
    usdToCny: Number.isFinite(usdToCny) && usdToCny > 0 ? usdToCny : DEFAULT_PRICING.usdToCny,
    fallbackModel: models[preferredFallback] !== undefined ? preferredFallback : DEFAULT_PRICING.fallbackModel,
    peakRules: DEFAULT_PRICING.peakRules,
    models,
    holidays,
  };
}

function isPeakHour(rule, timeMs, holidays) {
  const date = new Date(timeMs + 8 * 3_600_000);
  const hour = date.getUTCHours();
  if (rule === "ali") return hour >= 8 && hour < 22;
  if (rule !== "deepseek") return false;
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  if (holidays.length > 0 && holidays.includes(date.toISOString().slice(0, 10))) return false;
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18);
}

/** Resolve one model's USD + CNY rates and billing band for a point in time. */
export function priceOf(pricing, model, timeMs = Date.now()) {
  const known = pricing.models[model];
  const entry = known ?? pricing.models[pricing.fallbackModel];
  const assumed = known === undefined;
  let band = "standard";
  if (!assumed && entry.peakRule !== null) {
    band = isPeakHour(entry.peakRule, timeMs, pricing.holidays) ? "peak" : "offPeak";
  }
  const native = band === "offPeak" ? entry.offPeak : entry.peak;
  const toUsd = entry.currency === "USD" ? 1 : 1 / pricing.usdToCny;
  const usd = {
    cacheHit: native.cacheHit * toUsd,
    cacheMiss: native.cacheMiss * toUsd,
    output: native.output * toUsd,
  };
  return {
    band,
    assumed,
    entry,
    usd,
    cny: {
      cacheHit: usd.cacheHit * pricing.usdToCny,
      cacheMiss: usd.cacheMiss * pricing.usdToCny,
      output: usd.output * pricing.usdToCny,
    },
  };
}

/**
 * Price one usage record.
 * @param {object} pricing normalized pricing
 * @param {{model: string, usage: object, at?: number}} request
 */
export function priceUsage(pricing, { model, usage, at = Date.now() }) {
  const resolved = priceOf(pricing, model, at);
  const tokens = usage !== null && typeof usage === "object" ? usage : {};
  const inputTokens = Number(tokens.inputTokens) || 0;
  const outputTokens = Number(tokens.outputTokens) || 0;
  const cacheReadTokens = Number(tokens.cacheReadTokens) || 0;
  const cacheWriteTokens = Number(tokens.cacheWriteTokens) || 0;
  const uncachedInput = Math.max(0, inputTokens - cacheReadTokens) + cacheWriteTokens;
  const usd = (cacheReadTokens / 1e6) * resolved.usd.cacheHit + (uncachedInput / 1e6) * resolved.usd.cacheMiss + (outputTokens / 1e6) * resolved.usd.output;
  return {
    model,
    band: resolved.band,
    assumed: resolved.assumed,
    label: resolved.entry.label,
    currency: resolved.entry.currency,
    tokens: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
    usd: Number(usd.toFixed(6)),
    cny: Number((usd * pricing.usdToCny).toFixed(6)),
  };
}

/** Aggregated pricing rows for the UI price book. */
export function pricingRows(pricing) {
  return Object.values(pricing.models).map((entry) => ({
    model: entry.model,
    label: entry.label,
    provider: entry.provider,
    vendor: entry.vendor,
    currency: entry.currency,
    peakRule: entry.peakRule,
    peak: entry.peak,
    offPeak: entry.offPeak,
  }));
}