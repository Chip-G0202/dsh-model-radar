// dsh-model-radar — task definitions, assets, prompts and artifact collection.
//
// The four tasks and their weights are fixed by the benchmark calibration:
// Qin Shi Huang 60, Pompeii 45, Pelican 22.5, Candy 22.5 (total 150).
// Every batch snapshots TASK_VERSION / RUBRIC_VERSION so trend lines can break
// when the benchmark changes.

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TASK_VERSION = "mr-four-150-v2";
export const RUBRIC_VERSION = "mr-rubric-150-v2";

// Every task is scored on a 0-100 scale by its own rubric, then converted to the
// weighted 150-point total with `score100 / 100 * weight` (codexradar convention:
// qin 60, pompeii 45, pelican 22.5, candy 22.5).
export const TASK_WEIGHTS = { qin: 60, pompeii: 45, pelican: 22.5, candy: 22.5 };

export const TASKS = [
  {
    id: "candy",
    nameKey: "task.candy",
    maxScore: 22.5,
    needsImage: false,
    artifact: null,
    order: 1,
  },
  {
    id: "pompeii",
    nameKey: "task.pompeii",
    maxScore: 45,
    needsImage: true,
    artifact: "model_answer.json",
    order: 2,
  },
  {
    id: "pelican",
    nameKey: "task.pelican",
    maxScore: 22.5,
    needsImage: false,
    artifact: "index.html",
    order: 3,
  },
  {
    id: "qin",
    nameKey: "task.qin",
    maxScore: 60,
    needsImage: false,
    artifact: "result.svg",
    order: 4,
  },
];

const TASK_BY_ID = new Map(TASKS.map((task) => [task.id, task]));

export function pompeiiAssetPath(name) {
  return path.join(ASSET_DIR, name);
}

export const POMPEII_SHA256 =
  "d627aab9791f4ed0971966d43c2a414a12ff4577f174c7c7967d30cee8921f4f";

/**
 * Reference positions of the nine fresco fragments in the solved puzzle,
 * normalized to the same ~1000x500 canvas used by the neighbour graph.
 * Centres of the Voronoi cells used to cut `question.png`, not from any model
 * answer; see `assets/pompeii/SOURCE.md` for the puzzle source and licence.
 */
export const POMPEII_NODES = [
  { label: "A", x: 156.1, y: 77.2 },
  { label: "B", x: 524.2, y: 92.2 },
  { label: "C", x: 836.1, y: 93.2 },
  { label: "D", x: 206.1, y: 225.7 },
  { label: "E", x: 542.0, y: 272.2 },
  { label: "F", x: 900.8, y: 281.0 },
  { label: "G", x: 147.4, y: 403.0 },
  { label: "H", x: 445.5, y: 414.5 },
  { label: "I", x: 780.4, y: 404.5 },
];

export const GOLD_EDGES = [
  ["A", "B"],
  ["A", "D"],
  ["B", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "E"],
  ["C", "F"],
  ["D", "E"],
  ["D", "G"],
  ["D", "H"],
  ["E", "H"],
  ["E", "I"],
  ["F", "I"],
  ["G", "H"],
  ["H", "I"],
];

/** Candy answer: 6 round + 9 star = 15 (exhaustively verified). */
export const CANDY_ANSWER = 15;
/** Candy variant embedded in the Qin task: 9 round + 12 star = 21. */
export const QIN_ANSWER = 21;

const ASSET_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "pompeii",
);

const QIN_PROMPT = `做一张精细的SVG图片，内容是鹈鹕骑着自行车在孙悟空开的大型飞机机翼上骑行，
鹈鹕展开翅膀，上面托着秦始皇的北极熊，秦始皇骑在熊上打螺丝。鹈鹕喊出
“在一个黑色的袋子里放有三种口味的糖果，每种糖果有两种不同的形状（圆形和五角星形，不同的形状靠手感可以分辨）。现已知不同口味的糖和不同形状的数量统计如下表。参赛者需要在活动前决定摸出的糖果数目，那么，最少取出多少个糖果才能保证手中同时拥有不同形状的苹果味和桃子味的糖？（同时手中有圆形苹果味匹配五角星桃子味糖果，或者有圆形桃子味匹配五角星苹果味糖果都满足要求）
苹果味 桃子味 西瓜味
圆形 7 9 8
五角星形 7 6 4”
的结果数值

请把最终 SVG 保存为当前工作目录的 result.svg。完成后简要说明答案和思路。`;

