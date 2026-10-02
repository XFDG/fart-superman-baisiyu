# GitHub 现有游戏调研：放屁超人白思雨

调研日期：2026-10-02。结论：有可复用的网页游戏和跨端模板；本次未找到已经具备四种屁和“浩然杯”的成品。建议先在“横版闯关”和“跑酷”之间选择。

## 范围与方法

通过网页搜索发现候选，再用 GitHub 官方 REST API 核实仓库、README、许可证及部分依赖声明。深入比较 10 个仓库，其中 8 个游戏、2 个开发模板。未安装依赖、编译或实际试玩，因此下文的设备适配以项目说明和有限源码核查为依据，不能视为真机验证。

GitHub 仓库搜索结果：

| 检索条件 | 返回数量 |
| --- | ---: |
| `fart game language:JavaScript` | 28 |
| `fart game language:TypeScript` | 6 |
| `phaser platformer touch` | 12 |
| `html5 platformer mobile` | 338 |

这些是查询匹配数，不是可复用游戏数，也不能相加作为游戏总数。比如 penny-farthing 和“cross-platform”应用会被误命中。详见 [检索快照](research/search-results.json)。

## 候选对比

星数和推送时间取自实时 API；“最后推送”不是游戏质量或持续维护的证明。改造难度为本次工程判断。

