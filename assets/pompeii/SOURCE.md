# 庞贝题素材来源与生成方式 / Puzzle asset source

题面 `question.png` 与拼合参考 `reference.png` 由**本项目自行生成**，不是 Codex Radar
或 RePAIR 数据集文件的复制品。

- **底层壁画**：*Still life with eggs, birds and bronze dishes*，来自庞贝 Julia Felix 之家
  （House of Julia Felix），公元 50–79 年，现藏那不勒斯国家考古博物馆。图像取自
  Wikimedia Commons，**公有领域（Public domain）**、无署名要求：
  https://commons.wikimedia.org/wiki/File:Still_life_with_eggs,_birds_and_bronze_dishes,_Pompeii.jpg
- **加工方式**：将这幅公有领域壁画的照片裁切为 1400×660，按 9 个随机种子生成 Voronoi
  单元切成 9 块碎片；`question.png` 把碎片随机摆放到标注 A–I 的卡片中，`reference.png`
  显示拼合位置，`gold.json` 由同一组单元边界计算得到。
- **许可**：壁画本身为公有领域；本仓库生成的题图、参考图与邻接数据随本项目以 MIT 发布。

图片生成脚本未随仓库发布（一次性生成，避免为它引入 Python/Pillow 依赖）；如需复现，
可按上面的方式用任意图形库重新切分，`gold.json` 中的邻接边由相邻切块共享边界得到。
