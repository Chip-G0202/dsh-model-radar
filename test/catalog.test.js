import test from "node:test";
import assert from "node:assert/strict";

import { firstSelectableModel, normalizeSelection } from "../lib/catalog.js";

function model(overrides) {
  return {
    provider: "alpha",
    providerName: "Alpha",
    description: "",
    inputModalities: ["text"],
    efforts: [],
    defaultEffort: null,
    contextWindow: 64000,
    defaultMaxTokens: 4096,
    ...overrides,
  };
}

const CATALOG = {
  providers: [
    {
      id: "alpha",
      name: "Alpha",
      models: [
        model({
          provider: "alpha",
          providerName: "Alpha",
          id: "m1",
          name: "Model One",
          inputModalities: ["text", "image"],
          efforts: [
            { id: "low", name: "Low", description: "" },
            { id: "high", name: "High", description: "" },
          ],
          defaultEffort: "low",
          contextWindow: 128000,
          defaultMaxTokens: 8192,
        }),
        model({
          provider: "alpha",
          providerName: "Alpha",
          id: "m2",
          name: "Model Two",
          efforts: [],
          defaultEffort: null,
          contextWindow: 32000,
          defaultMaxTokens: 2048,
        }),
      ],
    },
    {
      id: "beta",
      name: "Beta",
      models: [
        model({
          provider: "beta",
          providerName: "Beta",
          id: "m3",
          name: "Model Three",
          inputModalities: ["image"],
          efforts: [{ id: "medium", name: "Medium", description: "" }],
          defaultEffort: "medium",
        }),
      ],
    },
  ],
};

const ALL_SELECTION = [
  { provider: "alpha", model: "m1", reasoningEffort: "low" },
  { provider: "alpha", model: "m1", reasoningEffort: "high" },
  { provider: "alpha", model: "m2" },
  { provider: "beta", model: "m3" },
];

test("normalizeSelection dedupes equivalent combos", () => {
  const combos = normalizeSelection(CATALOG, [
    { provider: "alpha", model: "m1" },
    { provider: "alpha", model: "m1", reasoningEffort: "low" },
    { provider: "alpha", model: "m1", reasoningEffort: null },
    "alpha/m1@low",
  ]);

  assert.equal(combos.length, 1);
  assert.equal(combos[0].key, "alpha__m1__low");
});

test("normalizeSelection applies the model default effort", () => {
  const combos = normalizeSelection(CATALOG, [{ provider: "alpha", model: "m1" }]);
  assert.equal(combos.length, 1);
  const [combo] = combos;

  assert.equal(combo.key, "alpha__m1__low");
  assert.equal(combo.reasoningEffort, "low");
  assert.equal(combo.effortName, "Low");
  assert.equal(combo.provider, "alpha");
  assert.equal(combo.providerName, "Alpha");
  assert.equal(combo.model, "m1");
  assert.equal(combo.modelName, "Model One");
  assert.equal(combo.supportsImage, true);
  assert.equal(combo.maxTokens, 8192);
});

test("normalizeSelection keeps an explicit effort", () => {
  const [combo] = normalizeSelection(CATALOG, [
    { provider: "alpha", model: "m1", reasoningEffort: "high" },
  ]);

  assert.equal(combo.key, "alpha__m1__high");
  assert.equal(combo.reasoningEffort, "high");
  assert.equal(combo.effortName, "High");
});

test("normalizeSelection falls back to the default for an unknown effort", () => {
  const [combo] = normalizeSelection(CATALOG, [
    { provider: "alpha", model: "m1", reasoningEffort: "max" },
  ]);

  assert.equal(combo.reasoningEffort, "low");
  assert.equal(combo.key, "alpha__m1__low");
});

test("a model without efforts has exactly the default option", () => {
  const [combo] = normalizeSelection(CATALOG, [{ provider: "alpha", model: "m2" }]);

  assert.equal(combo.key, "alpha__m2__default");
  assert.equal(combo.reasoningEffort, null);
  assert.equal(combo.effortName, "默认");
  assert.equal(combo.supportsImage, false);

  const [explicitDefault] = normalizeSelection(CATALOG, [
    { provider: "alpha", model: "m2", reasoningEffort: "default" },
  ]);
  assert.equal(explicitDefault.key, "alpha__m2__default");
  assert.equal(explicitDefault.reasoningEffort, null);
});

test("an explicit effort on an effort-less model throws unsupported-effort", () => {
  assert.throws(
    () => normalizeSelection(CATALOG, [{ provider: "alpha", model: "m2", reasoningEffort: "high" }]),
    (error) => {
      assert.equal(error.code, "unsupported-effort");
      assert.match(error.message, /does not support reasoning effort/);
      return true;
    },
  );
});

test("normalizeSelection rejects a selection above maxCombos", () => {
  assert.throws(
    () => normalizeSelection(CATALOG, ALL_SELECTION, { maxCombos: 2 }),
    (error) => {
      assert.equal(error.code, "max-combos");
      assert.equal(error.maxCombos, 2);
      assert.match(error.message, /exceeds maxCombos \(2\)/);
      return true;
    },
  );

  const combos = normalizeSelection(CATALOG, ALL_SELECTION, { maxCombos: 4 });
  assert.deepEqual(
    combos.map((combo) => combo.key),
    ["alpha__m1__low", "alpha__m1__high", "alpha__m2__default", "beta__m3__medium"],
  );
});

test("normalizeSelection filters by whitelist", () => {
  const combos = normalizeSelection(CATALOG, ALL_SELECTION, { whitelist: ["beta/m3"] });
  assert.deepEqual(
    combos.map((combo) => combo.key),
    ["beta__m3__medium"],
  );
});

test("invalid provider/model entries are skipped, and an empty result throws", () => {
  assert.throws(
    () =>
      normalizeSelection(CATALOG, [
        { provider: "ghost", model: "m1" },
        { provider: "alpha", model: "ghost" },
      ]),
    (error) => {
      assert.equal(error.code, "selection");
      assert.match(error.message, /no valid model selection/);
      return true;
    },
  );

  const combos = normalizeSelection(CATALOG, [
    { provider: "ghost", model: "m1" },
    { provider: "alpha", model: "m1" },
  ]);
  assert.deepEqual(
    combos.map((combo) => combo.key),
    ["alpha__m1__low"],
  );
});

test("a non-array selection throws a selection error", () => {
  assert.throws(
    () => normalizeSelection(CATALOG, "alpha/m1"),
    (error) => {
      assert.equal(error.code, "selection");
      assert.match(error.message, /must be an array/);
      return true;
    },
  );
});
test("firstSelectableModel picks the first provider/model with its default effort", () => {
  const catalog = {
    providers: [
      { id: "empty", models: [] },
      {
        id: "alpha",
        models: [
          { id: "m1", efforts: [{ id: "low" }, { id: "high" }], defaultEffort: "high" },
          { id: "m2", efforts: [], defaultEffort: null },
        ],
      },
      { id: "beta", models: [{ id: "b1", efforts: [{ id: "low" }], defaultEffort: "low" }] },
    ],
  };
  assert.deepEqual(firstSelectableModel(catalog), { provider: "alpha", model: "m1", reasoningEffort: "high" });
  assert.equal(firstSelectableModel({ providers: [] }), null);
  assert.equal(firstSelectableModel(null), null);
});
