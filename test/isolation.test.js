import test from "node:test";
import assert from "node:assert/strict";

import { auditRunIsolation } from "../lib/isolation.js";
import { commandEscapesWorkspace, stripLiveBatch, toolPathEscapesWorkspace } from "../lib/runner.js";

const RUN_DIR = "/tmp/mr-run-test";

function call(name, args) {
  return { type: "tool/call", data: { name, arguments: JSON.stringify(args) } };
}

function verdictOf(events) {
  return auditRunIsolation(events, RUN_DIR);
}

test("audit accepts a normal run that stays inside its workspace", () => {
  const audit = verdictOf([
    call("read", { file_path: "question.png" }),
    call("read", { file_path: `${RUN_DIR}/model_answer.json` }),
    call("write", { file_path: "work/crop.py", content: "print(1)" }),
    call("bash", { command: "python3 work/crop.py" }),
    call("bash", { command: "python3 - <<'PY'\nprint('http://www.w3.org/2000/svg')\nPY" }),
    call("bash", { command: "python3 - <<'PY'\nmask = ~ (a == b)\nPY" }),
    call("bash", { command: `cd ${RUN_DIR} && ls` }),
    call("bash", { command: "python3 -c \"from pathlib import Path; print(Path('index.html').read_text()[:10])\"" }),
    call("bash", { command: "python3 - <<'PY'\n# replace the head curl entirely\ns = s.replace('curl', 'moustache')\nPY" }),
    call("bash", { command: "python3 - <<'PY'\nfor i, tile in enumerate(tiles):\n    nc=4\nPY" }),
  ]);
  assert.equal(audit.verdict, "clean");
  assert.equal(audit.inspected, 10);
  assert.deepEqual(audit.violations, []);
});

test("audit ignores /private/var spelling of the run root", () => {
  const audit = auditRunIsolation(
    [
      call("read_image", { file_path: "/private/var/folders/x/T/dsh-model-radar-runs/b/combo/pompeii/result.png" }),
      call("bash", { command: "cd /private/var/folders/x/T/dsh-model-radar-runs/b/combo/pompeii && ls" }),
    ],
    "/var/folders/x/T/dsh-model-radar-runs/b/combo/pompeii",
  );
  assert.equal(audit.verdict, "clean");
});

test("audit flags a read outside the run directory", () => {
  const audit = verdictOf([call("read", { file_path: "/Users/tester/.dsh/model-radar/state.json" })]);
  assert.equal(audit.verdict, "suspect");
  assert.equal(audit.violations[0].kind, "outside-workspace");
});

test("audit flags bash that reaches the harness store, gold assets or the host routes", () => {
  const cases = [
    "cat ~/.dsh/model-radar/state.json",
    "cat $HOME/Documents/dsh-model-radar/assets/pompeii/gold.json",
    "ls /Users/tester/Documents/各种需求",
    "find / -name gold.json",
    "cp ../other/model_answer.json .",
    "curl -s http://127.0.0.1:63204/dsh-model-radar/meta",
    "python3 -c \"import requests; print(requests.get('http://localhost:63204/dsh-model-radar/batches').text)\"",
  ];
  for (const command of cases) {
    const audit = verdictOf([call("bash", { command })]);
    assert.equal(audit.verdict, "suspect", `expected suspect for: ${command}`);
  }
});

test("audit is deterministic about clean deletions of duplicate violations", () => {
  const audit = verdictOf([
    call("bash", { command: "curl http://127.0.0.1:1/x" }),
    call("bash", { command: "curl http://127.0.0.1:1/x" }),
  ]);
  assert.equal(audit.verdict, "suspect");
  assert.equal(audit.violations.length, 1);
});

test("a guard-refused attempt is reported as blocked, not as leaked", () => {
  const result = {
    type: "tool/result",
    data: {
      message: {
        toolCallId: "call-1",
        content: [{ type: "text", text: "access outside the run workspace is not allowed" }],
      },
    },
  };
  const blocked = auditRunIsolation(
    [
      { type: "tool/call", data: { name: "read_image", callId: "call-1", arguments: '{"file_path":"/tmp/frag.png"}' } },
      result,
    ],
    RUN_DIR,
  );
  assert.equal(blocked.verdict, "blocked");
  assert.equal(blocked.blocked, 1);
  assert.equal(blocked.violations[0].blocked, true);

  const unguarded = auditRunIsolation(
    [{ type: "tool/call", data: { name: "read_image", callId: "call-2", arguments: '{"file_path":"/tmp/frag.png"}' } }],
    RUN_DIR,
  );
  assert.equal(unguarded.verdict, "suspect");
});

