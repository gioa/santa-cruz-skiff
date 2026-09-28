import {createShoreLore,stepShoreLore,talkShoreAngler} from './shore-lore.js?v=coast-5';
// Shared shore-fishing simulation. Geometry and habitats are scene specific;
// prices, bite rates, inspection odds and fines are authored game tuning.
import {getShoreScene, sampleShore, onPier} from './shore-data.js?v=coast-5';
export const SAVE_KEY = 'pacifica-surf-save-v1';
export const WORLD = getShoreScene('pacifica').world;
export const SHOP = getShoreScene('pacifica').shop;
export const PIER_RULES = Object.freeze({interval: 30, probability: .35, fine: 80});
export const BAITS = Object.freeze([
  {id: 'sandcrab', name: '沙蟹', nameEn: 'Sand crabs', kind: 'bait', price: 12, quantity: 8, description: '近岸浪花里的轻巧选择，适合海鲫。'},
  {id: 'squid', name: '鱿鱼条', nameEn: 'Squid strips', kind: 'bait', price: 20, quantity: 8, description: '耐用的通用鱼饵，三种鱼都可能上钩。'},
  {id: 'anchovy', name: '鳀鱼块', nameEn: 'Anchovy chunks', kind: 'bait', price: 24, quantity: 6, description: '向外海抛投时更容易遇到条纹鲈和比目鱼。'},
]);
export const SHOP_ITEMS = Object.freeze([
  ...BAITS,
  {id: 'surf_rod', name: '长节沙滩竿', nameEn: 'Long surf rod', kind: 'upgrade', price: 85, description: '最大抛投距离增加 72 ft。'},
  {id: 'sealed_reel', name: '密封纺车轮', nameEn: 'Sealed spinning reel', kind: 'upgrade', price: 110, description: '收线更快，张力积累稍慢。'},
  {id: 'fishfinder_rig', name: '滑铅钓组', nameEn: 'Fish-finder rig', kind: 'rig', price: 65, description: '自动装配；等待咬口的时间缩短。'},
  {id: 'beach_bait', name: '应急沙蟹', nameEn: 'Emergency beach bait', kind: 'free', price: 0, quantity: 3, description: '所有鱼饵用完后，店主免费补给 3 只。'},
]);
export const SPECIES = Object.freeze([
  {id: 'surfperch', name: '红尾海鲫', nameEn: 'Redtail surfperch', minKg: .35, maxKg: 1.2, baseValue: 15, valuePerKg: 13, strength: .65, color: '#eac896'},
  {id: 'striped_bass', name: '条纹鲈', nameEn: 'Striped bass', minKg: 1.2, maxKg: 4.6, baseValue: 25, valuePerKg: 12, strength: 1.05, color: '#b9d2cc'},
  {id: 'halibut', name: '加州比目鱼', nameEn: 'California halibut', minKg: 1, maxKg: 4.2, baseValue: 30, valuePerKg: 14, strength: .88, color: '#bca176'},
]);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const integer = (value, low, high, fallback = 0) => Math.floor(clamp(finite(value, fallback), low, high));
const baitIds = BAITS.map(item => item.id);
const upgradeIds = SHOP_ITEMS.filter(item => item.kind === 'upgrade' || item.kind === 'rig').map(item => item.id);
const statKeys = ['caught', 'kept', 'released', 'sold', 'casts', 'missed'];
const shopBounds = shop => ({left: shop.x - 18, right: shop.x + shop.width + 18, top: shop.y - 18, bottom: shop.y + shop.height + 18});
const inBuilding = (building, x, y) => x > building.left && x < building.right && y > building.top && y < building.bottom;
const point = (x, y) => ({x, y});

function segmentClear(building, a, b) {
  let lo = 0, hi = 1;
  for (const [key, min, max] of [['x', building.left, building.right], ['y', building.top, building.bottom]]) {
    const delta = b[key] - a[key];
    if (Math.abs(delta) < 1e-8) {
      if (a[key] <= min || a[key] >= max) return true;
    } else {
      const t1 = (min - a[key]) / delta, t2 = (max - a[key]) / delta;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (lo >= hi) return true;
    }
  }
  return hi <= 0 || lo >= 1;
}

