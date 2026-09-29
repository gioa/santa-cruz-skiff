# 建模数据、法规与素材资料目录

核查日：2026-09-28。这里收集未来制作所需的数据类别、权威入口、已知局限与交付标准；没有编写场景或接入游戏。各地点的事实见三份区域档案。

## 1. 先区分六类证据

| 类别 | 能证明什么 | 不能直接证明什么 |
|---|---|---|
| 地方实测／原始调查 | 某地点、日期、方法测得的水深、底质或鱼种 | 全年所有抛点的精确状态 |
| 官方地点介绍 | 设施、地理和当地生态的一般事实 | 今天开放、设施仍完好、当天活饵有货 |
| 历史资料 | 当年的鱼类、岸线、渔业与运营 | 2026 的法定鱼季或最新沙槽 |
| 观测／预测／数值模型 | 分别对应传感器实测、天文预报或计算场 | 三者不能无标识混用 |
| 设计推论 | 依据事实提出可玩的机制与空间分区 | 已经测量或验证的现实概率 |
| 缺失 | 需要采样、授权或进一步提取的字段 | 不可用 0、平均值或随机数冒充实测 |

官方资料也会过时或有获取失败。原始调查年、网页更新日、访问日须分别存储；搜到的收录日期不是调查日期。网页读取成功不等于其所有下载链接都已可用。

## 2. 全场景共用的数据层

