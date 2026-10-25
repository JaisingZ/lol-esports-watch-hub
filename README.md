# LoL Esports Watch Hub

英雄联盟 Worlds 2026 / S16 多语言赛事视频导航，使用已确认的霓虹竞技场 V4 与召唤师峡谷主题背景。

[在线站点](https://jaisingz.github.io/lol-esports-watch-hub/) · [官方赛程](https://lolesports.com/en-US/)

## 当前内容

首批收录 8 场已结束的瑞士轮第二轮比赛、8 条 LoL Esports 官方英文单局录像和 5 个官方频道入口。没有演示比赛、虚构视频或猜测时间。比赛精确开赛时间未取得可靠依据，显示“时间待确认”；不会把视频上传时间当作比赛时间。

视频身份、标题、时长和页面元数据已核验，实际播放尚未验证。页面分别展示核验状态；平台、地区与登录条件可能影响播放。其他解说语言显示“待收录”，频道入口不冒充比赛录像。未展示比分，减少剧透。

完整来源证据、排除的整日直播录像及核验边界见 [来源核验记录](docs/source-verification-2026-10-25.txt)。

## 使用与开发

支持简体中文、繁体中文、英语、韩语、日语、越南语、泰语和巴西葡萄牙语。首次匹配浏览器语言，默认英语；保存手动选择。界面语言和解说语言分别设置，切换界面保留所有筛选。翻译尚未经过母语审校。

搜索战队并选择赛事、年份、阶段、解说语言及视频类型。未收录的解说语言保留比赛卡片并显示待收录；选择具体视频类型时仅展示同时匹配语言和类型的比赛。年份和赛事选项只来自已收录数据。加载失败可重试，空目录仍提供官方赛程入口。

技术为原生 JavaScript + Vite；推荐 Node.js 24 LTS。所有视频仅以 HTTPS 原始来源链接打开新标签页，不使用 iframe、后端、字幕、转存或自动匹配。

~~~sh
npm ci
npm run check
npm run dev
npm run build
npm run preview
~~~

开发及预览路径为 /lol-esports-watch-hub/。构建输出 dist；不提交 dist 或 node_modules。

## 手工维护内容

public/data/sources.json 与 matches.json 都是数组，允许为空，但文件必须存在。数据更新后执行 npm run check 与 npm run build。

频道记录：id、name、language（BCP 47）、platform、url、evidenceUrl、verifiedAt、pageStatus、playbackStatus。

比赛记录：id、tournamentId（worlds）、tournamentName、season（2026）、teams（两个名称）、stage（swiss / playin / knockout）、format（BO1 / BO3 / BO5 / null）、startAt（含时区 ISO 时间或 null）、status（completed）、scheduleSource、verifiedAt、videos。未来同阶段重复对阵时补充 round 区分。

视频记录：language、platform、type（fullMatch / singleGame / highlights）、url、sourceId、evidenceUrl、verifiedAt、pageStatus、playbackStatus。singleGame 必填 gameNumber。整日录像不能作为单场或单局录像，未核实具体时间戳时不收录。

所有 verifiedAt 使用含时区的 ISO 时间。pageStatus 为 verified / unverified；playbackStatus 为 verified / unverified / unavailable。实际播放确认后才能使用 verified，并填写 playbackEvidence 记录验证环境与结果。不可播放视频不显示观看链接。HTTP 200 或播放器 metadata OK 不代表实际播放已通过。

检查包括八语文案与占位符、数据字段、来源引用、唯一比赛/视频、HTTPS、频道/视频边界及播放证据。单元测试覆盖组合筛选、语言匹配和关键拒绝规则；这些检查不代替来源人工核验。

## 图片与发布

页面使用桌面 146 KB、手机 58 KB 的本地 WebP。原始背景及 imagegen 编辑提示词保存在 design；这是召唤师峡谷主题艺术演绎，不是官方截图或精确地图复刻。

PR 自动执行内容检查、测试及构建；main 推送或手动触发后发布 GitHub Pages。沿用 Node 24、固定 SHA 的官方 Actions、内置短期令牌及现有串行发布配置，无长期部署密钥。生产 base 固定 /lol-esports-watch-hub/。

发布验收需要成功工作流、提交 SHA、公网页面与静态资源、数据文件及真实外链证据。回退使用撤销提交后重新发布，不覆盖 Git 历史。