function routeAroundShop(building, start, end) {
  const nodes = [start, end,
    point(building.left - 2, building.top - 2), point(building.right + 2, building.top - 2),
    point(building.left - 2, building.bottom + 2), point(building.right + 2, building.bottom + 2)];
  const cost = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  cost[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let best = -1;
    for (let n = 0; n < nodes.length; n++) if (!visited.has(n) && (best < 0 || cost[n] < cost[best])) best = n;
    if (best < 0 || !Number.isFinite(cost[best])) break;
    if (best === 1) break;
    visited.add(best);
    for (let n = 0; n < nodes.length; n++) {
      if (visited.has(n) || !segmentClear(building, nodes[best], nodes[n])) continue;
      const distance = cost[best] + Math.hypot(nodes[n].x - nodes[best].x, nodes[n].y - nodes[best].y);
      if (distance < cost[n]) {cost[n] = distance; previous[n] = best;}
    }
  }
  if (!Number.isFinite(cost[1])) return [];
  const route = [];
  for (let index = 1; index > 0; index = previous[index]) route.unshift({...nodes[index]});
  return route;
}

function safeFish(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const species = SPECIES.find(item => item.id === raw.id);
  if (!species || !Number.isFinite(raw.weightKg)) return null;
  const weightKg = Math.round(clamp(raw.weightKg, species.minKg, species.maxKg) * 100) / 100;
  return {
    id: species.id, name: species.name, nameEn: species.nameEn, color: species.color,
    catchId: integer(raw.catchId, 1, 1e9, 1), weightKg,
    value: Math.round(species.baseValue + weightKg * species.valuePerKg),
    strength: species.strength, stamina: 0, run: 0,
  };
}

export class PacificaSimulation {
  constructor({sceneId = 'pacifica', saved, rng = Math.random, loreSeed} = {}) {
    this.scene = getShoreScene(sceneId);
    this.world = this.scene.world;
    this.shop = this.scene.shop;
    this.building = shopBounds(this.shop);
    this.rng = typeof rng === 'function' ? rng : Math.random;
    this.reeling = false;
    this.state = {
      sceneId: this.scene.id,
      player: {...this.scene.spawn, facing: -1, walking: false},
      phase: 'walk', elapsed: 0, credits: 120,
      inventory: {sandcrab: 12, squid: 0, anchovy: 0}, bait: 'sandcrab', rig: 'carolina', upgrades: [],
      catches: [], lastCatch: null, stats: Object.fromEntries(statKeys.map(key => [key, 0])),
      cast: null, lineDistance: 0, tension: 0, fish: null,
      biteRemaining: 0, waitRemaining: 0, fightElapsed: 0, lineStress: 0, slackTime: 0,
      walkTarget: null, walkRoute: [],
      message: `欢迎来到 ${this.scene.name}。沿沙滩寻找浪沟，按住抛投蓄力。`,
      nextCatchId: 1,
      onPier: false, leavingPier: false, pierExposure: 0, inspectionCount: 0, inspection: null, fineDebt: 0,
      shoreSample: null,
    };
    if (saved?.scene === this.scene.id && [1, 2].includes(saved.version)) this.restore(saved);
    this.state.shoreLore=createShoreLore(this.scene,saved?.scene===this.scene.id?saved.shoreLore:null,this.state.elapsed,loreSeed);
    this.refreshSample();
  }

  talkAngler(id){return talkShoreAngler(this,id);}

  random() { return clamp(finite(this.rng(), .5), 0, .999999); }

  get nearShop() {
    return !this.state.inspection && this.state.phase === 'walk' && Math.hypot(this.state.player.x - this.shop.door.x, this.state.player.y - this.shop.door.y) <= 88;
  }

  get canCast() {
    const s = this.state, offset = s.player.y - this.world.shoreY(s.player.x);
    return !s.inspection && s.phase === 'walk' && (s.onPier || offset >= 19.9 && offset <= 130) && s.inventory[s.bait] > 0;
  }

  get nearPier() {
    const pier = this.scene.pier, s = this.state;
    return Boolean(pier && !s.onPier && !s.inspection && s.phase === 'walk' && Math.hypot(s.player.x - pier.gate.x, s.player.y - pier.gate.y) <= 72);
  }

  get onPier() { return this.state.onPier; }

  onSand(x, y) {
    return x >= 20 && x <= this.world.width - 20 && y >= this.world.shoreY(x) + 20 && y <= this.world.height - 25 && !inBuilding(this.building, x, y);
  }

