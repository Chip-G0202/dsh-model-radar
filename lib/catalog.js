// dsh-model-radar — provider / model / reasoning-effort catalog.
//
// The catalog is read from the live LLM service, never hard-coded, so any
// provider configured in the current profile participates automatically.

const CATALOG_TTL_MS = 5 * 60 * 1000;

let cache = null;

function asString(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeEfforts(info, model) {
  const reasoning = info?.reasoning;
  const raw = Array.isArray(reasoning?.efforts) ? reasoning.efforts : [];
  const efforts = [];
  const seen = new Set();
  for (const effort of raw) {
    const id = asString(effort?.id);
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    efforts.push({
      id,
      name: asString(effort?.name) || id,
      description: asString(effort?.description) || "",
    });
  }
  return {
    efforts,
    defaultEffort: asString(reasoning?.defaultEffort) || efforts[0]?.id || null,
    contextWindow: typeof info?.context?.contextWindow === "number" ? info.context.contextWindow : null,
    defaultMaxTokens: typeof info?.defaultMaxTokens === "number" ? info.defaultMaxTokens : null,
    inputModalities: [
      ...new Set(
        (info?.inputModalities ?? model?.inputModalities ?? [])
          .map((modality) => asString(modality))
          .filter((modality) => modality !== ""),
      ),
    ],
  };
}

async function readProvider(llm, provider) {
  let models = [];
  try {
    models = await llm.listModels(provider.id);
  } catch {
    models = [];
  }
  const rows = [];
  for (const model of models) {
    const id = asString(model?.id);
    if (id === "") continue;
    let info = null;
    try {
      info = await llm.resolveModelInfo(provider.id, id);
    } catch {
      info = null;
    }
    const normalized = normalizeEfforts(info, model);
    rows.push({
      provider: provider.id,
      providerName: provider.name,
      id,
      name: asString(model?.name) || id,
      description: asString(model?.description) || "",
      inputModalities: normalized.inputModalities,
      efforts: normalized.efforts,
      defaultEffort: normalized.defaultEffort,
      contextWindow: normalized.contextWindow,
      defaultMaxTokens: normalized.defaultMaxTokens,
    });
  }
  return { id: provider.id, name: provider.name, models: rows };
}

/**
 * Read the live catalog. `fresh` bypasses the in-plugin 5 minute cache.
 * @returns {Promise<{providers: Array<object>, cachedAt: number}>}
 */
export async function readCatalog(ctx, { fresh = false, cacheMs = CATALOG_TTL_MS } = {}) {
  const now = Date.now();
  if (!fresh && cache !== null && now - cache.cachedAt < cacheMs) return cache;
  const llm = ctx.get("llm");
  if (llm === undefined) throw new Error("LLM service is unavailable");
  const providers = await llm.listProviders();
  const rows = [];
  for (const provider of providers) {
    rows.push(await readProvider(llm, provider));
  }
  cache = { providers: rows, cachedAt: now };
  return cache;
}

export function invalidateCatalog() {
  cache = null;
}

export function findModel(catalog, providerId, modelId) {
  const provider = catalog?.providers?.find((entry) => entry.id === providerId);
  if (provider === undefined) return null;
  const model = provider.models.find((entry) => entry.id === modelId);
  if (model === undefined) return null;
  return { provider, model };
}

/**
 * First installable `{ provider, model, reasoningEffort }` in a live catalog.
 * Used as the host-side fallback when no judge has been configured yet.
 */
export function firstSelectableModel(catalog) {
  const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
  for (const provider of providers) {
    const model = (Array.isArray(provider.models) ? provider.models : [])[0];
    if (model === undefined || model === null) continue;
    const effort = Array.isArray(model.efforts) && model.efforts.length > 0 ? model.defaultEffort ?? model.efforts[0]?.id ?? null : null;
    return { provider: provider.id, model: model.id, reasoningEffort: effort };
  }
  return null;
}

export function supportedEfforts(model) {
  return model.efforts.length > 0
    ? model.efforts
    : [{ id: null, name: "默认", description: "" }];
}

/**
 * Normalize a selection of `{ provider, model, reasoningEffort }` objects.
 * Throws an Error with `code` on invalid or oversized selections.
 */
export function normalizeSelection(catalog, rawSelection, { maxCombos = 0, whitelist = [] } = {}) {
  if (!Array.isArray(rawSelection)) {
    const error = new Error("selection must be an array");
    error.code = "selection";
    throw error;
  }
  const allowed = new Set(whitelist.filter((entry) => typeof entry === "string" && entry !== ""));
  const combos = [];
  const seen = new Set();
  for (const raw of rawSelection) {
    let provider;
    let model;
    let effort = null;
    if (typeof raw === "string") {
      const at = raw.lastIndexOf("@");
      const base = at > 0 ? raw.slice(0, at) : raw;
      if (at > 0) effort = raw.slice(at + 1);
      const slash = base.indexOf("/");
      if (slash <= 0) continue;
      provider = base.slice(0, slash);
      model = base.slice(slash + 1);
    } else if (raw !== null && typeof raw === "object") {
      provider = asString(raw.provider);
      model = asString(raw.model);
      effort = raw.reasoningEffort == null ? null : asString(raw.reasoningEffort);
    } else {
      continue;
    }
    if (provider === "" || model === "") continue;
    if (allowed.size > 0 && !allowed.has(`${provider}/${model}`)) continue;
    const found = findModel(catalog, provider, model);
    if (found === null) continue;
    const { model: entry } = found;
    let resolvedEffort = null;
    if (entry.efforts.length > 0) {
      resolvedEffort = effort === null || effort === "" ? entry.defaultEffort : effort;
      if (!entry.efforts.some((candidate) => candidate.id === resolvedEffort)) resolvedEffort = entry.defaultEffort;
    } else if (effort !== null && effort !== "" && effort !== "default") {
      const error = new Error(`model ${provider}/${model} does not support reasoning effort`);
      error.code = "unsupported-effort";
      throw error;
    }
    const key = comboKey(provider, model, resolvedEffort);
    if (seen.has(key)) continue;
    seen.add(key);
    const effortInfo = entry.efforts.find((candidate) => candidate.id === resolvedEffort) ?? null;
    combos.push({
      key,
      provider,
      providerName: found.provider.name,
      model,
      modelName: entry.name,
      reasoningEffort: resolvedEffort,
      effortName: effortInfo?.name ?? "默认",
      supportsImage: entry.inputModalities.includes("image"),
      maxTokens: entry.defaultMaxTokens,
    });
  }
  if (combos.length === 0) {
    const error = new Error("no valid model selection");
    error.code = "selection";
    throw error;
  }
  if (maxCombos > 0 && combos.length > maxCombos) {
    const error = new Error(`selection exceeds maxCombos (${maxCombos})`);
    error.code = "max-combos";
    error.maxCombos = maxCombos;
    throw error;
  }
  return combos;
}

export function comboKey(provider, model, effort) {
  return `${provider}__${model}__${effort == null || effort === "" ? "default" : effort}`;
}

export function selectableCombos(catalog, { whitelist = [] } = {}) {
  const allowed = new Set(whitelist.filter((entry) => typeof entry === "string" && entry !== ""));
  const combos = [];
  for (const provider of catalog.providers ?? []) {
    for (const model of provider.models ?? []) {
      if (allowed.size > 0 && !allowed.has(`${provider.id}/${model.id}`)) continue;
      combos.push({
        key: `${provider.id}__${model.id}__all`,
        provider: provider.id,
        model: model.id,
        modelName: model.name,
        efforts: supportedEfforts(model),
        defaultEffort: model.defaultEffort,
        supportsImage: model.inputModalities.includes("image"),
      });
    }
  }
  return combos;
}