| 项目 | 类型与可借鉴部分 | 手机/电脑证据 | 许可核查 | Stars | 最后推送 UTC | 改造判断 |
| --- | --- | --- | --- | ---: | --- | --- |
| [Captain Gastronaut](https://github.com/niksudan/captain-gastronaut) | 放屁推进、蓄力起飞，主题最接近 | README 描述方向键；手机操作未证实 | package.json 声明 ISC；未发现独立许可正文，素材授权未明确 | 4 | 2019-03-06 | 玩法参考；旧 Matter.js/TS/Webpack，不能直接认定全项目可复用 |
| [Fart Flyer](https://github.com/christmastodd-dot/fart-flyer) | 放屁飞行题材候选 | 未证实 | 未发现明确许可证 | 0 | 2026-03-25 | 无根目录 README，分 milestone；暂不选作底座 |
| [FartAndFurious](https://github.com/squirelo/FartAndFurious) | 放屁题材装置项目 | 根目录有串口/舵机文件，网页适配未证实 | 未发现明确许可证 | 1 | 2022-05-19 | 结构偏硬件装置，不适合作网页底座 |
| [Sprout Runner](https://github.com/carlomigueldy/sprout-runner) | 横版闯关：平台、敌人、金币、终点、胜利页面 | README 声明键盘和触控；index.html 有 pointer 事件 | README 声明 MIT；API 未识别独立许可证，源码中未找到许可正文 | 0 | 2026-07-08 | 功能适合改成超级英雄闯关；单 HTML 需拆分，复用前补核实许可 |
| [Cat Jump](https://github.com/jpdf00/phaser3-plataformer) | 无限平台跑酷、二段跳、前十排行榜 | README 描述鼠标点击；手机布局和触控需验证 | MIT 正文；猫等素材另有署名/许可要求 | 7 | 2021-05-27 | 可把二段跳改成喷屁推进；旧依赖和排行榜服务需排查 |
| [EndlessRunnerGame](https://github.com/MightyMike28/EndlessRunnerGame) | 三跑道避障、计分、难度递增、重开 | 明确电脑键盘、手机左右触控、竖屏布局 | MIT 正文 | 0 | 2026-08-25 | 跑酷方案优先候选；须新增屁技能和有限获奖目标 |
| [phaser3-platformer](https://github.com/dickinsonmr1/phaser3-platformer) | Phaser 3 + TypeScript 平台跳跃示例 | HTML5；手机触控未证实 | MIT 正文 | 7 | 2022-01-01 | 平台、地图和碰撞参考；旧构建，素材来源需逐项核查 |
| [fartnoises](https://github.com/metheos/fartnoises) | 放屁/声音派对，主屏+玩家控制端，实时多人 | README 支持手机/平板/电脑控制端；并非独立动作游戏 | 正文明示 CC BY-NC-SA 4.0；API 仅识别为 Other | 0 | 2025-08-01 | 需服务器；玩法和商业复用限制均不适合当前首版 |
| [phaser-game-template](https://github.com/mauricekastelijn/phaser-game-template) | Phaser 3.90 + TS + Vite 基础工程、存档、场景、Pages 部署 | README 明确移动缩放、键盘+触控；仍需真机验证 | MIT 正文 | 0 | 2026-04-04 | 新写横版闯关的优先底座；已有功能少于成品游戏 |
| [官方 template-vite](https://github.com/phaserjs/template-vite) | 官方 Phaser + Vite 工程模板 | 网页模板；具体触控需增加或验证 | MIT 正文；品牌/示例素材另需核查 | 138 | 2026-04-29 | 官方工程参考；当前 package.json 是 Phaser 4.0.0，不要因仓库简介写 Phaser 3 就混用 API |

## 统计

- 10 个候选：8 个游戏、2 个模板。
- 5 个有可核查的 MIT 许可正文：Cat Jump、EndlessRunnerGame、phaser3-platformer、phaser-game-template、官方 template-vite。
- 1 个仅 README 声明 MIT：Sprout Runner。
- 1 个仅 package.json 声明 ISC：Captain Gastronaut。
- 2 个未发现明确许可证：Fart Flyer、FartAndFurious。
- 1 个正文为 CC BY-NC-SA 4.0：fartnoises，不宜作为未来商业版本底座。
- 3 个明确描述直接网页键盘+触控：Sprout Runner、EndlessRunnerGame、phaser-game-template。fartnoises 另支持手机控制端，不能当作同一类动作游戏适配。
- 0 个被本次实际试玩或真机验证；0 个被证实已有所要求的完整四屁系统和浩然杯。

MIT 代码许可不自动覆盖第三方图片、角色、音效。后续复用要保留原版权和许可声明，逐项核查资源；模板 README 中“替换许可证”的建议不能用来删除被复用代码的原始声明。

## 推荐路线

### 路线 A：横版闯关，优先建议

以 phaser-game-template 为工程起点，设计原创白思雨角色、敌人和四种屁技能。借鉴 Sprout Runner 的跳跃、战斗、终点和胜利结算结构；若未来想直接复制其实现，先核实许可正文。

理由：四种屁可以承担不同任务，有限关卡与最后获得浩然杯也容易衔接。电脑键盘与手机虚拟按键共享游戏逻辑。比“换个角色就完成”需要更多开发，但便于持续扩展。

### 路线 B：跑酷，较快形成可玩版本

优先核验 EndlessRunnerGame，把跑道、障碍、计分和重开系统复用为基础，再增加四色屁技能。原项目无限跑酷没有最终终点，需要补充“完成若干挑战/达到指定目标 → 浩然杯”。

如果希望喷屁飞起来，Cat Jump 的二段跳玩法也值得参考，但要先替换角色素材并检查旧依赖与排行榜服务。

### 仅作为玩法参考

Captain Gastronaut 的蓄力放屁推进最贴题，但其 package.json 的 ISC 声明不足以说明全部美术和音效授权。fartnoises 则是另一种声音派对玩法，并非当前推荐方向。

## 用户要求与待定设计

| 项目 | 已确定 | 可讨论的建议，尚未定案 |
| --- | --- | --- |
| 主角 | 放屁超人白思雨 | 卡通英雄造型 |
| 黄屁 | 必须有 | 短距离冲击/击退 |
| 绿屁 | 必须有 | 留下持续臭雾区域 |
| 普通的臭屁 | 必须有 | 默认攻击或基础推进；颜色待定 |
| 粉色的香屁 | 必须有 | 恢复、安抚敌人或净化区域 |
| 最终奖杯 | 浩然杯 | 关卡通关或挑战完成后颁发 |
| 设备 | 手机、电脑；电脑网页版 | 手机首版浏览器运行；是否另做 App 待定 |

这些技能仅是可行性示例，不是用户已经确认的功能定义。首版玩法、美术、关卡数量、横竖屏以及浩然杯条件尚未选定。

## 已做与未做

已建立独立项目目录、调研报告、CSV、API 快照和出处资料，准备同步私有 GitHub 仓库。本轮没有下载并整合第三方游戏源码，没有开发游戏，也没有部署游戏网页。

下一阶段先核验入选项目在电脑和手机浏览器的实际体验与依赖可用性，再确定玩法并开始实现。