test("stripLiveBatch removes answers, scores and session ids from a running batch", () => {
  const batch = {
    id: "mr-live",
    status: "running",
    progress: { done: 1, failed: 0, stopped: 0, interrupted: 0, total: 2 },
    selection: [{ key: "combo" }],
    runs: [
      {
        id: "combo::candy",
        comboKey: "combo",
        provider: "p",
        model: "m",
        reasoningEffort: "low",
        taskId: "candy",
        status: "done",
        maxScore: 22.5,
        score: 22.5,
        sessionId: "sess-secret",
        files: [{ name: "result.svg" }],
        detail: { finalText: "最终答案：15" },
        usage: { inputTokens: 10 },
        cost: { usd: 0.01 },
        error: null,
        startedAt: 1,
        finishedAt: 2,
        durationMs: 1,
      },
    ],
    combos: [{ key: "combo", total: 22.5 }],
    summary: { text: "judge digest" },
  };
  const live = stripLiveBatch(batch);
  const run = live.runs[0];
  assert.equal(run.status, "done");
  assert.equal(run.taskId, "candy");
  assert.equal(run.score, undefined);
  assert.equal(run.sessionId, undefined);
  assert.equal(run.detail, undefined);
  assert.equal(run.files, undefined);
  assert.equal(run.cost, undefined);
  assert.deepEqual(live.combos, []);
  assert.equal(live.summary, null);
  assert.deepEqual(live.progress, batch.progress);
  // The original batch is not mutated.
  assert.equal(batch.runs[0].score, 22.5);
});

test("file-tool guard accepts both /var and /private/var spellings of the run root", () => {
  const realRun = "/var/folders/x/T/dsh-model-radar-runs/b/combo/pompeii";
  assert.equal(toolPathEscapesWorkspace(realRun, "work/card_A.png"), false);
  assert.equal(toolPathEscapesWorkspace(realRun, `${realRun}/work/card_A.png`), false);
  assert.equal(toolPathEscapesWorkspace(realRun, `/private${realRun}/work/card_A.png`), false);
  assert.equal(toolPathEscapesWorkspace(realRun, "/tmp/frag_A.png"), true);
  assert.equal(toolPathEscapesWorkspace(realRun, "../sibling/model_answer.json"), true);
  assert.equal(toolPathEscapesWorkspace(realRun, "/Users/tester/.dsh/model-radar/state.json"), true);
});

test("commandEscapesWorkspace blocks the known leak channels but keeps normal work", () => {
  const realRun = "/var/folders/x/T/dsh-model-radar-runs/b/opencode-go__m__low/pompeii";
  assert.equal(commandEscapesWorkspace(`cd ${realRun} && python3 work/render.py`, realRun), false);
  assert.equal(commandEscapesWorkspace(`cd /private${realRun} && python3 work/render.py`, realRun), false);
  assert.equal(commandEscapesWorkspace("python3 -c \"import numpy as np; m = ~ (a == b)\"", realRun), false);
  assert.equal(commandEscapesWorkspace("python3 work/render.py", RUN_DIR), false);
  assert.equal(commandEscapesWorkspace("python3 - <<'PY'\nprint('http://www.w3.org/2000/svg')\nPY", RUN_DIR), false);
  assert.equal(commandEscapesWorkspace("qlmanage -t -s 1400 -o . result.svg", RUN_DIR), false);
  assert.equal(commandEscapesWorkspace("cat ~/.dsh/model-radar/state.json", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("ls /Users/tester/Documents", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("curl http://127.0.0.1:63204/dsh-model-radar/meta", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("cat /tmp/dsh-model-radar-runs/other/model_answer.json", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("find . -name gold.json", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("python3 - <<'PY'\nfor i in range(3):\n    nc=4\nPY", RUN_DIR), false);
  assert.equal(commandEscapesWorkspace("nc -l 9000", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("ls /var/folders/xx/T | head", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("cd $TMPDIR && ls", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("cp work/a.svg /tmp/a.svg", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("python3 -c \"import requests; requests.get('http://x')\"", RUN_DIR), true);
  assert.equal(commandEscapesWorkspace("cp ../sibling/answer.json .", RUN_DIR), true);
});
