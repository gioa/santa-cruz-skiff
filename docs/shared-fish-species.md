# 场景鱼种身份与命名核查

核查日：2026-09-28。只读检查 `/tmp/skiff-species-unification/dist/` 的 `pixel-fish-names.js`、`pixel-fish-ecology.js`、`pacifica-sim.js`，并追溯实际名录 `pixel-sim.js`、`fishing-regulations.js`、`pixel-fish-art.js`、`fishing-rigs.js`。本文件不修改实现，也不核定捕捞法规、咬口概率或长度体重分布。

结论：现有 Santa Cruz 的 11 种主体鱼英文／学名映射未发现明显错配；岸钓的 California halibut 与船钓相同。主要需要消除中文主名差异、岸钓缺少学名与稳定身份、通用旧 ID／俗名误合并风险。**Redtail surfperch 和 barred surfperch 是不同物种，不能为了统一名称而互换。**

## 推荐对应表

中文主名首先保留游戏中已经可辨识的名称；除明确注明外，本表不声称它是官方中文标准名。英文与学名采用下列官方名录／分类数据库核查。`legacy` 仅表示当前程序旧键，不能据此将其他同组鱼合并。

| 推荐稳定 ID | 当前 legacy 键 | 统一中文展示建议 | 英文俗名 | 学名／身份 | 证据 |
|---|---|---|---|---|---|
| `california_halibut` | `halibut` | **加州大比目鱼** | California halibut | *Paralichthys californicus* | [CDFW 海滩鱼类图鉴，第 2 页](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=35252)、[OEHHA 物种页](https://oehha.ca.gov/fish/species/california-halibut) |
| `redtail_surfperch` | 岸钓 `surfperch` | **红尾海鲫**（沿用，未证实为官方中文译名） | Redtail surfperch | *Amphistichus rhodoterus* | [CDFW 图鉴，第 2 页](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=35252) |
| `barred_surfperch` | 当前未独立实现 | 银双齿海鲫（未来若新增；OEHHA 译名） | Barred surfperch | *Amphistichus argenteus*，与 redtail 不同 | [CDFW 图鉴，第 2 页](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=35252)、[OEHHA 繁中双语图](https://oehha.ca.gov/sites/default/files/media/2025-01/fishadvisorysfbayposter2023-chinesetraditional_0.pdf) |
| `striped_bass` | `striped_bass` | **条纹鲈** | Striped bass | *Morone saxatilis* | [CDFW 图鉴，第 2 页](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=35252)、[OEHHA 简中双语图](https://oehha.ca.gov/media/downloads/advisories/fishadvisorycentralsouthdeltaposter2022chinesesimplified.pdf) |
| `blue_rockfish` | `blue` | 蓝岩鱼 | Blue rockfish | *Sebastes mystinus* | [CDFW 物种及学名记录表](https://wildlife.ca.gov/Fishing/Records) |
| `copper_rockfish` | `copper` | 铜岩鱼 | Copper rockfish | *Sebastes caurinus* | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records) |
| `vermilion_rockfish` | `vermilion` | 朱红岩鱼 | Vermilion rockfish | *Sebastes miniatus* | [CDFW 岩鱼名录](https://wildlife.ca.gov/Conservation/Marine/Groundfish/Nearshore-Shelf-And-Slope) |
| `pacific_mackerel` | `mackerel` | 太平洋鲭鱼 | Pacific mackerel；Pacific chub mackerel 同指本种 | *Scomber japonicus* | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records)、[NOAA 中加州物种表](https://www.fisheries.noaa.gov/inport/item/40244) |
| `lingcod` | `lingcod` | 长蛇齿单线鱼 | Lingcod | *Ophiodon elongatus* | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records) |
| `chinook_salmon` | `salmon` | 帝王鲑 | Chinook salmon；King salmon 同指本种 | *Oncorhynchus tshawytscha* | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records) |
| `white_seabass` | `seabass` | 白海鲈 | White seabass | *Atractoscion nobilis* | [NOAA 中加州物种表](https://www.fisheries.noaa.gov/inport/item/40244) |
| `pacific_bonito` | `bonito` | 太平洋狐鲣 | Pacific bonito | 物种层 *Sarda chiliensis*；既有 *S. chiliensis lineolata* 是北部亚种写法，见下文 | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records)、[ITIS 亚种条目](https://itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=613015) |
| `white_croaker` | `croaker` | 白石首鱼 | White croaker | *Genyonemus lineatus* | [OEHHA 物种页](https://oehha.ca.gov/fish/species/white-croaker) |
| `pacific_sanddab` | `sanddab` | 太平洋沙鲽 | Pacific sanddab | *Citharichthys sordidus* | [NOAA 物种照片名录](https://www.fisheries.noaa.gov/alaska/habitat-conservation/nearshore-fish-photos) |
| `northern_anchovy` | `anchovy` | 北方鳀鱼 | Northern anchovy | *Engraulis mordax* | [NOAA 中加州物种表](https://www.fisheries.noaa.gov/inport/item/40244) |
| `pacific_sardine` | `sardine` | 太平洋沙丁鱼 | Pacific sardine | *Sardinops sagax* | [NOAA 中加州物种表](https://www.fisheries.noaa.gov/inport/item/40244) |
| `black_rockfish` | 图像键 `rockfish` | 黑岩鱼 | Black rockfish | *Sebastes melanops*；不能把所有 rockfish 认作此种 | [CDFW 记录表](https://wildlife.ca.gov/Fishing/Records) |

法规名录还出现的五种岩鱼，英文／学名也无明显错配：Sunset rockfish＝*Sebastes crocotulus*；Yelloweye rockfish＝*S. ruberrimus*；Quillback rockfish＝*S. maliger*；Cowcod＝*S. levis*；Bronzespotted rockfish＝*S. gilli*。它们必须保留独立身份，尤其 sunset 不能作为 vermilion 的名称别名；共享法规袋限也不代表同种。[CDFW 岩鱼名录](https://wildlife.ca.gov/Conservation/Marine/Groundfish/Nearshore-Shelf-And-Slope)

## 必须保留的区别

1. **California halibut 名称差异不是错种。** Santa Cruz 的“加州大比目鱼”和岸钓的“加州比目鱼”应指向同一个 canonical ID。OEHHA 官方中文资料同时存在“加州大比目鱼”和“加州牙鲆”，可作为带来源别名；建议为兼容保留前者作展示名。它不等于 Pacific halibut（*Hippoglossus stenolepis*）。[OEHHA 旧金山湾简中图](https://oehha.ca.gov/sites/default/files/media/downloads/advisories/sfbayposter031218-chinesesimp.pdf)、[OEHHA Ventura 简中双语图](https://oehha.ca.gov/sites/default/files/media/downloads/advisories/fishadvisoryventuraharborsantamonicapierposterchinesesimplified2023.pdf)、[NOAA Pacific halibut 等物种表](https://www.fisheries.noaa.gov/inport/item/55726)
2. **旧 `surfperch` 只可在本游戏既有存档上下文迁移为 redtail。** 当前 `pacifica-sim.js` 的英文明确是 Redtail surfperch，中文也对应红尾，未发现已经写成 barred 的证据。泛称“surfperch／海鲫”不能作为全球别名直接指向 redtail。官方图鉴同时列出两种；Barred 学名中的 `argenteus` 也不能误配到 Walleye surfperch 的 *Hyperprosopon argenteum*。[CDFW 第 2 页](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=35252)
3. **中文俗名不能承担身份键。** “白鲈”容易与 White bass（*Morone chrysops*）混淆，应展示“白海鲈 · White seabass”。OEHHA 把 White croaker 译作“白姑鱼”，但保留现有“白石首鱼”同样可以；不得仅凭“白姑鱼／石斑鱼／鲭鱼／鲣”等泛名推断全球物种。[CDFW White bass 对照](https://wildlife.ca.gov/Fishing/Records)、[OEHHA 中文双语图](https://oehha.ca.gov/sites/default/files/media/downloads/advisories/fishadvisoryventuraharborsantamonicapierposterchinesesimplified2023.pdf)
4. **Bonito 不是本轮需要纠正的错种。** ITIS 将 *Sarda chiliensis lineolata* 列为 valid subspecies；CAS 2026-08-13 版将 `lineolata` 放在 *Sarda chiliensis* 之下，并说明北部亚种分布。建议保留旧完整学名兼容，增加物种层名称；不要未经版本说明强制“升级”为 *Sarda lineolata*。[ITIS](https://itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=613015)、[CAS lineolata 条目](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=44323)、[CAS chiliensis 条目](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=19217)

## 对共享 registry 的最小接入建议

- 各场景使用同一个 `speciesId`、中文主名、英文主名、学名；`blue/halibut/surfperch` 等旧键仅作明确的兼容映射。生态权重键、图像键、法规键保留独立字段，不能反过来定义物种。
- `fishCommonName()` 当前依赖法规名录；该名录未收录 redtail／striped bass，且函数不读取岸钓的 `nameEn`，因此共享显示路径会漏英文。这是数据覆盖问题，不是两种鱼没有英文名。
- `pacifica-sim.js` 的 `SPECIES`／`safeFish()` 当前没有持久学名字段；渔获恢复应通过稳定 registry 重建展示字段，不依据原始存档中文名重新猜种。
- `rigSpeciesKey()` 的 `halibut`、`mackerel`、`salmon` 等正则，以及法规识别同时扫多个旧字段的方式，会在增加 Pacific halibut／Jack mackerel／Coho 时过度合并。先精确匹配明确 `speciesId` 或完整学名，冲突时不要让较模糊的中文旧名覆盖它。

来源访问说明：以上网页／数据库均于 2026-09-28 检索。CDFW Marine Species Portal 的部分正文访问出现 502／超时，因此主要身份结论使用可访问的 CDFW PDF、记录表、NOAA、OEHHA 与 ITIS/CAS 交叉确认。2023 OEHHA 繁中海报的全文提取因文件过大失败，但官方索引返回了双语名称；“银双齿海鲫”仅是未来名称参考，当前实现不依赖它。本报告引用食用指南仅用于中英名称对照，不转用旧版健康建议。

## 实现边界

- `fish-species.js` 是三处可玩场景及旧 3D 版本的统一身份来源。展示、鱼图、鱼体质量、钓组鱼种分类和法规身份查询均从稳定 ID 解析。
- `speciesId`／学名与旧展示名冲突时优先明确身份；未知的明确学名不会靠一个泛称强行归入已知鱼种。旧岸钓 `id:surfperch` 可迁移，单独泛称 surfperch 不指认物种。
- `pixel-fish-mass.js` 已有的加州比目鱼模型供两场景使用。新岸钓比目鱼由同一单调曲线生成长度；旧存档没有长度时保留“未记录”，不补造测量记录。其他两种岸钓鱼尚无经过核查的长度质量模型，本轮不套用通用关系。
- 鱼图共享识别和测量板；新添红尾海鲫／条纹鲈专用像素图。有长度才显示尺，历史缺失长度使用无标尺肖像。
- 场景的物种池、遇鱼权重和体型分布仍是当地玩法参数，不是生物身份。现有售价、放流积分、钱包与法规地理覆盖没有因统一资料而改变。

## 2026-09-29 补充：岸钓海鲫扩充

本轮在岸钓加入 barred surfperch 与另外六种海鲫，均在共享名录 `dist/fish-species.js` 中有独立 ID 与学名。中文名除银双齿海鲫（OEHHA 译名）外为本游戏编辑用名，不声称官方译名。

| 稳定 ID | 岸钓 ID | 中文展示 | 英文 | 学名 |
|---|---|---|---|---|
| `barred_surfperch` | `surfperch`（新渔获带 `speciesId`） | 银双齿海鲫 | Barred surfperch | *Amphistichus argenteus* |
| `calico_surfperch` | 同 ID | 斑纹海鲫 | Calico surfperch | *Amphistichus koelzi* |
| `silver_surfperch` | 同 ID | 银海鲫 | Silver surfperch | *Hyperprosopon ellipticum* |
| `walleye_surfperch` | 同 ID | 大眼海鲫 | Walleye surfperch | *Hyperprosopon argenteum* |
| `shiner_perch` | 同 ID | 小银海鲫 | Shiner perch | *Cymatogaster aggregata* |
| `pile_perch` | 同 ID | 桩海鲫 | Pile perch | *Rhacochilus vacca* |
| `striped_seaperch` | 同 ID | 条纹海鲫 | Striped seaperch | *Embiotoca lateralis* |

旧存档中没有 `speciesId` 的岸钓 `surfperch` 仍按上文第 2 条迁移为 redtail。新渔获带明确的 `speciesId`，不会再与 redtail 混淆。Barred 的 `argenteus` 与 walleye 的 *Hyperprosopon argenteum* 仍是两个物种。习性与法规依据见 [岸钓生态证据](shore-ecology-evidence.md)。
