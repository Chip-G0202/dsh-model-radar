// dsh-model-radar — browser half.
//
// One self-contained browser artifact: no imports, no build step, no third
// party libraries. The Host half owns every route under /dsh-model-radar/*;
// this file only renders the sidebar entry and the full page.
window.__ModuleLoader__.load({
	id: "dsh-model-radar",
	factory: (require) => {
		const React = require("react");
		const h = React.createElement;
		const NS = "dsh-model-radar";
		const PANEL_ID = "model-radar";
		const API = "/dsh-model-radar";
		const CSS_ID = "dsh-model-radar";
		const TREND_BATCH_LIMIT = 10;
		const HISTORY_LIMIT = 50;
		const ANSWER_EXCERPT_LIMIT = 800;
		const POLL_INTERVAL_MS = 2000;
		const REPORT_CACHE_MS = 60 * 1000;
		const LATEST_TABLE_OPEN_KEY = "dsh-model-radar.latest-table-open";
		const THEME_KEY = "dsh-model-radar.theme";
		let themeService = null;
		const ARTIFACT_TEXT_LIMIT = 200 * 1024;
		const EFFORT_ORDER = ["off", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
		const RECOMMEND_DIM_KEYS = Object.freeze({
			quality: "mr.recommend.dim.quality",
			speed: "mr.recommend.dim.speed",
			cost: "mr.recommend.dim.cost",
			stability: "mr.recommend.dim.stability",
		});
		const RECOMMEND_ALT_KEYS = Object.freeze({
			quality: "mr.recommend.alt.quality",
			value: "mr.recommend.alt.value",
			speed: "mr.recommend.alt.speed",
		});
		const GRADE_KEYS = Object.freeze({
			score: "mr.grade.score",
			score100: "mr.grade.score100",
			maxScore: "mr.grade.maxScore",
			answer: "mr.grade.answer",
			ok: "mr.grade.ok",
			weighted: "mr.grade.weighted",
			cap: "mr.grade.cap",
			final100: "mr.grade.final100",
			correct: "mr.grade.correct",
			reason: "mr.grade.reason",
		});
		const POMPEII_LABELS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
		const EFFORT_TONES = Object.freeze({
			minimal: "hsl(200 72% 50%)",
			low: "hsl(215 80% 52%)",
			medium: "hsl(232 76% 56%)",
			high: "hsl(252 76% 58%)",
			xhigh: "hsl(268 76% 56%)",
			max: "hsl(282 72% 50%)",
			ultra: "hsl(296 70% 48%)",
		});
		const ARTIFACT_SOURCE_EXTENSIONS = new Set(["svg", "html", "json", "txt"]);

		const TASKS = [
			{ id: "candy", nameKey: "mr.task.candy.name", descKey: "mr.ranking.task.candy.desc", maxScore: 22.5 },
			{ id: "pompeii", nameKey: "mr.task.pompeii.name", descKey: "mr.ranking.task.pompeii.desc", maxScore: 45 },
			{ id: "pelican", nameKey: "mr.task.pelican.name", descKey: "mr.ranking.task.pelican.desc", maxScore: 22.5 },
			{ id: "qin", nameKey: "mr.task.qin.name", descKey: "mr.ranking.task.qin.desc", maxScore: 60 },
		];
		const TASK_BY_ID = new Map(TASKS.map((task) => [task.id, task]));

		const STATUS_KEYS = {
			running: "mr.status.running",
			done: "mr.status.done",
			partial: "mr.status.partial",
			stopped: "mr.status.stopped",
			error: "mr.status.error",
			interrupted: "mr.status.interrupted",
			pending: "mr.status.pending",
			timeout: "mr.status.timeout",
			judge_error: "mr.status.judgeError",
			skipped: "mr.status.skipped",
		};
		const EXCLUDED_TREND_STATUSES = new Set(["running", "partial", "stopped", "error", "interrupted"]);

		const RANGE_OPTIONS = [
			{ id: "today", labelKey: "mr.perf.range.today" },
			{ id: "week", labelKey: "mr.perf.range.week" },
			{ id: "month", labelKey: "mr.perf.range.month" },
			{ id: "all", labelKey: "mr.perf.range.all" },
		];

		const DIMENSION_KEYS = {
			outputSpeed: "mr.perf.dim.outputSpeed",
			ttft: "mr.perf.dim.ttft",
			tps: "mr.perf.dim.tps",
			reasoning: "mr.perf.dim.reasoning",
			reasoningCps: "mr.perf.dim.reasoningCps",
			toolGap: "mr.perf.dim.toolGap",
			toolGapMs: "mr.perf.dim.toolGap",
			tool: "mr.perf.dim.tool",
			toolMs: "mr.perf.dim.toolMs",
			toolSuccess: "mr.perf.dim.toolSuccess",
			cacheHit: "mr.perf.dim.cacheHit",
			cost: "mr.perf.dim.cost",
			stability: "mr.perf.dim.stability",
			throughput: "mr.perf.dim.throughput",
			context: "mr.perf.dim.context",
		};

		const RADAR_LABEL_KEYS = {
			ttft: "mr.perf.radar.ttft",
			tps: "mr.perf.radar.tps",
			throughput: "mr.perf.radar.tps",
			outputSpeed: "mr.perf.radar.speed",
			reasoning: "mr.perf.radar.thinking",
			reasoningCps: "mr.perf.radar.thinking",
			toolGap: "mr.perf.radar.toolGap",
			toolGapMs: "mr.perf.radar.toolGap",
			tool: "mr.perf.radar.toolTime",
			toolMs: "mr.perf.radar.toolTime",
			toolSuccess: "mr.perf.radar.success",
			cacheHit: "mr.perf.radar.cache",
		};

		const VIEW_OPTIONS = [
			{ id: "ranking", labelKey: "mr.view.ranking" },
			{ id: "performance", labelKey: "mr.view.performance" },
			{ id: "history", labelKey: "mr.view.history" },
			{ id: "settings", labelKey: "mr.view.settings" },
		];

		const SERIES_DASHES = ["", "7 4", "2 3", "10 5 2 5", "4 4"];

		const zh = {
			"mr.panel.name": "模型雷达",
			"mr.page.title": "模型雷达",
			"mr.page.subtitle": "模型智商评测 · 真实性能评分",
			"mr.page.refresh": "刷新",
			"mr.theme.toDark": "切换到深色模式",
			"mr.credits.prefix": "灵感来自",
			"mr.theme.toLight": "切换到浅色模式",
			"mr.page.refreshing": "刷新中…",
			"mr.page.start": "开始评测",
			"mr.page.stop": "停止评测",
			"mr.page.viewProgress": "查看进度",
			"mr.page.running": "运行中",
			"mr.page.loadFailed": "页面数据读取失败",
			"mr.view.ranking": "排行榜",
			"mr.view.performance": "性能",
			"mr.view.history": "历史",
			"mr.view.settings": "设置",
			"mr.detail.rerunCount": "重跑 ×{count}",
			"mr.panel.errorTitle": "模型雷达渲染出错",
			"mr.panel.retry": "重试",
			"mr.isolation.tagBlocked": "[已拦截]",
			"mr.isolation.tagAllowed": "[未拦截]",
			"mr.grade.score": "得分",
			"mr.grade.score100": "百分制",
			"mr.grade.maxScore": "满分",
			"mr.grade.answer": "答案",
			"mr.grade.ok": "通过",
			"mr.grade.weighted": "加权分",
			"mr.grade.cap": "上限",
			"mr.grade.final100": "最终分",
			"mr.grade.correct": "正确",
			"mr.grade.reason": "判定理由",
			"mr.history.rerun": "重跑",
			"mr.history.rerunRow": "重跑批次 {id}",
			"mr.rerun.toastStarted": "已开始重跑，进度会自动刷新",
			"mr.view.tabs": "视图切换",
			"mr.common.close": "关闭",
			"mr.common.cancel": "取消",
			"mr.common.retry": "重试",
			"mr.common.yes": "是",
			"mr.common.no": "否",
			"mr.common.loading": "正在加载…",
			"mr.common.none": "—",
			"mr.common.unknown": "未知",
			"mr.common.defaultEffort": "默认",
			"mr.common.samples": "样本",
			"mr.common.score": "得分",
			"mr.common.cost": "费用",
			"mr.common.duration": "耗时",
			"mr.common.time": "时间",
			"mr.common.model": "模型",
			"mr.common.effort": "档位",
			"mr.common.status": "状态",
			"mr.common.provider": "Provider",
			"mr.common.session": "Session",
			"mr.common.error": "错误",
			"mr.common.total": "总分",
			"mr.common.rank": "排名",
			"mr.common.answer": "答案",
			"mr.common.reason": "理由",
			"mr.common.artifact": "产物",
			"mr.common.judge": "裁判",
			"mr.common.batch": "批次",
			"mr.common.summary": "汇总",
			"mr.common.requests": "请求",
			"mr.common.value": "数值",
			"mr.common.count": "数量",
			"mr.common.files": "文件",
			"mr.common.refreshFailed": "刷新失败",
			"mr.common.loadingFailed": "加载失败",
			"mr.common.open": "打开",
			"mr.common.selected": "已选",
			"mr.common.unavailable": "不可用",
			"mr.common.listSeparator": "、",
			"mr.status.running": "运行中",
			"mr.status.done": "完成",
			"mr.status.partial": "部分完成",
			"mr.status.stopped": "已停止",
			"mr.status.error": "失败",
			"mr.status.interrupted": "已中断",
			"mr.status.pending": "等待中",
			"mr.status.timeout": "超时",
			"mr.status.judgeError": "裁判失败",
			"mr.status.skipped": "已跳过",
			"mr.status.unknown": "未知",
			"mr.status.notInTrend": "不进入趋势",
			"mr.status.interruptedHint": "插件被禁用或重载导致中断，可继续运行未完成的题目",
			"mr.ranking.batchTitle": "最新批次",
			"mr.ranking.batchMeta": "批次 {id} · {time}",
			"mr.ranking.tableTitle": "排行榜",
			"mr.ranking.tableSubtitle": "点击行查看逐题明细，点击表头排序",
			"mr.ranking.sortHint": "切换排序",
			"mr.ranking.col.rank": "排名",
			"mr.ranking.col.model": "模型 · 档位",
			"mr.ranking.col.total": "总分/150",
			"mr.ranking.col.candy": "糖果",
			"mr.ranking.col.pompeii": "庞贝",
			"mr.ranking.col.pelican": "鹈鹕",
			"mr.ranking.col.qin": "秦始皇",
			"mr.ranking.col.cost": "费用",
			"mr.ranking.col.duration": "耗时",
			"mr.ranking.col.time": "批次时间",
			"mr.ranking.rowOpen": "查看 {model} 的逐题明细",
			"mr.ranking.emptyTitle": "还没有评测数据",
			"mr.ranking.emptyBody": "四道题合计 150 分，用同一套题单与 rubric 给模型做一次可复现的智商评测；每一批次还会记录真实耗时与费用。",
			"mr.ranking.emptyStats": "已运行 {batches} 个批次 · {runs} 次运行",
			"mr.ranking.emptyStart": "开始第一次评测",
			"mr.ranking.task.candy.desc": "糖果计数：三种口味、两种形状，算出保证配对的最少抽取数。",
			"mr.ranking.task.pompeii.desc": "庞贝壁画：根据碎片图恢复直接邻接关系，按 F1 计分。",
			"mr.ranking.task.pelican.desc": "鹈鹕骑车：产出可直接打开的内联 SVG 动画页面。",
			"mr.ranking.task.qin.desc": "秦始皇：综合长题，产出精细 SVG 并回答嵌套计数。",
			"mr.ranking.trend.title": "分数趋势",
			"mr.ranking.trend.subtitle": "同一题单与 rubric 版本的批次才连成一条线",
			"mr.ranking.trend.empty": "还没有可用的趋势数据",
			"mr.ranking.trend.pending": "同版本至少需要两个完整批次才能形成趋势线",
			"mr.ranking.trend.version": "口径 {task} / {rubric}",
			"mr.ranking.trend.axisScore": "总分",
			"mr.ranking.trend.point": "{series} · {time}：{score} 分",
			"mr.ranking.pareto.title": "Pareto 前沿",
			"mr.ranking.pareto.subtitle": "分数越高越靠上，费用或耗时越低越靠左",
			"mr.ranking.pareto.metricCost": "分数 × 费用",
			"mr.ranking.pareto.metricDuration": "分数 × 耗时",
			"mr.ranking.pareto.empty": "至少需要一个完整组合才能绘制 Pareto 图",
			"mr.ranking.pareto.axisCost": "费用（USD）",
			"mr.ranking.pareto.axisDuration": "总耗时（秒）",
			"mr.ranking.pareto.axisScore": "总分",
			"mr.ranking.pareto.points": "组合",
			"mr.ranking.pareto.frontier": "Pareto 前沿",
			"mr.ranking.pareto.point": "{model}：{score} 分 · {metric}",
			"mr.ranking.caliber.title": "评测口径",
			"mr.ranking.caliber.taskVersion": "题单版本",
			"mr.ranking.caliber.rubricVersion": "rubric 版本",
			"mr.ranking.caliber.judge": "裁判模型 · 档位",
			"mr.ranking.caliber.gold": "gold sha",
			"mr.ranking.caliber.generated": "生成时间",
			"mr.ranking.summaryTitle": "裁判汇总",
			"mr.ranking.summaryEmpty": "本批次还没有裁判汇总",
			"mr.ranking.runningNote": "最新批次仍在运行，表格展示当前已完成部分",
			"mr.ranking.incompleteNote": "最新批次未完整完成（{status}），不进入趋势统计",
			"mr.ranking.resumeBanner": "最新批次{status}（完成 {done}/{total}），可继续运行剩余题目",
			"mr.iq.title": "模型智商",
			"mr.iq.subtitle": "四题 · 满分 150 · 最新批次 {id}",
			"mr.iq.highest": "本轮最高",
			"mr.iq.ranking": "总分排行",
			"mr.iq.noComplete": "本轮暂无完整组合",
			"mr.iq.incomplete": "不完整",
			"mr.iq.incompleteNote": "不完整或失败的组合不参与排名",
			"mr.iq.cost": "费用",
			"mr.iq.speedTitle": "受控测速 TPS / TTFT",
			"mr.iq.delta": "较上批 {delta}",
			"mr.iq.duration": "耗时",
			"mr.iq.emptyTitle": "还没有模型智商数据",
			"mr.iq.emptyBody": "完成一轮评测后，这里会显示最高分、总分排行和档位雷达。",
			"mr.iq.rowLabel": "{model} · {effort}，{score} 分",
			"mr.matrix.title": "档位雷达",
			"mr.matrix.subtitle": "同一题单 / rubric 版本内，按批次时间取每个组合每题的最新有效分",
			"mr.matrix.total": "总分",
			"mr.matrix.legend": "分数色阶",
			"mr.matrix.legendLow": "低",
			"mr.matrix.legendHigh": "高",
			"mr.matrix.cellTitle": "批次 {batch} · {status} · {time} · {score} / {max}",
			"mr.matrix.missingTitle": "无数据",
			"mr.matrix.noData": "当前版本还没有可展示的分数",
			"mr.matrix.version": "题单 {task} · rubric {rubric}",
			"mr.matrix.open": "打开 {model} · {effort} 的明细",
			"mr.matrix.model": "模型",
			"mr.ranking.latestTableTitle": "最新批次明细",
			"mr.ranking.group.quality": "质量",
			"mr.ranking.group.performance": "性能",
			"mr.ranking.group.cost": "成本",
			"mr.ranking.group.batch": "批次",
			"mr.ranking.tableScrollHint": "← 左右滑动查看更多 →",
			"mr.ranking.expand": "展开",
			"mr.ranking.collapse": "收起",
			"mr.ranking.tableCount": "{count} 个组合",
			"mr.artifact.open": "查看产物",
			"mr.artifact.title": "查看产物",
			"mr.artifact.preview": "预览",
			"mr.artifact.source": "源码",
			"mr.artifact.openNew": "在新标签页打开",
			"mr.artifact.loading": "正在加载产物…",
			"mr.artifact.error": "产物加载失败",
			"mr.artifact.unsupported": "该文件类型暂不支持内嵌预览，请在新标签页打开。",
			"mr.artifact.truncated": "内容超过 {limit}，仅展示前 {limit}。",
			"mr.artifact.empty": "这个运行没有产物文件",
			"mr.artifact.primary": "主要产物",
			"mr.artifact.imageFailed": "图片加载失败，请在新标签页打开。",
			"mr.artifact.previewFailed": "预览加载失败，请在新标签页打开。",
			"mr.pompeii.title": "拼图情况",
			"mr.pompeii.subtitle": "邻接边对比 · 参考位置示意",
			"mr.pompeii.score": "得分",
			"mr.pompeii.f1": "F1",
			"mr.pompeii.correct": "正确",
			"mr.pompeii.incorrect": "错连",
			"mr.pompeii.missing": "漏连",
			"mr.pompeii.graphTitle": "模型邻接关系 · 参考位置示意",
			"mr.pompeii.noAnswer": "模型未给出有效答案，全部参考边按漏连展示。",
			"mr.pompeii.noMeta": "拼图参考数据尚未加载，无法绘制邻接图。",
			"mr.pompeii.questionImage": "原始题面",
			"mr.pompeii.referenceImage": "真实拼合参考",
			"mr.pompeii.openImage": "在新标签页打开「{name}」",
			"mr.artifact.dialogLabel": "产物预览",
			"mr.artifact.subtitle": "{model} · {task}",
			"mr.artifact.imageAlt": "产物预览：{file}",
			"mr.ranking.costTitle": "生成 {generation} + 裁判 {judge}",
			"mr.ranking.noTotal": "未完成",
			"mr.ranking.loading": "正在读取最新批次…",
			"mr.task.candy.name": "糖果",
			"mr.task.pompeii.name": "庞贝",
			"mr.task.pelican.name": "鹈鹕",
			"mr.task.qin.name": "秦始皇",
			"mr.start.title": "开始评测",
			"mr.start.subtitle": "选择候选模型与推理档位，再由裁判模型统一评分",
			"mr.start.selectAll": "全选",
			"mr.start.selectAllHint": "选中每个模型的默认档位",
			"mr.start.clear": "清空",
			"mr.start.modelsTitle": "候选模型",
			"mr.start.judgeTitle": "裁判模型",
			"mr.start.judgeHint": "裁判负责给鹈鹕与秦始皇打分，并生成批次汇总",
			"mr.start.provider": "Provider",
			"mr.start.model": "模型",
			"mr.start.effort": "推理档位",
			"mr.start.count": "{combos} 个组合 × 4 题 = {runs} 次运行",
			"mr.start.lanes": "最多 {lanes} 条模型车道",
			"mr.start.selected": "已选 {count}/{max} 个组合",
			"mr.start.selectedUnlimited": "已选 {count} 个组合",
			"mr.start.contextWindow": "上下文 {value}",
			"mr.start.maxOutput": "输出上限 {value}",
			"mr.start.maxCombos": "最多 {max} 个组合",
			"mr.start.limitReached": "最多只能选择 {max} 个组合",
			"mr.start.emptySelection": "请至少选择一个模型档位",
			"mr.start.submit": "开始评测",
			"mr.start.submitting": "正在创建评测…",
			"mr.start.busy": "已有评测在运行",
			"mr.start.failed": "启动评测失败",
			"mr.start.catalogLoading": "正在读取模型目录…",
			"mr.start.catalogError": "模型目录读取失败",
			"mr.start.noModels": "没有可评测的模型",
			"mr.start.image": "支持图片",
			"mr.start.providerModels": "{count} 个模型",
			"mr.start.expand": "展开推理档位",
			"mr.start.collapse": "收起推理档位",
			"mr.start.judgePreview": "{provider} / {model} · {effort}",
			"mr.start.limitHint": "每次最多提交 {max} 个组合",
			"mr.start.dialogLabel": "开始模型雷达评测",
			"mr.start.effortsSelected": "已选 {count} 个档位",
			"mr.start.effortCount": "{count} 个档位",
			"mr.start.loadCatalog": "重新读取目录",
			"mr.run.title": "评测进行中",
			"mr.run.dialogLabel": "评测进度",
			"mr.run.preparing": "正在创建裁判会话并运行受控测速…",
			"mr.run.lane": "车道",
			"mr.run.current": "当前题目",
			"mr.run.waiting": "等待中",
			"mr.run.doneCount": "完成 {done}/{total}",
			"mr.run.failedCount": "失败 {failed}",
			"mr.run.elapsed": "已用时 {time}",
			"mr.run.progress": "整体进度 {done}/{total}",
			"mr.run.stop": "停止评测",
			"mr.run.stopping": "正在停止…",
			"mr.run.stopRequested": "已发送停止请求",
			"mr.run.stopFailed": "停止评测失败",
			"mr.run.finished": "评测结束：{status}",
			"mr.run.view": "查看进度",
			"mr.run.speedTesting": "受控测速中",
			"mr.run.laneDone": "车道完成",
			"mr.run.laneStopped": "车道已停止",
			"mr.run.laneRunning": "车道运行中",
			"mr.run.pollFailed": "进度轮询失败",
			"mr.run.completed": "评测已结束",
			"mr.run.resumeNote": "评测运行中，请勿禁用或重载插件（会中断批次）；万一中途断开，可在历史或最新批次点「继续运行」",
			"mr.run.interruptedToast": "评测被中断（插件被禁用或重载），可在历史或最新批次点「继续运行」",
			"mr.perf.title": "性能评分",
			"mr.perf.subtitle": "0–1000 分，来自真实会话事件与受控测速",
			"mr.perf.scope": "基于 {sessions} 个活跃会话 · {requests} 条请求 · 本地折叠缓存",
			"mr.perf.radarLabel": "7 维能力雷达",
			"mr.perf.radar.ttft": "TTFT",
			"mr.perf.radar.tps": "TPS",
			"mr.perf.radar.speed": "速度",
			"mr.perf.radar.thinking": "思考",
			"mr.perf.radar.toolGap": "工具间隔",
			"mr.perf.radar.toolTime": "工具耗时",
			"mr.perf.radar.success": "成功率",
			"mr.perf.radar.cache": "缓存",
			"mr.perf.generated": "生成于 {time}",
			"mr.perf.range.today": "今日",
			"mr.perf.range.week": "本周",
			"mr.perf.range.month": "本月",
			"mr.perf.range.all": "全部",
			"mr.perf.rangeLabel": "统计范围",
			"mr.perf.requests": "请求样本",
			"mr.perf.samples": "样本",
			"mr.perf.adequate": "样本充足",
			"mr.perf.inadequate": "样本不足",
			"mr.perf.baseline": "较基线",
			"mr.perf.baselineInsufficient": "基线不足",
			"mr.perf.baselineScore": "基线 {score}",
			"mr.perf.scoreScale": "0–1000",
			"mr.perf.dimensions": "7 维评分",
			"mr.perf.dim.outputSpeed": "输出速度",
			"mr.perf.dim.ttft": "首字延迟",
			"mr.perf.dim.tps": "吞吐",
			"mr.perf.dim.reasoning": "推理速度",
			"mr.perf.dim.reasoningCps": "推理字符速度",
			"mr.perf.dim.toolGap": "工具间隔",
			"mr.perf.dim.tool": "工具能力",
			"mr.perf.dim.toolMs": "工具耗时",
			"mr.perf.dim.toolSuccess": "工具成功率",
			"mr.perf.dim.cacheHit": "缓存命中",
			"mr.perf.dim.cost": "成本效率",
			"mr.perf.dim.stability": "稳定性",
			"mr.perf.dim.throughput": "吞吐效率",
			"mr.perf.dim.context": "上下文利用",
			"mr.perf.modelsTitle": "组合分卡",
			"mr.perf.modelsSubtitle": "按综合分排序",
			"mr.perf.modelsEmpty": "该范围内还没有性能样本",
			"mr.perf.speedTitle": "受控测速",
			"mr.perf.speedSubtitle": "来自最近一个包含测速的批次",
			"mr.perf.speed.combo": "组合",
			"mr.perf.speed.ttft": "TTFT 中位数",
			"mr.perf.speed.tps": "TPS 中位数",
			"mr.perf.speed.minmax": "最小 / 最大",
			"mr.perf.speed.time": "时间",
			"mr.perf.speed.empty": "最近批次没有测速样本",
			"mr.perf.speed.samples": "{count} 次采样",
			"mr.perf.speed.status": "测速状态",
			"mr.perf.aggregateTitle": "聚合时延",
			"mr.perf.aggregateSubtitle": "跨会话的请求级分位数",
			"mr.perf.aggregate.ttft": "TTFT",
			"mr.perf.aggregate.tps": "TPS",
			"mr.perf.aggregate.avg": "avg",
			"mr.perf.aggregate.p50": "P50",
			"mr.perf.aggregate.p95": "P95",
			"mr.perf.aggregate.p99": "P99",
			"mr.perf.toolsTitle": "工具耗时",
			"mr.perf.tools.avg": "平均",
			"mr.perf.tools.p50": "P50",
			"mr.perf.tools.p95": "P95",
			"mr.perf.tools.calls": "调用次数",
			"mr.perf.tools.success": "成功率",
			"mr.perf.reasoningTitle": "推理速度",
			"mr.perf.reasoning.cps": "字符/秒",
			"mr.perf.reasoning.samples": "样本",
			"mr.perf.sessionsTitle": "会话速度榜",
			"mr.perf.sessionsSubtitle": "按解码 TPS 排序",
			"mr.perf.sessionsEmpty": "该范围内还没有会话样本",
			"mr.perf.sessions.tps": "TPS",
			"mr.perf.sessions.ttft": "TTFT",
			"mr.perf.sessions.tokens": "输出 tokens",
			"mr.perf.sessions.turns": "轮次",
			"mr.perf.sessions.untitled": "未命名会话",
			"mr.perf.sessions.rank": "排名",
			"mr.perf.notePending": "性能聚合尚未接入：Host 当前返回占位报告，接入后本页会自动显示数据。",
			"mr.perf.loading": "正在读取性能报告…",
			"mr.perf.error": "性能报告读取失败",
			"mr.perf.noReport": "还没有性能数据",
			"mr.perf.weight": "权重 {weight}%",
			"mr.perf.metricTps": "tok/s",
			"mr.perf.metricMs": "ms",
			"mr.history.title": "评测历史",
			"mr.history.subtitle": "最近 {count} 个批次；停止、部分完成与中断的批次不进入趋势",
			"mr.history.col.time": "时间",
			"mr.history.col.selection": "选择摘要",
			"mr.history.col.status": "状态",
			"mr.history.col.score": "最高分",
			"mr.history.col.duration": "总耗时",
			"mr.history.col.cost": "总费用",
			"mr.history.rowOpen": "查看批次 {id} 的明细",
			"mr.history.selection": "{combos} 个组合 · {runs} 次运行",
			"mr.history.failedCount": "{count} 个失败",
			"mr.history.empty": "还没有批次记录，先开始一次评测吧。",
			"mr.history.limitNote": "只显示最近 {count} 个批次",
			"mr.history.loading": "正在读取历史…",
			"mr.history.judge": "裁判 {model}",
			"mr.resume.button": "继续运行",
			"mr.resume.busy": "正在继续…",
			"mr.resume.failed": "继续运行失败",
			"mr.resume.toast": "已继续运行：{done}/{total} 已完成，将重跑剩余题目",
			"mr.detail.title": "批次明细",
			"mr.detail.dialogLabel": "批次明细抽屉",
			"mr.detail.loading": "正在读取批次…",
			"mr.detail.loadFailed": "批次读取失败",
			"mr.detail.notFound": "批次不存在或已被清理",
			"mr.detail.batchId": "批次",
			"mr.detail.createdAt": "创建时间",
			"mr.detail.duration": "批次耗时",
			"mr.detail.cost": "总费用",
			"mr.detail.judgeCost": "裁判费用",
			"mr.detail.judge": "裁判",
			"mr.detail.summary": "裁判汇总",
			"mr.detail.summaryEmpty": "本批次还没有裁判汇总",
			"mr.detail.summaryBy": "{model} · {time}",
			"mr.detail.comboSelect": "切换组合",
			"mr.detail.combo": "组合",
			"mr.detail.context": "{value} ctx",
			"mr.detail.comboCost": "组合费用",
			"mr.detail.comboDuration": "组合耗时",
			"mr.detail.total": "总分",
			"mr.detail.progress": "运行进度",
			"mr.detail.runsTitle": "逐题明细",
			"mr.detail.task": "题目",
			"mr.detail.status": "状态",
			"mr.detail.score": "得分",
			"mr.detail.reason": "裁判理由",
			"mr.detail.answer": "答案节选（前 {limit} 字）",
			"mr.detail.answerEmpty": "没有可展示的答案文本",
			"mr.detail.answerTruncated": "答案已截断到前 {limit} 字",
			"mr.detail.files": "产物文件",
			"mr.detail.filesEmpty": "没有产物文件",
			"mr.detail.session": "Session ID",
			"mr.detail.sessionEmpty": "尚未创建 session",
			"mr.detail.usage": "Token 用量",
			"mr.detail.grade": "评分细节",
			"mr.isolation.title": "隔离审计",
			"mr.isolation.clean": "通过：{count} 次工具调用，未发现越界读取、访问宿主路由或联网",
			"mr.isolation.suspect": "存疑：发现 {count} 次越界或联网尝试",
			"mr.isolation.blocked": "已拦截：{count} 次越界尝试被工具围栏拒绝（未真正读取或联网）",
			"mr.detail.scale": "百分制 {score100} → 折算 {score}/{max}",
			"mr.detail.completionCap": "完成度门槛：原始 {raw} 分，按核心关系封顶 {cap} 分，最终 {final}",
			"mr.detail.formatError": "格式问题",
			"mr.detail.imageSkipped": "该模型不支持图片输入，庞贝题未附加原图",
			"mr.detail.judgeError": "裁判失败",
			"mr.detail.error": "错误",
			"mr.detail.taskCost": "本题费用",
			"mr.detail.runDuration": "本题耗时",
			"mr.detail.maxScore": "满分 {score}",
			"mr.detail.excludeNote": "该批次状态为「{status}」，不进入趋势统计",
			"mr.detail.comboMissing": "该组合没有运行记录",
			"mr.detail.noCombos": "该批次没有组合记录",
			"mr.detail.attempts": "裁判尝试 {count} 次",
			"mr.detail.retries": "自动重试 {count} 次（每次新上下文）",
			"mr.detail.completeness": "完整性",
			"mr.detail.complete": "完整",
			"mr.detail.missing": "缺失：{tasks}",
			"mr.detail.usageValue": "输入 {input} · 输出 {output} · 缓存读 {cacheRead}",
			"mr.toast.refreshed": "已刷新",
			"mr.toast.refreshFailed": "刷新失败",
			"mr.toast.batchFailed": "读取批次失败",
			"mr.toast.startFailed": "启动评测失败",
			"mr.toast.stopped": "已发送停止请求",
			"mr.toast.catalogFailed": "读取模型目录失败",
			"mr.aria.refresh": "刷新数据",
			"mr.aria.start": "开始评测",
			"mr.aria.stop": "停止评测",
			"mr.aria.close": "关闭",
			"mr.aria.tabs": "视图切换",
			"mr.aria.sort": "按 {column} 排序",
			"mr.aria.trend": "分数趋势图",
			"mr.aria.pareto": "Pareto 散点图",
			"mr.aria.expand": "展开 {model} 的推理档位",
			"mr.aria.row": "查看 {model} 的逐题明细",
			"mr.aria.drawer": "批次明细",
			"mr.aria.dialog": "评测弹窗",
			"mr.aria.progress": "评测进度",
			"mr.aria.modelCheckbox": "选择 {model}",
			"mr.aria.effortChip": "选择 {model} 的 {effort} 档位",
			"mr.aria.resume": "继续运行批次 {id}",
			"mr.overview.title": "速览",
			"mr.overview.subtitle": "四题 · 满分 150 · 批次 {id} · {time}",
			"mr.overview.bestLabel": "本轮最高",
			"mr.overview.bestNoComplete": "本轮暂无完整组合",
			"mr.overview.rankingTitle": "总分排行",
			"mr.overview.rankingMeta": "{complete} 个完整组合{extra}",
			"mr.overview.rankingMetaIncomplete": " · {count} 个未完成",
			"mr.overview.incompleteNote": "未完成或失败的组合不参与排名",
			"mr.overview.incompleteBadge": "未完成",
			"mr.overview.incompleteToggle": "未完成组合 {count}",
			"mr.overview.hideIncomplete": "收起未完成组合",
			"mr.overview.showAll": "展开全部 {count} 个组合",
			"mr.overview.showLess": "收起",
			"mr.overview.viewBatch": "批次详情",
			"mr.overview.openModel": "查看 {model} · {effort} 的逐题结果",
			"mr.overview.cost": "费用",
			"mr.overview.duration": "耗时",
			"mr.overview.tps": "受控测速 TPS",
			"mr.overview.ttft": "首字延迟 TTFT",
			"mr.overview.deltaChip": "较上批 {delta}",
			"mr.overview.deltaTitle": "较上一批次 {delta}",
			"mr.overview.rankChip": "第 {rank} / {total} 名",
			"mr.recommend.title": "综合推荐",
			"mr.recommend.subtitle": "按质量 / 速度 / 成本 / 稳定性加权",
			"mr.recommend.badge": "最推荐",
			"mr.recommend.composite": "综合分 / 100",
			"mr.recommend.openModel": "查看 {model} · {effort} 的逐题结果",
			"mr.recommend.weight": "权重 {pct}%",
			"mr.recommend.dim.quality": "质量",
			"mr.recommend.dim.speed": "速度",
			"mr.recommend.dim.cost": "成本",
			"mr.recommend.dim.stability": "稳定",
			"mr.recommend.alternatives": "其他选择",
			"mr.recommend.alt.quality": "最佳质量",
			"mr.recommend.alt.value": "最划算",
			"mr.recommend.alt.speed": "最快",
			"mr.recommend.weightsHint": "权重可在「设置」页调整",
			"mr.recommend.notReady": "完成一轮完整评测后生成推荐",
			"mr.recommend.notReadySub": "推荐会综合总分、端到端耗时、费用与稳定性，给出具体到推理档位的结论。",
			"mr.recommend.reason.qualityFirst": "总分 {score}/150，本批最高",
			"mr.recommend.reason.qualityRank": "总分 {score}/150，本批第 {rank}",
			"mr.recommend.reason.cost": "费用 {cost}，本批第 {rank}/{count} 低",
			"mr.recommend.reason.speed": "端到端 {duration}，比本批中位快 {pct}%",
			"mr.recommend.reason.speedSlow": "端到端 {duration}，比本批中位慢 {pct}%",
			"mr.recommend.reason.stabilityClean": "四题全部完成，无自动重试",
			"mr.recommend.reason.stabilityRetry": "四题完成，自动重试 {count} 次",
			"mr.recommend.reason.lead": "综合分 {score}，领先第二名 {delta}",
			"mr.overview.taskBreakdown": "四题得分",
			"mr.overview.openDetail": "查看逐题结果",
			"mr.detail.batchTitle": "批次详情",
			"mr.detail.rankOf": "第 {rank} / {total} 名",
			"mr.detail.runningNote": "运行中，结果实时更新",
			"mr.detail.retriesLabel": "自动重试",
			"mr.detail.rerunModel": "重跑本模型",
			"mr.detail.rerunTask": "重跑此题",
			"mr.detail.rerunBatch": "重跑…",
			"mr.detail.rerunHint": "重跑只影响选中的模型与题目，其余结果保留",
			"mr.detail.openBatch": "查看批次详情",
			"mr.detail.backToBatch": "返回批次",
			"mr.detail.taskNoRun": "这道题还没有运行记录",
			"mr.detail.artifactPreview": "产物预览",
			"mr.detail.answerShow": "展开完整回答",
			"mr.detail.answerHide": "收起回答",
			"mr.detail.modelsTitle": "本批组合",
			"mr.detail.modelsMeta": "{complete} 个完整 · {total} 个组合",
			"mr.detail.comboCount": "共 {count} 个组合",
			"mr.settings.title": "设置",
			"mr.settings.subtitle": "调整运行调度、超时容错、评委与推荐权重；改动写入插件数据目录，重启 DSH 后依然生效。",
			"mr.settings.action.reload": "重新读取",
			"mr.settings.action.save": "保存",
			"mr.settings.action.reset": "恢复默认",
			"mr.settings.action.discard": "放弃更改",
			"mr.settings.action.resetConfirmYes": "确认恢复",
			"mr.settings.aria.actions": "设置操作",
			"mr.settings.updatedAt": "配置更新于 {time}",
			"mr.settings.runningNote": "当前有评测在运行：运行中的批次会继续使用启动时的参数，保存的改动从下一批开始生效。",
			"mr.settings.status.loading": "正在读取设置…",
			"mr.settings.status.saving": "正在保存…",
			"mr.settings.status.dirty": "有未保存的更改",
			"mr.settings.status.clean": "所有更改已保存",
			"mr.settings.loadFailed": "设置读取失败",
			"mr.settings.loadFailedHint": "请确认插件后端已更新并重启 DSH，然后重新读取。",
			"mr.settings.saveFailed": "设置保存失败",
			"mr.settings.errorPayload": "设置接口返回了无法识别的数据",
			"mr.settings.section.scheduling.title": "运行调度",
			"mr.settings.section.scheduling.sub": "控制一次评测的并发车道与组合规模。",
			"mr.settings.section.timeout.title": "超时与容错",
			"mr.settings.section.timeout.sub": "限制单题与整批的等待时间，并决定裁判失败后的重试次数。",
			"mr.settings.section.judge.title": "评委与测速",
			"mr.settings.section.judge.sub": "统一给四道题打分的裁判模型，以及受控测速的采样轮次。",
			"mr.settings.section.recommend.title": "推荐权重",
			"mr.settings.section.recommend.sub": "跑完后首页的「综合推荐」按质量、速度、成本、稳定性的加权结果排序。",
			"mr.settings.section.data.title": "数据与计费",
			"mr.settings.section.data.sub": "批次保留上限、费用汇率与只读的数据目录信息。",
			"mr.settings.field.maxParallelModels": "并行模型车道",
			"mr.settings.field.maxParallelModelsDesc": "同时跑几条模型车道；数值越大并发越高，单批完成更快。",
			"mr.settings.field.maxCombos": "组合上限",
			"mr.settings.field.maxCombosDesc": "一批最多跑多少个「模型 × 档位」组合，0 表示不限（跑满所选组合）。",
			"mr.settings.field.autoRetries": "自动重试次数",
			"mr.settings.field.autoRetriesDesc": "单题失败后自动换新上下文重试的次数；0 表示不自动重试。",
			"mr.settings.field.perTaskTimeout": "单题超时",
			"mr.settings.field.perTaskTimeoutDesc": "每道题的超时上限，用分钟输入，保存时换算成毫秒。",
			"mr.settings.field.perBatchTimeout": "批次超时",
			"mr.settings.field.perBatchTimeoutDesc": "整批评测的总超时上限，用小时输入，保存时换算成毫秒。",
			"mr.settings.field.judgeMaxAttempts": "裁判最大尝试次数",
			"mr.settings.field.judgeMaxAttemptsDesc": "裁判评分失败或返回不可解析结果时的最大尝试次数。",
			"mr.settings.field.judgeProvider": "评委 Provider",
			"mr.settings.field.judgeModel": "评委模型",
			"mr.settings.field.judgeEffort": "评委推理档位",
			"mr.settings.field.speedRuns": "受控测速轮次",
			"mr.settings.field.speedRunsDesc": "每个组合的受控测速采样次数，0 表示关闭受控测速。",
			"mr.settings.field.retentionBatches": "批次保留上限",
			"mr.settings.field.retentionBatchesDesc": "数据目录里最多保留多少个批次，超出后按时间清理最旧的批次。",
			"mr.settings.field.usdToCny": "美元兑人民币汇率",
			"mr.settings.field.usdToCnyDesc": "把模型费用换算成人民币展示时使用的汇率。",
			"mr.settings.field.dataDir": "数据目录",
			"mr.settings.field.dataDirDesc": "批次、运行与设置文件的存放位置；只读，如需修改请编辑插件配置。",
			"mr.settings.field.models": "模型白名单",
			"mr.settings.field.modelsDesc": "为空表示目录中的模型全部可选；非空时只有列出的 provider/model 能进入评测。",
			"mr.settings.unit.minutes": "分钟",
			"mr.settings.unit.hours": "小时",
			"mr.settings.unit.cny": "CNY / USD",
			"mr.settings.hint.range": "范围 {min}–{max} {unit} · 步进 {step} {unit}",
			"mr.settings.hint.rangeUnitless": "范围 {min}–{max} · 步进 {step}",
			"mr.settings.hint.rangeMs": "服务端范围 {min}–{max} ms · 步进 {step} ms",
			"mr.settings.hint.unlimited": "0 = 不限（跑满所选组合）",
			"mr.settings.hint.speedOff": "0 = 关闭受控测速",
			"mr.settings.hint.clampNote": "带单位的输入会先换算成毫秒；超出服务端范围的数值会在保存时收敛到边界值。",
			"mr.settings.convert.task": "换算：{ms} ms = {minutes} 分钟 = {hours} 小时",
			"mr.settings.convert.batch": "换算：{ms} ms = {hours} 小时 = {minutes} 分钟",
			"mr.settings.convert.usd": "1 USD ≈ {rate} CNY",
			"mr.settings.judge.preview": "当前评委：{provider} · {model} · {effort}",
			"mr.settings.judge.missing": "当前评委不在模型目录中，请重新选择 Provider 与模型后再保存。",
			"mr.settings.judge.catalogLoading": "模型目录尚未加载，暂不能修改评委；其它设置可以正常保存。",
			"mr.settings.judge.emptyCatalog": "模型目录为空，暂时无法选择评委；请检查模型服务后重新读取。",
			"mr.settings.recommend.quality": "质量",
			"mr.settings.recommend.speed": "速度",
			"mr.settings.recommend.cost": "成本",
			"mr.settings.recommend.stability": "稳定性",
			"mr.settings.recommend.raw": "{value}%",
			"mr.settings.recommend.normalized": "归一化后实际权重",
			"mr.settings.recommend.zeroHint": "四项权重全为 0 时，服务端会回退到默认权重。",
			"mr.settings.data.locked": "数据目录、模型白名单与预设为只读字段；保存时会被忽略。",
			"mr.settings.data.modelsEmpty": "全部可用（未设置白名单）",
			"mr.settings.data.copyHint": "点击输入框可全选复制",
			"mr.settings.resetConfirm": "确认恢复默认并覆盖当前配置？",
			"mr.settings.notice.nextBatch": "已保存：运行中的批次继续使用旧参数，改动从下一批生效。",
			"mr.settings.toast.saved": "设置已保存",
			"mr.settings.toast.savedNext": "设置已保存，下一批生效",
			"mr.settings.toast.saveFailed": "设置保存失败",
			"mr.settings.toast.reset": "已恢复默认设置",
			"mr.settings.toast.resetFailed": "恢复默认设置失败",
			"mr.rerun.dialogLabel": "重跑：选择模型与题目",
			"mr.rerun.title": "重跑批次",
			"mr.rerun.subtitle": "批次 {id} · 选择要重跑的模型与题目",
			"mr.rerun.matrixTitle": "组合 × 题目",
			"mr.rerun.totalLine": "共 {combos} 个组合 · {runs} 次运行",
			"mr.rerun.modelCol": "模型 / 档位",
			"mr.rerun.maxPoints": "{score} 分",
			"mr.rerun.selectFailed": "选中失败的运行",
			"mr.rerun.selectAll": "全选",
			"mr.rerun.clear": "清空",
			"mr.rerun.rowAria": "选择 {model} 的全部题目",
			"mr.rerun.cellAria": "{model} · {task} · {status}",
			"mr.rerun.stats": "已选 {models} 个模型 · {tasks} 道题 · 共 {runs} 次运行",
			"mr.rerun.footNote": "重跑沿用原批次配置，花费计入该批次",
			"mr.rerun.doneSelected": "含 {count} 个已完成运行，将重新生成并评分",
			"mr.rerun.submit": "开始重跑",
			"mr.rerun.submitting": "提交中…",
			"mr.rerun.noteRunning": "该批次仍在运行，结束后才能重跑",
			"mr.rerun.noteLocked": "该批次不可重跑：任务或评分版本与当前版本不匹配",
			"mr.rerun.noteNoRuns": "缺少运行明细，无法选择题目；请重新加载批次",
			"mr.rerun.noteInitialEmpty": "指定项都已是最新完成状态；如需重跑请手动勾选",
			"mr.rerun.noteAllDone": "所有运行都已完成；如需重跑请手动勾选题目",
			"mr.rerun.empty": "该批次没有可重跑的组合",
			"mr.rerun.errorBusy": "已有评测在运行，请稍后再试",
			"mr.rerun.errorVersion": "批次版本不匹配，无法重跑",
			"mr.rerun.errorEmpty": "请至少选择一道题",
			"mr.rerun.errorStale": "所选运行已不存在，请刷新批次后重试",
			"mr.rerun.errorFailed": "重跑失败",
		};

		const en = {
			"mr.panel.name": "Model radar",
			"mr.page.title": "Model radar",
			"mr.page.subtitle": "Model intelligence benchmark · real-world performance",
			"mr.page.refresh": "Refresh",
			"mr.theme.toDark": "Switch to dark mode",
			"mr.credits.prefix": "Inspired by",
			"mr.theme.toLight": "Switch to light mode",
			"mr.page.refreshing": "Refreshing…",
			"mr.page.start": "Start evaluation",
			"mr.page.stop": "Stop evaluation",
			"mr.page.viewProgress": "View progress",
			"mr.page.running": "Running",
			"mr.page.loadFailed": "Failed to load page data",
			"mr.view.ranking": "Ranking",
			"mr.view.performance": "Performance",
			"mr.view.history": "History",
			"mr.view.settings": "Settings",
			"mr.detail.rerunCount": "Rerun ×{count}",
			"mr.panel.errorTitle": "Model Radar failed to render",
			"mr.panel.retry": "Retry",
			"mr.isolation.tagBlocked": "[blocked]",
			"mr.isolation.tagAllowed": "[allowed]",
			"mr.grade.score": "Score",
			"mr.grade.score100": "Score (100)",
			"mr.grade.maxScore": "Max",
			"mr.grade.answer": "Answer",
			"mr.grade.ok": "Pass",
			"mr.grade.weighted": "Weighted",
			"mr.grade.cap": "Cap",
			"mr.grade.final100": "Final (100)",
			"mr.grade.correct": "Correct",
			"mr.grade.reason": "Verdict reason",
			"mr.history.rerun": "Rerun",
			"mr.history.rerunRow": "Rerun batch {id}",
			"mr.rerun.toastStarted": "Rerun started; progress updates automatically",
			"mr.view.tabs": "Switch view",
			"mr.common.close": "Close",
			"mr.common.cancel": "Cancel",
			"mr.common.retry": "Retry",
			"mr.common.yes": "Yes",
			"mr.common.no": "No",
			"mr.common.loading": "Loading…",
			"mr.common.none": "—",
			"mr.common.unknown": "Unknown",
			"mr.common.defaultEffort": "Default",
			"mr.common.samples": "Samples",
			"mr.common.score": "Score",
			"mr.common.cost": "Cost",
			"mr.common.duration": "Duration",
			"mr.common.time": "Time",
			"mr.common.model": "Model",
			"mr.common.effort": "Effort",
			"mr.common.status": "Status",
			"mr.common.provider": "Provider",
			"mr.common.session": "Session",
			"mr.common.error": "Error",
			"mr.common.total": "Total",
			"mr.common.rank": "Rank",
			"mr.common.answer": "Answer",
			"mr.common.reason": "Reason",
			"mr.common.artifact": "Artifact",
			"mr.common.judge": "Judge",
			"mr.common.batch": "Batch",
			"mr.common.summary": "Summary",
			"mr.common.requests": "Requests",
			"mr.common.value": "Value",
			"mr.common.count": "Count",
			"mr.common.files": "Files",
			"mr.common.refreshFailed": "Refresh failed",
			"mr.common.loadingFailed": "Failed to load",
			"mr.common.open": "Open",
			"mr.common.selected": "Selected",
			"mr.common.unavailable": "Unavailable",
			"mr.common.listSeparator": ", ",
			"mr.status.running": "Running",
			"mr.status.done": "Done",
			"mr.status.partial": "Partial",
			"mr.status.stopped": "Stopped",
			"mr.status.error": "Error",
			"mr.status.interrupted": "Interrupted",
			"mr.status.pending": "Pending",
			"mr.status.timeout": "Timed out",
			"mr.status.judgeError": "Judge failed",
			"mr.status.skipped": "Skipped",
			"mr.status.unknown": "Unknown",
			"mr.status.notInTrend": "Excluded from trend",
			"mr.status.interruptedHint": "Interrupted by a plugin disable/reload; unfinished tasks can be resumed",
			"mr.ranking.batchTitle": "Latest batch",
			"mr.ranking.batchMeta": "Batch {id} · {time}",
			"mr.ranking.tableTitle": "Leaderboard",
			"mr.ranking.tableSubtitle": "Click a row for per-task details; click a header to sort",
			"mr.ranking.sortHint": "Toggle sort",
			"mr.ranking.col.rank": "Rank",
			"mr.ranking.col.model": "Model · effort",
			"mr.ranking.col.total": "Score/150",
			"mr.ranking.col.candy": "Candy",
			"mr.ranking.col.pompeii": "Pompeii",
			"mr.ranking.col.pelican": "Pelican",
			"mr.ranking.col.qin": "Qin",
			"mr.ranking.col.cost": "Cost",
			"mr.ranking.col.duration": "Duration",
			"mr.ranking.col.time": "Batch time",
			"mr.ranking.rowOpen": "Open per-task details for {model}",
			"mr.ranking.emptyTitle": "No evaluation data yet",
			"mr.ranking.emptyBody": "Four tasks worth 150 points measure a model with a fixed task set and rubric; every batch also records real duration and cost.",
			"mr.ranking.emptyStats": "{batches} batches · {runs} runs so far",
			"mr.ranking.emptyStart": "Run the first evaluation",
			"mr.ranking.task.candy.desc": "Candy counting: three flavors, two shapes; find the minimum draw that guarantees a matching pair.",
			"mr.ranking.task.pompeii.desc": "Pompeii fresco: recover direct fragment adjacency and score it with F1.",
			"mr.ranking.task.pelican.desc": "Pelican on a bike: produce a self-contained inline SVG animation page.",
			"mr.ranking.task.qin.desc": "The Qin task: a long combined prompt; produce a detailed SVG and answer a nested count.",
			"mr.ranking.trend.title": "Score trend",
			"mr.ranking.trend.subtitle": "Only batches with the same task and rubric version share a line",
			"mr.ranking.trend.empty": "No trend data yet",
			"mr.ranking.trend.pending": "At least two complete batches of the same version are needed for a trend line",
			"mr.ranking.trend.version": "Caliber {task} / {rubric}",
			"mr.ranking.trend.axisScore": "Total score",
			"mr.ranking.trend.point": "{series} · {time}: {score}",
			"mr.ranking.pareto.title": "Pareto frontier",
			"mr.ranking.pareto.subtitle": "Higher score is better; lower cost or duration is better",
			"mr.ranking.pareto.metricCost": "Score × cost",
			"mr.ranking.pareto.metricDuration": "Score × duration",
			"mr.ranking.pareto.empty": "At least one complete combo is needed for the Pareto chart",
			"mr.ranking.pareto.axisCost": "Cost (USD)",
			"mr.ranking.pareto.axisDuration": "Total duration (s)",
			"mr.ranking.pareto.axisScore": "Total score",
			"mr.ranking.pareto.points": "Combos",
			"mr.ranking.pareto.frontier": "Pareto frontier",
			"mr.ranking.pareto.point": "{model}: {score} · {metric}",
			"mr.ranking.caliber.title": "Evaluation caliber",
			"mr.ranking.caliber.taskVersion": "Task version",
			"mr.ranking.caliber.rubricVersion": "Rubric version",
			"mr.ranking.caliber.judge": "Judge model · effort",
			"mr.ranking.caliber.gold": "gold sha",
			"mr.ranking.caliber.generated": "Generated at",
			"mr.ranking.summaryTitle": "Judge summary",
			"mr.ranking.summaryEmpty": "No judge summary for this batch yet",
			"mr.ranking.runningNote": "The latest batch is still running; the table shows completed work so far",
			"mr.ranking.incompleteNote": "The latest batch is incomplete ({status}); it is excluded from trend statistics",
			"mr.ranking.resumeBanner": "The latest batch is {status} ({done}/{total} done); unfinished tasks can be resumed",
			"mr.iq.title": "Model IQ",
			"mr.iq.subtitle": "Four tasks · 150 points · latest batch {id}",
			"mr.iq.highest": "Best this round",
			"mr.iq.ranking": "Total score ranking",
			"mr.iq.noComplete": "No complete combos in this round",
			"mr.iq.incomplete": "Incomplete",
			"mr.iq.incompleteNote": "Incomplete or failed combos are not ranked",
			"mr.iq.cost": "Cost",
			"mr.iq.speedTitle": "Controlled speed TPS / TTFT",
			"mr.iq.delta": "vs previous {delta}",
			"mr.iq.duration": "Time",
			"mr.iq.emptyTitle": "No model IQ data yet",
			"mr.iq.emptyBody": "Run an evaluation to see the top score, total ranking, and effort radar here.",
			"mr.iq.rowLabel": "{model} · {effort}: {score}",
			"mr.matrix.title": "Effort radar",
			"mr.matrix.subtitle": "Latest valid score per task within the same task/rubric version, scanning batches newest first",
			"mr.matrix.total": "Total",
			"mr.matrix.legend": "Score scale",
			"mr.matrix.legendLow": "Low",
			"mr.matrix.legendHigh": "High",
			"mr.matrix.cellTitle": "Batch {batch} · {status} · {time} · {score} / {max}",
			"mr.matrix.missingTitle": "No data",
			"mr.matrix.noData": "No scores available for the current version",
			"mr.matrix.version": "Task {task} · rubric {rubric}",
			"mr.matrix.open": "Open {model} · {effort} details",
			"mr.matrix.model": "Model",
			"mr.ranking.latestTableTitle": "Latest batch details",
			"mr.ranking.group.quality": "Quality",
			"mr.ranking.group.performance": "Performance",
			"mr.ranking.group.cost": "Cost",
			"mr.ranking.group.batch": "Batch",
			"mr.ranking.tableScrollHint": "← Scroll horizontally for more →",
			"mr.ranking.expand": "Expand",
			"mr.ranking.collapse": "Collapse",
			"mr.ranking.tableCount": "{count} combos",
			"mr.artifact.open": "View artifacts",
			"mr.artifact.title": "Artifacts",
			"mr.artifact.preview": "Preview",
			"mr.artifact.source": "Source",
			"mr.artifact.openNew": "Open in new tab",
			"mr.artifact.loading": "Loading artifact…",
			"mr.artifact.error": "Failed to load artifact",
			"mr.artifact.unsupported": "This file type cannot be previewed inline; open it in a new tab.",
			"mr.artifact.truncated": "Content exceeds {limit}; showing the first {limit}.",
			"mr.artifact.empty": "This run has no artifact files",
			"mr.artifact.primary": "Primary artifact",
			"mr.artifact.imageFailed": "Image failed to load; open it in a new tab.",
			"mr.artifact.previewFailed": "Preview failed to load; open it in a new tab.",
			"mr.pompeii.title": "Puzzle status",
			"mr.pompeii.subtitle": "Adjacency comparison · reference layout",
			"mr.pompeii.score": "Score",
			"mr.pompeii.f1": "F1",
			"mr.pompeii.correct": "Correct",
			"mr.pompeii.incorrect": "Wrong",
			"mr.pompeii.missing": "Missing",
			"mr.pompeii.graphTitle": "Model adjacency · reference layout",
			"mr.pompeii.noAnswer": "The model did not provide a valid answer; all reference edges are shown as missing.",
			"mr.pompeii.noMeta": "Puzzle reference data is unavailable, so the adjacency graph cannot be drawn.",
			"mr.pompeii.questionImage": "Original puzzle",
			"mr.pompeii.referenceImage": "Reference assembly",
			"mr.pompeii.openImage": "Open “{name}” in a new tab",
			"mr.artifact.dialogLabel": "Artifact preview",
			"mr.artifact.subtitle": "{model} · {task}",
			"mr.artifact.imageAlt": "Artifact preview: {file}",
			"mr.ranking.costTitle": "Generation {generation} + judge {judge}",
			"mr.ranking.noTotal": "Incomplete",
			"mr.ranking.loading": "Reading the latest batch…",
			"mr.task.candy.name": "Candy",
			"mr.task.pompeii.name": "Pompeii",
			"mr.task.pelican.name": "Pelican",
			"mr.task.qin.name": "Qin",
			"mr.start.title": "Start evaluation",
			"mr.start.subtitle": "Pick candidate models and reasoning efforts; one judge scores them all",
			"mr.start.selectAll": "Select all",
			"mr.start.selectAllHint": "Select the default effort of every model",
			"mr.start.clear": "Clear",
			"mr.start.modelsTitle": "Candidate models",
			"mr.start.judgeTitle": "Judge model",
			"mr.start.judgeHint": "The judge scores Pelican and Qin and writes the batch summary",
			"mr.start.provider": "Provider",
			"mr.start.model": "Model",
			"mr.start.effort": "Reasoning effort",
			"mr.start.count": "{combos} combos × 4 tasks = {runs} runs",
			"mr.start.lanes": "Up to {lanes} model lanes",
			"mr.start.selected": "{count}/{max} combos selected",
			"mr.start.selectedUnlimited": "{count} combos selected",
			"mr.start.contextWindow": "{value} context",
			"mr.start.maxOutput": "max output {value}",
			"mr.start.maxCombos": "Up to {max} combos",
			"mr.start.limitReached": "You can select at most {max} combos",
			"mr.start.emptySelection": "Select at least one model effort",
			"mr.start.submit": "Start evaluation",
			"mr.start.submitting": "Creating evaluation…",
			"mr.start.busy": "An evaluation is already running",
			"mr.start.failed": "Failed to start evaluation",
			"mr.start.catalogLoading": "Reading the model catalog…",
			"mr.start.catalogError": "Failed to read the model catalog",
			"mr.start.noModels": "No evaluable models",
			"mr.start.image": "Image input",
			"mr.start.providerModels": "{count} models",
			"mr.start.expand": "Expand reasoning efforts",
			"mr.start.collapse": "Collapse reasoning efforts",
			"mr.start.judgePreview": "{provider} / {model} · {effort}",
			"mr.start.limitHint": "Each submission is limited to {max} combos",
			"mr.start.dialogLabel": "Start a Model Radar evaluation",
			"mr.start.effortsSelected": "{count} efforts selected",
			"mr.start.effortCount": "{count} efforts",
			"mr.start.loadCatalog": "Reload catalog",
			"mr.run.title": "Evaluation running",
			"mr.run.dialogLabel": "Evaluation progress",
			"mr.run.preparing": "Creating the judge session and running controlled speed tests…",
			"mr.run.lane": "Lane",
			"mr.run.current": "Current task",
			"mr.run.waiting": "Waiting",
			"mr.run.doneCount": "Done {done}/{total}",
			"mr.run.failedCount": "Failed {failed}",
			"mr.run.elapsed": "Elapsed {time}",
			"mr.run.progress": "Overall {done}/{total}",
			"mr.run.stop": "Stop evaluation",
			"mr.run.stopping": "Stopping…",
			"mr.run.stopRequested": "Stop request sent",
			"mr.run.stopFailed": "Failed to stop evaluation",
			"mr.run.finished": "Evaluation finished: {status}",
			"mr.run.view": "View progress",
			"mr.run.speedTesting": "Controlled speed tests",
			"mr.run.laneDone": "Lane complete",
			"mr.run.laneStopped": "Lane stopped",
			"mr.run.laneRunning": "Lane running",
			"mr.run.pollFailed": "Progress polling failed",
			"mr.run.completed": "Evaluation finished",
			"mr.run.resumeNote": "Do not disable or reload the plugin while a batch is running (it interrupts the batch); if it stops, use Resume from History or the latest batch",
			"mr.run.interruptedToast": "Evaluation interrupted by a plugin disable/reload; use Resume from History or the latest batch",
			"mr.perf.title": "Performance score",
			"mr.perf.subtitle": "0–1000, folded from real session events and controlled speed tests",
			"mr.perf.scope": "{sessions} active sessions · {requests} requests · local folded cache",
			"mr.perf.radarLabel": "7-axis capability radar",
			"mr.perf.radar.ttft": "TTFT",
			"mr.perf.radar.tps": "TPS",
			"mr.perf.radar.speed": "Speed",
			"mr.perf.radar.thinking": "Thinking",
			"mr.perf.radar.toolGap": "Tool gap",
			"mr.perf.radar.toolTime": "Tool time",
			"mr.perf.radar.success": "Success",
			"mr.perf.radar.cache": "Cache",
			"mr.perf.generated": "Generated at {time}",
			"mr.perf.range.today": "Today",
			"mr.perf.range.week": "This week",
			"mr.perf.range.month": "This month",
			"mr.perf.range.all": "All",
			"mr.perf.rangeLabel": "Range",
			"mr.perf.requests": "Requests",
			"mr.perf.samples": "Samples",
			"mr.perf.adequate": "Enough samples",
			"mr.perf.inadequate": "Insufficient samples",
			"mr.perf.baseline": "vs baseline",
			"mr.perf.baselineInsufficient": "No baseline",
			"mr.perf.baselineScore": "Baseline {score}",
			"mr.perf.scoreScale": "0–1000",
			"mr.perf.dimensions": "7-dimension score",
			"mr.perf.dim.outputSpeed": "Output speed",
			"mr.perf.dim.ttft": "Time to first token",
			"mr.perf.dim.tps": "Throughput",
			"mr.perf.dim.reasoning": "Reasoning speed",
			"mr.perf.dim.reasoningCps": "Reasoning chars/s",
			"mr.perf.dim.toolGap": "Tool gap",
			"mr.perf.dim.tool": "Tool ability",
			"mr.perf.dim.toolMs": "Tool latency",
			"mr.perf.dim.toolSuccess": "Tool success",
			"mr.perf.dim.cacheHit": "Cache hit",
			"mr.perf.dim.cost": "Cost efficiency",
			"mr.perf.dim.stability": "Stability",
			"mr.perf.dim.throughput": "Throughput efficiency",
			"mr.perf.dim.context": "Context utilization",
			"mr.perf.modelsTitle": "Combo score cards",
			"mr.perf.modelsSubtitle": "Sorted by overall score",
			"mr.perf.modelsEmpty": "No performance samples in this range",
			"mr.perf.speedTitle": "Controlled speed tests",
			"mr.perf.speedSubtitle": "From the most recent batch that contains speed samples",
			"mr.perf.speed.combo": "Combo",
			"mr.perf.speed.ttft": "Median TTFT",
			"mr.perf.speed.tps": "Median TPS",
			"mr.perf.speed.minmax": "Min / max",
			"mr.perf.speed.time": "Time",
			"mr.perf.speed.empty": "The latest batch has no speed samples",
			"mr.perf.speed.samples": "{count} samples",
			"mr.perf.speed.status": "Speed status",
			"mr.perf.aggregateTitle": "Aggregate latency",
			"mr.perf.aggregateSubtitle": "Request-level percentiles across sessions",
			"mr.perf.aggregate.ttft": "TTFT",
			"mr.perf.aggregate.tps": "TPS",
			"mr.perf.aggregate.avg": "avg",
			"mr.perf.aggregate.p50": "P50",
			"mr.perf.aggregate.p95": "P95",
			"mr.perf.aggregate.p99": "P99",
			"mr.perf.toolsTitle": "Tool timing",
			"mr.perf.tools.avg": "Average",
			"mr.perf.tools.p50": "P50",
			"mr.perf.tools.p95": "P95",
			"mr.perf.tools.calls": "Calls",
			"mr.perf.tools.success": "Success rate",
			"mr.perf.reasoningTitle": "Reasoning speed",
			"mr.perf.reasoning.cps": "chars/s",
			"mr.perf.reasoning.samples": "Samples",
			"mr.perf.sessionsTitle": "Session speed leaderboard",
			"mr.perf.sessionsSubtitle": "Sorted by decode TPS",
			"mr.perf.sessionsEmpty": "No session samples in this range",
			"mr.perf.sessions.tps": "TPS",
			"mr.perf.sessions.ttft": "TTFT",
			"mr.perf.sessions.tokens": "Output tokens",
			"mr.perf.sessions.turns": "Turns",
			"mr.perf.sessions.untitled": "Untitled session",
			"mr.perf.sessions.rank": "Rank",
			"mr.perf.notePending": "Performance aggregation is not wired yet: the Host returns a placeholder report. This page will fill in automatically once it lands.",
			"mr.perf.loading": "Reading the performance report…",
			"mr.perf.error": "Failed to read the performance report",
			"mr.perf.noReport": "No performance data yet",
			"mr.perf.weight": "Weight {weight}%",
			"mr.perf.metricTps": "tok/s",
			"mr.perf.metricMs": "ms",
			"mr.history.title": "Evaluation history",
			"mr.history.subtitle": "The last {count} batches; stopped, partial and interrupted batches stay out of the trend",
			"mr.history.col.time": "Time",
			"mr.history.col.selection": "Selection",
			"mr.history.col.status": "Status",
			"mr.history.col.score": "Best score",
			"mr.history.col.duration": "Duration",
			"mr.history.col.cost": "Cost",
			"mr.history.rowOpen": "Open batch {id}",
			"mr.history.selection": "{combos} combos · {runs} runs",
			"mr.history.failedCount": "{count} failed",
			"mr.history.empty": "No batches yet. Start an evaluation first.",
			"mr.history.limitNote": "Showing the last {count} batches only",
			"mr.history.loading": "Reading history…",
			"mr.history.judge": "Judge {model}",
			"mr.resume.button": "Resume",
			"mr.resume.busy": "Resuming…",
			"mr.resume.failed": "Resume failed",
			"mr.resume.toast": "Resumed: {done}/{total} done; remaining tasks will run again",
			"mr.detail.title": "Batch details",
			"mr.detail.dialogLabel": "Batch details drawer",
			"mr.detail.loading": "Reading batch…",
			"mr.detail.loadFailed": "Failed to read the batch",
			"mr.detail.notFound": "The batch does not exist or was pruned",
			"mr.detail.batchId": "Batch",
			"mr.detail.createdAt": "Created",
			"mr.detail.duration": "Batch duration",
			"mr.detail.cost": "Total cost",
			"mr.detail.judgeCost": "Judge cost",
			"mr.detail.judge": "Judge",
			"mr.detail.summary": "Judge summary",
			"mr.detail.summaryEmpty": "No judge summary for this batch yet",
			"mr.detail.summaryBy": "{model} · {time}",
			"mr.detail.comboSelect": "Switch combo",
			"mr.detail.combo": "Combo",
			"mr.detail.context": "{value} ctx",
			"mr.detail.comboCost": "Combo cost",
			"mr.detail.comboDuration": "Combo duration",
			"mr.detail.total": "Total score",
			"mr.detail.progress": "Run progress",
			"mr.detail.runsTitle": "Per-task details",
			"mr.detail.task": "Task",
			"mr.detail.status": "Status",
			"mr.detail.score": "Score",
			"mr.detail.reason": "Judge reason",
			"mr.detail.answer": "Answer excerpt (first {limit} chars)",
			"mr.detail.answerEmpty": "No answer text to show",
			"mr.detail.answerTruncated": "Answer truncated to the first {limit} chars",
			"mr.detail.files": "Artifacts",
			"mr.detail.filesEmpty": "No artifact files",
			"mr.detail.session": "Session ID",
			"mr.detail.sessionEmpty": "No session created yet",
			"mr.detail.usage": "Token usage",
			"mr.detail.grade": "Grade details",
			"mr.isolation.title": "Isolation audit",
			"mr.isolation.clean": "Clean: {count} tool calls, no out-of-workspace reads, host-route access or network use",
			"mr.isolation.suspect": "Suspect: {count} out-of-workspace or network attempts",
			"mr.isolation.blocked": "Blocked: {count} out-of-workspace attempts were refused by the tool guard (nothing was read or reached)",
			"mr.detail.scale": "100-scale {score100} → weighted {score}/{max}",
			"mr.detail.completionCap": "Completion gate: raw {raw}, capped at {cap} by core relations, final {final}",
			"mr.detail.formatError": "Format issue",
			"mr.detail.imageSkipped": "This model does not accept images, so the Pompeii image was skipped",
			"mr.detail.judgeError": "Judge failed",
			"mr.detail.error": "Error",
			"mr.detail.taskCost": "Task cost",
			"mr.detail.runDuration": "Task duration",
			"mr.detail.maxScore": "Max {score}",
			"mr.detail.excludeNote": "This batch is {status}; it is excluded from trend statistics",
			"mr.detail.comboMissing": "No runs recorded for this combo",
			"mr.detail.noCombos": "No combos recorded for this batch",
			"mr.detail.attempts": "Judge attempts: {count}",
			"mr.detail.retries": "Auto-retried {count}x (fresh context)",
			"mr.detail.completeness": "Completeness",
			"mr.detail.complete": "Complete",
			"mr.detail.missing": "Missing: {tasks}",
			"mr.detail.usageValue": "In {input} · out {output} · cache read {cacheRead}",
			"mr.toast.refreshed": "Refreshed",
			"mr.toast.refreshFailed": "Refresh failed",
			"mr.toast.batchFailed": "Failed to read the batch",
			"mr.toast.startFailed": "Failed to start the evaluation",
			"mr.toast.stopped": "Stop request sent",
			"mr.toast.catalogFailed": "Failed to read the model catalog",
			"mr.aria.refresh": "Refresh data",
			"mr.aria.start": "Start evaluation",
			"mr.aria.stop": "Stop evaluation",
			"mr.aria.close": "Close",
			"mr.aria.tabs": "Switch view",
			"mr.aria.sort": "Sort by {column}",
			"mr.aria.trend": "Score trend chart",
			"mr.aria.pareto": "Pareto scatter chart",
			"mr.aria.expand": "Expand reasoning efforts for {model}",
			"mr.aria.row": "Open per-task details for {model}",
			"mr.aria.drawer": "Batch details",
			"mr.aria.dialog": "Evaluation dialog",
			"mr.aria.progress": "Evaluation progress",
			"mr.aria.modelCheckbox": "Select {model}",
			"mr.aria.effortChip": "Select the {effort} effort for {model}",
			"mr.aria.resume": "Resume batch {id}",
			"mr.overview.title": "Quick look",
			"mr.overview.subtitle": "Four tasks · 150 points · batch {id} · {time}",
			"mr.overview.bestLabel": "Best this round",
			"mr.overview.bestNoComplete": "No complete combo yet",
			"mr.overview.rankingTitle": "Overall ranking",
			"mr.overview.rankingMeta": "{complete} complete combos{extra}",
			"mr.overview.rankingMetaIncomplete": " · {count} unfinished",
			"mr.overview.incompleteNote": "Unfinished or failed combos are not ranked",
			"mr.overview.incompleteBadge": "Unfinished",
			"mr.overview.incompleteToggle": "Unfinished combos ({count})",
			"mr.overview.hideIncomplete": "Hide unfinished combos",
			"mr.overview.showAll": "Show all {count} combos",
			"mr.overview.showLess": "Show less",
			"mr.overview.viewBatch": "Batch details",
			"mr.overview.openModel": "Open per-task results for {model} · {effort}",
			"mr.overview.cost": "Cost",
			"mr.overview.duration": "Duration",
			"mr.overview.tps": "Controlled TPS",
			"mr.overview.ttft": "Time to first token",
			"mr.overview.deltaChip": "{delta} vs previous batch",
			"mr.overview.deltaTitle": "{delta} vs the previous batch",
			"mr.overview.rankChip": "Rank {rank} / {total}",
			"mr.recommend.title": "Recommendation",
			"mr.recommend.subtitle": "Weighted by quality / speed / cost / stability",
			"mr.recommend.badge": "Top pick",
			"mr.recommend.composite": "Overall / 100",
			"mr.recommend.openModel": "Open per-task results for {model} · {effort}",
			"mr.recommend.weight": "Weight {pct}%",
			"mr.recommend.dim.quality": "Quality",
			"mr.recommend.dim.speed": "Speed",
			"mr.recommend.dim.cost": "Cost",
			"mr.recommend.dim.stability": "Stability",
			"mr.recommend.alternatives": "Alternatives",
			"mr.recommend.alt.quality": "Best quality",
			"mr.recommend.alt.value": "Best value",
			"mr.recommend.alt.speed": "Fastest",
			"mr.recommend.weightsHint": "Adjust weights on the Settings tab",
			"mr.recommend.notReady": "Recommendation appears after a complete round",
			"mr.recommend.notReadySub": "It combines score, end-to-end duration, cost and stability into a model + reasoning effort pick.",
			"mr.recommend.reason.qualityFirst": "Top score {score}/150 in this batch",
			"mr.recommend.reason.qualityRank": "Score {score}/150, rank {rank} in this batch",
			"mr.recommend.reason.cost": "Cost {cost}, {rank}/{count} cheapest",
			"mr.recommend.reason.speed": "End-to-end {duration}, {pct}% faster than the batch median",
			"mr.recommend.reason.speedSlow": "End-to-end {duration}, {pct}% slower than the batch median",
			"mr.recommend.reason.stabilityClean": "All four tasks complete, no automatic retries",
			"mr.recommend.reason.stabilityRetry": "All four tasks complete with {count} automatic retries",
			"mr.recommend.reason.lead": "Overall score {score}, {delta} ahead of the runner-up",
			"mr.overview.taskBreakdown": "Task breakdown",
			"mr.overview.openDetail": "Open per-task results",
			"mr.detail.batchTitle": "Batch details",
			"mr.detail.rankOf": "Rank {rank} / {total}",
			"mr.detail.runningNote": "Running, results update live",
			"mr.detail.retriesLabel": "Auto retries",
			"mr.detail.rerunModel": "Rerun this model",
			"mr.detail.rerunTask": "Rerun this task",
			"mr.detail.rerunBatch": "Rerun…",
			"mr.detail.rerunHint": "Rerun only the selected models and tasks; other results are kept",
			"mr.detail.openBatch": "Open batch details",
			"mr.detail.backToBatch": "Back to batch",
			"mr.detail.taskNoRun": "No run for this task yet",
			"mr.detail.artifactPreview": "Artifact preview",
			"mr.detail.answerShow": "Show full answer",
			"mr.detail.answerHide": "Collapse answer",
			"mr.detail.modelsTitle": "Combos in this batch",
			"mr.detail.modelsMeta": "{complete} complete · {total} combos",
			"mr.detail.comboCount": "{count} combos",
			"mr.settings.title": "Settings",
			"mr.settings.subtitle": "Tune scheduling, timeouts, the judge and the recommendation weights. Changes are persisted in the plugin data directory and survive a DSH restart.",
			"mr.settings.action.reload": "Reload",
			"mr.settings.action.save": "Save",
			"mr.settings.action.reset": "Restore defaults",
			"mr.settings.action.discard": "Discard changes",
			"mr.settings.action.resetConfirmYes": "Restore",
			"mr.settings.aria.actions": "Settings actions",
			"mr.settings.updatedAt": "Config updated {time}",
			"mr.settings.runningNote": "An evaluation is running: the active batch keeps the parameters it started with, saved changes apply from the next batch.",
			"mr.settings.status.loading": "Loading settings…",
			"mr.settings.status.saving": "Saving…",
			"mr.settings.status.dirty": "Unsaved changes",
			"mr.settings.status.clean": "All changes saved",
			"mr.settings.loadFailed": "Failed to load settings",
			"mr.settings.loadFailedHint": "Make sure the plugin host has been updated and DSH restarted, then reload.",
			"mr.settings.saveFailed": "Failed to save settings",
			"mr.settings.errorPayload": "The settings endpoint returned an unrecognized payload",
			"mr.settings.section.scheduling.title": "Scheduling",
			"mr.settings.section.scheduling.sub": "Control the concurrency lanes and combo budget of one evaluation.",
			"mr.settings.section.timeout.title": "Timeouts & retries",
			"mr.settings.section.timeout.sub": "Cap the wait time per task and per batch, and decide how often the judge retries.",
			"mr.settings.section.judge.title": "Judge & speed test",
			"mr.settings.section.judge.sub": "The judge model that scores all four tasks, plus controlled speed-test samples.",
			"mr.settings.section.recommend.title": "Recommendation weights",
			"mr.settings.section.recommend.sub": "After a run, the home page's overall recommendation ranks models by the weighted quality, speed, cost and stability.",
			"mr.settings.section.data.title": "Data & billing",
			"mr.settings.section.data.sub": "Batch retention, the USD→CNY rate and read-only data directory details.",
			"mr.settings.field.maxParallelModels": "Parallel model lanes",
			"mr.settings.field.maxParallelModelsDesc": "How many model lanes run at once. Higher values increase concurrency and finish a batch sooner.",
			"mr.settings.field.maxCombos": "Combo limit",
			"mr.settings.field.maxCombosDesc": "Maximum model × effort combos per batch. 0 means unlimited (run every selected combo).",
			"mr.settings.field.autoRetries": "Automatic retries",
			"mr.settings.field.autoRetriesDesc": "How many times a failed task is retried in a fresh context. 0 disables automatic retries.",
			"mr.settings.field.perTaskTimeout": "Per-task timeout",
			"mr.settings.field.perTaskTimeoutDesc": "Timeout for each task, entered in minutes and sent as milliseconds.",
			"mr.settings.field.perBatchTimeout": "Batch timeout",
			"mr.settings.field.perBatchTimeoutDesc": "Total timeout for a whole batch, entered in hours and sent as milliseconds.",
			"mr.settings.field.judgeMaxAttempts": "Judge max attempts",
			"mr.settings.field.judgeMaxAttemptsDesc": "Maximum attempts when judging fails or returns an unparsable result.",
			"mr.settings.field.judgeProvider": "Judge provider",
			"mr.settings.field.judgeModel": "Judge model",
			"mr.settings.field.judgeEffort": "Judge reasoning effort",
			"mr.settings.field.speedRuns": "Speed-test runs",
			"mr.settings.field.speedRunsDesc": "Controlled speed-test samples per combo. 0 disables controlled speed tests.",
			"mr.settings.field.retentionBatches": "Batch retention limit",
			"mr.settings.field.retentionBatchesDesc": "Maximum batches kept in the data directory; the oldest ones are pruned beyond this limit.",
			"mr.settings.field.usdToCny": "USD → CNY rate",
			"mr.settings.field.usdToCnyDesc": "Exchange rate used when displaying model costs in CNY.",
			"mr.settings.field.dataDir": "Data directory",
			"mr.settings.field.dataDirDesc": "Where batches, runs and settings live. Read-only; edit the plugin config to change it.",
			"mr.settings.field.models": "Model whitelist",
			"mr.settings.field.modelsDesc": "Empty means every model in the catalog is selectable; otherwise only the listed provider/model pairs can run.",
			"mr.settings.unit.minutes": "min",
			"mr.settings.unit.hours": "h",
			"mr.settings.unit.cny": "CNY / USD",
			"mr.settings.hint.range": "Range {min}–{max} {unit} · step {step} {unit}",
			"mr.settings.hint.rangeUnitless": "Range {min}–{max} · step {step}",
			"mr.settings.hint.rangeMs": "Server range {min}–{max} ms · step {step} ms",
			"mr.settings.hint.unlimited": "0 = unlimited (run every selected combo)",
			"mr.settings.hint.speedOff": "0 = controlled speed test off",
			"mr.settings.hint.clampNote": "Values with units are converted to milliseconds first; out-of-range numbers are clamped to the server bounds on save.",
			"mr.settings.convert.task": "Converted: {ms} ms = {minutes} min = {hours} h",
			"mr.settings.convert.batch": "Converted: {ms} ms = {hours} h = {minutes} min",
			"mr.settings.convert.usd": "1 USD ≈ {rate} CNY",
			"mr.settings.judge.preview": "Current judge: {provider} · {model} · {effort}",
			"mr.settings.judge.missing": "The current judge is not in the model catalog. Pick a provider and model again before saving.",
			"mr.settings.judge.catalogLoading": "The model catalog is still loading, so the judge cannot be changed yet; all other settings can be saved.",
			"mr.settings.judge.emptyCatalog": "The model catalog is empty, so no judge can be selected. Check the model service and reload.",
			"mr.settings.recommend.quality": "Quality",
			"mr.settings.recommend.speed": "Speed",
			"mr.settings.recommend.cost": "Cost",
			"mr.settings.recommend.stability": "Stability",
			"mr.settings.recommend.raw": "{value}%",
			"mr.settings.recommend.normalized": "Effective normalized weights",
			"mr.settings.recommend.zeroHint": "When all four weights are 0 the server falls back to the default weights.",
			"mr.settings.data.locked": "The data directory, model whitelist and presets are read-only and ignored on save.",
			"mr.settings.data.modelsEmpty": "All models available (no whitelist)",
			"mr.settings.data.copyHint": "Focus the field to select all and copy",
			"mr.settings.resetConfirm": "Restore defaults and overwrite the current settings?",
			"mr.settings.notice.nextBatch": "Saved: the running batch keeps its old parameters, changes apply from the next batch.",
			"mr.settings.toast.saved": "Settings saved",
			"mr.settings.toast.savedNext": "Settings saved; applies to the next batch",
			"mr.settings.toast.saveFailed": "Failed to save settings",
			"mr.settings.toast.reset": "Default settings restored",
			"mr.settings.toast.resetFailed": "Failed to restore default settings",
			"mr.rerun.dialogLabel": "Rerun: choose models and tasks",
			"mr.rerun.title": "Rerun batch",
			"mr.rerun.subtitle": "Batch {id} · choose the models and tasks to rerun",
			"mr.rerun.matrixTitle": "Combos × tasks",
			"mr.rerun.totalLine": "{combos} combos · {runs} runs",
			"mr.rerun.modelCol": "Model / effort",
			"mr.rerun.maxPoints": "{score} pts",
			"mr.rerun.selectFailed": "Select failed runs",
			"mr.rerun.selectAll": "Select all",
			"mr.rerun.clear": "Clear",
			"mr.rerun.rowAria": "Select all tasks for {model}",
			"mr.rerun.cellAria": "{model} · {task} · {status}",
			"mr.rerun.stats": "Selected {models} models · {tasks} tasks · {runs} runs",
			"mr.rerun.footNote": "Reruns reuse the batch configuration and add to its cost.",
			"mr.rerun.doneSelected": "Includes {count} completed runs that will be regenerated and scored.",
			"mr.rerun.submit": "Start rerun",
			"mr.rerun.submitting": "Starting…",
			"mr.rerun.noteRunning": "This batch is still running; rerun after it finishes.",
			"mr.rerun.noteLocked": "This batch cannot be rerun: its task or rubric version does not match this build.",
			"mr.rerun.noteNoRuns": "Run details are unavailable, so tasks cannot be selected. Reload the batch.",
			"mr.rerun.noteInitialEmpty": "The specified runs are already up to date; select tasks to rerun manually.",
			"mr.rerun.noteAllDone": "All runs are completed; select the tasks to rerun manually.",
			"mr.rerun.empty": "This batch has no combos to rerun",
			"mr.rerun.errorBusy": "An evaluation batch is already running. Try again shortly.",
			"mr.rerun.errorVersion": "Batch versions do not match this build; rerun is unavailable.",
			"mr.rerun.errorEmpty": "Select at least one run.",
			"mr.rerun.errorStale": "The selected runs no longer exist. Reload the batch and try again.",
			"mr.rerun.errorFailed": "Rerun failed",
		};

		function makeTranslator(t) {
			return (key, params) => {
				let text = typeof t === "function" ? t(key) : key;
				if (typeof text !== "string" || text === key) text = zh[key] ?? key;
				if (params !== null && typeof params === "object") {
					for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
				}
				return text;
			};
		}

		// ── generic helpers ────────────────────────────────────────────────

		function toFiniteNumber(value, fallback) {
			if (value === null || value === undefined || value === "") return fallback;
			const number = typeof value === "number" ? value : Number(value);
			return Number.isFinite(number) ? number : fallback;
		}

		function clamp(value, min, max) {
			const number = toFiniteNumber(value, min);
			return Math.max(min, Math.min(max, number));
		}

		function formatNumber(value, digits) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			const places = typeof digits === "number" ? digits : 2;
			const fixed = number.toFixed(places);
			if (fixed.indexOf(".") < 0) return fixed;
			return fixed.replace(/0+$/, "").replace(/\.$/, "");
		}

		function formatInt(value) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			return Math.round(number).toLocaleString("en-US");
		}

		function formatUsd(value) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			const abs = Math.abs(number);
			if (abs === 0) return "$0";
			if (abs < 0.0001) return "<$0.0001";
			if (abs < 1) return "$" + number.toFixed(4);
			return "$" + number.toFixed(2);
		}

		function formatMs(value) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			if (number < 1000) return Math.round(number) + " ms";
			const seconds = number / 1000;
			if (seconds < 60) return formatNumber(seconds, 1) + " s";
			const minutes = Math.floor(seconds / 60);
			const rest = Math.round(seconds - minutes * 60);
			if (minutes < 60) return rest === 0 ? minutes + " min" : minutes + " min " + rest + " s";
			const hours = Math.floor(minutes / 60);
			const restMinutes = minutes % 60;
			return restMinutes === 0 ? hours + " h" : hours + " h " + restMinutes + " min";
		}

		function formatDurationMs(value) {
			return formatMs(value);
		}

		function pad2(value) {
			return String(value).padStart(2, "0");
		}

		/** "20:32" today, "11-02 08:00" this year, else full date. */
		function formatClock(ms) {
			const number = toFiniteNumber(ms, null);
			if (number === null) return "—";
			const date = new Date(number);
			if (!Number.isFinite(date.getTime())) return "—";
			const now = new Date();
			const hm = pad2(date.getHours()) + ":" + pad2(date.getMinutes());
			if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) {
				return hm;
			}
			const md = pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
			if (date.getFullYear() === now.getFullYear()) return md + " " + hm;
			return date.getFullYear() + "-" + md + " " + hm;
		}

		function formatBytes(value) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			if (number < 1024) return Math.round(number) + " B";
			if (number < 1024 * 1024) return formatNumber(number / 1024, 1) + " KB";
			return formatNumber(number / (1024 * 1024), 1) + " MB";
		}

		function formatPercent(value, digits) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			return formatNumber(number * 100, digits === undefined ? 1 : digits) + "%";
		}

		function formatTokenCount(value) {
			const number = toFiniteNumber(value, null);
			if (number === null || number <= 0) return null;
			if (number >= 1000000) return formatNumber(number / 1000000, 1) + "M";
			if (number >= 1000) return formatNumber(number / 1000, 1) + "K";
			return String(Math.round(number));
		}

		function prefersReducedMotion() {
			try {
				return typeof window !== "undefined"
					&& typeof window.matchMedia === "function"
					&& window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			} catch (error) {
				return false;
			}
		}

		function useCountUp(value, duration) {
			const target = toFiniteNumber(value, null);
			const [display, setDisplay] = React.useState(target);
			React.useEffect(() => {
				if (target === null) {
					setDisplay(null);
					return undefined;
				}
				if (prefersReducedMotion() || typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
					setDisplay(target);
					return undefined;
				}
				const span = typeof duration === "number" && duration > 0 ? duration : 650;
				const started = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
				let frame = 0;
				setDisplay(0);
				const tick = (now) => {
					const progress = Math.min(1, Math.max(0, (now - started) / span));
					const eased = 1 - Math.pow(1 - progress, 3);
					setDisplay(target * eased);
					if (progress < 1) frame = window.requestAnimationFrame(tick);
				};
				frame = window.requestAnimationFrame(tick);
				return () => {
					if (frame !== 0) window.cancelAnimationFrame(frame);
				};
			}, [target, duration]);
			return display;
		}

		function formatSignedNumber(value, digits) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			if (number === 0) return "0";
			return (number > 0 ? "+" : "−") + formatNumber(Math.abs(number), digits === undefined ? 1 : digits);
		}

		function deltaTone(value) {
			const number = toFiniteNumber(value, null);
			if (number === null || number === 0) return "is-flat";
			return number > 0 ? "is-up" : "is-down";
		}

		function readThemePreference() {
			try {
				const stored = window.localStorage.getItem(THEME_KEY);
				if (stored === "light" || stored === "dark") return stored;
			} catch (error) {
				// Storage may be unavailable; fall back to the host theme.
			}
			return null;
		}

		function hostColorScheme() {
			try {
				const snapshot = themeService?.getTheme?.();
				const scheme = snapshot?.active?.colorScheme;
				if (scheme === "light" || scheme === "dark") return scheme;
			} catch (error) {
				// Fall through to the OS preference.
			}
			try {
				if (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
			} catch (error) {
				// Ignore unavailable media queries.
			}
			return "light";
		}

		function writeThemePreference(mode) {
			try {
				window.localStorage.setItem(THEME_KEY, mode);
			} catch (error) {
				// Preference persistence is best effort.
			}
		}

		function readStoredFlag(key, fallback) {
			try {
				const value = window.localStorage.getItem(key);
				if (value === "1") return true;
				if (value === "0") return false;
			} catch (error) {
				return fallback;
			}
			return fallback;
		}

		function writeStoredFlag(key, value) {
			try {
				window.localStorage.setItem(key, value ? "1" : "0");
			} catch (error) {
				// localStorage is optional; the in-memory state still updates.
			}
		}

		function formatDeltaPct(value) {
			const number = toFiniteNumber(value, null);
			if (number === null) return "—";
			const sign = number > 0 ? "+" : "";
			return sign + formatNumber(number, 1) + "%";
		}

		function effortLabel(tr, effort, effortName) {
			if (effort === null || effort === undefined || effort === "") return tr("mr.common.defaultEffort");
			if (typeof effortName === "string" && effortName !== "") return effortName;
			return String(effort);
		}

		function effortKeyOf(entry) {
			const effort = entry?.reasoningEffort;
			return effort === null || effort === undefined || effort === "" ? "__default" : String(effort);
		}

		function effortOrderOf(entry) {
			const key = effortKeyOf(entry).toLowerCase();
			if (key === "__default") return -1;
			const index = EFFORT_ORDER.indexOf(key);
			return index < 0 ? EFFORT_ORDER.length + 1 : index;
		}

		function effortToneOf(entry) {
			const raw = entry?.reasoningEffort ?? entry?.id ?? null;
			if (raw === null || raw === undefined || raw === "") return null;
			const key = String(raw).toLowerCase();
			if (key === "off") return null;
			return EFFORT_TONES[key] ?? null;
		}

		function effortStyle(entry) {
			const tone = effortToneOf(entry);
			const base = tone ?? "var(--dsw-alias-label-secondary)";
			return {
				"--mr-effort-color": "color-mix(in srgb, " + base + " 80%, var(--dsw-alias-label-primary))",
				color: "var(--mr-effort-color)",
			};
		}

		function modelLabel(tr, entry) {
			const modelName = entry !== null && typeof entry === "object" && typeof entry.modelName === "string" && entry.modelName !== ""
				? entry.modelName
				: entry?.model ?? entry?.id ?? "";
			return String(modelName) + " · " + effortLabel(tr, entry?.reasoningEffort, entry?.effortName);
		}

		function statusLabel(tr, status) {
			return tr(STATUS_KEYS[status] ?? "mr.status.unknown");
		}

		function statusKind(status) {
			if (status === "done") return "is-done";
			if (status === "running") return "is-running";
			if (status === "error" || status === "timeout" || status === "judge_error" || status === "interrupted") return "is-error";
			if (status === "stopped" || status === "partial" || status === "skipped") return "is-warn";
			return "is-idle";
		}

		function isResumableBatch(batch) {
			if (batch === null || batch === undefined) return false;
			if (batch.status === "running") return false;
			if (batch.resumable === false) return false;
			const runs = Array.isArray(batch.runs) ? batch.runs : [];
			return runs.some((run) => run !== null && run !== undefined && run.status !== "done");
		}

		function isResumableEntry(entry) {
			if (entry === null || entry === undefined) return false;
			if (entry.status === "running") return false;
			// The server decides resumability (scoring protocol version included);
			// old entries predate the flag and must not offer a resume button.
			if (entry.resumable !== true) return false;
			const runs = toFiniteNumber(entry.runCount, 0) ?? 0;
			const done = toFiniteNumber(entry.doneCount, 0) ?? 0;
			return runs > done;
		}

		function resumeButtonLabel(tr, busy) {
			return busy ? tr("mr.resume.busy") : tr("mr.resume.button");
		}

		function taskName(tr, taskId) {
			const task = TASK_BY_ID.get(taskId);
			return task === undefined ? String(taskId) : tr(task.nameKey);
		}

		function comboKeyOf(provider, model, effort) {
			// Mirror the host combo key so fallback combos (built from a running
			// batch's selection) can be matched with the batch's runs.
			return String(provider) + "__" + String(model) + "__" + (effort === null || effort === undefined || effort === "" ? "default" : String(effort));
		}

		function comboSortValue(combo, key) {
			switch (key) {
				case "rank":
				case "total":
					return toFiniteNumber(combo.total, -1);
				case "model":
					return String(combo.modelName ?? combo.model ?? "").toLowerCase();
				case "candy":
					return toFiniteNumber(combo.scores?.candy, -1);
				case "pompeii":
					return toFiniteNumber(combo.scores?.pompeii, -1);
				case "pelican":
					return toFiniteNumber(combo.scores?.pelican, -1);
				case "qin":
					return toFiniteNumber(combo.scores?.qin, -1);
				case "cost":
					return toFiniteNumber(combo.costUsd, 0) + toFiniteNumber(combo.judgeCostUsd, 0);
				case "duration":
					return toFiniteNumber(combo.durationMs, -1);
				case "time":
					return 0;
				default:
					return 0;
			}
		}

		function rankMapOf(combos) {
			const sorted = combos
				.filter((combo) => toFiniteNumber(combo.total, null) !== null)
				.sort((left, right) => {
					const a = toFiniteNumber(left.total, -1);
					const b = toFiniteNumber(right.total, -1);
					if (b !== a) return b - a;
					return String(left.key).localeCompare(String(right.key));
				});
			const map = new Map();
			for (let index = 0; index < sorted.length; index += 1) {
				map.set(sorted[index].key, index + 1);
			}
			return map;
		}

		function comboTotalCost(combo) {
			const generation = toFiniteNumber(combo?.costUsd, null);
			const judge = toFiniteNumber(combo?.judgeCostUsd, null);
			if (generation === null && judge === null) return null;
			return (generation ?? 0) + (judge ?? 0);
		}

		function latestBatchCombos(batch) {
			if (batch === null || batch === undefined) return [];
			if (Array.isArray(batch.combos) && batch.combos.length > 0) return batch.combos;
			if (!Array.isArray(batch.selection)) return [];
			return batch.selection.map((entry) => ({
				key: entry.key ?? comboKeyOf(entry.provider, entry.model, entry.reasoningEffort),
				provider: entry.provider,
				providerName: entry.providerName,
				model: entry.model,
				modelName: entry.modelName,
				reasoningEffort: entry.reasoningEffort ?? null,
				effortName: entry.effortName,
				status: batch.status === "running" ? "running" : "pending",
				scores: {},
				total: null,
				maxScore: 150,
				costUsd: null,
				judgeCostUsd: null,
				durationMs: null,
				complete: false,
				missing: [],
			}));
		}

		function buildIQMatrix(batches, tr) {
			const sorted = [...(Array.isArray(batches) ? batches : [])]
				.filter((batch) => batch !== null && typeof batch === "object")
				.sort((left, right) => (toFiniteNumber(right.createdAt, 0) ?? 0) - (toFiniteNumber(left.createdAt, 0) ?? 0));
			const versionSource = sorted.find(
				(batch) => typeof batch.taskVersion === "string" && typeof batch.rubricVersion === "string",
			) ?? sorted[0] ?? null;
			const taskVersion = versionSource?.taskVersion ?? null;
			const rubricVersion = versionSource?.rubricVersion ?? null;
			const scoped = sorted.filter(
				(batch) => (batch.taskVersion ?? null) === taskVersion && (batch.rubricVersion ?? null) === rubricVersion,
			);
			const rowsMap = new Map();
			for (const batch of scoped) {
				const at = toFiniteNumber(batch.createdAt, 0) ?? 0;
				const combos = Array.isArray(batch.combos) ? batch.combos : [];
				for (const combo of combos) {
					if (combo === null || typeof combo !== "object") continue;
					const rowKey = String(combo.provider ?? "") + "\u0000" + String(combo.model ?? "");
					let row = rowsMap.get(rowKey);
					if (row === undefined) {
						row = {
							key: rowKey,
							provider: combo.provider ?? "",
							providerName: combo.providerName ?? combo.provider ?? "",
							model: combo.model ?? "",
							modelName: combo.modelName ?? combo.model ?? "",
							efforts: new Map(),
							bestTotal: null,
						};
						rowsMap.set(rowKey, row);
					}
					const effortKey = effortKeyOf(combo);
					let effort = row.efforts.get(effortKey);
					if (effort === undefined) {
						effort = {
							key: effortKey,
							reasoningEffort: combo.reasoningEffort ?? null,
							label: effortLabel(tr, combo.reasoningEffort, combo.effortName),
							comboKey: String(combo.key ?? comboKeyOf(combo.provider, combo.model, combo.reasoningEffort)),
							batchId: batch.id,
							createdAt: at,
							status: combo.status ?? "pending",
							cells: {},
							latestTotal: null,
						};
						row.efforts.set(effortKey, effort);
					}
					for (const task of TASKS) {
						if (effort.cells[task.id] !== undefined) continue;
						const score = toFiniteNumber(combo.scores?.[task.id], null);
						if (score === null) continue;
						const status = combo.statuses?.[task.id] ?? combo.status;
						if (status !== "done") continue;
						const cell = {
							score,
							maxScore: task.maxScore,
							batchId: batch.id,
							createdAt: at,
							status,
							comboKey: effort.comboKey,
							taskId: task.id,
						};
						effort.cells[task.id] = cell;
					}
					if (effort.latestTotal === null && combo.status === "done") {
						const total = toFiniteNumber(combo.total, null);
						const allScoresPresent = TASKS.every(
							(task) => toFiniteNumber(combo.scores?.[task.id], null) !== null,
						);
						if (total !== null && allScoresPresent) {
							effort.latestTotal = {
								total,
								batchId: batch.id,
								createdAt: at,
								status: combo.status,
							};
						}
					}
				}
			}
			const columnsMap = new Map();
			const rows = [];
			for (const row of rowsMap.values()) {
				const efforts = [...row.efforts.values()].filter((effort) => Object.keys(effort.cells).length > 0);
				if (efforts.length === 0) continue;
				for (const effort of efforts) {
					if (effort.latestTotal !== null && (row.bestTotal === null || effort.latestTotal.total > row.bestTotal)) {
						row.bestTotal = effort.latestTotal.total;
					}
					if (!columnsMap.has(effort.key)) {
						columnsMap.set(effort.key, {
							key: effort.key,
							reasoningEffort: effort.reasoningEffort,
							label: effort.label,
							order: effortOrderOf(effort),
						});
					}
				}
				row.efforts = efforts;
				rows.push(row);
			}
			const columns = [...columnsMap.values()].sort(
				(left, right) => left.order - right.order || left.label.localeCompare(right.label),
			);
			rows.sort((left, right) => {
				const a = left.bestTotal ?? -1;
				const b = right.bestTotal ?? -1;
				if (a !== b) return b - a;
				return String(left.modelName).localeCompare(String(right.modelName));
			});
			return { rows, columns, taskVersion, rubricVersion, batchCount: scoped.length };
		}

		function totalCostOfBatch(batch) {
			const combos = Array.isArray(batch?.combos) ? batch.combos : [];
			let total = 0;
			let seen = false;
			for (const combo of combos) {
				for (const value of [combo.costUsd, combo.judgeCostUsd]) {
					const cost = toFiniteNumber(value, null);
					if (cost !== null) {
						total += cost;
						seen = true;
					}
				}
			}
			if (combos.length === 0 && Array.isArray(batch?.runs)) {
				for (const run of batch.runs) {
					for (const value of [run.cost?.usd, run.judgeCost?.usd]) {
						const cost = toFiniteNumber(value, null);
						if (cost !== null) {
							total += cost;
							seen = true;
						}
					}
				}
			}
			return seen ? total : null;
		}

		function judgeLabel(tr, judge, catalog) {
			if (judge === null || typeof judge !== "object") return "—";
			const provider = String(judge.provider ?? "");
			const modelId = String(judge.model ?? "");
			let modelName = modelId;
			const providerEntry = Array.isArray(catalog?.providers)
				? catalog.providers.find((entry) => entry.id === provider)
				: undefined;
			const modelEntry = providerEntry?.models?.find((entry) => entry.id === modelId);
			if (modelEntry !== undefined) modelName = modelEntry.name || modelId;
			const effortName = effortDisplayName(catalog, provider, modelId, judge.reasoningEffort);
			const effort = effortLabel(tr, judge.reasoningEffort, effortName);
			return modelName + " · " + effort;
		}

		function modelDisplayName(catalog, provider, modelId) {
			const providerEntry = Array.isArray(catalog?.providers)
				? catalog.providers.find((entry) => entry.id === provider)
				: undefined;
			const modelEntry = providerEntry?.models?.find((entry) => entry.id === modelId);
			return modelEntry?.name || modelId || "—";
		}

		function effortDisplayName(catalog, provider, modelId, effort) {
			if (effort === null || effort === undefined || effort === "") return null;
			const providerEntry = Array.isArray(catalog?.providers)
				? catalog.providers.find((entry) => entry.id === provider)
				: undefined;
			const modelEntry = providerEntry?.models?.find((entry) => entry.id === modelId);
			const effortEntry = modelEntry?.efforts?.find((entry) => entry.id === effort);
			return effortEntry?.name || String(effort);
		}

		function providerDisplayName(catalog, providerId) {
			const providerEntry = Array.isArray(catalog?.providers)
				? catalog.providers.find((entry) => entry.id === providerId)
				: undefined;
			return providerEntry?.name || providerId || "—";
		}

		function excerptOf(text) {
			const source = typeof text === "string" ? text : "";
			if (source === "") return { text: "", truncated: false };
			const clipped = source.slice(0, ANSWER_EXCERPT_LIMIT);
			return { text: clipped, truncated: source.length > ANSWER_EXCERPT_LIMIT };
		}

		function speedRecordOf(batch, comboKey) {
			const wanted = String(comboKey ?? "");
			const tests = Array.isArray(batch?.speedTests) ? batch.speedTests : [];
			return tests.find((entry) => {
				const key = entry?.comboKey ?? comboKeyOf(entry?.provider, entry?.model, entry?.reasoningEffort);
				return String(key) === wanted;
			}) ?? null;
		}

		function speedMetricsOf(record) {
			if (record === null || record === undefined || record.status === "error") return { tps: null, ttft: null };
			return {
				tps: toFiniteNumber(record.median?.tps, null),
				ttft: toFiniteNumber(record.median?.ttftMs, null),
			};
		}

		function catalogModelOf(catalog, providerId, modelId) {
			const provider = Array.isArray(catalog?.providers)
				? catalog.providers.find((entry) => entry.id === providerId)
				: undefined;
			return provider?.models?.find((entry) => entry.id === modelId) ?? null;
		}

		function contextWindowOf(catalog, providerId, modelId) {
			return formatTokenCount(catalogModelOf(catalog, providerId, modelId)?.contextWindow);
		}

		function findLatestSpeedBatch(details) {
			const list = [...details].filter((batch) => Array.isArray(batch?.speedTests) && batch.speedTests.length > 0);
			if (list.length === 0) return null;
			list.sort((left, right) => toFiniteNumber(right.createdAt, 0) - toFiniteNumber(left.createdAt, 0));
			return list[0];
		}

		function buildTrendSeries(batches, tr) {
			const done = batches.filter((batch) => batch?.status === "done");
			if (done.length === 0) return { batches: done, series: [], anchor: null };
			const anchor = done[done.length - 1];
			// Only the newest contiguous run of the same benchmark version forms a
			// trend line; an older version sitting in between breaks the line.
			let start = done.length - 1;
			while (
				start > 0
				&& done[start - 1].taskVersion === anchor.taskVersion
				&& done[start - 1].rubricVersion === anchor.rubricVersion
			) {
				start -= 1;
			}
			const group = done.slice(start);
			const seriesMap = new Map();
			for (const batch of group) {
				const combos = Array.isArray(batch.combos) ? batch.combos : [];
				for (const combo of combos) {
					const total = toFiniteNumber(combo.total, null);
					if (total === null) continue;
					const key = String(combo.key ?? comboKeyOf(combo.provider, combo.model, combo.reasoningEffort));
					if (!seriesMap.has(key)) {
						seriesMap.set(key, {
							key,
							modelName: String(combo.modelName ?? combo.model ?? key),
							reasoningEffort: combo.reasoningEffort ?? null,
							effortName: combo.effortName,
							label: String(combo.modelName ?? combo.model ?? key) + " · " + effortLabel(tr, combo.reasoningEffort, combo.effortName),
							points: [],
						});
					}
					seriesMap.get(key).points.push({
						batchId: batch.id,
						at: toFiniteNumber(batch.createdAt, 0),
						score: total,
					});
				}
			}
			const series = [...seriesMap.values()];
			for (const entry of series) entry.points.sort((left, right) => left.at - right.at);
			return { batches: group, series, anchor };
		}

		function buildParetoData(combos, metric, tr) {
			const rows = [];
			for (const combo of combos) {
				const score = toFiniteNumber(combo.total, null);
				if (score === null) continue;
				let x;
				if (metric === "duration") {
					const duration = toFiniteNumber(combo.durationMs, null);
					if (duration === null) continue;
					x = duration / 1000;
				} else {
					const generation = toFiniteNumber(combo.costUsd, null);
					const judge = toFiniteNumber(combo.judgeCostUsd, null);
					if (generation === null && judge === null) continue;
					x = (generation ?? 0) + (judge ?? 0);
				}
				rows.push({
					key: String(combo.key ?? ""),
					label: String(combo.modelName ?? combo.model ?? "") + " · " + effortLabel(tr, combo.reasoningEffort, combo.effortName),
					x: Math.max(0, x),
					y: score,
				});
			}
			const sorted = [...rows].sort((left, right) => left.x - right.x || right.y - left.y);
			const frontier = [];
			let best = -Infinity;
			for (const row of sorted) {
				if (row.y > best) {
					frontier.push(row);
					best = row.y;
				}
			}
			const maxX = rows.reduce((max, row) => Math.max(max, row.x), 0);
			return { rows, frontier, maxX: maxX > 0 ? maxX : 1 };
		}

		function safeSvgNumber(value, fallback) {
			const number = toFiniteNumber(value, null);
			return number === null ? fallback : number;
		}

		// ── icons ──────────────────────────────────────────────────────────

		function iconBase(size) {
			const pixels = typeof size === "number" && Number.isFinite(size) ? size : 16;
			return {
				width: pixels,
				height: pixels,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				focusable: "false",
			};
		}

		function RadarIcon(props) {
			const size = props !== null && typeof props === "object" && typeof props.size === "number" ? props.size : 16;
			return h(
				"svg",
				iconBase(size),
				h(
					"defs",
					null,
					h(
						"linearGradient",
						{ id: "mr-sidebar-fan-grad", x1: "5.7", y1: "2.2", x2: "2.25", y2: "10.1", gradientUnits: "userSpaceOnUse" },
						h("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: 0.7 }),
						h("stop", { offset: "55%", stopColor: "currentColor", stopOpacity: 0.3 }),
						h("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: 0 }),
					),
					h(
						"filter",
						{ id: "mr-sidebar-fan-blur", x: "-30%", y: "-30%", width: "160%", height: "160%" },
						h("feGaussianBlur", { stdDeviation: 0.34 }),
					),
				),
				h("circle", { cx: 8, cy: 8, r: 6.2, stroke: "currentColor", strokeWidth: 1.25, opacity: 0.85 }),
				h("circle", { cx: 8, cy: 8, r: 3.6, stroke: "currentColor", strokeWidth: 1.05, opacity: 0.5 }),
				h(
					"g",
					{ className: "mr-sidebar-fan" },
					h("path", {
						d: "M8 8 L5.7 2.2 A6.2 6.2 0 0 0 2.25 10.1 Z",
						fill: "url(#mr-sidebar-fan-grad)",
						filter: "url(#mr-sidebar-fan-blur)",
					}),
					h("path", {
						d: "M8 8 L5.45 2.4 A6.2 6.2 0 0 0 3.85 2.75 Z",
						fill: "currentColor",
						opacity: 0.42,
						filter: "url(#mr-sidebar-fan-blur)",
					}),
				),
				h("circle", { cx: 8, cy: 8, r: 1.05, fill: "currentColor" }),
			);
		}

		function BrandMark(props) {
			const size = props !== null && typeof props === "object" && typeof props.size === "number" ? props.size : 40;
			return h(
				"svg",
				{
					className: "mr-brand-mark",
					width: size,
					height: size,
					viewBox: "0 0 48 48",
					fill: "none",
					"aria-hidden": true,
				},
				h(
					"defs",
					null,
					h(
						"linearGradient",
						{ id: "mr-brand-grad", x1: "5", y1: "5", x2: "43", y2: "43", gradientUnits: "userSpaceOnUse" },
						h("stop", { offset: "0%", stopColor: "var(--mr-accent-a)" }),
						h("stop", { offset: "58%", stopColor: "var(--mr-accent-b)" }),
						h("stop", { offset: "100%", stopColor: "var(--mr-accent-c)" }),
					),
				),
				h("circle", { cx: 24, cy: 24, r: 20, stroke: "url(#mr-brand-grad)", strokeWidth: 1.8, opacity: 0.95 }),
				h("circle", { cx: 24, cy: 24, r: 12.5, stroke: "url(#mr-brand-grad)", strokeWidth: 1.3, opacity: 0.6 }),
				h("circle", { cx: 24, cy: 24, r: 5.5, stroke: "url(#mr-brand-grad)", strokeWidth: 1.1, opacity: 0.38 }),
				h("circle", { cx: 24, cy: 24, r: 2.2, fill: "var(--dsw-alias-label-primary)" }),
			);
		}

		function RefreshIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", {
					d: "M13.2 7.1A5.3 5.3 0 1 1 11.4 4",
					stroke: "currentColor",
					strokeWidth: 1.5,
					strokeLinecap: "round",
				}),
				h("path", { d: "M13.3 2.3v3.4h-3.4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
			);
		}

		function SunIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("circle", { cx: 8, cy: 8, r: 3.1, stroke: "currentColor", strokeWidth: 1.4 }),
				h("path", {
					d: "M8 1.3v1.7M8 13v1.7M1.3 8h1.7M13 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2",
					stroke: "currentColor",
					strokeWidth: 1.3,
					strokeLinecap: "round",
				}),
			);
		}

		function MoonIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", {
					d: "M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8 5.6 5.6 0 1 0 13.2 9.6Z",
					stroke: "currentColor",
					strokeWidth: 1.4,
					strokeLinejoin: "round",
				}),
			);
		}

		function CogIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("circle", { cx: 8, cy: 8, r: 2.4, stroke: "currentColor", strokeWidth: 1.25 }),
				h("path", {
					d: "M8 1.9v1.9M8 12.2v1.9M1.9 8h1.9M12.2 8h1.9M3.7 3.7l1.3 1.3M11 11l1.3 1.3M12.3 3.7 11 5M5 11l-1.3 1.3",
					stroke: "currentColor",
					strokeWidth: 1.2,
					strokeLinecap: "round",
				}),
			);
		}

		function PlayIcon(props) {
			const size = props?.size ?? 13;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M5 3.4 12.2 8 5 12.6Z", fill: "currentColor", stroke: "currentColor", strokeWidth: 0.8, strokeLinejoin: "round" }),
			);
		}

		function StopIcon(props) {
			const size = props?.size ?? 13;
			return h(
				"svg",
				iconBase(size),
				h("rect", { x: 4.2, y: 4.2, width: 7.6, height: 7.6, rx: 1.4, fill: "currentColor" }),
			);
		}

		function CloseIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }),
			);
		}

		function ChevronIcon(props) {
			const size = props?.size ?? 13;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M4.2 6.2 8 10l3.8-3.8", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
			);
		}

		function TrophyIcon(props) {
			const size = props?.size ?? 15;
			return h(
				"svg",
				iconBase(size),
				h("path", {
					d: "M5 2.5h6v3.2a3 3 0 0 1-6 0Z",
					stroke: "currentColor",
					strokeWidth: 1.3,
					strokeLinejoin: "round",
				}),
				h("path", { d: "M5 3.4H2.9v1.2A2.2 2.2 0 0 0 5.1 6.8M11 3.4h2.1v1.2a2.2 2.2 0 0 1-2.2 2.2", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
				h("path", { d: "M8 8.7v3M5.6 13.5h4.8", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" }),
			);
		}

		function GaugeIcon(props) {
			const size = props?.size ?? 15;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M2.6 12.3a5.9 5.9 0 1 1 10.8 0", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" }),
				h("path", { d: "M8 9.6 10.6 6.4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
				h("circle", { cx: 8, cy: 10.3, r: 1.1, fill: "currentColor" }),
			);
		}

		function ClockIcon(props) {
			const size = props?.size ?? 15;
			return h(
				"svg",
				iconBase(size),
				h("circle", { cx: 8, cy: 8, r: 5.7, stroke: "currentColor", strokeWidth: 1.3 }),
				h("path", { d: "M8 4.8V8l2.3 1.5", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" }),
			);
		}

		function AlertIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M8 2.6 14 13H2Z", stroke: "currentColor", strokeWidth: 1.3, strokeLinejoin: "round" }),
				h("path", { d: "M8 6.3v3.2", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
				h("circle", { cx: 8, cy: 11.3, r: 0.8, fill: "currentColor" }),
			);
		}

		function MinusIcon(props) {
			const size = props?.size ?? 12;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M3.4 8h9.2", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" }),
			);
		}

		function CheckIcon(props) {
			const size = props?.size ?? 13;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M3.4 8.4 6.3 11.2 12.6 4.9", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }),
			);
		}

		function SparkIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M8 1.9 9.5 6l4.1 1.5-4.1 1.5L8 13.1 6.5 9 2.4 7.5 6.5 6Z", stroke: "currentColor", strokeWidth: 1.1, strokeLinejoin: "round" }),
			);
		}

		function EyeIcon(props) {
			const size = props?.size ?? 14;
			return h(
				"svg",
				iconBase(size),
				h("path", { d: "M1.8 8s2.2-3.8 6.2-3.8S14.2 8 14.2 8s-2.2 3.8-6.2 3.8S1.8 8 1.8 8Z", stroke: "currentColor", strokeWidth: 1.25, strokeLinejoin: "round" }),
				h("circle", { cx: 8, cy: 8, r: 1.8, stroke: "currentColor", strokeWidth: 1.25 }),
			);
		}

		function Tag(props) {
			const status = props?.status;
			const extraClass = props?.className ?? "";
			return h(
				"span",
				{ className: "mr-tag " + statusKind(status) + (extraClass === "" ? "" : " " + extraClass), title: props?.title },
				props?.dot === false ? null : h("span", { className: "mr-tag-dot", "aria-hidden": true }),
				props?.children,
			);
		}

		function EffortPill(props) {
			const tr = props?.tr;
			const entry = props?.entry ?? { reasoningEffort: props?.effort ?? null, effortName: props?.effortName };
			const label = props?.label ?? effortLabel(tr, entry?.reasoningEffort, entry?.effortName);
			return h(
				"span",
				{
					className: "mr-effort-pill" + (props?.className === undefined ? "" : " " + props.className),
					style: effortStyle(entry),
					title: props?.title,
				},
				label,
			);
		}

		function Skeleton(props) {
			const width = props?.width ?? "100%";
			const height = props?.height ?? 12;
			return h("span", { className: "mr-skel", style: { width, height }, "aria-hidden": true });
		}

		// ── same-origin API helpers ────────────────────────────────────────

		class ApiError extends Error {
			constructor(message, status, code) {
				super(message);
				this.name = "ApiError";
				this.status = status;
				this.code = code;
			}
		}

		async function requestJson(path, init) {
			const response = await fetch(API + path, {
				cache: "no-store",
				...(init ?? {}),
				headers: {
					accept: "application/json",
					...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
					...(init?.headers ?? {}),
				},
			});
			let payload = null;
			try {
				payload = await response.json();
			} catch {
				payload = null;
			}
			return { ok: response.ok, status: response.status, data: payload };
		}

		async function getJson(path) {
			const result = await requestJson(path);
			if (!result.ok) {
				const message = result.data?.error ?? "HTTP " + result.status;
				throw new ApiError(String(message), result.status, result.data?.code);
			}
			return result.data;
		}

		async function postJson(path, body) {
			try {
				return await requestJson(path, { method: "POST", body: JSON.stringify(body ?? {}) });
			} catch (error) {
				return { ok: false, status: 0, data: null, error };
			}
		}

		function errorMessageOf(error) {
			if (error instanceof Error && error.message) return error.message;
			if (typeof error === "string") return error;
			return "unknown error";
		}

		function artifactRunIdOf(run) {
			const comboKey = typeof run?.comboKey === "string" ? run.comboKey : "";
			const taskId = typeof run?.taskId === "string" ? run.taskId : "";
			if (comboKey !== "" && taskId !== "") return comboKey + "::" + taskId;
			return String(run?.id ?? "");
		}

		function artifactUrlOf(batchId, run, fileName) {
			const params = new URLSearchParams();
			params.set("batch", String(batchId));
			params.set("run", artifactRunIdOf(run));
			params.set("file", String(fileName));
			return API + "/artifact?" + params.toString();
		}

		function artifactExtensionOf(fileName) {
			const name = String(fileName ?? "");
			const dot = name.lastIndexOf(".");
			return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
		}

		function artifactKindOf(fileName) {
			const extension = artifactExtensionOf(fileName);
			if (extension === "svg" || extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "webp") return "image";
			if (extension === "html" || extension === "htm") return "html";
			if (extension === "json") return "json";
			if (extension === "txt" || extension === "css") return "text";
			return "other";
		}

		function artifactSupportsSource(fileName) {
			return ARTIFACT_SOURCE_EXTENSIONS.has(artifactExtensionOf(fileName));
		}

		async function fetchArtifactText(url) {
			const response = await fetch(url, {
				cache: "no-store",
				headers: { accept: "text/plain, application/json, */*" },
			});
			if (!response.ok) {
				let detail = "";
				try {
					const payload = await response.json();
					detail = typeof payload?.error === "string" ? payload.error : "";
				} catch {
					detail = "";
				}
				throw new ApiError(detail === "" ? "HTTP " + response.status : detail, response.status);
			}
			const text = await response.text();
			if (text.length <= ARTIFACT_TEXT_LIMIT) return { text, truncated: false };
			let low = 0;
			let high = text.length;
			while (low < high) {
				const middle = Math.ceil((low + high) / 2);
				if (new TextEncoder().encode(text.slice(0, middle)).length <= ARTIFACT_TEXT_LIMIT) low = middle;
				else high = middle - 1;
			}
			return { text: text.slice(0, low), truncated: true };
		}

		// ── charts ─────────────────────────────────────────────────────────

		function seriesColorStyle(index) {
			const slot = ((index % 12) + 12) % 12;
			return { color: "var(--mr-series-" + slot + ")" };
		}

		function seriesStroke(index) {
			const slot = ((index % 12) + 12) % 12;
			return "var(--mr-series-" + slot + ")";
		}

		function seriesDash(index) {
			return SERIES_DASHES[Math.floor(index / 12) % SERIES_DASHES.length];
		}

		function ChartTooltip(props) {
			return h(
				"div",
				{
					className: "mr-chart-tip",
					style: { left: props.left, top: props.top },
					role: "status",
				},
				h("div", { className: "mr-chart-tip-title" }, props.title),
				h("div", { className: "mr-chart-tip-value" }, props.value),
				props.meta === null || props.meta === undefined ? null : h("div", { className: "mr-chart-tip-meta" }, props.meta),
			);
		}

		function TrendChart(props) {
			const tr = props.tr;
			const trend = props.trend;
			const [hover, setHover] = React.useState(null);
			const series = Array.isArray(trend?.series) ? trend.series : [];
			const groups = Array.isArray(trend?.batches) ? trend.batches : [];
			if (series.length === 0 || groups.length === 0) {
				return h("div", { className: "mr-chart-empty" }, tr("mr.ranking.trend.empty"));
			}
			const width = 760;
			const height = 252;
			const margin = { left: 44, right: 18, top: 18, bottom: 32 };
			const plotWidth = width - margin.left - margin.right;
			const plotHeight = height - margin.top - margin.bottom;
			const times = groups.map((batch) => toFiniteNumber(batch.createdAt, 0));
			const minTime = Math.min(...times);
			const maxTime = Math.max(...times);
			const xOfTime = (at) => (maxTime === minTime
				? margin.left + plotWidth / 2
				: margin.left + ((at - minTime) / (maxTime - minTime)) * plotWidth);
			const yOfScore = (score) => margin.top + (1 - clamp(score, 0, 150) / 150) * plotHeight;
			const gridScores = [0, 50, 100, 150];
			const labelIndexes = [];
			if (groups.length <= 4) {
				for (let index = 0; index < groups.length; index += 1) labelIndexes.push(index);
			} else {
				const last = groups.length - 1;
				labelIndexes.push(0, Math.round(last / 3), Math.round((last * 2) / 3), last);
			}
			const points = [];
			series.forEach((entry, seriesIndex) => {
				for (const point of entry.points) {
					points.push({
						key: entry.key + "@" + point.batchId,
						seriesLabel: entry.label,
						seriesIndex,
						x: xOfTime(point.at),
						y: yOfScore(point.score),
						score: point.score,
						at: point.at,
					});
				}
			});
			return h(
				"div",
				{ className: "mr-chart-shell" },
				h(
					"div",
					{ className: "mr-legend" },
					series.map((entry, index) =>
						h(
							"span",
							{ className: "mr-legend-item", key: entry.key, title: entry.label },
							h("span", { className: "mr-legend-dot", style: seriesColorStyle(index) }),
							h(
								"span",
								{ className: "mr-legend-label" },
								h("span", { className: "mr-model-strong" }, entry.modelName),
								h("span", { className: "mr-selection-dot" }, " · "),
								h("span", { className: "mr-effort-text", style: effortStyle(entry) }, effortLabel(tr, entry.reasoningEffort, entry.effortName)),
							),
						),
					),
				),
				h(
					"div",
					{ className: "mr-chart-canvas" },
					h(
					"svg",
					{
						className: "mr-chart",
						viewBox: "0 0 " + width + " " + height,
						role: "img",
						"aria-label": tr("mr.aria.trend"),
					},
					h(
						"defs",
						null,
						series.map((entry, index) =>
							h(
								"linearGradient",
								{ key: "area-grad-" + entry.key, id: "mr-trend-area-" + index, x1: "0", y1: "0", x2: "0", y2: "1" },
								h("stop", { offset: "0%", stopColor: seriesStroke(index), stopOpacity: 0.16 }),
								h("stop", { offset: "100%", stopColor: seriesStroke(index), stopOpacity: 0 }),
							),
						),
					),
					gridScores.map((score) =>
						h(
							"g",
							{ key: "grid-" + score },
							h("line", {
								x1: margin.left,
								x2: margin.left + plotWidth,
								y1: yOfScore(score),
								y2: yOfScore(score),
								className: score === 0 ? "mr-axis-line" : "mr-grid-line",
							}),
							h(
								"text",
								{
									x: margin.left - 8,
									y: yOfScore(score) + 3.5,
									textAnchor: "end",
									className: "mr-axis-text",
								},
								String(score),
							),
						),
					),
					labelIndexes.map((index) => {
						const batch = groups[index];
						if (batch === undefined) return null;
						const x = xOfTime(toFiniteNumber(batch.createdAt, 0));
						return h(
							"text",
							{
								key: "x-" + (batch.id ?? index),
								x,
								y: height - 10,
								textAnchor: index === 0 ? "start" : index === groups.length - 1 ? "end" : "middle",
								className: "mr-axis-text",
							},
							formatClock(batch.createdAt),
						);
					}),
					series.map((entry, index) => {
						if (entry.points.length === 0) return null;
						const coords = entry.points
							.map((point) => xOfTime(point.at).toFixed(2) + " " + yOfScore(point.score).toFixed(2))
							.join(" L ");
						const firstX = xOfTime(entry.points[0].at).toFixed(2);
						const lastX = xOfTime(entry.points[entry.points.length - 1].at).toFixed(2);
						const baseline = yOfScore(0).toFixed(2);
						const dashed = seriesDash(index) !== "";
						return h(
							React.Fragment,
							{ key: "series-" + entry.key },
							h("path", {
								d: "M " + firstX + " " + baseline + " L " + coords + " L " + lastX + " " + baseline + " Z",
								className: "mr-area-fill",
								fill: "url(#mr-trend-area-" + index + ")",
							}),
							h("polyline", {
								points: entry.points.map((point) => xOfTime(point.at).toFixed(2) + "," + yOfScore(point.score).toFixed(2)).join(" "),
								fill: "none",
								stroke: seriesStroke(index),
								strokeWidth: 1.9,
								strokeLinejoin: "round",
								strokeLinecap: "round",
								strokeDasharray: seriesDash(index) || undefined,
								pathLength: dashed ? undefined : 1,
								className: dashed ? "mr-line-draw is-dashed" : "mr-line-draw",
								opacity: 0.9,
							}),
						);
					}),
					points.map((point) =>
						h(
							"g",
							{ key: "point-" + point.key },
							h("circle", {
								cx: point.x,
								cy: point.y,
								r: 8,
								fill: "transparent",
								className: "mr-point-hit",
								onMouseEnter: () => setHover(point),
								onMouseLeave: () => setHover(null),
								onFocus: () => setHover(point),
								onBlur: () => setHover(null),
								tabIndex: 0,
							}),
							h("circle", {
								cx: point.x,
								cy: point.y,
								r: 3.6,
								fill: seriesStroke(point.seriesIndex),
								stroke: "var(--dsw-alias-bg-layer-1)",
								strokeWidth: 1.2,
								className: "mr-point-dot",
								pointerEvents: "none",
							}),
						),
					),
				),
				hover === null
					? null
					: h(ChartTooltip, {
						left: (hover.x / width) * 100 + "%",
						top: (hover.y / height) * 100 + "%",
						title: hover.seriesLabel,
						value: tr("mr.ranking.trend.point", {
							series: hover.seriesLabel,
							time: formatClock(hover.at),
							score: formatNumber(hover.score, 2),
						}),
						meta: null,
					}),
				),
			);
		}

		function ParetoChart(props) {
			const tr = props.tr;
			const metric = props.metric;
			const data = buildParetoData(Array.isArray(props.combos) ? props.combos : [], metric, tr);
			const [hover, setHover] = React.useState(null);
			if (data.rows.length === 0) {
				return h("div", { className: "mr-chart-empty" }, tr("mr.ranking.pareto.empty"));
			}
			const width = 760;
			const height = 264;
			const margin = { left: 52, right: 18, top: 18, bottom: 40 };
			const plotWidth = width - margin.left - margin.right;
			const plotHeight = height - margin.top - margin.bottom;
			const maxX = data.maxX;
			const xOf = (value) => margin.left + (clamp(value, 0, maxX) / maxX) * plotWidth;
			const yOf = (score) => margin.top + (1 - clamp(score, 0, 150) / 150) * plotHeight;
			const xTicks = [0, maxX / 2, maxX];
			const yTicks = [0, 50, 100, 150];
			const formatX = (value) => (metric === "duration" ? formatNumber(value, 1) + " s" : formatUsd(value));
			const axisLabel = metric === "duration" ? tr("mr.ranking.pareto.axisDuration") : tr("mr.ranking.pareto.axisCost");
			const frontierPoints = data.frontier.map((row) => xOf(row.x) + "," + yOf(row.y)).join(" ");
			return h(
				"div",
				{ className: "mr-chart-shell" },
				h(
					"div",
					{ className: "mr-chart-canvas" },
					h(
					"svg",
					{
						className: "mr-chart",
						viewBox: "0 0 " + width + " " + height,
						role: "img",
						"aria-label": tr("mr.aria.pareto"),
					},
					h(
						"defs",
						null,
						h(
							"linearGradient",
							{ id: "mr-pareto-frontier", x1: "0", y1: "0", x2: "1", y2: "0" },
							h("stop", { offset: "0%", stopColor: "var(--mr-accent-a)", stopOpacity: 0.6 }),
							h("stop", { offset: "55%", stopColor: "var(--mr-accent-b)", stopOpacity: 0.95 }),
							h("stop", { offset: "100%", stopColor: "var(--mr-accent-c)", stopOpacity: 0.8 }),
						),
					),
					yTicks.map((score) =>
						h(
							"g",
							{ key: "py-" + score },
							h("line", {
								x1: margin.left,
								x2: margin.left + plotWidth,
								y1: yOf(score),
								y2: yOf(score),
								className: score === 0 ? "mr-axis-line" : "mr-grid-line",
							}),
							h(
								"text",
								{ x: margin.left - 8, y: yOf(score) + 3.5, textAnchor: "end", className: "mr-axis-text" },
								String(score),
							),
						),
					),
					xTicks.map((value, index) =>
						h(
							"g",
							{ key: "px-" + index },
							h("line", {
								x1: xOf(value),
								x2: xOf(value),
								y1: margin.top,
								y2: margin.top + plotHeight,
								className: "mr-grid-line",
							}),
							h(
								"text",
								{
									x: xOf(value),
									y: margin.top + plotHeight + 18,
									textAnchor: index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle",
									className: "mr-axis-text",
								},
								formatX(value),
							),
						),
					),
					h(
						"text",
						{ x: margin.left + plotWidth / 2, y: height - 6, textAnchor: "middle", className: "mr-axis-title" },
						axisLabel,
					),
					frontierPoints === ""
						? null
						: h("polyline", {
							points: frontierPoints,
							fill: "none",
							stroke: "url(#mr-pareto-frontier)",
							strokeWidth: 1.8,
							strokeDasharray: "5 4",
							className: "mr-pareto-frontier",
							opacity: 0.9,
						}),
					data.rows.map((row) =>
						h(
							"g",
							{ key: "pareto-" + row.key },
							h("circle", {
								cx: xOf(row.x),
								cy: yOf(row.y),
								r: row.y >= 130 ? 5.4 : 4.6,
								fill: "var(--mr-accent-a)",
								opacity: 0.9,
								stroke: "var(--dsw-alias-bg-layer-1)",
								strokeWidth: 1.2,
								className: "mr-pareto-dot",
								onMouseEnter: () => setHover(row),
								onMouseLeave: () => setHover(null),
								onFocus: () => setHover(row),
								onBlur: () => setHover(null),
								tabIndex: 0,
							}),
						),
					),
				),
				hover === null
					? null
					: h(ChartTooltip, {
						left: (xOf(hover.x) / width) * 100 + "%",
						top: (yOf(hover.y) / height) * 100 + "%",
						title: hover.label,
						value: tr("mr.ranking.pareto.point", {
							model: hover.label,
							score: formatNumber(hover.y, 2),
							metric: metric === "duration" ? formatMs(hover.x * 1000) : formatUsd(hover.x),
						}),
						meta: null,
					}),
				),
			);
		}

		// ── ranking ────────────────────────────────────────────────────────

		function RankingEmpty(props) {
			const tr = props.tr;
			const batches = Array.isArray(props.batches) ? props.batches : [];
			const runs = batches.reduce((sum, entry) => sum + (toFiniteNumber(entry.runCount, 0) ?? 0), 0);
			return h(
				"div",
				{ className: "mr-empty" },
				h(
					"div",
					{ className: "mr-empty-orbit", "aria-hidden": true },
					h(RadarIcon, { size: 46 }),
				),
				h("h2", { className: "mr-empty-title" }, tr("mr.ranking.emptyTitle")),
				h("p", { className: "mr-empty-body" }, tr("mr.ranking.emptyBody")),
				h(
					"div",
					{ className: "mr-task-grid" },
					TASKS.map((task) =>
						h(
							"div",
							{ className: "mr-task-card", key: task.id },
							h("div", { className: "mr-task-card-head" },
								h("span", { className: "mr-task-name" }, tr(task.nameKey)),
								h("span", { className: "mr-task-points" }, formatNumber(task.maxScore, 1)),
							),
							h("p", { className: "mr-task-desc" }, tr(task.descKey)),
						),
					),
				),
				h("div", { className: "mr-empty-stats" }, tr("mr.ranking.emptyStats", { batches: batches.length, runs })),
				h(
					"button",
					{ type: "button", className: "mr-btn is-primary", onClick: props.onStart },
					h(PlayIcon, { size: 13 }),
					tr("mr.ranking.emptyStart"),
				),
			);
		}

		function heatStyle(score, maxScore) {
		    const max = toFiniteNumber(maxScore, null);
		    const value = toFiniteNumber(score, null);
		    const ratio = max === null || max <= 0 || value === null ? 0 : clamp(value / max, 0, 1);
		    const tone = ratio < 0.5
		        ? "color-mix(in srgb, var(--dsw-alias-state-warn-primary) " + (ratio * 200).toFixed(1) + "%, var(--dsw-alias-state-error-primary))"
		        : "color-mix(in srgb, var(--dsw-alias-state-success-primary) " + ((ratio - 0.5) * 200).toFixed(1) + "%, var(--dsw-alias-state-warn-primary))";
		    const strength = 18 + ratio * 34;
		    return {
		        "--mr-heat": ratio,
		        background: "linear-gradient(135deg, color-mix(in srgb, " + tone + " " + strength.toFixed(1) + "%, var(--dsw-alias-bg-layer-1)), color-mix(in srgb, " + tone + " " + (strength * 0.68).toFixed(1) + "%, var(--dsw-alias-bg-layer-1)))",
		        boxShadow: ratio >= 0.78
		            ? "0 0 12px color-mix(in srgb, " + tone + " 26%, transparent), inset 0 0 0 1px color-mix(in srgb, " + tone + " 34%, transparent)"
		            : "inset 0 0 0 1px color-mix(in srgb, " + tone + " 12%, transparent)",
		    };
		}

		function scoreMeterStyle(score, maxScore) {
			const max = toFiniteNumber(maxScore, null);
			const value = toFiniteNumber(score, null);
			const ratio = max === null || max <= 0 || value === null ? 0 : clamp(value / max, 0, 1);
			const tone = ratio < 0.5
				? "color-mix(in srgb, var(--dsw-alias-state-warn-primary) " + (ratio * 200).toFixed(1) + "%, var(--dsw-alias-state-error-primary))"
				: "color-mix(in srgb, var(--dsw-alias-state-success-primary) " + ((ratio - 0.5) * 200).toFixed(1) + "%, var(--dsw-alias-state-warn-primary))";
			return {
				"--mr-heat": ratio.toFixed(3),
				"--mr-heat-tone": tone,
			};
		}

		// ── recommendation + overview ───────────────────────────────────────

		const RECOMMEND_WEIGHT_ORDER = ["quality", "speed", "cost", "stability"];
		const RECOMMEND_WEIGHTS_DEFAULT = Object.freeze({ quality: 0.45, speed: 0.2, cost: 0.2, stability: 0.15 });

		function recommendWeightsOf(raw) {
			const source = raw !== null && typeof raw === "object" ? raw : {};
			const weights = {};
			let sum = 0;
			for (const key of RECOMMEND_WEIGHT_ORDER) {
				const value = toFiniteNumber(source[key], null);
				weights[key] = value === null ? 0 : clamp(value, 0, 1);
				sum += weights[key];
			}
			if (sum <= 0) return { ...RECOMMEND_WEIGHTS_DEFAULT };
			const normalized = {};
			for (const key of RECOMMEND_WEIGHT_ORDER) normalized[key] = weights[key] / sum;
			return normalized;
		}

		/** 0 = worst, 100 = best among the provided values (ties share the first slot). */
		function recommendationPercentile(value, values, higherBetter) {
			const list = (Array.isArray(values) ? values : [])
				.filter((entry) => typeof entry === "number" && Number.isFinite(entry))
				.sort((left, right) => (higherBetter ? right - left : left - right));
			if (list.length <= 1) return 100;
			const index = list.findIndex((entry) => entry === value);
			if (index < 0) return 50;
			return Math.round(((list.length - 1 - index) / (list.length - 1)) * 100);
		}

		function recommendationRound(value) {
			const number = toFiniteNumber(value, null);
			return number === null ? null : Number(number.toFixed(1));
		}

		/**
		 * Composite recommendation across quality / speed / cost / stability.
		 * Quality is absolute (share of 150); the other dimensions are percentile
		 * ranks inside this batch so one outlier cannot flatten the scale.
		 */
		function buildRecommendation(batch, weightsRaw) {
			const weights = recommendWeightsOf(weightsRaw);
			const combos = Array.isArray(batch?.combos) ? batch.combos : [];
			const candidates = combos.filter(
				(combo) => combo !== null && typeof combo === "object" && combo.complete === true && toFiniteNumber(combo.total, null) !== null,
			);
			const retryByCombo = new Map();
			for (const run of Array.isArray(batch?.runs) ? batch.runs : []) {
				if (run === null || typeof run !== "object") continue;
				const autoRetries = Array.isArray(run.attempts)
					? run.attempts.filter((attempt) => attempt !== null && typeof attempt === "object" && attempt.kind !== "rerun").length
					: 0;
				retryByCombo.set(run.comboKey, (retryByCombo.get(run.comboKey) ?? 0) + autoRetries);
			}
			const empty = {
				ready: false,
				weights,
				items: [],
				alternatives: null,
				summary: { complete: 0, total: combos.length, medianDuration: null },
			};
			if (candidates.length === 0) return empty;
			const metrics = candidates.map((combo) => {
				const speed = speedMetricsOf(speedRecordOf(batch, combo.key));
				const cost = comboTotalCost(combo);
				const duration = toFiniteNumber(combo.durationMs, null);
				const retries = retryByCombo.get(combo.key) ?? 0;
				return {
					combo,
					quality: clamp((toFiniteNumber(combo.total, 0) / 150) * 100, 0, 100),
					total: toFiniteNumber(combo.total, 0),
					cost,
					duration,
					tps: speed.tps,
					ttft: speed.ttft,
					retries,
					isolationSuspect: combo.isolationSuspect === true,
					stability: clamp(100 - retries * 10 - (combo.isolationSuspect === true ? 15 : 0), 40, 100),
				};
			});
			const costValues = metrics.map((entry) => entry.cost).filter((value) => value !== null);
			const durationValues = metrics.map((entry) => entry.duration).filter((value) => value !== null);
			const tpsValues = metrics.map((entry) => entry.tps).filter((value) => value !== null);
			for (const entry of metrics) {
				entry.costScore = entry.cost === null ? 0 : recommendationPercentile(entry.cost, costValues, false);
				const durationScore = entry.duration === null ? 0 : recommendationPercentile(entry.duration, durationValues, false);
				const tpsScore = entry.tps === null ? null : recommendationPercentile(entry.tps, tpsValues, true);
				entry.speedScore = tpsScore === null ? durationScore : Math.round(durationScore * 0.5 + tpsScore * 0.5);
				entry.composite = recommendationRound(
					entry.quality * weights.quality
						+ entry.speedScore * weights.speed
						+ entry.costScore * weights.cost
						+ entry.stability * weights.stability,
				);
			}
			metrics.sort((left, right) => (
				(right.composite ?? 0) - (left.composite ?? 0)
					|| (right.total ?? 0) - (left.total ?? 0)
					|| (left.cost ?? Number.POSITIVE_INFINITY) - (right.cost ?? Number.POSITIVE_INFINITY)
			));
			const top = metrics[0];
			const qualitySorted = [...metrics].sort((left, right) => right.quality - left.quality);
			const durationSorted = metrics.filter((entry) => entry.duration !== null).sort((left, right) => left.duration - right.duration);
			const costSorted = metrics.filter((entry) => entry.cost !== null).sort((left, right) => left.cost - right.cost);
			const frontier = metrics
				.filter((entry) => entry.cost !== null)
				.filter((entry) => !metrics.some((other) => (
					other.cost !== null
						&& other.cost <= entry.cost
						&& other.quality >= entry.quality
						&& (other.cost < entry.cost || other.quality > entry.quality)
				)))
				.sort((left, right) => left.cost - right.cost);
			const medianDuration = (() => {
				const values = [...durationValues].sort((left, right) => left - right);
				if (values.length === 0) return null;
				const middle = Math.floor(values.length / 2);
				return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
			})();
			const topCostRank = top.cost === null ? null : costSorted.findIndex((entry) => entry.combo.key === top.combo.key) + 1;
			const topDurationRank = top.duration === null ? null : durationSorted.findIndex((entry) => entry.combo.key === top.combo.key) + 1;
			const topQualityRank = qualitySorted.findIndex((entry) => entry.combo.key === top.combo.key) + 1;
			const speedDeltaPct = top.duration === null || medianDuration === null || medianDuration <= 0
				? null
				: Math.round(((medianDuration - top.duration) / medianDuration) * 100);
			return {
				ready: true,
				weights,
				items: metrics,
				top,
				alternatives: {
					quality: qualitySorted[0] ?? null,
					value: frontier[0] ?? null,
					speed: durationSorted[0] ?? null,
				},
				summary: {
					complete: candidates.length,
					total: combos.length,
					medianDuration,
					topCostRank,
					topDurationRank,
					topQualityRank,
					costCount: costSorted.length,
					speedDeltaPct,
					lead: metrics.length > 1 ? recommendationRound((top.composite ?? 0) - (metrics[1].composite ?? 0)) : null,
					second: metrics[1] ?? null,
				},
			};
		}

		function recommendationReasons(tr, recommendation) {
			if (recommendation === null || recommendation.ready !== true || recommendation.top === undefined) return [];
			const top = recommendation.top;
			const summary = recommendation.summary;
			const reasons = [];
			reasons.push(
				summary.topQualityRank === 1
					? tr("mr.recommend.reason.qualityFirst", { score: formatNumber(top.total, 2) })
					: tr("mr.recommend.reason.qualityRank", { score: formatNumber(top.total, 2), rank: summary.topQualityRank }),
			);
			if (summary.topCostRank !== null) {
				reasons.push(tr("mr.recommend.reason.cost", {
					cost: formatUsd(top.cost),
					rank: summary.topCostRank,
					count: summary.costCount,
				}));
			}
			if (summary.speedDeltaPct !== null) {
				reasons.push(
					summary.speedDeltaPct >= 0
						? tr("mr.recommend.reason.speed", { duration: formatMs(top.duration), pct: summary.speedDeltaPct })
						: tr("mr.recommend.reason.speedSlow", { duration: formatMs(top.duration), pct: Math.abs(summary.speedDeltaPct) }),
				);
			}
			reasons.push(
				top.retries > 0
					? tr("mr.recommend.reason.stabilityRetry", { count: top.retries })
					: tr("mr.recommend.reason.stabilityClean"),
			);
			if (summary.lead !== null && summary.lead > 0) {
				reasons.push(tr("mr.recommend.reason.lead", { score: formatNumber(top.composite, 1), delta: formatNumber(summary.lead, 1) }));
			}
			return reasons.slice(0, 4);
		}

		function SectionNo(props) {
			return h("span", { className: "mr-section-no mr-mono", "aria-hidden": true }, String(props.no).padStart(2, "0"));
		}

		function OverviewTaskBars(props) {
			const tr = props.tr;
			const combo = props.combo;
			if (combo === null || combo === undefined) return null;
			return h(
				"div",
				{ className: "mr-ov-tasks" },
				TASKS.map((task) => {
					const score = toFiniteNumber(combo.scores?.[task.id], null);
					const pct = score === null ? 0 : clamp((score / task.maxScore) * 100, 0, 100);
					return h(
						"div",
						{ className: "mr-ov-task-row", key: task.id },
						h("span", { className: "mr-ov-task-name" }, taskName(tr, task.id)),
						h("span", { className: "mr-ov-task-track" }, h("span", { className: "mr-ov-task-fill", style: { width: pct + "%" } })),
						h(
							"span",
							{ className: "mr-ov-task-score mr-mono" },
							score === null ? "—" : formatNumber(score, 1) + "/" + (task.maxScore % 1 === 0 ? String(task.maxScore) : formatNumber(task.maxScore, 1)),
						),
					);
				}),
			);
		}

		function RecommendDimensionBar(props) {
			const tr = props.tr;
			const score = props.score === null ? 0 : clamp(props.score, 0, 100);
			return h(
				"div",
				{ className: "mr-rc-dim" },
				h(
					"div",
					{ className: "mr-rc-dim-head" },
					h("span", { className: "mr-rc-dim-label" }, tr(RECOMMEND_DIM_KEYS[props.id] ?? props.id)),
					h("span", { className: "mr-rc-dim-weight" }, tr("mr.recommend.weight", { pct: Math.round(props.weight * 100) })),
					h("span", { className: "mr-rc-dim-score mr-mono" }, formatInt(Math.round(score))),
				),
				h("span", { className: "mr-rc-dim-track" }, h("span", { className: "mr-rc-dim-fill", style: { width: score + "%" } })),
			);
		}

		function RecommendCard(props) {
			const tr = props.tr;
			const recommendation = props.recommendation;
			const onOpenModel = typeof props.onOpenModel === "function" ? props.onOpenModel : null;
			const onStart = typeof props.onStart === "function" ? props.onStart : null;
			if (recommendation === null || recommendation.ready !== true) {
				return h(
					"div",
					{ className: "mr-rc-card is-empty" },
					h(
						"div",
						{ className: "mr-rc-lead" },
						h("div", { className: "mr-rc-kicker" }, h(SparkIcon, { size: 12 }), tr("mr.recommend.title")),
						h("div", { className: "mr-rc-empty-title" }, tr("mr.recommend.notReady")),
						h("div", { className: "mr-rc-empty-sub" }, tr("mr.recommend.notReadySub")),
					),
					onStart === null
						? null
						: h(
							"div",
							{ className: "mr-rc-side" },
							h(
								"button",
								{ type: "button", className: "mr-btn is-primary mr-btn-small", onClick: onStart },
								h(PlayIcon, { size: 11 }),
								tr("mr.page.start"),
							),
						),
				);
			}
			const top = recommendation.top;
			const combo = top.combo;
			const modelName = combo.modelName ?? combo.model ?? "—";
			const effort = effortLabel(tr, combo.reasoningEffort, combo.effortName);
			const reasons = recommendationReasons(tr, recommendation);
			const alternatives = [];
			const pushAlternative = (key, entry) => {
				if (entry === null || entry === undefined) return;
				if (entry.combo.key === combo.key) return;
				alternatives.push({ key, entry });
			};
			pushAlternative("quality", recommendation.alternatives?.quality ?? null);
			pushAlternative("value", recommendation.alternatives?.value ?? null);
			pushAlternative("speed", recommendation.alternatives?.speed ?? null);
			const openTop = onOpenModel === null ? null : () => onOpenModel(combo.key);
			const scoreLine = h(
				"span",
				{ className: "mr-rc-main" },
				h("span", { className: "mr-rc-score mr-mono" }, formatNumber(top.composite, 1)),
				h("span", { className: "mr-rc-score-max" }, tr("mr.recommend.composite")),
			);
			const modelLine = h(
				"span",
				{ className: "mr-rc-model" },
				h("span", { className: "mr-rc-model-name" }, modelName),
				h(EffortPill, { tr, entry: combo }),
				h("span", { className: "mr-rc-provider" }, combo.providerName ?? combo.provider ?? ""),
			);
			const leadProps = onOpenModel === null
				? { className: "mr-rc-lead" }
				: {
					className: "mr-rc-lead is-clickable",
					role: "button",
					tabIndex: 0,
					title: tr("mr.recommend.openModel", { model: modelName, effort }),
					onClick: openTop,
					onKeyDown: (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							openTop();
						}
					},
				};
			return h(
				"div",
				{ className: "mr-rc-card" },
				h(
					"div",
					leadProps,
					h(
						"div",
						{ className: "mr-rc-head" },
						h("div", { className: "mr-rc-kicker" }, h(SparkIcon, { size: 12 }), tr("mr.recommend.title")),
						h("span", { className: "mr-rc-badge" }, tr("mr.recommend.badge")),
					),
					scoreLine,
					modelLine,
				),
				h(
					"div",
					{ className: "mr-rc-dims" },
					RECOMMEND_WEIGHT_ORDER.map((key) => h(RecommendDimensionBar, {
						key,
						tr,
						id: key,
						weight: recommendation.weights[key] ?? 0,
						score: key === "quality"
							? top.quality
							: key === "speed"
								? top.speedScore
								: key === "cost"
									? top.costScore
									: top.stability,
					})),
				),
				h(
					"div",
					{ className: "mr-rc-side" },
					reasons.length === 0
						? null
						: h(
							"ul",
							{ className: "mr-rc-reasons" },
							reasons.map((reason, index) => h(
								"li",
								{ key: "rc-reason-" + index },
								h(CheckIcon, { size: 11 }),
								h("span", null, reason),
							)),
						),
					alternatives.length === 0
						? null
						: h(
							"div",
							{ className: "mr-rc-alts" },
							h("span", { className: "mr-rc-alts-label" }, tr("mr.recommend.alternatives")),
							alternatives.map(({ key, entry }) => h(
								"button",
								{
									type: "button",
									key,
									className: "mr-rc-alt",
									title: tr("mr.recommend.openModel", {
										model: entry.combo.modelName ?? entry.combo.model,
										effort: effortLabel(tr, entry.combo.reasoningEffort, entry.combo.effortName),
									}),
									onClick: () => (onOpenModel === null ? undefined : onOpenModel(entry.combo.key)),
								},
								h("span", { className: "mr-rc-alt-label" }, tr(RECOMMEND_ALT_KEYS[key] ?? key)),
								h("span", { className: "mr-rc-alt-name" }, entry.combo.modelName ?? entry.combo.model ?? "—"),
								h("span", { className: "mr-rc-alt-effort" }, effortLabel(tr, entry.combo.reasoningEffort, entry.combo.effortName)),
							)),
						),
					h("div", { className: "mr-rc-hint" }, tr("mr.recommend.weightsHint")),
				),
			);
		}

		function OverviewRankRow(props) {
			const tr = props.tr;
			const combo = props.combo;
			const speed = props.speed ?? { tps: null, ttft: null };
			const modelName = combo.modelName ?? combo.model ?? "—";
			const effort = effortLabel(tr, combo.reasoningEffort, combo.effortName);
			const total = toFiniteNumber(combo.total, null);
			const pct = total === null ? 0 : clamp((total / 150) * 100, 0, 100);
			const label = tr("mr.overview.openModel", { model: modelName, effort });
			return h(
				"button",
				{
					type: "button",
					className: "mr-ov-row" + (props.incomplete ? " is-incomplete" : ""),
					title: label,
					"aria-label": label,
					onClick: () => props.onOpen(combo.key),
				},
				h("span", { className: "mr-ov-rankno mr-mono" }, props.rank === null ? "—" : String(props.rank)),
				h(
					"span",
					{ className: "mr-ov-row-main" },
					h(
						"span",
						{ className: "mr-ov-row-title" },
						h("span", { className: "mr-ov-model" }, modelName),
						h("span", { className: "mr-ov-effort", style: effortStyle(combo) }, effort),
						props.incomplete ? h("span", { className: "mr-ov-badge" }, tr("mr.overview.incompleteBadge")) : null,
					),
					h("span", { className: "mr-ov-track" }, h("span", { className: "mr-ov-fill", style: { width: pct + "%" } })),
				),
				h(
					"span",
					{ className: "mr-ov-row-score" },
					h("span", { className: "mr-ov-score mr-mono" }, total === null ? "—" : formatNumber(total, 2)),
					props.delta === null || props.delta === undefined
						? null
						: h("span", { className: "mr-delta-chip " + deltaTone(props.delta) }, formatSignedNumber(props.delta, 1)),
				),
				h(
					"span",
					{ className: "mr-ov-row-meta mr-mono" },
					h("span", null, comboTotalCost(combo) === null ? "—" : formatUsd(comboTotalCost(combo))),
					h("span", null, combo.durationMs === null || combo.durationMs === undefined ? "—" : formatMs(combo.durationMs)),
				),
			);
		}

		function OverviewPanel(props) {
			const tr = props.tr;
			const batch = props.batch;
			const complete = Array.isArray(props.complete) ? props.complete : [];
			const incomplete = Array.isArray(props.incomplete) ? props.incomplete : [];
			const previousCombos = props.previousCombos instanceof Map ? props.previousCombos : new Map();
			const recommendation = props.recommendation ?? null;
			const [expanded, setExpanded] = React.useState(false);
			const [showIncomplete, setShowIncomplete] = React.useState(false);
			const rankMap = React.useMemo(() => {
				const map = new Map();
				complete.forEach((combo, index) => map.set(combo.key, index + 1));
				return map;
			}, [complete]);
			const best = complete[0] ?? null;
			const bestScore = useCountUp(best === null ? null : best.total, 650);
			const bestSpeed = best === null ? { tps: null, ttft: null } : speedMetricsOf(speedRecordOf(batch, best.key));
			const bestDelta = (() => {
				if (best === null) return null;
				const previous = previousCombos.get(best.key);
				const previousTotal = previous === undefined ? null : toFiniteNumber(previous.total, null);
				if (previousTotal === null) return null;
				return (toFiniteNumber(best.total, 0) ?? 0) - previousTotal;
			})();
			const deltaFor = (combo) => {
				const previous = previousCombos.get(combo.key);
				if (previous === undefined) return null;
				const current = toFiniteNumber(combo.total, null);
				const previousTotal = toFiniteNumber(previous.total, null);
				if (current === null || previousTotal === null) return null;
				return current - previousTotal;
			};
			const rankLabel = best === null ? null : h(
				"span",
				{ className: "mr-ov-rank-chip mr-mono" },
				tr("mr.overview.rankChip", { rank: 1, total: complete.length }),
			);
			const visibleRows = expanded ? complete : complete.slice(0, 7);
			const canExpand = complete.length > 7;
			const openModel = (comboKey) => {
				if (typeof props.onOpenModel === "function") props.onOpenModel(comboKey);
			};
			return h(
				"section",
				{ className: "mr-panel mr-ov-panel" },
				h(
					"div",
					{ className: "mr-panel-head mr-ov-head" },
					h(
						"div",
						{ className: "mr-panel-head-main" },
						h(
							"h2",
							{ className: "mr-panel-title" },
							h(SectionNo, { no: 1 }),
							tr("mr.overview.title"),
						),
						h(
							"div",
							{ className: "mr-panel-sub" },
							tr("mr.overview.subtitle", { id: batch.id, time: formatClock(batch.createdAt) }),
						),
					),
					h(
						"div",
						{ className: "mr-panel-head-right" },
						h(Tag, { status: batch.status }, statusLabel(tr, batch.status)),
						typeof props.onOpenBatch === "function"
							? h(
								"button",
								{ type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: () => props.onOpenBatch(null) },
								tr("mr.overview.viewBatch"),
							)
							: null,
						props.resumable === true
							? h(
								"button",
								{
									type: "button",
									className: "mr-btn is-primary mr-btn-small",
									disabled: props.resumingId === batch.id,
									onClick: () => (typeof props.onResume === "function" ? props.onResume(batch.id) : undefined),
								},
								h(PlayIcon, { size: 11 }),
								resumeButtonLabel(tr, props.resumingId === batch.id),
							)
							: null,
					),
				),
				h(
					"div",
					{ className: "mr-ov-grid" },
					h(
						"div",
						{ className: "mr-ov-best" },
						h("div", { className: "mr-ov-best-label" }, tr("mr.overview.bestLabel")),
						h(
							"div",
							{ className: "mr-ov-best-score mr-mono" + (best === null ? " is-empty" : "") },
							h("span", null, best === null || bestScore === null ? "—" : formatNumber(bestScore, 2)),
							best === null ? null : h("span", { className: "mr-ov-best-max" }, "/ 150"),
						),
						best === null
							? h("div", { className: "mr-muted" }, tr("mr.overview.bestNoComplete"))
							: h(
								React.Fragment,
								null,
								h(
									"div",
									{ className: "mr-ov-best-model" },
									h("span", { className: "mr-model-strong" }, best.modelName ?? best.model ?? "—"),
									h("span", { className: "mr-selection-dot" }, " · "),
									h(EffortPill, { tr, entry: best }),
								),
								h(
									"div",
									{ className: "mr-ov-best-tags" },
									h("span", { className: "mr-ov-best-provider" }, best.providerName ?? best.provider ?? "—"),
									bestDelta === null
										? null
										: h(
											"span",
											{ className: "mr-delta-chip " + deltaTone(bestDelta), title: tr("mr.overview.deltaTitle", { delta: formatSignedNumber(bestDelta, 1) }) },
											tr("mr.overview.deltaChip", { delta: formatSignedNumber(bestDelta, 1) }),
										),
								),
								h(
									"div",
									{ className: "mr-ov-best-meta mr-mono" },
									h("span", { title: tr("mr.overview.cost") }, formatUsd(comboTotalCost(best))),
									h("span", { title: tr("mr.overview.duration") }, formatMs(best.durationMs)),
									h("span", { title: tr("mr.overview.tps") }, "TPS " + (bestSpeed.tps === null ? "—" : formatNumber(bestSpeed.tps, 1))),
									h("span", { title: tr("mr.overview.ttft") }, "TTFT " + (bestSpeed.ttft === null ? "—" : formatMs(bestSpeed.ttft))),
								),
								h("div", { className: "mr-ov-tasks-label" }, tr("mr.overview.taskBreakdown")),
								h(OverviewTaskBars, { tr, combo: best }),
								h(
									"div",
									{ className: "mr-ov-best-foot" },
									rankLabel,
									typeof props.onOpenBest === "function"
										? h(
											"button",
											{
												type: "button",
												className: "mr-btn is-ghost mr-btn-small",
												onClick: () => props.onOpenBest(best.key),
											},
											h(EyeIcon, { size: 11 }),
											tr("mr.overview.openDetail"),
										)
										: null,
								),
							),
					),
					h(
						"div",
						{ className: "mr-ov-rank" },
						h(
							"div",
							{ className: "mr-ov-rank-head" },
							h("span", { className: "mr-ov-rank-title" }, tr("mr.overview.rankingTitle")),
							h(
								"span",
								{ className: "mr-ov-rank-meta" },
								tr("mr.overview.rankingMeta", { complete: complete.length, extra: incomplete.length > 0 ? tr("mr.overview.rankingMetaIncomplete", { count: incomplete.length }) : "" }),
							),
						),
						complete.length === 0
							? h("div", { className: "mr-muted mr-ov-rank-empty" }, tr("mr.overview.bestNoComplete"))
							: h(
								"div",
								{ className: "mr-ov-rank-list" },
								visibleRows.map((combo) => h(OverviewRankRow, {
									key: combo.key,
									tr,
									combo,
									rank: rankMap.get(combo.key) ?? null,
									delta: deltaFor(combo),
									speed: speedMetricsOf(speedRecordOf(batch, combo.key)),
									onOpen: openModel,
								})),
							),
						showIncomplete && incomplete.length > 0
							? h(
								React.Fragment,
								null,
								h("div", { className: "mr-ov-rank-sep" }, tr("mr.overview.incompleteNote")),
								incomplete.map((combo) => h(OverviewRankRow, {
									key: combo.key,
									tr,
									combo,
									rank: null,
									delta: null,
									incomplete: true,
									speed: speedMetricsOf(speedRecordOf(batch, combo.key)),
									onOpen: openModel,
								})),
							)
							: null,
						h(
							"div",
							{ className: "mr-ov-rank-foot" },
							canExpand
								? h(
									"button",
									{ type: "button", className: "mr-ov-more", onClick: () => setExpanded((current) => !current) },
									expanded ? tr("mr.overview.showLess") : tr("mr.overview.showAll", { count: complete.length }),
								)
								: null,
							incomplete.length > 0
								? h(
									"button",
									{ type: "button", className: "mr-ov-more", onClick: () => setShowIncomplete((current) => !current) },
									showIncomplete ? tr("mr.overview.hideIncomplete") : tr("mr.overview.incompleteToggle", { count: incomplete.length }),
								)
								: null,
						),
					),
					h(RecommendCard, {
						tr,
						recommendation,
						onStart: props.onStart,
						onOpenModel: openModel,
					}),
				),
			);
		}

		function IQMatrix(props) {
		    const tr = props.tr;
		    const details = Array.isArray(props.details) ? props.details : [];
		    const [taskTab, setTaskTab] = React.useState("total");
		    const matrix = React.useMemo(() => buildIQMatrix(details, tr), [details, tr]);
		    const tabs = [
		        { id: "total", label: tr("mr.matrix.total"), maxScore: 150 },
		        ...TASKS.map((task) => ({ id: task.id, label: tr(task.nameKey), maxScore: task.maxScore })),
		    ];
		    const selected = tabs.find((tab) => tab.id === taskTab) ?? tabs[0];
		    const version = matrix.taskVersion === null && matrix.rubricVersion === null
		        ? null
		        : tr("mr.matrix.version", {
		            task: matrix.taskVersion ?? "—",
		            rubric: matrix.rubricVersion ?? "—",
		        });
		    const cellValue = (row, column) => {
		        const effort = row.efforts.find((entry) => entry.key === column.key) ?? null;
		        if (effort === null) return { effort, value: null, maxScore: selected.maxScore };
		        if (selected.id === "total") {
		            return {
		                effort,
		                value: effort.latestTotal === null ? null : effort.latestTotal.total,
		                maxScore: 150,
		                batchId: effort.latestTotal?.batchId ?? effort.batchId,
		                createdAt: effort.latestTotal?.createdAt ?? effort.createdAt,
		                status: effort.latestTotal?.status ?? effort.status,
		                comboKey: effort.comboKey,
		            };
		        }
		        const cell = effort.cells[selected.id] ?? null;
		        return {
		            effort,
		            value: cell?.score ?? null,
		            maxScore: cell?.maxScore ?? selected.maxScore,
		            batchId: cell?.batchId ?? effort.batchId,
		            createdAt: cell?.createdAt ?? effort.createdAt,
		            status: cell?.status ?? effort.status,
		            comboKey: cell?.comboKey ?? effort.comboKey,
		        };
		    };
		    return h(
		        "section",
		        { className: "mr-panel mr-matrix-panel" },
		        h(
		            "div",
		            { className: "mr-panel-head" },
		            h(
		                "div",
		                null,
		                h("h2", { className: "mr-panel-title" }, h(SectionNo, { no: 2 }), tr("mr.matrix.title")),
		                h("div", { className: "mr-panel-sub" }, tr("mr.matrix.subtitle")),
		                version === null ? null : h("div", { className: "mr-panel-sub mr-mono" }, version),
		            ),
		        ),
		        matrix.rows.length === 0
		            ? h(
		                "div",
		                { className: "mr-empty mr-empty-compact mr-iq-empty" },
		                h("h2", { className: "mr-empty-title" }, tr("mr.iq.emptyTitle")),
		                h("p", { className: "mr-empty-body" }, tr("mr.matrix.noData")),
		                h(
		                    "button",
		                    { type: "button", className: "mr-btn is-primary", onClick: props.onStart },
		                    h(PlayIcon, { size: 13 }),
		                    tr("mr.ranking.emptyStart"),
		                ),
		            )
		            : h(
		                React.Fragment,
		                null,
		                h(
		                    "div",
		                    { className: "mr-iq-task-tabs", role: "tablist", "aria-label": tr("mr.matrix.title") },
		                    tabs.map((tab) =>
		                        h(
		                            "button",
		                            {
		                                type: "button",
		                                key: tab.id,
		                                role: "tab",
		                                "aria-selected": selected.id === tab.id,
		                                className: "mr-iq-task-tab" + (selected.id === tab.id ? " is-active" : ""),
		                                onClick: () => setTaskTab(tab.id),
		                            },
		                            h("span", null, tab.label),
		                            tab.id === "total" ? null : h("span", { className: "mr-iq-task-max mr-mono" }, formatNumber(tab.maxScore, 1)),
		                        ),
		                    ),
		                ),
		                h(
		                    "div",
		                    { className: "mr-matrix-scroll" },
		                    h(
		                        "table",
		                        { className: "mr-matrix" },
		                        h(
		                            "thead",
		                            null,
		                            h(
		                                "tr",
		                                null,
		                                h("th", { scope: "col", className: "mr-matrix-model-head" }, tr("mr.matrix.model")),
		                                matrix.columns.map((column) =>
		                                    h("th", { scope: "col", key: column.key, className: "mr-matrix-effort-head", style: effortStyle(column) }, column.label),
		                                ),
		                            ),
		                        ),
		                        h(
		                            "tbody",
		                            null,
		                            matrix.rows.map((row) =>
		                                h(
		                                    "tr",
		                                    { key: row.key },
		                                    h(
		                                        "th",
		                                        { scope: "row", className: "mr-matrix-model-cell" },
		                                        h("span", { className: "mr-matrix-model-name" }, row.modelName),
		                                        h("span", { className: "mr-matrix-provider" }, row.providerName),
		                                    ),
		                                    matrix.columns.map((column) => {
		                                        const cell = cellValue(row, column);
		                                        const title = cell.value === null || cell.value === undefined
		                                            ? tr("mr.matrix.missingTitle")
		                                            : tr("mr.matrix.cellTitle", {
		                                                batch: cell.batchId ?? "—",
		                                                status: statusLabel(tr, cell.status),
		                                                time: formatClock(cell.createdAt),
		                                                score: formatNumber(cell.value, 2),
		                                                max: formatNumber(cell.maxScore, 1),
		                                            });
		                                        if (cell.value === null || cell.value === undefined) {
		                                            return h(
		                                                "td",
		                                                { key: column.key, className: "mr-matrix-td" },
		                                                h("span", { className: "mr-matrix-missing", title }, "—"),
		                                            );
		                                        }
		                                        return h(
		                                            "td",
		                                            { key: column.key, className: "mr-matrix-td" },
		                                            h(
		                                                "button",
		                                                {
		                                                    type: "button",
		                                                    className: "mr-matrix-cell mr-mono",
		                                                    style: heatStyle(cell.value, cell.maxScore),
		                                                    title,
		                                                    "aria-label": tr("mr.matrix.open", { model: row.modelName, effort: column.label }),
		                                                    onClick: () => {
		                                                        if (typeof props.onOpenModel === "function") {
		                                                            props.onOpenModel(cell.batchId, cell.comboKey, selected.id === "total" ? null : selected.id);
		                                                        } else if (typeof props.onOpenBatch === "function") {
		                                                            props.onOpenBatch(cell.batchId, cell.comboKey);
		                                                        }
		                                                    },
		                                                },
		                                                formatNumber(cell.value, 2),
		                                            ),
		                                        );
		                                    }),
		                                ),
		                            ),
		                        ),
		                    ),
		                ),
		                h(
		                    "div",
		                    { className: "mr-matrix-legend" },
		                    h("span", { className: "mr-matrix-legend-title" }, tr("mr.matrix.legend")),
		                    h("span", { className: "mr-matrix-legend-label" }, tr("mr.matrix.legendLow")),
		                    h("span", { className: "mr-matrix-legend-bar", "aria-hidden": true }),
		                    h("span", { className: "mr-matrix-legend-label" }, tr("mr.matrix.legendHigh")),
		                ),
		            ),
		    );
		}

		function LatestBatchTable(props) {
		    const tr = props.tr;
		    const batch = props.batch;
		    const combos = Array.isArray(props.combos) ? props.combos : [];
		    const [open, setOpen] = React.useState(() => readStoredFlag(LATEST_TABLE_OPEN_KEY, false));
		    const [sort, setSort] = React.useState({ key: "rank", dir: "asc" });
		    const tableScrollRef = React.useRef(null);
		    const [tableScroll, setTableScroll] = React.useState({ overflow: false, atEnd: false });
		    const measureTableScroll = React.useCallback(() => {
		        const element = tableScrollRef.current;
		        if (element === null) return;
		        const overflow = element.scrollWidth > element.clientWidth + 1;
		        const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
		        setTableScroll((current) => (
		            current.overflow === overflow && current.atEnd === atEnd ? current : { overflow, atEnd }
		        ));
		    }, []);
		    React.useEffect(() => {
		        if (!open) return undefined;
		        measureTableScroll();
		        const element = tableScrollRef.current;
		        if (element === null) return undefined;
		        element.addEventListener("scroll", measureTableScroll, { passive: true });
		        let observer = null;
		        if (typeof ResizeObserver === "function") {
		            observer = new ResizeObserver(measureTableScroll);
		            observer.observe(element);
		        }
		        window.addEventListener("resize", measureTableScroll);
		        return () => {
		            element.removeEventListener("scroll", measureTableScroll);
		            if (observer !== null) observer.disconnect();
		            window.removeEventListener("resize", measureTableScroll);
		        };
		    }, [open, combos.length, measureTableScroll]);
		    const showTableScrollHint = tableScroll.overflow && !tableScroll.atEnd;
		    const toggleOpen = () => setOpen((current) => {
		        const next = !current;
		        writeStoredFlag(LATEST_TABLE_OPEN_KEY, next);
		        return next;
		    });
		    const ranks = rankMapOf(combos);
		    const speedOf = (combo) => speedMetricsOf(speedRecordOf(batch, combo.key));
		    const comparatorValue = (combo) => {
		        if (sort.key === "rank") return ranks.get(combo.key) ?? 999;
		        if (sort.key === "tps") return speedOf(combo).tps ?? -1;
		        if (sort.key === "ttft") return speedOf(combo).ttft ?? -1;
		        return comboSortValue(combo, sort.key);
		    };
		    const sortedCombos = [...combos].sort((left, right) => {
		        const a = comparatorValue(left);
		        const b = comparatorValue(right);
		        if (typeof a === "string" || typeof b === "string") {
		            return String(a).localeCompare(String(b)) * (sort.dir === "asc" ? 1 : -1);
		        }
		        if (a === b) return String(left.key).localeCompare(String(right.key));
		        return (a - b) * (sort.dir === "asc" ? 1 : -1);
		    });
		    const toggleSort = (key) => {
		        setSort((current) => (
		            current.key === key
		                ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
		                : { key, dir: key === "model" ? "asc" : "desc" }
		        ));
		    };
		    const sortHeader = (key, label, extraClass) =>
		        h(
		            "th",
		            { key, className: extraClass ?? "", "aria-sort": sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none" },
		            h(
		                "button",
		                {
		                    type: "button",
		                    className: "mr-sort-btn" + (sort.key === key ? " is-active" : ""),
		                    onClick: () => toggleSort(key),
		                    title: tr("mr.aria.sort", { column: label }),
		                    "aria-label": tr("mr.aria.sort", { column: label }),
		                },
		                label,
		                sort.key === key ? h("span", { className: "mr-sort-arrow", "aria-hidden": true }, sort.dir === "asc" ? "↑" : "↓") : null,
		            ),
		        );
		    const openBatch = (comboKey) => props.onOpenBatch(batch.id, comboKey);
		    const rowTime = formatClock(batch.createdAt);
		    const resumable = typeof props.onResume === "function" && isResumableBatch(batch) && props.running !== true;
		    const resuming = props.resumingId === batch.id;
		    const tableNote = batch.status === "running"
		        ? tr("mr.ranking.runningNote")
		        : batch.status === "interrupted"
		            ? tr("mr.status.interruptedHint")
		            : batch.status !== "done" && EXCLUDED_TREND_STATUSES.has(batch.status)
		                ? tr("mr.ranking.incompleteNote", { status: statusLabel(tr, batch.status) })
		                : null;
		    return h(
		        "section",
		        { className: "mr-panel mr-latest-panel" },
		        h(
		            "div",
		            { className: "mr-panel-head" },
		            h(
		                "div",
		                null,
		                h("h2", { className: "mr-panel-title" }, h(SectionNo, { no: 6 }), tr("mr.ranking.latestTableTitle")),
		                h(
		                    "div",
		                    { className: "mr-panel-sub" },
		                    tr("mr.ranking.batchMeta", { id: batch.id, time: rowTime }) + " · " + tr("mr.ranking.tableCount", { count: combos.length }),
		                ),
		            ),
		            h(
		                "div",
		                { className: "mr-panel-head-right" },
		                resumable
		                    ? h(
		                        "button",
		                        {
		                            type: "button",
		                            className: "mr-btn is-primary mr-btn-small",
		                            disabled: resuming,
		                            "aria-label": tr("mr.aria.resume", { id: batch.id }),
		                            onClick: () => props.onResume(batch.id),
		                        },
		                        h(PlayIcon, { size: 11 }),
		                        resumeButtonLabel(tr, resuming),
		                    )
		                    : null,
		                typeof props.onRerun === "function" && batch.rerunnable !== false && batch.status !== "running" && props.running !== true
		                    ? h(
		                        "button",
		                        {
		                            type: "button",
		                            className: "mr-btn is-ghost mr-btn-small",
		                            title: tr("mr.detail.rerunHint"),
		                            onClick: () => props.onRerun(batch.id, null),
		                        },
		                        h(PlayIcon, { size: 11 }),
		                        tr("mr.detail.rerunBatch"),
		                    )
		                    : null,
		                h(Tag, { status: batch.status }, statusLabel(tr, batch.status)),
		                h(
		                    "button",
		                    {
		                        type: "button",
		                        className: "mr-btn is-ghost mr-btn-small",
		                        onClick: toggleOpen,
		                        "aria-expanded": open,
		                    },
		                    open ? tr("mr.ranking.collapse") : tr("mr.ranking.expand"),
		                    h("span", { className: "mr-collapse-caret" + (open ? " is-open" : ""), "aria-hidden": true }, h(ChevronIcon, { size: 12 })),
		                ),
		            ),
		        ),
		        open
		            ? h(
		                React.Fragment,
		                null,
		                tableNote === null ? null : h("div", { className: "mr-inline-note" }, tableNote),
		                combos.length === 0
		                    ? h("div", { className: "mr-muted" }, tr("mr.detail.noCombos"))
		                    : h(
		                        React.Fragment,
		                        null,
		                        h(
		                            "div",
		                            {
		                                className: "mr-table-scroll-wrap"
		                                    + (showTableScrollHint ? " has-overflow" : "")
		                                    + (tableScroll.overflow && tableScroll.atEnd ? " is-end" : ""),
		                            },
		                            h("div", { className: "mr-table-scroll-tip" }, tr("mr.ranking.tableScrollHint")),
		                            h(
		                                "div",
		                                { className: "mr-table-scroll", ref: tableScrollRef },
		                                h(
		                                    "table",
		                                    { className: "mr-table is-ranking" },
		                            h(
		                                "thead",
		                                null,
		                                h(
		                                    "tr",
		                                    { className: "mr-table-group-row" },
		                                    h("th", { colSpan: 7, scope: "colgroup", className: "mr-table-group is-quality" }, tr("mr.ranking.group.quality")),
		                                    h("th", { colSpan: 3, scope: "colgroup", className: "mr-table-group is-performance" }, tr("mr.ranking.group.performance")),
		                                    h("th", { colSpan: 1, scope: "colgroup", className: "mr-table-group is-cost" }, tr("mr.ranking.group.cost")),
		                                ),
		                                h(
		                                    "tr",
		                                    null,
		                                    sortHeader("rank", tr("mr.ranking.col.rank"), "is-rank"),
		                                    sortHeader("model", tr("mr.ranking.col.model"), "is-model"),
		                                    sortHeader("total", tr("mr.ranking.col.total"), "is-num"),
		                                    sortHeader("candy", tr("mr.ranking.col.candy"), "is-num"),
		                                    sortHeader("pompeii", tr("mr.ranking.col.pompeii"), "is-num"),
		                                    sortHeader("pelican", tr("mr.ranking.col.pelican"), "is-num"),
		                                    sortHeader("qin", tr("mr.ranking.col.qin"), "is-num"),
		                                    sortHeader("duration", tr("mr.ranking.col.duration"), "is-num"),
		                                    sortHeader("tps", tr("mr.perf.aggregate.tps"), "is-num"),
		                                    sortHeader("ttft", tr("mr.perf.aggregate.ttft"), "is-num"),
		                                    sortHeader("cost", tr("mr.ranking.col.cost"), "is-num"),
		                                ),
		                            ),
		                            h(
		                                "tbody",
		                                null,
		                                sortedCombos.map((combo, rowIndex) => {
		                                    const generationCost = toFiniteNumber(combo.costUsd, null);
		                                    const judgeCost = toFiniteNumber(combo.judgeCostUsd, null);
		                                    const totalCost = comboTotalCost(combo);
		                                    const rowLabel = tr("mr.ranking.rowOpen", { model: combo.modelName ?? combo.model });
		                                    return h(
		                                        "tr",
		                                        {
		                                            key: combo.key,
		                                            className: "mr-row-click mr-table-row-in",
		                                            style: { animationDelay: (rowIndex * 34) + "ms" },
		                                            tabIndex: 0,
		                                            role: "button",
		                                            "aria-label": tr("mr.aria.row", { model: modelLabel(tr, combo) }),
		                                            onClick: () => openBatch(combo.key),
		                                            onKeyDown: (event) => {
		                                                if (event.key === "Enter" || event.key === " ") {
		                                                    event.preventDefault();
		                                                    openBatch(combo.key);
		                                                }
		                                            },
		                                            title: rowLabel,
		                                        },
		                                        h("td", { className: "is-rank mr-mono" }, ranks.get(combo.key) ?? "—"),
		                                        h(
		                                            "td",
		                                            { className: "is-model" },
		                                            h("div", { className: "mr-model-cell" },
		                                                h("span", { className: "mr-model-cell-name" }, combo.modelName ?? combo.model ?? "—"),
		                                                h("span", { className: "mr-model-cell-effort mr-effort-text", style: effortStyle(combo) }, effortLabel(tr, combo.reasoningEffort, combo.effortName)),
		                                            ),
		                                            combo.status === "done" ? null : h(Tag, { status: combo.status }, statusLabel(tr, combo.status)),
		                                        ),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num mr-score-strong mr-meter-cell",
		                                                style: combo.total === null || combo.total === undefined ? undefined : scoreMeterStyle(combo.total, 150),
		                                            },
		                                            combo.total === null || combo.total === undefined
		                                                ? h("span", { className: "mr-muted" }, tr("mr.ranking.noTotal"))
		                                                : formatNumber(combo.total, 2),
		                                        ),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num mr-meter-cell",
		                                                style: combo.scores?.candy === null || combo.scores?.candy === undefined ? undefined : scoreMeterStyle(combo.scores.candy, 22.5),
		                                            },
		                                            formatNumber(combo.scores?.candy, 2),
		                                        ),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num mr-meter-cell",
		                                                style: combo.scores?.pompeii === null || combo.scores?.pompeii === undefined ? undefined : scoreMeterStyle(combo.scores.pompeii, 45),
		                                            },
		                                            formatNumber(combo.scores?.pompeii, 2),
		                                        ),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num mr-meter-cell",
		                                                style: combo.scores?.pelican === null || combo.scores?.pelican === undefined ? undefined : scoreMeterStyle(combo.scores.pelican, 22.5),
		                                            },
		                                            formatNumber(combo.scores?.pelican, 2),
		                                        ),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num mr-meter-cell",
		                                                style: combo.scores?.qin === null || combo.scores?.qin === undefined ? undefined : scoreMeterStyle(combo.scores.qin, 60),
		                                            },
		                                            formatNumber(combo.scores?.qin, 2),
		                                        ),
		                                        h("td", { className: "is-num mr-num" }, formatMs(combo.durationMs)),
		                                        h("td", { className: "is-num mr-num" }, speedOf(combo).tps === null ? "—" : formatNumber(speedOf(combo).tps, 1)),
		                                        h("td", { className: "is-num mr-num" }, speedOf(combo).ttft === null ? "—" : formatMs(speedOf(combo).ttft)),
		                                        h(
		                                            "td",
		                                            {
		                                                className: "is-num mr-num",
		                                                title: tr("mr.ranking.costTitle", {
		                                                    generation: formatUsd(generationCost),
		                                                    judge: formatUsd(judgeCost),
		                                                }),
		                                            },
		                                            totalCost === null ? "—" : formatUsd(totalCost),
		                                        ),
		                                    );
		                                }),
		                            ),
		                        ),
		                        ),
		                    ),
		                ),
		            )
		            : null,
		    );
		}

		function RankingView(props) {
			const tr = props.tr;
			const latestEntry = props.latestEntry;
			const latestBatch = props.latestBatch;
			const batches = Array.isArray(props.batches) ? props.batches : [];
			const details = Array.isArray(props.details) ? props.details : [];
			const [paretoMetric, setParetoMetric] = React.useState("cost");
			const recommendation = React.useMemo(
				() => buildRecommendation(latestBatch, props.settings?.recommend),
				[latestBatch, props.settings],
			);
			if (latestEntry === null || latestEntry === undefined) {
				return h(RankingEmpty, { tr, batches, onStart: props.onStart });
			}
			if (latestBatch === null || latestBatch === undefined) {
				if (typeof props.latestError === "string" && props.latestError !== "") {
					return h(
						"div",
						{ className: "mr-panel" },
						h(
							"div",
							{ className: "mr-error-box" },
							h(AlertIcon, { size: 15 }),
							h(
								"div",
								null,
								h("div", { className: "mr-error-title" }, tr("mr.detail.loadFailed")),
								h("div", { className: "mr-error-detail" }, props.latestError),
							),
							h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: props.onRetry }, tr("mr.common.retry")),
						),
					);
				}
				return h(PageSkeleton, { tr });
			}
			const tableCombos = latestBatchCombos(latestBatch);
			const complete = tableCombos
				.filter((combo) => combo !== null && typeof combo === "object")
				.filter((combo) => toFiniteNumber(combo.total, null) !== null)
				.sort((left, right) => (toFiniteNumber(right.total, 0) ?? 0) - (toFiniteNumber(left.total, 0) ?? 0)
					|| String(left.key).localeCompare(String(right.key)));
			const incomplete = tableCombos.filter((combo) => toFiniteNumber(combo.total, null) === null);
			const previousBatch = [...details]
				.filter((entry) => entry !== null && entry !== undefined && entry.id !== latestBatch.id)
				.filter((entry) => (entry.taskVersion ?? null) === (latestBatch.taskVersion ?? null) && (entry.rubricVersion ?? null) === (latestBatch.rubricVersion ?? null))
				.sort((left, right) => toFiniteNumber(right.createdAt, 0) - toFiniteNumber(left.createdAt, 0))
				.find((entry) => Array.isArray(entry.combos) && entry.combos.some((combo) => combo.complete === true && toFiniteNumber(combo.total, null) !== null))
				?? null;
			const previousCombos = new Map(
				(Array.isArray(previousBatch?.combos) ? previousBatch.combos : [])
					.filter((combo) => combo.complete === true && toFiniteNumber(combo.total, null) !== null)
					.map((combo) => [combo.key, combo]),
			);
			const trendData = buildTrendSeries(
				[...details].filter(Boolean).sort((left, right) => toFiniteNumber(left.createdAt, 0) - toFiniteNumber(right.createdAt, 0)),
				tr,
			);
			const trendVersion = trendData.anchor === null
				? null
				: tr("mr.ranking.trend.version", {
					task: trendData.anchor.taskVersion ?? "—",
					rubric: trendData.anchor.rubricVersion ?? "—",
				});
			const caliberGold = props.meta?.assets?.["question.png"] ?? null;
			const caliberJudge = latestBatch.judge ?? props.catalog?.judge ?? null;
			const caliberGenerated = latestBatch.finishedAt ?? latestBatch.createdAt;
			const summaryText = latestBatch.summary?.text ?? "";
			const openModel = (comboKey) => {
				if (typeof props.onOpenModel === "function") props.onOpenModel(latestBatch.id, comboKey, null);
			};
			const openBatch = (comboKey) => {
				if (typeof props.onOpenBatch === "function") props.onOpenBatch(latestBatch.id, comboKey ?? null);
			};
			return h(
				"div",
				{ className: "mr-stack" },
				h(OverviewPanel, {
					tr,
					batch: latestBatch,
					complete,
					incomplete,
					previousCombos,
					recommendation,
					onOpenModel: openModel,
					onOpenBatch: openBatch,
					onStart: props.onStart,
					resumable: typeof props.onResume === "function" && isResumableBatch(latestBatch) && props.running !== true,
					resumingId: props.resumingId,
					onResume: props.onResume,
					onOpenBest: typeof props.onOpenModel === "function" ? openModel : undefined,
				}),
				h(IQMatrix, {
					tr,
					details,
					onOpenModel: typeof props.onOpenModel === "function"
						? (batchId, comboKey, taskId) => props.onOpenModel(batchId, comboKey, taskId)
						: undefined,
					onOpenBatch: openBatch,
					onStart: props.onStart,
				}),
				h(
					"div",
					{ className: "mr-chart-grid" },
					h(
						"div",
						{ className: "mr-panel" },
						h(
							"div",
							{ className: "mr-panel-head" },
							h(
								"div",
								null,
								h(
									"h2",
									{ className: "mr-panel-title" },
									h(SectionNo, { no: 3 }),
									tr("mr.ranking.trend.title"),
								),
								h("div", { className: "mr-panel-sub" }, trendVersion ?? tr("mr.ranking.trend.subtitle")),
							),
						),
						trendData.batches.length < 2
							? h(
								"div",
								{ className: "mr-empty-inline" },
								trendData.series.length === 0 ? tr("mr.ranking.trend.empty") : tr("mr.ranking.trend.pending"),
							)
							: h(TrendChart, { tr, trend: trendData }),
					),
					h(
						"div",
						{ className: "mr-panel" },
						h(
							"div",
							{ className: "mr-panel-head" },
							h(
								"div",
								null,
								h(
									"h2",
									{ className: "mr-panel-title" },
									h(SectionNo, { no: 4 }),
									tr("mr.ranking.pareto.title"),
								),
								h("div", { className: "mr-panel-sub" }, tr("mr.ranking.pareto.subtitle")),
							),
							h(
								"div",
								{ className: "mr-seg" },
								h(
									"button",
									{
										type: "button",
										className: "mr-seg-btn" + (paretoMetric === "cost" ? " is-active" : ""),
										onClick: () => setParetoMetric("cost"),
									},
									tr("mr.ranking.pareto.metricCost"),
								),
								h(
									"button",
									{
										type: "button",
										className: "mr-seg-btn" + (paretoMetric === "duration" ? " is-active" : ""),
										onClick: () => setParetoMetric("duration"),
									},
									tr("mr.ranking.pareto.metricDuration"),
								),
							),
						),
						h(ParetoChart, { tr, metric: paretoMetric, combos: tableCombos }),
						h(
							"div",
							{ className: "mr-chart-foot" },
							h("span", { className: "mr-legend-dot", style: seriesColorStyle(0) }),
							tr("mr.ranking.pareto.points"),
							h("span", { className: "mr-chart-foot-sep" }, "·"),
							h("span", { className: "mr-legend-dot", style: seriesColorStyle(1) }),
							tr("mr.ranking.pareto.frontier"),
						),
					),
				),
				summaryText === ""
					? null
					: h(
						"div",
						{ className: "mr-panel" },
						h(
							"div",
							{ className: "mr-panel-head" },
							h(
								"div",
								null,
								h(
									"h2",
									{ className: "mr-panel-title" },
									h(SectionNo, { no: 5 }),
									tr("mr.ranking.summaryTitle"),
								),
								latestBatch.summary?.model === undefined
									? null
									: h("div", { className: "mr-panel-sub" }, judgeLabel(tr, latestBatch.summary, props.catalog)),
							),
						),
						h("p", { className: "mr-summary-text" }, summaryText),
					),
				h(LatestBatchTable, {
					tr,
					batch: latestBatch,
					combos: tableCombos,
					previousCombos,
					onOpenBatch: (batchId, comboKey) => {
						if (typeof props.onOpenModel === "function") props.onOpenModel(batchId, comboKey ?? null, null);
					},
					onRerun: props.onRerun,
					onResume: props.onResume,
					resumingId: props.resumingId,
					running: props.running,
				}),
				h(
					"div",
					{ className: "mr-panel" },
					h(
						"div",
						{ className: "mr-panel-head" },
						h(
							"h2",
							{ className: "mr-panel-title" },
							h(SectionNo, { no: 7 }),
							tr("mr.ranking.caliber.title"),
						),
						h("span", { className: "mr-panel-sub" }, formatClock(caliberGenerated)),
					),
					h(
						"dl",
						{ className: "mr-caliber" },
						h("div", { className: "mr-caliber-row" },
							h("dt", null, tr("mr.ranking.caliber.taskVersion")),
							h("dd", null, props.meta?.taskVersion ?? latestBatch.taskVersion ?? "—"),
						),
						h("div", { className: "mr-caliber-row" },
							h("dt", null, tr("mr.ranking.caliber.rubricVersion")),
							h("dd", null, props.meta?.rubricVersion ?? latestBatch.rubricVersion ?? "—"),
						),
						h("div", { className: "mr-caliber-row" },
							h("dt", null, tr("mr.ranking.caliber.judge")),
							h("dd", null, judgeLabel(tr, caliberJudge, props.catalog)),
						),
						h("div", { className: "mr-caliber-row" },
							h("dt", null, tr("mr.ranking.caliber.gold")),
							caliberGold === null
								? h("dd", { className: "mr-mono" }, "—")
								: h("dd", { className: "mr-mono mr-hash", title: caliberGold }, caliberGold),
						),
						h("div", { className: "mr-caliber-row" },
							h("dt", null, tr("mr.ranking.caliber.generated")),
							h("dd", { className: "mr-mono" }, formatClock(caliberGenerated)),
						),
					),
				),
			);
		}
				// ── performance ────────────────────────────────────────────────────

		function PerfStat(props) {
			return h(
				"div",
				{ className: "mr-stat" },
				h("span", { className: "mr-stat-label" }, props.label),
				h("span", { className: "mr-stat-value" }, props.value),
				props.sub === null || props.sub === undefined ? null : h("span", { className: "mr-stat-sub" }, props.sub),
			);
		}

		function Sparkline(props) {
			const values = (Array.isArray(props.values) ? props.values : [])
				.map((entry) => toFiniteNumber(entry, null))
				.filter((entry) => entry !== null);
			if (values.length < 2) return null;
			const width = 96;
			const height = 26;
			const pad = 2;
			const min = Math.min(...values);
			const max = Math.max(...values);
			const span = max === min ? 1 : max - min;
			const points = values.map((value, index) => {
				const x = pad + (index / (values.length - 1)) * (width - pad * 2);
				const y = pad + (1 - (value - min) / span) * (height - pad * 2);
				return x.toFixed(2) + "," + y.toFixed(2);
			});
			const area = "M " + points[0].replace(",", " ") + " L " + points.slice(1).map((point) => point.replace(",", " ")).join(" L ")
				+ " L " + (width - pad) + " " + (height - pad) + " L " + pad + " " + (height - pad) + " Z";
			const gradientId = props.gradientId ?? "mr-sparkline-gradient";
			return h(
				"svg",
				{ className: "mr-sparkline", viewBox: "0 0 " + width + " " + height, "aria-hidden": "true" },
				h(
					"defs",
					null,
					h(
						"linearGradient",
						{ id: gradientId, x1: "0", y1: "0", x2: "1", y2: "0" },
						h("stop", { offset: "0%", stopColor: "var(--mr-accent-a)" }),
						h("stop", { offset: "100%", stopColor: "var(--mr-accent-b)" }),
					),
				),
				h("path", { d: area, className: "mr-sparkline-area" }),
				h("polyline", {
					points: points.join(" "),
					className: "mr-sparkline-line",
					style: { stroke: "url(#" + gradientId + ")" },
				}),
			);
		}

		function radarPointAt(index, count, radius, ratio, center) {
			const angle = -Math.PI / 2 + (index / Math.max(1, count)) * Math.PI * 2;
			const length = radius * clamp(ratio, 0, 1);
			return {
				x: center + Math.cos(angle) * length,
				y: center + Math.sin(angle) * length,
			};
		}

		function RadarMini(props) {
			const tr = props.tr;
			const dimensions = (Array.isArray(props.dimensions) ? props.dimensions : []).slice(0, 7);
			if (dimensions.length === 0) return null;
			const size = 128;
			const center = size / 2;
			const radius = 44;
			const count = dimensions.length;
			const gradientId = "mr-radar-fill-" + (toFiniteNumber(props.index, 0) ?? 0);
			const fractionPoints = (fraction) => dimensions.map((dimension, index) => {
				const point = radarPointAt(index, count, radius, fraction, center);
				return point.x.toFixed(2) + "," + point.y.toFixed(2);
			}).join(" ");
			const valuePoints = dimensions.map((dimension, index) => {
				const score = toFiniteNumber(dimension.score, 0) ?? 0;
				const point = radarPointAt(index, count, radius, clamp(score, 0, 100) / 100, center);
				return point.x.toFixed(2) + "," + point.y.toFixed(2);
			}).join(" ");
			return h(
				"div",
				{ className: "mr-perf-radar-wrap", title: props.label },
				h(
					"svg",
					{
						className: "mr-perf-radar",
						viewBox: "0 0 " + size + " " + size,
						role: "img",
						"aria-label": props.label,
					},
					h("title", null, props.label),
					h(
						"defs",
						null,
						h(
							"linearGradient",
							{ id: gradientId, x1: "0", y1: "0", x2: "1", y2: "1" },
							h("stop", { offset: "0%", stopColor: "var(--mr-accent-a)", stopOpacity: 0.18 }),
							h("stop", { offset: "100%", stopColor: "var(--mr-accent-b)", stopOpacity: 0.14 }),
						),
					),
					[0.33, 0.66, 1].map((fraction) =>
						h("polygon", {
							key: "ring-" + fraction,
							points: fractionPoints(fraction),
							className: "mr-radar-ring",
						}),
					),
					dimensions.map((dimension, index) => {
						const point = radarPointAt(index, count, radius, 1, center);
						return h("line", {
							key: "axis-" + index,
							x1: center,
							y1: center,
							x2: point.x,
							y2: point.y,
							className: "mr-radar-axis",
						});
					}),
					h("polygon", {
						points: valuePoints,
						fill: "url(#" + gradientId + ")",
						className: "mr-radar-shape",
						pathLength: 1,
					}),
					dimensions.map((dimension, index) => {
						const score = toFiniteNumber(dimension.score, 0) ?? 0;
						const point = radarPointAt(index, count, radius, clamp(score, 0, 100) / 100, center);
						return h("circle", {
							key: "vertex-" + index,
							cx: point.x,
							cy: point.y,
							r: 2,
							className: "mr-radar-vertex",
						});
					}),
					dimensions.map((dimension, index) => {
						const point = radarPointAt(index, count, radius + 11, 1, center);
						const anchor = index === 0
							? "middle"
							: point.y > center + 20 && point.x > center + 20
								? "start"
								: point.y > center + 20 && point.x < center - 20
									? "end"
									: point.x > center + 20
										? "end"
										: point.x < center - 20
											? "start"
											: "middle";
						const labelKey = RADAR_LABEL_KEYS[dimension.key];
						const text = labelKey === undefined
							? tr(DIMENSION_KEYS[dimension.key] ?? "mr.common.value")
							: tr(labelKey);
						return h("text", {
							key: "label-" + index,
							x: point.x,
							y: point.y + 2.2,
							textAnchor: anchor,
							className: "mr-radar-label is-" + (labelKey === undefined ? "other" : labelKey.split(".").pop()),
						}, text);
					}),
				),
			);
		}

		function DotMatrixLoader(props) {
			const cells = [];
			for (let row = 0; row < 5; row += 1) {
				for (let column = 0; column < 5; column += 1) {
					const distance = Math.abs(row - 2) + Math.abs(column - 2);
					cells.push(h("span", {
						key: "dot-" + row + "-" + column,
						className: "mr-dot",
						style: { animationDelay: (distance * 80) + "ms" },
					}));
				}
			}
			return h(
				"div",
				{ className: "mr-dot-loader", role: "status", "aria-label": props.label },
				h("div", { className: "mr-dot-grid", "aria-hidden": "true" }, cells),
				h("span", { className: "mr-dot-label" }, props.label),
			);
		}

		function PerfTileHead(props) {
			const animated = useCountUp(props.value, 650);
			const text = props.value === null || props.value === undefined || animated === null
				? "—"
				: props.format(animated);
			return h(
				"div",
				{ className: "mr-stat-highlight" },
				h("span", { className: "mr-stat-highlight-value mr-mono" }, text),
				h(Sparkline, { values: props.spark, gradientId: props.sparkId }),
			);
		}

		function MetricRows(props) {
			const rows = Array.isArray(props.rows) ? props.rows : [];
			return h(
				"div",
				{ className: "mr-metric-rows" },
				rows.map((row) =>
					h(
						"div",
						{ className: "mr-metric-row", key: row.key },
						h("span", { className: "mr-metric-label" }, row.label),
						h("span", { className: "mr-metric-value" }, row.value),
					),
				),
			);
		}

		function PerfModelCard(props) {
			const tr = props.tr;
			const model = props.model;
			const index = toFiniteNumber(props.index, 0) ?? 0;
			const catalog = props.catalog;
			const score = toFiniteNumber(model.score, null);
			const samples = toFiniteNumber(model.samples, 0) ?? 0;
			const baseline = model.baseline ?? null;
			const delta = toFiniteNumber(baseline?.deltaPct, null);
			const baselineOk = baseline !== null && baseline.status === "ok" && delta !== null;
			const dimensions = Array.isArray(model.dimensions) ? model.dimensions : [];
			const modelName = modelDisplayName(catalog, model.provider, model.model);
			const effortName = effortDisplayName(catalog, model.provider, model.model, model.reasoningEffort);
			const speed = speedMetricsOf(speedRecordOf(props.speedBatch, comboKeyOf(model.provider, model.model, model.reasoningEffort)));
			return h(
				"div",
				{ className: "mr-perf-card" },
				h(
					"div",
					{ className: "mr-perf-card-head" },
					h(
						"div",
						{ className: "mr-perf-card-title" },
						h("span", { className: "mr-perf-model" }, modelName),
						h("span", { className: "mr-perf-provider" }, providerDisplayName(catalog, model.provider)),
					),
					h(
						"div",
						{ className: "mr-perf-card-side" },
						h(RadarMini, {
							tr,
							dimensions,
							index,
							label: tr("mr.perf.radarLabel"),
						}),
						h(
							"div",
							{ className: "mr-perf-score" },
							h("span", { className: "mr-perf-score-value" }, score === null ? "—" : formatInt(score)),
							h("span", { className: "mr-perf-score-max" }, "/ 1000"),
						),
					),
				),
				h(
					"div",
					{ className: "mr-perf-meta" },
					h("span", { className: "mr-perf-effort", style: effortStyle(model) }, effortName === null ? tr("mr.common.defaultEffort") : effortName),
					h("span", { className: "mr-perf-samples" }, tr("mr.perf.samples") + " " + formatInt(samples)),
					speed.tps === null && speed.ttft === null
						? null
						: h(
							"span",
							{ className: "mr-perf-speed mr-mono", title: tr("mr.iq.speedTitle") },
							"TPS " + (speed.tps === null ? "—" : formatNumber(speed.tps, 1))
								+ " · TTFT " + (speed.ttft === null ? "—" : formatMs(speed.ttft)),
						),
					model.adequate === false
						? h(Tag, { status: "stopped", className: "mr-tag-small" }, tr("mr.perf.inadequate"))
						: h(Tag, { status: "done", className: "mr-tag-small" }, tr("mr.perf.adequate")),
				),
				h(
					"div",
					{ className: "mr-perf-baseline" },
					baselineOk
						? h(
							"span",
							{ className: "mr-delta-chip " + deltaTone(delta) },
							tr("mr.perf.baseline") + " " + formatDeltaPct(delta),
						)
						: h("span", { className: "mr-delta-chip is-flat" }, tr("mr.perf.baselineInsufficient")),
					baselineOk && baseline.score !== undefined && baseline.score !== null
						? h("span", { className: "mr-perf-baseline-score" }, tr("mr.perf.baselineScore", { score: formatInt(baseline.score) }))
						: null,
				),
				h("div", { className: "mr-dim-heading" }, tr("mr.perf.dimensions")),
				h(
					"div",
					{ className: "mr-dim-list" },
					dimensions.length === 0
						? h("div", { className: "mr-muted" }, tr("mr.common.none"))
						: dimensions.map((dimension) =>
							h(
								"div",
								{ className: "mr-dim", key: String(dimension.key) },
								h(
									"div",
									{ className: "mr-dim-head", title: dimension.weight === undefined ? undefined : tr("mr.perf.weight", { weight: dimension.weight }) },
									h("span", { className: "mr-dim-label" }, tr(DIMENSION_KEYS[dimension.key] ?? "mr.common.value") + (DIMENSION_KEYS[dimension.key] === undefined ? " · " + String(dimension.key) : "")),
									h(
										"span",
										{ className: "mr-dim-value" },
										dimension.unit === "ratio"
											? formatPercent(dimension.value)
											: formatNumber(dimension.value, 2) + (typeof dimension.unit === "string" && dimension.unit !== "" ? " " + dimension.unit : ""),
									),
								),
								h(
									"div",
									{ className: "mr-dim-track" },
									h("span", {
										className: "mr-dim-fill",
										style: { width: clamp(dimension.score, 0, 100) + "%" },
									}),
								),
							),
						),
				),
			);
		}

		function SpeedTable(props) {
			const tr = props.tr;
			const catalog = props.catalog;
			const batch = props.batch;
			const runs = Array.isArray(batch?.speedTests) ? batch.speedTests : [];
			if (batch === null || batch === undefined || runs.length === 0) {
				return h(
					"div",
					{ className: "mr-panel" },
					h(
						"div",
						{ className: "mr-panel-head" },
						h(
							"div",
							null,
							h("h2", { className: "mr-panel-title" }, tr("mr.perf.speedTitle")),
							h("div", { className: "mr-panel-sub" }, tr("mr.perf.speedSubtitle")),
						),
					),
					h("div", { className: "mr-empty-inline" }, tr("mr.perf.speed.empty")),
				);
			}
			return h(
				"div",
				{ className: "mr-panel" },
				h(
					"div",
					{ className: "mr-panel-head" },
					h(
						"div",
						null,
						h("h2", { className: "mr-panel-title" }, tr("mr.perf.speedTitle")),
						h("div", { className: "mr-panel-sub" }, tr("mr.perf.speedSubtitle") + " · " + formatClock(batch.createdAt)),
					),
					h(
						"button",
						{ type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: () => props.onOpenBatch(batch.id, null) },
						tr("mr.common.open"),
					),
				),
				h(
					"div",
					{ className: "mr-table-scroll" },
					h(
						"table",
						{ className: "mr-table is-speed" },
						h(
							"thead",
							null,
							h(
								"tr",
								null,
								h("th", { className: "is-model" }, tr("mr.perf.speed.combo")),
								h("th", { className: "is-num" }, tr("mr.perf.speed.ttft")),
								h("th", { className: "is-num" }, tr("mr.perf.speed.tps")),
								h("th", { className: "is-num" }, tr("mr.perf.speed.minmax")),
								h("th", { className: "is-time" }, tr("mr.perf.speed.time")),
								h("th", { className: "is-status" }, tr("mr.perf.speed.status")),
							),
						),
						h(
							"tbody",
							null,
							runs.map((record) => {
								const min = record.min ?? {};
								const max = record.max ?? {};
								const samples = Array.isArray(record.samples) ? record.samples.length : 0;
								return h(
									"tr",
									{ key: String(record.comboKey ?? record.model) },
									h(
										"td",
										{ className: "is-model" },
										h(
											"div",
											{ className: "mr-model-cell" },
											h("span", { className: "mr-model-cell-name" }, modelDisplayName(catalog, record.provider, record.model)),
											h(
												"span",
												{ className: "mr-model-cell-effort mr-effort-text", style: effortStyle(record) },
												record.reasoningEffort === null || record.reasoningEffort === undefined || record.reasoningEffort === ""
													? tr("mr.common.defaultEffort")
													: effortDisplayName(catalog, record.provider, record.model, record.reasoningEffort) ?? String(record.reasoningEffort),
											),
										),
										h("span", { className: "mr-muted mr-subline" }, tr("mr.perf.speed.samples", { count: samples })),
									),
									h("td", { className: "is-num mr-num" }, record.median?.ttftMs === null || record.median?.ttftMs === undefined ? "—" : formatInt(record.median.ttftMs) + " ms"),
									h("td", { className: "is-num mr-num" }, record.median?.tps === null || record.median?.tps === undefined ? "—" : formatNumber(record.median.tps, 2)),
									h(
										"td",
										{ className: "is-num mr-num" },
										h("div", { className: "mr-minmax" },
											h("span", null, "TTFT " + (min.ttftMs === null || min.ttftMs === undefined ? "—" : formatInt(min.ttftMs)) + "–" + (max.ttftMs === null || max.ttftMs === undefined ? "—" : formatInt(max.ttftMs)) + " ms"),
											h("span", null, "TPS " + (min.tps === null || min.tps === undefined ? "—" : formatNumber(min.tps, 2)) + "–" + (max.tps === null || max.tps === undefined ? "—" : formatNumber(max.tps, 2))),
										),
									),
									h("td", { className: "is-time mr-mono" }, formatClock(batch.createdAt)),
									h("td", { className: "is-status" }, h(Tag, { status: record.status }, statusLabel(tr, record.status))),
								);
							}),
						),
					),
				),
			);
		}

		function SessionTable(props) {
			const tr = props.tr;
			const catalog = props.catalog;
			const sessions = Array.isArray(props.sessions) ? [...props.sessions] : [];
			sessions.sort((left, right) => toFiniteNumber(right.tps, -1) - toFiniteNumber(left.tps, -1));
			const visible = sessions.slice(0, 30);
			return h(
				"div",
				{ className: "mr-panel" },
				h(
					"div",
					{ className: "mr-panel-head" },
					h(
						"div",
						null,
						h("h2", { className: "mr-panel-title" }, tr("mr.perf.sessionsTitle")),
						h("div", { className: "mr-panel-sub" }, tr("mr.perf.sessionsSubtitle")),
					),
				),
				visible.length === 0
					? h("div", { className: "mr-empty-inline" }, tr("mr.perf.sessionsEmpty"))
					: h(
						"div",
						{ className: "mr-table-scroll" },
						h(
							"table",
							{ className: "mr-table is-sessions" },
							h(
								"thead",
								null,
								h(
									"tr",
									null,
									h("th", { className: "is-rank" }, tr("mr.perf.sessions.rank")),
									h("th", { className: "is-model" }, tr("mr.common.session")),
									h("th", { className: "is-num" }, tr("mr.perf.sessions.tps")),
									h("th", { className: "is-num" }, tr("mr.perf.sessions.ttft")),
									h("th", { className: "is-num" }, tr("mr.perf.sessions.tokens")),
									h("th", { className: "is-num" }, tr("mr.perf.sessions.turns")),
								),
							),
							h(
								"tbody",
								null,
								visible.map((session, index) =>
									h(
										"tr",
										{ key: String(session.sessionId ?? index) },
										h("td", { className: "is-rank mr-mono" }, index + 1),
										h(
											"td",
											{ className: "is-model" },
											h("div", { className: "mr-model-cell" },
												h("span", { className: "mr-model-cell-name" }, session.title || tr("mr.perf.sessions.untitled")),
												h(
													"span",
													{ className: "mr-model-cell-effort", title: String(session.sessionId ?? "") },
													modelDisplayName(catalog, session.provider, session.model),
												),
											),
										),
										h("td", { className: "is-num mr-num" }, formatNumber(session.tps, 2)),
										h("td", { className: "is-num mr-num" }, session.ttftMs === null || session.ttftMs === undefined ? "—" : formatInt(session.ttftMs) + " ms"),
										h("td", { className: "is-num mr-num" }, formatInt(session.outputTokens)),
										h("td", { className: "is-num mr-num" }, formatInt(session.turns)),
									),
								),
							),
						),
					),
			);
		}

		function PerformanceView(props) {
			const tr = props.tr;
			const reportState = props.reportState ?? { status: "loading", data: null, error: null };
			const report = reportState.data;
			const models = Array.isArray(report?.models) ? [...report.models] : [];
			models.sort((left, right) => toFiniteNumber(right.score, -1) - toFiniteNumber(left.score, -1));
			const ttft = report?.ttft ?? null;
			const tps = report?.tps ?? null;
			const tools = report?.tools ?? null;
			const reasoning = report?.reasoning ?? null;
			const requests = toFiniteNumber(report?.requests, null);
			const samples = toFiniteNumber(report?.samples, null);
			const sessionCount = Array.isArray(report?.sessions) ? report.sessions.length : 0;
			const reportScope = report?.scope ?? null;
			const scopeSessions = toFiniteNumber(reportScope?.sessionsScanned, sessionCount) ?? sessionCount;
			const scopeRequests = toFiniteNumber(reportScope?.requests, samples) ?? samples;
			const body = [];
			if (reportState.status === "error" && report === null) {
				body.push(
					h(
						"div",
						{ className: "mr-error-box", key: "error" },
						h(AlertIcon, { size: 15 }),
						h("div", null,
							h("div", { className: "mr-error-title" }, tr("mr.perf.error")),
							h("div", { className: "mr-error-detail" }, errorMessageOf(reportState.error)),
						),
						h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: props.onRetry }, tr("mr.common.retry")),
					),
				);
			}
			if ((reportState.status === "loading" || reportState.status === "idle") && report === null) {
				body.push(
					h(DotMatrixLoader, { key: "loading-note", label: tr("mr.perf.loading") }),
				);
				body.push(
					h(
						"div",
						{ className: "mr-perf-grid", key: "loading" },
						[0, 1, 2, 3].map((index) =>
							h(
								"div",
								{ className: "mr-perf-card", key: "perf-sk-" + index },
								h(Skeleton, { width: "55%", height: 14 }),
								h(Skeleton, { width: "30%", height: 26 }),
								h(Skeleton, { width: "100%", height: 10 }),
								h(Skeleton, { width: "100%", height: 10 }),
								h(Skeleton, { width: "86%", height: 10 }),
							),
						),
					),
				);
			}
			if (report !== null) {
				if (reportState.status === "error") {
					body.push(
						h(
							"div",
							{ className: "mr-inline-note is-warn", key: "stale-error" },
							tr("mr.perf.error") + ": " + errorMessageOf(reportState.error),
						),
					);
				}
				if (report.note) {
					body.push(h("div", { className: "mr-inline-note is-warn", key: "note" }, tr("mr.perf.notePending")));
				}
				body.push(
					h(
						"div",
						{ className: "mr-stat-grid", key: "aggregates" },
						h(
							"div",
							{ className: "mr-stat-card" },
							h("h3", { className: "mr-stat-card-title" }, tr("mr.perf.aggregate.ttft")),
							h(PerfTileHead, {
								value: ttft?.avg ?? null,
								format: (value) => formatMs(value),
								spark: [ttft?.p50, ttft?.p95, ttft?.p99, ttft?.avg],
								sparkId: "mr-spark-ttft",
							}),
							h(MetricRows, {
								rows: [
									{ key: "avg", label: tr("mr.perf.aggregate.avg"), value: formatMs(ttft?.avg) },
									{ key: "p50", label: tr("mr.perf.aggregate.p50"), value: formatMs(ttft?.p50) },
									{ key: "p95", label: tr("mr.perf.aggregate.p95"), value: formatMs(ttft?.p95) },
									{ key: "p99", label: tr("mr.perf.aggregate.p99"), value: formatMs(ttft?.p99) },
									{ key: "samples", label: tr("mr.perf.samples"), value: formatInt(ttft?.samples) },
								],
							}),
						),
						h(
							"div",
							{ className: "mr-stat-card" },
							h("h3", { className: "mr-stat-card-title" }, tr("mr.perf.aggregate.tps")),
							h(PerfTileHead, {
								value: tps?.avg ?? null,
								format: (value) => formatNumber(value, 1) + " tok/s",
								spark: [tps?.p50, tps?.p95, tps?.p99, tps?.avg],
								sparkId: "mr-spark-tps",
							}),
							h(MetricRows, {
								rows: [
									{ key: "avg", label: tr("mr.perf.aggregate.avg"), value: formatNumber(tps?.avg, 2) },
									{ key: "p50", label: tr("mr.perf.aggregate.p50"), value: formatNumber(tps?.p50, 2) },
									{ key: "p95", label: tr("mr.perf.aggregate.p95"), value: formatNumber(tps?.p95, 2) },
									{ key: "p99", label: tr("mr.perf.aggregate.p99"), value: formatNumber(tps?.p99, 2) },
									{ key: "samples", label: tr("mr.perf.samples"), value: formatInt(tps?.samples) },
								],
							}),
						),
						h(
							"div",
							{ className: "mr-stat-card" },
							h("h3", { className: "mr-stat-card-title" }, tr("mr.perf.toolsTitle")),
							h(PerfTileHead, {
								value: tools?.avgMs ?? null,
								format: (value) => formatMs(value),
								spark: [tools?.p50, tools?.p95, tools?.avgMs],
								sparkId: "mr-spark-tools",
							}),
							h(MetricRows, {
								rows: [
									{ key: "avg", label: tr("mr.perf.tools.avg"), value: formatMs(tools?.avgMs) },
									{ key: "p50", label: tr("mr.perf.tools.p50"), value: formatMs(tools?.p50) },
									{ key: "p95", label: tr("mr.perf.tools.p95"), value: formatMs(tools?.p95) },
									{ key: "calls", label: tr("mr.perf.tools.calls"), value: formatInt(tools?.calls) },
									{ key: "success", label: tr("mr.perf.tools.success"), value: formatPercent(tools?.successRate) },
								],
							}),
						),
						h(
							"div",
							{ className: "mr-stat-card" },
							h("h3", { className: "mr-stat-card-title" }, tr("mr.perf.requests")),
							h(PerfTileHead, {
								value: requests,
								format: (value) => formatInt(value),
								spark: [requests, samples, reasoning?.samples],
								sparkId: "mr-spark-requests",
							}),
							h(MetricRows, {
								rows: [
									{ key: "requests", label: tr("mr.perf.requests"), value: formatInt(requests) },
									{ key: "samples", label: tr("mr.perf.samples"), value: formatInt(samples) },
									{ key: "reasoning", label: tr("mr.perf.reasoning.cps"), value: formatNumber(reasoning?.avgCharsPerSec, 1) },
									{ key: "reasoningSamples", label: tr("mr.perf.reasoning.samples"), value: formatInt(reasoning?.samples) },
								],
							}),
						),
					),
				);
				body.push(
					h(
						"div",
						{ className: "mr-panel", key: "models" },
						h(
							"div",
							{ className: "mr-panel-head" },
							h(
								"div",
								null,
								h("h2", { className: "mr-panel-title" }, tr("mr.perf.modelsTitle")),
								h("div", { className: "mr-panel-sub" }, tr("mr.perf.modelsSubtitle")),
							),
							h("span", { className: "mr-panel-sub mr-mono" },
								samples === null ? "" : tr("mr.perf.samples") + " " + formatInt(samples) + " · " + tr("mr.perf.requests") + " " + formatInt(requests)),
						),
						models.length === 0
							? h("div", { className: "mr-empty-inline" }, tr("mr.perf.modelsEmpty"))
							: h(
								"div",
								{ className: "mr-perf-grid" },
								models.map((model, index) =>
									h(PerfModelCard, {
										key: String(model.provider) + "::" + String(model.model) + "::" + String(model.reasoningEffort ?? ""),
										tr,
										model,
										index,
										catalog: props.catalog,
										speedBatch: props.speedBatch,
									}),
								),
							),
					),
				);
				body.push(h(SpeedTable, {
					key: "speed",
					tr,
					catalog: props.catalog,
					batch: props.speedBatch,
					onOpenBatch: props.onOpenBatch,
				}));
				body.push(h(SessionTable, {
					key: "sessions",
					tr,
					catalog: props.catalog,
					sessions: Array.isArray(report.sessions) ? report.sessions : [],
				}));
			}
			return h(
				"div",
				{ className: "mr-stack" },
				h(
					"div",
					{ className: "mr-section-head" },
					h(
						"div",
						null,
						h("h2", { className: "mr-section-title" }, tr("mr.perf.title")),
						h("div", { className: "mr-section-sub" }, tr("mr.perf.subtitle")),
						report === null
							? null
							: h("div", { className: "mr-section-sub mr-mono" }, tr("mr.perf.generated", { time: formatClock(report.generatedAt) })),
						report === null
							? null
							: h(
								"div",
								{ className: "mr-section-sub mr-perf-scope mr-mono" },
								tr("mr.perf.scope", { sessions: formatInt(scopeSessions), requests: formatInt(scopeRequests) }),
							),
					),
					h(
						"div",
						{ className: "mr-range-switch", role: "group", "aria-label": tr("mr.perf.rangeLabel") },
						RANGE_OPTIONS.map((option) =>
							h(
								"button",
								{
									key: option.id,
									type: "button",
									className: "mr-range-btn" + (props.range === option.id ? " is-active" : ""),
									onClick: () => props.onRangeChange(option.id),
									"aria-pressed": props.range === option.id,
								},
								tr(option.labelKey),
							),
						),
					),
				),
				...body,
			);
		}

		// ── history ────────────────────────────────────────────────────────

		function historySelectionLabel(tr, entry, detail) {
			if (detail !== null && detail !== undefined && Array.isArray(detail.selection) && detail.selection.length > 0) {
				const names = detail.selection.map((combo) => modelLabel(tr, combo));
				const shown = names.slice(0, 2);
				const extra = names.length - shown.length;
				return shown.join(" / ") + (extra > 0 ? " +" + extra : "");
			}
			return tr("mr.history.selection", {
				combos: toFiniteNumber(entry.comboCount, 0) ?? 0,
				runs: toFiniteNumber(entry.runCount, 0) ?? 0,
			});
		}

		function historySelectionPreview(tr, selection) {
			const shown = selection.slice(0, 2);
			const nodes = [];
			shown.forEach((combo, index) => {
				if (index > 0) {
					nodes.push(h("span", { className: "mr-selection-sep", key: "hs-sep-" + index }, " / "));
				}
				nodes.push(
					h(
						"span",
						{ className: "mr-selection-combo", key: String(combo.key ?? "hs-" + index) },
						h("span", { className: "mr-model-strong" }, combo.modelName ?? combo.model ?? "—"),
						h("span", { className: "mr-selection-dot" }, " · "),
						h(
							"span",
							{ className: "mr-effort-text", style: effortStyle(combo) },
							effortLabel(tr, combo.reasoningEffort, combo.effortName),
						),
					),
				);
			});
			if (selection.length > shown.length) {
				nodes.push(h("span", { className: "mr-selection-extra", key: "hs-extra" }, " +" + String(selection.length - shown.length)));
			}
			return nodes;
		}

		function HistoryView(props) {
			const tr = props.tr;
			const batches = Array.isArray(props.batches) ? props.batches : [];
			const visible = batches.slice(0, HISTORY_LIMIT);
			const loading = props.status === "loading" && batches.length === 0;
			if (loading) {
				return h(
					"div",
					{ className: "mr-panel" },
					h(
						"div",
						{ className: "mr-skeleton-table" },
						[0, 1, 2, 3, 4, 5].map((row) =>
							h(
								"div",
								{ className: "mr-skeleton-row", key: "hist-sk-" + row },
								h(Skeleton, { width: "16%", height: 12 }),
								h(Skeleton, { width: "30%", height: 12 }),
								h(Skeleton, { width: "12%", height: 12 }),
								h(Skeleton, { width: "10%", height: 12 }),
								h(Skeleton, { width: "12%", height: 12 }),
							),
						),
					),
				);
			}
			return h(
				"div",
				{ className: "mr-stack" },
				h(
					"div",
					{ className: "mr-section-head" },
					h(
						"div",
						null,
						h("h2", { className: "mr-section-title" }, tr("mr.history.title")),
						h("div", { className: "mr-section-sub" }, tr("mr.history.subtitle", { count: visible.length })),
					),
					h("span", { className: "mr-panel-sub" }, tr("mr.history.limitNote", { count: HISTORY_LIMIT })),
				),
				visible.length === 0
					? h(
						"div",
						{ className: "mr-empty mr-empty-compact" },
						h("h2", { className: "mr-empty-title" }, tr("mr.history.empty")),
						h(
							"button",
							{ type: "button", className: "mr-btn is-primary", onClick: props.onStart },
							h(PlayIcon, { size: 13 }),
							tr("mr.page.start"),
						),
					)
					: h(
						"div",
						{ className: "mr-panel mr-panel-flush" },
						h(
							"div",
							{ className: "mr-table-scroll" },
							h(
								"table",
								{ className: "mr-table is-history" },
								h(
									"thead",
									null,
									h(
										"tr",
										null,
										h("th", { className: "is-time" }, tr("mr.history.col.time")),
										h("th", { className: "is-model" }, tr("mr.history.col.selection")),
										h("th", { className: "is-status" }, tr("mr.history.col.status")),
										h("th", { className: "is-num" }, tr("mr.history.col.score")),
										h("th", { className: "is-num" }, tr("mr.history.col.duration")),
										h("th", { className: "is-num" }, tr("mr.history.col.cost")),
									),
								),
								h(
									"tbody",
									null,
									visible.map((entry) => {
										const excluded = EXCLUDED_TREND_STATUSES.has(entry.status);
										const detailEntry = props.detailById?.get(entry.id) ?? null;
										const resumable = typeof props.onResume === "function" && isResumableEntry(entry) && props.running !== true;
										const rerunnable = typeof props.onRerun === "function" && entry.rerunnable !== false && entry.status !== "running" && props.running !== true;
										const resuming = props.resumingId === entry.id;
										const open = () => props.onOpenBatch(entry.id, null);
										return h(
											"tr",
											{
												key: entry.id,
												className: "mr-row-click",
												tabIndex: 0,
												role: "button",
												"aria-label": tr("mr.history.rowOpen", { id: entry.id }),
												onClick: open,
												onKeyDown: (event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														open();
													}
												},
											},
											h("td", { className: "is-time mr-mono" }, formatClock(entry.createdAt)),
											h(
												"td",
												{ className: "is-model" },
												h(
													"div",
													{ className: "mr-model-cell" },
													h(
														"span",
														{ className: "mr-model-cell-name" },
														Array.isArray(detailEntry?.selection) && detailEntry.selection.length > 0
															? historySelectionPreview(tr, detailEntry.selection)
															: historySelectionLabel(tr, entry, detailEntry),
													),
													h(
														"span",
														{ className: "mr-model-cell-effort" },
														tr("mr.history.judge", { model: judgeLabel(tr, entry.judge, props.catalog) })
															+ (toFiniteNumber(entry.errorCount, 0) > 0 ? " · " + tr("mr.history.failedCount", { count: entry.errorCount }) : ""),
													),
												),
											),
											h(
												"td",
												{ className: "is-status" },
												h(Tag, { status: entry.status }, statusLabel(tr, entry.status)),
												excluded ? h("span", { className: "mr-exclude-note" }, tr("mr.status.notInTrend")) : null,
												resumable
													? h(
														"button",
														{
															type: "button",
															className: "mr-btn is-ghost mr-btn-small mr-resume-inline",
															disabled: resuming,
															"aria-label": tr("mr.aria.resume", { id: entry.id }),
															onClick: (event) => {
																event.stopPropagation();
																props.onResume(entry.id);
															},
															onKeyDown: (event) => event.stopPropagation(),
														},
														h(PlayIcon, { size: 11 }),
														resumeButtonLabel(tr, resuming),
													)
													: null,
												rerunnable
													? h(
														"button",
														{
															type: "button",
															className: "mr-btn is-ghost mr-btn-small mr-resume-inline",
															"aria-label": tr("mr.history.rerunRow", { id: entry.id }),
															onClick: (event) => {
																event.stopPropagation();
																props.onRerun(entry.id);
															},
															onKeyDown: (event) => event.stopPropagation(),
														},
														h(PlayIcon, { size: 11 }),
														tr("mr.history.rerun"),
													)
													: null,
											),
											h("td", { className: "is-num mr-num" }, toFiniteNumber(entry.doneCount, 0) > 0 ? formatNumber(entry.bestScore, 2) : "—"),
											h("td", { className: "is-num mr-num" }, formatMs(entry.durationMs)),
											h(
												"td",
												{ className: "is-num mr-num" },
												formatUsd(
													props.detailById?.get(entry.id) !== undefined
														? totalCostOfBatch(props.detailById.get(entry.id))
														: entry.totalCostUsd,
												),
											),
										);
									}),
								),
							),
						),
					),
			);
		}

		// ── batch detail drawer ────────────────────────────────────────────

		function comboFallbackFromSelection(batch) {
			if (!Array.isArray(batch?.selection)) return [];
			return batch.selection.map((entry) => ({
				key: entry.key ?? comboKeyOf(entry.provider, entry.model, entry.reasoningEffort),
				provider: entry.provider,
				providerName: entry.providerName,
				model: entry.model,
				modelName: entry.modelName,
				reasoningEffort: entry.reasoningEffort ?? null,
				effortName: entry.effortName,
				status: batch.status === "running" ? "running" : "pending",
				scores: {},
				total: null,
				costUsd: null,
				judgeCostUsd: null,
				durationMs: null,
			}));
		}

		const GRADE_KEY_LABELS = new Set(["score", "score100", "maxScore", "answer", "ok", "weighted", "cap", "final100", "correct", "reason"]);

		function GradeDetails(props) {
			const tr = props.tr;
			const grade = props.grade;
			if (grade === null || typeof grade !== "object") return null;
			const entries = [];
			for (const [key, value] of Object.entries(grade)) {
				if (value === null || value === undefined || value === "") continue;
				if (typeof value === "object") continue;
				entries.push([key, value]);
			}
			if (entries.length === 0) return null;
			return h(
				"div",
				{ className: "mr-grade-grid" },
				entries.map(([key, value]) =>
					h(
						"span",
						{ className: "mr-grade-item", key },
						h("span", { className: "mr-grade-key" }, GRADE_KEYS[key] === undefined ? key : tr(GRADE_KEYS[key])),
						h(
							"span",
							{ className: "mr-grade-value" },
							typeof value === "boolean"
								? tr(value ? "mr.common.yes" : "mr.common.no")
								: typeof value === "number"
									? formatNumber(value, 4)
									: String(value),
						),
					),
				),
			);
		}

		function RunDetail(props) {
			const tr = props.tr;
			const run = props.run;
			const detail = run.detail ?? {};
			const answer = typeof detail.finalText === "string" && detail.finalText !== ""
				? detail.finalText
				: typeof detail.answerText === "string"
					? detail.answerText
					: "";
			const excerpt = excerptOf(answer);
			const files = Array.isArray(run.files) ? run.files : [];
			const primaryFile = files.find((file) => file?.primary === true) ?? files[0] ?? null;
			const usage = run.usage ?? null;
			const judge = detail.judge ?? null;
			const cost = toFiniteNumber(run.cost?.usd, null);
			const judgeCost = toFiniteNumber(run.judgeCost?.usd, null);
			const retryCost = toFiniteNumber(run.retryCostUsd, 0) ?? 0;
			const retryJudgeCost = toFiniteNumber(run.retryJudgeCostUsd, 0) ?? 0;
			const retries = Array.isArray(run.attempts) ? run.attempts.length : 0;
			const runTotalCost =
				cost === null && judgeCost === null && retryCost === 0 && retryJudgeCost === 0
					? null
					: (cost ?? 0) + (judgeCost ?? 0) + retryCost + retryJudgeCost;
			return h(
				"article",
				{ className: "mr-run" },
				h(
					"header",
					{ className: "mr-run-head" },
					h(
						"div",
						{ className: "mr-run-title" },
						h("span", { className: "mr-run-task" }, taskName(tr, run.taskId)),
						h("span", { className: "mr-run-max" }, tr("mr.detail.maxScore", { score: formatNumber(run.maxScore ?? TASK_BY_ID.get(run.taskId)?.maxScore, 1) })),
					),
					h(
						"div",
						{ className: "mr-run-head-right" },
						files.length > 0 && typeof props.onOpenArtifact === "function"
							? h(
								"button",
								{
									type: "button",
									className: "mr-btn is-ghost mr-btn-small mr-run-artifact",
									onClick: () => props.onOpenArtifact(run, primaryFile === null ? null : String(primaryFile.name)),
								},
								h(EyeIcon, { size: 12 }),
								tr("mr.artifact.open"),
							)
							: null,
						h(Tag, { status: run.status }, statusLabel(tr, run.status)),
						h(
							"span",
							{ className: "mr-run-score" },
							run.score === null || run.score === undefined ? "—" : formatNumber(run.score, 2),
						),
					),
				),
				h(
					"div",
					{ className: "mr-run-meta" },
					h("span", null, tr("mr.detail.runDuration") + " " + formatMs((run.durationMs ?? 0) + (toFiniteNumber(run.retryDurationMs, 0) ?? 0))),
					h("span", null, tr("mr.detail.taskCost") + " " + formatUsd(runTotalCost)),
					typeof run.score100 === "number" && Number.isFinite(run.score100) && run.score !== null && run.score !== undefined
						? h(
							"span",
							null,
							tr("mr.detail.scale", {
								score100: formatNumber(run.score100, 2),
								score: formatNumber(run.score, 2),
								max: formatNumber(run.maxScore, 1),
							}),
						)
						: null,
					retries > 0 ? h("span", { className: "mr-run-retries" }, tr("mr.detail.retries", { count: retries })) : null,
					h("span", { className: "mr-run-session" }, tr("mr.detail.session") + ": " + (typeof run.sessionId === "string" && run.sessionId !== "" ? run.sessionId : tr("mr.detail.sessionEmpty"))),
				),
				judge !== null && typeof judge.reason === "string" && judge.reason !== ""
					? h(
						"div",
						{ className: "mr-run-block" },
						h("div", { className: "mr-run-block-title" }, tr("mr.detail.reason")),
						h("pre", { className: "mr-pre mr-reason" }, judge.reason),
						typeof judge.attempts === "number" && judge.attempts > 1
							? h("div", { className: "mr-muted" }, tr("mr.detail.attempts", { count: judge.attempts }))
							: null,
					)
					: null,
				h(
					"div",
					{ className: "mr-run-block" },
					h("div", { className: "mr-run-block-title" }, tr("mr.detail.answer", { limit: ANSWER_EXCERPT_LIMIT })),
					excerpt.text === ""
						? h("div", { className: "mr-muted" }, tr("mr.detail.answerEmpty"))
						: h("pre", { className: "mr-pre mr-answer" }, excerpt.text),
					excerpt.truncated ? h("div", { className: "mr-muted" }, tr("mr.detail.answerTruncated", { limit: ANSWER_EXCERPT_LIMIT })) : null,
				),
				h(
					"div",
					{ className: "mr-run-block" },
					h("div", { className: "mr-run-block-title" }, tr("mr.detail.files")),
					files.length === 0
						? h("div", { className: "mr-muted" }, tr("mr.detail.filesEmpty"))
						: h(
							"div",
							{ className: "mr-file-chips" },
							files.map((file) =>
								h(
									"span",
									{ className: "mr-file-chip", key: String(file.name), title: String(file.name) },
									file.primary === true ? h("span", { className: "mr-file-primary", "aria-hidden": true }) : null,
									h("span", { className: "mr-file-name" }, String(file.name)),
									h("span", { className: "mr-file-size" }, formatBytes(file.bytes)),
								),
							),
						),
				),
				detail.grade !== null && typeof detail.grade === "object" && typeof detail.grade.cap === "number" && detail.grade.cap < 100 && typeof detail.grade.score100 === "number"
					? h(
						"div",
						{ className: "mr-muted" },
						tr("mr.detail.completionCap", {
							raw: formatNumber(detail.grade.score100, 2),
							cap: formatNumber(detail.grade.cap, 0),
							final: formatNumber(detail.grade.final100 ?? detail.grade.score100, 2),
						}),
					)
					: null,
				detail.isolation !== null && typeof detail.isolation === "object" && detail.isolation.audited === true
					? h(
						"div",
						{ className: "mr-run-block" },
						h("div", { className: "mr-run-block-title" }, tr("mr.isolation.title")),
						h(
							"div",
							{ className: "mr-inline-note" + (detail.isolation.verdict === "suspect" ? " is-warn" : "") },
							detail.isolation.verdict === "suspect"
								? tr("mr.isolation.suspect", {
									count: Array.isArray(detail.isolation.violations) ? detail.isolation.violations.length : 0,
								})
								: detail.isolation.verdict === "blocked"
									? tr("mr.isolation.blocked", {
										count: toFiniteNumber(detail.isolation.blocked, 0) ?? 0,
									})
									: tr("mr.isolation.clean", { count: toFiniteNumber(detail.isolation.inspected, 0) ?? 0 }),
						),
						detail.isolation.verdict === "suspect" || detail.isolation.verdict === "blocked"
							? h(
								"pre",
								{ className: "mr-pre mr-reason" },
								(Array.isArray(detail.isolation.violations) ? detail.isolation.violations : [])
									.map((violation) => (violation.blocked === true ? tr("mr.isolation.tagBlocked") : tr("mr.isolation.tagAllowed")) + " " + violation.tool + " · " + violation.reason + " · " + violation.excerpt)
									.join("\n"),
							)
							: null,
					)
					: null,
				usage !== null || judgeCost !== null
					? h(
						"div",
						{ className: "mr-run-block" },
						h("div", { className: "mr-run-block-title" }, tr("mr.detail.usage")),
						usage === null
							? h("div", { className: "mr-muted" }, tr("mr.common.none"))
							: h(
								"div",
								{ className: "mr-usage-line" },
								tr("mr.detail.usageValue", {
									input: formatInt(usage.inputTokens),
									output: formatInt(usage.outputTokens),
									cacheRead: formatInt(usage.cacheReadTokens),
								}),
							),
						judgeCost === null ? null : h("div", { className: "mr-muted" }, tr("mr.detail.judgeCost") + " " + formatUsd(judgeCost)),
					)
					: null,
				detail.grade !== undefined || detail.formatError
					? h(
						"div",
						{ className: "mr-run-block" },
						h("div", { className: "mr-run-block-title" }, tr("mr.detail.grade")),
						detail.formatError ? h("div", { className: "mr-run-warn" }, tr("mr.detail.formatError") + ": " + String(detail.formatError)) : null,
						h(GradeDetails, { tr, grade: detail.grade }),
					)
					: null,
				detail.imageSkipped === true ? h("div", { className: "mr-inline-note is-warn mr-run-note" }, tr("mr.detail.imageSkipped")) : null,
				run.error !== null && run.error !== undefined
					? h(
						"div",
						{ className: "mr-run-error" },
						h(AlertIcon, { size: 13 }),
						h("span", null, tr("mr.detail.error") + ": " + String(run.error.code ?? "") + " " + String(run.error.message ?? "")),
					)
					: null,
				run.status === "judge_error"
					? h("div", { className: "mr-run-warn" }, tr("mr.detail.judgeError") + (judge?.error ? ": " + String(judge.error) : ""))
					: null,
			);
		}

		function prettyArtifactJson(text) {
		    try {
		        return JSON.stringify(JSON.parse(text), null, 2);
		    } catch {
		        return text;
		    }
		}

		function normalizePompeiiEdge(edge) {
			let a = null;
			let b = null;
			if (typeof edge === "string") {
				const parts = edge.split("-");
				if (parts.length !== 2) return null;
				a = parts[0];
				b = parts[1];
			} else if (Array.isArray(edge)) {
				a = edge[0];
				b = edge[1];
			} else if (edge !== null && typeof edge === "object") {
				a = edge.a;
				b = edge.b;
			}
			if (typeof a !== "string" || typeof b !== "string") return null;
			a = a.trim().toUpperCase();
			b = b.trim().toUpperCase();
			if (!POMPEII_LABELS.has(a) || !POMPEII_LABELS.has(b) || a === b) return null;
			return a < b ? a + "-" + b : b + "-" + a;
		}

		function normalizePompeiiEdges(rawEdges) {
			if (!Array.isArray(rawEdges)) return [];
			const seen = new Set();
			for (const edge of rawEdges) {
				const normalized = normalizePompeiiEdge(edge);
				if (normalized !== null) seen.add(normalized);
			}
			return [...seen];
		}

		function pompeiiAnswerOf(run) {
			const grade = run?.detail?.grade;
			const gradeEdges = normalizePompeiiEdges(grade?.answer?.edges);
			if (gradeEdges.length > 0) return { edges: gradeEdges, source: "grade" };
			const rawText = run?.detail?.answerText;
			if (typeof rawText === "string" && rawText.trim() !== "") {
				const text = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
				try {
					const parsed = JSON.parse(text);
					const textEdges = normalizePompeiiEdges(parsed?.edges);
					if (textEdges.length > 0) return { edges: textEdges, source: "text" };
				} catch {
					// fall through to the invalid-answer state
				}
			}
			return { edges: [], source: "none" };
		}

		function PompeiiPanel(props) {
			const tr = props.tr;
			const run = props.run;
			const pompeii = props.meta?.pompeii ?? null;
			const nodes = Array.isArray(pompeii?.nodes)
				? pompeii.nodes.filter((node) => node !== null && typeof node === "object" && POMPEII_LABELS.has(String(node.label).toUpperCase()))
				: [];
			const nodeMap = new Map(nodes.map((node) => [String(node.label).toUpperCase(), node]));
			const goldEdges = normalizePompeiiEdges(pompeii?.goldEdges);
			const goldSet = new Set(goldEdges);
			const answer = pompeiiAnswerOf(run);
			const answerSet = new Set(answer.edges);
			const correctEdges = [...answerSet].filter((edge) => goldSet.has(edge));
			const incorrectEdges = [...answerSet].filter((edge) => !goldSet.has(edge));
			const missingEdges = goldEdges.filter((edge) => !answerSet.has(edge));
			const grade = run?.detail?.grade ?? {};
			const rawScore = toFiniteNumber(run?.score, null);
			const score = rawScore === null ? toFiniteNumber(grade.score, 0) ?? 0 : rawScore;
			const maxScore = toFiniteNumber(grade.maxScore, 45) ?? 45;
			const denominator = 2 * correctEdges.length + incorrectEdges.length + missingEdges.length;
			const computedF1 = denominator === 0 ? 0 : (2 * correctEdges.length) / denominator;
			const gradeF1 = toFiniteNumber(grade.f1, null);
			const f1 = gradeF1 === null ? computedF1 : gradeF1;
			const hasMeta = nodes.length > 0 && goldEdges.length > 0;
			const assets = pompeii?.assets ?? {};
			const questionAsset = typeof assets.question === "string" && assets.question !== "" ? assets.question : null;
			const referenceAsset = typeof assets.reference === "string" && assets.reference !== "" ? assets.reference : null;

			const edgeLine = (edge, kind, index) => {
				const parts = edge.split("-");
				const from = nodeMap.get(parts[0]);
				const to = nodeMap.get(parts[1]);
				if (from === undefined || to === undefined) return null;
				const key = kind + "-" + edge + "-" + String(index);
				const common = {
					x1: from.x,
					y1: from.y,
					x2: to.x,
					y2: to.y,
					strokeLinecap: "round",
				};
				if (kind === "missing") {
					return h("line", {
						...common,
						key,
						stroke: "var(--dsw-alias-label-secondary)",
						strokeWidth: 1.5,
						strokeDasharray: "6 5",
						opacity: 0.55,
					});
				}
				if (kind === "correct") {
					return h("line", {
						...common,
						key,
						stroke: "var(--dsw-alias-state-success-primary)",
						strokeWidth: 2,
					});
				}
				const midX = (from.x + to.x) / 2;
				const midY = (from.y + to.y) / 2;
				return h(
					React.Fragment,
					{ key },
					h("line", {
						...common,
						stroke: "var(--dsw-alias-state-error-primary)",
						strokeWidth: 2,
					}),
					h("circle", {
						cx: midX,
						cy: midY,
						r: 8,
						fill: "var(--dsw-alias-bg-layer-1)",
					}),
					h(
						"text",
						{
							x: midX,
							y: midY,
							dy: "0.35em",
							textAnchor: "middle",
							fill: "var(--dsw-alias-state-error-primary)",
							fontSize: 17,
							fontWeight: 700,
						},
						"×",
					),
				);
			};

			const graph = hasMeta
				? h(
					"div",
					{ className: "mr-pompeii-graph" },
					h("div", { className: "mr-pompeii-graph-title" }, tr("mr.pompeii.graphTitle")),
					h(
						"svg",
						{
							className: "mr-pompeii-svg",
							viewBox: "-45 -45 1000 520",
							role: "img",
							"aria-label": tr("mr.pompeii.graphTitle"),
						},
						missingEdges.map((edge, index) => edgeLine(edge, "missing", index)),
						correctEdges.map((edge, index) => edgeLine(edge, "correct", index)),
						incorrectEdges.map((edge, index) => edgeLine(edge, "incorrect", index)),
						nodes.map((node) =>
							h(
								"g",
								{ key: "node-" + String(node.label) },
								h("circle", {
									cx: node.x,
									cy: node.y,
									r: 30,
									fill: "var(--dsw-alias-bg-layer-1)",
									stroke: "var(--dsw-alias-border-l2)",
									strokeWidth: 1.5,
								}),
								h(
									"text",
									{
										x: node.x,
										y: node.y,
										dy: "0.35em",
										textAnchor: "middle",
										fill: "var(--dsw-alias-label-primary)",
										fontSize: 15,
										fontWeight: 700,
									},
									String(node.label).toUpperCase(),
								),
							),
						),
					),
				)
				: h("div", { className: "mr-inline-note is-warn" }, tr("mr.pompeii.noMeta"));

			const assetCard = (src, label, key) => src === null
				? null
				: h(
					"a",
					{
						className: "mr-pompeii-asset",
						key,
						href: src,
						target: "_blank",
						rel: "noopener noreferrer",
						"aria-label": tr("mr.pompeii.openImage", { name: label }),
					},
					h("span", { className: "mr-pompeii-asset-label" }, label),
					h("img", {
						className: "mr-pompeii-image",
						src,
						alt: label,
						loading: "lazy",
						decoding: "async",
					}),
				);

			return h(
				"section",
				{ className: "mr-pompeii-panel" },
				h(
					"div",
					{ className: "mr-pompeii-head" },
					h("div", null,
						h("h3", { className: "mr-pompeii-title" }, tr("mr.pompeii.title")),
						h("div", { className: "mr-pompeii-sub" }, tr("mr.pompeii.subtitle")),
					),
				),
				h(
					"div",
					{ className: "mr-pompeii-summary" },
					h(
						"span",
						{ className: "mr-pompeii-score" },
						h("span", { className: "mr-pompeii-stat-label" }, tr("mr.pompeii.score")),
						h("strong", { className: "mr-mono" }, formatNumber(score, 2)),
						h("span", { className: "mr-pompeii-max" }, "/ " + formatNumber(maxScore, 0)),
					),
					h(
						"span",
						{ className: "mr-pompeii-f1" },
						h("span", { className: "mr-pompeii-stat-label" }, tr("mr.pompeii.f1")),
						h("strong", { className: "mr-mono" }, formatNumber(f1, 3)),
					),
					h("span", { className: "mr-pompeii-count is-correct" }, "✓ " + tr("mr.pompeii.correct") + " " + String(correctEdges.length)),
					h("span", { className: "mr-pompeii-count is-incorrect" }, "× " + tr("mr.pompeii.incorrect") + " " + String(incorrectEdges.length)),
					h("span", { className: "mr-pompeii-count is-missing" }, "⋯ " + tr("mr.pompeii.missing") + " " + String(missingEdges.length)),
				),
				answer.source === "none"
					? h("div", { className: "mr-inline-note is-warn" }, tr("mr.pompeii.noAnswer"))
					: null,
				graph,
				hasMeta
					? h(
						"div",
						{ className: "mr-pompeii-legend" },
						h("span", { className: "is-correct" }, "✓ " + tr("mr.pompeii.correct") + " " + String(correctEdges.length)),
						h("span", { className: "is-incorrect" }, "× " + tr("mr.pompeii.incorrect") + " " + String(incorrectEdges.length)),
						h("span", { className: "is-missing" }, "⋯ " + tr("mr.pompeii.missing") + " " + String(missingEdges.length)),
					)
					: null,
				questionAsset === null && referenceAsset === null
					? null
					: h(
						"div",
						{ className: "mr-pompeii-images" },
						assetCard(questionAsset, tr("mr.pompeii.questionImage"), "question"),
						assetCard(referenceAsset, tr("mr.pompeii.referenceImage"), "reference"),
					),
			);
		}

		function ArtifactModal(props) {
		    const tr = props.tr;
		    const run = props.run;
		    const artifactEntry = props.combo ?? run;
		    const artifactModelName = artifactEntry?.modelName ?? artifactEntry?.model ?? "—";
		    const pompeiiPanel = run?.taskId === "pompeii"
		        ? h(PompeiiPanel, { tr, run, meta: props.meta })
		        : null;
		    const files = Array.isArray(run?.files) ? run.files : [];
		    const orderedFiles = [...files].sort((left, right) => (right.primary === true ? 1 : 0) - (left.primary === true ? 1 : 0));
		    const initialName = () => {
		        if (typeof props.initialFile === "string" && orderedFiles.some((file) => String(file.name) === props.initialFile)) {
		            return props.initialFile;
		        }
		        return orderedFiles[0] === undefined ? "" : String(orderedFiles[0].name);
		    };
		    const [activeName, setActiveName] = React.useState(initialName);
		    const activeFile = orderedFiles.find((file) => String(file.name) === activeName) ?? orderedFiles[0] ?? null;
		    const [tab, setTab] = React.useState("preview");
		    const [text, setText] = React.useState({ status: "idle", text: "", truncated: false, error: null });
		    const [imageError, setImageError] = React.useState(false);
		    const [frameError, setFrameError] = React.useState(false);
		    const panelRef = React.useRef(null);
		    const kind = activeFile === null ? "other" : artifactKindOf(activeFile.name);
		    const sourceable = activeFile !== null && artifactSupportsSource(activeFile.name);
		    const url = activeFile === null ? "" : artifactUrlOf(props.batchId, run, activeFile.name);
		    const textNeeded = activeFile !== null && (kind === "json" || kind === "text" || (tab === "source" && sourceable));

		    React.useEffect(() => {
		        if (activeFile !== null && String(activeFile.name) === activeName) return;
		        const next = orderedFiles[0] === undefined ? "" : String(orderedFiles[0].name);
		        if (next !== activeName) setActiveName(next);
		    }, [activeName, activeFile, orderedFiles]);

		    React.useEffect(() => {
		        setTab("preview");
		        setText({ status: "idle", text: "", truncated: false, error: null });
		        setImageError(false);
		        setFrameError(false);
		    }, [activeName]);

		    React.useEffect(() => {
		        if (!textNeeded || activeFile === null) return undefined;
		        let cancelled = false;
		        setText({ status: "loading", text: "", truncated: false, error: null });
		        fetchArtifactText(url)
		            .then((result) => {
		                if (cancelled) return;
		                setText({ status: "ready", text: result.text, truncated: result.truncated, error: null });
		            })
		            .catch((error) => {
		                if (cancelled) return;
		                setText({ status: "error", text: "", truncated: false, error });
		            });
		        return () => {
		            cancelled = true;
		        };
		    }, [activeFile, textNeeded, url]);

		    React.useEffect(() => {
		        const onKeyDown = (event) => {
		            if (event.key === "Escape") {
		                event.preventDefault();
		                event.stopPropagation();
		                props.onClose();
		            }
		        };
		        window.addEventListener("keydown", onKeyDown, true);
		        return () => window.removeEventListener("keydown", onKeyDown, true);
		    }, [props.onClose]);

		    React.useEffect(() => {
		        if (panelRef.current !== null) panelRef.current.focus();
		    }, []);

		    const openNewLink = () => activeFile === null
		        ? null
		        : h(
		            "a",
		            {
		                className: "mr-btn is-ghost mr-btn-small",
		                href: url,
		                target: "_blank",
		                rel: "noopener noreferrer",
		            },
		            tr("mr.artifact.openNew"),
		        );
		    const textBody = (pretty) => {
		        if (text.status === "loading" || text.status === "idle") {
		            return h("div", { className: "mr-artifact-loading" }, tr("mr.artifact.loading"));
		        }
		        if (text.status === "error") {
		            return h(
		                "div",
		                { className: "mr-error-box" },
		                h(AlertIcon, { size: 15 }),
		                h(
		                    "div",
		                    null,
		                    h("div", { className: "mr-error-title" }, tr("mr.artifact.error")),
		                    h("div", { className: "mr-error-detail" }, errorMessageOf(text.error)),
		                ),
		                openNewLink(),
		            );
		        }
		        return h(
		            React.Fragment,
		            null,
		            text.truncated
		                ? h("div", { className: "mr-inline-note is-warn" }, tr("mr.artifact.truncated", { limit: "200 KB" }))
		                : null,
		            h("pre", { className: "mr-artifact-pre" }, pretty ? prettyArtifactJson(text.text) : text.text),
		        );
		    };

		    const preview = () => {
		        if (activeFile === null) return h("div", { className: "mr-muted" }, tr("mr.artifact.empty"));
		        if (kind === "image") {
		            if (imageError) {
		                return h(
		                    "div",
		                    { className: "mr-error-box" },
		                    h(AlertIcon, { size: 15 }),
		                    h("div", null, h("div", { className: "mr-error-title" }, tr("mr.artifact.imageFailed"))),
		                    openNewLink(),
		                );
		            }
		            return h("div", { className: "mr-artifact-image-wrap" },
		                h("img", {
		                    className: "mr-artifact-image",
		                    src: url,
		                    alt: tr("mr.artifact.imageAlt", { file: String(activeFile.name) }),
		                    onError: () => setImageError(true),
		                }),
		            );
		        }
		        if (kind === "html") {
		            if (frameError) {
		                return h(
		                    "div",
		                    { className: "mr-error-box" },
		                    h(AlertIcon, { size: 15 }),
		                    h("div", null, h("div", { className: "mr-error-title" }, tr("mr.artifact.previewFailed"))),
		                    openNewLink(),
		                );
		            }
		            return h("iframe", {
		                className: "mr-artifact-iframe",
		                src: url,
		                sandbox: "allow-scripts",
		                title: tr("mr.artifact.dialogLabel"),
		                onError: () => setFrameError(true),
		            });
		        }
		        if (kind === "json") return textBody(true);
		        if (kind === "text") return textBody(false);
		        return h(
		            "div",
		            { className: "mr-error-box" },
		            h(AlertIcon, { size: 15 }),
		            h("div", null, h("div", { className: "mr-error-title" }, tr("mr.artifact.unsupported"))),
		            openNewLink(),
		        );
		    };

		    const body = tab === "source" && sourceable ? textBody(false) : preview();
		    return h(
		        "div",
		        { className: "mr-artifact-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.artifact.dialogLabel") },
		        h("div", { className: "mr-artifact-backdrop", onClick: props.onClose, "aria-hidden": true }),
		        h(
		            "div",
		            { className: "mr-artifact-modal", ref: panelRef, tabIndex: -1 },
		            h(
		                "header",
		                { className: "mr-artifact-head" },
		                h(
		                    "div",
		                    { className: "mr-artifact-head-main" },
		                    h("div", { className: "mr-artifact-kicker" }, tr("mr.artifact.title")),
		                    h(
		                        "h2",
		                        { className: "mr-artifact-title" },
		                        h("span", { className: "mr-model-strong" }, artifactModelName),
		                        h("span", { className: "mr-selection-dot" }, " · "),
		                        h(EffortPill, { tr, entry: artifactEntry }),
		                        h("span", { className: "mr-selection-dot" }, " · "),
		                        taskName(tr, run?.taskId),
		                    ),
		                    activeFile === null
		                        ? null
		                        : h("div", { className: "mr-artifact-file-meta mr-mono" }, String(activeFile.name) + " · " + formatBytes(activeFile.bytes)),
		                ),
		                h(
		                    "div",
		                    { className: "mr-artifact-head-right" },
		                    h(
		                        "button",
		                        { type: "button", className: "mr-icon-btn", onClick: props.onClose, "aria-label": tr("mr.aria.close") },
		                        h(CloseIcon, { size: 14 }),
		                    ),
		                ),
		            ),
		            orderedFiles.length > 1
		                ? h(
		                    "div",
		                    { className: "mr-artifact-files", role: "tablist", "aria-label": tr("mr.detail.files") },
		                    orderedFiles.map((file) =>
		                        h(
		                            "button",
		                            {
		                                type: "button",
		                                key: String(file.name),
		                                role: "tab",
		                                "aria-selected": activeFile !== null && String(file.name) === String(activeFile.name),
		                                className: "mr-artifact-file" + (activeFile !== null && String(file.name) === String(activeFile.name) ? " is-active" : ""),
		                                onClick: () => setActiveName(String(file.name)),
		                                title: file.primary === true ? tr("mr.artifact.primary") : String(file.name),
		                            },
		                            file.primary === true ? h("span", { className: "mr-file-primary", "aria-hidden": true }) : null,
		                            h("span", { className: "mr-artifact-file-name" }, String(file.name)),
		                            h("span", { className: "mr-artifact-file-size" }, formatBytes(file.bytes)),
		                        ),
		                    ),
		                )
		                : null,
		            h(
		                "div",
		                { className: "mr-artifact-tabs", role: "tablist", "aria-label": tr("mr.artifact.title") },
		                h(
		                    "button",
		                    {
		                        type: "button",
		                        role: "tab",
		                        "aria-selected": tab === "preview",
		                        className: "mr-artifact-tab" + (tab === "preview" ? " is-active" : ""),
		                        onClick: () => setTab("preview"),
		                    },
		                    tr("mr.artifact.preview"),
		                ),
		                sourceable
		                    ? h(
		                        "button",
		                        {
		                            type: "button",
		                            role: "tab",
		                            "aria-selected": tab === "source",
		                            className: "mr-artifact-tab" + (tab === "source" ? " is-active" : ""),
		                            onClick: () => setTab("source"),
		                        },
		                        tr("mr.artifact.source"),
		                    )
		                    : null,
		            ),
		            h("div", { className: "mr-artifact-body" }, pompeiiPanel, body),
		            h(
		                "footer",
		                { className: "mr-artifact-foot" },
		                openNewLink(),
		                h("button", { type: "button", className: "mr-btn is-ghost", onClick: props.onClose }, tr("mr.common.close")),
		            ),
		        ),
		    );
		}
		function ComboSummaryBar(props) {
			const tr = props.tr;
			const combo = props.combo;
			const batch = props.batch;
			const catalog = props.catalog;
			const cost = combo?.costUsd == null && combo?.judgeCostUsd == null
				? null
				: (toFiniteNumber(combo?.costUsd, 0) ?? 0) + (toFiniteNumber(combo?.judgeCostUsd, 0) ?? 0);
			const speed = speedMetricsOf(speedRecordOf(batch, combo?.key));
			const context = contextWindowOf(catalog, combo?.provider, combo?.model);
			const providerName = combo?.providerName ?? combo?.provider ?? "—";
			const missing = Array.isArray(combo?.missing) ? combo.missing : [];
			return h(
				"div",
				{ className: "mr-combo-summary mr-combo-summary-bar" },
				h(
					"div",
					{ className: "mr-combo-summary-main" },
					h(
						"div",
						{ className: "mr-combo-summary-name" },
						h("span", { className: "mr-combo-provider" }, providerName),
						h("span", { className: "mr-selection-dot" }, " · "),
						h("span", { className: "mr-model-strong" }, combo?.modelName ?? combo?.model ?? "—"),
						h("span", { className: "mr-selection-dot" }, " · "),
						h(EffortPill, { tr, entry: combo }),
					),
					h(
						"div",
						{ className: "mr-combo-summary-sub" },
						tr("mr.detail.combo") + " · " + statusLabel(tr, combo?.status)
							+ (context === null ? "" : " · " + tr("mr.detail.context", { value: context })),
					),
					h(
						"div",
						{ className: "mr-combo-task-scores" },
						TASKS.map((task) =>
							h(
								"span",
								{ className: "mr-combo-task-score", key: task.id },
								h("span", { className: "mr-combo-task-name" }, taskName(tr, task.id)),
								h("span", { className: "mr-combo-task-value mr-mono" }, formatNumber(combo?.scores?.[task.id], 2)),
							),
						),
					),
				),
				h(
					"div",
					{ className: "mr-combo-summary-side" },
					h(
						"div",
						{ className: "mr-combo-summary-score" },
						h("span", { className: "mr-combo-total mr-num" }, combo?.total === null || combo?.total === undefined ? "—" : formatNumber(combo.total, 2)),
						h("span", { className: "mr-combo-total-max" }, "/ " + formatNumber(combo?.maxScore ?? 150, 0)),
					),
					h(
						"div",
						{ className: "mr-combo-summary-meta" },
						h("span", { title: tr("mr.detail.comboCost") }, tr("mr.detail.comboCost") + " " + formatUsd(cost)),
						h("span", { title: tr("mr.detail.comboDuration") }, tr("mr.detail.comboDuration") + " " + formatMs(combo?.durationMs)),
						speed.tps === null && speed.ttft === null
							? null
							: h(
								"span",
								{ className: "mr-combo-speed mr-mono" },
								"TPS " + (speed.tps === null ? "—" : formatNumber(speed.tps, 1))
									+ " · TTFT " + (speed.ttft === null ? "—" : formatMs(speed.ttft)),
							),
						h(
							"span",
							{ title: tr("mr.detail.completeness") },
							combo?.complete === true
								? tr("mr.detail.complete")
								: missing.length > 0
									? tr("mr.detail.missing", { tasks: missing.map((id) => taskName(tr, id)).join(tr("mr.common.listSeparator")) })
									: "—",
						),
					),
				),
			);
		}

		// ── model / batch detail drawer ─────────────────────────────────────

		function modelTaskRunsOf(batch, comboKey) {
			const runs = Array.isArray(batch?.runs) ? batch.runs : [];
			return runs
				.filter((run) => run !== null && typeof run === "object" && run.comboKey === comboKey)
				.sort((left, right) => {
					const leftIndex = TASKS.findIndex((task) => task.id === left.taskId);
					const rightIndex = TASKS.findIndex((task) => task.id === right.taskId);
					return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
				});
		}

		function modelTaskRunOf(runs, taskId) {
			return (Array.isArray(runs) ? runs : []).find((run) => run !== null && run !== undefined && run.taskId === taskId) ?? null;
		}

		function modelRunTotalCostOf(run) {
			if (run === null || run === undefined) return null;
			const cost = toFiniteNumber(run.cost?.usd, null);
			const judgeCost = toFiniteNumber(run.judgeCost?.usd, null);
			const retryCost = toFiniteNumber(run.retryCostUsd, 0) ?? 0;
			const retryJudgeCost = toFiniteNumber(run.retryJudgeCostUsd, 0) ?? 0;
			if (cost === null && judgeCost === null && retryCost === 0 && retryJudgeCost === 0) return null;
			return (cost ?? 0) + (judgeCost ?? 0) + retryCost + retryJudgeCost;
		}

		function modelRetryCountOf(run) {
			if (run === null || run === undefined || !Array.isArray(run.attempts)) return 0;
			return run.attempts.filter((attempt) => attempt !== null && typeof attempt === "object" && attempt.kind !== "rerun").length;
		}

		function ModelArtifactPreview(props) {
			const tr = props.tr;
			const batchId = props.batchId;
			const run = props.run;
			const meta = props.meta;
			const onOpenArtifact = typeof props.onOpenArtifact === "function" ? props.onOpenArtifact : null;
			const files = Array.isArray(run?.files) ? run.files : [];
			const primaryFile = files.find((file) => file?.primary === true) ?? files[0] ?? null;
			const [sourceMode, setSourceMode] = React.useState(false);
			const [textState, setTextState] = React.useState({ status: "idle", text: "", truncated: false, error: null });
			const fileName = primaryFile === null ? "" : String(primaryFile.name);
			const kind = artifactKindOf(fileName);
			const url = primaryFile === null ? "" : artifactUrlOf(batchId, run, fileName);
			const isPompeii = run?.taskId === "pompeii" && meta?.pompeii !== null && meta?.pompeii !== undefined;
			const sourceable = primaryFile !== null && artifactSupportsSource(fileName);
			React.useEffect(() => {
				if (!sourceMode || primaryFile === null || kind === "image" || kind === "html") return undefined;
				let alive = true;
				setTextState({ status: "loading", text: "", truncated: false, error: null });
				fetchArtifactText(url)
					.then((result) => {
						if (!alive) return;
						setTextState({ status: "ready", text: result.text, truncated: result.truncated === true, error: null });
					})
					.catch((error) => {
						if (!alive) return;
						setTextState({ status: "error", text: "", truncated: false, error });
					});
				return () => {
					alive = false;
				};
			}, [sourceMode, url, primaryFile, kind]);
			if (files.length === 0) {
				return h("div", { className: "mr-md-empty" }, tr("mr.artifact.empty"));
			}
			const openInNew = () => {
				if (primaryFile === null) return;
				window.open(url, "_blank", "noopener");
			};
			const preview = () => {
				if (primaryFile === null) return h("div", { className: "mr-muted" }, tr("mr.artifact.empty"));
				if (sourceMode && sourceable) {
					if (textState.status === "loading") return h("div", { className: "mr-muted" }, tr("mr.artifact.loading"));
					if (textState.status === "error") {
						return h(
							"div",
							{ className: "mr-error-box" },
							h(AlertIcon, { size: 14 }),
							h("div", { className: "mr-error-detail" }, errorMessageOf(textState.error)),
						);
					}
					return h("pre", { className: "mr-artifact-pre" }, kind === "json" ? prettyArtifactJson(textState.text) : textState.text);
				}
				if (kind === "image") {
					return h("img", {
						className: "mr-artifact-image",
						src: url,
						alt: tr("mr.artifact.imageAlt", { file: fileName }),
						loading: "lazy",
					});
				}
				if (kind === "html") {
					return h("iframe", {
						className: "mr-artifact-iframe",
						src: url,
						title: tr("mr.artifact.preview"),
						sandbox: "allow-scripts allow-pointer-lock",
						loading: "lazy",
					});
				}
				if (kind === "json" || kind === "text") {
					if (textState.status === "idle") {
						return h(
							"button",
							{
								type: "button",
								className: "mr-btn is-ghost mr-btn-small",
								onClick: () => setSourceMode(true),
							},
							tr("mr.artifact.preview"),
						);
					}
					if (textState.status === "loading") return h("div", { className: "mr-muted" }, tr("mr.artifact.loading"));
					if (textState.status === "error") {
						return h(
							"div",
							{ className: "mr-error-box" },
							h(AlertIcon, { size: 14 }),
							h("div", { className: "mr-error-detail" }, errorMessageOf(textState.error)),
						);
					}
					return h("pre", { className: "mr-artifact-pre" }, kind === "json" ? prettyArtifactJson(textState.text) : textState.text);
				}
				return h("div", { className: "mr-inline-note" }, tr("mr.artifact.unsupported"));
			};
			return h(
				"div",
				{ className: "mr-md-artifacts" },
				h(
					"div",
					{ className: "mr-md-artifacts-head" },
					h("div", { className: "mr-md-artifacts-title" }, h(EyeIcon, { size: 12 }), tr("mr.detail.artifactPreview")),
					h(
						"div",
						{ className: "mr-md-artifacts-actions" },
						sourceable
							? h(
								"button",
								{
									type: "button",
									className: "mr-md-mode-btn" + (sourceMode ? " is-active" : ""),
									onClick: () => setSourceMode((current) => !current),
								},
								sourceMode ? tr("mr.artifact.preview") : tr("mr.artifact.source"),
							)
							: null,
						h(
							"button",
							{ type: "button", className: "mr-md-mode-btn", onClick: openInNew },
							tr("mr.artifact.openNew"),
						),
						onOpenArtifact === null
							? null
							: h(
								"button",
								{
									type: "button",
									className: "mr-md-mode-btn is-primary",
									onClick: () => onOpenArtifact(run, primaryFile === null ? null : fileName),
								},
								h(EyeIcon, { size: 11 }),
								tr("mr.artifact.open"),
							),
					),
				),
				files.length > 1
					? h(
						"div",
						{ className: "mr-md-filechips" },
						files.map((file) => h(
							"button",
							{
								type: "button",
								key: String(file.name),
								className: "mr-md-filechip" + (primaryFile !== null && file.name === primaryFile.name ? " is-active" : ""),
								onClick: () => {
									if (onOpenArtifact !== null) onOpenArtifact(run, String(file.name));
								},
								title: String(file.name),
							},
							h("span", { className: "mr-md-filechip-name" }, String(file.name)),
							h("span", { className: "mr-md-filechip-size" }, formatBytes(file.bytes)),
						)),
					)
					: null,
				isPompeii ? h(PompeiiPanel, { tr, run, meta }) : null,
				h("div", { className: "mr-md-preview" }, preview()),
			);
		}

		function ModelTaskPanel(props) {
			const tr = props.tr;
			const batch = props.batch;
			const combo = props.combo;
			const task = props.task;
			const run = props.run;
			const [answerFull, setAnswerFull] = React.useState(false);
			const onRequestRerun = typeof props.onRequestRerun === "function" ? props.onRequestRerun : null;
			if (run === null) {
				return h(
					"div",
					{ className: "mr-md-task" },
					h(
						"div",
						{ className: "mr-md-task-head" },
						h("div", { className: "mr-md-task-title" }, taskName(tr, task.id)),
						h("span", { className: "mr-muted" }, tr("mr.detail.taskNoRun")),
					),
					onRequestRerun === null
						? null
						: h(
							"div",
							{ className: "mr-md-task-foot" },
							h(
								"button",
								{
									type: "button",
									className: "mr-btn is-primary mr-btn-small",
									onClick: () => onRequestRerun({ comboKeys: [combo.key], taskIds: [task.id] }),
								},
								h(PlayIcon, { size: 11 }),
								tr("mr.detail.rerunTask"),
							),
						),
				);
			}
			const detail = run.detail ?? {};
			const judge = detail.judge ?? null;
			const answer = typeof detail.finalText === "string" && detail.finalText !== ""
				? detail.finalText
				: typeof detail.answerText === "string"
					? detail.answerText
					: "";
			const excerpt = excerptOf(answer);
			const retries = modelRetryCountOf(run);
			const cost = modelRunTotalCostOf(run);
			const duration = (run.durationMs ?? 0) + (toFiniteNumber(run.retryDurationMs, 0) ?? 0);
			const reasonText = judge !== null && typeof judge.reason === "string" ? judge.reason : "";
			return h(
				"div",
				{ className: "mr-md-task" },
				h(
					"div",
					{ className: "mr-md-task-head" },
					h(
						"div",
						{ className: "mr-md-task-title" },
						h("span", { className: "mr-md-task-name" }, taskName(tr, task.id)),
						h("span", { className: "mr-md-task-max" }, "/ " + formatNumber(task.maxScore, task.maxScore % 1 === 0 ? 0 : 1)),
						h(Tag, { status: run.status }, statusLabel(tr, run.status)),
						typeof run.score100 === "number" && run.score !== null && run.score !== undefined
							? h("span", { className: "mr-md-task-scale mr-mono" }, formatNumber(run.score100, 1))
							: null,
						toFiniteNumber(run.rerunCount, 0) > 0
							? h("span", { className: "mr-md-rerun-badge" }, tr("mr.detail.rerunCount", { count: toFiniteNumber(run.rerunCount, 0) }))
							: null,
					),
					h(
						"div",
						{ className: "mr-md-task-score" },
						h("span", { className: "mr-md-task-score-value mr-mono" }, run.score === null || run.score === undefined ? "—" : formatNumber(run.score, 2)),
						h("span", { className: "mr-md-task-score-unit" }, "/ " + formatNumber(task.maxScore, task.maxScore % 1 === 0 ? 0 : 1)),
					),
				),
				h(
					"div",
					{ className: "mr-detail-meta is-tight" },
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.runDuration")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatMs(duration)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.taskCost")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatUsd(cost)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.matrix.cellTitle", { batch: "", status: "", time: "", score: "" }).length > 0 ? tr("mr.detail.session") : tr("mr.detail.session")),
						h("span", { className: "mr-detail-meta-value mr-mono mr-ellipsis", title: run.sessionId ?? "" }, typeof run.sessionId === "string" && run.sessionId !== "" ? run.sessionId : tr("mr.detail.sessionEmpty")),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.retriesLabel")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, retries > 0 ? String(retries) : "0"),
					),
				),
				run.files !== undefined && Array.isArray(run.files) && run.files.length > 0
					? h(ModelArtifactPreview, {
						tr,
						batchId: batch.id,
						run,
						meta: props.meta,
						onOpenArtifact: props.onOpenArtifact,
					})
					: null,
				reasonText === ""
					? null
					: h(
						"div",
						{ className: "mr-md-block" },
						h("div", { className: "mr-md-block-title" }, tr("mr.detail.reason")),
						h("pre", { className: "mr-pre mr-reason" }, reasonText),
						typeof judge?.attempts === "number" && judge.attempts > 1
							? h("div", { className: "mr-muted" }, tr("mr.detail.attempts", { count: judge.attempts }))
							: null,
					),
				h(
					"div",
					{ className: "mr-md-block" },
					h(
						"div",
						{ className: "mr-md-block-head" },
						h("div", { className: "mr-md-block-title" }, tr("mr.detail.answer", { limit: ANSWER_EXCERPT_LIMIT })),
						excerpt.truncated
							? h(
								"button",
								{ type: "button", className: "mr-md-mode-btn", onClick: () => setAnswerFull((current) => !current) },
								answerFull ? tr("mr.detail.answerHide") : tr("mr.detail.answerShow"),
							)
							: null,
					),
					excerpt.text === ""
						? h("div", { className: "mr-muted" }, tr("mr.detail.answerEmpty"))
						: h("pre", { className: "mr-pre mr-answer" }, answerFull ? answer : excerpt.text),
					excerpt.truncated && !answerFull
						? h("div", { className: "mr-muted" }, tr("mr.detail.answerTruncated", { limit: ANSWER_EXCERPT_LIMIT }))
						: null,
				),
				detail.grade !== null && typeof detail.grade === "object"
					? h(
						"div",
						{ className: "mr-md-block" },
						h("div", { className: "mr-md-block-title" }, tr("mr.detail.grade")),
						detail.grade.cap !== undefined && typeof detail.grade.cap === "number" && detail.grade.cap < 100 && typeof detail.grade.score100 === "number"
							? h("div", { className: "mr-muted" }, tr("mr.detail.completionCap", {
								raw: formatNumber(detail.grade.score100, 2),
								cap: formatNumber(detail.grade.cap, 0),
								final: formatNumber(detail.grade.final100 ?? detail.grade.score100, 2),
							}))
							: null,
						h(GradeDetails, { tr, grade: detail.grade }),
					)
					: null,
				detail.isolation !== null && typeof detail.isolation === "object" && detail.isolation.audited === true
					? h(
						"div",
						{ className: "mr-md-block" },
						h("div", { className: "mr-md-block-title" }, tr("mr.isolation.title")),
						h(
							"div",
							{ className: "mr-inline-note" + (detail.isolation.verdict === "suspect" ? " is-warn" : "") },
							detail.isolation.verdict === "suspect"
								? tr("mr.isolation.suspect", { count: Array.isArray(detail.isolation.violations) ? detail.isolation.violations.length : 0 })
								: detail.isolation.verdict === "blocked"
									? tr("mr.isolation.blocked", { count: toFiniteNumber(detail.isolation.blocked, 0) ?? 0 })
									: tr("mr.isolation.clean", { count: toFiniteNumber(detail.isolation.inspected, 0) ?? 0 }),
						),
					)
					: null,
				detail.imageSkipped === true ? h("div", { className: "mr-inline-note is-warn" }, tr("mr.detail.imageSkipped")) : null,
				run.error !== null && run.error !== undefined
					? h(
						"div",
						{ className: "mr-run-error" },
						h(AlertIcon, { size: 13 }),
						h("span", null, tr("mr.detail.error") + ": " + String(run.error.code ?? "") + " " + String(run.error.message ?? "")),
					)
					: null,
				run.status === "judge_error"
					? h("div", { className: "mr-run-warn" }, tr("mr.detail.judgeError") + (judge?.error ? ": " + String(judge.error) : ""))
					: null,
				h(
					"div",
					{ className: "mr-md-task-foot" },
					onRequestRerun === null
						? null
						: h(
							"button",
							{
								type: "button",
								className: "mr-btn is-ghost mr-btn-small",
								onClick: () => onRequestRerun({ comboKeys: [combo.key], taskIds: [task.id] }),
							},
							h(PlayIcon, { size: 11 }),
							tr("mr.detail.rerunTask"),
						),
					typeof props.onOpenArtifact === "function" && Array.isArray(run.files) && run.files.length > 0
						? h(
							"button",
							{
								type: "button",
								className: "mr-btn is-ghost mr-btn-small",
								onClick: () => props.onOpenArtifact(run, null),
							},
							h(EyeIcon, { size: 11 }),
							tr("mr.artifact.open"),
						)
						: null,
				),
			);
		}

		function ModelDetailView(props) {
			const tr = props.tr;
			const batch = props.batch;
			const combo = props.combo;
			const runs = props.runs;
			const catalog = props.catalog;
			const [taskTab, setTaskTab] = React.useState(() => {
				const wanted = props.initialTaskId ?? null;
				if (wanted !== null && TASK_BY_ID.has(wanted)) return wanted;
				const run = runs.find((entry) => entry !== null && entry !== undefined && (entry.score !== null && entry.score !== undefined || entry.status === "done" || entry.status === "judge_error" || entry.status === "error" || entry.status === "timeout"));
				return run === undefined ? TASKS[0].id : run.taskId;
			});
			const combos = Array.isArray(batch.combos) ? batch.combos : [];
			const rankMap = rankMapOf(combos);
			const rank = rankMap.get(combo.key) ?? null;
			const total = toFiniteNumber(combo.total, null);
			const cost = comboTotalCost(combo);
			const speed = speedMetricsOf(speedRecordOf(batch, combo.key));
			const missing = Array.isArray(combo.missing) ? combo.missing : [];
			const retryTotal = runs.reduce((sum, run) => sum + modelRetryCountOf(run), 0);
			const rerunTotal = runs.reduce((sum, run) => sum + (toFiniteNumber(run?.rerunCount, 0) ?? 0), 0);
			const task = TASK_BY_ID.get(taskTab) ?? TASKS[0];
			const activeRun = modelTaskRunOf(runs, task.id);
			const onRequestRerun = typeof props.onRequestRerun === "function" ? props.onRequestRerun : null;
			return h(
				"div",
				{ className: "mr-stack mr-md" },
				h(
					"div",
					{ className: "mr-md-hero" },
					h(
						"div",
						{ className: "mr-md-hero-main" },
						h("div", { className: "mr-md-kicker" }, combo.providerName ?? combo.provider ?? "—", " · ", batch.id),
						h(
							"div",
							{ className: "mr-md-name" },
							h("span", { className: "mr-md-model" }, combo.modelName ?? combo.model ?? "—"),
							h(EffortPill, { tr, entry: combo }),
							rank === null ? null : h("span", { className: "mr-md-rank mr-mono" }, tr("mr.detail.rankOf", { rank, total: rankMap.size })),
						),
						h(
							"div",
							{ className: "mr-md-tags" },
							h(Tag, { status: combo.status ?? "pending" }, statusLabel(tr, combo.status ?? "pending")),
							combo.complete === true
								? h("span", { className: "mr-md-complete" }, tr("mr.detail.complete"))
								: missing.length > 0
									? h("span", { className: "mr-md-missing" }, tr("mr.detail.missing", { tasks: missing.map((id) => taskName(tr, id)).join(tr("mr.common.listSeparator")) }))
									: null,
							batch.status === "running" ? h("span", { className: "mr-md-running" }, tr("mr.detail.runningNote")) : null,
							rerunTotal > 0
								? h("span", { className: "mr-md-rerun-badge" }, tr("mr.detail.rerunCount", { count: rerunTotal }))
								: null,
						),
					),
					h(
						"div",
						{ className: "mr-md-hero-score" },
						h("span", { className: "mr-md-hero-value mr-mono" }, total === null ? "—" : formatNumber(total, 2)),
						h("span", { className: "mr-md-hero-max" }, "/ 150"),
					),
				),
				h(
					"div",
					{ className: "mr-detail-meta is-tight" },
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.comboCost")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatUsd(cost)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.comboDuration")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatMs(combo.durationMs)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.overview.tps") + " / TTFT"),
						h(
							"span",
							{ className: "mr-detail-meta-value mr-mono" },
							(speed.tps === null ? "—" : formatNumber(speed.tps, 1)) + " / " + (speed.ttft === null ? "—" : formatMs(speed.ttft)),
						),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.retriesLabel")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, retryTotal > 0 ? String(retryTotal) : "0"),
					),
				),
				h(
					"div",
					{ className: "mr-md-actions" },
					onRequestRerun === null
						? null
						: h(
							"button",
							{
								type: "button",
								className: "mr-btn is-primary mr-btn-small",
								onClick: () => onRequestRerun({ comboKeys: [combo.key], taskIds: TASKS.map((entry) => entry.id) }),
							},
							h(PlayIcon, { size: 11 }),
							tr("mr.detail.rerunModel"),
						),
					typeof props.onOpenBatch === "function"
						? h(
							"button",
							{ type: "button", className: "mr-btn mr-btn-small", onClick: () => props.onOpenBatch() },
							tr("mr.detail.openBatch"),
						)
						: null,
					h("span", { className: "mr-md-action-hint" }, tr("mr.detail.rerunHint")),
				),
				h(
					"div",
					{ className: "mr-md-tabs", role: "tablist" },
					TASKS.map((entry) => {
						const run = modelTaskRunOf(runs, entry.id);
						const score = run === null ? null : toFiniteNumber(run.score, null);
						const status = run === null ? "pending" : run.status;
						return h(
							"button",
							{
								type: "button",
								key: entry.id,
								role: "tab",
								"aria-selected": entry.id === taskTab,
								className: "mr-md-tab" + (entry.id === taskTab ? " is-active" : ""),
								onClick: () => setTaskTab(entry.id),
							},
							h("span", { className: "mr-md-tab-dot " + statusKind(status), "aria-hidden": true }),
							h("span", { className: "mr-md-tab-name" }, taskName(tr, entry.id)),
							h(
								"span",
								{ className: "mr-md-tab-score mr-mono" },
								score === null ? statusLabel(tr, status) : formatNumber(score, 1) + "/" + formatNumber(entry.maxScore, entry.maxScore % 1 === 0 ? 0 : 1),
							),
						);
					}),
				),
				h(ModelTaskPanel, {
					tr,
					batch,
					combo,
					task,
					run: activeRun,
					meta: props.meta,
					onOpenArtifact: props.onOpenArtifact,
					onRequestRerun,
				}),
			);
		}

		function BatchDetailView(props) {
			const tr = props.tr;
			const batch = props.batch;
			const combos = (Array.isArray(props.combos) ? props.combos : [])
				.slice()
				.sort((left, right) => {
					const leftTotal = toFiniteNumber(left?.total, null);
					const rightTotal = toFiniteNumber(right?.total, null);
					if (leftTotal === null && rightTotal === null) return String(left?.key ?? "").localeCompare(String(right?.key ?? ""));
					if (leftTotal === null) return 1;
					if (rightTotal === null) return -1;
					return rightTotal - leftTotal;
				});
			const runs = Array.isArray(batch?.runs) ? batch.runs : [];
			const catalog = props.catalog;
			const complete = combos.filter((combo) => toFiniteNumber(combo.total, null) !== null);
			const rankMap = rankMapOf(combos);
			const progress = batch?.progress ?? null;
			const total = toFiniteNumber(progress?.total, runs.length) ?? runs.length;
			const done = toFiniteNumber(progress?.done, runs.filter((run) => run.status === "done").length) ?? 0;
			const failed = toFiniteNumber(progress?.failed, runs.filter((run) => ["error", "timeout", "judge_error"].includes(run.status)).length) ?? 0;
			const excluded = EXCLUDED_TREND_STATUSES.has(batch?.status);
			return h(
				"div",
				{ className: "mr-stack mr-bd" },
				excluded
					? h("div", { className: "mr-inline-note is-warn" }, tr("mr.detail.excludeNote", { status: statusLabel(tr, batch.status) }))
					: null,
				batch.error === null || batch.error === undefined
					? null
					: h(
						"div",
						{ className: "mr-run-error" },
						h(AlertIcon, { size: 13 }),
						h("span", null, String(batch.error.code ?? "") + " " + String(batch.error.message ?? "")),
					),
				h(
					"div",
					{ className: "mr-detail-meta" },
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.createdAt")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatClock(batch.createdAt)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.duration")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatMs(batch.durationMs)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.cost")),
						h("span", { className: "mr-detail-meta-value mr-mono" }, formatUsd(totalCostOfBatch(batch))),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.judge")),
						h("span", { className: "mr-detail-meta-value" }, judgeLabel(tr, batch.judge, catalog)),
					),
					h(
						"div",
						{ className: "mr-detail-meta-item" },
						h("span", { className: "mr-detail-meta-label" }, tr("mr.detail.progress")),
						h(
							"span",
							{ className: "mr-detail-meta-value mr-mono" },
							formatInt(done) + "/" + formatInt(total) + (failed > 0 ? " · " + tr("mr.run.failedCount", { failed }) : ""),
						),
					),
				),
				h(
					"div",
					{ className: "mr-md-actions" },
					typeof props.onRequestRerun === "function"
						? h(
							"button",
							{
								type: "button",
								className: "mr-btn is-primary mr-btn-small",
								onClick: () => props.onRequestRerun(null),
							},
							h(PlayIcon, { size: 11 }),
							tr("mr.detail.rerunBatch"),
						)
						: null,
					typeof props.onResume === "function" && isResumableBatch(batch) && props.running !== true
						? h(
							"button",
							{
								type: "button",
								className: "mr-btn mr-btn-small",
								disabled: props.resumingId === batch.id,
								onClick: () => props.onResume(batch.id),
							},
							h(PlayIcon, { size: 11 }),
							resumeButtonLabel(tr, props.resumingId === batch.id),
						)
						: null,
					h("span", { className: "mr-md-action-hint" }, tr("mr.detail.rerunHint")),
				),
				batch.summary?.text
					? h(
						"div",
						{ className: "mr-detail-block" },
						h("h3", { className: "mr-detail-block-title" }, tr("mr.detail.summary")),
						h("pre", { className: "mr-pre mr-summary" }, String(batch.summary.text)),
						h("div", { className: "mr-muted" }, tr("mr.detail.summaryBy", {
							model: judgeLabel(tr, batch.summary, catalog),
							time: formatClock(batch.summary.at),
						})),
					)
					: null,
				h(
					"div",
					{ className: "mr-detail-block" },
					h(
						"div",
						{ className: "mr-detail-block-head" },
						h("h3", { className: "mr-detail-block-title" }, tr("mr.detail.modelsTitle")),
						h("span", { className: "mr-muted" }, tr("mr.detail.modelsMeta", { complete: complete.length, total: combos.length })),
					),
					combos.length === 0
						? h("div", { className: "mr-muted" }, tr("mr.detail.noCombos"))
						: h(
							"div",
							{ className: "mr-bd-list" },
							combos.map((combo) => {
								const comboRuns = modelTaskRunsOf(batch, combo.key);
								const rank = rankMap.get(combo.key) ?? null;
								return h(
									"button",
									{
										type: "button",
										key: combo.key,
										className: "mr-bd-row" + (combo.complete === true ? "" : " is-incomplete"),
										onClick: () => props.onOpenModel(combo.key, null),
									},
									h("span", { className: "mr-bd-rank mr-mono" }, rank === null ? "—" : String(rank)),
									h(
										"span",
										{ className: "mr-bd-model" },
										h("span", { className: "mr-bd-model-name" }, combo.modelName ?? combo.model ?? "—"),
										h(EffortPill, { tr, entry: combo }),
										h("span", { className: "mr-bd-provider" }, combo.providerName ?? combo.provider ?? ""),
									),
									h(
										"span",
										{ className: "mr-bd-tasks" },
										TASKS.map((entry) => {
											const run = modelTaskRunOf(comboRuns, entry.id);
											const score = run === null ? null : toFiniteNumber(run.score, null);
											return h(
												"span",
												{
													key: entry.id,
													className: "mr-bd-task" + (score === null ? " is-empty" : ""),
													title: taskName(tr, entry.id) + " · " + (run === null ? tr("mr.status.pending") : statusLabel(tr, run.status)),
												},
												h("span", { className: "mr-bd-task-name" }, taskName(tr, entry.id)),
												h("span", { className: "mr-bd-task-score mr-mono" }, score === null ? "—" : formatNumber(score, 1)),
											);
										}),
									),
									h("span", { className: "mr-bd-total mr-mono" }, combo.total === null || combo.total === undefined ? "—" : formatNumber(combo.total, 2)),
									h(Tag, { status: combo.status ?? "pending" }, statusLabel(tr, combo.status ?? "pending")),
								);
							}),
						),
				),
				h(
					"div",
					{ className: "mr-md-actions" },
					h("span", { className: "mr-muted" }, tr("mr.detail.comboCount", { count: combos.length })),
				),
			);
		}

		function DetailDrawer(props) {
			const tr = props.tr;
			const batchId = props.batchId;
			const cachedBatch = props.initialBatch !== null && props.initialBatch !== undefined && props.initialBatch.id === batchId
				? props.initialBatch
				: null;
			const [state, setState] = React.useState(() => (
				cachedBatch === null
					? { status: "loading", batch: null, error: null }
					: { status: "ready", batch: cachedBatch, error: null }
			));
			const [mode, setMode] = React.useState(props.focusComboKey === null || props.focusComboKey === undefined ? "batch" : "model");
			const [activeKey, setActiveKey] = React.useState(props.focusComboKey ?? null);
			const [activeTaskId, setActiveTaskId] = React.useState(props.focusTaskId ?? null);
			const [artifact, setArtifact] = React.useState(null);
			const panelRef = React.useRef(null);

			React.useEffect(() => {
				setActiveKey(props.focusComboKey ?? null);
				setActiveTaskId(props.focusTaskId ?? null);
				setMode(props.focusComboKey === null || props.focusComboKey === undefined ? "batch" : "model");
				setArtifact(null);
			}, [props.focusComboKey, props.focusTaskId, batchId]);

			React.useEffect(() => {
				let alive = true;
				const cached = props.initialBatch !== null && props.initialBatch !== undefined && props.initialBatch.id === batchId
					? props.initialBatch
					: null;
				if (cached !== null) {
					setState({ status: "ready", batch: cached, error: null });
					return () => {
						alive = false;
					};
				}
				setState({ status: "loading", batch: null, error: null });
				const request = typeof props.loadBatch === "function"
					? props.loadBatch(batchId, { silent: true })
					: getJson("/batches/" + encodeURIComponent(batchId)).then((data) => data?.batch ?? null);
				Promise.resolve(request)
					.then((batch) => {
						if (!alive) return;
						if (batch === null || batch === undefined) {
							setState({ status: "error", batch: null, error: new Error(tr("mr.detail.loadFailed")) });
							return;
						}
						setState({ status: "ready", batch, error: null });
					})
					.catch((error) => {
						if (!alive) return;
						setState({ status: "error", batch: null, error });
					});
				return () => {
					alive = false;
				};
			}, [batchId, props.initialBatch, props.loadBatch, tr]);

			React.useEffect(() => {
				if (artifact !== null || props.modalOpen === true) return undefined;
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose, artifact, props.modalOpen]);

			React.useEffect(() => {
				const previous = typeof document !== "undefined" ? document.activeElement : null;
				if (panelRef.current !== null) panelRef.current.focus();
				return () => {
					if (previous !== null && typeof previous.focus === "function") previous.focus();
				};
			}, [batchId]);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key !== "Tab" || panelRef.current === null) return;
					const root = panelRef.current;
					const nodes = root.querySelectorAll(
						'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
					);
					if (nodes.length === 0) return;
					const first = nodes[0];
					const last = nodes[nodes.length - 1];
					const active = document.activeElement;
					if (event.shiftKey && (active === first || !root.contains(active))) {
						event.preventDefault();
						last.focus();
					} else if (!event.shiftKey && (active === last || !root.contains(active))) {
						event.preventDefault();
						first.focus();
					}
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [artifact, props.modalOpen]);

			const batch = state.batch !== null && state.batch.id === batchId ? state.batch : null;
			const combos = batch === null
				? []
				: Array.isArray(batch.combos) && batch.combos.length > 0
					? batch.combos
					: comboFallbackFromSelection(batch);
			const activeCombo = combos.find((combo) => combo.key === activeKey) ?? combos[0] ?? null;
			const runs = batch === null || activeCombo === null ? [] : modelTaskRunsOf(batch, activeCombo.key);
			const openModel = (comboKey, taskId) => {
				setActiveKey(comboKey);
				setActiveTaskId(taskId ?? null);
				setMode("model");
			};
			const openBatch = () => {
				setMode("batch");
				setActiveKey(null);
			};
			const requestRerun = typeof props.onRequestRerun === "function"
				? (initialSelection) => {
					if (batch !== null) props.onRequestRerun(batch, initialSelection ?? null);
				}
				: null;
			const title = mode === "model" && activeCombo !== null
				? (activeCombo.modelName ?? activeCombo.model ?? "—") + " · " + effortLabel(tr, activeCombo.reasoningEffort, activeCombo.effortName)
				: tr("mr.detail.batchTitle");
			const showBatchBack = mode === "model" && combos.length > 1;
			return h(
				"div",
				{ className: "mr-drawer-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.detail.dialogLabel") },
				h("div", { className: "mr-drawer-backdrop", onClick: props.onClose, "aria-hidden": true }),
				h(
					"aside",
					{ className: "mr-drawer mr-drawer-detail", ref: panelRef, tabIndex: -1 },
					h(
						"header",
						{ className: "mr-drawer-head" },
						h(
							"div",
							{ className: "mr-drawer-head-main" },
							h(
								"div",
								{ className: "mr-drawer-title-row" },
								showBatchBack
									? h(
										"button",
										{ type: "button", className: "mr-md-back", onClick: openBatch, title: tr("mr.detail.backToBatch") },
										h(ChevronIcon, { size: 13, direction: "left" }),
									)
									: null,
								h("h2", { className: "mr-drawer-title" }, title),
							),
							h("div", { className: "mr-drawer-sub mr-mono" }, batchId),
						),
						h(
							"div",
							{ className: "mr-drawer-head-right" },
							batch === null ? null : h(Tag, { status: batch.status }, statusLabel(tr, batch.status)),
							h(
								"button",
								{ type: "button", className: "mr-icon-btn", onClick: props.onClose, "aria-label": tr("mr.aria.close") },
								h(CloseIcon, { size: 14 }),
							),
						),
					),
					h(
						"div",
						{ className: "mr-drawer-body" },
						state.status === "loading" ? h("div", { className: "mr-empty-inline" }, tr("mr.detail.loading")) : null,
						state.status === "error"
							? h(
								"div",
								{ className: "mr-error-box" },
								h(AlertIcon, { size: 15 }),
								h("div", null,
									h("div", { className: "mr-error-title" }, state.error?.status === 404 ? tr("mr.detail.notFound") : tr("mr.detail.loadFailed")),
									h("div", { className: "mr-error-detail" }, errorMessageOf(state.error)),
								),
							)
							: null,
						batch === null
							? null
							: mode === "model" && activeCombo !== null
								? h(ModelDetailView, {
									tr,
									batch,
									combo: activeCombo,
									runs,
									catalog: props.catalog,
									meta: props.meta,
									initialTaskId: activeTaskId,
									onOpenBatch: openBatch,
									onOpenArtifact: (targetRun, fileName) => setArtifact({ run: targetRun, file: fileName, combo: activeCombo }),
									onRequestRerun: requestRerun,
								})
								: h(BatchDetailView, {
									tr,
									batch,
									combos,
									catalog: props.catalog,
									running: props.running,
									resumingId: props.resumingId,
									onResume: props.onResume,
									onOpenModel: openModel,
									onRequestRerun: requestRerun,
								}),
					),
				),
				artifact === null
					? null
					: h(ArtifactModal, {
						tr,
						batchId: batch?.id ?? batchId,
						run: artifact.run,
						initialFile: artifact.file,
						combo: artifact.combo,
						meta: props.meta,
						onClose: () => setArtifact(null),
					}),
			);
		}

		// ── start dialog ───────────────────────────────────────────────────

		function effortOptionsOf(entry) {
			if (Array.isArray(entry?.efforts) && entry.efforts.length > 0) return entry.efforts;
			return [{ id: null, name: null, description: "" }];
		}

		function defaultEffortOf(entry) {
			const options = effortOptionsOf(entry);
			const preferred = entry?.defaultEffort;
			if (preferred !== null && preferred !== undefined && options.some((option) => option.id === preferred)) return preferred;
			const first = options[0];
			return first === undefined ? null : first.id ?? null;
		}

		function effortOptionName(tr, effort) {
			if (effort?.id === null || effort?.id === undefined) return tr("mr.common.defaultEffort");
			if (typeof effort.name === "string" && effort.name !== "") return effort.name;
			return String(effort.id);
		}

		function defaultJudgeOf(catalog) {
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const wanted = catalog?.judge ?? {};
			let provider = providers.find((entry) => entry.id === wanted.provider) ?? providers[0] ?? null;
			if (provider === null) return { provider: "", model: "", reasoningEffort: null };
			let model = provider.models?.find((entry) => entry.id === wanted.model) ?? provider.models?.[0] ?? null;
			if (model === null) return { provider: provider.id, model: "", reasoningEffort: null };
			let effort = null;
			const efforts = Array.isArray(model.efforts) ? model.efforts : [];
			if (efforts.length > 0) {
				effort = efforts.some((entry) => entry.id === wanted.reasoningEffort)
					? wanted.reasoningEffort
					: model.defaultEffort ?? efforts[0]?.id ?? null;
			}
			return { provider: provider.id, model: model.id, reasoningEffort: effort };
		}

		function buildCatalogGroups(catalog, tr) {
			const selectable = Array.isArray(catalog?.selectable) ? catalog.selectable : [];
			const providerNames = new Map(
				(Array.isArray(catalog?.providers) ? catalog.providers : []).map((entry) => [entry.id, entry.name || entry.id]),
			);
			const providerModels = new Map(
				(Array.isArray(catalog?.providers) ? catalog.providers : []).map((entry) => [entry.id, entry.models ?? []]),
			);
			const groups = [];
			const byId = new Map();
			for (const rawEntry of selectable) {
				const modelEntry = (providerModels.get(rawEntry.provider) ?? []).find((entry) => entry.id === rawEntry.model) ?? null;
				const entry = {
					...rawEntry,
					contextWindow: rawEntry.contextWindow ?? modelEntry?.contextWindow ?? null,
					defaultMaxTokens: rawEntry.defaultMaxTokens ?? modelEntry?.defaultMaxTokens ?? null,
					inputModalities: rawEntry.inputModalities ?? modelEntry?.inputModalities ?? null,
				};
				let group = byId.get(entry.provider);
				if (group === undefined) {
					group = {
						provider: entry.provider,
						providerName: providerNames.get(entry.provider) ?? entry.provider,
						models: [],
					};
					byId.set(entry.provider, group);
					groups.push(group);
				}
				group.models.push(entry);
			}
			return groups;
		}

		function StartDialog(props) {
			const tr = props.tr;
			const catalog = props.catalog;
			const [selected, setSelected] = React.useState(() => new Set());
			const [expanded, setExpanded] = React.useState(() => new Set());
			const [judge, setJudge] = React.useState(() => (catalog === null || catalog === undefined ? null : defaultJudgeOf(catalog)));
			const [submitting, setSubmitting] = React.useState(false);
			const [error, setError] = React.useState(null);

			React.useEffect(() => {
				if (catalog === null || catalog === undefined) return;
				setJudge((current) => current ?? defaultJudgeOf(catalog));
			}, [catalog]);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape" && !submitting) props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose, submitting]);

			const groups = React.useMemo(() => buildCatalogGroups(catalog, tr), [catalog, tr]);
			const maxCombos = toFiniteNumber(catalog?.limits?.maxCombos, 0) ?? 0;
			const noLimit = maxCombos === 0;
			const lanes = toFiniteNumber(catalog?.limits?.maxParallelModels, 3) ?? 3;
			const count = selected.size;

			const toggleCombo = (key) => {
				setSelected((current) => {
					const next = new Set(current);
					if (next.has(key)) next.delete(key);
					else if (noLimit || next.size < maxCombos) next.add(key);
					return next;
				});
			};

			const modelKeys = (entry) => effortOptionsOf(entry).map((effort) => comboKeyOf(entry.provider, entry.model, effort.id ?? null));

			const toggleModel = (entry) => {
				const keys = modelKeys(entry);
				const hasAny = keys.some((key) => selected.has(key));
				setSelected((current) => {
					const next = new Set(current);
					if (hasAny) {
						for (const key of keys) next.delete(key);
					} else {
						for (const key of keys) {
							if (!noLimit && next.size >= maxCombos) break;
							next.add(key);
						}
					}
					return next;
				});
			};

			const toggleEffort = (entry, effortId) => {
				const key = comboKeyOf(entry.provider, entry.model, effortId ?? null);
				toggleCombo(key);
			};

			const selectAll = () => {
				setSelected(() => {
					const next = new Set();
					for (const group of groups) {
						for (const entry of group.models) {
							for (const key of modelKeys(entry)) {
								if (!noLimit && next.size >= maxCombos) return next;
								next.add(key);
							}
						}
					}
					return next;
				});
			};

			const judgeProvider = catalog?.providers?.find((entry) => entry.id === judge?.provider)
				?? (Array.isArray(catalog?.providers) ? catalog.providers[0] : undefined);
			const judgeModels = Array.isArray(judgeProvider?.models) ? judgeProvider.models : [];
			const judgeModel = judgeModels.find((entry) => entry.id === judge?.model) ?? judgeModels[0] ?? null;
			const judgeEfforts = Array.isArray(judgeModel?.efforts) ? judgeModel.efforts : [];
			const judgeEffortId = judgeEfforts.some((entry) => entry.id === judge?.reasoningEffort)
				? judge.reasoningEffort
				: (judgeEfforts.length > 0 ? judgeModel?.defaultEffort ?? judgeEfforts[0]?.id ?? null : null);

			const changeJudgeProvider = (providerId) => {
				const provider = catalog?.providers?.find((entry) => entry.id === providerId);
				const model = provider?.models?.[0] ?? null;
				setJudge({
					provider: providerId,
					model: model?.id ?? "",
					reasoningEffort: model === null ? null : defaultEffortOf(model),
				});
			};

			const changeJudgeModel = (modelId) => {
				const model = judgeModels.find((entry) => entry.id === modelId) ?? null;
				setJudge((current) => ({
					provider: current?.provider ?? judgeProvider?.id ?? "",
					model: modelId,
					reasoningEffort: model === null ? null : defaultEffortOf(model),
				}));
			};

			const changeJudgeEffort = (value) => {
				setJudge((current) => ({
					provider: current?.provider ?? "",
					model: current?.model ?? "",
					reasoningEffort: value === "" ? null : value,
				}));
			};

			const submit = async () => {
				if (submitting || catalog === null || selected.size === 0) return;
				const selection = [];
				for (const group of groups) {
					for (const entry of group.models) {
						for (const effort of effortOptionsOf(entry)) {
							const key = comboKeyOf(entry.provider, entry.model, effort.id ?? null);
							if (!selected.has(key)) continue;
							selection.push({ provider: entry.provider, model: entry.model, reasoningEffort: effort.id ?? null });
						}
					}
				}
				if (selection.length === 0) {
					setError(tr("mr.start.emptySelection"));
					return;
				}
				const judgePayload = judge === null
					? undefined
					: { provider: judge.provider, model: judge.model, reasoningEffort: judge.reasoningEffort ?? null };
				setSubmitting(true);
				setError(null);
				const result = await postJson("/run", { selection, judge: judgePayload });
				if (result.ok && result.data?.batch) {
					props.onStarted(result.data.batch);
					return;
				}
				setSubmitting(false);
				if (result.status === 409 || result.data?.code === "busy") {
					setError(tr("mr.start.busy"));
					return;
				}
				setError(tr("mr.start.failed") + ": " + (result.data?.error ?? errorMessageOf(result.error)));
			};

			const catalogReady = catalog !== null && catalog !== undefined;
			return h(
				"div",
				{ className: "mr-modal-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.start.dialogLabel") },
				h("div", { className: "mr-modal-backdrop", onClick: props.onClose, "aria-hidden": true }),
				h(
					"div",
					{ className: "mr-modal mr-start-modal" },
					h(
						"header",
						{ className: "mr-modal-head" },
						h(
							"div",
							null,
							h("h2", { className: "mr-modal-title" }, tr("mr.start.title")),
							h("div", { className: "mr-modal-sub" }, tr("mr.start.subtitle")),
						),
						h(
							"button",
							{ type: "button", className: "mr-icon-btn", onClick: props.onClose, "aria-label": tr("mr.aria.close") },
							h(CloseIcon, { size: 14 }),
						),
					),
					h(
						"div",
						{ className: "mr-modal-body" },
						props.catalogStatus === "loading" && !catalogReady
							? h(
								"div",
								{ className: "mr-start-loading" },
								h("div", { className: "mr-muted" }, tr("mr.start.catalogLoading")),
								[0, 1, 2].map((index) =>
									h(
										"div",
										{ className: "mr-skeleton-row", key: "start-sk-" + index },
										h(Skeleton, { width: "40%", height: 12 }),
										h(Skeleton, { width: "24%", height: 12 }),
										h(Skeleton, { width: "18%", height: 12 }),
									),
								),
							)
							: null,
						props.catalogStatus === "error" && !catalogReady
							? h(
								"div",
								{ className: "mr-error-box" },
								h(AlertIcon, { size: 15 }),
								h("div", null,
									h("div", { className: "mr-error-title" }, tr("mr.start.catalogError")),
									h("div", { className: "mr-error-detail" }, errorMessageOf(props.catalogError)),
								),
								h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: props.onRetryCatalog }, tr("mr.start.loadCatalog")),
							)
							: null,
						catalogReady
							? h(
								React.Fragment,
								null,
								h(
									"div",
									{ className: "mr-start-toolbar" },
									h(
										"div",
										{ className: "mr-start-toolbar-left" },
										h("h3", { className: "mr-start-section-title" }, tr("mr.start.modelsTitle")),
										h(
											"span",
											{ className: "mr-muted mr-mono" },
											noLimit
												? tr("mr.start.selectedUnlimited", { count })
												: tr("mr.start.selected", { count, max: maxCombos }),
										),
									),
									h(
										"div",
										{ className: "mr-start-toolbar-right" },
										h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: selectAll, title: tr("mr.start.selectAllHint") }, tr("mr.start.selectAll")),
										h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: () => setSelected(new Set()) }, tr("mr.start.clear")),
									),
								),
								groups.length === 0
									? h("div", { className: "mr-empty-inline" }, tr("mr.start.noModels"))
									: h(
										"div",
										{ className: "mr-model-groups" },
										groups.map((group) =>
											h(
												"section",
												{ className: "mr-model-group", key: group.provider },
												h(
													"div",
													{ className: "mr-model-group-head" },
													h("span", { className: "mr-model-group-name" }, group.providerName),
													h("span", { className: "mr-muted mr-mono" }, tr("mr.start.providerModels", { count: group.models.length })),
												),
												group.models.map((entry) => {
													const keys = modelKeys(entry);
													const selectedCount = keys.filter((key) => selected.has(key)).length;
													const anySelected = selectedCount > 0;
													const allSelected = selectedCount === keys.length;
													const modelId = comboKeyOf(entry.provider, entry.model, null);
													const isExpanded = expanded.has(modelId);
													return h(
														"div",
														{ className: "mr-model-item", key: modelId },
														h(
															"div",
															{ className: "mr-model-row" },
															h(
																"button",
																{
																	type: "button",
																	role: "checkbox",
																	"aria-checked": anySelected ? (allSelected ? "true" : "mixed") : "false",
																	"aria-label": tr("mr.aria.modelCheckbox", { model: entry.modelName ?? entry.model }),
																	className: "mr-check" + (anySelected ? " is-checked" : "") + (anySelected && !allSelected ? " is-mixed" : ""),
																	onClick: () => toggleModel(entry),
																},
																anySelected
																	? (allSelected ? h(CheckIcon, { size: 12 }) : h(MinusIcon, { size: 12 }))
																	: null,
															),
															h(
																"button",
																{
																	type: "button",
																	className: "mr-model-toggle",
																	onClick: () => setExpanded((current) => {
																		const next = new Set(current);
																		if (next.has(modelId)) next.delete(modelId);
																		else next.add(modelId);
																		return next;
																	}),
																	"aria-expanded": isExpanded,
																	"aria-label": isExpanded ? tr("mr.start.collapse") : tr("mr.start.expand"),
																},
																h(
																	"span",
																	{ className: "mr-model-toggle-main" },
																	h("span", { className: "mr-model-toggle-name" }, entry.modelName ?? entry.model),
																	h(
																		"span",
																		{ className: "mr-model-toggle-meta" },
																		selectedCount > 0
																			? tr("mr.start.effortsSelected", { count: selectedCount })
																			: effortOptionsOf(entry).length === 1 && effortOptionsOf(entry)[0].id === null
																				? tr("mr.common.defaultEffort")
																				: tr("mr.start.effortCount", { count: effortOptionsOf(entry).length }),
																	),
																	(() => {
																		const specs = [];
																		const context = formatTokenCount(entry.contextWindow);
																		const output = formatTokenCount(entry.defaultMaxTokens);
																		if (context !== null) specs.push(tr("mr.start.contextWindow", { value: context }));
																		if (output !== null) specs.push(tr("mr.start.maxOutput", { value: output }));
																		if (entry.supportsImage === true || (Array.isArray(entry.inputModalities) && entry.inputModalities.includes("image"))) {
																			specs.push(tr("mr.start.image"));
																		}
																		return specs.length === 0
																			? null
																			: h("span", { className: "mr-model-toggle-specs" }, specs.join(" · "));
																	})(),
																),
																h("span", { className: "mr-model-toggle-chevron" + (isExpanded ? " is-open" : "") },
																	h(ChevronIcon, { size: 13 }),
																),
															),
														),
														isExpanded
															? h(
																"div",
																{ className: "mr-effort-chips" },
																effortOptionsOf(entry).map((effort) => {
																	const key = comboKeyOf(entry.provider, entry.model, effort.id ?? null);
																	const isSelected = selected.has(key);
																	const disabled = !isSelected && !noLimit && selected.size >= maxCombos;
																	return h(
																		"button",
																		{
																			type: "button",
																			key,
																			className: "mr-chip" + (isSelected ? " is-active" : "") + (disabled ? " is-disabled" : ""),
																			style: effortStyle(effort),
																			"aria-pressed": isSelected,
																			"aria-label": tr("mr.aria.effortChip", { model: entry.modelName ?? entry.model, effort: effortOptionName(tr, effort) }),
																			onClick: () => {
																				if (disabled) return;
																				toggleEffort(entry, effort.id ?? null);
																			},
																		},
																		effortOptionName(tr, effort),
																	);
																}),
															)
															: null,
													);
												}),
											),
										),
									),
								h(
									"section",
									{ className: "mr-judge-card" },
									h(
										"div",
										{ className: "mr-judge-card-head" },
										h("div", null,
											h("h3", { className: "mr-start-section-title" }, tr("mr.start.judgeTitle")),
											h("div", { className: "mr-muted" }, tr("mr.start.judgeHint")),
										),
									),
									h(
										"div",
										{ className: "mr-judge-grid" },
										h(
											"label",
											{ className: "mr-field" },
											h("span", { className: "mr-field-label" }, tr("mr.start.provider")),
											h(
												"select",
												{
													className: "mr-select",
													value: judge?.provider ?? "",
													onChange: (event) => changeJudgeProvider(event.target.value),
													disabled: submitting,
												},
												(Array.isArray(catalog?.providers) ? catalog.providers : []).map((provider) =>
													h("option", { key: provider.id, value: provider.id }, provider.name || provider.id),
												),
											),
										),
										h(
											"label",
											{ className: "mr-field" },
											h("span", { className: "mr-field-label" }, tr("mr.start.model")),
											h(
												"select",
												{
													className: "mr-select",
													value: judge?.model ?? "",
													onChange: (event) => changeJudgeModel(event.target.value),
													disabled: submitting,
												},
												judgeModels.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name || entry.id)),
											),
										),
										h(
											"label",
											{ className: "mr-field" },
											h("span", { className: "mr-field-label" }, tr("mr.start.effort")),
											h(
												"select",
												{
													className: "mr-select",
													value: judgeEffortId === null || judgeEffortId === undefined ? "" : String(judgeEffortId),
													onChange: (event) => changeJudgeEffort(event.target.value),
													disabled: submitting || judgeEfforts.length === 0,
												},
												judgeEfforts.length === 0
													? h("option", { value: "" }, tr("mr.common.defaultEffort"))
													: judgeEfforts.map((effort) => h("option", { key: effort.id, value: effort.id }, effortOptionName(tr, effort))),
											),
										),
									),
									h(
										"div",
										{ className: "mr-judge-preview mr-muted mr-mono" },
										tr("mr.start.judgePreview", {
											provider: judgeProvider?.name ?? "—",
											model: judgeModel?.name ?? "—",
											effort: judgeEffortId === null || judgeEffortId === undefined
												? tr("mr.common.defaultEffort")
												: effortOptionName(tr, judgeEfforts.find((entry) => entry.id === judgeEffortId) ?? { id: judgeEffortId }),
										}),
									),
								),
							)
							: null,
					),
					h(
						"footer",
						{ className: "mr-modal-foot" },
						h(
							"div",
							{ className: "mr-start-foot-info" },
							h(
								"div",
								{ className: "mr-start-count" },
								tr("mr.start.count", { combos: count, runs: count * 4 }),
							),
							h(
								"div",
								{ className: "mr-start-foot-sub" },
								noLimit
									? tr("mr.start.lanes", { lanes })
									: tr("mr.start.lanes", { lanes }) + " · " + tr("mr.start.maxCombos", { max: maxCombos }),
							),
							error === null
								? null
								: h("div", { className: "mr-form-error" }, h(AlertIcon, { size: 12 }), h("span", null, error)),
						),
						h(
							"div",
							{ className: "mr-modal-actions" },
							h("button", { type: "button", className: "mr-btn is-ghost", onClick: props.onClose, disabled: submitting }, tr("mr.common.cancel")),
							h(
								"button",
								{
									type: "button",
									className: "mr-btn is-primary",
									onClick: submit,
									disabled: submitting || count === 0 || !catalogReady,
								},
								h(PlayIcon, { size: 13 }),
								submitting ? tr("mr.start.submitting") : tr("mr.start.submit"),
							),
						),
					),
				),
			);
		}

		// ── progress dialog ────────────────────────────────────────────────

		function ProgressDialog(props) {
			const tr = props.tr;
			const run = props.run;
			const batch = run?.batch ?? null;
			const running = run?.running === true;
			const [stopping, setStopping] = React.useState(false);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose]);

			React.useEffect(() => {
				if (running) setStopping(false);
			}, [running]);

			if (batch === null) {
				return h(
					"div",
					{ className: "mr-modal-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.run.dialogLabel") },
					h("div", { className: "mr-modal-backdrop", onClick: props.onClose, "aria-hidden": true }),
					h("div", { className: "mr-modal mr-progress-modal" },
						h("div", { className: "mr-modal-body" }, h("div", { className: "mr-muted" }, tr("mr.common.loading"))),
					),
				);
			}

			const lanes = [];
			const laneIndex = new Map();
			const selection = Array.isArray(batch.selection) ? batch.selection : [];
			for (const combo of selection) {
				const key = String(combo.provider) + "\u0000" + String(combo.model);
				let lane = laneIndex.get(key);
				if (lane === undefined) {
					lane = {
						key,
						modelName: combo.modelName ?? combo.model,
						providerName: combo.providerName ?? combo.provider,
						comboKeys: new Set(),
						efforts: [],
					};
					laneIndex.set(key, lane);
					lanes.push(lane);
				}
				lane.comboKeys.add(combo.key ?? comboKeyOf(combo.provider, combo.model, combo.reasoningEffort));
				lane.efforts.push({
					reasoningEffort: combo.reasoningEffort ?? null,
					effortName: combo.effortName,
					label: effortLabel(tr, combo.reasoningEffort, combo.effortName),
					key: String(combo.reasoningEffort ?? "default"),
				});
			}
			const runs = Array.isArray(batch.runs) ? batch.runs : [];
			const allPending = runs.length > 0 && runs.every((entry) => entry.status === "pending");
			const progress = batch.progress ?? {};
			const done = toFiniteNumber(progress.done, runs.filter((entry) => entry.status === "done").length) ?? 0;
			const failed = toFiniteNumber(progress.failed, runs.filter((entry) => ["error", "timeout", "judge_error"].includes(entry.status)).length) ?? 0;
			const stopped = toFiniteNumber(progress.stopped, runs.filter((entry) => entry.status === "stopped").length) ?? 0;
			const interrupted = toFiniteNumber(progress.interrupted, runs.filter((entry) => entry.status === "interrupted").length) ?? 0;
			const total = toFiniteNumber(progress.total, runs.length) ?? 0;
			const overallPct = total === 0 ? 0 : clamp(((done + failed + stopped + interrupted) / total) * 100, 0, 100);
			const elapsed = running
				? toFiniteNumber(run?.elapsedMs, toFiniteNumber(batch.startedAt, Date.now()) === null ? 0 : Date.now() - toFiniteNumber(batch.startedAt, Date.now())) ?? 0
				: toFiniteNumber(batch.durationMs, toFiniteNumber(batch.finishedAt, Date.now()) - toFiniteNumber(batch.startedAt, Date.now())) ?? 0;

			const stop = async () => {
				if (stopping) return;
				setStopping(true);
				const result = await postJson("/stop", { batchId: batch.id });
				if (!result.ok) {
					setStopping(false);
					props.onStopFailed(result);
					return;
				}
				props.onStopRequested();
				// If the server accepted the stop but the batch keeps running,
				// release the disabled button after a grace period.
				window.setTimeout(() => setStopping(false), 15000);
			};

			return h(
				"div",
				{ className: "mr-modal-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.run.dialogLabel") },
				h("div", { className: "mr-modal-backdrop", onClick: props.onClose, "aria-hidden": true }),
				h(
					"div",
					{ className: "mr-modal mr-progress-modal" },
					h(
						"header",
						{ className: "mr-modal-head" },
						h(
							"div",
							{ className: "mr-progress-head-main" },
							h(
								"div",
								{ className: "mr-progress-title-row" },
								running ? h("span", { className: "mr-live-dot", "aria-hidden": true }) : null,
								h("h2", { className: "mr-modal-title" }, running ? tr("mr.run.title") : tr("mr.run.completed")),
							),
							h("div", { className: "mr-modal-sub mr-mono" }, batch.id + " · " + tr("mr.run.elapsed", { time: formatMs(elapsed) })),
						),
						h(
							"button",
							{ type: "button", className: "mr-icon-btn", onClick: props.onClose, "aria-label": tr("mr.aria.close") },
							h(CloseIcon, { size: 14 }),
						),
					),
					h(
						"div",
						{ className: "mr-modal-body" },
						h(
							"div",
							{ className: "mr-progress-summary" },
							h(
								"div",
								{ className: "mr-progress-summary-line" },
								h("span", { className: "mr-progress-count mr-mono" }, tr("mr.run.progress", { done, total })),
								h("span", { className: "mr-progress-failed mr-mono" }, tr("mr.run.failedCount", { failed })),
							),
							h(
								"div",
								{ className: "mr-track mr-track-lg" },
								h("span", { className: "mr-track-fill" + (failed > 0 ? " is-warn" : ""), style: { width: overallPct + "%" } }),
							),
						),
						allPending && running ? h("div", { className: "mr-inline-note" }, tr("mr.run.preparing")) : null,
						running ? h("div", { className: "mr-inline-note is-warn" }, tr("mr.run.resumeNote")) : null,
						h(
							"div",
							{ className: "mr-lane-list" },
							lanes.map((lane) => {
								const laneRuns = runs.filter((entry) => lane.comboKeys.has(entry.comboKey));
								const laneDone = laneRuns.filter((entry) => entry.status === "done").length;
								const laneFailed = laneRuns.filter((entry) => ["error", "timeout", "judge_error"].includes(entry.status)).length;
								const laneStopped = laneRuns.filter((entry) => entry.status === "stopped").length;
								const current = laneRuns.find((entry) => entry.status === "running") ?? null;
								const laneTotal = laneRuns.length;
								const lanePct = laneTotal === 0 ? 0 : clamp(((laneDone + laneFailed + laneStopped) / laneTotal) * 100, 0, 100);
								const laneElapsed = current !== null && typeof current.startedAt === "number"
									? Date.now() - current.startedAt
									: laneRuns.reduce((sum, entry) => sum + (toFiniteNumber(entry.durationMs, 0) ?? 0), 0);
								const settled = laneTotal > 0 && laneDone + laneFailed + laneStopped >= laneTotal;
								const laneState = !settled
									? (current !== null ? "running" : "pending")
									: laneStopped > 0
										? "stopped"
										: laneFailed > 0
											? "partial"
											: "done";
								const laneStateLabel = laneState === "running"
									? tr("mr.run.laneRunning")
									: laneState === "pending"
										? tr("mr.run.waiting")
										: laneState === "stopped"
											? tr("mr.run.laneStopped")
											: laneState === "partial"
												? statusLabel(tr, "partial")
												: tr("mr.run.laneDone");
								return h(
									"div",
									{ className: "mr-lane", key: lane.key },
									h(
										"div",
										{ className: "mr-lane-head" },
										h(
											"div",
											{ className: "mr-lane-title" },
											h("span", { className: "mr-lane-model" }, lane.modelName),
											h(
												"span",
												{ className: "mr-lane-efforts" },
												lane.efforts.map((effort, index) =>
													h(
														React.Fragment,
														{ key: effort.key + ":" + String(index) },
														index > 0 ? h("span", { className: "mr-lane-effort-sep" }, " · ") : null,
														h(EffortPill, { tr, entry: effort, label: effort.label }),
													),
												),
											),
										),
										h(
											"div",
											{ className: "mr-lane-head-right" },
											h(Tag, { status: laneState }, laneStateLabel),
											h("span", { className: "mr-muted mr-mono" }, tr("mr.run.elapsed", { time: formatMs(laneElapsed) })),
										),
									),
									h(
										"div",
										{ className: "mr-lane-body" },
										h(
											"span",
											{ className: "mr-lane-current" },
											current !== null
												? tr("mr.run.current") + ": " + taskName(tr, current.taskId)
												: settled
													? laneStateLabel
													: tr("mr.run.waiting"),
										),
										h(
											"span",
											{ className: "mr-lane-counts mr-mono" },
											tr("mr.run.doneCount", { done: laneDone, total: laneTotal })
												+ (laneFailed > 0 ? " · " + tr("mr.run.failedCount", { failed: laneFailed }) : ""),
										),
									),
									h(
										"div",
										{ className: "mr-track" },
										h("span", { className: "mr-track-fill" + (laneFailed > 0 ? " is-warn" : ""), style: { width: lanePct + "%" } }),
									),
								);
							}),
						),
					),
					h(
						"footer",
						{ className: "mr-modal-foot" },
						h(
							"div",
							{ className: "mr-start-foot-info" },
							h("div", { className: "mr-muted mr-mono" }, tr("mr.run.progress", { done, total })),
						),
						h(
							"div",
							{ className: "mr-modal-actions" },
							h("button", { type: "button", className: "mr-btn is-ghost", onClick: props.onClose }, tr("mr.common.close")),
							!running && typeof props.onRerun === "function" && batch.rerunnable !== false
								? h(
									"button",
									{ type: "button", className: "mr-btn is-primary", onClick: () => props.onRerun(batch) },
									h(PlayIcon, { size: 12 }),
									tr("mr.detail.rerunBatch"),
								)
								: null,
							running
								? h(
									"button",
									{ type: "button", className: "mr-btn is-danger", onClick: stop, disabled: stopping },
									h(StopIcon, { size: 12 }),
									stopping ? tr("mr.run.stopping") : tr("mr.run.stop"),
								)
								: null,
						),
					),
				),
			);
		}

		// ── page ───────────────────────────────────────────────────────────

		function PageSkeleton(props) {
			const tr = props.tr;
			return h(
				"div",
				{ className: "mr-stack" },
				h(
					"div",
					{ className: "mr-panel" },
					h(
						"div",
						{ className: "mr-panel-head" },
						h(
							"div",
							null,
							h("h2", { className: "mr-panel-title" }, tr("mr.ranking.loading")),
							h("div", { className: "mr-panel-sub" }, tr("mr.common.loading")),
						),
					),
					h(
						"div",
						{ className: "mr-skeleton-table" },
						[0, 1, 2, 3, 4, 5].map((row) =>
							h(
								"div",
								{ className: "mr-skeleton-row", key: "page-sk-" + row },
								h(Skeleton, { width: "5%", height: 12 }),
								h(Skeleton, { width: "24%", height: 12 }),
								h(Skeleton, { width: "12%", height: 12 }),
								h(Skeleton, { width: "12%", height: 12 }),
								h(Skeleton, { width: "10%", height: 12 }),
								h(Skeleton, { width: "12%", height: 12 }),
							),
						),
					),
				),
				h(
					"div",
					{ className: "mr-chart-grid" },
					h("div", { className: "mr-panel" }, h(Skeleton, { width: "100%", height: 210 })),
					h("div", { className: "mr-panel" }, h(Skeleton, { width: "100%", height: 210 })),
				),
			);
		}

		function Page(props) {
			const translate = props && props.t;
			const translatorRef = React.useRef(null);
			if (translatorRef.current === null || translatorRef.current.source !== translate) {
				translatorRef.current = { source: translate, fn: makeTranslator(translate) };
			}
			const tr = React.useCallback((key, params) => translatorRef.current.fn(key, params), []);
			const [view, setView] = React.useState("ranking");
			const [range, setRange] = React.useState("week");
			const [meta, setMeta] = React.useState({ data: null, error: null });
			const [catalog, setCatalog] = React.useState({ data: null, status: "loading", error: null });
			const [batches, setBatches] = React.useState({ data: null, status: "loading", error: null });
			const [report, setReport] = React.useState({ data: null, status: "idle", range: "week", error: null, at: null });
			const [reloadToken, setReloadToken] = React.useState(0);
			const [refreshing, setRefreshing] = React.useState(false);
			const [toast, setToast] = React.useState(null);
			const [drawer, setDrawer] = React.useState(null);
			const [startOpen, setStartOpen] = React.useState(false);
			const [progressOpen, setProgressOpen] = React.useState(false);
			const [runState, setRunState] = React.useState(null);
			const [stopping, setStopping] = React.useState(false);
			const [resumingId, setResumingId] = React.useState(null);
			const [settingsState, setSettingsState] = React.useState({ data: null, status: "loading", error: null });
			const [rerunState, setRerunState] = React.useState(null);
			const [detailsVersion, setDetailsVersion] = React.useState(0);
			const [detailErrors, setDetailErrors] = React.useState({});
			const [themeMode, setThemeMode] = React.useState(() => readThemePreference() ?? hostColorScheme());
			const isDark = themeMode === "dark";
			const toggleTheme = React.useCallback(() => {
				setThemeMode((current) => {
					const next = current === "dark" ? "light" : "dark";
					writeThemePreference(next);
					return next;
				});
			}, []);
			const detailsRef = React.useRef(new Map());
			const pendingDetailsRef = React.useRef(new Map());
			const reportCacheRef = React.useRef(new Map());
			const reportSeqRef = React.useRef(0);
			const reportFreshRef = React.useRef(false);
			const viewRef = React.useRef(view);
			const rangeRef = React.useRef(range);
			viewRef.current = view;
			rangeRef.current = range;
			const mountedRef = React.useRef(true);
			const toastTimerRef = React.useRef(null);
			const autoOpenedRef = React.useRef(false);
			const finishedRef = React.useRef(null);
			const catalogRef = React.useRef(null);
			const refreshNoticeRef = React.useRef(false);
			const manualRefreshRef = React.useRef(false);

			const showToast = React.useCallback((message, kind) => {
				if (message === null || message === undefined || message === "") return;
				setToast({ message: String(message), kind: kind ?? "info", id: Date.now() + Math.random() });
				if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
				toastTimerRef.current = window.setTimeout(() => {
					toastTimerRef.current = null;
					setToast(null);
				}, 4500);
			}, []);

			React.useEffect(() => {
				mountedRef.current = true;
				return () => {
					mountedRef.current = false;
					if (toastTimerRef.current !== null) {
						window.clearTimeout(toastTimerRef.current);
						toastTimerRef.current = null;
					}
				};
			}, []);

			React.useEffect(() => {
				catalogRef.current = catalog.data;
			}, [catalog.data]);

			const loadSettings = React.useCallback(async () => {
				try {
					const data = await getJson("/settings");
					if (mountedRef.current) setSettingsState({ data, status: "ready", error: null });
				} catch (error) {
					if (mountedRef.current) setSettingsState((current) => ({ data: current.data, status: "error", error }));
				}
			}, []);

			React.useEffect(() => {
				void loadSettings();
			}, [loadSettings, reloadToken]);

			const lastSettingsViewRef = React.useRef(view);
			React.useEffect(() => {
				const leavingSettings = lastSettingsViewRef.current === "settings" && view !== "settings";
				lastSettingsViewRef.current = view;
				if (leavingSettings) void loadSettings();
			}, [view, loadSettings]);

			const loadCatalog = React.useCallback(async (fresh) => {
				setCatalog((current) => ({ data: current.data, status: "loading", error: null }));
				try {
					const data = await getJson("/catalog" + (fresh ? "?fresh=1" : ""));
					if (mountedRef.current) setCatalog({ data, status: "ready", error: null });
					return data;
				} catch (error) {
					if (mountedRef.current) setCatalog((current) => ({ data: current.data, status: "error", error }));
					return null;
				}
			}, []);

			const loadBatchDetail = React.useCallback((id, options) => {
				const force = options?.force === true;
				const silent = options?.silent === true;
				if (force !== true && detailsRef.current.has(id)) return Promise.resolve(detailsRef.current.get(id));
				if (pendingDetailsRef.current.has(id)) return pendingDetailsRef.current.get(id);
				const request = (async () => {
					try {
						const data = await getJson("/batches/" + encodeURIComponent(id));
						const batch = data?.batch ?? null;
						if (batch !== null) {
							detailsRef.current.set(id, batch);
							if (mountedRef.current) {
								setDetailsVersion((version) => version + 1);
								setDetailErrors((current) => {
									if (!(id in current)) return current;
									const next = { ...current };
									delete next[id];
									return next;
								});
							}
						}
						return batch;
					} catch (error) {
						if (mountedRef.current) {
							setDetailErrors((current) => ({ ...current, [id]: errorMessageOf(error) }));
							if (silent !== true) showToast(tr("mr.toast.batchFailed") + ": " + errorMessageOf(error), "error");
						}
						return null;
					} finally {
						pendingDetailsRef.current.delete(id);
					}
				})();
				pendingDetailsRef.current.set(id, request);
				return request;
			}, [showToast, tr]);

			const loadReport = React.useCallback(async (nextRange, options) => {
				const fresh = options?.fresh === true;
				const cached = reportCacheRef.current.get(nextRange);
				const now = Date.now();
				if (!fresh && cached !== undefined && now - cached.at < REPORT_CACHE_MS) {
					setReport({ data: cached.data, status: "ready", range: nextRange, error: null, at: cached.at });
					return cached.data;
				}
				if (fresh) reportCacheRef.current.delete(nextRange);
				const seq = reportSeqRef.current + 1;
				reportSeqRef.current = seq;
				setReport((current) => ({
					data: current.range === nextRange ? current.data : null,
					status: "loading",
					range: nextRange,
					error: null,
					at: current.range === nextRange ? current.at : null,
				}));
				const url = "/report?range=" + encodeURIComponent(nextRange) + (fresh ? "&fresh=1" : "");
				try {
					const data = await getJson(url);
					if (!mountedRef.current || reportSeqRef.current !== seq) return data;
					const at = Date.now();
					reportCacheRef.current.set(nextRange, { data, at });
					if (viewRef.current === "performance" && rangeRef.current === nextRange) {
						setReport({ data, status: "ready", range: nextRange, error: null, at });
					}
					return data;
				} catch (error) {
					if (mountedRef.current && reportSeqRef.current === seq && viewRef.current === "performance" && rangeRef.current === nextRange) {
						setReport((current) => ({
							data: current.range === nextRange ? current.data : null,
							status: "error",
							range: nextRange,
							error,
							at: current.range === nextRange ? current.at : null,
						}));
					}
					return null;
				}
			}, []);

			React.useEffect(() => {
				let alive = true;
				const manual = reloadToken > 0;
				const notify = refreshNoticeRef.current;
				refreshNoticeRef.current = false;
				const tasks = [];
				setRefreshing(true);
				tasks.push(
					getJson("/meta")
						.then((data) => {
							if (alive) setMeta({ data, error: null });
						})
						.catch((error) => {
							if (alive) setMeta({ data: null, error });
						}),
				);
				tasks.push(
					getJson("/batches")
						.then((data) => {
							if (alive) setBatches({ data: Array.isArray(data?.batches) ? data.batches : [], status: "ready", error: null });
						})
						.catch((error) => {
							if (alive) setBatches((current) => ({ data: current.data, status: "error", error }));
						}),
				);
				if (catalogRef.current === null || manual) tasks.push(loadCatalog(manual));
				tasks.push(
					getJson("/run")
						.then((data) => {
							if (!alive) return;
							if (data?.running === true && data.batch) {
								if (autoOpenedRef.current !== true) {
									autoOpenedRef.current = true;
									setProgressOpen(true);
								}
								setRunState({ batch: data.batch, running: true, elapsedMs: data.elapsedMs ?? 0 });
								return;
							}
							setRunState((current) => {
								if (current === null || data?.batch === undefined || data?.batch === null) return current;
								if (current.batch?.id !== data.batch.id) return current;
								return { batch: data.batch, running: false, elapsedMs: data.elapsedMs ?? null };
							});
						})
						.catch(() => undefined),
				);
				Promise.allSettled(tasks).then((results) => {
					if (!alive) return;
					setRefreshing(false);
					if (notify) {
						const failed = results.some((result) => result.status === "rejected");
						showToast(failed ? tr("mr.toast.refreshFailed") : tr("mr.toast.refreshed"), failed ? "error" : "success");
					}
				});
				return () => {
					alive = false;
				};
			}, [reloadToken, loadCatalog, showToast, tr]);

			React.useEffect(() => {
				if (view !== "performance") return undefined;
				const forceFresh = reportFreshRef.current;
				reportFreshRef.current = false;
				const cached = reportCacheRef.current.get(range);
				if (!forceFresh && cached !== undefined && Date.now() - cached.at < REPORT_CACHE_MS) {
					setReport({ data: cached.data, status: "ready", range, error: null, at: cached.at });
					return undefined;
				}
				void loadReport(range, { fresh: forceFresh });
				return undefined;
			}, [view, range, loadReport]);

			React.useEffect(() => {
				const list = Array.isArray(batches.data) ? batches.data : [];
				if (list.length === 0) return undefined;
				const recent = [...list]
					.sort((left, right) => (toFiniteNumber(right.createdAt, 0) ?? 0) - (toFiniteNumber(left.createdAt, 0) ?? 0))
					.slice(0, TREND_BATCH_LIMIT);
				// A manual refresh re-reads only the newest batch; the rest stay
				// cached so one click cannot pull tens of megabytes again.
				const forceId = manualRefreshRef.current ? recent[0]?.id ?? null : null;
				manualRefreshRef.current = false;
				let alive = true;
				(async () => {
					for (let index = 0; index < recent.length; index += 3) {
						if (!alive) return;
						await Promise.all(
							recent.slice(index, index + 3).map((entry) => loadBatchDetail(entry.id, { force: entry.id === forceId, silent: true })),
						);
					}
				})();
				return () => {
					alive = false;
				};
			}, [batches.data, loadBatchDetail]);

			React.useEffect(() => {
				if (runState === null || runState.running !== true || !runState.batch?.id) return undefined;
				const batchId = runState.batch.id;
				let cancelled = false;
				let warned = false;
				let inFlight = false;
				const poll = async () => {
					if (inFlight) return;
					inFlight = true;
					try {
						const data = await getJson("/run?batch=" + encodeURIComponent(batchId));
						if (cancelled || data === null) return;
						if (data.batch) {
							setRunState({
								batch: data.batch,
								running: data.running === true,
								elapsedMs: data.elapsedMs ?? null,
							});
						}
					} catch (error) {
						if (!cancelled && !warned) {
							warned = true;
							showToast(tr("mr.run.pollFailed") + ": " + errorMessageOf(error), "error");
						}
					} finally {
						inFlight = false;
					}
				};
				poll();
				const timer = window.setInterval(poll, POLL_INTERVAL_MS);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [runState?.batch?.id, runState?.running, showToast, tr]);

			React.useEffect(() => {
				if (runState === null || runState.running === true) return;
				const batchId = runState.batch?.id ?? null;
				if (batchId === null || finishedRef.current === batchId) return;
				finishedRef.current = batchId;
				const status = runState.batch?.status ?? "done";
				const wasProgressOpen = progressOpen;
				setProgressOpen(false);
				if (wasProgressOpen || view === "ranking") setView("ranking");
				reportCacheRef.current.clear();
				reportFreshRef.current = true;
				setReloadToken((token) => token + 1);
				showToast(
					status === "interrupted"
						? tr("mr.run.interruptedToast")
						: tr("mr.run.finished", { status: statusLabel(tr, status) }),
					status === "done" ? "success" : status === "error" ? "error" : "info",
				);
			}, [runState, showToast, tr, progressOpen, view]);

			const refreshAll = React.useCallback(() => {
				refreshNoticeRef.current = true;
				manualRefreshRef.current = true;
				reportCacheRef.current.clear();
				reportFreshRef.current = true;
				setReloadToken((token) => token + 1);
				if (view === "performance") {
					reportFreshRef.current = false;
					void loadReport(range, { fresh: true });
				}
			}, [view, range, loadReport]);

			const openStart = React.useCallback(() => {
				setStartOpen(true);
				if (catalogRef.current === null) loadCatalog(false);
			}, [loadCatalog]);

			const openBatch = React.useCallback((batchId, focusComboKey, focusTaskId) => {
				setDrawer({
					batchId,
					focusComboKey: focusComboKey ?? null,
					focusTaskId: focusTaskId ?? null,
					batch: detailsRef.current.get(batchId) ?? null,
				});
			}, []);

			const closeDrawer = React.useCallback(() => setDrawer(null), []);

			const openRerun = React.useCallback((batch, initialSelection) => {
				if (batch === null || batch === undefined) return;
				setDrawer(null);
				setProgressOpen(false);
				setRerunState({ batch, initialSelection: initialSelection ?? null });
			}, []);

			const openRerunById = React.useCallback(async (batchId, initialSelection) => {
				const cached = detailsRef.current.get(batchId) ?? null;
				const batch = cached !== null ? cached : await loadBatchDetail(batchId, { force: false, silent: true });
				if (batch === null || batch === undefined) {
					showToast(tr("mr.rerun.errorFailed"), "error");
					return;
				}
				openRerun(batch, initialSelection ?? null);
			}, [loadBatchDetail, openRerun, showToast, tr]);

			const handleRerunStarted = React.useCallback((batch) => {
				setRerunState(null);
				if (batch === null || batch === undefined) return;
				detailsRef.current.set(batch.id, batch);
				setDetailsVersion((version) => version + 1);
				finishedRef.current = null;
				autoOpenedRef.current = true;
				setProgressOpen(true);
				setView("ranking");
				setRunState({ batch, running: true, elapsedMs: 0 });
				showToast(tr("mr.rerun.toastStarted"), "success");
			}, [showToast, tr]);

			const handleStarted = React.useCallback((batch) => {
				setStartOpen(false);
				setProgressOpen(true);
				setView("ranking");
				setRunState({ batch, running: true, elapsedMs: 0 });
			}, []);

			const resumeBatch = React.useCallback(async (batchId) => {
				if (batchId === null || batchId === undefined || resumingId !== null || runState?.running === true) return;
				setResumingId(batchId);
				try {
					const result = await postJson("/resume", { batchId });
					const batch = result.ok === true ? result.data?.batch ?? null : null;
					if (batch === null) {
						const message = result.data?.error ?? result.error?.message ?? "HTTP " + String(result.status ?? 0);
						showToast(tr("mr.resume.failed") + ": " + message, "error");
						return;
					}
					detailsRef.current.set(batch.id, batch);
					setDetailsVersion((version) => version + 1);
					finishedRef.current = null;
					autoOpenedRef.current = true;
					setProgressOpen(true);
					setView("ranking");
					setRunState({ batch, running: true, elapsedMs: 0 });
					showToast(
						tr("mr.resume.toast", {
							done: toFiniteNumber(batch.progress?.done, 0) ?? 0,
							total: toFiniteNumber(batch.progress?.total, Array.isArray(batch.runs) ? batch.runs.length : 0) ?? 0,
						}),
						"success",
					);
				} finally {
					if (mountedRef.current) setResumingId(null);
				}
			}, [resumingId, runState?.running, showToast, tr]);

			const stopFromTop = React.useCallback(async () => {
				if (runState?.batch?.id === undefined || stopping) return;
				setStopping(true);
				const result = await postJson("/stop", { batchId: runState.batch.id });
				if (mountedRef.current) setStopping(false);
				if (result.ok) showToast(tr("mr.toast.stopped"), "success");
				else showToast(tr("mr.run.stopFailed"), "error");
			}, [runState?.batch?.id, stopping, showToast, tr]);

			const sortedBatches = React.useMemo(() => {
				const list = Array.isArray(batches.data) ? batches.data : [];
				return [...list].sort(
					(left, right) => (toFiniteNumber(right.createdAt, 0) ?? 0) - (toFiniteNumber(left.createdAt, 0) ?? 0),
				);
			}, [batches.data]);

			const details = React.useMemo(() => {
				// detailsVersion invalidates the memo when the mutable cache changes.
				void detailsVersion;
				return [...detailsRef.current.values()];
			}, [detailsVersion, batches.data]);

			const latestEntry = sortedBatches[0] ?? null;
			const latestBatch = latestEntry === null ? null : detailsRef.current.get(latestEntry.id) ?? null;
			const speedBatch = React.useMemo(() => findLatestSpeedBatch(details), [details]);
			const detailById = React.useMemo(() => {
				const map = new Map();
				for (const batch of details) map.set(batch.id, batch);
				return map;
			}, [details]);
			const running = runState?.running === true;

			let content = null;
			if (batches.data === null && batches.status === "loading") {
				content = h(PageSkeleton, { tr });
			} else if (batches.data === null) {
				content = h(
					"div",
					{ className: "mr-error-box" },
					h(AlertIcon, { size: 15 }),
					h(
						"div",
						null,
						h("div", { className: "mr-error-title" }, tr("mr.page.loadFailed")),
						h("div", { className: "mr-error-detail" }, errorMessageOf(batches.error)),
					),
					h("button", { type: "button", className: "mr-btn is-ghost mr-btn-small", onClick: refreshAll }, tr("mr.common.retry")),
				);
			} else if (view === "performance") {
				content = h(PerformanceView, {
					tr,
					range,
					reportState: report,
					catalog: catalog.data,
					speedBatch,
					onRangeChange: setRange,
					onRetry: refreshAll,
					onOpenBatch: openBatch,
				});
			} else if (view === "history") {
				content = h(HistoryView, {
					tr,
					batches: sortedBatches,
					status: batches.status,
					catalog: catalog.data,
					detailById,
					onOpenBatch: openBatch,
					onStart: openStart,
					onResume: resumeBatch,
					onRerun: openRerunById,
					resumingId: resumingId,
					running: running,
				});
			} else if (view === "settings") {
				content = h(SettingsView, {
					tr,
					catalog: catalog.data,
					running,
					onToast: showToast,
				});
			} else {
				content = h(RankingView, {
					tr,
					batches: sortedBatches,
					details,
					latestEntry,
					latestBatch,
					latestError: latestEntry === null ? null : detailErrors[latestEntry.id] ?? null,
					meta: meta.data,
					catalog: catalog.data,
					onStart: openStart,
					onRetry: refreshAll,
					onOpenBatch: openBatch,
					onOpenModel: openBatch,
					onResume: resumeBatch,
					resumingId: resumingId,
					running: running,
					settings: settingsState.data?.effective ?? null,
					onRerun: openRerunById,
				});
			}

			const viewIcons = {
				ranking: h(TrophyIcon, { size: 14 }),
				performance: h(GaugeIcon, { size: 14 }),
				history: h(ClockIcon, { size: 14 }),
				settings: h(CogIcon, { size: 14 }),
			};
			return h(
				"div",
				{ className: "mr-page", "data-mr-theme": themeMode },
				h(
					"div",
					{ className: "mr-scroll" },
					h(
						"div",
						{ className: "mr-content" },
						h(
							"header",
						{ className: "mr-head" },
						h(
							"div",
							{ className: "mr-title-row" },
							h(
								"span",
								{ className: "mr-logo-wrap" },
								h("span", { className: "mr-brand-fan", "aria-hidden": true }),
								h(BrandMark, { size: 40 }),
							),
							h(
								"div",
								null,
								h("h1", { className: "mr-title" }, tr("mr.page.title")),
								h("p", { className: "mr-subtitle" }, tr("mr.page.subtitle")),
							),
						),
						h(
							"div",
							{ className: "mr-head-actions" },
							running
								? h("span", { className: "mr-running-pill" }, h("span", { className: "mr-live-dot", "aria-hidden": true }), tr("mr.page.running"))
								: null,
							h(
								"button",
								{
									type: "button",
									className: "mr-theme-switch" + (isDark ? " is-dark" : ""),
									role: "switch",
									"aria-checked": isDark,
									"aria-label": tr(isDark ? "mr.theme.toLight" : "mr.theme.toDark"),
									title: tr(isDark ? "mr.theme.toLight" : "mr.theme.toDark"),
									onClick: toggleTheme,
								},
								h(
									"span",
									{ className: "mr-theme-track", "aria-hidden": true },
									h("span", { className: "mr-theme-ic is-sun" }, h(SunIcon, { size: 13 })),
									h("span", { className: "mr-theme-ic is-moon" }, h(MoonIcon, { size: 13 })),
									h("span", { className: "mr-theme-thumb" }),
								),
							),
							h(
								"button",
								{
									type: "button",
									className: "mr-btn is-ghost" + (refreshing ? " is-busy" : ""),
									onClick: refreshAll,
									disabled: refreshing,
									"aria-label": tr("mr.aria.refresh"),
									"aria-busy": refreshing,
								},
								h("span", { className: "mr-btn-icon" }, h(RefreshIcon, { size: 14 })),
								refreshing ? tr("mr.page.refreshing") : tr("mr.page.refresh"),
							),
							running
								? h(
									React.Fragment,
									null,
									h(
										"button",
										{ type: "button", className: "mr-btn", onClick: () => setProgressOpen(true) },
										tr("mr.page.viewProgress"),
									),
									h(
										"button",
										{ type: "button", className: "mr-btn is-danger", onClick: stopFromTop, disabled: stopping },
										h(StopIcon, { size: 12 }),
										stopping ? tr("mr.run.stopping") : tr("mr.page.stop"),
									),
								)
								: h(
									"button",
									{ type: "button", className: "mr-btn is-primary", onClick: openStart, "aria-label": tr("mr.aria.start") },
									h(PlayIcon, { size: 13 }),
									tr("mr.page.start"),
								),
						),
					),
					h(
						"div",
						{ className: "mr-tabs", role: "tablist", "aria-label": tr("mr.view.tabs") },
						VIEW_OPTIONS.map((option) =>
							h(
								"button",
								{
									type: "button",
									key: option.id,
									id: "mr-view-tab-" + option.id,
									role: "tab",
									"aria-selected": view === option.id,
									"aria-controls": "mr-view-panel",
									className: "mr-tab" + (view === option.id ? " is-active" : ""),
									onClick: () => setView(option.id),
								},
								h("span", { className: "mr-tab-icon", "aria-hidden": true }, viewIcons[option.id]),
								h("span", null, tr(option.labelKey)),
								option.id === "history" && sortedBatches.length > 0
									? h("span", { className: "mr-tab-count mr-mono" }, sortedBatches.length)
									: null,
							),
						),
					),
					h(
						"div",
						{ id: "mr-view-panel", role: "tabpanel", "aria-labelledby": "mr-view-tab-" + view, tabIndex: -1 },
						content,
					),
					h(
						"footer",
						{ className: "mr-credits" },
						h("span", { className: "mr-credits-prefix" }, tr("mr.credits.prefix")),
						h(
							"a",
							{ href: "https://github.com/zoefix/agent-speed", target: "_blank", rel: "noopener noreferrer" },
							"Agent Speed",
						),
						h("span", { className: "mr-credits-sep", "aria-hidden": true }, "·"),
						h(
							"a",
							{ href: "https://codexradar.com/", target: "_blank", rel: "noopener noreferrer" },
							"Codex Radar",
						),
					),
					),
				),
				drawer === null
					? null
					: h(DetailDrawer, {
						tr,
						batchId: drawer.batchId,
						focusComboKey: drawer.focusComboKey,
						focusTaskId: drawer.focusTaskId,
						initialBatch: drawer.batch ?? null,
						loadBatch: loadBatchDetail,
						catalog: catalog.data,
						meta: meta.data,
						onClose: closeDrawer,
						onResume: resumeBatch,
						resumingId: resumingId,
						running: running,
						modalOpen: rerunState !== null,
						onRequestRerun: openRerun,
					}),
				startOpen
					? h(StartDialog, {
						tr,
						catalog: catalog.data,
						catalogStatus: catalog.status,
						catalogError: catalog.error,
						onClose: () => setStartOpen(false),
						onRetryCatalog: () => {
							loadCatalog(true);
						},
						onStarted: handleStarted,
					})
					: null,
				progressOpen && runState !== null
					? h(ProgressDialog, {
						tr,
						run: runState,
						onClose: () => setProgressOpen(false),
						onStopRequested: () => showToast(tr("mr.toast.stopped"), "success"),
						onStopFailed: () => showToast(tr("mr.run.stopFailed"), "error"),
						onRerun: (batch) => openRerun(batch, null),
					})
					: null,
				rerunState === null
					? null
					: h(RerunDialog, {
						tr,
						batch: rerunState.batch,
						initialSelection: rerunState.initialSelection,
						onClose: () => setRerunState(null),
						onStarted: handleRerunStarted,
					}),
				toast === null
					? null
					: h(
						"div",
						{ className: "mr-toast is-" + toast.kind, key: toast.id, role: "status" },
						toast.kind === "error" ? h(AlertIcon, { size: 13 }) : toast.kind === "success" ? h(CheckIcon, { size: 13 }) : h(SparkIcon, { size: 13 }),
						h("span", { className: "mr-toast-text" }, toast.message),
						h(
							"button",
							{ type: "button", className: "mr-toast-close", onClick: () => setToast(null), "aria-label": tr("mr.aria.close") },
							h(CloseIcon, { size: 11 }),
						),
					),
			);
		}

		// ── settings view: editable runtime config ──────────────────────────
		//
		// Rendered as a Page tab. Loads GET /settings, keeps a local draft in
		// display units (minutes / hours / percent) and only converts to the
		// wire shape on save. Dirty is a string-level comparison between the
		// draft and the last server-confirmed baseline, so server-side clamp
		// and normalization never produce phantom "unsaved" states.

		const settingsNumericKeys = [
			"maxParallelModels",
			"maxCombos",
			"autoRetries",
			"perTaskMinutes",
			"perBatchHours",
			"judgeMaxAttempts",
			"speedRuns",
			"retentionBatches",
			"usdToCny",
			"recommendQuality",
			"recommendSpeed",
			"recommendCost",
			"recommendStability",
		];

		function settingsParseNumber(value) {
			if (typeof value === "number") return Number.isFinite(value) ? value : null;
			if (typeof value !== "string") return null;
			const text = value.trim();
			if (text === "") return null;
			const number = Number(text);
			return Number.isFinite(number) ? number : null;
		}

		function settingsClampNumber(value, range, fallback) {
			const parsed = typeof value === "number" ? value : settingsParseNumber(value);
			let result = parsed === null ? fallback : parsed;
			if (!Number.isFinite(result)) result = fallback;
			const min = toFiniteNumber(range?.min, null);
			const max = toFiniteNumber(range?.max, null);
			if (min !== null) result = Math.max(min, result);
			if (max !== null) result = Math.min(max, result);
			return result;
		}

		function settingsDraftText(value, fallback, digits) {
			const number = toFiniteNumber(value, fallback);
			if (number === null) return "";
			const factor = Math.pow(10, typeof digits === "number" ? digits : 0);
			return String(Math.round(number * factor) / factor);
		}

		function settingsRangeOf(ranges, key, fallback) {
			const range = ranges !== null && typeof ranges === "object" ? ranges[key] : null;
			return range !== null && typeof range === "object" ? range : fallback;
		}

		function settingsRangeText(tr, range, unit, factor, digits) {
			const scale = typeof factor === "number" && factor > 0 ? factor : 1;
			const places = typeof digits === "number" ? digits : 2;
			const min = toFiniteNumber(range?.min, null);
			const max = toFiniteNumber(range?.max, null);
			const step = toFiniteNumber(range?.step, null);
			if (min === null && max === null && step === null) return "";
			const params = {
				min: min === null ? "—" : formatNumber(min / scale, places),
				max: max === null ? "—" : formatNumber(max / scale, places),
				step: step === null ? "—" : formatNumber(step / scale, places),
			};
			if (typeof unit === "string" && unit !== "") return tr("mr.settings.hint.range", { ...params, unit });
			return tr("mr.settings.hint.rangeUnitless", params);
		}

		function settingsRangeMsText(tr, range) {
			const min = toFiniteNumber(range?.min, null);
			const max = toFiniteNumber(range?.max, null);
			const step = toFiniteNumber(range?.step, null);
			if (min === null && max === null && step === null) return "";
			return tr("mr.settings.hint.rangeMs", {
				min: min === null ? "—" : formatInt(min),
				max: max === null ? "—" : formatInt(max),
				step: step === null ? "—" : formatInt(step),
			});
		}

		function settingsIntValue(text, range, fallback) {
			return Math.round(settingsClampNumber(settingsParseNumber(text), range, fallback));
		}

		function settingsMsValue(text, unitMs, range, fallbackMs) {
			const number = settingsParseNumber(text);
			const raw = number === null ? fallbackMs : number * unitMs;
			return Math.round(settingsClampNumber(raw, range, fallbackMs));
		}

		function settingsWeightValue(text, range, fallback) {
			const number = settingsParseNumber(text);
			const ratio = number === null ? fallback : number / 100;
			return Math.round(settingsClampNumber(ratio, range, fallback) * 10000) / 10000;
		}

		function settingsRateValue(text, range, fallback) {
			const number = settingsParseNumber(text);
			return Math.round(settingsClampNumber(number === null ? fallback : number, range, fallback) * 100) / 100;
		}

		function settingsConvertText(tr, kind, ms) {
			const number = toFiniteNumber(ms, null);
			if (number === null) return "";
			if (kind === "task") {
				return tr("mr.settings.convert.task", {
					ms: formatInt(number),
					minutes: formatNumber(number / 60000, 2),
					hours: formatNumber(number / 3600000, 2),
				});
			}
			return tr("mr.settings.convert.batch", {
				ms: formatInt(number),
				hours: formatNumber(number / 3600000, 2),
				minutes: formatNumber(number / 60000, 2),
			});
		}

		function settingsDraftFrom(effective) {
			const source = effective !== null && typeof effective === "object" ? effective : {};
			const judge = source.judge !== null && typeof source.judge === "object" ? source.judge : {};
			const recommend = source.recommend !== null && typeof source.recommend === "object" ? source.recommend : {};
			const pricing = source.pricing !== null && typeof source.pricing === "object" ? source.pricing : {};
			const taskMs = toFiniteNumber(source.perTaskTimeoutMs, 10800000) ?? 10800000;
			const batchMs = toFiniteNumber(source.perBatchTimeoutMs, 172800000) ?? 172800000;
			return {
				maxParallelModels: settingsDraftText(source.maxParallelModels, 3, 0),
				maxCombos: settingsDraftText(source.maxCombos, 0, 0),
				autoRetries: settingsDraftText(source.autoRetries, 1, 0),
				perTaskMinutes: settingsDraftText(taskMs / 60000, 180, 2),
				perBatchHours: settingsDraftText(batchMs / 3600000, 48, 2),
				judgeMaxAttempts: settingsDraftText(source.judgeMaxAttempts, 2, 0),
				speedRuns: settingsDraftText(source.speedRuns, 3, 0),
				retentionBatches: settingsDraftText(source.retentionBatches, 200, 0),
				usdToCny: settingsDraftText(pricing.usdToCny, 7.1, 2),
				recommendQuality: settingsDraftText((toFiniteNumber(recommend.quality, 0.45) ?? 0.45) * 100, 45, 2),
				recommendSpeed: settingsDraftText((toFiniteNumber(recommend.speed, 0.2) ?? 0.2) * 100, 20, 2),
				recommendCost: settingsDraftText((toFiniteNumber(recommend.cost, 0.2) ?? 0.2) * 100, 20, 2),
				recommendStability: settingsDraftText((toFiniteNumber(recommend.stability, 0.15) ?? 0.15) * 100, 15, 2),
				judgeProvider: String(judge.provider ?? ""),
				judgeModel: String(judge.model ?? ""),
				judgeEffort: judge.reasoningEffort === null || judge.reasoningEffort === undefined ? "" : String(judge.reasoningEffort),
			};
		}

		function settingsDraftKey(draft) {
			if (draft === null || typeof draft !== "object") return "";
			return JSON.stringify([
				draft.maxParallelModels,
				draft.maxCombos,
				draft.autoRetries,
				draft.perTaskMinutes,
				draft.perBatchHours,
				draft.judgeMaxAttempts,
				draft.speedRuns,
				draft.retentionBatches,
				draft.usdToCny,
				draft.recommendQuality,
				draft.recommendSpeed,
				draft.recommendCost,
				draft.recommendStability,
				draft.judgeProvider,
				draft.judgeModel,
				draft.judgeEffort,
			]);
		}

		function settingsResolveJudge(draft, catalog) {
			const providerId = String(draft?.judgeProvider ?? "").trim();
			const modelId = String(draft?.judgeModel ?? "").trim();
			let effortId = String(draft?.judgeEffort ?? "").trim();
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const provider = providers.find((entry) => entry.id === providerId) ?? null;
			const models = Array.isArray(provider?.models) ? provider.models : [];
			const model = models.find((entry) => entry.id === modelId) ?? null;
			if (model !== null) {
				const efforts = Array.isArray(model.efforts) ? model.efforts : [];
				if (efforts.length === 0) effortId = "";
				else if (!efforts.some((entry) => entry.id === effortId)) effortId = model.defaultEffort ?? efforts[0]?.id ?? "";
			}
			return {
				provider: providerId,
				model: modelId,
				reasoningEffort: effortId === "" ? null : effortId,
			};
		}

		function settingsBuildValues(draft, data, catalog, baseline) {
			if (draft === null || typeof draft !== "object") return null;
			const source = data !== null && typeof data === "object" ? data : {};
			const ranges = source.ranges !== null && typeof source.ranges === "object" ? source.ranges : {};
			const usdToCny = settingsRateValue(draft.usdToCny, ranges.usdToCny, 7.1);
			const values = {
				maxParallelModels: settingsIntValue(draft.maxParallelModels, ranges.maxParallelModels, 3),
				maxCombos: settingsIntValue(draft.maxCombos, ranges.maxCombos, 0),
				autoRetries: settingsIntValue(draft.autoRetries, ranges.autoRetries, 1),
				perTaskTimeoutMs: settingsMsValue(draft.perTaskMinutes, 60000, ranges.perTaskTimeoutMs, 10800000),
				perBatchTimeoutMs: settingsMsValue(draft.perBatchHours, 3600000, ranges.perBatchTimeoutMs, 172800000),
				judgeMaxAttempts: settingsIntValue(draft.judgeMaxAttempts, ranges.judgeMaxAttempts, 2),
				speedRuns: settingsIntValue(draft.speedRuns, ranges.speedRuns, 3),
				retentionBatches: settingsIntValue(draft.retentionBatches, ranges.retentionBatches, 200),
				recommend: {
					quality: settingsWeightValue(draft.recommendQuality, ranges.recommend, 0.45),
					speed: settingsWeightValue(draft.recommendSpeed, ranges.recommend, 0.2),
					cost: settingsWeightValue(draft.recommendCost, ranges.recommend, 0.2),
					stability: settingsWeightValue(draft.recommendStability, ranges.recommend, 0.15),
				},
				pricing: { usdToCny },
			};
			// Only send the judge when it actually changed: the Host re-validates
			// it against the live catalog, which can fail while the model service
			// is temporarily unavailable, and an unchanged judge needs no check.
			const judgeUnchanged = baseline !== null && baseline !== undefined && typeof baseline === "object"
				&& draft.judgeProvider === baseline.judgeProvider
				&& draft.judgeModel === baseline.judgeModel
				&& draft.judgeEffort === baseline.judgeEffort;
			if (!judgeUnchanged) values.judge = settingsResolveJudge(draft, catalog);
			return values;
		}

		function settingsNormalizedWeights(draft) {
			const keys = ["recommendQuality", "recommendSpeed", "recommendCost", "recommendStability"];
			const weights = keys.map((key) => {
				const number = settingsParseNumber(draft?.[key]);
				return settingsClampNumber(number === null ? 0 : number / 100, { min: 0, max: 1 }, 0);
			});
			const sum = weights.reduce((total, value) => total + value, 0);
			const shares = weights.map((value) => (sum > 0 ? value / sum : 0.25));
			return { weights, sum, shares };
		}

		function settingsProviderName(catalog, providerId) {
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const entry = providers.find((item) => item.id === providerId) ?? null;
			const name = entry === null ? null : entry.name;
			if (typeof name === "string" && name !== "") return name;
			const fallback = String(providerId ?? "");
			return fallback === "" ? "—" : fallback;
		}

		function settingsModelName(catalog, providerId, modelId) {
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const provider = providers.find((item) => item.id === providerId) ?? null;
			const models = Array.isArray(provider?.models) ? provider.models : [];
			const model = models.find((item) => item.id === modelId) ?? null;
			const name = model === null ? null : model.name;
			if (typeof name === "string" && name !== "") return name;
			const fallback = String(modelId ?? "");
			return fallback === "" ? "—" : fallback;
		}

		function settingsEffortName(catalog, providerId, modelId, effortId) {
			if (effortId === null || effortId === undefined || effortId === "") return null;
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const provider = providers.find((item) => item.id === providerId) ?? null;
			const models = Array.isArray(provider?.models) ? provider.models : [];
			const model = models.find((item) => item.id === modelId) ?? null;
			const efforts = Array.isArray(model?.efforts) ? model.efforts : [];
			const effort = efforts.find((item) => item.id === effortId) ?? null;
			const name = effort === null ? null : effort.name;
			if (typeof name === "string" && name !== "") return name;
			return String(effortId);
		}

		function settingsWhitelistLabel(catalog, entry) {
			const text = String(entry ?? "");
			const slash = text.indexOf("/");
			if (slash <= 0) return text;
			const providerId = text.slice(0, slash);
			const modelId = text.slice(slash + 1);
			return settingsProviderName(catalog, providerId) + " / " + settingsModelName(catalog, providerId, modelId);
		}

		function settingsJudgeState(catalog, draft) {
			const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
			const providerId = String(draft?.judgeProvider ?? "");
			const provider = providers.find((entry) => entry.id === providerId) ?? null;
			const models = Array.isArray(provider?.models) ? provider.models : [];
			const modelId = String(draft?.judgeModel ?? "");
			const model = models.find((entry) => entry.id === modelId) ?? null;
			const efforts = Array.isArray(model?.efforts) ? model.efforts : [];
			const effortId = String(draft?.judgeEffort ?? "");
			const effortValid = efforts.length === 0
				? effortId === ""
				: efforts.some((entry) => entry.id === effortId);
			return {
				providers,
				provider,
				models,
				model,
				efforts,
				effortId,
				effortValue: efforts.length === 0
					? ""
					: effortValid
						? effortId
						: model?.defaultEffort ?? efforts[0]?.id ?? "",
				ready: providers.length > 0,
				valid: provider !== null && model !== null,
			};
		}

		function settingsCard(props) {
			const tr = props.tr;
			return h(
				"section",
				{ className: "mr-panel mr-settings-card" + (props.wide === true ? " is-wide" : ""), key: props.cardKey },
				h(
					"div",
					{ className: "mr-panel-head" },
					h(
						"div",
						null,
						h("h3", { className: "mr-panel-title" }, tr(props.titleKey)),
						h("div", { className: "mr-panel-sub" }, tr(props.subKey)),
					),
					h("span", { className: "mr-settings-index mr-mono", "aria-hidden": true }, String(props.index).padStart(2, "0")),
				),
				props.children,
			);
		}

		function settingsNumberRow(props) {
			const tr = props.tr;
			const hints = Array.isArray(props.hints)
				? props.hints.filter((entry) => typeof entry === "string" && entry !== "")
				: [];
			return h(
				"div",
				{ className: "mr-settings-row", key: props.rowKey },
				h(
					"div",
					{ className: "mr-settings-row-text" },
					h("label", { className: "mr-settings-label", htmlFor: props.id }, tr(props.labelKey)),
					typeof props.descKey === "string" ? h("div", { className: "mr-settings-desc" }, tr(props.descKey)) : null,
				),
				h(
					"div",
					{ className: "mr-settings-control" },
					h(
						"div",
						{ className: "mr-settings-input-wrap" },
						h("input", {
							id: props.id,
							type: "number",
							className: "mr-settings-input mr-mono",
							inputMode: "decimal",
							min: props.min,
							max: props.max,
							step: props.step,
							value: props.value,
							disabled: props.disabled === true,
							"aria-label": tr(props.labelKey),
							onChange: (event) => props.onChange(event.target.value),
							onBlur: props.onBlur,
						}),
						typeof props.unit === "string" && props.unit !== "" ? h("span", { className: "mr-settings-unit" }, props.unit) : null,
					),
					hints.length === 0
						? null
						: h(
							"div",
							{ className: "mr-settings-hints" },
							hints.map((text, index) => h(
								"div",
								{ className: "mr-settings-hint" + (index === 0 ? "" : " is-sub"), key: "hint-" + index },
								text,
							)),
						),
				),
			);
		}

		function settingsRangeRow(props) {
			const tr = props.tr;
			return h(
				"div",
				{ className: "mr-settings-rec-row", key: props.rowKey },
				h(
					"div",
					{ className: "mr-settings-rec-head" },
					h("label", { className: "mr-settings-label", htmlFor: props.id }, tr(props.labelKey)),
					h("span", { className: "mr-settings-rec-value mr-mono" }, props.valueText),
				),
				h("input", {
					id: props.id,
					type: "range",
					className: "mr-settings-slider",
					min: props.min,
					max: props.max,
					step: props.step,
					value: props.value,
					disabled: props.disabled === true,
					"aria-label": tr(props.labelKey),
					onChange: (event) => props.onChange(event.target.value),
				}),
			);
		}

		function settingsResponseError(result, tr) {
			const data = result !== null && typeof result === "object" ? result.data : null;
			if (data !== null && typeof data === "object" && typeof data.error === "string" && data.error !== "") return data.error;
			if (result !== null && typeof result === "object" && result.ok === true) return tr("mr.settings.errorPayload");
			return errorMessageOf(result !== null && typeof result === "object" ? result.error : null);
		}

		function SettingsView(props) {
			const tr = typeof props?.tr === "function" ? props.tr : (key) => key;
			const catalog = props?.catalog ?? null;
			const runningProp = typeof props?.running === "boolean" ? props.running : null;
			const onToast = typeof props?.onToast === "function" ? props.onToast : () => {};

			const [state, setState] = React.useState({ status: "loading", data: null, error: null });
			const [draft, setDraft] = React.useState(null);
			const [baseline, setBaseline] = React.useState(null);
			const [saving, setSaving] = React.useState(false);
			const [saveError, setSaveError] = React.useState(null);
			const [saveNotice, setSaveNotice] = React.useState(null);
			const [resetArmed, setResetArmed] = React.useState(false);
			const mountedRef = React.useRef(true);
			const savingRef = React.useRef(false);
			const seqRef = React.useRef(0);
			const trRef = React.useRef(tr);
			trRef.current = tr;

			const load = React.useCallback(async () => {
				const seq = seqRef.current + 1;
				seqRef.current = seq;
				setState((current) => ({
					status: "loading",
					data: current !== null && typeof current === "object" ? current.data : null,
					error: null,
				}));
				try {
					const data = await getJson("/settings");
					if (!mountedRef.current || seqRef.current !== seq) return;
					if (data === null || typeof data !== "object" || data.effective === null || typeof data.effective !== "object") {
						throw new Error(trRef.current("mr.settings.errorPayload"));
					}
					const next = settingsDraftFrom(data.effective);
					setState({ status: "ready", data, error: null });
					setDraft(next);
					setBaseline(next);
					setSaveError(null);
					setSaveNotice(null);
					setResetArmed(false);
				} catch (error) {
					if (!mountedRef.current || seqRef.current !== seq) return;
					setState((current) => ({
						status: "error",
						data: current !== null && typeof current === "object" ? current.data : null,
						error,
					}));
				}
			}, []);

			React.useEffect(() => {
				mountedRef.current = true;
				void load();
				return () => {
					mountedRef.current = false;
				};
			}, [load]);

			const data = state.data;
			const loading = state.status === "loading";
			const loadError = state.status === "error" ? state.error : null;
			const ranges = data !== null && typeof data === "object" && data.ranges !== null && typeof data.ranges === "object" ? data.ranges : {};
			const effective = data !== null && typeof data === "object" && data.effective !== null && typeof data.effective === "object" ? data.effective : null;
			const ready = effective !== null && draft !== null && baseline !== null;
			const dirty = draft !== null && baseline !== null && settingsDraftKey(draft) !== settingsDraftKey(baseline);
			const isRunning = runningProp !== null ? runningProp : data?.running === true;
			const updatedAt = toFiniteNumber(data?.updatedAt, null);
			const hasUpdatedAt = updatedAt !== null && updatedAt > 0;

			const parallelRange = settingsRangeOf(ranges, "maxParallelModels", { min: 1, max: 8, step: 1 });
			const combosRange = settingsRangeOf(ranges, "maxCombos", { min: 0, max: 512, step: 1 });
			const retriesRange = settingsRangeOf(ranges, "autoRetries", { min: 0, max: 2, step: 1 });
			const taskRange = settingsRangeOf(ranges, "perTaskTimeoutMs", { min: 60000, max: 14400000, step: 60000 });
			const batchRange = settingsRangeOf(ranges, "perBatchTimeoutMs", { min: 300000, max: 604800000, step: 60000 });
			const judgeAttemptsRange = settingsRangeOf(ranges, "judgeMaxAttempts", { min: 1, max: 4, step: 1 });
			const speedRange = settingsRangeOf(ranges, "speedRuns", { min: 0, max: 5, step: 1 });
			const retentionRange = settingsRangeOf(ranges, "retentionBatches", { min: 1, max: 5000, step: 1 });
			const recommendRange = settingsRangeOf(ranges, "recommend", { min: 0, max: 1, step: 0.05 });
			const rateRange = settingsRangeOf(ranges, "usdToCny", { min: 1, max: 20, step: 0.1 });
			const recommendStepText = settingsRangeText(tr, recommendRange, "", 1, 2);
			const taskMs = settingsMsValue(draft?.perTaskMinutes, 60000, taskRange, 10800000);
			const batchMs = settingsMsValue(draft?.perBatchHours, 3600000, batchRange, 172800000);

			const patchDraft = (patch) => {
				setResetArmed(false);
				setDraft((current) => (current === null ? current : { ...current, ...patch }));
			};

			const commitDraft = () => {
				setDraft((current) => {
					if (current === null) return current;
					const restored = { ...current };
					for (const key of settingsNumericKeys) {
						if (settingsParseNumber(restored[key]) !== null) continue;
						if (baseline !== null && settingsParseNumber(baseline[key]) !== null) restored[key] = baseline[key];
					}
					const values = settingsBuildValues(restored, data, catalog);
					if (values === null) return restored;
					const nextDraft = settingsDraftFrom(values);
					// Numeric normalization must never touch the judge selection.
					nextDraft.judgeProvider = restored.judgeProvider;
					nextDraft.judgeModel = restored.judgeModel;
					nextDraft.judgeEffort = restored.judgeEffort;
					return nextDraft;
				});
			};

			const changeJudgeProvider = (providerId) => {
				const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
				const provider = providers.find((entry) => entry.id === providerId) ?? null;
				const models = Array.isArray(provider?.models) ? provider.models : [];
				const model = models[0] ?? null;
				const efforts = Array.isArray(model?.efforts) ? model.efforts : [];
				patchDraft({
					judgeProvider: providerId,
					judgeModel: model === null ? "" : String(model.id ?? ""),
					judgeEffort: efforts.length === 0 ? "" : String(model?.defaultEffort ?? efforts[0]?.id ?? ""),
				});
			};

			const changeJudgeModel = (modelId) => {
				const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
				const provider = providers.find((entry) => entry.id === (draft?.judgeProvider ?? "")) ?? null;
				const models = Array.isArray(provider?.models) ? provider.models : [];
				const model = models.find((entry) => entry.id === modelId) ?? null;
				const efforts = Array.isArray(model?.efforts) ? model.efforts : [];
				patchDraft({
					judgeModel: modelId,
					judgeEffort: efforts.length === 0 ? "" : String(model?.defaultEffort ?? efforts[0]?.id ?? ""),
				});
			};

			const applyServerData = (nextData) => {
				const nextDraft = settingsDraftFrom(nextData.effective);
				setState({ status: "ready", data: nextData, error: null });
				setDraft(nextDraft);
				setBaseline(nextDraft);
				setSaveError(null);
				setResetArmed(false);
			};

			const save = async () => {
				if (savingRef.current || draft === null) return;
				const values = settingsBuildValues(draft, data, catalog, baseline);
				if (values === null) return;
				savingRef.current = true;
				setSaving(true);
				setSaveError(null);
				setSaveNotice(null);
				setResetArmed(false);
				let result = null;
				try {
					result = await postJson("/settings", { values });
				} catch (error) {
					result = { ok: false, status: 0, data: null, error };
				}
				savingRef.current = false;
				if (!mountedRef.current) return;
				setSaving(false);
				if (result !== null && result.ok === true && result.data !== null && typeof result.data === "object" && result.data.effective !== null && typeof result.data.effective === "object") {
					applyServerData(result.data);
					const nextBatch = result.data.appliesTo === "next-batch" || isRunning;
					if (nextBatch) setSaveNotice(tr("mr.settings.notice.nextBatch"));
					onToast(nextBatch ? tr("mr.settings.toast.savedNext") : tr("mr.settings.toast.saved"), "success");
					return;
				}
				setSaveError(settingsResponseError(result, tr));
				onToast(tr("mr.settings.toast.saveFailed"), "error");
			};

			const resetDefaults = async () => {
				if (savingRef.current) return;
				savingRef.current = true;
				setSaving(true);
				setSaveError(null);
				setSaveNotice(null);
				setResetArmed(false);
				let result = null;
				try {
					result = await postJson("/settings", { reset: true });
				} catch (error) {
					result = { ok: false, status: 0, data: null, error };
				}
				savingRef.current = false;
				if (!mountedRef.current) return;
				setSaving(false);
				if (result !== null && result.ok === true && result.data !== null && typeof result.data === "object" && result.data.effective !== null && typeof result.data.effective === "object") {
					applyServerData(result.data);
					if (result.data.appliesTo === "next-batch" || isRunning) setSaveNotice(tr("mr.settings.notice.nextBatch"));
					onToast(tr("mr.settings.toast.reset"), "success");
					return;
				}
				setSaveError(settingsResponseError(result, tr));
				onToast(tr("mr.settings.toast.resetFailed"), "error");
			};

			const discard = () => {
				setDraft(baseline);
				setSaveError(null);
				setSaveNotice(null);
				setResetArmed(false);
			};

			const head = h(
				"div",
				{ className: "mr-section-head" },
				h(
					"div",
					{ className: "mr-settings-head-main" },
					h("h2", { className: "mr-section-title" }, tr("mr.settings.title")),
					h("div", { className: "mr-section-sub" }, tr("mr.settings.subtitle")),
				),
				h(
					"div",
					{ className: "mr-settings-head-actions" },
					dirty ? h("span", { className: "mr-settings-dirty-pill" }, tr("mr.settings.status.dirty")) : null,
					h(
						"button",
						{
							type: "button",
							className: "mr-btn is-ghost" + (loading ? " is-busy" : ""),
							onClick: () => {
								void load();
							},
							disabled: loading || saving || dirty,
							"aria-busy": loading,
						},
						h("span", { className: "mr-btn-icon" }, h(RefreshIcon, { size: 13 })),
						tr("mr.settings.action.reload"),
					),
				),
			);

			const runningNote = isRunning
				? h(
					"div",
					{ className: "mr-inline-note is-warn" },
					h(ClockIcon, { size: 12 }),
					h("span", null, tr("mr.settings.runningNote")),
				)
				: null;

			const loadBox = loadError !== null && !ready
				? h(
					"div",
					{ className: "mr-error-box", role: "alert" },
					h(AlertIcon, { size: 15 }),
					h(
						"div",
						null,
						h("div", { className: "mr-error-title" }, tr("mr.settings.loadFailed")),
						h("div", { className: "mr-error-detail" }, errorMessageOf(loadError)),
						h("div", { className: "mr-error-detail" }, tr("mr.settings.loadFailedHint")),
					),
					h(
						"button",
						{
							type: "button",
							className: "mr-btn is-ghost mr-btn-small",
							onClick: () => {
								void load();
							},
						},
						tr("mr.common.retry"),
					),
				)
				: null;

			const staleNote = loadError !== null && ready
				? h("div", { className: "mr-inline-note is-warn" }, tr("mr.settings.loadFailed") + ": " + errorMessageOf(loadError))
				: null;

			const skeleton = !ready && loadError === null
				? h(
					"div",
					{ className: "mr-settings-grid" },
					[0, 1, 2, 3].map((index) => h(
						"section",
						{ className: "mr-panel mr-settings-card", key: "settings-skeleton-" + index },
						h("div", { className: "mr-settings-skeleton-row" }, h(Skeleton, { width: "46%", height: 14 })),
						h(
							"div",
							{ className: "mr-settings-skeleton-rows" },
							[0, 1, 2].map((rowIndex) => h(
								"div",
								{ className: "mr-settings-skeleton-row", key: "settings-skeleton-row-" + rowIndex },
								h(Skeleton, { width: "58%", height: 10 }),
								h(Skeleton, { width: 96, height: 26 }),
							)),
						),
					)),
				)
				: null;

			let grid = null;
			let bar = null;
			if (ready && draft !== null && effective !== null) {
				const judgeState = settingsJudgeState(catalog, draft);
				const catalogReady = judgeState.ready;
				const judgeSavable = !catalogReady || judgeState.valid;
				const judgePreview = tr("mr.settings.judge.preview", {
					provider: settingsProviderName(catalog, draft.judgeProvider),
					model: settingsModelName(catalog, draft.judgeProvider, draft.judgeModel),
					effort: draft.judgeEffort === ""
						? tr("mr.common.defaultEffort")
						: (settingsEffortName(catalog, draft.judgeProvider, draft.judgeModel, draft.judgeEffort) ?? String(draft.judgeEffort)),
				});

				const judgeProviderOptions = [];
				if (!catalogReady || judgeState.provider === null) {
					judgeProviderOptions.push(h(
						"option",
						{ key: "settings-judge-provider-current", value: draft.judgeProvider },
						settingsProviderName(catalog, draft.judgeProvider),
					));
				}
				for (const entry of judgeState.providers) {
					judgeProviderOptions.push(h("option", { key: entry.id, value: entry.id }, entry.name || entry.id));
				}

				const judgeModelOptions = [];
				if (!catalogReady || judgeState.provider === null || judgeState.model === null) {
					judgeModelOptions.push(h(
						"option",
						{ key: "settings-judge-model-current", value: draft.judgeModel },
						settingsModelName(catalog, draft.judgeProvider, draft.judgeModel),
					));
				}
				for (const entry of judgeState.models) {
					judgeModelOptions.push(h("option", { key: entry.id, value: entry.id }, entry.name || entry.id));
				}

				const judgeEffortOptions = judgeState.efforts.length === 0
					? [h("option", { key: "settings-judge-effort-default", value: "" }, tr("mr.common.defaultEffort"))]
					: judgeState.efforts.map((entry) => h("option", { key: entry.id, value: entry.id }, entry.name || entry.id));

				const judgeNote = catalogReady
					? judgeState.valid
						? null
						: h("div", { className: "mr-form-error", role: "alert" }, h(AlertIcon, { size: 12 }), h("span", null, tr("mr.settings.judge.missing")))
					: h(
						"div",
						{ className: "mr-inline-note" },
						h("span", null, catalog === null || catalog === undefined ? tr("mr.settings.judge.catalogLoading") : tr("mr.settings.judge.emptyCatalog")),
					);

				const recommendWeights = settingsNormalizedWeights(draft);
				const recommendRows = [
					{ key: "recommendQuality", labelKey: "mr.settings.recommend.quality" },
					{ key: "recommendSpeed", labelKey: "mr.settings.recommend.speed" },
					{ key: "recommendCost", labelKey: "mr.settings.recommend.cost" },
					{ key: "recommendStability", labelKey: "mr.settings.recommend.stability" },
				];

				const whitelist = Array.isArray(effective.models) ? effective.models.map((entry) => String(entry)) : [];
				const dataDir = effective.dataDir === null || effective.dataDir === undefined ? "" : String(effective.dataDir);

				const schedulingCard = settingsCard({
					tr,
					cardKey: "settings-scheduling",
					index: 1,
					titleKey: "mr.settings.section.scheduling.title",
					subKey: "mr.settings.section.scheduling.sub",
					children: h(
						"div",
						{ className: "mr-settings-rows" },
						settingsNumberRow({
							tr,
							rowKey: "maxParallelModels",
							id: "mr-settings-maxParallelModels",
							labelKey: "mr.settings.field.maxParallelModels",
							descKey: "mr.settings.field.maxParallelModelsDesc",
							value: draft.maxParallelModels,
							min: parallelRange.min,
							max: parallelRange.max,
							step: parallelRange.step,
							hints: [settingsRangeText(tr, parallelRange, "", 1, 0)],
							disabled: saving,
							onChange: (value) => patchDraft({ maxParallelModels: value }),
							onBlur: commitDraft,
						}),
						settingsNumberRow({
							tr,
							rowKey: "maxCombos",
							id: "mr-settings-maxCombos",
							labelKey: "mr.settings.field.maxCombos",
							descKey: "mr.settings.field.maxCombosDesc",
							value: draft.maxCombos,
							min: combosRange.min,
							max: combosRange.max,
							step: combosRange.step,
							hints: [
								settingsRangeText(tr, combosRange, "", 1, 0),
								settingsParseNumber(draft.maxCombos) === 0 ? tr("mr.settings.hint.unlimited") : "",
							],
							disabled: saving,
							onChange: (value) => patchDraft({ maxCombos: value }),
							onBlur: commitDraft,
						}),
						settingsNumberRow({
							tr,
							rowKey: "autoRetries",
							id: "mr-settings-autoRetries",
							labelKey: "mr.settings.field.autoRetries",
							descKey: "mr.settings.field.autoRetriesDesc",
							value: draft.autoRetries,
							min: retriesRange.min,
							max: retriesRange.max,
							step: retriesRange.step,
							hints: [settingsRangeText(tr, retriesRange, "", 1, 0)],
							disabled: saving,
							onChange: (value) => patchDraft({ autoRetries: value }),
							onBlur: commitDraft,
						}),
					),
				});

				const timeoutCard = settingsCard({
					tr,
					cardKey: "settings-timeout",
					index: 3,
					titleKey: "mr.settings.section.timeout.title",
					subKey: "mr.settings.section.timeout.sub",
					children: h(
						"div",
						{ className: "mr-settings-rows" },
						settingsNumberRow({
							tr,
							rowKey: "perTaskMinutes",
							id: "mr-settings-perTaskMinutes",
							labelKey: "mr.settings.field.perTaskTimeout",
							descKey: "mr.settings.field.perTaskTimeoutDesc",
							value: draft.perTaskMinutes,
							min: taskRange.min / 60000,
							max: taskRange.max / 60000,
							step: 1,
							unit: tr("mr.settings.unit.minutes"),
							hints: [
								settingsRangeText(tr, taskRange, tr("mr.settings.unit.minutes"), 60000, 2),
								settingsRangeMsText(tr, taskRange),
								settingsConvertText(tr, "task", taskMs),
							],
							disabled: saving,
							onChange: (value) => patchDraft({ perTaskMinutes: value }),
							onBlur: commitDraft,
						}),
						settingsNumberRow({
							tr,
							rowKey: "perBatchHours",
							id: "mr-settings-perBatchHours",
							labelKey: "mr.settings.field.perBatchTimeout",
							descKey: "mr.settings.field.perBatchTimeoutDesc",
							value: draft.perBatchHours,
							min: batchRange.min / 3600000,
							max: batchRange.max / 3600000,
							step: "any",
							unit: tr("mr.settings.unit.hours"),
							hints: [
								settingsRangeText(tr, batchRange, tr("mr.settings.unit.hours"), 3600000, 2),
								settingsRangeMsText(tr, batchRange),
								settingsConvertText(tr, "batch", batchMs),
							],
							disabled: saving,
							onChange: (value) => patchDraft({ perBatchHours: value }),
							onBlur: commitDraft,
						}),
						settingsNumberRow({
							tr,
							rowKey: "judgeMaxAttempts",
							id: "mr-settings-judgeMaxAttempts",
							labelKey: "mr.settings.field.judgeMaxAttempts",
							descKey: "mr.settings.field.judgeMaxAttemptsDesc",
							value: draft.judgeMaxAttempts,
							min: judgeAttemptsRange.min,
							max: judgeAttemptsRange.max,
							step: judgeAttemptsRange.step,
							hints: [settingsRangeText(tr, judgeAttemptsRange, "", 1, 0)],
							disabled: saving,
							onChange: (value) => patchDraft({ judgeMaxAttempts: value }),
							onBlur: commitDraft,
						}),
					),
				});

				const judgeCard = settingsCard({
					tr,
					cardKey: "settings-judge",
					index: 2,
					titleKey: "mr.settings.section.judge.title",
					subKey: "mr.settings.section.judge.sub",
					children: h(
						"div",
						{ className: "mr-settings-rows" },
						h(
							"div",
							{ className: "mr-settings-judge" },
							h(
								"label",
								{ className: "mr-field" },
								h("span", { className: "mr-field-label" }, tr("mr.settings.field.judgeProvider")),
								h(
									"select",
									{
										className: "mr-select",
										value: draft.judgeProvider,
										disabled: saving || !catalogReady,
										"aria-label": tr("mr.settings.field.judgeProvider"),
										onChange: (event) => changeJudgeProvider(event.target.value),
									},
									judgeProviderOptions,
								),
							),
							h(
								"label",
								{ className: "mr-field" },
								h("span", { className: "mr-field-label" }, tr("mr.settings.field.judgeModel")),
								h(
									"select",
									{
										className: "mr-select",
										value: draft.judgeModel,
										disabled: saving || !catalogReady || judgeState.provider === null,
										"aria-label": tr("mr.settings.field.judgeModel"),
										onChange: (event) => changeJudgeModel(event.target.value),
									},
									judgeModelOptions,
								),
							),
							h(
								"label",
								{ className: "mr-field" },
								h("span", { className: "mr-field-label" }, tr("mr.settings.field.judgeEffort")),
								h(
									"select",
									{
										className: "mr-select",
										value: judgeState.effortValue,
										disabled: saving || !catalogReady || judgeState.model === null,
										"aria-label": tr("mr.settings.field.judgeEffort"),
										onChange: (event) => patchDraft({ judgeEffort: event.target.value }),
									},
									judgeEffortOptions,
								),
							),
						),
						h("div", { className: "mr-settings-judge-preview mr-muted mr-mono" }, judgePreview),
						judgeNote,
						settingsNumberRow({
							tr,
							rowKey: "speedRuns",
							id: "mr-settings-speedRuns",
							labelKey: "mr.settings.field.speedRuns",
							descKey: "mr.settings.field.speedRunsDesc",
							value: draft.speedRuns,
							min: speedRange.min,
							max: speedRange.max,
							step: speedRange.step,
							hints: [
								settingsRangeText(tr, speedRange, "", 1, 0),
								settingsParseNumber(draft.speedRuns) === 0 ? tr("mr.settings.hint.speedOff") : "",
							],
							disabled: saving,
							onChange: (value) => patchDraft({ speedRuns: value }),
							onBlur: commitDraft,
						}),
					),
				});

				const recommendCard = settingsCard({
					tr,
					cardKey: "settings-recommend",
					index: 4,
					titleKey: "mr.settings.section.recommend.title",
					subKey: "mr.settings.section.recommend.sub",
					children: h(
						"div",
						{ className: "mr-settings-rec" },
						recommendRows.map((entry) => settingsRangeRow({
							tr,
							rowKey: entry.key,
							id: "mr-settings-" + entry.key,
							labelKey: entry.labelKey,
							value: draft[entry.key],
							min: 0,
							max: 100,
							step: "any",
							valueText: tr("mr.settings.recommend.raw", { value: formatNumber(draft[entry.key], 1) }),
							disabled: saving,
							onChange: (value) => patchDraft({ [entry.key]: value }),
						})),
						h(
							"div",
							{ className: "mr-settings-rec-summary" },
							h("div", { className: "mr-settings-rec-summary-title" }, tr("mr.settings.recommend.normalized")),
							recommendRows.map((entry, index) => h(
								"div",
								{ className: "mr-settings-rec-share", key: "settings-share-" + entry.key },
								h("span", { className: "mr-settings-rec-share-label" }, tr(entry.labelKey)),
								h("span", { className: "mr-settings-rec-share-value mr-mono" }, formatPercent(recommendWeights.shares[index], 1)),
								h(
									"span",
									{ className: "mr-settings-rec-share-track", "aria-hidden": true },
									h("span", {
										className: "mr-settings-rec-share-fill",
										style: { width: formatNumber(recommendWeights.shares[index] * 100, 1) + "%" },
									}),
								),
							)),
							recommendWeights.sum === 0
								? h("div", { className: "mr-settings-hint is-warn" }, tr("mr.settings.recommend.zeroHint"))
								: null,
							recommendStepText === ""
								? null
								: h("div", { className: "mr-settings-hint" }, recommendStepText),
						),
					),
				});

				const dataCard = settingsCard({
					tr,
					cardKey: "settings-data",
					index: 5,
					wide: true,
					titleKey: "mr.settings.section.data.title",
					subKey: "mr.settings.section.data.sub",
					children: h(
						"div",
						{ className: "mr-settings-rows" },
						h("div", { className: "mr-inline-note" }, h("span", null, tr("mr.settings.data.locked"))),
						settingsNumberRow({
							tr,
							rowKey: "retentionBatches",
							id: "mr-settings-retentionBatches",
							labelKey: "mr.settings.field.retentionBatches",
							descKey: "mr.settings.field.retentionBatchesDesc",
							value: draft.retentionBatches,
							min: retentionRange.min,
							max: retentionRange.max,
							step: retentionRange.step,
							hints: [settingsRangeText(tr, retentionRange, "", 1, 0)],
							disabled: saving,
							onChange: (value) => patchDraft({ retentionBatches: value }),
							onBlur: commitDraft,
						}),
						settingsNumberRow({
							tr,
							rowKey: "usdToCny",
							id: "mr-settings-usdToCny",
							labelKey: "mr.settings.field.usdToCny",
							descKey: "mr.settings.field.usdToCnyDesc",
							value: draft.usdToCny,
							min: rateRange.min,
							max: rateRange.max,
							step: rateRange.step,
							unit: tr("mr.settings.unit.cny"),
							hints: [
								settingsRangeText(tr, rateRange, "", 1, 2),
								tr("mr.settings.convert.usd", { rate: formatNumber(settingsRateValue(draft.usdToCny, rateRange, 7.1), 2) }),
							],
							disabled: saving,
							onChange: (value) => patchDraft({ usdToCny: value }),
							onBlur: commitDraft,
						}),
						h(
							"div",
							{ className: "mr-settings-row is-stack", key: "settings-dataDir" },
							h(
								"div",
								{ className: "mr-settings-row-text" },
								h("label", { className: "mr-settings-label", htmlFor: "mr-settings-dataDir" }, tr("mr.settings.field.dataDir")),
								h("div", { className: "mr-settings-desc" }, tr("mr.settings.field.dataDirDesc")),
							),
							h("input", {
								id: "mr-settings-dataDir",
								type: "text",
								readOnly: true,
								className: "mr-settings-readonly mr-mono",
								value: dataDir === "" ? "—" : dataDir,
								title: tr("mr.settings.data.copyHint"),
								"aria-label": tr("mr.settings.field.dataDir"),
								onFocus: (event) => event.target.select(),
							}),
						),
						h(
							"div",
							{ className: "mr-settings-row is-stack", key: "settings-models" },
							h(
								"div",
								{ className: "mr-settings-row-text" },
								h("div", { className: "mr-settings-label" }, tr("mr.settings.field.models")),
								h("div", { className: "mr-settings-desc" }, tr("mr.settings.field.modelsDesc")),
							),
							whitelist.length === 0
								? h("div", { className: "mr-settings-empty" }, tr("mr.settings.data.modelsEmpty"))
								: h(
									"div",
									{ className: "mr-settings-chips" },
									whitelist.map((entry) => h("span", { className: "mr-settings-chip", key: "settings-whitelist-" + entry }, settingsWhitelistLabel(catalog, entry))),
								),
						),
					),
				});

				const statusText = saving
					? tr("mr.settings.status.saving")
					: loading
						? tr("mr.settings.status.loading")
						: dirty
							? tr("mr.settings.status.dirty")
							: tr("mr.settings.status.clean");

				grid = h("div", { className: "mr-settings-grid" }, [
					schedulingCard,
					judgeCard,
					timeoutCard,
					recommendCard,
					dataCard,
				]);

				bar = h(
					"div",
					{
						className: "mr-settings-bar" + (dirty ? " is-dirty" : "") + (saving ? " is-saving" : ""),
						role: "region",
						"aria-label": tr("mr.settings.aria.actions"),
					},
					h(
						"div",
						{ className: "mr-settings-bar-info" },
						h("div", { className: "mr-settings-status", role: "status", "aria-live": "polite" }, statusText),
						hasUpdatedAt
							? h("div", { className: "mr-settings-updated" }, tr("mr.settings.updatedAt", { time: formatClock(updatedAt) }))
							: null,
						saveNotice === null ? null : h("div", { className: "mr-settings-notice" }, saveNotice),
						saveError === null
							? null
							: h(
								"div",
								{ className: "mr-form-error", role: "alert" },
								h(AlertIcon, { size: 12 }),
								h("span", null, tr("mr.settings.saveFailed") + ": " + String(saveError)),
							),
					),
					h(
						"div",
						{ className: "mr-settings-bar-actions" },
						resetArmed
							? h(
								React.Fragment,
								null,
								h("span", { className: "mr-settings-confirm-text" }, tr("mr.settings.resetConfirm")),
								h(
									"button",
									{ type: "button", className: "mr-btn is-ghost", onClick: () => setResetArmed(false), disabled: saving },
									tr("mr.common.cancel"),
								),
								h(
									"button",
									{
										type: "button",
										className: "mr-btn is-danger",
										onClick: () => {
											void resetDefaults();
										},
										disabled: saving,
									},
									saving ? tr("mr.settings.status.saving") : tr("mr.settings.action.resetConfirmYes"),
								),
							)
							: h(
								React.Fragment,
								null,
								h(
									"button",
									{ type: "button", className: "mr-btn is-ghost", onClick: () => setResetArmed(true), disabled: saving },
									tr("mr.settings.action.reset"),
								),
								h(
									"button",
									{ type: "button", className: "mr-btn", onClick: discard, disabled: saving || !dirty },
									tr("mr.settings.action.discard"),
								),
								h(
									"button",
									{
										type: "button",
										className: "mr-btn is-primary",
										onClick: () => {
											void save();
										},
										disabled: saving || !dirty || !judgeSavable,
									},
									h(CheckIcon, { size: 13 }),
									saving ? tr("mr.settings.status.saving") : tr("mr.settings.action.save"),
								),
							),
					),
				);
			}

			return h(
				"div",
				{ className: "mr-stack mr-settings" },
				head,
				runningNote,
				loadBox,
				staleNote,
				skeleton,
				grid,
				grid === null ? null : h("div", { className: "mr-inline-note" }, h("span", null, tr("mr.settings.hint.clampNote"))),
				bar,
			);
		}

		// ── rerun dialog: pick combos × tasks to run again ─────────────────

		function rerunRunIdOf(comboKey, taskId) {
			// The Host keys every run by `${comboKey}::${taskId}`; this is the
			// exact id it accepts back through POST /resume { runIds }.
			return String(comboKey) + "::" + String(taskId);
		}

		function rerunCombosOf(batch) {
			const rows = [];
			const seen = new Set();
			const push = (entry) => {
				if (entry === null || typeof entry !== "object") return;
				const key = typeof entry.key === "string" && entry.key !== ""
					? entry.key
					: comboKeyOf(entry.provider, entry.model, entry.reasoningEffort);
				if (key === "" || seen.has(key)) return;
				seen.add(key);
				rows.push({
					key,
					provider: entry.provider ?? "",
					providerName: entry.providerName ?? entry.provider ?? "",
					model: entry.model ?? "",
					modelName: entry.modelName ?? entry.model ?? "",
					reasoningEffort: entry.reasoningEffort ?? null,
					effortName: entry.effortName,
				});
			};
			if (Array.isArray(batch?.combos)) {
				for (const combo of batch.combos) push(combo);
			}
			// Running/old batches may not carry computed combos yet: fall back
			// to the selection snapshot, then to the runs themselves.
			if (rows.length === 0 && Array.isArray(batch?.selection)) {
				for (const entry of batch.selection) push(entry);
			}
			if (rows.length === 0 && Array.isArray(batch?.runs)) {
				for (const run of batch.runs) {
					if (run === null || typeof run !== "object") continue;
					push({
						key: typeof run.comboKey === "string" && run.comboKey !== ""
							? run.comboKey
							: comboKeyOf(run.provider, run.model, run.reasoningEffort),
						provider: run.provider,
						providerName: run.providerName,
						model: run.model,
						modelName: run.modelName,
						reasoningEffort: run.reasoningEffort,
						effortName: run.effortName,
					});
				}
			}
			return rows;
		}

		function rerunMatrixOf(batch) {
			const combos = rerunCombosOf(batch);
			const runIndex = new Map();
			if (Array.isArray(batch?.runs)) {
				for (const run of batch.runs) {
					if (run === null || typeof run !== "object") continue;
					const comboKey = typeof run.comboKey === "string" && run.comboKey !== ""
						? run.comboKey
						: comboKeyOf(run.provider, run.model, run.reasoningEffort);
					const taskId = typeof run.taskId === "string" ? run.taskId : "";
					if (taskId === "") continue;
					const runId = rerunRunIdOf(comboKey, taskId);
					if (!runIndex.has(runId)) runIndex.set(runId, run);
				}
			}
			return combos.map((combo) => ({
				...combo,
				cells: TASKS.map((task) => {
					const runId = rerunRunIdOf(combo.key, task.id);
					const run = runIndex.get(runId) ?? null;
					const maxScore = toFiniteNumber(run?.maxScore, null);
					return {
						runId,
						taskId: task.id,
						run,
						status: run === null
							? null
							: typeof run.status === "string" && run.status !== ""
								? run.status
								: "pending",
						score: run === null ? null : toFiniteNumber(run.score, null),
						maxScore: maxScore !== null ? maxScore : toFiniteNumber(TASK_BY_ID.get(task.id)?.maxScore, null),
					};
				}),
			}));
		}

		function rerunDefaultSelection(rows, initialSelection) {
			const comboKeys = Array.isArray(initialSelection?.comboKeys)
				? initialSelection.comboKeys.filter((key) => typeof key === "string" && key !== "")
				: [];
			const taskIds = Array.isArray(initialSelection?.taskIds)
				? initialSelection.taskIds.filter((id) => typeof id === "string" && id !== "")
				: [];
			// A pair of explicit filters (one combo + its failed tasks) names exact
			// cells, so a rerun of an already-done run is honoured. With only one
			// dimension given, keep the safe rule: done runs stay unchecked.
			const explicitCell = comboKeys.length > 0 && taskIds.length > 0;
			const comboFilter = comboKeys.length > 0 ? new Set(comboKeys) : null;
			const taskFilter = taskIds.length > 0 ? new Set(taskIds) : null;
			const selected = new Set();
			for (const row of rows) {
				if (comboFilter !== null && !comboFilter.has(row.key)) continue;
				for (const cell of row.cells) {
					if (taskFilter !== null && !taskFilter.has(cell.taskId)) continue;
					if (cell.run === null) continue;
					if (!explicitCell && cell.status === "done") continue;
					selected.add(cell.runId);
				}
			}
			return selected;
		}

		function RerunDialog(props) {
			const tr = props.tr;
			const batch = props.batch === null || props.batch === undefined ? null : props.batch;
			const initialSelection = props.initialSelection ?? null;
			const rows = React.useMemo(() => rerunMatrixOf(batch), [batch]);
			const totalRuns = rows.reduce(
				(sum, row) => sum + row.cells.filter((cell) => cell.run !== null).length,
				0,
			);
			const initialSelectionGiven =
				(Array.isArray(initialSelection?.comboKeys) && initialSelection.comboKeys.length > 0)
				|| (Array.isArray(initialSelection?.taskIds) && initialSelection.taskIds.length > 0);
			const [selected, setSelected] = React.useState(() => rerunDefaultSelection(rows, initialSelection));
			const [submitting, setSubmitting] = React.useState(false);
			const [error, setError] = React.useState(null);
			const [touched, setTouched] = React.useState(false);
			const panelRef = React.useRef(null);
			const batchId = batch === null ? null : batch.id;

			React.useEffect(() => {
				setSelected(rerunDefaultSelection(rows, initialSelection));
				setError(null);
				setSubmitting(false);
				setTouched(false);
			}, [batchId, totalRuns]);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape" && !submitting) props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose, submitting]);

			React.useEffect(() => {
				if (panelRef.current !== null) panelRef.current.focus();
			}, [batchId]);

			const running = batch !== null && batch.status === "running";
			const locked = running || (batch !== null && batch.rerunnable === false);
			const selectedModels = new Set();
			const selectedTasks = new Set();
			const selectedRunIds = [];
			let doneSelected = 0;
			for (const row of rows) {
				let rowSelected = false;
				for (const cell of row.cells) {
					if (!selected.has(cell.runId)) continue;
					rowSelected = true;
					selectedTasks.add(cell.taskId);
					selectedRunIds.push(cell.runId);
					if (cell.status === "done") doneSelected += 1;
				}
				if (rowSelected) selectedModels.add(row.key);
			}
			const stats = { models: selectedModels.size, tasks: selectedTasks.size, runs: selectedRunIds.length };

			const toggleCell = (cell) => {
				if (locked || submitting || cell.run === null) return;
				setTouched(true);
				setSelected((current) => {
					const next = new Set(current);
					if (next.has(cell.runId)) next.delete(cell.runId);
					else next.add(cell.runId);
					return next;
				});
			};

			const toggleRow = (row) => {
				if (locked || submitting) return;
				const selectable = row.cells.filter((cell) => cell.run !== null);
				if (selectable.length === 0) return;
				setTouched(true);
				setSelected((current) => {
					const next = new Set(current);
					const allSelected = selectable.every((cell) => next.has(cell.runId));
					for (const cell of selectable) {
						if (allSelected) next.delete(cell.runId);
						else next.add(cell.runId);
					}
					return next;
				});
			};

			const selectFailed = () => {
				if (locked || submitting) return;
				const next = new Set();
				for (const row of rows) {
					for (const cell of row.cells) {
						if (cell.run !== null && cell.status !== "done") next.add(cell.runId);
					}
				}
				setTouched(true);
				setSelected(next);
			};

			const selectAllRuns = () => {
				if (locked || submitting) return;
				const next = new Set();
				for (const row of rows) {
					for (const cell of row.cells) {
						if (cell.run !== null) next.add(cell.runId);
					}
				}
				setTouched(true);
				setSelected(next);
			};

			const clearSelection = () => {
				if (submitting) return;
				setTouched(true);
				setSelected(new Set());
			};

			const submit = async () => {
				if (submitting || locked || batch === null || selectedRunIds.length === 0) return;
				setSubmitting(true);
				setError(null);
				const result = await postJson("/resume", { batchId: batch.id, runIds: selectedRunIds });
				if (result.ok && result.data?.batch !== undefined && result.data?.batch !== null) {
					if (typeof props.onStarted === "function") props.onStarted(result.data.batch);
					return;
				}
				setSubmitting(false);
				const code = typeof result.data?.code === "string" ? result.data.code : "";
				if (code === "empty-selection") {
					setError(tr("mr.rerun.errorEmpty"));
					return;
				}
				if (code === "version-mismatch") {
					setError(tr("mr.rerun.errorVersion"));
					return;
				}
				if (code === "busy" || result.status === 409) {
					setError(tr("mr.rerun.errorBusy"));
					return;
				}
				if (code === "nothing-to-resume" || code === "not-found") {
					setError(tr("mr.rerun.errorStale"));
					return;
				}
				const detail = typeof result.data?.error === "string" && result.data.error !== ""
					? result.data.error
					: typeof result.data?.message === "string" && result.data.message !== ""
						? result.data.message
						: result.status > 0
							? "HTTP " + result.status
							: errorMessageOf(result.error);
				setError(tr("mr.rerun.errorFailed") + ": " + detail);
			};

			if (batch === null) {
				return h(
					"div",
					{ className: "mr-modal-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.rerun.dialogLabel") },
					h("div", { className: "mr-modal-backdrop", onClick: props.onClose, "aria-hidden": true }),
					h(
						"div",
						{ className: "mr-modal mr-rerun-modal" },
						h("div", { className: "mr-modal-body" }, h("div", { className: "mr-muted" }, tr("mr.common.loading"))),
						h(
							"footer",
							{ className: "mr-modal-foot" },
							h("div", { className: "mr-rerun-foot-info" }),
							h(
								"div",
								{ className: "mr-modal-actions mr-rerun-actions" },
								h("button", { type: "button", className: "mr-btn is-ghost", onClick: props.onClose }, tr("mr.common.close")),
							),
						),
					),
				);
			}

			const notes = [];
			if (running) {
				notes.push(h("div", { className: "mr-inline-note is-warn", key: "running" }, tr("mr.rerun.noteRunning")));
			} else if (batch.rerunnable === false) {
				notes.push(h("div", { className: "mr-inline-note is-warn", key: "locked" }, tr("mr.rerun.noteLocked")));
			}
			if (rows.length > 0 && totalRuns === 0) {
				notes.push(h("div", { className: "mr-inline-note is-warn", key: "no-runs" }, tr("mr.rerun.noteNoRuns")));
			}
			if (!locked && totalRuns > 0 && stats.runs === 0 && !touched) {
				notes.push(h(
					"div",
					{ className: "mr-inline-note", key: "default-empty" },
					initialSelectionGiven ? tr("mr.rerun.noteInitialEmpty") : tr("mr.rerun.noteAllDone"),
				));
			}

			const toolbar = h(
				"div",
				{ className: "mr-rerun-toolbar" },
				h(
					"div",
					{ className: "mr-rerun-toolbar-left" },
					h("h3", { className: "mr-rerun-section-title" }, tr("mr.rerun.matrixTitle")),
					h(
						"span",
						{ className: "mr-muted mr-mono" },
						tr("mr.rerun.totalLine", { combos: rows.length, runs: totalRuns }),
					),
				),
				h(
					"div",
					{ className: "mr-rerun-toolbar-right" },
					h(
						"button",
						{
							type: "button",
							className: "mr-btn is-ghost mr-btn-small",
							onClick: selectFailed,
							disabled: locked || submitting || totalRuns === 0,
						},
						tr("mr.rerun.selectFailed"),
					),
					h(
						"button",
						{
							type: "button",
							className: "mr-btn is-ghost mr-btn-small",
							onClick: selectAllRuns,
							disabled: locked || submitting || totalRuns === 0,
						},
						tr("mr.rerun.selectAll"),
					),
					h(
						"button",
						{
							type: "button",
							className: "mr-btn is-ghost mr-btn-small",
							onClick: clearSelection,
							disabled: submitting || stats.runs === 0,
						},
						tr("mr.rerun.clear"),
					),
				),
			);

			const matrix = rows.length === 0
				? h("div", { className: "mr-empty-inline" }, tr("mr.rerun.empty"))
				: h(
					"div",
					{ className: "mr-rerun-scroll" },
					h(
						"table",
						{ className: "mr-rerun-table" },
						h(
							"thead",
							null,
							h(
								"tr",
								null,
								h("th", { scope: "col", className: "mr-rerun-corner" }, tr("mr.rerun.modelCol")),
								TASKS.map((task) =>
									h(
										"th",
										{ scope: "col", key: task.id, className: "mr-rerun-col" },
										h("span", { className: "mr-rerun-col-name" }, taskName(tr, task.id)),
										h(
											"span",
											{ className: "mr-rerun-col-max mr-mono" },
											tr("mr.rerun.maxPoints", { score: formatNumber(TASK_BY_ID.get(task.id)?.maxScore, 1) }),
										),
									),
								),
							),
						),
						h(
							"tbody",
							null,
							rows.map((row) => {
								const selectable = row.cells.filter((cell) => cell.run !== null);
								const selectedCount = selectable.filter((cell) => selected.has(cell.runId)).length;
								const allSelected = selectable.length > 0 && selectedCount === selectable.length;
								const mixed = selectedCount > 0 && !allSelected;
								const rowDisabled = locked || submitting || selectable.length === 0;
								return h(
									"tr",
									{ key: row.key, className: "mr-rerun-row" + (selectedCount > 0 ? " is-selected" : "") },
									h(
										"th",
										{ scope: "row", className: "mr-rerun-row-head" },
										h(
											"div",
											{ className: "mr-rerun-row-inner" },
											h(
												"button",
												{
													type: "button",
													role: "checkbox",
													"aria-checked": allSelected ? "true" : mixed ? "mixed" : "false",
													"aria-label": tr("mr.rerun.rowAria", { model: row.modelName }),
													className: "mr-check" + (selectedCount > 0 ? " is-checked" : "") + (mixed ? " is-mixed" : ""),
													disabled: rowDisabled,
													onClick: () => toggleRow(row),
												},
												selectedCount > 0 ? (allSelected ? h(CheckIcon, { size: 12 }) : h(MinusIcon, { size: 12 })) : null,
											),
											h(
												"div",
												{ className: "mr-rerun-model-wrap" },
												h(
													"span",
													{
														className: "mr-rerun-model",
														title: row.providerName === "" || row.providerName === row.modelName ? undefined : row.providerName,
													},
													row.modelName,
												),
												h(EffortPill, {
													tr,
													entry: row,
													label: effortLabel(tr, row.reasoningEffort, row.effortName),
												}),
											),
										),
									),
									row.cells.map((cell) => {
										const isMissing = cell.run === null;
										const isSelected = selected.has(cell.runId);
										const status = cell.status;
										const text = isMissing
											? "—"
											: status === "done" && cell.score !== null
												? formatNumber(cell.score, 2) + "/" + formatNumber(cell.maxScore, 1)
												: statusLabel(tr, status);
										const ariaLabel = tr("mr.rerun.cellAria", {
											model: row.modelName,
											task: taskName(tr, cell.taskId),
											status: text,
										});
										return h(
											"td",
											{ key: cell.taskId, className: "mr-rerun-td" },
											h(
												"button",
												{
													type: "button",
													className: "mr-rerun-cell"
														+ (isMissing ? " is-missing" : " " + statusKind(status))
														+ (isSelected ? " is-selected" : ""),
													disabled: locked || submitting || isMissing,
													"aria-pressed": isSelected,
													"aria-label": ariaLabel,
													title: ariaLabel,
													onClick: () => toggleCell(cell),
												},
												isMissing ? null : h("span", { className: "mr-rerun-cell-dot", "aria-hidden": true }),
												h("span", { className: "mr-rerun-cell-text" }, text),
											),
										);
									}),
								);
							}),
						),
					),
				);

			return h(
				"div",
				{ className: "mr-modal-layer", role: "dialog", "aria-modal": "true", "aria-label": tr("mr.rerun.dialogLabel") },
				h("div", { className: "mr-modal-backdrop", onClick: props.onClose, "aria-hidden": true }),
				h(
					"div",
					{ className: "mr-modal mr-rerun-modal", ref: panelRef, tabIndex: -1 },
					h(
						"header",
						{ className: "mr-modal-head" },
						h(
							"div",
							{ className: "mr-rerun-head-main" },
							h("h2", { className: "mr-modal-title" }, tr("mr.rerun.title")),
							h("div", { className: "mr-modal-sub mr-mono" }, tr("mr.rerun.subtitle", { id: batch.id })),
						),
						h(
							"div",
							{ className: "mr-rerun-head-side" },
							h(Tag, { status: batch.status }, statusLabel(tr, batch.status)),
							h(
								"button",
								{ type: "button", className: "mr-icon-btn", onClick: props.onClose, "aria-label": tr("mr.aria.close") },
								h(CloseIcon, { size: 14 }),
							),
						),
					),
					h("div", { className: "mr-modal-body" }, ...notes, toolbar, matrix),
					h(
						"footer",
						{ className: "mr-modal-foot" },
						h(
							"div",
							{ className: "mr-rerun-foot-info" },
							h(
								"div",
								{ className: "mr-rerun-stats mr-mono" },
								tr("mr.rerun.stats", { models: stats.models, tasks: stats.tasks, runs: stats.runs }),
							),
							h(
								"div",
								{ className: "mr-rerun-foot-sub" },
								doneSelected > 0
									? tr("mr.rerun.doneSelected", { count: doneSelected })
									: tr("mr.rerun.footNote"),
							),
							error === null
								? null
								: h("div", { className: "mr-form-error" }, h(AlertIcon, { size: 12 }), h("span", null, error)),
						),
						h(
							"div",
							{ className: "mr-modal-actions mr-rerun-actions" },
							h(
								"button",
								{ type: "button", className: "mr-btn is-ghost", onClick: props.onClose, disabled: submitting },
								tr("mr.common.cancel"),
							),
							h(
								"button",
								{
									type: "button",
									className: "mr-btn is-primary",
									onClick: submit,
									disabled: submitting || locked || stats.runs === 0,
								},
								submitting ? null : h(PlayIcon, { size: 13 }),
								submitting ? tr("mr.rerun.submitting") : tr("mr.rerun.submit"),
							),
						),
					),
				),
			);
		}

		// ── styles ─────────────────────────────────────────────────────────

		const CSS = `
.mr-page{display:flex;flex-direction:column;box-sizing:border-box;height:100%;min-height:0;min-width:0;color:var(--dsw-alias-label-primary);container-type:inline-size;container-name:mr;
--mr-radius:16px;
--mr-accent-a:hsl(215 85% 58%);
--mr-accent-b:hsl(268 82% 62%);
--mr-accent-c:hsl(190 82% 52%);
--mr-violet:var(--mr-accent-b);
--mr-violet-strong:var(--mr-accent-b);
--mr-violet-soft:color-mix(in srgb,var(--mr-accent-b) 16%,transparent);
--mr-glow:color-mix(in srgb,var(--mr-accent-a) 24%,transparent);
--mr-series-0:var(--dsw-alias-brand-primary);
--mr-series-1:var(--dsw-alias-state-success-primary);
--mr-series-2:var(--dsw-alias-state-warn-primary);
--mr-series-3:var(--dsw-alias-state-error-primary);
--mr-series-4:var(--dsw-alias-state-idle-primary);
--mr-series-5:color-mix(in srgb,var(--dsw-alias-brand-primary) 58%,var(--dsw-alias-state-success-primary));
--mr-series-6:color-mix(in srgb,var(--dsw-alias-brand-primary) 58%,var(--dsw-alias-state-warn-primary));
--mr-series-7:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-state-error-primary));
--mr-series-8:color-mix(in srgb,var(--dsw-alias-state-success-primary) 58%,var(--dsw-alias-state-warn-primary));
--mr-series-9:color-mix(in srgb,var(--dsw-alias-state-success-primary) 55%,var(--dsw-alias-state-error-primary));
--mr-series-10:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,var(--dsw-alias-state-error-primary));
--mr-series-11:color-mix(in srgb,var(--dsw-alias-brand-primary) 50%,var(--dsw-alias-state-idle-primary));
background:radial-gradient(ellipse at 84% -12%,color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,transparent),transparent 44%)}
.mr-scroll{flex:1;min-height:0;min-width:0;overflow:auto;padding:28px 32px 52px}
.mr-stack{display:flex;flex-direction:column;gap:22px;min-width:0}
.mr-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:20px;min-width:0}
.mr-title-row{display:flex;align-items:center;gap:12px;min-width:0}
.mr-brand-mark{position:relative;z-index:1;display:block;width:40px;height:40px;flex:none;overflow:visible}
.mr-brand-fan{position:absolute;z-index:0;inset:4px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg 225deg,color-mix(in srgb,var(--mr-accent-a) 7%,transparent) 245deg,color-mix(in srgb,var(--mr-accent-b) 20%,transparent) 285deg,color-mix(in srgb,var(--mr-accent-c) 42%,transparent) 330deg,color-mix(in srgb,var(--mr-accent-c) 24%,transparent) 348deg,transparent 360deg);filter:blur(1.2px);opacity:.9;animation:mr-brand-fan 8s linear infinite;will-change:transform;pointer-events:none}
.mr-sidebar-fan{transform-box:view-box;transform-origin:8px 8px;animation:mr-brand-fan 8s linear infinite;will-change:transform}
.mr-brand-fan::after{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg 326deg,color-mix(in srgb,var(--mr-accent-c) 58%,transparent) 342deg,color-mix(in srgb,var(--mr-accent-a) 30%,transparent) 351deg,transparent 358deg);filter:blur(1px)}
.mr-title{margin:0;font-size:24px;font-weight:680;line-height:30px;letter-spacing:-.025em}
.mr-subtitle{max-width:620px;margin:5px 0 0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary)}
.mr-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;min-width:0}
.mr-running-pill{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);color:var(--dsw-alias-state-success-primary);font-size:10.5px;font-weight:600}
.mr-tabs{display:inline-flex;align-self:flex-start;align-items:center;gap:3px;padding:5px;margin-bottom:20px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 82%,transparent);max-width:100%;flex-wrap:wrap;box-shadow:0 3px 14px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.mr-tab{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:0 16px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;font-weight:520;line-height:18px;cursor:pointer;transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
.mr-tab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.mr-tab.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 2px 8px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-tab.is-active .mr-tab-icon{color:var(--dsw-alias-brand-primary)}
.mr-tab-icon{display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary);transition:color .16s ease}
.mr-tab-count{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;line-height:1}
.mr-panel{box-sizing:border-box;min-width:0;padding:20px;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 88%,transparent);border-radius:var(--mr-radius);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent);box-shadow:0 4px 18px color-mix(in srgb,var(--dsw-alias-label-primary) 3%,transparent);transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease}
.mr-panel-flush{padding:0;overflow:hidden}
.mr-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:11px;margin-bottom:14px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 82%,transparent);min-width:0;flex-wrap:wrap}
.mr-panel-head-right{display:flex;align-items:center;gap:8px;flex:none}
.mr-panel-title{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:660;line-height:21px;letter-spacing:-.005em}
.mr-panel-title::before{content:"";width:3px;height:14px;flex:none;border-radius:2px;background:linear-gradient(180deg,var(--mr-accent-a),var(--mr-accent-b))}
.mr-panel-sub{margin-top:4px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;min-width:0}
.mr-section-title{margin:0;font-size:18px;font-weight:650;line-height:24px;letter-spacing:-.01em}
.mr-section-sub{margin-top:5px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.mr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;font-weight:520;white-space:nowrap;cursor:pointer;transition:background-color .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease}
.mr-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.mr-btn:active{transform:translateY(.5px)}
.mr-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.mr-btn.is-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.mr-btn.is-primary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 86%,var(--dsw-alias-label-primary))}
.mr-btn.is-ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.mr-btn.is-ghost:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.mr-btn.is-danger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary)}
.mr-btn.is-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent)}
.mr-btn.is-busy .mr-btn-icon{animation:mr-spin .9s linear infinite}
.mr-btn-small{height:26px;padding:0 9px;font-size:10.5px;border-radius:7px}
.mr-btn-icon{display:inline-flex;align-items:center;justify-content:center}
.mr-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.mr-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.mr-page button:focus-visible,.mr-page select:focus-visible,.mr-page [tabindex]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.mr-page .mr-row-click:focus-visible{outline-offset:-2px}
.mr-tag{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9.5px;line-height:1;font-weight:550;white-space:nowrap}
.mr-tag-small{height:18px;font-size:9px;padding:0 6px}
.mr-tag-dot{width:5px;height:5px;flex:none;border-radius:50%;background:currentColor}
.mr-tag.is-done{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent)}
.mr-tag.is-running{color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.mr-tag.is-error{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent)}
.mr-tag.is-warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 32%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,transparent)}
.mr-tag.is-idle{color:var(--dsw-alias-label-secondary)}
.mr-muted{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.mr-mono{font-variant-numeric:tabular-nums}
.mr-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-table-scroll{width:100%;max-width:100%;overflow-x:auto;border-radius:9px}
.mr-table{width:100%;border-collapse:collapse;font-size:11.5px;line-height:16px}
.mr-table.is-ranking{min-width:1080px}
.mr-table.is-speed{min-width:820px}
.mr-table.is-sessions{min-width:760px}
.mr-table.is-history{min-width:880px}
.mr-table th{border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 42%,transparent);color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600;letter-spacing:.03em;padding:10px 9px;text-align:left;white-space:nowrap}
.mr-table th.is-num{text-align:center}
.mr-table th.is-rank{text-align:center;width:58px}
.mr-table th.is-time{text-align:center}
.mr-table td.is-time{text-align:center}
.mr-table th.is-time{width:96px}
.mr-table th.is-status{width:112px}
.mr-sort-btn{display:inline-flex;align-items:center;gap:4px;width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-weight:inherit;letter-spacing:inherit;cursor:pointer;text-align:left}
.mr-table th.is-num .mr-sort-btn{justify-content:center;text-align:center}
.mr-sort-btn:hover{color:var(--dsw-alias-label-primary)}
.mr-sort-btn.is-active{color:var(--dsw-alias-brand-primary)}
.mr-sort-arrow{font-size:9px;line-height:1}
.mr-table td{padding:10px 9px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 88%,transparent);vertical-align:middle;min-width:0}
.mr-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 30%,transparent)}
.mr-table tbody tr:last-child td{border-bottom:none}
.mr-table td.is-rank{text-align:center;width:58px;color:var(--dsw-alias-label-secondary)}
.mr-table td.is-num{text-align:center;white-space:nowrap}
.mr-table.is-ranking thead tr:last-child th:nth-child(8),.mr-table.is-ranking tbody td:nth-child(8),.mr-table.is-ranking thead tr:last-child th:nth-child(11),.mr-table.is-ranking tbody td:nth-child(11),.mr-table.is-ranking thead tr:last-child th:nth-child(12),.mr-table.is-ranking tbody td:nth-child(12){border-left:1px solid var(--dsw-alias-border-l1)}
.mr-table.is-ranking thead tr:last-child th:nth-child(2),.mr-table.is-ranking tbody td:nth-child(2){border-right:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 82%,transparent)}
.mr-table td.is-time{white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.mr-row-click{cursor:pointer;transition:background-color .12s ease}
.mr-table tbody tr.mr-row-click:hover td{background:color-mix(in srgb,var(--mr-accent-a) 7%,var(--dsw-alias-bg-layer-2))}
.mr-row-click:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.mr-model-cell{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-model-cell-name{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-model-cell-effort{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-score-strong{font-weight:650;font-size:12.5px;color:var(--dsw-alias-label-primary)}
.mr-mono code,.mr-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.mr-hash{font-size:9.5px;line-height:14px;overflow-wrap:anywhere;word-break:break-all}
.mr-inline-note{display:flex;align-items:flex-start;gap:7px;margin:2px 0 10px;padding:8px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,var(--dsw-alias-border-l1));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,transparent);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:15px}
.mr-inline-note.is-warn{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 26%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 6%,transparent)}
.mr-warn-text{color:var(--dsw-alias-state-warn-primary)}
.mr-summary-text{margin:0;font-size:11.5px;line-height:1.75;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere}
.mr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:54px 26px;border:1px solid var(--dsw-alias-border-l1);border-radius:18px;background:radial-gradient(ellipse at 50% -20%,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent),transparent 58%),var(--dsw-alias-bg-layer-1);text-align:center}
.mr-empty-compact{padding:36px 20px;gap:12px}
.mr-empty-orbit{display:flex;align-items:center;justify-content:center;width:84px;height:84px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-border-l1));border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent),transparent 68%);color:var(--dsw-alias-brand-primary)}
.mr-empty-title{margin:0;font-size:18px;font-weight:620;line-height:24px}
.mr-empty-body{max-width:640px;margin:0;font-size:11.5px;line-height:1.75;color:var(--dsw-alias-label-secondary)}
.mr-task-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:100%;max-width:880px;margin:2px 0}
.mr-task-card{box-sizing:border-box;padding:12px 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 65%,transparent);text-align:left;min-width:0}
.mr-task-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.mr-task-name{font-size:12px;font-weight:600}
.mr-task-points{font-size:13px;font-weight:650;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-task-desc{margin:5px 0 0;font-size:10px;line-height:1.55;color:var(--dsw-alias-label-secondary)}
.mr-empty-stats{font-size:10.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-skel{display:inline-block;border-radius:5px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent),color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent));background-size:220% 100%;animation:mr-shimmer 1.5s ease infinite}
.mr-skeleton-table{display:flex;flex-direction:column;gap:12px;padding:6px 2px}
.mr-skeleton-row{display:flex;align-items:center;gap:12px}
.mr-chart-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:20px;min-width:0}
.mr-chart-shell{position:relative;min-width:0}
.mr-chart-canvas{position:relative;min-width:0}
.mr-chart{display:block;width:100%;height:auto;overflow:visible}
.mr-grid-line{stroke:var(--dsw-alias-border-l1);stroke-width:1;opacity:.55}
.mr-axis-line{stroke:var(--dsw-alias-border-l2);stroke-width:1}
.mr-axis-text{fill:var(--dsw-alias-label-secondary);font-size:10px;font-family:inherit;font-variant-numeric:tabular-nums}
.mr-axis-title{fill:var(--dsw-alias-label-secondary);font-size:10px;font-family:inherit}
.mr-point-hit{cursor:pointer;outline:none}
.mr-chart-tip{position:absolute;z-index:4;transform:translate(-50%,-118%);min-width:120px;max-width:250px;padding:7px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-overlay);box-shadow:0 8px 24px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent);pointer-events:none}
.mr-chart-tip-title{font-size:10px;font-weight:600;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-chart-tip-value{font-size:10.5px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;margin-top:2px}
.mr-chart-tip-meta{font-size:9.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.mr-chart-empty{display:flex;align-items:center;justify-content:center;min-height:188px;padding:18px;border:1px dashed var(--dsw-alias-border-l1);border-radius:10px;color:var(--dsw-alias-label-secondary);font-size:11px;text-align:center}
.mr-chart-foot{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:10px;color:var(--dsw-alias-label-secondary)}
.mr-chart-foot-sep{color:var(--dsw-alias-border-l2)}
.mr-legend{display:flex;flex-wrap:wrap;gap:5px 12px;margin-bottom:8px;max-height:56px;overflow:auto}
.mr-legend-item{display:inline-flex;align-items:center;gap:5px;min-width:0;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-legend-dot{display:inline-block;width:7px;height:7px;flex:none;border-radius:50%;background:currentColor}
.mr-legend-label{overflow-wrap:anywhere}
.mr-seg{display:inline-flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);flex:none}
.mr-seg-btn{padding:4px 9px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;line-height:15px;white-space:nowrap;cursor:pointer}
.mr-seg-btn:hover{color:var(--dsw-alias-label-primary)}
.mr-seg-btn.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 1px 4px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-range-switch{display:inline-flex;align-items:center;gap:2px;padding:3px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-2);flex:none}
.mr-range-btn{padding:5px 12px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:16px;cursor:pointer;white-space:nowrap}
.mr-range-btn:hover{color:var(--dsw-alias-label-primary)}
.mr-range-btn.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 1px 5px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-caliber{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:9px;margin:0}
.mr-caliber-row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;min-width:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 62%,transparent)}
.mr-caliber-row dt{margin:0;flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-caliber-row dd{margin:0;min-width:0;text-align:right;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.mr-stat-card{box-sizing:border-box;min-width:0;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 94%,transparent)}
.mr-stat-card-title{margin:0 0 10px;font-size:11.5px;font-weight:600;line-height:16px}
.mr-metric-rows{display:flex;flex-direction:column;gap:6px}
.mr-metric-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:10.5px;line-height:15px}
.mr-metric-label{color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-metric-value{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-stat{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-stat-label{font-size:9.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-stat-value{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-stat-sub{font-size:9.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-perf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.mr-perf-card{box-sizing:border-box;display:flex;flex-direction:column;gap:9px;min-width:0;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 58%,transparent)}
.mr-perf-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}
.mr-perf-card-title{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-perf-model{font-size:12.5px;font-weight:600;line-height:18px;overflow-wrap:anywhere}
.mr-perf-provider{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-perf-score{display:flex;align-items:baseline;gap:2px;flex:none;font-variant-numeric:tabular-nums}
.mr-perf-score-value{font-size:23px;font-weight:650;line-height:26px;color:var(--dsw-alias-brand-primary)}
.mr-perf-score-max{font-size:9.5px;color:var(--dsw-alias-label-secondary)}
.mr-perf-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:9.5px;color:var(--dsw-alias-label-secondary)}
.mr-perf-effort{display:inline-flex;align-items:center;height:18px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:9px}
.mr-perf-samples{font-variant-numeric:tabular-nums}
.mr-perf-baseline{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-perf-baseline .is-up{color:var(--dsw-alias-state-success-primary);font-weight:600}
.mr-perf-baseline .is-down{color:var(--dsw-alias-state-error-primary);font-weight:600}
.mr-perf-baseline .is-flat{color:var(--dsw-alias-label-secondary)}
.mr-perf-baseline-score{color:var(--dsw-alias-label-secondary);font-size:9.5px}
.mr-dim-heading{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);letter-spacing:.03em}
.mr-dim-list{display:flex;flex-direction:column;gap:6px;margin-top:2px}
.mr-dim{display:flex;flex-direction:column;gap:3px;min-width:0}
.mr-dim-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}
.mr-dim-label{font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-dim-value{font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-dim-track{height:5px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}
.mr-dim-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 72%,var(--dsw-alias-state-success-primary)),var(--dsw-alias-brand-primary));transition:width .35s ease}
.mr-minmax{display:inline-flex;flex-direction:column;gap:1px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-subline{display:block;margin-top:1px;font-size:9px;line-height:13px}
.mr-exclude-note{display:block;margin-top:3px;font-size:9px;line-height:12px;color:var(--dsw-alias-state-warn-primary)}
.mr-resume-inline{display:inline-flex;align-items:center;gap:4px;margin-top:5px}
.mr-resume-banner{align-items:center;flex-wrap:wrap}
.mr-resume-banner .mr-resume-banner-text{flex:1 1 220px;min-width:180px}
.mr-panel-head-right .mr-btn-small{flex:none}
.mr-error-box{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,var(--dsw-alias-border-l1));border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 6%,transparent);color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px}
.mr-error-box > div{min-width:0;flex:1}
.mr-error-title{font-weight:600}
.mr-error-detail{color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;overflow-wrap:anywhere}
.mr-empty-inline{display:flex;align-items:center;justify-content:center;min-height:96px;padding:18px;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px;color:var(--dsw-alias-label-secondary);font-size:11px;text-align:center}
.mr-toast{position:fixed;left:50%;bottom:26px;z-index:140;display:flex;align-items:center;gap:8px;max-width:min(580px,calc(100vw - 32px));padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 32px color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent);color:var(--dsw-alias-label-primary);font-size:11px;line-height:16px;transform:translateX(-50%);animation:mr-rise .16s ease}
.mr-toast.is-error{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-error-primary)}
.mr-toast.is-success{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 36%,var(--dsw-alias-border-l1));color:var(--dsw-alias-state-success-primary)}
.mr-toast-text{min-width:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}
.mr-toast-close{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.mr-toast-close:hover{background:var(--dsw-alias-bg-layer-2)}
.mr-modal-layer{position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;padding:24px}
.mr-modal-backdrop{position:absolute;inset:0;background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent);animation:mr-fade .15s ease}
.mr-modal{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:min(880px,100%);max-height:min(90vh,940px);overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:18px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 26px 72px color-mix(in srgb,var(--dsw-alias-label-primary) 24%,transparent);animation:mr-rise .18s ease}
.mr-start-modal{width:min(880px,100%)}
.mr-progress-modal{width:min(720px,100%)}
.mr-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 15px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}
.mr-modal-title{margin:0;font-size:16px;font-weight:620;line-height:22px}
.mr-modal-sub{margin-top:3px;font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-modal-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:18px 22px}
.mr-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 22px;border-top:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent);flex:none}
.mr-modal-actions{display:flex;align-items:center;gap:8px;flex:none}
.mr-start-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.mr-start-toolbar-left{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;min-width:0}
.mr-start-toolbar-right{display:flex;align-items:center;gap:4px;flex:none}
.mr-start-section-title{margin:0;font-size:12px;font-weight:600;line-height:17px}
.mr-start-loading{display:flex;flex-direction:column;gap:12px;padding:8px 0}
.mr-model-groups{display:flex;flex-direction:column;gap:12px}
.mr-model-group{overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent)}
.mr-model-group-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 78%,transparent)}
.mr-model-group-name{font-size:11px;font-weight:600;line-height:16px;overflow-wrap:anywhere}
.mr-model-item{border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent)}
.mr-model-item:last-child{border-bottom:none}
.mr-model-row{display:flex;align-items:center;gap:9px;padding:7px 12px;min-width:0}
.mr-check{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;padding:0;border:1.5px solid var(--dsw-alias-border-l2);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-bg-base);cursor:pointer}
.mr-check:hover{border-color:var(--dsw-alias-brand-primary)}
.mr-check.is-checked{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}
.mr-check.is-mixed{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-bg-layer-1))}
.mr-model-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:1;min-width:0;padding:3px 0;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.mr-model-toggle-main{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-model-toggle-name{font-size:11.5px;line-height:16px;overflow-wrap:anywhere}
.mr-model-toggle-meta{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-model-toggle-chevron{display:inline-flex;align-items:center;flex:none;color:var(--dsw-alias-label-secondary);transition:transform .15s ease}
.mr-model-toggle-chevron.is-open{transform:rotate(180deg)}
.mr-model-flag{flex:none;padding:1px 5px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent);border-radius:5px;color:var(--dsw-alias-brand-primary);font-size:8.5px;line-height:13px;white-space:nowrap}
.mr-effort-chips{display:flex;flex-wrap:wrap;gap:6px;padding:2px 12px 11px 39px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 60%,transparent)}
.mr-chip{height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;line-height:22px;cursor:pointer;white-space:nowrap;transition:background-color .13s ease,border-color .13s ease,color .13s ease}
.mr-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.mr-chip.is-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent);color:var(--dsw-alias-brand-primary);font-weight:600}
.mr-chip.is-disabled{opacity:.42;cursor:not-allowed}
.mr-judge-card{margin-top:16px;padding:13px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 58%,transparent)}
.mr-judge-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.mr-judge-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
.mr-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.mr-field-label{font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-select{box-sizing:border-box;width:100%;height:32px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;outline:none;min-width:0}
.mr-select:focus{border-color:var(--dsw-alias-brand-primary)}
.mr-select:disabled{opacity:.55;cursor:not-allowed}
.mr-judge-preview{margin-top:9px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l1);font-size:10px;line-height:15px;overflow-wrap:anywhere}
.mr-start-foot-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.mr-start-count{font-size:12px;font-weight:600;line-height:17px;font-variant-numeric:tabular-nums}
.mr-start-foot-sub{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-form-error{display:flex;align-items:flex-start;gap:5px;margin-top:3px;color:var(--dsw-alias-state-error-primary);font-size:10px;line-height:14px;overflow-wrap:anywhere}
.mr-progress-head-main{min-width:0}
.mr-progress-title-row{display:flex;align-items:center;gap:8px}
.mr-live-dot{display:inline-block;width:8px;height:8px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary);animation:mr-pulse 1.6s ease infinite}
.mr-progress-summary{display:flex;flex-direction:column;gap:7px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent)}
.mr-progress-summary-line{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.mr-progress-count{font-size:11.5px;font-weight:600;line-height:16px}
.mr-progress-failed{font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-track{height:6px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}
.mr-track-lg{height:9px}
.mr-track-fill{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .4s ease}
.mr-track-fill.is-warn{background:var(--dsw-alias-state-warn-primary)}
.mr-lane-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.mr-lane{padding:12px 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 48%,transparent)}
.mr-lane-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.mr-lane-title{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-lane-model{font-size:11.5px;font-weight:600;line-height:16px;overflow-wrap:anywhere}
.mr-lane-efforts{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-lane-head-right{display:flex;align-items:center;gap:8px;flex:none}
.mr-lane-body{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:7px;font-size:10px;line-height:14px}
.mr-lane-current{color:var(--dsw-alias-label-primary);min-width:0;overflow-wrap:anywhere}
.mr-lane-counts{color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-drawer-layer{position:fixed;inset:0;z-index:120}
.mr-drawer-backdrop{position:absolute;inset:0;background:color-mix(in srgb,var(--dsw-alias-label-primary) 28%,transparent);animation:mr-fade .16s ease}
.mr-drawer{position:absolute;top:0;right:0;bottom:0;display:flex;flex-direction:column;box-sizing:border-box;width:min(660px,100%);border-left:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);box-shadow:-20px 0 56px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);outline:none;animation:mr-slide-in .2s ease}
.mr-drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}
.mr-drawer-head-main{min-width:0}
.mr-drawer-title{margin:0;font-size:16px;font-weight:620;line-height:22px}
.mr-drawer-sub{margin-top:3px;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-drawer-head-right{display:flex;align-items:center;gap:8px;flex:none}
.mr-drawer-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:16px 20px 30px}
.mr-detail-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.mr-detail-meta>.mr-detail-meta-item:last-child:nth-child(odd){grid-column:1/-1}
.mr-detail-meta.is-tight{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:0}
.mr-detail-meta-item{display:flex;flex-direction:column;gap:2px;min-width:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 52%,transparent)}
.mr-detail-meta-label{font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-detail-meta-value{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-detail-block{display:flex;flex-direction:column;gap:7px;min-width:0}
.mr-detail-block-title{margin:0;font-size:12px;font-weight:600;line-height:17px}
.mr-pre{margin:0;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}
.mr-summary{max-height:none}
.mr-reason{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 62%,var(--dsw-alias-bg-base))}
.mr-combo-chips{display:flex;flex-wrap:wrap;gap:6px}
.mr-combo-chip{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:5px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;line-height:15px;cursor:pointer;text-align:left}
.mr-combo-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.mr-combo-chip.is-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);color:var(--dsw-alias-label-primary)}
.mr-combo-chip-name{min-width:0;overflow-wrap:anywhere}
.mr-combo-chip-score{flex:none;font-weight:600;color:var(--dsw-alias-brand-primary)}
.mr-combo-summary{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 58%,transparent)}
.mr-combo-summary-main{min-width:0}
.mr-combo-summary-name{font-size:12.5px;font-weight:600;line-height:18px;overflow-wrap:anywhere}
.mr-combo-summary-sub{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);margin-top:1px;overflow-wrap:anywhere}
.mr-combo-summary-score{display:flex;align-items:baseline;gap:3px;flex:none;font-variant-numeric:tabular-nums}
.mr-combo-total{font-size:20px;font-weight:650;line-height:24px;color:var(--dsw-alias-brand-primary)}
.mr-combo-total-max{font-size:9.5px;color:var(--dsw-alias-label-secondary)}
.mr-run-list{display:flex;flex-direction:column;gap:10px}
.mr-run{padding:12px 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 46%,transparent)}
.mr-run-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:7px}
.mr-run-title{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}
.mr-run-task{font-size:12px;font-weight:600;line-height:17px}
.mr-run-max{font-size:9px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-run-head-right{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;flex-wrap:wrap}
.mr-run-score{font-size:14px;font-weight:650;line-height:18px;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-run-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-bottom:9px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-run-session{overflow-wrap:anywhere}
.mr-run-block{display:flex;flex-direction:column;gap:4px;margin-top:10px;min-width:0}
.mr-run-block-title{font-size:10px;font-weight:600;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-answer{max-height:220px}
.mr-file-chips{display:flex;flex-wrap:wrap;gap:5px}
.mr-file-chip{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:3px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-primary)}
.mr-file-primary{width:5px;height:5px;flex:none;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.mr-file-name{overflow-wrap:anywhere}
.mr-file-size{flex:none;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-usage-line{font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.mr-grade-grid{display:flex;flex-wrap:wrap;gap:4px 6px}
.mr-grade-item{display:inline-flex;align-items:baseline;gap:5px;padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-1);font-size:9px;line-height:13px}
.mr-grade-key{color:var(--dsw-alias-label-secondary)}
.mr-grade-value{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.mr-run-warn{margin-top:8px;color:var(--dsw-alias-state-warn-primary);font-size:9.5px;line-height:14px;overflow-wrap:anywhere}
.mr-run-error{display:flex;align-items:flex-start;gap:6px;margin-top:8px;padding:6px 8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 26%,var(--dsw-alias-border-l1));border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 6%,transparent);color:var(--dsw-alias-state-error-primary);font-size:9.5px;line-height:14px;overflow-wrap:anywhere}
.mr-run-note{margin-top:8px}
@keyframes mr-spin{to{transform:rotate(360deg)}}
@keyframes mr-shimmer{0%{background-position:120% 0}100%{background-position:-120% 0}}
@keyframes mr-fade{from{opacity:0}to{opacity:1}}
@keyframes mr-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes mr-slide-in{from{transform:translateX(18px);opacity:.6}to{transform:translateX(0);opacity:1}}
@keyframes mr-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent)}70%{box-shadow:0 0 0 6px transparent}100%{box-shadow:0 0 0 0 transparent}}
.mr-iq-hero{display:grid;grid-template-columns:minmax(220px,250px) minmax(0,1fr);gap:20px;align-items:start;margin-top:2px}
.mr-iq-best{box-sizing:border-box;min-width:0;padding:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:linear-gradient(145deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2)),var(--dsw-alias-bg-layer-1))}
.mr-iq-best-label{font-size:10px;line-height:14px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-secondary)}
.mr-iq-best-score{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;margin:7px 0 7px;font-size:43px;line-height:1;font-weight:680;letter-spacing:-.035em;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-iq-best-score.is-empty{font-size:28px;line-height:34px;color:var(--dsw-alias-label-secondary);letter-spacing:0;margin-bottom:10px}
.mr-iq-best-max{font-size:12px;line-height:1;font-weight:500;letter-spacing:0;color:var(--dsw-alias-label-secondary)}
.mr-iq-best-model{font-size:12px;line-height:18px;font-weight:600;overflow-wrap:anywhere}
.mr-iq-best-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;font-size:9.5px;color:var(--dsw-alias-label-secondary)}
.mr-iq-best-meta span{padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent);font-variant-numeric:tabular-nums}
.mr-iq-rank{min-width:0}
.mr-iq-rank-title{font-size:10px;line-height:14px;font-weight:600;letter-spacing:.03em;color:var(--dsw-alias-label-secondary);margin-bottom:3px}
.mr-iq-rank-list{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-iq-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0;padding:7px 7px;border-radius:8px;transition:background-color .12s ease}
.mr-iq-row:hover{background:var(--dsw-alias-bg-layer-2)}
.mr-iq-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.mr-iq-row.is-incomplete{opacity:.6}
.mr-iq-rank-no{width:22px;flex:none;text-align:center;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-iq-row-main{flex:1 1 220px;min-width:110px;display:flex;flex-direction:column;gap:5px}
.mr-iq-row-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.mr-iq-model{font-size:11.5px;line-height:16px;font-weight:580;overflow-wrap:anywhere}
.mr-iq-effort{display:inline-flex;align-items:center;min-height:16px;padding:0 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 72%,transparent);color:var(--dsw-alias-label-secondary);font-size:9px;line-height:14px;white-space:nowrap}
.mr-iq-badge{display:inline-flex;align-items:center;min-height:16px;padding:0 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;line-height:14px;white-space:nowrap}
.mr-iq-track{height:6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}
.mr-iq-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 58%,var(--dsw-alias-state-success-primary)),var(--dsw-alias-brand-primary))}
.mr-iq-row.is-incomplete .mr-iq-fill{background:var(--dsw-alias-state-idle-primary)}
.mr-iq-row-score{width:56px;flex:none;text-align:right;font-size:12px;line-height:16px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-iq-row-meta{width:142px;flex:none;margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:1px;font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-iq-incomplete-note{font-size:9.5px;line-height:14px;margin-top:6px}
.mr-iq-empty{border:0;background:transparent;padding:30px 12px}
.mr-iq-loading{display:flex;flex-direction:column;gap:10px;padding:8px 0}
.mr-iq-task-tabs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;width:fit-content;max-width:100%;padding:3px;margin:0 0 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}
.mr-iq-task-tab{display:inline-flex;align-items:center;gap:5px;min-height:27px;padding:0 10px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:15px;white-space:nowrap;cursor:pointer;transition:background-color .14s ease,color .14s ease,border-color .14s ease}
.mr-iq-task-tab:hover{color:var(--dsw-alias-label-primary)}
.mr-iq-task-tab.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 1px 4px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-iq-task-max{font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-matrix-scroll{width:100%;max-width:100%;overflow-x:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:10px}
.mr-matrix{width:100%;border-collapse:separate;border-spacing:0;font-size:11px;line-height:16px}
.mr-matrix th,.mr-matrix td{border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 72%,transparent)}
.mr-matrix tbody tr:last-child th,.mr-matrix tbody tr:last-child td{border-bottom:none}
.mr-matrix-model-head{position:sticky;left:0;z-index:3;min-width:152px;padding:9px 10px;background:var(--dsw-alias-bg-layer-1);text-align:left;font-size:9.5px;font-weight:550;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-matrix-effort-head{min-width:68px;padding:9px 7px;text-align:center;font-size:9.5px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-matrix-model-cell{position:sticky;left:0;z-index:2;min-width:152px;max-width:230px;padding:7px 10px;background:var(--dsw-alias-bg-layer-1);text-align:left;font-weight:500}
.mr-matrix-model-name{display:block;font-size:11px;line-height:15px;font-weight:580;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-matrix-provider{display:block;margin-top:1px;font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-matrix-td{min-width:68px;padding:4px 5px;text-align:center;vertical-align:middle}
.mr-matrix-cell{display:flex;align-items:center;justify-content:center;width:100%;min-height:32px;padding:4px 6px;border:1px solid transparent;border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;line-height:15px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
.mr-matrix-cell:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);transform:translateY(-1px)}
.mr-matrix-cell:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.mr-matrix-missing{display:flex;align-items:center;justify-content:center;width:100%;min-height:32px;color:var(--dsw-alias-state-idle-primary);font-size:10.5px;font-variant-numeric:tabular-nums}
.mr-matrix tbody tr:hover .mr-matrix-model-cell{background:var(--dsw-alias-bg-layer-2)}
.mr-matrix-legend{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:10px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-matrix-legend-title{font-weight:600}
.mr-matrix-legend-label{font-variant-numeric:tabular-nums}
.mr-matrix-legend-bar{display:inline-block;width:148px;height:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,var(--dsw-alias-bg-layer-1)),color-mix(in srgb,var(--dsw-alias-state-warn-primary) 34%,var(--dsw-alias-bg-layer-1)),color-mix(in srgb,var(--dsw-alias-state-success-primary) 38%,var(--dsw-alias-bg-layer-1)))}
.mr-latest-panel{background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 88%,transparent)}
.mr-collapse-caret{display:inline-flex;align-items:center;justify-content:center;transition:transform .16s ease;transform:rotate(-90deg)}
.mr-collapse-caret.is-open{transform:rotate(0)}
.mr-run-artifact{height:22px;padding:0 7px;font-size:9px;gap:4px}
.mr-artifact-layer{position:fixed;inset:0;z-index:160;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:24px}
.mr-artifact-backdrop{position:absolute;inset:0;background:color-mix(in srgb,var(--dsw-alias-label-primary) 30%,transparent)}
.mr-artifact-modal{position:relative;display:flex;flex-direction:column;width:min(1040px,100%);max-height:calc(100vh - 48px);box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 30px 90px color-mix(in srgb,var(--dsw-alias-label-primary) 28%,transparent);outline:none;overflow:hidden}
.mr-artifact-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex:none;padding:16px 20px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.mr-artifact-head-main{min-width:0}
.mr-artifact-kicker{font-size:9px;line-height:13px;font-weight:600;letter-spacing:.08em;color:var(--dsw-alias-label-secondary)}
.mr-artifact-title{margin:3px 0 0;font-size:15px;line-height:21px;font-weight:650;overflow-wrap:anywhere}
.mr-artifact-file-meta{margin-top:5px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-artifact-head-right{display:flex;align-items:center;gap:8px;flex:none}
.mr-artifact-files{display:flex;align-items:center;flex-wrap:wrap;gap:5px;flex:none;max-height:82px;overflow:auto;padding:10px 20px 0}
.mr-artifact-file{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:4px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:9.5px;line-height:14px;cursor:pointer;transition:background-color .12s ease,color .12s ease,border-color .12s ease}
.mr-artifact-file:hover{color:var(--dsw-alias-label-primary)}
.mr-artifact-file.is-active{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l1));background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.mr-artifact-file-name{overflow-wrap:anywhere}
.mr-artifact-file-size{font-size:8.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-artifact-tabs{display:flex;align-items:center;gap:2px;flex:none;padding:9px 20px 0}
.mr-artifact-tab{min-height:28px;padding:0 10px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:15px;cursor:pointer}
.mr-artifact-tab:hover{color:var(--dsw-alias-label-primary)}
.mr-artifact-tab.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary)}
.mr-artifact-body{flex:1;min-height:0;overflow:auto;padding:12px 20px 16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 28%,transparent)}
.mr-artifact-image-wrap{display:flex;align-items:center;justify-content:center;min-height:300px;max-height:62vh;overflow:auto;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base)}
.mr-artifact-image{display:block;max-width:100%;max-height:58vh;object-fit:contain}
.mr-artifact-iframe{display:block;width:100%;height:min(62vh,640px);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base)}
.mr-artifact-pre{margin:0;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;line-height:1.65;white-space:pre;overflow:auto;max-height:62vh;tab-size:2}
.mr-artifact-loading{display:flex;align-items:center;justify-content:center;min-height:220px;color:var(--dsw-alias-label-secondary);font-size:11px}
.mr-artifact-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;padding:10px 20px;border-top:1px solid var(--dsw-alias-border-l1)}
.mr-artifact-modal a{text-decoration:none}
@container mr (max-width:1120px){.mr-chart-grid{grid-template-columns:1fr}.mr-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-perf-grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}}
@container mr (max-width:860px){.mr-scroll{padding:24px 24px 42px}.mr-iq-hero{grid-template-columns:1fr}.mr-iq-best{max-width:none}.mr-head{flex-wrap:wrap}.mr-head-actions{justify-content:flex-end;margin-left:auto}.mr-task-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-caliber{grid-template-columns:1fr}.mr-modal-layer{padding:14px}.mr-modal{max-height:calc(100vh - 28px)}.mr-judge-grid{grid-template-columns:1fr}.mr-detail-meta{grid-template-columns:1fr}.mr-section-head{flex-direction:column;align-items:flex-start}}
@container mr (max-width:620px){.mr-iq-row{gap:6px}.mr-iq-row-main{flex-basis:160px}.mr-iq-row-meta{box-sizing:border-box;width:100%;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;gap:4px 8px;padding-left:0}.mr-artifact-layer{padding:10px}.mr-artifact-modal{max-height:calc(100vh - 20px)}.mr-artifact-head,.mr-artifact-files,.mr-artifact-tabs,.mr-artifact-body,.mr-artifact-foot{padding-left:14px;padding-right:14px}.mr-artifact-iframe{height:55vh}.mr-pompeii-panel{padding:10px}.mr-pompeii-summary{gap:6px 12px}.mr-pompeii-score strong{font-size:20px}.mr-pompeii-svg{max-height:330px}.mr-pompeii-images{grid-template-columns:1fr}.mr-scroll{padding:16px 14px 36px}.mr-panel{padding:14px}.mr-title{font-size:20px;line-height:26px}.mr-head-actions{width:100%}.mr-subtitle{font-size:11px;line-height:16px}.mr-combo-summary-bar{padding:12px}.mr-combo-summary-side{align-items:flex-start;flex-direction:row;flex-wrap:wrap;justify-content:space-between;width:100%}.mr-combo-summary-meta{justify-content:flex-start}.mr-task-grid{grid-template-columns:1fr}.mr-stat-grid{grid-template-columns:1fr}.mr-perf-grid{grid-template-columns:1fr}.mr-modal-head,.mr-modal-body,.mr-modal-foot{padding-left:14px;padding-right:14px}.mr-modal-foot{flex-direction:column;align-items:stretch}.mr-modal-actions{justify-content:flex-end}.mr-drawer-head,.mr-drawer-body{padding-left:14px;padding-right:14px}.mr-legend{max-height:88px}.mr-table{font-size:11px}}
.mr-model-cell-name{font-weight:600}
.mr-model-toggle-name{font-weight:600}
.mr-iq-model{font-weight:620}
.mr-matrix-model-name{font-weight:620}
.mr-combo-chip-name{font-weight:600}
.mr-model-strong{font-weight:650}
.mr-selection-sep,.mr-selection-dot,.mr-selection-extra{color:var(--dsw-alias-label-secondary);font-weight:400}
.mr-effort-text{color:var(--mr-effort-color,var(--dsw-alias-label-secondary));font-weight:600}
.mr-effort-pill{display:inline-flex;align-items:center;min-height:16px;padding:0 5px;border:1px solid color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 30%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 12%,transparent);color:var(--mr-effort-color,var(--dsw-alias-label-secondary));font-size:9px;line-height:14px;font-weight:600;white-space:nowrap}
.mr-iq-effort{background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 12%,transparent);border-color:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 30%,var(--dsw-alias-border-l1));color:var(--mr-effort-color,var(--dsw-alias-label-secondary))}
.mr-perf-effort{border-color:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 30%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 10%,transparent);color:var(--mr-effort-color,var(--dsw-alias-label-secondary));font-weight:600}
.mr-chip{border-color:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 30%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 8%,transparent);color:var(--mr-effort-color,var(--dsw-alias-label-secondary))}
.mr-chip:hover{border-color:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 55%,var(--dsw-alias-border-l1));color:var(--mr-effort-color,var(--dsw-alias-label-secondary))}
.mr-chip.is-active{border-color:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 70%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 22%,transparent);color:var(--mr-effort-color,var(--dsw-alias-label-secondary));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 20%,transparent)}
.mr-matrix-effort-head{color:var(--mr-effort-color,var(--dsw-alias-label-secondary));border-top:2px solid color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 55%,transparent)}
.mr-lane-efforts{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.mr-lane-effort-sep{color:var(--dsw-alias-label-secondary);font-weight:400}
.mr-pompeii-panel{display:flex;flex-direction:column;gap:12px;margin-bottom:14px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.mr-pompeii-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.mr-pompeii-title{margin:0;font-size:13px;line-height:18px;font-weight:650;color:var(--dsw-alias-label-primary)}
.mr-pompeii-sub{margin-top:2px;font-size:10px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-pompeii-summary{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px 16px;padding:9px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 52%,transparent)}
.mr-pompeii-stat-label{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-pompeii-score{display:inline-flex;align-items:baseline;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.mr-pompeii-score strong{font-size:22px;line-height:1;font-weight:680;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-pompeii-max{font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.mr-pompeii-f1{display:inline-flex;align-items:baseline;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.mr-pompeii-f1 strong{font-size:13px;line-height:1;font-weight:650;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.mr-pompeii-count{display:inline-flex;align-items:center;gap:3px;font-size:10px;line-height:14px;font-weight:600;white-space:nowrap}
.mr-pompeii-count.is-correct,.mr-pompeii-legend .is-correct{color:var(--dsw-alias-state-success-primary)}
.mr-pompeii-count.is-incorrect,.mr-pompeii-legend .is-incorrect{color:var(--dsw-alias-state-error-primary)}
.mr-pompeii-count.is-missing,.mr-pompeii-legend .is-missing{color:var(--dsw-alias-label-secondary)}
.mr-pompeii-graph{padding:10px 12px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 45%,transparent)}
.mr-pompeii-graph-title{margin-bottom:4px;font-size:10px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.mr-pompeii-svg{display:block;width:100%;height:auto;max-height:460px;overflow:visible}
.mr-pompeii-legend{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;font-size:10px;line-height:15px;font-weight:600}
.mr-pompeii-images{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}
.mr-pompeii-asset{display:flex;flex-direction:column;gap:6px;min-width:0;padding:9px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 45%,transparent);text-decoration:none;transition:border-color .13s ease}
.mr-pompeii-asset:hover{border-color:var(--dsw-alias-border-l2)}
.mr-pompeii-asset-label{font-size:10px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mr-pompeii-image{display:block;width:100%;height:auto;max-height:280px;margin:0 auto;object-fit:contain;border-radius:7px;background:var(--dsw-alias-bg-layer-2)}
.mr-content{display:flex;flex-direction:column;width:100%;max-width:1240px;margin:0 auto;min-width:0}
.mr-panel:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 7px 22px color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.mr-perf-loading-note{margin-bottom:2px}
.mr-model-toggle-specs{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-iq-provider{font-size:9px;line-height:14px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-iq-speed{white-space:nowrap}
.mr-perf-speed{font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.mr-combo-summary-bar{align-items:flex-start;gap:14px;flex-wrap:wrap;padding:14px 16px;border-radius:12px}
.mr-combo-summary-bar .mr-combo-summary-main{flex:1 1 380px}
.mr-combo-provider{color:var(--dsw-alias-label-secondary);font-weight:500}
.mr-combo-task-scores{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;margin-top:6px}
.mr-combo-task-score{display:inline-flex;align-items:baseline;gap:4px;font-size:9.5px;line-height:14px;white-space:nowrap}
.mr-combo-task-name{color:var(--dsw-alias-label-secondary)}
.mr-combo-task-value{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}
.mr-combo-summary-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none;min-width:0}
.mr-combo-summary-meta{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:3px 10px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-combo-speed{white-space:nowrap}
.mr-table-scroll-tip{display:none;justify-content:flex-end;margin:0 0 5px;font-size:9.5px;line-height:14px;color:var(--mr-accent-a);font-weight:600;letter-spacing:.02em}
.mr-table-scroll-wrap.has-overflow .mr-table-scroll-tip{display:flex}
.mr-table-scroll-wrap{position:relative;min-width:0;border-radius:10px}
.mr-table-scroll-wrap.has-overflow::after{content:"";position:absolute;z-index:3;top:0;right:0;bottom:0;width:42px;border-radius:0 10px 10px 0;background:linear-gradient(90deg,transparent,var(--dsw-alias-bg-layer-1) 78%);pointer-events:none}
.mr-latest-panel .mr-table-scroll{max-height:min(430px,62vh);overflow:auto;border-radius:10px}
.mr-latest-panel .mr-table thead tr:first-child th{position:static;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 82%,transparent)}
.mr-latest-panel .mr-table thead tr:last-child th{position:sticky;top:0;z-index:2;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 68%,var(--dsw-alias-bg-layer-1))}
.mr-page{background-color:var(--dsw-alias-bg-base);background-image:
radial-gradient(ellipse at 84% -10%,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent),transparent 44%),
radial-gradient(circle at 12% 0%,color-mix(in srgb,var(--mr-accent-b) 6%,transparent),transparent 34%),
radial-gradient(circle,color-mix(in srgb,var(--dsw-alias-label-primary) 4.5%,transparent) 1px,transparent 1.2px);
background-size:auto,auto,18px 18px}
.mr-page[data-mr-theme="light"]{color-scheme:light;--dsw-alias-bg-base:#f3f6fb;--dsw-alias-bg-layer-1:#ffffff;--dsw-alias-bg-layer-2:#eef2f8;--dsw-alias-bg-overlay:#ffffff;--dsw-alias-border-l1:#dce3ee;--dsw-alias-border-l2:#c4cfdf;--dsw-alias-brand-primary:#4f6bff;--dsw-alias-label-primary:#0f172a;--dsw-alias-label-secondary:#5c6b80;--dsw-alias-state-error-primary:#dc2626;--dsw-alias-state-idle-primary:#94a3b8;--dsw-alias-state-success-primary:#16a34a;--dsw-alias-state-warn-primary:#d97706}
.mr-page[data-mr-theme="dark"]{color-scheme:dark;--dsw-alias-bg-base:#070c16;--dsw-alias-bg-layer-1:#0f1726;--dsw-alias-bg-layer-2:#172134;--dsw-alias-bg-overlay:#131c2c;--dsw-alias-border-l1:#273449;--dsw-alias-border-l2:#3a4a63;--dsw-alias-brand-primary:#7d9aff;--dsw-alias-label-primary:#e8eefb;--dsw-alias-label-secondary:#94a3b8;--dsw-alias-state-error-primary:#f87171;--dsw-alias-state-idle-primary:#64748b;--dsw-alias-state-success-primary:#34d399;--dsw-alias-state-warn-primary:#fbbf24}
.mr-page[data-mr-theme="dark"] .mr-panel,.mr-page[data-mr-theme="dark"] .mr-perf-card,.mr-page[data-mr-theme="dark"] .mr-stat-card{box-shadow:0 10px 30px rgba(0,0,0,.42)}
.mr-page[data-mr-theme="dark"] .mr-panel:hover,.mr-page[data-mr-theme="dark"] .mr-perf-card:hover,.mr-page[data-mr-theme="dark"] .mr-stat-card:hover{box-shadow:0 16px 40px rgba(0,0,0,.55)}
.mr-page[data-mr-theme="dark"] .mr-modal,.mr-page[data-mr-theme="dark"] .mr-drawer,.mr-page[data-mr-theme="dark"] .mr-artifact-modal{box-shadow:0 28px 90px rgba(0,0,0,.62)}
.mr-logo-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;flex:none}
.mr-title{background:linear-gradient(100deg,var(--mr-accent-a) 0%,var(--mr-accent-b) 58%,var(--mr-accent-c) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.mr-running-pill{position:relative;box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent),0 4px 14px color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent)}
.mr-running-pill .mr-live-dot{box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.mr-panel,.mr-perf-card,.mr-stat-card{position:relative;border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 78%,var(--dsw-alias-label-primary) 12%);background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 24px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease}
.mr-panel:hover,.mr-perf-card:hover,.mr-stat-card:hover{border-color:color-mix(in srgb,var(--dsw-alias-border-l1) 55%,var(--dsw-alias-label-primary) 22%);box-shadow:0 10px 30px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-tab{position:relative;overflow:hidden}
.mr-tab::after{content:"";position:absolute;left:12px;right:12px;bottom:3px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--mr-accent-a),var(--mr-accent-b));transform:scaleX(0);transform-origin:left;opacity:0;transition:transform .28s ease,opacity .28s ease;pointer-events:none}
.mr-tab.is-active::after{transform:scaleX(1);opacity:1}
.mr-btn{transition:background-color .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease,transform .16s ease,box-shadow .16s ease}
.mr-btn:hover{transform:translateY(-1px)}
.mr-btn:active{transform:translateY(0) scale(.985)}
.mr-btn:disabled{transform:none}
.mr-btn.is-primary{border-color:transparent;background:linear-gradient(110deg,var(--mr-accent-a),var(--mr-accent-b));color:var(--dsw-alias-bg-base);box-shadow:0 4px 14px var(--mr-glow)}
.mr-btn.is-primary:hover{background:linear-gradient(110deg,color-mix(in srgb,var(--mr-accent-a) 82%,var(--dsw-alias-label-primary)),color-mix(in srgb,var(--mr-accent-b) 88%,var(--dsw-alias-label-primary)));box-shadow:0 7px 22px color-mix(in srgb,var(--mr-accent-a) 32%,transparent),0 0 0 1px color-mix(in srgb,var(--mr-accent-b) 22%,transparent)}
.mr-theme-switch{display:inline-flex;align-items:center;justify-content:center;width:58px;height:30px;flex:none;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;transition:border-color .18s ease,background-color .18s ease,box-shadow .18s ease}
.mr-theme-switch:hover{border-color:color-mix(in srgb,var(--mr-accent-a) 38%,var(--dsw-alias-border-l1));box-shadow:0 0 0 3px color-mix(in srgb,var(--mr-accent-a) 9%,transparent)}
.mr-theme-switch:focus-visible{outline:2px solid color-mix(in srgb,var(--mr-accent-a) 60%,transparent);outline-offset:2px}
.mr-theme-track{position:relative;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;width:100%;height:100%;padding:0 7px}
.mr-theme-ic{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);transition:color .25s ease,opacity .25s ease}
.mr-theme-thumb{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--mr-accent-a),var(--mr-accent-b));box-shadow:0 2px 8px color-mix(in srgb,var(--mr-accent-a) 34%,transparent);transition:transform .28s cubic-bezier(.22,.7,.2,1)}
.mr-theme-switch.is-dark .mr-theme-thumb{transform:translateX(27px)}
.mr-theme-switch.is-dark .mr-theme-ic.is-moon,.mr-theme-switch:not(.is-dark) .mr-theme-ic.is-sun{color:#fff}
.mr-iq-panel{overflow:hidden}
.mr-iq-panel > *:not(.mr-iq-radar-deco){position:relative;z-index:1}
.mr-iq-radar-deco{position:absolute;z-index:0;right:-80px;top:-160px;width:440px;height:440px;border-radius:50%;background:repeating-radial-gradient(circle,color-mix(in srgb,var(--mr-accent-a) 9%,transparent) 0 1px,transparent 1px 28px),conic-gradient(from 206deg,transparent 0 76%,color-mix(in srgb,var(--mr-accent-b) 10%,transparent) 82%,transparent 89%);opacity:.7;pointer-events:none}
.mr-iq-radar-deco::after{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 84%,color-mix(in srgb,var(--mr-accent-a) 9%,transparent) 90%,color-mix(in srgb,var(--mr-accent-c) 7%,transparent) 93%,transparent 95%);animation:mr-radar-sweep 8s linear infinite;pointer-events:none}
.mr-iq-best{position:relative;border:1px solid transparent;background:linear-gradient(145deg,color-mix(in srgb,var(--mr-accent-a) 9%,var(--dsw-alias-bg-layer-1)),color-mix(in srgb,var(--mr-accent-b) 6%,var(--dsw-alias-bg-layer-1))) padding-box,linear-gradient(140deg,color-mix(in srgb,var(--mr-accent-a) 34%,var(--dsw-alias-border-l1)),color-mix(in srgb,var(--mr-accent-b) 28%,var(--dsw-alias-border-l1))) border-box;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.mr-iq-best::before{content:"";position:absolute;right:12px;top:12px;width:54px;height:54px;border-radius:50%;background:repeating-radial-gradient(circle,color-mix(in srgb,var(--mr-accent-a) 15%,transparent) 0 1px,transparent 1px 9px);opacity:.7;pointer-events:none}
.mr-iq-best-score{background:linear-gradient(110deg,var(--mr-accent-a),var(--mr-accent-b));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.mr-iq-best-score.is-empty{background:none;color:var(--dsw-alias-label-secondary);-webkit-text-fill-color:currentColor}
.mr-iq-track{height:7px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);box-shadow:inset 0 1px 2px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-iq-fill{background:linear-gradient(90deg,var(--mr-accent-a),var(--mr-accent-b));transform-origin:left;animation:mr-bar-grow .7s cubic-bezier(.2,.7,.2,1) both;box-shadow:0 0 10px color-mix(in srgb,var(--mr-accent-a) 24%,transparent)}
.mr-iq-row{position:relative;overflow:hidden}
.mr-iq-row::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 14%,color-mix(in srgb,var(--mr-accent-a) 11%,transparent) 48%,transparent 82%);transform:translateX(-120%);opacity:0;pointer-events:none}
.mr-iq-row:hover::after{animation:mr-row-sweep .7s ease}
.mr-iq-row-score-col{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none;min-width:0}
.mr-iq-best-delta{margin-top:7px;align-self:flex-start}
.mr-delta-chip{display:inline-flex;align-items:center;justify-content:center;min-height:17px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 65%,transparent);font-size:9px;line-height:13px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-delta-chip.is-up{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 28%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,transparent)}
.mr-delta-chip.is-down{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent)}
.mr-delta-chip.is-flat{color:var(--dsw-alias-label-secondary)}
.mr-table-group-row th{height:28px;padding:5px 8px;border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 82%,transparent);color:var(--dsw-alias-label-secondary);font-size:9.5px;line-height:13px;font-weight:700;letter-spacing:.06em;text-align:center}
.mr-table-group-row th.is-performance{border-left:1px solid var(--dsw-alias-border-l1);color:var(--mr-accent-a);box-shadow:inset 0 -2px 0 color-mix(in srgb,var(--mr-accent-a) 40%,transparent)}
.mr-table-group-row th.is-cost,.mr-table-group-row th.is-batch{border-left:1px solid var(--dsw-alias-border-l1)}
.mr-table-group-row th.is-cost{color:var(--dsw-alias-label-secondary)}
.mr-table-group-row th.is-batch{color:var(--dsw-alias-label-secondary)}
.mr-table td.mr-meter-cell{position:relative;border-radius:5px;padding-bottom:13px;background:transparent;box-shadow:none}
.mr-table td.mr-meter-cell::before{content:"";position:absolute;left:16%;right:16%;bottom:5px;height:2px;border-radius:2px;background:color-mix(in srgb,var(--mr-heat-tone,var(--dsw-alias-border-l1)) 16%,transparent)}
.mr-table td.mr-meter-cell::after{content:"";position:absolute;left:16%;right:16%;bottom:5px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--mr-accent-a),var(--mr-heat-tone,var(--mr-accent-b)));transform:scaleX(var(--mr-heat,0));transform-origin:left;transition:transform .45s cubic-bezier(.22,.7,.2,1)}
.mr-table td.mr-meter-cell.mr-score-strong::before,.mr-table td.mr-meter-cell.mr-score-strong::after{left:12%;right:12%;bottom:3px;height:3px}
.mr-table tbody tr.mr-row-click{transition:background-color .16s ease}
.mr-table tbody tr.mr-row-click:hover{background:linear-gradient(90deg,color-mix(in srgb,var(--mr-accent-a) 8%,transparent),transparent 56%,color-mix(in srgb,var(--mr-accent-b) 7%,transparent))}
.mr-table-row-in{animation:mr-row-in .45s cubic-bezier(.2,.7,.2,1) both}
.mr-latest-panel .mr-table thead tr:first-child th{position:sticky;top:0;z-index:3}
.mr-latest-panel .mr-table thead tr:nth-child(2) th{position:sticky;top:26px;z-index:2}
.mr-matrix-cell:hover{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 48%,transparent);outline-offset:1px}
.mr-matrix-legend-bar{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.mr-area-fill{opacity:1;animation:mr-area-in .75s ease both}
.mr-line-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:mr-line-draw .9s cubic-bezier(.2,.7,.2,1) both}
.mr-line-draw.is-dashed{stroke-dashoffset:0;animation:none}
.mr-point-dot,.mr-pareto-dot{transform-box:fill-box;transform-origin:center;transition:transform .16s ease}
.mr-point-hit:hover + .mr-point-dot,.mr-point-hit:focus + .mr-point-dot,.mr-pareto-dot:hover,.mr-pareto-dot:focus{transform:scale(1.55)}
.mr-pareto-frontier{filter:drop-shadow(0 0 4px color-mix(in srgb,var(--mr-accent-a) 26%,transparent))}
.mr-chart-tip{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,var(--dsw-alias-border-l1));box-shadow:0 10px 28px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent),0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.mr-stat-card{overflow:hidden}
.mr-stat-highlight{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:0 0 9px;min-height:30px}
.mr-stat-highlight-value{font-size:22px;line-height:26px;font-weight:650;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums;letter-spacing:-.02em;white-space:nowrap}
.mr-sparkline{width:96px;height:26px;overflow:visible;flex:none}
.mr-sparkline-line{fill:none;stroke:var(--mr-accent-a);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:mr-line-draw .8s ease-out both}
.mr-sparkline-area{fill:color-mix(in srgb,var(--mr-accent-a) 10%,transparent);stroke:none}
.mr-perf-card{overflow:hidden}
.mr-perf-card-head{align-items:flex-start}
.mr-perf-card-side{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none;min-width:0}
.mr-perf-radar-wrap{width:128px;height:128px;flex:none;color:var(--mr-accent-a)}
.mr-perf-radar{display:block;width:100%;height:100%;overflow:visible}
.mr-radar-ring{fill:none;stroke:color-mix(in srgb,var(--mr-accent-a) 24%,var(--dsw-alias-border-l1));stroke-width:.8}
.mr-radar-axis{stroke:color-mix(in srgb,var(--mr-accent-a) 20%,var(--dsw-alias-border-l1));stroke-width:.6}
.mr-radar-shape{stroke:var(--mr-accent-b);stroke-width:1.5;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:mr-radar-draw .9s cubic-bezier(.2,.7,.2,1) both}
.mr-radar-vertex{fill:var(--mr-accent-b);stroke:var(--dsw-alias-bg-layer-1);stroke-width:.7}
.mr-radar-label{fill:var(--dsw-alias-label-secondary);font-size:7px;font-weight:500;letter-spacing:.01em;pointer-events:none}
.mr-perf-radar:focus-visible{outline:2px solid color-mix(in srgb,var(--mr-accent-a) 55%,transparent);outline-offset:2px;border-radius:8px}
.mr-perf-score-value{font-size:23px}
.mr-perf-baseline .mr-delta-chip{font-size:9px}
.mr-dim-fill{background:linear-gradient(90deg,var(--mr-accent-a),var(--mr-accent-b));box-shadow:0 0 8px color-mix(in srgb,var(--mr-accent-a) 20%,transparent)}
.mr-perf-scope{margin-top:2px;color:var(--dsw-alias-label-secondary);font-size:10px}
.mr-credits{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:5px;padding:22px 0 4px;color:var(--dsw-alias-label-secondary);font-size:9.5px;line-height:14px}
.mr-credits-prefix{opacity:.85}
.mr-credits a{color:var(--mr-accent-a);text-decoration:none;font-weight:600;border-bottom:1px solid transparent;transition:border-color .15s ease,color .15s ease}
.mr-credits a:hover{color:var(--mr-accent-b);border-bottom-color:color-mix(in srgb,var(--mr-accent-b) 45%,transparent)}
.mr-credits-sep{opacity:.5}
.mr-dot-loader{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,var(--dsw-alias-border-l1));border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 90%,transparent)}
.mr-dot-grid{display:grid;grid-template-columns:repeat(5,5px);grid-template-rows:repeat(5,5px);gap:3px;flex:none}
.mr-dot{width:5px;height:5px;border-radius:50%;background:color-mix(in srgb,var(--mr-accent-a) 58%,transparent);animation:mr-dot-breathe 1.4s ease-in-out 6 both}
.mr-dot-label{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.mr-track-fill{position:relative;overflow:hidden;background:linear-gradient(90deg,var(--mr-accent-a),var(--mr-accent-b));box-shadow:0 0 10px color-mix(in srgb,var(--mr-accent-a) 22%,transparent)}
.mr-track-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,color-mix(in srgb,var(--dsw-alias-bg-base) 34%,transparent) 50%,transparent 80%);transform:translateX(-120%);animation:mr-shimmer 1.8s linear infinite}
.mr-track-fill.is-warn{background:var(--dsw-alias-state-warn-primary)}
@keyframes mr-radar-sweep{to{transform:rotate(360deg)}}
@keyframes mr-brand-fan{to{transform:rotate(360deg)}}
@keyframes mr-bar-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes mr-row-sweep{0%{transform:translateX(-120%);opacity:0}18%{opacity:1}100%{transform:translateX(120%);opacity:0}}
@keyframes mr-row-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@keyframes mr-line-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes mr-area-in{from{opacity:0}to{opacity:1}}
@keyframes mr-radar-draw{from{stroke-dashoffset:1;opacity:.15}to{stroke-dashoffset:0;opacity:1}}
@keyframes mr-dot-breathe{0%,100%{opacity:.28;transform:scale(.82)}50%{opacity:1;transform:scale(1.28)}}
@keyframes mr-shimmer{to{transform:translateX(120%)}}
@container mr (max-width:900px){
.mr-perf-radar .mr-radar-label{font-size:7px;opacity:0;visibility:hidden;transition:opacity .14s ease}
.mr-perf-radar .mr-radar-label.is-ttft,.mr-perf-radar .mr-radar-label.is-tps,.mr-perf-radar .mr-radar-label.is-success,.mr-perf-radar .mr-radar-label.is-cache{opacity:1;visibility:visible}
.mr-perf-card:hover .mr-perf-radar .mr-radar-label,.mr-perf-card:focus-within .mr-perf-radar .mr-radar-label{opacity:1;visibility:visible}
.mr-table-scroll-wrap .mr-table-scroll-tip{display:flex}
.mr-table-scroll-wrap::after{content:"";position:absolute;z-index:3;top:24px;right:0;bottom:0;width:42px;border-radius:0 10px 10px 0;background:linear-gradient(90deg,transparent,var(--dsw-alias-bg-layer-1) 78%);pointer-events:none}
.mr-table-scroll-wrap.is-end .mr-table-scroll-tip{display:none}
.mr-table-scroll-wrap.is-end::after{display:none}
}
@media (prefers-reduced-motion:reduce){.mr-btn,.mr-tab,.mr-chip,.mr-range-btn,.mr-seg-btn,.mr-dim-fill,.mr-track-fill,.mr-model-toggle-chevron,.mr-row-click,.mr-iq-row,.mr-iq-task-tab,.mr-matrix-cell,.mr-collapse-caret,.mr-artifact-file,.mr-artifact-tab,.mr-skel,.mr-live-dot,.mr-modal,.mr-drawer,.mr-modal-backdrop,.mr-drawer-backdrop,.mr-toast{animation:none!important;transition:none!important}.mr-btn:active,.mr-matrix-cell:hover{transform:none}.mr-chart-tip,.mr-pompeii-asset,.mr-panel,.mr-tab{transition:none}}
@media (prefers-reduced-motion:reduce){
.mr-brand-fan,.mr-sidebar-fan,.mr-iq-radar-deco::after,.mr-iq-fill,.mr-iq-row::after,.mr-table-row-in,.mr-line-draw,.mr-area-fill,.mr-radar-shape,.mr-sparkline-line,.mr-dot,.mr-track-fill::after,.mr-tab::after{animation:none!important;transition:none!important}
.mr-iq-fill,.mr-line-draw,.mr-area-fill,.mr-radar-shape,.mr-table-row-in,.mr-dot{opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
.mr-track-fill::after{display:none}
.mr-btn:hover,.mr-btn:active,.mr-iq-row:hover::after{transform:none}
.mr-theme-thumb{transition:none!important}
.mr-radar-label{transition:none!important}
.mr-tab.is-active::after{opacity:1;transform:scaleX(1)}
}
/* ── overview / ranking redesign ─────────────────────────────────────── */
.mr-section-no{display:inline-flex;align-items:center;justify-content:center;height:17px;padding:0 5px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary);font-size:9.5px;line-height:1;font-weight:650;letter-spacing:.02em}
.mr-panel-head-main{display:flex;flex-direction:column;min-width:0}
.mr-ov-panel{padding:20px}
.mr-ov-head{align-items:flex-start}
.mr-ov-grid{display:grid;grid-template-columns:minmax(246px,.84fr) minmax(0,1.62fr);gap:16px;align-items:stretch;min-width:0}
.mr-ov-best{display:flex;flex-direction:column;box-sizing:border-box;min-width:0;padding:15px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:linear-gradient(150deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-layer-2)),var(--dsw-alias-bg-layer-1) 58%)}
.mr-ov-best-label{font-size:10px;line-height:14px;font-weight:600;letter-spacing:.05em;color:var(--dsw-alias-label-secondary)}
.mr-ov-best-score{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;margin:6px 0 6px;font-size:44px;line-height:1;font-weight:680;letter-spacing:-.04em;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-ov-best-score.is-empty{font-size:28px;line-height:34px;color:var(--dsw-alias-label-secondary);letter-spacing:0;margin-bottom:10px}
.mr-ov-best-max{font-size:12px;line-height:1;font-weight:500;letter-spacing:0;color:var(--dsw-alias-label-secondary)}
.mr-ov-best-model{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;line-height:18px;font-weight:600;overflow-wrap:anywhere}
.mr-ov-best-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px;min-height:18px}
.mr-ov-best-provider{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-ov-best-meta{display:flex;flex-wrap:wrap;gap:4px 5px;margin-top:9px;font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-ov-best-meta span{padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 55%,transparent);font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-ov-tasks-label{margin-top:11px;font-size:9px;line-height:13px;font-weight:600;letter-spacing:.03em;color:var(--dsw-alias-label-secondary)}
.mr-ov-best-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:12px}
.mr-ov-rank-chip{margin-top:0;align-self:flex-start;padding:2px 7px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);color:var(--dsw-alias-brand-primary);font-size:9px;line-height:14px;font-weight:600;white-space:nowrap}
.mr-ov-tasks{display:flex;flex-direction:column;gap:4px;margin-top:11px;padding-top:10px;border-top:1px dashed color-mix(in srgb,var(--dsw-alias-border-l1) 82%,transparent)}
.mr-ov-task-row{display:grid;grid-template-columns:34px minmax(0,1fr) 62px;align-items:center;gap:7px;min-width:0}
.mr-ov-task-name{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mr-ov-task-track{height:5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}
.mr-ov-task-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-state-success-primary)),var(--dsw-alias-brand-primary))}
.mr-ov-task-score{font-size:9px;line-height:13px;text-align:right;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-ov-rank{display:flex;flex-direction:column;min-width:0}
.mr-ov-rank-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:5px;padding:0 2px}
.mr-ov-rank-title{font-size:10px;line-height:14px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-ov-rank-meta{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.mr-ov-rank-list{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-ov-rank-empty{padding:18px 2px}
.mr-ov-row{display:grid;grid-template-columns:24px minmax(0,1fr) 72px 98px;align-items:center;gap:10px;min-width:0;width:100%;padding:6px 7px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;transition:background-color .12s ease,border-color .12s ease}
.mr-ov-row:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent)}
.mr-ov-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.mr-ov-row.is-incomplete{opacity:.62}
.mr-ov-rankno{width:24px;flex:none;text-align:center;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-ov-row-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.mr-ov-row-title{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
.mr-ov-model{font-size:11.5px;line-height:16px;font-weight:600;overflow-wrap:anywhere;min-width:0}
.mr-ov-effort{display:inline-flex;align-items:center;min-height:15px;padding:0 5px;border:1px solid color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 30%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--mr-effort-color,var(--dsw-alias-label-secondary)) 11%,transparent);color:var(--mr-effort-color,var(--dsw-alias-label-secondary));font-size:8.5px;line-height:13px;font-weight:600;white-space:nowrap}
.mr-ov-badge{display:inline-flex;align-items:center;min-height:15px;padding:0 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:8.5px;line-height:13px;white-space:nowrap}
.mr-ov-track{height:5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}
.mr-ov-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 56%,var(--dsw-alias-state-success-primary)),var(--dsw-alias-brand-primary))}
.mr-ov-row.is-incomplete .mr-ov-fill{background:var(--dsw-alias-state-idle-primary)}
.mr-ov-row-score{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none}
.mr-ov-score{font-size:12px;line-height:16px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-ov-row-meta{display:flex;flex-direction:column;align-items:flex-end;gap:1px;font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap;min-width:0}
.mr-ov-rank-sep{margin:7px 2px 4px;padding-top:6px;border-top:1px dashed color-mix(in srgb,var(--dsw-alias-border-l1) 80%,transparent);font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-ov-rank-foot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:5px;padding:0 2px;min-height:18px}
.mr-ov-more{padding:0;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:9.5px;line-height:14px;font-weight:600;cursor:pointer;white-space:nowrap}
.mr-ov-more:hover{text-decoration:underline}
.mr-rc-card{grid-column:1/-1;display:grid;grid-template-columns:minmax(186px,.72fr) minmax(210px,1fr) minmax(228px,1.18fr);gap:9px 22px;align-items:center;box-sizing:border-box;min-width:0;padding:14px 16px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,var(--dsw-alias-border-l1));border-radius:13px;background:linear-gradient(155deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-layer-2)),var(--dsw-alias-bg-layer-1) 62%)}
.mr-rc-card.is-empty{grid-template-columns:minmax(0,1fr) auto}
.mr-rc-lead{display:flex;flex-direction:column;gap:4px;min-width:0}
.mr-rc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.mr-rc-kicker{display:inline-flex;align-items:center;gap:5px;font-size:10px;line-height:14px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-brand-primary)}
.mr-rc-badge{padding:1px 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);font-size:8.5px;line-height:14px;font-weight:650;white-space:nowrap}
.mr-rc-main{display:flex;align-items:baseline;gap:6px;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left}
.mr-rc-lead.is-clickable{cursor:pointer;border-radius:9px;outline-offset:3px}
.mr-rc-lead.is-clickable:hover .mr-rc-score{color:color-mix(in srgb,var(--dsw-alias-brand-primary) 78%,var(--dsw-alias-label-primary))}
.mr-rc-lead.is-clickable:hover .mr-rc-model-name{color:var(--dsw-alias-brand-primary)}
.mr-rc-lead.is-clickable:focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}
.mr-rc-score{font-size:33px;line-height:1;font-weight:680;letter-spacing:-.035em;color:var(--dsw-alias-brand-primary);font-variant-numeric:tabular-nums}
.mr-rc-score-max{font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-rc-model{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left}
.mr-rc-model-name{font-size:12px;line-height:17px;font-weight:650;overflow-wrap:anywhere}
.mr-rc-provider{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-rc-dims{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;min-width:0}
.mr-rc-dim{display:flex;flex-direction:column;gap:2px;min-width:0}
.mr-rc-dim-head{display:flex;align-items:baseline;gap:5px;font-size:9px;line-height:13px;min-width:0}
.mr-rc-dim-label{color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-rc-dim-weight{color:var(--dsw-alias-label-secondary);font-size:8px;line-height:12px;white-space:nowrap}
.mr-rc-dim-score{margin-left:auto;color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.mr-rc-dim-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent);overflow:hidden}
.mr-rc-dim-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,var(--dsw-alias-state-success-primary)),var(--dsw-alias-brand-primary))}
.mr-rc-side{display:flex;flex-direction:column;gap:5px;min-width:0}
.mr-rc-reasons{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;min-width:0}
.mr-rc-reasons li{display:flex;align-items:flex-start;gap:4px;font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-rc-reasons svg{flex:none;margin-top:1px;color:var(--dsw-alias-state-success-primary)}
.mr-rc-alts{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding-top:5px;border-top:1px dashed color-mix(in srgb,var(--dsw-alias-border-l1) 82%,transparent)}
.mr-rc-alts-label{font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-rc-alt{display:inline-flex;align-items:baseline;gap:4px;max-width:100%;padding:2px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 62%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:8.5px;line-height:13px;cursor:pointer;white-space:nowrap}
.mr-rc-alt:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,var(--dsw-alias-border-l1));color:var(--dsw-alias-label-primary)}
.mr-rc-alt-label{color:var(--dsw-alias-label-secondary);font-size:8px}
.mr-rc-alt-name{color:var(--dsw-alias-label-primary);font-weight:600;max-width:112px;overflow:hidden;text-overflow:ellipsis}
.mr-rc-alt-effort{color:var(--dsw-alias-label-secondary)}
.mr-rc-hint{font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary)}
.mr-rc-empty-title{margin-top:5px;font-size:11.5px;line-height:16px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mr-rc-empty-sub{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary)}
@container mr (max-width:960px){.mr-ov-grid{grid-template-columns:1fr}.mr-ov-rank-list{max-height:none}.mr-rc-card{grid-template-columns:minmax(0,1fr)}.mr-rc-dims{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container mr (max-width:860px){.mr-ov-panel{padding:16px}.mr-ov-rank-chip{font-size:8.5px}}
@container mr (max-width:620px){.mr-ov-panel{padding:14px}.mr-ov-grid{gap:12px}.mr-ov-row{grid-template-columns:20px minmax(0,1fr) 64px;gap:7px}.mr-ov-row-meta{grid-column:2/-1;flex-direction:row;flex-wrap:wrap;justify-content:flex-end;gap:4px 8px}.mr-ov-best-score{font-size:36px}.mr-rc-card{padding:12px 13px}.mr-rc-dims{grid-template-columns:minmax(0,1fr)}}

/* ── settings view ────────────────────────────────────────────────── */
.mr-settings{min-width:0}
.mr-settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:stretch}
.mr-settings-card{display:flex;flex-direction:column;min-width:0;padding:16px 18px}
.mr-settings-card>.mr-panel-head{flex:none}
.mr-settings-card>.mr-settings-rows{flex:1}
.mr-settings-card.is-wide{grid-column:1/-1}
.mr-settings-card .mr-panel-head{padding-bottom:9px;margin-bottom:11px}
.mr-settings-index{display:inline-flex;align-items:center;justify-content:center;flex:none;min-width:24px;height:20px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;line-height:1;letter-spacing:.08em}
.mr-settings-head-main{min-width:0}
.mr-settings-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;flex-wrap:wrap}
.mr-settings-dirty-pill{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 32%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:9.5px;line-height:14px;white-space:nowrap}
.mr-settings-dirty-pill::before{content:"";width:5px;height:5px;flex:none;border-radius:50%;background:currentColor}
.mr-settings-rows{display:flex;flex-direction:column;gap:13px;min-width:0}
.mr-settings-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;min-width:0}
.mr-settings-row.is-stack{flex-direction:column;gap:7px}
.mr-settings-row-text{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.mr-settings-label{display:block;font-size:11.5px;line-height:16px;font-weight:560;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.mr-settings-desc{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-settings-control{display:flex;flex-direction:column;gap:4px;flex:none;width:172px;max-width:46%;min-width:0}
.mr-settings-input-wrap{display:flex;align-items:center;gap:6px;min-width:0}
.mr-settings-input{box-sizing:border-box;width:100%;height:30px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:16px;text-align:right;outline:none;min-width:0}
.mr-settings-input:hover{border-color:var(--dsw-alias-border-l2)}
.mr-settings-input:focus{border-color:var(--dsw-alias-brand-primary)}
.mr-settings-input:disabled{opacity:.55;cursor:not-allowed}
.mr-settings-unit{flex:none;font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.mr-settings-hints{display:flex;flex-direction:column;gap:1px;min-width:0}
.mr-settings-hint{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;text-align:right}
.mr-settings-hint.is-sub{font-size:8.5px;line-height:12.5px;color:color-mix(in srgb,var(--dsw-alias-label-secondary) 82%,transparent)}
.mr-settings-hint.is-warn{color:var(--dsw-alias-state-warn-primary);text-align:left}
.mr-settings-judge{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.mr-settings-judge-preview{padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l1);font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-settings-rec{display:flex;flex-direction:column;gap:11px;min-width:0}
.mr-settings-rec-row{display:flex;flex-direction:column;gap:5px;min-width:0}
.mr-settings-rec-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;min-width:0}
.mr-settings-rec-value{flex:none;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-settings-slider{width:100%;height:18px;margin:0;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.mr-settings-slider:disabled{cursor:not-allowed;opacity:.55}
.mr-settings-rec-summary{display:flex;flex-direction:column;gap:6px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent)}
.mr-settings-rec-summary-title{font-size:9.5px;line-height:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.mr-settings-rec-share{display:grid;grid-template-columns:56px 44px minmax(0,1fr);align-items:center;gap:7px;font-size:9.5px;line-height:13px;color:var(--dsw-alias-label-secondary)}
.mr-settings-rec-share-label{overflow-wrap:anywhere}
.mr-settings-rec-share-value{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.mr-settings-rec-share-track{display:block;height:5px;border-radius:999px;background:var(--dsw-alias-border-l2);overflow:hidden}
.mr-settings-rec-share-fill{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary)}
.mr-settings-readonly{box-sizing:border-box;width:100%;height:30px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 72%,transparent);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:16px;outline:none;min-width:0;text-overflow:ellipsis}
.mr-settings-readonly:focus{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.mr-settings-chips{display:flex;flex-wrap:wrap;gap:5px}
.mr-settings-chip{display:inline-flex;align-items:center;max-width:100%;padding:2px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 72%,transparent);color:var(--dsw-alias-label-secondary);font-size:9.5px;line-height:15px;overflow-wrap:anywhere}
.mr-settings-empty{font-size:9.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.mr-settings-skeleton-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mr-settings-skeleton-rows{display:flex;flex-direction:column;gap:11px;margin-top:14px}
.mr-settings-bar{position:sticky;bottom:0;z-index:24;flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:4px;padding:11px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 -10px 26px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-settings-bar-info{display:flex;flex-direction:column;gap:3px;flex:1 1 260px;min-width:0}
.mr-settings-status{display:flex;align-items:center;gap:6px;font-size:10.5px;line-height:15px;font-weight:560;color:var(--dsw-alias-label-primary)}
.mr-settings-status::before{content:"";width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary)}
.mr-settings-bar.is-dirty .mr-settings-status{color:var(--dsw-alias-state-warn-primary)}
.mr-settings-bar.is-dirty .mr-settings-status::before{background:var(--dsw-alias-state-warn-primary)}
.mr-settings-bar.is-saving .mr-settings-status::before{background:var(--dsw-alias-brand-primary)}
.mr-settings-updated{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.mr-settings-notice{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-settings-bar-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex:none;flex-wrap:wrap}
.mr-settings-confirm-text{font-size:10px;line-height:15px;color:var(--dsw-alias-state-error-primary);max-width:300px}
.mr-settings-bar .mr-form-error{margin-top:0;align-items:center}
@container mr (max-width:900px){.mr-settings-grid{grid-template-columns:1fr}.mr-settings-card.is-wide{grid-column:auto}}
@container mr (max-width:620px){.mr-settings-row{flex-direction:column;align-items:stretch;gap:6px}.mr-settings-control{width:100%;max-width:none}.mr-settings-hint{text-align:left}.mr-settings-judge{grid-template-columns:1fr}.mr-settings-bar{flex-direction:column;align-items:stretch}.mr-settings-bar-actions{justify-content:flex-start}.mr-settings-head-actions{justify-content:flex-start}.mr-settings-rec-share{grid-template-columns:52px 40px minmax(0,1fr)}}
.mr-rerun-modal{width:min(920px,100%);outline:none}
.mr-rerun-head-main{min-width:0}
.mr-rerun-head-side{display:flex;align-items:center;gap:8px;flex:none}
.mr-rerun-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 10px;flex-wrap:wrap}
.mr-rerun-toolbar-left{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;min-width:0}
.mr-rerun-toolbar-right{display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:none}
.mr-rerun-section-title{margin:0;font-size:12px;font-weight:600;line-height:17px}
.mr-rerun-scroll{width:100%;max-width:100%;max-height:min(48vh,440px);overflow:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-1)}
.mr-rerun-table{box-sizing:border-box;width:100%;min-width:620px;border-collapse:separate;border-spacing:0;font-size:10.5px;line-height:15px}
.mr-rerun-table th,.mr-rerun-table td{border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 72%,transparent);text-align:left}
.mr-rerun-table tbody tr:last-child th,.mr-rerun-table tbody tr:last-child td{border-bottom:none}
.mr-rerun-table thead th{position:sticky;top:0;z-index:3;padding:8px 9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:9.5px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.mr-rerun-table thead th.mr-rerun-corner{left:0;z-index:5;box-sizing:border-box;width:46%;min-width:200px;max-width:340px;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.mr-rerun-table thead th.mr-rerun-col{text-align:center;min-width:88px}
.mr-rerun-col-name{display:block;font-size:10.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.mr-rerun-col-max{display:block;margin-top:1px;font-size:8.5px;line-height:12px;font-weight:500;opacity:.85}
.mr-rerun-table tbody tr{background:var(--dsw-alias-bg-layer-1)}
.mr-rerun-row-head{position:sticky;left:0;z-index:2;box-sizing:border-box;width:46%;min-width:200px;max-width:340px;padding:5px 9px;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);vertical-align:middle}
.mr-rerun-row-inner{display:flex;align-items:center;gap:8px;min-width:0}
.mr-rerun-row-inner .mr-check:disabled{opacity:.45;cursor:not-allowed}
.mr-rerun-model-wrap{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
.mr-rerun-model{font-size:11px;line-height:15px;font-weight:580;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;min-width:0}
.mr-rerun-td{padding:3px 4px;text-align:center;vertical-align:middle}
.mr-rerun-cell{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;min-height:34px;padding:4px 6px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:15px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;transition:background-color .12s ease,border-color .12s ease,color .12s ease}
.mr-rerun-cell:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent)}
.mr-rerun-cell:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.mr-rerun-cell-dot{display:inline-block;width:5px;height:5px;flex:none;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.mr-rerun-cell-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mr-rerun-cell.is-done{color:var(--dsw-alias-label-primary)}
.mr-rerun-cell.is-done .mr-rerun-cell-dot{background:var(--dsw-alias-state-success-primary)}
.mr-rerun-cell.is-error{color:var(--dsw-alias-state-error-primary)}
.mr-rerun-cell.is-error .mr-rerun-cell-dot{background:var(--dsw-alias-state-error-primary)}
.mr-rerun-cell.is-warn{color:var(--dsw-alias-label-secondary)}
.mr-rerun-cell.is-warn .mr-rerun-cell-dot{background:var(--dsw-alias-state-warn-primary)}
.mr-rerun-cell.is-running{color:var(--dsw-alias-brand-primary)}
.mr-rerun-cell.is-running .mr-rerun-cell-dot{background:var(--dsw-alias-brand-primary)}
.mr-rerun-table tbody tr:hover > .mr-rerun-row-head{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 3%,var(--dsw-alias-bg-layer-1))}
.mr-rerun-table tbody tr.is-selected > .mr-rerun-row-head{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 4%,var(--dsw-alias-bg-layer-1))}
.mr-rerun-cell.is-selected{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary)}
.mr-rerun-cell.is-selected .mr-rerun-cell-dot{background:var(--dsw-alias-brand-primary)}
.mr-rerun-cell.is-missing{color:var(--dsw-alias-state-idle-primary);opacity:.6;cursor:not-allowed}
.mr-rerun-cell:disabled{cursor:not-allowed}
.mr-rerun-cell:disabled:hover{border-color:transparent;background:transparent}
.mr-rerun-foot-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.mr-rerun-stats{font-size:12px;font-weight:600;line-height:17px}
.mr-rerun-foot-sub{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-rerun-actions{display:flex;align-items:center;gap:8px;flex:none}
@container mr (max-width:860px){.mr-rerun-modal{width:100%}.mr-rerun-scroll{max-height:min(45vh,380px)}.mr-rerun-table{min-width:560px}.mr-rerun-table thead th.mr-rerun-corner,.mr-rerun-row-head{width:44%;min-width:180px;max-width:280px}}
@container mr (max-width:620px){.mr-rerun-toolbar-right{width:100%;justify-content:flex-end}.mr-rerun-scroll{max-height:min(40vh,330px)}.mr-rerun-table{min-width:500px;font-size:10px}.mr-rerun-model{font-size:10.5px}.mr-rerun-cell{min-height:32px;padding:4px}.mr-rerun-table thead th.mr-rerun-corner,.mr-rerun-row-head{width:48%;min-width:160px}}
@media (prefers-reduced-motion:reduce){.mr-rerun-cell{transition:none}}
/* ── detail drawer v2 ─────────────────────────────────────────────────── */
.mr-drawer-detail{width:min(780px,100%)}
.mr-drawer-title-row{display:flex;align-items:center;gap:6px;min-width:0}
.mr-md-back{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}
.mr-md-back:hover{color:var(--dsw-alias-label-primary)}
.mr-md-back svg{transform:rotate(90deg)}
.mr-md{display:flex;flex-direction:column;gap:14px;min-width:0}
.mr-md-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 15px;border:1px solid var(--dsw-alias-border-l1);border-radius:13px;background:linear-gradient(150deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2)),var(--dsw-alias-bg-layer-1) 60%)}
.mr-md-hero-main{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 280px}
.mr-md-kicker{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-md-name{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.mr-md-model{font-size:17px;line-height:24px;font-weight:680;letter-spacing:-.01em;overflow-wrap:anywhere}
.mr-md-rank{font-size:9px;line-height:14px;padding:1px 6px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);color:var(--dsw-alias-brand-primary);font-weight:600;white-space:nowrap}
.mr-md-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-md-complete{color:var(--dsw-alias-state-success-primary);font-weight:600}
.mr-md-rerun-badge{padding:0 5px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,var(--dsw-alias-border-l1));border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,transparent);color:var(--dsw-alias-state-warn-primary);font-weight:600;font-size:8.5px;line-height:13px}
.mr-md-missing{color:var(--dsw-alias-state-warn-primary);font-weight:600}
.mr-md-running{color:var(--dsw-alias-brand-primary);font-weight:600}
.mr-md-hero-score{display:flex;align-items:baseline;gap:4px;flex:none;font-variant-numeric:tabular-nums}
.mr-md-hero-value{font-size:36px;line-height:1;font-weight:680;letter-spacing:-.035em;color:var(--dsw-alias-brand-primary)}
.mr-md-hero-max{font-size:11px;line-height:1;color:var(--dsw-alias-label-secondary)}
.mr-md-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.mr-md-action-hint{font-size:9px;line-height:13px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.mr-md-tabs{display:flex;align-items:center;gap:3px;flex-wrap:wrap;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:var(--dsw-alias-bg-layer-2);align-self:flex-start;max-width:100%}
.mr-md-tab{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10.5px;line-height:15px;cursor:pointer;white-space:nowrap;transition:background-color .14s ease,color .14s ease,border-color .14s ease}
.mr-md-tab:hover{color:var(--dsw-alias-label-primary)}
.mr-md-tab.is-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 1px 4px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
.mr-md-tab-dot{width:5px;height:5px;flex:none;border-radius:50%;background:var(--dsw-alias-label-secondary)}
.mr-md-tab-dot.is-done{background:var(--dsw-alias-state-success-primary)}
.mr-md-tab-dot.is-running{background:var(--dsw-alias-brand-primary);animation:mr-pulse 1.6s ease infinite}
.mr-md-tab-dot.is-error{background:var(--dsw-alias-state-error-primary)}
.mr-md-tab-dot.is-warn{background:var(--dsw-alias-state-warn-primary)}
.mr-md-tab-dot.is-idle{background:var(--dsw-alias-label-secondary)}
.mr-md-tab-name{font-weight:550}
.mr-md-tab-score{font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-md-tab.is-active .mr-md-tab-score{color:var(--dsw-alias-label-primary)}
.mr-md-task{display:flex;flex-direction:column;gap:12px;min-width:0;padding:14px 15px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 34%,transparent)}
.mr-md-task-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;min-width:0}
.mr-md-task-title{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0}
.mr-md-task-name{font-size:14px;line-height:20px;font-weight:650}
.mr-md-task-max{font-size:9.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.mr-md-task-scale{font-size:9px;line-height:14px;padding:1px 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.mr-md-task-score{display:flex;align-items:baseline;gap:4px;flex:none;font-variant-numeric:tabular-nums}
.mr-md-task-score-value{font-size:26px;line-height:1;font-weight:680;letter-spacing:-.03em;color:var(--dsw-alias-brand-primary)}
.mr-md-task-score-unit{font-size:10px;line-height:1;color:var(--dsw-alias-label-secondary)}
.mr-md-task .mr-detail-meta{grid-template-columns:repeat(4,minmax(0,1fr))}
.mr-md-task .mr-detail-meta>.mr-detail-meta-item:last-child:nth-child(odd){grid-column:auto}
.mr-ellipsis{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mr-md-artifacts{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px 11px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 72%,transparent)}
.mr-md-artifacts-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;min-width:0}
.mr-md-artifacts-title{display:inline-flex;align-items:center;gap:5px;font-size:10px;line-height:14px;font-weight:600;color:var(--dsw-alias-label-primary)}
.mr-md-artifacts-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.mr-md-mode-btn{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:9.5px;line-height:14px;cursor:pointer;white-space:nowrap}
.mr-md-mode-btn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}
.mr-md-mode-btn.is-active{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);color:var(--dsw-alias-brand-primary)}
.mr-md-mode-btn.is-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary)}
.mr-md-filechips{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
.mr-md-filechip{display:inline-flex;align-items:baseline;gap:5px;max-width:100%;padding:2px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:9px;line-height:13px;cursor:pointer;white-space:nowrap}
.mr-md-filechip:hover,.mr-md-filechip.is-active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.mr-md-filechip-name{max-width:180px;overflow:hidden;text-overflow:ellipsis}
.mr-md-filechip-size{font-size:8px;color:var(--dsw-alias-label-secondary)}
.mr-md-preview{display:flex;align-items:flex-start;justify-content:center;min-width:0;max-height:420px;overflow:auto;overscroll-behavior:contain;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 42%,transparent)}
.mr-md-preview:empty{display:none}
.mr-md-preview .mr-artifact-image{max-width:100%;max-height:400px;object-fit:contain;border-radius:8px}
.mr-md-preview .mr-artifact-iframe{width:100%;height:380px;border:0;border-radius:8px;background:#fff}
.mr-md-preview .mr-artifact-pre{width:100%;max-height:380px;margin:0;overflow:auto;border-radius:8px}
.mr-md-preview .mr-pompeii-panel{margin:0;border:0}
.mr-md-empty{padding:14px;border:1px dashed var(--dsw-alias-border-l1);border-radius:9px;color:var(--dsw-alias-label-secondary);font-size:10.5px;text-align:center}
.mr-md-block{display:flex;flex-direction:column;gap:6px;min-width:0}
.mr-md-block-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.mr-md-block-title{font-size:10px;line-height:14px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.mr-md-block .mr-pre{max-height:280px;margin:0}
.mr-md-task-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:2px;min-height:26px}
.mr-bd-list{display:flex;flex-direction:column;gap:1px;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden}
.mr-bd-row{display:grid;grid-template-columns:24px minmax(0,1.2fr) minmax(180px,1fr) 64px auto;align-items:center;gap:10px;min-width:0;width:100%;padding:8px 10px;border:0;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 68%,transparent);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.mr-bd-row:last-child{border-bottom:0}
.mr-bd-row:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,var(--dsw-alias-bg-layer-2))}
.mr-bd-row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.mr-bd-row.is-incomplete{opacity:.7}
.mr-bd-rank{text-align:center;font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.mr-bd-model{display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-width:0}
.mr-bd-model-name{font-size:11px;line-height:16px;font-weight:600;overflow-wrap:anywhere}
.mr-bd-provider{font-size:8.5px;line-height:12px;color:var(--dsw-alias-label-secondary)}
.mr-bd-tasks{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0}
.mr-bd-task{display:inline-flex;align-items:center;gap:3px;padding:1px 5px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-2);font-size:8.5px;line-height:12px;white-space:nowrap}
.mr-bd-task.is-empty{opacity:.55}
.mr-bd-task-name{color:var(--dsw-alias-label-secondary)}
.mr-bd-task-score{color:var(--dsw-alias-label-primary);font-weight:600}
.mr-bd-total{text-align:right;font-size:12px;line-height:16px;font-weight:650;font-variant-numeric:tabular-nums}
@container mr (max-width:900px){.mr-md-task .mr-detail-meta{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-bd-row{grid-template-columns:22px minmax(0,1fr) 56px auto;row-gap:4px}.mr-bd-tasks{grid-column:2/3}}
@container mr (max-width:620px){.mr-drawer-detail{width:100%}.mr-md-hero-value{font-size:30px}.mr-md-tabs{width:100%}.mr-md-tab{flex:1 1 auto;justify-content:center}.mr-md-task-score-value{font-size:22px}.mr-bd-row{grid-template-columns:20px minmax(0,1fr) 52px;row-gap:5px}.mr-bd-tasks{grid-column:2/-1}.mr-bd-row .mr-tag{grid-column:3;justify-self:end}}
`;

		function ensureStyles() {
			if (typeof document === "undefined") return () => {};
			const selector = 'style[data-plugin-css="' + CSS_ID + '"]';
			const existing = document.querySelector(selector);
			if (existing !== null) {
				if (existing.textContent !== CSS) existing.textContent = CSS;
				return () => {};
			}
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-model-radar";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}

		// Slot-level error boundary: if Page throws while rendering, the panel
		// degrades to an inline message instead of escaping into the slot pipeline.
		// A panel render error must never take the boot or the sidebar down with it.
		class PanelBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
				this.retry = this.retry.bind(this);
			}

			static getDerivedStateFromError(error) {
				return { error };
			}

			componentDidCatch(error) {
				try {
					console.error("dsh-model-radar: panel render failed", error);
				} catch (ignored) {
					/* logging must never throw */
				}
			}

			retry() {
				this.setState({ error: null });
			}

			render() {
				const error = this.state.error;
				if (error !== null) {
					const message = error && error.message ? error.message : String(error);
					return h(
						"div",
						{
							role: "alert",
							style: {
								margin: "24px auto",
								maxWidth: 560,
								padding: "16px 18px",
								borderRadius: 12,
								border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, var(--dsw-alias-border-l1))",
								background: "var(--dsw-alias-bg-layer-1)",
								color: "var(--dsw-alias-label-primary)",
								fontSize: 13,
								lineHeight: "20px",
							},
						},
						h("div", { style: { fontWeight: 600, marginBottom: 6 } }, zh["mr.panel.errorTitle"] ?? "Model Radar failed to render"),
						h(
							"div",
							{ style: { color: "var(--dsw-alias-label-secondary)", wordBreak: "break-word", marginBottom: 12 } },
							message,
						),
						h("button", { type: "button", className: "mr-btn", onClick: this.retry }, zh["mr.panel.retry"] ?? "Retry"),
					);
				}
				return h(Page, this.props);
			}
		}

		return {
			inject: ["slots", "locale"],
			apply(ctx) {
				try {
					themeService = ctx.get("theme") ?? null;
				} catch (error) {
					themeService = null;
				}
				ctx.effect(() => ctx.locale.register(NS, "zh", zh), "dsh-model-radar: zh dictionary");
				ctx.effect(() => ctx.locale.register(NS, "en", en), "dsh-model-radar: en dictionary");
				ctx.effect(ensureStyles, "dsh-model-radar: styles");
				const boundTranslate = typeof ctx.locale.bind === "function" ? ctx.locale.bind(NS) : (key) => key;
				ctx.slots.inject("sidebar.panellist", () =>
					ctx.slots.register(
						{ name: "sidebar.panellist", id: PANEL_ID, order: 21, label: () => boundTranslate("mr.panel.name"), locale: NS },
						RadarIcon,
					),
				);
				ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, PanelBoundary));
			},
		};
	},
});