const POMPEII_PROMPT = `# 庞贝壁画邻接恢复

先用 read_image 工具查看当前工作目录的 \`question.png\`。其中的碎片来自同一幅完整壁画；卡片位置已经打乱，但所有碎片均保持正确方向和统一比例。

只恢复**直接邻接拓扑**：判断哪些碎片在完整壁画中边界直接接触。不要求输出绝对坐标、画布尺度或旋转角度。

**时间预算约 10 分钟**：不要构建大型求解框架；优先用简单方法（裁剪、边缘/颜色连续性匹配）快速给出答案。即使分析未完成，也要把当前最有把握的 15 条边写入答案文件。

把最终答案写入当前工作目录的 \`model_answer.json\`，格式必须符合 \`output_schema.json\`：

- 只包含 \`edges\` 数组；
- 每条边是 \`{"a": "B", "b": "C"}\`，按标签字典序书写且不得重复；
- 标签只能是 A–I；
- 未输出的任意碎片对一律视为不相邻。`;

const PELICAN_PROMPT = `创建一个 HTML，内容是 SVG 绘制一个鹈鹕骑自行车的 2D 动画。

请把最终 HTML 保存为当前工作目录的 index.html，页面必须能直接在浏览器打开，SVG 必须内联。`;

const CANDY_PROMPT = `在一个黑色的袋子里放有三种口味的糖果，每种糖果有两种不同的形状（圆形和五角星形，不同的形状靠手感可以分辨）。现已知不同口味的糖和不同形状的数量统计如下表：

形状 | 苹果味 | 桃子味 | 西瓜味
圆形 | 6 | 6 | 5
五角星形 | 5 | 5 | 3

参赛者需要在活动前决定摸出的糖果数目。最少取出多少个糖果，才能保证手中同时拥有不同形状的苹果味和桃子味的糖？同时手中有圆形苹果味匹配五角星桃子味糖果，或者有圆形桃子味匹配五角星苹果味糖果，都满足要求。

取糖时允许在袋内凭手感选择形状，但不能预先辨别口味。请说明取法与为什么不能更少，并在最后另起一行写：
最终答案：<数字>`;

const PROMPTS = {
  qin: QIN_PROMPT,
  pompeii: POMPEII_PROMPT,
  pelican: PELICAN_PROMPT,
  candy: CANDY_PROMPT,
};

const QIN_RUBRIC = `你是严格的评测裁判。请按下面的 rubric 给一个 SVG 作答打分。满分 100（百分制），评分项权重固定，最终由系统折算进 150 分总分。

【题目要点】用 SVG 画出：鹈鹕骑着自行车，在孙悟空驾驶的大型飞机机翼上骑行；鹈鹕展开翅膀，翅膀上托着秦始皇的北极熊；秦始皇骑在熊上打螺丝；鹈鹕喊出糖果题的结果数值。糖果题内嵌变体答案为 21。

【评分项（合计 100 分）】
A. 鹈鹕与自行车
  A1 鹈鹕可辨认：长喙明显、喉囊、眼、头颈与躯干连贯（4）
  A2 双翼展开：左右翼可见，翼缘/飞羽有区分（2）
  A3 自行车结构：两轮、闭合车架、前叉、车把、车座可辨（4）
  A4 骑行接触：鸟腹在车座上方，两足落在曲柄踏板，承托关系明确（6）
B. 飞机与骑行者
  B1 大型飞机：机身、驾驶舱、舷窗、发动机与尾翼完整，机翼有清楚翼根（4）
  B2 自行车在机翼上：前后轮最低处落在机翼上表面，轮下翼面可辨（3）
  B3 孙悟空：突出圆耳、猴脸口鼻、金箍与金箍棒，坐在驾驶舱内且与操纵装置有接触（5）
C. 熊、秦始皇与动作
  C1 北极熊：圆耳、长吻、熊躯与宽爪清楚（6）
  C2 秦始皇骑在熊上：垂旒冕冠、人形面部、帝袍，臀部接触熊背鞍具，腿沿熊侧下垂（5）
  C3 打螺丝：手/电动螺丝刀/螺丝/金属板接触关系明确，工具轴线与螺杆一致（5）
D. 喊话与数值
  D1 喊话归属：气泡尾端明确指向鹈鹕张开的喙，而不是其他角色（3）
  D2 气泡内数值醒目可读（3）
E. 画面与工艺
  E1 构图：飞机横贯下部，鹈鹕/熊/秦始皇构成中央主体，清单和策略条布局有序、比例协调（5）
  E2 文字排版：标题、清单表格及底栏清楚；文字不过小、不重叠、不截断（5）
  E3 轮廓与线条：主要轮廓闭合、曲线流畅、线宽层级一致，角色连接与透视连贯（5）
  E4 细节与配色：飞羽、轮辐链条、机身铆钉、冠旒、鞍饰等细节组织清楚，配色协调、主体与背景分离（7）
F. 答案与推理
  F1 最终文本明确给出答案 21（8）
  F2 取法与下界解释正确：说明 9 圆 + 12 星或等价构造，并能证明不能更少（8）
  F3 图中喊话气泡/文字包含数值 21（10）
  F4 图中数值与最终答案一致，无冲突（2）

【核心关系门槛】除评分项外，请判断 7 条核心关系是否成立，写入 core（confirmed / partial / not_met）：
R1 鹈鹕与自行车接触（坐在车座、脚在踏板）
R2 自行车落在飞机机翼上（轮子接触机翼表面）
R3 北极熊在鹈鹕展开的翅膀上（承托关系明确）
R4 秦始皇骑在熊上（坐姿接触）
R5 打螺丝动作接触成立（工具-螺丝-金属板）
R6 喊话气泡尾端指向鹈鹕
R7 主体完整：鹈鹕、自行车、飞机机翼、熊、秦始皇全部在画面内且可辨
系统会按核心关系完成度对最终百分制分数设上限（两条 not_met → 59；一条 not_met → 69；无 not_met 但两条 partial → 69；一条 partial → 79；全部 confirmed → 100）。

严格要求：只输出一个 JSON 对象，不要 markdown 代码块，不要额外解释文字。格式：
{"score": <0-100 的数字，等于 breakdown 各项之和>, "breakdown": {"A1": <0-4>, "A2": <0-2>, "A3": <0-4>, "A4": <0-6>, "B1": <0-4>, "B2": <0-3>, "B3": <0-5>, "C1": <0-6>, "C2": <0-5>, "C3": <0-5>, "D1": <0-3>, "D2": <0-3>, "E1": <0-5>, "E2": <0-5>, "E3": <0-5>, "E4": <0-7>, "F1": <0-8>, "F2": <0-8>, "F3": <0-10>, "F4": <0-2>}, "core": {"R1": "confirmed|partial|not_met", "R2": "...", "R3": "...", "R4": "...", "R5": "...", "R6": "...", "R7": "..."}, "reason": "<120 字以内的中文理由，点出主要扣分点>"}`;

