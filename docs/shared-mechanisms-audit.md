# 三场景机制一致性审计

审计基线：`/tmp/skiff-species-unification`，提交 `9aba69955cab3c7bec639a8657d9fc7607d87a33`。2026-09-28。范围只含该提交的 Santa Cruz `pixel-*` 与 Pacifica／Half Moon Bay shore 代码；未检查共享主仓未发布 WIP。下列是基线结果，不代表后续修复仍存在。

P1 = 已获得成果丢失，应优先修；P2 = 明确玩家可见不一致；P3 = 设计／维护差异，需明确策略，不能仅因代码不同就合并。

## 本轮处理结果

已兼容并保留并行发布 `76b54c9` 的 Santa Cruz 10 倍时间。下方关于 5 倍时间的条目仅描述审计基线。

- 已完成：共享鱼种目录（稳定 speciesId、中英名、学名、旧名别名）、船钓与两处岸钓接入、共同鱼图与尺寸格式；新增红尾海鲫和条纹鲈图。未知物种不会因泛称误识别成已知种。
- 已完成：旧鱼获保留原重量、长度和收据；缺失长度标为未记录。新生成的加州大比目鱼使用同一物种体长／体重模型。
- 已完成：shore v4 存档新增持久 catchHistory，放流、交付、没收保留记录；当前鱼篓仍只含随身鱼。修复按实际 activeRod 显示竿名。
- 已完成：Santa Cruz 已钓起待留放鱼获刷新恢复；首次发现奖励迁移为 speciesId，catchId 收据防止重复发奖，未知种键统一大小写后保持稳定。
- 已完成：提取两种钓法相同的天然饵／软饵损耗规则和可用阈值，岸钓采用共享单位格式与换算；数值不变。
- 后续适合统一：用户声音设置、时间／暂停合同、钓组规格呈现、存档校验与鱼获生命周期接口。另确认 SC 既有 createProfile 会与传入对象共用 rodSupplies 引用，后续存档接口应隔离嵌套对象；本轮不是此问题的引入点。
- 需要独立设计：跨场景钱包／装备迁移、放流奖励／价格平衡、日历倍率、各地法规覆盖。保留场景鱼群、生境、潮沟和船漂等本地差异。

## 已确认的问题（修复前基线）

1. **P1：Santa Cruz 刷新会丢掉已经上岸、尚未留放的鱼。** `dist/pixel-sim.js:123` 在 `start(true)` 恢复时无条件设 `fishState:'idle', fish:null`；`snapshot():371` 虽保存完整 state，但恢复抹掉 pending fish。岸钓 `dist/pacifica-sim.js:447,489` 特意保存／恢复 `pendingCatch`。独立内存探针复现 SC `landed → idle/null`，同一阶段 shore 仍为 `landed`。应共享“进行中的抛投可安全收回；已完成搏鱼的待决定鱼必须保留”的恢复语义。不可把它与中途搏鱼是否恢复混为一谈。

2. **P2：同鱼异名、身份字段分裂。** SC `dist/pixel-sim.js:47` 是“加州大比目鱼”＋`Paralichthys californicus`；shore `dist/pacifica-sim.js:14` 是“加州比目鱼”＋`id:'halibut'`，无学名。SC `pixel-fish-names.js:5` 从法规目录取得英文；shore 独立硬编码 `nameEn`。当前共有的明确物种是 California halibut，不能把两个场景不同鱼种强行合并。应共享 canonical speciesId、中文、英文、学名、旧名别名；生境、出鱼权重与当地候选清单仍分场景。

3. **P2：两条岸钓鱼都画成 unknown；同一比目鱼大小展示也不一致。** `dist/pacifica-menus.js:28-44` 仅 halibut 选专用图，其余红尾海鲫／条纹鲈均选 `unknown`，再将鱼图放大适配卡片。SC `dist/pixel-fish-art.js:27,59` 按身份选图、按厘米长度画共同测量板。shore 没有 `length`，不能靠重量随意造尺长，也不能把所有鱼画成同等大小。应共用身份到图像映射与未测量状态，新增合适物种图；有长度记录才画尺度。

4. **P2：“记录并放流”在 shore 没有逐条记录；交付／没收会抹掉历史。** `dist/pacifica-sim.js:314-322` 放流仅加计数和临时 `lastCatch`，`snapshot():443-450` 不保存 lastCatch；`sellCatch():347-354` 与 `checkPier():225` 清空 `s.catches`；`pacifica-menus.js:106-110` 只列当前鱼篓。SC `pixel-sim.js:343,356,490` 保留 released／settled／confiscated 记录。内存探针确认 shore 放流后 `released=1`、历史为空，刷新也无鱼种记录。应新增独立持久 history／ledger，保留 `catches` 的当前鱼篓语义和容量检查；只改展示不能恢复已经丢失的旧数据。

5. **P2：岸钓已购买长竿后，切回短竿仍显示长竿标题。** `dist/pacifica-game.js:102` 用 `upgrades.includes('surf_rod')` 决定 `active-rod-name`；下一行钓组标题和 `pacifica-sim.js:247` 抛距却用 `activeRod`。这是所有权冒充选中装备的直接 UI 错误，应按实际 activeRod 统一标题，不改升级效果。

6. **P2／策略：同名“记录并放流”带来不同积分结果；同鱼售价也不同。** SC `dist/equipment.js:71-72` 共用体重／长度奖励，首种额外 15 点；`pixel-sim.js:343` 放流立刻结算。shore `pacifica-sim.js:75,314-322` 留鱼按物种与重量固定公式、放流为 0。探针用 55 cm／1.8 kg 比目鱼得到 SC 首次 60、后续 45，shore 留鱼 55、放流 0；这是当前代码行为，**不等于要求本轮修改平衡**。`tests/pacifica-sim.test.js:100` 已明确测试“release earns no money”。应先统一玩家文案和记录合同；奖励政策由产品选择，不应借鱼名整理悄悄改掉。

