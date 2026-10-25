# LoL Esports Watch Hub

面向不同语言观众的英雄联盟赛事视频导航，首期聚焦 Worlds 2026 / S16，后续可扩展其他赛区与国际赛事。

**当前仅为基础设施准备页，正式产品界面需在原型确认后接入。** 不包含演示比赛或虚构视频地址。准备页只提供已核实的 [LoL Esports 官方赛程](https://lolesports.com/en-US/) 入口。

## 本地运行

推荐 Node.js 24 LTS 与 npm。CI 固定使用 Node.js 24。

```sh
npm ci
npm run check
npm run dev
```

生产构建与本地预览：

```sh
npm run build
npm run preview
```

访问命令输出的 `/lol-esports-watch-hub/` 地址。`preview` 仅供检查构建产物，线上由 GitHub Pages 托管。

## 发布约定

- 技术：原生 JavaScript + Vite，输出 `dist`，站点基础路径 `/lol-esports-watch-hub/`。
- 在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**，对应 API `build_type: workflow`。
- PR 只执行安装、内容检查与构建；`main` 的推送或在 `main` 手动运行工作流才发布。
- 工作流依赖锁文件使用 `npm ci`，官方 Actions 均固定到已核实的提交 SHA。
- 发布依赖构建成功，使用 `github-pages` 环境和 GitHub 内置短期令牌，不需要额外部署密钥。
- 同一分支只运行最新流水线；旧流水线取消后，最新构建接续发布。
- 预计地址为 `https://jaisingz.github.io/lol-esports-watch-hub/`，需以实际 Pages 配置和成功部署结果为准。
- `dist` 与 `node_modules` 不提交；回退通过撤销有问题的提交后重新发布，不覆盖 Git 历史。

## 设计接入契约

准备页使用中性布局，未采用任何待审阅的 MOBA 候选风格。设计产物独立存放，用户选择原型后才接正式页面。

界面语言支持 `zh-Hans`、`zh-Hant`、`en`、`ko`、`ja`、`vi`、`th`、`pt-BR`。首次根据浏览器语言选择，无法匹配时使用英文；用户手动选择保存在本机。浏览器禁止存储时，切换仍然可用。多语言文案已提供基础译文，未宣称完成母语人工审校。

正式产品的**界面语言**与**视频解说语言**必须分别控制，切换界面不清空解说筛选。视频语言不受这 8 种界面语言清单限制。

后续内容文件为 `public/data/sources.json` 和 `public/data/matches.json`，顶层均为数组。尚无真实内容时可不创建，检查会明确跳过；存在内容时才检查。

- 频道记录包含唯一 `id`、名称、语言、平台、HTTPS `url`、官方来源依据及核验日期。
- 比赛记录包含唯一 `id`、`tournamentId`、`season`、对阵与阶段、赛程来源及 `videos`。首期只收录 S16。
- 视频记录包含 `language`、平台、视频类型、HTTPS `url`、对应来源及核验日期。具体比赛回放不能用频道首页冒充。
- 演示比赛标记 `isDemo`，不得包含可用视频链接。没有核实的视频保持待收录。
- 现有 `npm run check` 校验 8 种语言必要文案；数据存在时校验 JSON、唯一 ID、赛事归属、HTTPS 链接和演示边界。真实来源合法性及实际播放须单独人工核验。

后续仍采用静态链接跳转；不加入 iframe、后端、视频转存、字幕或自动匹配。

## 验收边界

本地 `check` 和 `build` 成功只证明内容格式与本地构建通过。远端交付需同时提供仓库地址、提交 SHA、成功的 Actions 运行、实际 Pages 地址，以及页面和静态资源在项目子路径下可访问的证据。

正式 UI 的桌面/手机交互、多语言布局和真实视频链接在设计批准并集成后单独验收。