const PELICAN_RUBRIC = `你是严格的评测裁判。请按下面的 rubric 给一个 HTML/SVG 动画作答打分。满分 100（百分制），最终由系统折算进 150 分总分。

【题目】创建一个 HTML，内容是 SVG 绘制一个鹈鹕骑自行车的 2D 动画。
【判分依据】以产物（HTML/SVG 代码、内联几何与动画定义、可运行性）中的可验证证据为准；无法从产物确认的细节，按保守原则给分并写明扣分理由。

【评分项（合计 100 分）】
pelican_identity 12：鹈鹕可辨认——长喙明显超过头长、下方喉囊饱满、头颈/躯干/翼/尾连贯
pelican_legs 4：两腿从腹部下方伸出，关节折弯和足形明确，腿段长度稳定
bike_structure 11：两轮具备轮圈、轮毂和辐条，车架闭合，前叉连前轴，车把、车座连接合理
bike_drivetrain 5：中轴位于车架底点，两侧曲柄反向对应，末端有踏板，链条轮廓连接后轴
ride_seat 6：鸟腹下缘落在可见车座上，座管在下方接入车架
ride_orientation 4：头、喙、身体朝向与车把/前叉方向一致
ride_foot_pedal 18：两足落在各自曲柄末端的踏板上；曲柄姿态变化时仍保持可见接触关系
motion_rotation 10：车轮/曲柄有旋转或角度变化（标记角度改变），各部件保持在对应轴心
motion_leg_crank 10：双腿关节随同侧踏板高低改变弯曲姿态，双足上下位置交替
motion_body 4：骑者相对车座/车把位置稳定，身体部件保持完整
visual_subject 5：鸟与自行车完整入画、居于视觉中心，足、曲柄、车座区域尺寸足够辨认
visual_text 3：视口内标题、说明及底部控件完整，无重叠或截断，文字可读
visual_craft 5：轮廓精细、线条风格一致、配色协调，羽翼/喉囊/车轮细节清楚
visual_readability 3：远侧腿在车架后、近侧腿在前等遮挡关系清楚，驱动区一眼可辨

严格要求：只输出一个 JSON 对象，不要 markdown 代码块，不要额外解释文字。格式：
{"score": <0-100 的数字，等于 breakdown 各项之和>, "breakdown": {"pelican_identity": <0-12>, "pelican_legs": <0-4>, "bike_structure": <0-11>, "bike_drivetrain": <0-5>, "ride_seat": <0-6>, "ride_orientation": <0-4>, "ride_foot_pedal": <0-18>, "motion_rotation": <0-10>, "motion_leg_crank": <0-10>, "motion_body": <0-4>, "visual_subject": <0-5>, "visual_text": <0-3>, "visual_craft": <0-5>, "visual_readability": <0-3>}, "reason": "<120 字以内的中文理由，点出主要扣分点>"}`;

