# 2026 世界赛统计覆盖与维护

更新日期：2026-10-26（Asia/Shanghai）。本次直接填充真实数据，未使用演示记录。

## 已收录

- 官方赛程 46 场，其中已结束 26 场系列赛；这 26 场的 45 个单局均有 BP、10 人 K/D/A、补刀、金币、对英雄伤害、视野分数及团队目标统计。
- 本届实际出场选手 96 名，450 条选手单局记录。
- 为本届参赛选手增加 2,883 条往届世界赛单局记录，实际覆盖 2015—2025 年；加上本届共 3,333 条记录。只有有记录的年份参与累计。2014 年文件也经过检查，但没有匹配本届选手的有效记录；2013 年及更早尚未覆盖，不能称完整生涯总计。
- 本届英雄资产按比赛版本 16.20.1，98 个英雄图标来自 Riot Data Dragon。
- 保留官方 319 条录像关联；关联核验和实际播放核验分开。地区仍未确认，不能把关联记录改标为播放通过。

## 来源与核对

本届事实来源：
- 官方赛程：https://lolesports.com/en-US/
- 主赛逐场索引：https://gol.gg/tournament/tournament-matchlist/Worlds%202026%20Main%20Event/
- 入围赛逐场索引：https://gol.gg/tournament/tournament-matchlist/Worlds%202026%20Play-In/
- 原始逐局页面和完整统计表 URL 保存在 games.json、player-games.json 中。

历史统计来源：Oracle's Elixir（Tim Sevenhuysen）的公开年度 CSV 下载，https://drive.google.com/drive/folders/1gLSw0RLjBbtaNy0dgnGQDAZOHIgCe-HH 。只保存本项目所需的世界赛选手事实和派生统计，不复制网站文案、页面或整个年度 CSV；来源 URL 保留到每条记录。

2016—2025 世界赛日期范围参考 Haewoon Kwak 的研究清单（CC BY 4.0），并据此排除赛事日期外的区域资格赛：
https://github.com/haewoon/lol-worlds-patch-accountability/blob/main/data/manifests/worlds_events.csv
研究及归属：https://github.com/haewoon/lol-worlds-patch-accountability
许可：https://creativecommons.org/licenses/by/4.0/
2015 日期另核对 Riot 官方指南：https://nexus.leagueoflegends.com/en-us/2015/09/everything-you-need-to-know-about-the-20/

跨源身份表 data-research/player-id-crosswalk.json 使用本届名称和逐局精确 K/D/A、金币交叉匹配，再以唯一 Oracle's Elixir 选手 ID 关联历史记录。不能仅凭同名合并；Shanks、Kratos 等同名记录已经通过实际比赛证据区分。

本届金币、击杀等保留 Games of Legends 精确值。296 条记录的伤害值与 Oracle's Elixir 相差 1—2，差异保存在 stat-source-differences.json，不混用两源数值。团队击杀必须等于本队选手击杀之和；死亡可大于对手击杀，原始差值保留在 deathsWithoutOpponentKill，不擅自改数或猜测具体原因。

历史数据不提供可靠阶段映射时 stage 为 unknown，不把淘汰赛或入围赛猜作瑞士轮。历史伤害/视野等缺失值保留 null。

## 更新与失败处理

- npm run import:stats：离线重建本届数据及历史合并；校验官方对阵、局数、系列赛胜负、十人行列、团队金币/击杀、重复 ID 和英雄资产后原子安装，失败回滚。
- npm run sync:stats：正常浏览器读取上述固定公开索引，只抓新增单局，不访问登录后接口，不绕过挑战。成功后调用同一导入器；失败保留上次成功数据并写工作流摘要。
- 每小时第 17 分钟的既有工作流先同步官方赛程，再同步新单局，最后统一检查、提交和构建发布。无变化不重复部署。录像播放验证不会随数据采集自动变成通过。
- 历史文件为此次核验的静态补录，未来需要重新核验后更新，不能因自动采集失败清空。

## 尚存边界

未开始的比赛没有实际 BP 或选手表现。历史覆盖不含 2013 年以前记录，部分历史指标和阶段缺失。实际播放/地区验证仍沿用用户既有规则；未确认地区不能得到地区可用结论。