| 数据层 | 权威资料入口 | 后续提取内容与关键限制 |
|---|---|---|
| 大尺度海底／底质 | [USGS California Seafloor Mapping](https://www.usgs.gov/centers/pcmsc/science/california-seafloor-mapping-program?field_partner_type_target_id=141710&page=0)；各区 DS781 图块见区域档案 | bathymetry、backscatter、seafloor character、ground-truth video、地质。实测区域和岸边空洞要保留；底质分类图不是高度图，backscatter 不是沙子的 RGB 色值。 |
| 最新测深调查检索 | [NOAA Bathymetric Data Viewer](https://www.ncei.noaa.gov/maps/bathymetry/)、[NOAA Hydrographic Survey Data](https://www.nauticalcharts.noaa.gov/data/hydrographic-survey-data.html) | survey ID、测量日期、覆盖、格网/BAG/点云、潮位改正、质量。港口疏浚后的测量优先于旧全州图。 |
| 岸上／近岸高程 | [NOAA Digital Coast DAV](https://coast.noaa.gov/digitalcoast/tools/dav.html)、[topobathy lidar 说明](https://www.coast.noaa.gov/digitalcoast/data/jalbtcx.html)、[USGS 3DEP](https://www.usgs.gov/3d-elevation-program/about-3dep-products-services) | DTM 与 DSM 分开；水中回波会受透明度影响，不能把无回波处当平底。3DEP 多分辨率不能统一宣称1 m。 |
| LiDAR 实际下载目录 | [NOAA 批量数据目录](https://coast.noaa.gov/htdata/lidar1_z/)、[USGS 下载与 LidarExplorer](https://www.usgs.gov/the-national-map-data-delivery/gis-data-download) | 按场景范围选tile，附原始XML/JSON元数据、投影与版权，不需下载整个加州。 |
| 航道、码头、岸线、浮标 | [NOAA ENC](https://www.nauticalcharts.noaa.gov/charts/noaa-enc.html)、[ENC GIS 说明与服务](https://nauticalcharts.noaa.gov/learn/encdirect/) | 取对应比例尺的矢量对象与版本号。GIS转换产品用于环境研究，不把截图轮廓当精测；码头结构再用港务工程图核对。 |
| 潮位和潮流 | [CO-OPS Data API](https://api.tidesandcurrents.noaa.gov/api/dev)、[Metadata API](https://api.tidesandcurrents.noaa.gov/mdapi/prod/)、[API 查询构建器](https://tidesandcurrents.noaa.gov/api-helper/url-generator.html) | tide prediction、water level、current/bin分列；检查测站是否活跃、时区、datum、单位和缺测。高潮时刻不等于各地憩流时刻。 |
| 湾区水动力场 | [SF Bay PORTS](https://tidesandcurrents.noaa.gov/ports/index.html?port=sf)、[SFBOFS](https://tidesandcurrents.noaa.gov/ofs/sfbofs/sfbofs.html) | 观测与模型分开，保存深度层；可研究风、盐度、温度和流向的空间差异，不能把模型格网当微小码头绕流实测。 |
| 波浪与风 | [NDBC 历史资料](https://www.ndbc.noaa.gov/historical_data.shtml)、[NDBC 文件目录](https://www.ndbc.noaa.gov/data/historical/)、[CDIP data access](https://cdip.ucsd.edu/m/documents/data_access.html) | Hs、Tp/Tm、浪向、方向谱、风速/阵风。CDIP 有观测及近岸模型；历史综合与单次布放文件的 QC 不同，原始资料需应用质量标记。 |
| 浪与沙槽机制 | [NWS rip-current science](https://www.weather.gov/safety/ripcurrent-science)、区域 USGS/MBARI 地貌研究 | 用来解释 bar、trough、rip channel 与结构物的关系；不是任何指定海滩今天每条槽的位置证明。 |
| 海带／海草 | [CDFW kelp monitoring](https://wildlife.ca.gov/Conservation/Marine/Kelp/Monitoring)、[CDFW 航测 GIS](https://wildlife.ca.gov/Conservation/Marine/Kelp/Aerial-Kelp-Surveys)、San Diego Port eelgrass 及各区域调查 | canopy、understory、eelgrass 分开。CDFW 历史年度覆盖并非每年每区连续完整；行政 kelp-bed boundary 不是当年真实海带边缘。 |
| 河流与湖泊动态 | [USGS Water Data API](https://api.waterdata.usgs.gov/)、[DWR CDEC 传感器查询](https://cdec.water.ca.gov/dynamicapp/wsSensorData)、[CDEC 站点元数据](https://cdec.water.ca.gov/dynamicapp/staMeta) | 流量、stage、水库高程、温度、降水。stage不是水深，daily mean不是瞬时值，河流流量不能直接当鱼线所在点流速。 |
| 水库运行 | [Reclamation 日数据](https://www.usbr.gov/mp/cvo/current.html)、[LADWP Long Valley 等水库](https://wsoweb.ladwp.com/aqueduct/operations/reservoir.htm) | 日期、单位、缺测定义、测站高程；LADWP 表里部分零值需核查，不能直接解释为无水。 |
| 鱼类调查／放流 | [CDFW Marine Nearshore 研究](https://wildlife.ca.gov/Conservation/Marine/Nearshore)、[CDFW Inland/CIRAS入口](https://wildlife.ca.gov/Fishing/Inland)、[放流日程](https://nrm.dfg.ca.gov/FishPlants/PublicPlantSearch)、各区域原始调查 | 物种学名、长度、样本量、方法、日期、钓法和努力量。放流计划不保证当天完成，更不等于剩余鱼群数量。 |
| 法定空间与限制 | [CDFW Marine GIS](https://wildlife.ca.gov/Conservation/Marine/GIS)、[MPA地图](https://filelib.wildlife.ca.gov/Public/ITB/NRM/MPAMap/mpa_map.html)、[海洋当期规则](https://wildlife.ca.gov/Fishing/Ocean)、[淡水法规](https://wildlife.ca.gov/Regulations) | polygon与法律文本同时保存；地理分区、鱼种、钓法、深度、日期共同决定规则。 |
| 入口与补给设施 | 当地港务、城市/县公园、State Parks DBW、NPS、USFS和经营者页面（区域档案逐点列明） | 岸线权限、pier/ramp/hoist、船型尺寸、营业期、施工、船艇检查；店铺存在与特定活饵库存分开。 |
| 水质与食用事件 | [Water Board freshwater HAB](https://waterboards.ca.gov/water_issues/programs/swamp/freshwater_cyanobacteria.html)、[OEHHA 鱼类建议入口](https://oehha.ca.gov/fish) | 食用建议、采捕禁令、入水封闭是不同事件，不由一个“污染”布尔值替代。仅采集游戏需要表达的环境状态。 |

**已核实的可用细节**：Bodega 有2 m海底性质栅格；Tomales有4 m湾底DEM；SF Bay有1 m、多时期融合的DEM；Morro有2024更新的外海测深/底质发布；Tahoe有1998调查的10 m网格；Delta有10 m整体地形。对应链接、年代与适用范围均在区域档案。它们不是同等新、同等覆盖的“一套全加州数据”。

## 3. 每个场景最终应收集的完整资料包

这是以后从研究转入制作时的验收清单，不是本轮已经获得的全部文件。

| 项目 | 最小可审查材料 | 本轮状态 |
|---|---|---|
| 范围与尺度 | 地理范围、多子区、入口、距离、真实与游戏缩尺关系 | 18个区域及子区已研究；最终playable polygon未选 |
| 地形 | 陆上DTM、水下DEM、坡度断面、岸线、高程基准、空洞mask | 已列权威数据入口和关键分辨率；未全部裁切下载 |
| 沙滩与岩岸 | 干湿沙色照片、粒径/矿物证据、滩坡、bar/trough、礁石与沉积物 | 已明确机制和地域差异；精确色板/局地断面多未取得 |
| 水 | 多季节潮位、潮流、浪谱、风、温度、能见度；观测/模型标签 | 下载入口和变量已列；尚未完成逐点气候统计 |
| 生态 | 地方鱼种、学名、大小分布、食物链、栖地、季节、饵群、CPUE | 地方/区域/历史证据分级完成；概率和种群密度未校准 |
| 钓鱼互动 | 岸/船方式、站立与抛投空间、深度/线角、底质挂底、饵具关系、起鱼方式 | 档案中已提设计差异；物理数值、动画、经济均未实现 |
| 法规 | 当期原文、区域边界、保护区、物种/尺寸/限额/钩数/季节、临时事件 | 已保存海淡水2026原册并记录关键例外；未逐点逐鱼形成可执行规则库 |
| 设施 | 门禁、码头／吊机／船坡、停车、鱼店、冰/燃油、清鱼、检查站 | 机构/经营者确证项已记录；不清楚的商店、库存、价格保持未知 |
| 视觉与声音 | 地标多视角、相机位置/焦距、季节/潮位/天气、授权、环境录音 | 参考资源已收；未批量下载或授权照片/音频 |
| 游戏设定 | 统一Santa Cruz布局下的变化清单、风险/奖励/执法玩法说明 | 仅设计推论；概率、罚款、剧情为待定游戏设定 |

沙滩数据建议采用沿岸多断面，并覆盖入口、溪口、pier附近、不同朝向与沉积物分区。**具体采样间距属于后续设计选择**，本轮不把100 m等间距称为科学标准。近岸缺测时可程序生成形态，但必须在研究元数据标“合成”，不能称为真实沙槽复刻。

## 4. 法规资料应怎样整理

已下载的 [海洋2026册](raw/cdfw-ocean-2026.pdf) 封面为 **2026-07-17更新**；[淡水2026册](raw/cdfw-freshwater-2026.pdf) 为 **2026-07-10更新**。这是本次实际下载并读取封面确认的版本，不能照搜索缓存写成1月版。仍须与 [CDFW当期页面及临时更新](https://wildlife.ca.gov/Fishing/Ocean) 配合。[法规总入口](https://wildlife.ca.gov/Regulations)说明册子会年内修订。

后续资料字段至少包括：`jurisdiction`、`waterbody/zone`、`species`、`gear`、`shore_or_boat`、`depth_constraint`、`season`、`length_measurement`、`bag/possession`、`release_required`、`effective_from/to`、`source_version`、`checked_at`。未知字段用null，不假定“不限”。

判定资料需要分成四组：

1. **进入地点**：陆地所有者、施工和自然保护关闭；有鱼、有码头都不保证能进入。
2. **进行捕捞**：海淡水分界、MPA、指定鱼种、钓法、时间及深度。
3. **保留／携带／使用渔获**：尺寸、数量、放流与饵用/食用差别；原文所用总长/叉长要记录。
4. **模拟执法事件**：现实规则可作为题材；遭遇概率、统一罚款金额和“全鱼没收”等游戏逻辑不伪装成当地实际执法统计。

公共海洋pier的免执照条件不是“名字里有pier”即可成立，仍有 CCR §1.88 定义、开放条件与其他规则；河湖平台不能直接套用海洋例外。[CDFW general provisions](https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Provisions)、[CDFW beach/pier fishing](https://wildlife.ca.gov/Fishing/Ocean/Beach-Fishing)。

**空间资料的旧版本陷阱**：[ds582元数据](https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/DS0582.html)写明代表2019-01-01的MPA，并声明不是法律边界定义。后续应从现行Marine GIS入口核对版本，再与各MPA页面的坐标/CCR文本比较；不将这个老zip直接视为2026最终法规。

## 5. 素材与数据来源记录规范

每个下载资产保留：原URL、提供者、获取日、发布/调查日、用途、许可、原始文件名、SHA-256、大小、解析结果。地理数据额外保留bbox、CRS、垂向datum、单位、分辨率、NoData值和survey IDs。照片额外保留摄影者、地点/方向、拍摄日期、潮位、光照、是否可修改/商用。

- USGS 3DEP 页面明确无使用限制；特定 USGS 图片标明public domain，可据具体标注使用。
- NOAA/CDIP/USGS 数据仍需保留产品自己的元数据与致谢条件；不能把机构logo和网页中的第三方照片一起当开放资产。
- 港口／店铺参考照及商标，本轮没有获得游戏内使用授权。可以从事实建立原创建筑、原创店名与原创贴图；具体外观依然要尊重场景地貌。
- 无需把所有参考照片直接打包进游戏。地图中的航拍底图也可能另有版权；公开可见不等于允许重新分发。

## 6. 已保存与尚未保存

`raw/` 保存两份2026法规、Clear Lake园区旧图册、Delta DEM方法说明、Tahoe鱼类旧指南与USGS下载元数据。文件版本、哈希、有效性及失败项见 [下载清单](downloads.json)。它们用于可追溯研究；旧年份文件的名称保留旧年份。

所有参考链接另汇成 [sources.csv](sources.csv)。该清单的“本次整理”不表示每个被引用网页的所有子链接、交互图层或整个数据服务都完成下载。**大型栅格、场景范围裁切、近期现场照片和统计校准尚未完成**，在选择具体场景后按本文件逐项提取；本轮没有把这些空缺隐藏成已测量参数。