const RUBRICS = { qin: QIN_RUBRIC, pelican: PELICAN_RUBRIC };

export function getTask(taskId) {
  const task = TASK_BY_ID.get(taskId);
  if (task === undefined) throw new Error(`unknown task: ${taskId}`);
  return task;
}

export function taskIds() {
  return TASKS.map((task) => task.id);
}

export function buildPrompt(taskId) {
  const prompt = PROMPTS[taskId];
  if (prompt === undefined) throw new Error(`unknown task: ${taskId}`);
  return prompt;
}

export function judgeRubric(taskId) {
  const rubric = RUBRICS[taskId];
  if (rubric === undefined) throw new Error(`task ${taskId} is not judge-scored`);
  return rubric;
}

/** Copy the task's input assets into a fresh run directory. */
export async function prepareRunDir(taskId, runDir) {
  await mkdir(runDir, { recursive: true });
  if (taskId !== "pompeii") return [];
  const copied = [];
  for (const name of ["question.png", "output_schema.json", "README.md"]) {
    const from = path.join(ASSET_DIR, name);
    if (!existsSync(from)) throw new Error(`missing benchmark asset: ${name}`);
    const to = path.join(runDir, name);
    await copyFile(from, to);
    copied.push(to);
  }
  return copied;
}

export async function pompeiiGold() {
  const json = await readFile(path.join(ASSET_DIR, "gold.json"), "utf8").catch(() => null);
  if (json !== null) {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed.edges) && parsed.edges.length > 0) return parsed;
  }
  return {
    edges: GOLD_EDGES,
    questionSha256: POMPEII_SHA256,
    version: TASK_VERSION,
  };
}

export async function assetHashes() {
  const files = ["question.png", "reference.png", "output_schema.json", "README.md"];
  const hashes = {};
  for (const name of files) {
    const file = path.join(ASSET_DIR, name);
    const bytes = await readFile(file).catch(() => null);
    hashes[name] = bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
  }
  return hashes;
}

async function newestHtml(runDir) {
  let entries = [];
  try {
    entries = await readdir(runDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.html?$/i.test(entry.name)) continue;
    const file = path.join(runDir, entry.name);
    const info = await stat(file).catch(() => null);
    if (info === null) continue;
    candidates.push({ file, name: entry.name, bytes: info.size, mtime: info.mtimeMs });
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  const index = candidates.find((entry) => entry.name.toLowerCase() === "index.html");
  return { primary: index ?? candidates[0] ?? null, all: candidates };
}

async function readText(file, limit) {
  if (file === null) return null;
  const info = await stat(file).catch(() => null);
  if (info === null || info.size === 0) return null;
  const text = await readFile(file, "utf8").catch(() => null);
  if (text === null) return null;
  return text.length > limit ? `${text.slice(0, limit)}\n…（已截断）` : text;
}

/**
 * Collect the artifacts a run produced. Returns relative-to-runDir paths only,
 * so stored batches stay portable across machines.
 */
export async function collectRunArtifacts(taskId, runDir) {
  const files = [];
  const detail = {};

  if (taskId === "qin") {
    const file = path.join(runDir, "result.svg");
    const info = await stat(file).catch(() => null);
    if (info !== null && info.size > 0) {
      files.push({ name: "result.svg", bytes: info.size });
      detail.svgText = await readText(file, 100 * 1024);
    }
  } else if (taskId === "pompeii") {
    const file = path.join(runDir, "model_answer.json");
    const info = await stat(file).catch(() => null);
    if (info !== null && info.size > 0) {
      files.push({ name: "model_answer.json", bytes: info.size });
      detail.answerText = await readText(file, 20 * 1024);
    }
  } else if (taskId === "pelican") {
    const found = await newestHtml(runDir);
    if (found?.primary !== null) {
      files.push({
        name: found.primary.name,
        bytes: found.primary.bytes,
        primary: true,
      });
      detail.htmlText = await readText(found.primary.file, 100 * 1024);
      for (const extra of found.all) {
        if (extra.name !== found.primary.name) files.push({ name: extra.name, bytes: extra.bytes });
      }
    }
  }

  return { files, detail };
}

export function taskLabel(taskId) {
  return getTask(taskId).nameKey;
}