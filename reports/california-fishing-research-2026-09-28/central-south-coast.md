# 中、南加州海岸钓场研究档案

研究日期 / 来源访问日期：**2026-09-28**。用途：后续游戏场景选型、地形与生态建模；本次仅建档，没有实现或修改游戏。范围为 7 个候选区域，排除现有 Santa Cruz 场景。

下文坐标是**地图检索锚点**，可能是监测站、气象预报点或已明确命名的地理边界点；不是钓位、航点、航线或可进入许可。环境资料证明“当地存在某种鱼”，不等于证明某个点、月份或钓法的上钩率。将证据区分为：**强**＝当地官方调查/机构明确记录；**中**＝邻近栖地或区域资料；**待补**＝尚不足以写入鱼种概率表。物种“生态旺季”和“2026 法定开放期”必须分开保存。

## 共同使用的数据及规则底座

- **法规时效**：Monterey/Moss Landing、Morro Bay 对照 [CDFW Central Region](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/Central)；Channel Islands、Catalina、Redondo、San Diego、La Jolla 对照 [CDFW Southern Region](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/Southern)。当地 MPA 规则、鱼种规则、岸/船方式、深度线、日期需要同时满足。主页面的“开放”图标不足以证明所有船钓深度皆开放，groundfish 必须继续读取页面链接的当年分区表。
- **已核实的当期特殊状态**：Central 页面标注 2026-09-11 更新：Monterey Bay（Pigeon Point 至 Point Lobos）的 northern anchovy 因 domoic acid 禁止休闲捕捞作人类食用，休闲渔获仅可用作饵。这个例子适合存成带生效日期的事件；不能变成永久鱼种设定。
- **MPA 空间层**：[CDFW 官方互动地图](https://filelib.wildlife.ca.gov/Public/ITB/NRM/MPAMap/mpa_map.html)及 [ds582 元数据](https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/DS0582.html)用于获取空间边界；各场景下列的 CDFW 地点页面含地图、坐标和对应 CCR §632 条款。法规原文优先于示意图。National Marine Sanctuary 并非整片禁止捕鱼，亦不能据此推断其中每个 MPA 都可钓。
- **测深**：[NOAA Bathymetric Data Viewer](https://www.ncei.noaa.gov/maps/bathymetry/)可定位 NOS、多波束和相关调查；[NOAA Hydrographic Survey Data](https://www.nauticalcharts.noaa.gov/data/hydrographic-survey-data.html)提供数据入口；[NCEI 西海岸旧测深/渔业图](https://www.ngdc.noaa.gov/mgg/bathymetry/maps/area4.html)适合地形识别，不可把历史等深线当作当下港口通航水深。
- **潮流与波浪**：NOAA 潮位站仅给潮位，不能直接当钓线漂流速度。先检查 [CO-OPS Metadata API](https://api.tidesandcurrents.noaa.gov/mdapi/prod/) 的站点类型和数据时段，再区分潮位、流速观测/预报、风浪浮标。所有 DEM 需要记录水平坐标系、垂直基准、分辨率和调查年；潮位 MLLW 与陆地 NAVD88 不可直接拼接。
- **美术授权**：官方网页照片也可能标注第三方 CC BY-NC / ND，而不是公共领域。照片可作研究参照；用于游戏前逐图登记摄影者和授权。下列 USGS 数据发布中明确 CC0 的产品优先。

<a id="moss-landing-canyon"></a>

## 1. Monterey Bay 东岸：Moss Landing—Monterey Canyon 入口

**地理及方式。** 锚点为 Moss Landing South Harbor 监测站 MLSC1：**36.802°N, 121.791°W**，来自 [NOAA NDBC 的 2026 数据元数据](https://dods.ndbc.noaa.gov/thredds/dodsC/data/stdmet/mlsc1/mlsc1h2026.nc.html)。场景应分为 Jetty Road 一带海滩岸钓、港池/河口边界、由 North Harbor 出港的近海船钓。不是把 Santa Cruz 的海面平移后改名。

**真实地形。** 核心是“沙丘与开放海滩—港口狭口—极近岸峡谷头—陆架/陡坡”的连续变化。MBARI 记录峡谷从 Moss Landing 外海近岸沟槽开始，沿岸输沙汇入峡谷头；底部并非处处岩礁。用沙底陆架、峡谷边缘和港池人工结构分区，峡谷内部的深水生态不要直接套在岸边抛竿距离内。[MBARI：Monterey Canyon](https://www.mbari.org/know-your-ocean/monterey-canyon/)、[沿岸沙进入峡谷的过程](https://www.mbari.org/news/following-the-trail-of-sand-in-monterey-canyon/)。

**鱼种证据。** 强：Elkhorn Slough 当地有 bat ray、leopard shark、topsmelt、flatfishes，适合河口生态背景；并非海滩鱼种频率。中：NOAA Monterey Bay 栖地报告列出陆架软底的 sole、halibut、flounder、sanddab，及 rockfish 渔业；需补峡谷边缘/外沙洲实际样点，才能给各 rockfish 精确概率。[CDFW Elkhorn Slough](https://wildlife.ca.gov/Conservation/Marine/MPAs/Elkhorn-Slough)、[NOAA 环境与栖地报告](https://sanctuaries.noaa.gov/science/condition/mbnms/history.html)、[NOAA 渔业压力记录](https://sanctuaries.noaa.gov/science/condition/mbnms/pressures.html)。

**生态季节与法定季节。** 冬季风暴会搬运沿岸沙，不应永远保留同一排 trough；近岸内部潮汐与峡谷地形关联，可作为冷水/生产力变化依据，但不支持固定“满潮必咬”。合法开放期单独读取 Central 当年表，尤其 salmon、groundfish 及上述 2026 anchovy 特别限制。[MBARI 峡谷水流研究](https://www.mbari.org/news/canyons-currents-and-algal-blooms-how-monterey-canyon-influences-the-growth-of-microscopic-marine-algae/)。

**入口、设施与现况。** North Harbor 有四线 public launch ramp；港区首页访问时明确写着对公众开放。Moss Landing State Beach 的入口在 Jetty Road，官方提醒强离岸流、冷水和陡降底形；沙丘内还有雪鸻保护围挡。不要把研究保留地步道当作岸钓入口。设施可建立实际 ramp、码头和商业渔港轮廓；本轮没有确认当前具体 bait shop，不能编造店名。2026-08-30 NOAA 记录 ramp 附近沉船漏油事件，属于需复核是否已清理的时效信息，不能据此宣称整个港仍关闭。[港口 launch ramp](https://mosslandingharbor.dst.ca.us/launch-ramp)、[港口当前首页](https://mosslandingharbor.dst.ca.us/)、[State Beach](https://www.parks.ca.gov/?page_id=574)、[NOAA 事故记录](https://incidentnews.noaa.gov/incident/11212)。

**保护区。** Elkhorn Slough SMR 不可采捕；相邻 SMCA 允许 finfish 的 hook-and-line 等列明例外；Elkhorn Slough Ecological Reserve 的陆地访问规则另行约束，不能把 SMCA 例外扩展到 Reserve 全域。用上面的 CDFW 地图划边，港口、海滩和 slough 分成独立空间规则区。[CDFW Moss Landing Wildlife Area 的访问规则](https://wildlife.ca.gov/Lands/Places-to-Visit/Moss-Landing-WA)。

**建模资料与差异（推断）。** 用 MBARI 峡谷图/论文、NOAA 实测资料、State Parks 沙丘照片和 CDFW 盐沼图。可做同一地图内“沙滩岸钓—浅河口—大深度船钓”切换；悬崖式深度变化影响沉底等待、线角与回收时间。**缺口**：目标小范围最新近岸 DEM、港口测深日期、准确沙色/粒径、海滩剖面季节复测、合法岸入口坐标、当地鱼群月度 CPUE。资料未补齐前，不拟合每个小沟的真实位置。

<a id="morro-bay-estuary"></a>

## 2. Morro Bay：火山岩地标、沙嘴与浅潟湖

**地理及方式。** 地图检索锚点使用 NWS Morro Bay 点预报的 **35.36°N, 120.85°W**（城市/气象点，不是 launch ramp）。[NWS 官方点位](https://forecast.weather.gov/MapClick.php?textField1=35.3658&textField2=-120.849)。适合港边岸钓、浅湾 kayak/skiff，及经过港口狭口到外海的船钓三层玩法。

**地形与鱼种。** Morro Rock、其南侧长沙嘴、受保护浅湾、潮滩和 eelgrass 应成为视觉及底质主体。CDFW 直接列出 topsmelt、shiner perch、Pacific staghorn sculpin、bay pipefish，以及浅滩 bat ray；这是强当地生态证据，后两类可作为生态而非默认目标鱼。港口登陆 halibut、sole、rockfish、albacore 证明渔港船队渔业关联，**不证明这些鱼全都在湾内**。上述地形、物种和规则见 [CDFW Morro Bay 专页](https://wildlife.ca.gov/Conservation/Marine/MPAs/Morro-Bay)。

**季节、潮流、外海。** 湾内浅滩露出/淹没应跟潮位；海草床提供阻力，不能与航道流速相同。生态层可表现冬季水鸟、季节海草和浑浊度，但本轮没有足够月度钓获证据支持“一月某鱼必多”。合法季节属于 Central 管理区。市港务报告记录冬季大涌使入口危险及浪越北防波堤，足以否定“湾内平静＝出港安全”的设定。[市港务关于大涌的记录](https://morrobayca.gov/ArchiveCenter/ViewFile/Item/7328)。

**实际入口/关闭状态。** Tidelands Park 是现有公共 trailer-boat launch 位置，Embarcadero 构成港边入口与设施轴线。**2026-05-06 已有 Boat Launch Ramp Repairs 项目公告**；公告仅证明修建项目，不证明 9 月当天关闭或已竣工，实施前必须查港务当日通告。[市 Harbor Department](https://morrobayca.gov/144/Harbor)、[2026 CEQAnet 公告](https://ceqanet.lci.ca.gov/2026050193)、[现有设施与维护规划](https://www.morrobayca.gov/Archive.aspx?ADID=5642)。官方资料可确认浮码头、洗鱼台、停车和厕所等设施；本轮不为具体饵店背书。

**MPA 精确差异。** Morro Bay SMR 不可采捕。SMRMA 不是全湾可钓：其内 **35°19.700′N 以北**才有休闲 finfish 例外；南部不可默认岸钓/船钓。见 CDFW 专页 Regulations、Coordinates 和互动地图。保护区经线边界与船可通过的水道也不是同一件事。

**视觉/测深。** [USGS Morro Bay bathymetry/backscatter/habitat 数据发布，v1.1 Jan 2024](https://www.usgs.gov/data/bathymetry-backscatter-intensity-and-benthic-habitat-offshore-morro-bay-california-ver-11)（DOI 10.5066/P9HEZNRO，CC0）；[USGS 栖地解释报告](https://pubs.usgs.gov/of/2023/1064/ofr20231064.pdf)有 sonar 与拖曳相机地面验证方法。注意这些是 offshore 产品，不能填成湾内沙槽。

**游戏差异（推断）与缺口。** 可以让玩家在受掩护湾内读潮滩，选择较重装备/合适天气后出港，Morro Rock 全程用于定位。缺湾内高分辨率泥沙面、维护疏浚后水深、当日 ramp 状态、岸钓码头清单与各自告示、海草时序和月度鱼种调查。岸钓入口尚未达到“可直接投产”的证据门槛。

<a id="channel-islands-anacapa"></a>

## 3. Channel Islands：Anacapa / Santa Cruz Island 与西侧冷水岛分开

**地理及方式。** 这里的 Santa Cruz **Island** 位于南加州群岛，不能与游戏已有 Santa Cruz 市混淆。第一期研究范围建议 Anacapa 与东 Santa Cruz Island；Santa Rosa / San Miguel 另列远程高暴露海况。检索锚点为 CDFW 明确命名的 Portuguese Rock：**34°00.910′N, 119°25.260′W**，它同时是特殊关闭区参考点，绝非可钓推荐点。[CDFW Anacapa](https://wildlife.ca.gov/Conservation/Marine/MPAs/Anacapa-Island)。船钓应占主体；岛上岸钓不能假设每个悬崖/沙湾都可随意登陆。

**地形与生态差异。** Anacapa 是串状三小岛，有火山岩海崖、海蚀洞/拱门、rocky reef、kelp 与外围沙底；当地 kelp bass、California sheephead、black perch 等有 CDFW 记录，证据强。不能把 SMR 内监测数量直接用作开放海域渔获率。NPS 指出 San Miguel/Santa Rosa 更受冷 California Current 影响；Anacapa、东 Santa Cruz、Santa Barbara 岛受到较暖水体影响，群岛不应共用一个水温和鱼种表。[NPS Currents and Upwelling](https://www.nps.gov/chis/learn/nature/currents-upwelling.htm)。

**季节与海况。** 西侧岛春夏上升流是有来源的生态驱动；NPS 明确季节及岛间天气不同。采用风向、岛影、海峡航段、涌向、短周期风浪分别采样；“夏季一定安全”或“背风面一直平静”均无依据。法定鱼期单独读 Southern 当年表，另叠州和联邦海域规则。[NPS Weather](https://home.nps.gov/chis/planyourvisit/weather.htm)。

**出航及补给。** Ventura Harbor / Channel Islands Harbor 是 NPS 列出的船运出发港；这里优先完成 Ventura 出航基地。官方港口记录 Public Launch Ramp 在 Anchors Way，MAVCCO fuel/bait 位于 ramp 附近，确有 fuel、ice、tackle、live/frozen bait 可作场景设施参考；不据此作消费推荐。[NPS Directions](https://home.nps.gov/chis/planyourvisit/directions.htm)、[Ventura 港停车/ramp 地址](https://venturaharbor.com/parking/)、[Ventura 港官方 Fuel Docks](https://venturaharbor.com/fuel-docks/)。Santa Barbara 出航港作为后续连接项，尚未核实其目标渔船、ramp 当前状态和跨海路线，本档案不把它当已完成基地。

**岸入口及关闭。** NPS 对 Santa Cruz Island 东部 NPS 管理地、西部私人/保护地、各岛登陆限制分别规定。Middle Anacapa 要许可并由 ranger 陪同；West Anacapa 大部分不向游客开放，Frenchys Cove 也有季节限制。现场码头存在并不等于允许玩家登岸抛竿。[NPS Boating](https://www.nps.gov/chis/planyourvisit/boating.htm)、[NPS Fishing](https://www.nps.gov/chis/planyourvisit/fishing.htm)。

**MPA。** 必须同时载入州/联邦 Reserve、Conservation Area 与 Special Closure。Anacapa SMR/FMR 禁采捕；SMCA/FMCA 仅列明的 lobster 与 pelagic finfish 例外；指定 brown-pelican fledgling area 还有 **1 月 1 日至 10 月 31 日的进入关闭**。底钓 sheephead 不能因“Conservation Area”名称而自动允许。[NPS 群岛 MPA 总图](https://www.nps.gov/chis/learn/nature/marine-protected-areas.htm)与 CDFW Anacapa 详细地图搭配。

**资料/游戏差异（推断）/缺口。** 群岛地形可由 [USGS SIM 3473 regional relief 图](https://pubs.usgs.gov/sim/3473/sim3473_sheet3.pdf)、NOAA 测深及 NPS 图像建立；鱼类基线可从 [NPS Kelp Forest Communities 监测项目](https://www.nps.gov/im/medn/kelp-forest-communities.htm)和 [NOAA ERDDAP Fish Transect](https://coastwatch.pfeg.noaa.gov/erddap/tabledap/erdCinpKfmFT.html)按岛/样点/年筛选。后者覆盖1985–2007历史样带调查，不能直接生成现代鱼群概率；与无脊椎动物等尺寸频率数据集分开。游戏可体现跨海补给、岛影、礁与沙交界、绕 kelp 控鱼。缺目标开放礁坐标、近岸 DEM 覆盖、季节鱼群/饵群、完整特殊关闭多边形、Santa Barbara 基地细节；不能把整个群岛合并成一个任意钓场。

<a id="catalina-avalon"></a>

## 4. Santa Catalina Island：Avalon 基地与开放岛岸

**地理。** NOAA Avalon 站 9410079 的锚点：**33.34500°N, 118.32500°W**，Green Pier 一带。该站是历史短期观测站，不能称为实时海况站。[NOAA benchmark sheet](https://tidesandcurrents.noaa.gov/benchmarks/9410079.html)。主形态为陡峭岛岸、rocky reef/kelp、局部沙底小湾、Avalon 密集 mooring 场；不同于长直沙滩。

**岸/船与入口。** 船钓可从 Avalon 的港口补给系统延伸到经核实开放的岛岸；岸钓候选为 Green/Pleasure Pier 与 Cabrillo Mole 的合法指定区，但本轮只核实设施位置、**尚未取得2026各段垂钓告示/施工边界**，不应把整座渡轮设施默认设为岸钓点。市政公告有 2026 年 8 月 Mole 结构测试，说明当前通行范围需要再次确认。[Avalon Harbor Department](https://www.cityofavalon.gov/175/Harbor-Department)、[市政 News Flash](https://www.cityofavalon.gov/m/newsflash?cat=11%2C1)。

**鱼种/季节。** 强当地生态证据：kelp bass、California sheephead、opaleye、blacksmith 等见 Casino Point 官方自然史；giant sea bass 和 garibaldi 适合观赏/保护鱼种，不应列成默认可留鱼。中：这些保护区生境可用于邻接开放区鱼种候选，不能转成 Avalon 每个码头的高上钩率。季节生态需补岛边水温、kelp、饵群/产卵资料；合法开放期按 Southern 当年表。[CDFW Casino Point](https://wildlife.ca.gov/Conservation/Marine/MPAs/Casino-Point)、[CSULB Catalina 鱼类遥测研究](https://www.csulb.edu/shark-lab/fish-movements-and-marine-protected-areas)。

**MPA 不能混淆。** Casino Point 是 No-Take SMCA；Lover’s Cove 亦不可设为自由捕鱼海湾。岛的其他边界另见城市承载的官方导览图；若延伸到 Two Harbors、Cat Harbor、Farnsworth，不沿用 Avalon 的区域规则。[CDFW Lover’s Cove](https://wildlife.ca.gov/Conservation/Marine/MPAs/Lovers-Cove)、[Avalon 官方 Catalina MPA 图册](https://www.cityofavalon.gov/DocumentCenter/View/1852)。

**风浪与设施。** 东岸局部避浪条件不应扩展到整个岛岸；背风/迎风要由每湾方位和当天风向计算。港方要求来船在入口等待 mooring 分配，港内有 fuel dock、ice、water、pumpout、厕所和 shoreboat；这些可成为“先停泊、补给后出航”的真实逻辑。资料不证明所有服务每日全天营业。[Avalon Harbor Brochure 2025–2026](https://www.cityofavalon.gov/DocumentCenter/View/1769/Avalon-Harbor-Brochure-FINAL-2025-2026)。

**数据及游戏差异（推断）。** NOAA NOS surveys 与 USGS 区域底图提供坡面结构；[USGS Inner Continental Borderland 产品](https://www.usgs.gov/maps/colored-shaded-relief-bathymetry-acoustic-backscatter-and-selected-perspective-views-inner)包含合并测深数据，但“Gulf of Santa Catalina”的大陆坡资料不等于 Avalon 港内精测，必须验 coverage。可加入深色岩壁、透明水、kelp、密集系泊浮球、从热闹港湾去安静岛岸的空间节奏。缺合法岸钓区告示、Mole 当前施工范围、所选开放礁鱼群数据、港内最新测深、具体饵店官方经营记录和冬季风浪统计。

<a id="redondo-canyon"></a>

## 5. Redondo Beach / King Harbor：城市栈桥与近岸峡谷

**地理及模式。** 检索锚点使用历史 NDBC 46045：**33.840°N, 118.450°W**，明确为已撤销的外海监测站，不是当前浮标或下水点。[NOAA NDBC 46045](https://www.ndbc.noaa.gov/station_page.php?station=46045)。适合 Horseshoe/市政 pier 岸钓、King Harbor 出船、近岸 Redondo Canyon 船钓组合。Redondo Beach 在加州，不要误读为华盛顿州同名保护区。

**地形真实性。** USGS 描述峡谷头在极近岸水下，峡谷纵向较直、V 形且两侧不对称。该原始研究较老，适合稳定地貌形态解释，不宜把其 1967 年岸距/水深数字当现代港口测绘。[USGS 原始报告/剖面](https://pubs.usgs.gov/pp/0575c/report.pdf)、[USGS LA margin 多波束透视图](https://pubs.usgs.gov/of/2002/0162/persp.html)。应呈现城市沙滩和码头下的浅区，再渐入真实峡谷，而非从 pier 垂直坠入无限深坑。

**鱼种证据等级。** CDFW 把 Redondo Beach Pier 列为海岸钓鱼设施，但页面的通用物种说明不等于该 pier 独立调查。mackerel、bonito、halibut 可列为**待补局地 CPUE 的候选**；区域 reef 的 kelp bass、rockfish、sheephead 有邻近 Palos Verdes 官方栖地证据，等级中，不可用来证明 Redondo pier 常见频率。[CDFW Beach Fishing](https://wildlife.ca.gov/Fishing/Ocean/Beach-Fishing)、[CDFW 邻近 Point Vicente/Abalone Cove 栖地](https://wildlife.ca.gov/Conservation/Marine/MPAs/Point-Vicente-Abalone-Cove)。季节候选用 Southern 分区规定分离管理；本轮不编造“某月最佳”日历。

**设施、真实关闭与船入口。** **旧 Sportfishing Pier 与 Horseshoe Pier 是不同结构**。市 King Harbor Public Amenities Plan 记载前者因结构严重损坏于 2017 年后关闭，提出重建及钓鱼用途调整；这是计划，不能当已完工设施。不要把网络上“旧 pier 饵店/开放”描述原样移入游戏。船入口的官方研究记录现有 **boat hoist** 与拟建 public ramp；新 ramp 不可当现成开通。[市 Amenities Plan](https://redondo.gov/Draft%20Public%20Amenities%20Plan%20for%20King%20Harbor.pdf)、[市 2025 Boat Launch Demand Study](https://redondo.legistar.com/View.ashx?GUID=9F098D4D-5D79-4232-A37B-9471643217A0&ID=14852330&M=F)、[市 pier 法规](https://ecode360.com/42662404)。港区吊船机、渡步道、码头店面可作景观；当前 bait/fuel 店名未获得足够官方更新证据，先保留资料缺口。

**MPA 与海况。** 先在 CDFW 官方地图裁出 King Harbor—Redondo Canyon 研究框，再叠南侧 Point Vicente No-Take SMCA / Abalone Cove SMCA。后者的特定 spearfishing 例外不是 hook-and-line 许可。港内遮蔽与外海西向暴露应分离；历史浮标只能提供历史气候，不提供当前浪高。南加州沿岸食鱼 advisories 另是“食用”层，不可与采捕法定限制混为一谈。[OEHHA 南加州历史研究资料](https://oehha.ca.gov/media/downloads/advisories/socaladvisoryl61809.pdf)只能作后续查找采样点的入口，当前建议仍需复核。

**游戏差异（推断）与缺口。** 城市 pier 上的高低落差、栏杆落鱼、吊船入海、航道交通、远处岩岸和近岸峡谷会形成强差异。缺 2026 新 ramp/旧 pier 工程现况、岸边具体允许垂钓段、当前 hoist 营运状态、现代高分辨率峡谷头与沙滩 DEM、鱼群本地季节序列。此候选特色强，但当前进入状态核实工作量高。

<a id="san-diego-bay"></a>

## 6. San Diego Bay：城市港湾、eelgrass 浅滩与深航道

**地理及模式。** NOAA San Diego 站 9410170 锚点 **32.71419°N, 117.17358°W**，位于市区港湾潮位观测区域；不代表可垂钓的军港/码头入口。[NOAA benchmark sheet](https://tidesandcurrents.noaa.gov/benchmarks/9410170.html)。重点为公共 pier 岸钓与 sheltered skiff/kayak，使用港湾潮汐结构，区别于外海冲浪带。

**底质与鱼种。** Port 监测计划明确湾内包含 eelgrass、泥沙底、潮滩等。港湾不能整片铺满 kelp forest；海草浅滩、疏浚深航道、码头桩群需分别建立。[Port Natural Resources Management](https://www.portofsandiego.org/environment/environmental-conservation/natural-resources-management)。**强当地证据**：Spotted sand bass 是 CDFW 明列在 San Diego Bay 常见渔获的物种；Vantuna 调查团队列出湾内普遍调查到 topsmelt、round stingray、spotted sand bass、slough/deepbody anchovy。[CDFW Spotted Sand Bass ESR](https://marinespecies.wildlife.ca.gov/spotted-sand-bass/management/)、[调查团队 Estuarine Ecology](https://www.oxy.edu/academics/vantuna-research-group/research/estuarine-ecology)。两种 anchovy 不应与常用饵 northern anchovy 只按中文俗名合并。

**季节与资料获取。** Port 的 [Monitoring Reports](https://www.portofsandiego.org/environment/environmental-conservation/monitoring-reports)提供 2022/2019/2016/2015 fisheries surveys 和 2023 eelgrass inventory，可按湾段/样季建立鱼种权重，不把全湾平均值套每个码头。本次已核实目录，但 2022 PDF 的工具直接获取失败，因此没有抄未读表格里的数量/月份峰值。法定季节看 Southern 当前页，旧 ESR 的法规段不作为 2026 限额唯一依据。

**真实岸入口与补给。** 港务明确允许其公共 fishing piers 垂钓，列有 Shelter Island Central、Embarcadero Marina Park South、Pepper Park、Bayside Park；**Barrio Logan 的观景 pier 不允许钓鱼**。Shelter Island Boat Launch 有厕所和停车，港方还明确 Everingham Brothers bait receivers 提供 anchovy/sardine，可作港口 bait barge 场景依据。[Port 公园/钓鱼规则](https://www.portofsandiego.org/experiences/see-and-do/parks/park-permitting-information)、[Shelter Island Boat Launch](https://www.portofsandiego.org/experiences/where-go/shelter-island/shelter-island-boat-launch)。这核实了入口/设施类型，不保证每个码头访问日不存在临时施工。

**潮流、空间规则。** 深航道中的通航、船尾浪、浅区风浪与 ebb/flood 流分别建模；不能仅用一条全图匀速流。Port [Mariner Resources](https://www.portofsandiego.org/maritime/mariner-resources)含 Tidelands/Pier-Slip map books、navigation/port code，须与 [Boating on San Diego Bay](https://www.portofsandiego.org/coming-and-going/boating-san-diego-bay)的 anchorage/guest dock 区域一起核实。CDFW ESR 说明 San Diego Bay 常用 spotted-bass 栖区不属于 MPA；这**不等于全湾能自由进入**，军事/保安、港口和 wildlife-refuge 区仍需独立边界层。默认 playable polygon 只用确认开放的湾段。

**地形资料/推断/缺口。** [NOAA/USGS San Diego Coastal DEM 编制报告](https://ca.water.usgs.gov/sandiego/data/gis/dem/sd_coastal_dem/San_Diego_California.pdf)说明多源测深、ENC、USACE、Scripps 与 CSUMB 数据的组合；这是历史 DEM，要用最新港口调查更替 dredged channel。游戏可突出“轻钓组扫海草边、桥下阴影、深槽漂流、公共 pier 新手区”。缺逐码头现况/告示、2022调查表正式导入、流速时序、疏浚更新、精确军事限制边界；不默认展示可闯军港的路线。

<a id="la-jolla-kelp"></a>

## 7. La Jolla：沙滩下水、海蚀洞、峡谷和 kelp 外缘

**地理与方式。** NOAA La Jolla 9410230 锚点 **32.86689°N, 117.25714°W**，在 Scripps Pier 研究区域，是数据检索点而非公共钓鱼入口。[NOAA benchmark sheet](https://tidesandcurrents.noaa.gov/benchmarks/9410230.html)。实际小艇/kayak 入口为 La Jolla Shores 的 Avenida de la Playa / La Vereda 一带；采用“沙滩备船—穿过保护水域—到经核实开放水域钓鱼”的结构，岸边可见鱼群不能直接成为合法岸钓区。[City kayak launch 文件](https://www.sandiego.gov/sites/default/files/kayak2020.pdf)、[入口位置的市政文件](https://www.sandiego.gov/sites/default/files/nora050919-rfp-271335_001-and-kayak-concessions-agreement-for-operation-of-kayak-concessions-at-la-jolla-shores-beach.pdf)。

**真实地形及生态。** 沙滩、砂质海底、零散 rock reef、海蚀洞、sea cliff、kelp 与 La Jolla/Scripps 两条峡谷组合，不是一片均匀暗绿色海草。官方本地生态资料记录 kelp bass、white seabass、leopard shark、halibut、sanddab/rays 等；豹鲨夏秋在保护区聚集是生态观赏事实，不是鼓励在那里捕鱼的依据。USGS 的 AUV/ROV 研究发现峡谷轴部是可搬运砂和弯月形床形，不能把整个峡谷画成裸岩。[CDFW Matlahuayl / Scripps](https://wildlife.ca.gov/Conservation/Marine/MPAs/San-Diego-Scripps-Coastal-Matlahuayl)、[USGS La Jolla Canyon 研究](https://www.usgs.gov/publications/anatomy-la-jolla-submarine-canyon-system-offshore-southern-california)。

**MPA 必须至少三套不同规则。** Matlahuayl SMR 不可采捕；San Diego-Scripps Coastal SMCA 仅允许列明 coastal pelagic species 的 hook-and-line（northern anchovy、Pacific sardine、Pacific mackerel、jack mackerel），**不含 market squid**。South La Jolla SMR 不可采捕；其 offshore SMCA 则允许较广的列明 pelagic finfish hook-and-line，不能混用 Scripps 名单或推导出可底钓。[CDFW South La Jolla](https://wildlife.ca.gov/Conservation/Marine/MPAs/South-La-Jolla)、[Matlahuayl 官方地图/边界单张](https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=98226&inline=)。

**风浪季节、合法季节与设施。** 市 lifeguard 页面说明 Shores 夏季浪通常较温和，但不意味着全年可下水；潮位、浪组、返程冲浪、海岬风影和峡谷水流均影响体验。保护区内指定位置才能 launch/retrieve；本轮市 kayak 文件是历史运营文件，2026 具体许可/临时封闭须再复核。Kellogg Park、lifeguard 和公共沙滩设施可作地标，未核实当前 bait shop，不增设真实商店名。法定鱼期仍独立读取 Southern 页。[City La Jolla Shores](https://www.sandiego.gov/lifeguards/beaches/shores)。

**鱼种证据与游戏差异（推断）。** 上述鱼群在当地的存在证据强，开放区各鱼种咬口概率证据中/待补。South La Jolla CDFW 页面也明确记录 yellowtail 生态存在；不能把这变成 shore-launch 门口 yellowtail 永久聚集。可强调越过保护水域前收好钓具、kelp 绕线与鱼冲入藻林、近岸坡降、沙滩回收小艇的差异。**缺口**：精确开放目标区域选址、最新 kelp 冠层、季节/水温下 yellowtail 与 white-seabass 的局地记录、下水区2026现况、高分辨率沙滩/峡谷头融合 DEM。图像授权也需逐图登记。

## 实施前仍需完成的共同采集清单

1. 每个候选缩小到一个明确 playable polygon，并保存官方 MPA、岸线、登陆/码头/军港限制的独立图层；上面的坐标不能直接生成出生点。
2. 真正下载目标范围 DEM / bathymetry、背散射、岸线与陆地高程元数据，保留调查日期/基准/空洞掩膜；本档案收集了可核实入口，并未假装已经下载全部大体量数据。
3. 岸钓场补充沙色、湿/干沙、粒径、坡度、trough/bar/rip-channel 的多潮位/季节证据；从一张照片无法推出水下固定沙槽。
4. 用调查或 CDFW CRFS 的正确地理/钓法粒度确定物种，保留“生态分布—可钓目标—合法保留”三个字段；不得把 protected species 或保护区内密度当开放区战利品表。
5. 风、涌、水位、流速、温度各自保留数据来源与时段；记录潮位站迁移/撤站，港内与外海不共用一个水动力参数。
6. 发布前再核实 2026 之后适用的正式法规、紧急命令、groundfish 表与入口关闭；季节、限额、尺寸不从旧旅行页/商品页/论坛提取。
7. 美术资料登记版权；真实商店仅在港务/经营方当前资料可验证后使用名称。可在游戏使用虚构补给店，但应明确属于游戏设定。

本档案中的“游戏差异”均是根据核实事实作的设计推断，尚非实现规格。当前适合优先深化 **Morro Bay（潮滩/浅湾）→ San Diego Bay（城市港湾/海草）→ Anacapa（岛礁/跨海）**；这个顺序按场景差异与资料可得性判断，不是现实出钓推荐。