  refreshSample() {
    const s = this.state, p = s.cast?.target || {x: s.player.x, y: this.world.shoreY(s.player.x) - 90};
    s.shoreSample = sampleShore(this.scene, p.x, p.y, s.elapsed);
    return s.shoreSample;
  }

  result(ok, message, extra = {}) {
    if (message) this.state.message = message;
    return {ok, message: message || this.state.message, ...extra};
  }

  walkTo(x, y) {
    const s = this.state;
    if (s.inspection) return this.result(false, '先确认本次检查结果。');
    if (s.phase !== 'walk') return this.result(false, '先收回钓线或处理这条鱼，再移动。');
    if (!Number.isFinite(x) || !Number.isFinite(y)) return this.result(false, '请选择沙滩上的位置。');
    if (s.onPier) return this.walkPierTo(x, y);
    if (this.scene.pier && onPier(this.scene, x, y) && y < this.world.shoreY(x) + 20) return this.result(false, '栈桥入口有封闭围栏，先走到岸边的闸门。');
    x = clamp(x, 20, this.world.width - 20);
    y = clamp(y, this.world.shoreY(x) + 20, this.world.height - 25);
    if (inBuilding(this.building, x, y)) return this.result(false, '商店入口在建筑下方，走到门前即可交易。');
    const target = point(x, y), route = routeAroundShop(this.building, s.player, target);
    if (!route.length) return this.result(false, '这里暂时无法到达。');
    s.walkTarget = target; s.walkRoute = route;
    return this.result(true, y - this.world.shoreY(x) <= 130 ? '走向浪线，准备抛投。' : '沿沙滩行走中。');
  }

  enterPier() {
    if (!this.nearPier) return this.result(false, '先走到封闭栈桥的岸边闸门。');
    const s = this.state;
    s.onPier = true; s.player.x = this.scene.pier.entry.x; s.player.y = this.scene.pier.entry.y;
    s.walkTarget = null; s.walkRoute = []; s.player.walking = false;
    this.refreshSample();
    return this.result(true, '你越过围栏进入封闭栈桥。巡查可能罚款 80 潮汐点并遣返入口。');
  }

