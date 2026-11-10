// dsh-model-radar — per-run isolation audit.
//
// Benchmark candidates run as local DSH agents with a restricted tool set but a
// `danger-full-access` host sandbox, so a string guard around bash cannot prove
// that nothing leaked. This module reads one run's session events afterwards and
// records every tool call that tried to reach outside the run directory, the
// host store, another batch, the plugin routes or the network. The verdict is
// stored on the run (`detail.isolation`) so a batch can be audited instead of
// trusted blindly.
//
// It is a detector, not a fence: it can flag suspicious sessions, and it is
// deliberately conservative so legitimate work (SVG xmlns URLs, python heredocs
// that only touch the working directory) is not mislabeled.

import path from "node:path";
import { realpathSync } from "node:fs";

const FILE_TOOLS = new Set(["read", "read_image", "write", "edit", "glob", "grep"]);

const BASH_PATTERNS = [
  // The run's own cwd is scrubbed from the command before these run, so a
  // literal `cd /var/folders/.../dsh-model-radar-runs/.../qin` stays clean.
  { kind: "host-route", pattern: /dsh-model-radar|task-asset|gold\.json|reference\.png|codexradar/i, reason: "references the benchmark plugin, its gold assets or the public answer source" },
  { kind: "host-store", pattern: /(^|[\s"'`=;(])\.dsh([\\/]|[\s"'`;)]|$)/, reason: "references the harness store" },
  // `nc=4` / `nc = ...` in a Python heredoc is a local variable, not netcat.
  { kind: "network", pattern: /(^|;|&&|\|\||\n)\s*(?:sudo\s+)?(curl|wget|nc|ncat|telnet|ssh|scp)\b(?![\s]*=)/i, reason: "starts a network client" },
  { kind: "network", pattern: /(127\.0\.0\.1|localhost|0\.0\.0\.0)/i, reason: "addresses the local host" },
  { kind: "network", pattern: /(requests\.(get|post|put|patch|delete|request|Session)\b|urllib\.request|http\.client|socket\.socket\b|websocket\.(create_connection|WebSocketApp))/i, reason: "makes a network request" },
  { kind: "outside-workspace", pattern: /var\/folders|private\/var|\$TMPDIR|\$\{TMPDIR\}/i, reason: "references the shared temp root outside the run directory" },
  { kind: "outside-home", pattern: /(\$HOME|\$\{HOME\}|(^|[\s"'`=;(])~(?=[\\/"'`;)]|$)|Path\.home|expanduser|os\.homedir|\/Users\/)/, reason: "resolves the user home directory" },
  { kind: "traversal", pattern: /(^|[\s"'`=;(])\.\.([\\/]|[\s"'`;)]|$)/, reason: "walks to a parent directory" },
];

/** Root variants used by macOS (`/var` is a symlink to `/private/var`). */
function rootForms(root) {
  const forms = new Set();
  if (typeof root !== "string" || root === "") return forms;
  const resolved = path.resolve(root);
  forms.add(resolved);
  try {
    forms.add(realpathSync(resolved));
  } catch {
    // The root may not exist yet; the resolved spelling is enough.
  }
  for (const form of [...forms]) {
    if (form.startsWith("/private/")) forms.add(form.slice("/private".length));
    else forms.add(`/private${form}`);
  }
  return forms;
}

function scrubRoots(command, root) {
  let text = String(command ?? "");
  for (const form of rootForms(root)) text = text.split(form).join("<RUN>");
  return text;
}

function argumentsOf(call) {
  const raw = call?.arguments;
  if (raw === null || raw === undefined) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function excerpt(value, limit = 160) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function isInside(root, target) {
  if (typeof target !== "string" || target === "") return true;
  const roots = rootForms(root);
  const resolvedTarget = path.resolve(root, target);
  const candidates = new Set([resolvedTarget]);
  try {
    candidates.add(realpathSync(resolvedTarget));
  } catch {
    // Missing target: compare its resolved spelling.
  }
  for (const candidate of candidates) {
    for (const form of roots) {
      if (candidate === form || candidate.startsWith(`${form}${path.sep}`)) return true;
    }
  }
  return false;
}

/**
 * Audit one run's session events.
 *
 * @param events - session events (live or persisted) for the candidate run.
 * @param runDir - the run's own working directory; everything outside it is out of scope.
 * @returns a serializable audit record for `run.detail.isolation`.
 */
export function auditRunIsolation(events, runDir) {
  const violations = [];
  let inspected = 0;
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== "tool/call") continue;
    const data = event.data ?? {};
    const name = typeof data.name === "string" ? data.name : "";
    if (name === "") continue;
    inspected += 1;
    const callId = typeof data.callId === "string" ? data.callId : "";
    const args = argumentsOf(data);
    if (name === "bash") {
      const command = scrubRoots(args.command, runDir);
      for (const rule of BASH_PATTERNS) {
        if (rule.pattern.test(command)) {
          violations.push({ call: inspected, callId, tool: name, kind: rule.kind, reason: rule.reason, excerpt: excerpt(command) });
        }
      }
      continue;
    }
    if (FILE_TOOLS.has(name)) {
      const target = args.file_path ?? args.path ?? args.pattern ?? "";
      if (typeof target === "string" && target !== "" && !isInside(runDir, target)) {
        violations.push({
          call: inspected,
          callId,
          tool: name,
          kind: "outside-workspace",
          reason: "file tool target is outside the run working directory",
          excerpt: excerpt(target),
        });
      }
    }
  }
  // Tool results tell us whether the run's guard actually refused the call.
  // A refused attempt is "blocked" (the fence held); an attempt that ran is
  // "suspect".
  if (violations.length > 0) {
    const blockedIds = new Set();
    for (const event of Array.isArray(events) ? events : []) {
      if (event?.type !== "tool/result") continue;
      const message = event.data?.message ?? {};
      const text = JSON.stringify(message.content ?? "");
      if (!/not allowed|not part of this benchmark run/i.test(text)) continue;
      if (typeof message.toolCallId === "string") blockedIds.add(message.toolCallId);
    }
    for (const violation of violations) {
      if (violation.callId !== "" && blockedIds.has(violation.callId)) violation.blocked = true;
    }
  }
  const unique = [];
  const index = new Map();
  for (const violation of violations) {
    const key = `${violation.tool}\u0000${violation.kind}\u0000${violation.blocked === true ? "blocked" : "ran"}\u0000${violation.excerpt}`;
    const seen = index.get(key);
    if (seen === undefined) {
      index.set(key, violation);
      unique.push(violation);
    } else if (violation.blocked === true) {
      seen.blocked = true;
    }
  }
  const blocked = unique.filter((violation) => violation.blocked === true).length;
  return {
    audited: true,
    verdict: unique.length === 0 ? "clean" : blocked === unique.length ? "blocked" : "suspect",
    inspected,
    blocked,
    violations: unique.slice(0, 20),
    at: Date.now(),
  };
}

/** Merge the audit verdict into a run's detail without touching its score. */
export function attachIsolationAudit(run, events, runDir) {
  const audit = auditRunIsolation(events, runDir);
  run.detail = run.detail ?? {};
  run.detail.isolation = audit;
  return audit;
}