7. **P2（迁移风险）：SC 首次物种奖励用中文名做键。** `dist/equipment.js:72` 的 `profile.seen.includes(fish.name)` 会把换名后的同物种当成新种，旧鱼获的 name 也直接保存在存档中。统一显示名时应迁移／兼容 `seen` 的旧名，后续改用 speciesId；捕获和结算的唯一键仍必须是 catchId，不能换名后重新发奖。

8. **P3：时间、设置与进度目前是独立玩法。** SC `pixel-sim.js:37,381` 为 5 倍游戏时间，有日期、每日天气及 18:00 收船；shore `pacifica-game.js:101` 的 `elapsed/30` 为 2 倍，24 小时循环但没有日期，天气标签始终晨雾（:104）。60 秒现实时间分别走 5 分钟／2 分钟。SC `pixel-audio.js:95-97` 保存音量／开关，shore `pacifica-game.js:21,49` 声音开关只在内存。时钟单位、暂停和用户设置适合共享；是否共享日历应明确，不能把租船的 18:00 强制拖回逻辑套在海滩。场景天气参数、声景可以各异。

## 应共享，但不得盲目套用的部分

| 机制 | 现状与建议 |
| --- | --- |
| 单位／尺寸 | SC `units.js` 明确内部 SI，UI in／lb／ft；shore 重复 `2.20462`、`3.28084`，目前并非把 kg 当 lb 的数量级错误。统一格式化与缺失标记。SC `kg`、shore `weightKg` 通过适配兼容；长度保存数值＋total/fork 类型。不能用通用比例把缺失长度补齐。SC `pixel-fish-mass.js` 的物种关系可用于有证据的**新生成**鱼，不重算旧存档已显示的重量。 |
| 鱼篓和结算 | SC 按冷藏箱 8／18 kg；shore 固定 20 尾。容器容量可以不同，但 UI 应明确容器限制。共同的规则是：留鱼进入载荷、放流不占容量、一次 catchId 只结算一次、交付／没收仅改变状态而不删除履历、欠款扣除有清楚 gross/net。 |
| 检查 | SC `pixel-sim.js:345-359,481-499` 有逐鱼规则、海上／返港检查、100 点每违规鱼与整批没收；shore `pacifica-sim.js:9,215-232` 只有封闭 pier 越栏巡查（80 点）与整批没收。可共享报告组件（现已复用 `pixel-inspection-report.js`）、证据／扣款／没收合同和幂等性；**触发条件、金额、法规地理覆盖不能统一成同一套**。 |
| 法规边界 | 当前 `fishing-regulations.js:21-29` 标明 Santa Cruz 2026 快照、北界 37°11′；Pacifica／HMB 位于代码覆盖范围之外。shore 又缺捕获日期、GPS、长度、钩型等证据。统一鱼名后直接调用 SC 检查器会产生 unsupported；不能将 unsupported 当合法，也不能猜新违规。此处只是审计代码的覆盖范围，不是核验现实法规。 |
| 装备／耗材 | 已基本同义：换新饵消耗一份、空收保留余饵、整套换组保留旧损耗、断线失整组、每竿独立余饵。`shore-equipment.js:46-49` 与 `pixel-consumables.js:58-65` 天然饵损耗一致（bite .15、catch 1、escape .28，鱼获后组磨损 .025），适合共享小型规则／schema。船竿／沙滩竿、纺车／绕线轮、配重和船用装备保持差异。 |
| 同名钓组 | SC `fishing-rigs.js:32` 滑铅为 3/0 circle，shore `shore-equipment.js:16` 为 2/0，价格也不同。这可以是规格差异，不应仅因“滑铅钓组”同名就认为两套物品完全相同。应共享钓组类型＋明确规格、单位与图标，而不是强制等价所有 id。 |
| 咬口／搏鱼 | SC 用钩型、受力、鱼体质量和线物理；shore 为 3.2 秒扬竿窗、张力 0–1、run/stamina 模型。SC tension 为 0–100，鱼重为 kg；shore 为 0–1、weightKg。共享 HUD／反馈必须做适配，不能直接互传字段。鱼种身份和基本特征应共享，潮沟、船漂、局部鱼讯权重保留；把两套引擎合一超出鱼资料一致性的必要范围。 |
| 存档／地点切换 | `pixel-game.js:33`、`shore-data.js:27,40` 使用三个独立 key；`pixel-locations.js:1-2,101-105` 明确每场景独立旅程，pagehide 保存，菜单暂停；当前钱包、装备、鱼篓并不跨场景。应共享版本迁移、校验、pending catch 保障及暂停合同；不要未定义迁移就合并钱包／债务／装备，否则可能复制鱼获和奖励。 |

## 验证与修复顺序

- 本轮只读代码，并用内存构造的存档复现 pending catch 恢复及 shore 放流记录丢失；未改游戏文件，未整套重跑测试。基线工作区当时 clean。
- 建议本轮优先：canonical identity／兼容旧名 → 共同鱼图与度量 UI → shore 持久历史 → activeRod 标题 → pending landed 恢复。保存／结算必须保持幂等。
- 积分、跨场景钱包、时钟倍率和完整法规引擎应独立处理；本审计不会把平衡差异冒充程序故障，也不要求为了共享而重写两种钓鱼模拟。