  pierSegmentClear(a, b) {
    const distance = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(distance / 5));
    for (let n = 0; n <= steps; n++) if (!onPier(this.scene, a.x + (b.x - a.x) * n / steps, a.y + (b.y - a.y) * n / steps, 5)) return false;
    return true;
  }

  walkPierTo(x, y, exiting = false) {
    const s = this.state, pier = this.scene.pier;
    if (!pier || !onPier(this.scene, x, y, 5)) return this.result(false, '只能沿栈桥桥面行走；回入口才能离开。');
    // Visibility graph over the L's centerline avoids walking diagonally over water.
    const target = point(x, y), nodes = [s.player, target, pier.entry, pier.tip,
      ...pier.deck.map(r => point((r.left + r.right) / 2, (r.top + r.bottom) / 2))];
    for (const a of pier.deck) for (const b of pier.deck) {
      const left = Math.max(a.left, b.left), right = Math.min(a.right, b.right), top = Math.max(a.top, b.top), bottom = Math.min(a.bottom, b.bottom);
      if (right > left && bottom > top) nodes.push(point((left + right) / 2, (top + bottom) / 2));
    }
    const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set(); costs[0] = 0;
    for (let i = 0; i < nodes.length; i++) {
      let best = -1;
      for (let n = 0; n < nodes.length; n++) if (!visited.has(n) && (best < 0 || costs[n] < costs[best])) best = n;
      if (best < 0 || !Number.isFinite(costs[best]) || best === 1) break;
      visited.add(best);
      for (let n = 0; n < nodes.length; n++) if (!visited.has(n) && this.pierSegmentClear(nodes[best], nodes[n])) {
        const cost = costs[best] + Math.hypot(nodes[n].x - nodes[best].x, nodes[n].y - nodes[best].y);
        if (cost < costs[n]) {costs[n] = cost; previous[n] = best;}
      }
    }
    if (!Number.isFinite(costs[1])) return this.result(false, '这个位置不在可行走的桥面上。');
    const route = [];
    for (let n = 1; n > 0; n = previous[n]) route.unshift({...nodes[n]});
    s.walkTarget = target; s.walkRoute = route; s.leavingPier = exiting;
    return this.result(true, exiting ? '沿栈桥返回岸边入口。' : '沿桥面移动；巡查风险仍在累积。');
  }

  leavePier() {
    const s = this.state;
    if (!s.onPier || s.inspection || s.phase !== 'walk') return this.result(false, '先收回钓线并处理渔获，再沿桥面离开。');
    return this.walkPierTo(this.scene.pier.entry.x, this.scene.pier.entry.y, true);
  }

  ejectFromPier() {
    const s = this.state;
    s.onPier = false; s.leavingPier = false;
    Object.assign(s.player, this.scene.pier.gate, {walking: false});
    s.walkTarget = null; s.walkRoute = [];
    this.refreshSample();
  }

  checkPier(dt) {
    const s = this.state;
    if (!s.onPier || s.inspection || s.phase === 'landed') return false;
    s.pierExposure += dt;
    while (s.pierExposure + 1e-9 >= PIER_RULES.interval) {
      s.pierExposure = Math.max(0, s.pierExposure - PIER_RULES.interval);
      if (this.random() >= PIER_RULES.probability) continue;
      const paid = Math.min(s.credits, PIER_RULES.fine), debt = PIER_RULES.fine - paid;
      s.credits -= paid; s.fineDebt += debt; s.inspectionCount++;
      const confiscated=s.catches.map(f=>({...f}));s.catches=[];
      this.clearLine(); this.ejectFromPier();
      s.inspection = {id: s.inspectionCount, fine: PIER_RULES.fine, paid, debt, exposure: s.pierExposure,confiscated,findings:[{location:'Pacifica Municipal Pier',code:'closed_pier_entry',detail:'翻越入口封闭围栏，进入维修期间禁止进入的栈桥。鱼警已将你带回入口。'}],
        message: `巡查员发现你进入封闭栈桥，罚款 ${PIER_RULES.fine} 潮汐点，没收全部 ${confiscated.length} 尾鱼获，已带回入口。${debt ? `尚欠 ${debt} 点，出售渔获时优先偿还。` : ''}`};
      s.message = s.inspection.message;
      return true;
    }
    return false;
  }

  acknowledgeInspection() {
    if (!this.state.inspection) return this.result(false, '当前没有待确认的检查。');
    this.state.inspection = null;
    return this.result(true, '检查已结束，可以留在沙滩继续钓鱼。');
  }

  cast({power = .6, aim = 0} = {}) {
    const s = this.state;
    if (s.inspection) return this.result(false, '先确认本次检查结果。');
    if (s.phase !== 'walk') return this.result(false, '钓线已经在水里。');
    if (!s.inventory[s.bait]) return this.result(false, '这个鱼饵用完了。换饵，或回商店领取应急沙蟹。');
    if (!this.canCast) return this.result(false, '再靠近一些浪线，站在干沙上抛投。');
    power = clamp(finite(power, .6), 0, 1); aim = clamp(finite(aim, 0), -1, 1);
    const maxDistance = 72 + (s.upgrades.includes('surf_rod') ? 22 : 0);
    const distance = 18 + power * (maxDistance - 18);
    const origin = point(s.player.x, s.player.y - 18);
    const lateral = s.onPier ? (aim < 0 ? -1 : 1) * Math.max(40, Math.abs(aim) * distance * 2.3) : aim * distance * 2.3;
    const targetX = clamp(origin.x + lateral, 24, this.world.width - 24);
    const targetY = s.onPier ? Math.min(origin.y - distance * 3.2, this.world.shoreY(targetX) - 18) : this.world.shoreY(targetX) - distance * 3.2;
    const target = point(targetX, Math.max(this.world.minY + 20, targetY));
    s.inventory[s.bait]--; s.stats.casts++;
    s.phase = 'casting'; s.walkTarget = null; s.walkRoute = []; s.player.walking = false; s.player.facing = -1;
    s.cast = {origin, target, power, aim, distance, flight: 0, flightDuration: .72 + power * .5};
    s.lineDistance = distance; s.tension = 0; s.fish = null; s.lastCatch = null;
    const sample = this.refreshSample();
    const habitatWait = {trough: .94, channel: 1.02, bar: 1.27, surf: 1.08, swash: 1.15, offshore: 1.16}[sample.habitat] || 1;
    s.waitRemaining = (12 + this.random() * 18) * habitatWait * (s.upgrades.includes('fishfinder_rig') ? .78 : 1);
    s.biteRemaining = 0; this.reeling = false;
    return this.result(true, `${BAITS.find(item => item.id === s.bait).name}随钓组飞向浪外……`);
  }

  strike() {
    const s = this.state;
    if (s.phase !== 'bite') return this.result(false, s.phase === 'waiting' ? '还没咬钩，留意竿尖与提示。' : '等鱼真正咬钩时再扬竿。');
    const choice = this.random(), sample = this.refreshSample();
    const weights = this.speciesWeights(sample), total = weights.reduce((a, b) => a + b, 0);
    const species = SPECIES[choice < weights[0] / total ? 0 : choice < (weights[0] + weights[1]) / total ? 1 : 2];
    const weightKg = Math.round((species.minKg + this.random() * (species.maxKg - species.minKg)) * 100) / 100;
    s.fish = {...safeFish({id: species.id, weightKg, catchId: s.nextCatchId++}), stamina: 1, run: 0, runOffset: this.random() * Math.PI * 2};
    s.phase = 'fighting'; s.tension = .33; s.biteRemaining = 0; s.fightElapsed = 0; s.lineStress = 0; s.slackTime = 0;
    return this.result(true, '中鱼！按住收线；张力过高就松开，让鱼冲一阵。');
  }

  setReeling(value) { this.reeling = Boolean(value); }

  speciesWeights(sample = this.refreshSample()) {
    const s = this.state;
    const weights = s.bait === 'sandcrab' ? [.79, .15, .06] : s.bait === 'squid' ? [.45, .32, .23] : [.22, .42, .36];
    // Perch work the inside trough. Bass benefit from moving channel water;
    // halibut favor deeper, quieter sand beyond the breaking bar.
    weights[0] *= sample.habitat === 'trough' || sample.habitat === 'swash' ? 1.6 : sample.depth > 5 ? .25 : 1;
    weights[1] *= sample.habitat === 'channel' ? 1.8 : 1;
    weights[2] *= sample.depth > 2 && sample.breakStrength < .25 ? 1.65 : .72;
    return weights;
  }

  drift(dt) {
    const s = this.state;
    if (!s.cast) return;
    const sample = this.refreshSample(), hold = s.rig === 'fishfinder' ? .48 : .66;
    // Current fields are authored m/s; the scene uses 3.2 px per metre.
    s.cast.target.x = clamp(s.cast.target.x + sample.currentX * dt * 3.2 * hold, 24, this.world.width - 24);
    s.cast.target.y = clamp(s.cast.target.y + sample.currentY * dt * 3.2 * hold, this.world.minY + 20, this.world.shoreY(s.cast.target.x) - 8);
    s.cast.drift = {x: sample.currentX * hold, y: sample.currentY * hold};
    if (s.phase !== 'fighting') s.tension = clamp(.04 + Math.hypot(sample.currentX, sample.currentY) * .1 + sample.breakStrength * .07, 0, .3);
    this.refreshSample();
  }

  retrieve() {
    if (!['casting', 'waiting', 'bite'].includes(this.state.phase)) return this.result(false, '现在没有可以收回的空钓组。');
    this.clearLine();
    return this.result(true, '已收回钓组。重新挂饵后可以再次抛投。');
  }

  clearLine() {
    Object.assign(this.state, {phase: 'walk', cast: null, fish: null, lineDistance: 0, tension: 0, biteRemaining: 0, waitRemaining: 0, lineStress: 0, slackTime: 0});
    this.reeling = false;
  }

  resolveCatch(keep) {
    const s = this.state;
    if (s.phase !== 'landed' || !s.fish) return this.result(false, '还没有需要处理的鱼。');
    if (keep && s.catches.length >= 20) return this.result(false, '鱼袋已经装满了，先放流这条鱼，再回店出售。');
    const fish = safeFish(s.fish);
    s.lastCatch = {...fish, kept: Boolean(keep)};
    if (keep) {s.catches.push(fish); s.stats.kept++;} else s.stats.released++;
    this.clearLine();
    return this.result(true, keep ? `${fish.name}已放入鱼袋，回店出售可得 ${fish.value} 潮汐点。` : `${fish.name}游回浪里了。`, {fish});
  }

  equipBait(id) {
    if (!baitIds.includes(id)) return this.result(false, '没有这种鱼饵。');
    if (this.state.phase !== 'walk' || this.state.inspection) return this.result(false, '先收回钓组并处理当前事件，再换饵。');
    if (this.state.inventory[id] <= 0) return this.result(false, '这个鱼饵没有库存。');
    this.state.bait = id;
    return this.result(true, `已换上${BAITS.find(item => item.id === id).name}。`);
  }

  buy(id) {
    const s = this.state, item = SHOP_ITEMS.find(item => item.id === id);
    if (!this.nearShop) return this.result(false, '走到 Bait & Tackle 门口再交易。');
    if (!item) return this.result(false, '店里没有这件物品。');
    if (s.upgrades.includes(id)) return this.result(false, '这件装备已经买过并装配好了。');
    if (item.kind === 'free' && baitIds.some(id => s.inventory[id] > 0)) return this.result(false, '还有鱼饵可以使用；全部用完后再领取应急沙蟹。');
    if (s.credits < item.price) return this.result(false, '潮汐点不够。可以先带鱼回来出售。');
    if (item.kind === 'bait' && s.inventory[id] + item.quantity > 999) return this.result(false, '鱼饵盒已经装满了。');
    s.credits -= item.price;
    if (item.kind === 'bait') s.inventory[id] += item.quantity;
    else if (item.kind === 'free') {s.inventory.sandcrab += item.quantity; s.bait = 'sandcrab';}
    else {s.upgrades.push(id); if (item.kind === 'rig') s.rig = 'fishfinder';}
    return this.result(true, item.kind === 'free' ? '店主送你 3 只沙蟹，再去试试吧。' : `已购入${item.name}${item.kind === 'bait' ? ` ×${item.quantity}` : '，并自动装配'}。`);
  }

  sellCatch() {
    const s = this.state;
    if (!this.nearShop) return this.result(false, '带着鱼走回商店门口再出售。');
    const count = s.catches.length, total = s.catches.reduce((sum, fish) => sum + fish.value, 0);
    const debtPaid = Math.min(s.fineDebt, total);
    s.catches = []; s.fineDebt -= debtPaid; s.credits += total - debtPaid; s.stats.sold += count;
    return this.result(true, count ? `出售 ${count} 条鱼，获得 ${total} 潮汐点。${debtPaid ? `其中 ${debtPaid} 点用于偿还罚款${s.fineDebt ? `，尚欠 ${s.fineDebt} 点` : ''}。` : ''}` : '鱼袋还是空的，先去浪线试试手气。', {count, total, debtPaid});
  }

  update(dt, input = {}) {
    // Background tabs must not skip a bite window or simulate hours at once.
    dt = clamp(finite(dt), 0, .25);
    if (dt === 0) return;
    const count = Math.ceil(dt / .025), tick = dt / count;
    for (let index = 0; index < count; index++) this.tick(tick, input || {});
  }

  tick(dt, input) {
    const s = this.state;
    if (s.inspection) return;
    s.elapsed += dt;
    stepShoreLore(this);
    if (this.checkPier(dt)) return;
    if (s.phase === 'walk') {this.move(dt, input); this.refreshSample(); return;}
    s.player.walking = false;
    if (['waiting', 'bite', 'fighting'].includes(s.phase)) this.drift(dt);
    if (s.phase === 'casting') {
      s.cast.flight += dt;
      if (s.cast.flight >= s.cast.flightDuration) {s.cast.flight = s.cast.flightDuration; s.phase = 'waiting'; s.message = '钓组落水。等待竿尖点动，出现咬口后及时扬竿。';}
    } else if (s.phase === 'waiting') {
      s.waitRemaining -= dt;
      if (s.waitRemaining <= 0) {s.waitRemaining = 0; s.phase = 'bite'; s.biteRemaining = 3.2; s.message = '咬钩了！现在扬竿！';}
    } else if (s.phase === 'bite') {
      s.biteRemaining -= dt;
      if (s.biteRemaining <= 0) {s.stats.missed++; this.clearLine(); s.message = '这次咬口错过了，鱼带走了鱼饵。再抛一竿吧。';}
    } else if (s.phase === 'fighting') this.fight(dt, input.reel === undefined ? this.reeling : Boolean(input.reel));
  }

  move(dt, input) {
    const s = this.state, player = s.player;
    let mx = clamp(finite(input.x), -1, 1), my = clamp(finite(input.y), -1, 1);
    const manual = Math.hypot(mx, my) > .05;
    if (manual) {s.walkTarget = null; s.walkRoute = []; s.leavingPier = false;}
    else if (s.walkRoute.length) {
      const next = s.walkRoute[0], dx = next.x - player.x, dy = next.y - player.y;
      if (Math.hypot(dx, dy) < 2) {
        s.walkRoute.shift();
        if (!s.walkRoute.length && s.leavingPier) {this.ejectFromPier(); s.message = '已离开栈桥，回到沙滩。'; return;}
        if (!s.walkRoute.length) {s.walkTarget = null; s.message = this.nearShop ? 'Bait & Tackle：补充鱼饵、升级装备、出售渔获。' : this.canCast ? '这里可以抛投。调整方向，按住抛投蓄力。' : s.message;}
      } else {mx = dx; my = dy;}
    }
    const length = Math.hypot(mx, my), speed = 112;
    if (length > 0) {
      const step = Math.min(speed * dt, manual ? Infinity : length);
      const x = clamp(player.x + mx / Math.max(1, length) * step, 20, this.world.width - 20);
      const proposedY = player.y + my / Math.max(1, length) * step;
      const y = s.onPier ? proposedY : clamp(proposedY, this.world.shoreY(x) + 20, this.world.height - 25);
      const oldX = player.x, oldY = player.y;
      const valid = (tx, ty) => s.onPier ? onPier(this.scene, tx, ty, 5) : this.onSand(tx, ty);
      const clear = (a, b) => s.onPier ? this.pierSegmentClear(a, b) : segmentClear(this.building, a, b);
      if (valid(x, y) && clear(player, point(x, y))) {player.x = x; player.y = y;}
      else {
        if (valid(x, player.y) && clear(player, point(x, player.y))) player.x = x;
        if (valid(player.x, y) && clear(player, point(player.x, y))) player.y = y;
      }
      player.walking = Math.hypot(player.x - oldX, player.y - oldY) > .001;
      if (player.walking) player.facing = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 1 : 3) : (my > 0 ? 2 : -1);
    } else player.walking = false;
  }

  fight(dt, reel) {
    const s = this.state, fish = s.fish;
    s.fightElapsed += dt;
    const wave = Math.max(0, Math.sin(s.fightElapsed * .64 + fish.runOffset));
    fish.run = wave * fish.strength * (.3 + .7 * fish.stamina);
    const upgraded = s.upgrades.includes('sealed_reel');
    const sample = s.shoreSample || this.refreshSample();
    const surfLoad = (sample.breakStrength * .038 + Math.hypot(sample.currentX, sample.currentY) * .027) * (.6 + .4 * Math.sin(s.elapsed * 1.1) ** 2);
    s.tension = clamp(s.tension + ((reel ? .14 - (upgraded ? .025 : 0) : -.235) + fish.run * .155 + surfLoad) * dt, 0, 1);
    const retrieveSpeed = (upgraded ? 3.4 : 2.8) * (1 - Math.min(.6, fish.run * .47));
    s.lineDistance = Math.max(2.5, s.lineDistance + (fish.run * 1.45 - (reel ? retrieveSpeed : 0)) * dt);
    fish.stamina = Math.max(0, fish.stamina - (.009 + (reel ? .013 : 0)) * dt);
    s.lineStress = s.tension > .93 ? s.lineStress + dt : Math.max(0, s.lineStress - dt * 2);
    s.slackTime = s.tension < .045 ? s.slackTime + dt : 0;
    if (s.lineStress > 1.35 || s.lineDistance > 155) {
      this.clearLine(); s.message = '鱼线绷断了。下一次张力进入红区时，及时松开收线。';
    } else if (s.slackTime > 3) {
      this.clearLine(); s.message = '鱼线松弛太久，鱼脱钩了。适时收线，让钓线保持张力。';
    } else if (s.lineDistance <= 3 && fish.stamina <= .32) {
      s.phase = 'landed'; s.stats.caught++; s.tension = 0; fish.run = 0; this.reeling = false;
      s.message = `${fish.name}上岸了！${(fish.weightKg * 2.20462).toFixed(2)} lb。留在鱼袋里，或放回海里。`;
    }
  }

  snapshot() {
    const s = this.state;
    return JSON.parse(JSON.stringify({
      scene: this.scene.id, version: 2, elapsed: s.elapsed, credits: s.credits,
      inventory: s.inventory, bait: s.bait, upgrades: s.upgrades, catches: s.catches,
      stats: s.stats, nextCatchId: s.nextCatchId, player: {x: s.player.x, y: s.player.y},
      pendingCatch: s.phase === 'landed' ? s.fish : null,
      onPier: s.onPier, pierExposure: s.pierExposure, inspectionCount: s.inspectionCount,
      inspection: s.inspection, fineDebt: s.fineDebt, shoreLore:s.shoreLore,
    }));
  }

  restore(saved) {
    const s = this.state;
    s.elapsed = clamp(finite(saved.elapsed), 0, 1e9);
    s.credits = integer(saved.credits, 0, 1e7, 120);
    for (const id of baitIds) s.inventory[id] = integer(saved.inventory?.[id], 0, 999, id === 'sandcrab' ? 12 : 0);
    s.bait = baitIds.includes(saved.bait) ? saved.bait : 'sandcrab';
    s.upgrades = [...new Set(Array.isArray(saved.upgrades) ? saved.upgrades.filter(id => upgradeIds.includes(id)) : [])];
    s.rig = s.upgrades.includes('fishfinder_rig') ? 'fishfinder' : 'carolina';
    const seen = new Set();
    s.catches = (Array.isArray(saved.catches) ? saved.catches : []).map(safeFish).filter(fish => {
      if (!fish || seen.has(fish.catchId) || seen.size >= 20) return false;
      seen.add(fish.catchId); return true;
    });
    for (const key of statKeys) s.stats[key] = integer(saved.stats?.[key], 0, 1e8);
    s.nextCatchId = Math.max(integer(saved.nextCatchId, 1, 1e9, 1), ...s.catches.map(fish => fish.catchId + 1));
    const x = finite(saved.player?.x, this.scene.spawn.x), y = finite(saved.player?.y, this.scene.spawn.y);
    if (this.onSand(x, y)) {s.player.x = x; s.player.y = y;}
    if (saved.version >= 2) {
      s.fineDebt = integer(saved.fineDebt, 0, 1e7);
      s.inspectionCount = integer(saved.inspectionCount, 0, 1e8);
      s.pierExposure = clamp(finite(saved.pierExposure), 0, PIER_RULES.interval);
      if (this.scene.pier && saved.onPier === true && onPier(this.scene, x, y, 5)) {
        s.onPier = true; s.player.x = x; s.player.y = y;
      }
      if (this.scene.pier && saved.inspection && typeof saved.inspection === 'object') {
        const id = integer(saved.inspection.id, 1, 1e8, 1), paid = integer(saved.inspection.paid, 0, PIER_RULES.fine);
        s.inspectionCount = Math.max(id, s.inspectionCount);
        // Balances in the save already contain this fine: displaying a pending
        // notice must never apply it a second time or mint a pending fish.
        const confiscated=[...(Array.isArray(saved.inspection.confiscated)?saved.inspection.confiscated:[]),...s.catches].map(safeFish).filter(Boolean);s.catches=[];
        s.inspection = {id, fine: PIER_RULES.fine, paid, debt: PIER_RULES.fine - paid, exposure: s.pierExposure,confiscated,findings:[{location:'Pacifica Municipal Pier',code:'closed_pier_entry',detail:'翻越入口封闭围栏，进入维修期间禁止进入的栈桥。鱼警已将你带回入口。'}],
          message: `封闭栈桥检查已结算：罚款 ${PIER_RULES.fine} 潮汐点。${s.fineDebt ? `尚欠 ${s.fineDebt} 点。` : ''}请确认后继续。`};
        this.ejectFromPier();
      }
    }
    const pending = safeFish(saved.pendingCatch);
    if (s.inspection) s.message = s.inspection.message;
    else if (pending && !seen.has(pending.catchId)) {
      s.fish = pending; s.phase = 'landed'; s.nextCatchId = Math.max(s.nextCatchId, pending.catchId + 1);
      s.message = '这条鱼还在等你决定：留下，还是放流？';
    } else s.message = `欢迎回到 ${this.scene.name}。装备和渔获已恢复，沿浪线继续沙滩钓吧。`;
  }
}

// The historical name remains the controller's public API.
export {PacificaSimulation as ShoreSimulation};
