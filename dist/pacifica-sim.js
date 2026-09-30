import {BAITS,SHOP_ITEMS,restoreShoreEquipment,shoreReady,shoreSupply,wearShoreSupplies,configureShoreEquipment,shoreSlots,moveShoreSlot} from './shore-equipment.js';
import {createShoreLore,stepShoreLore,talkShoreAngler} from './shore-lore.js';
import {createShoreRegular,serializeRegular,stepShoreRegular,regularStimuli,regularBite,talkRegular} from './shore-regular.js';
import {fishSpecies,normalizeFishIdentity} from './fish-species.js';
// Shared shore-fishing simulation. Geometry and habitats are scene specific;
// prices, bite rates, inspection odds and fines are authored game tuning.
import {getShoreScene, sampleShore, onPier} from './shore-data.js';
import {shoreEncounterRates,shoreSuitability,shoreFeeding,shoreBaitAppeal,shoreBaitFlash,SHORE_BAIT_SCENT,SHORE_POPULATION_SPECIES} from './shore-fish-ecology.js';
import {createPopulation,restorePopulation,serializePopulation,stepPopulation,resolveBite,disturb} from './fish-population.js';
import {assessShoreCatch,shoreFindingDetail} from './shore-regulations.js';
import {shorePresentation,stepShorePresentation} from './shore-presentation.js';
import {shoreFishPosition} from './shore-line-geometry.js';
import {createShoreCast} from './shore-casting.js';
import {gameCalendar,gameSeconds} from './game-clock.js';
import {climateSeaState} from './shore-surf.js';
import {formatLength,formatWeight} from './units.js';
import {SHORE_RIG_PHYSICS} from './shore-presentation.js';
export const SAVE_KEY = 'pacifica-surf-save-v1';
export const WORLD = getShoreScene('pacifica').world;
export const SHOP = getShoreScene('pacifica').shop;
// One roll per pier visit: 10% of visits meet a patrol at a random moment
// 20–150 active seconds after climbing on. Being caught costs every carried fish.
export const PIER_RULES = Object.freeze({catchChance: .1, earliestSeconds: 20, latestSeconds: 150});
export const WARDEN_RULES = Object.freeze({firstAfter: [240, 540], between: [420, 900], speed: 70, reach: 42});
export const PIXELS_PER_METRE = 3.2;
export {BAITS,SHOP_ITEMS} from './shore-equipment.js';
// Length–weight relations W(g) = a·L(cm)^b are representative published-style
// coefficients rounded for play; individual condition varies about ±8%.
const species = (row) => Object.freeze({...normalizeFishIdentity(row),
  minKg: Math.round(row.lw[0] * row.lengthCm[0] ** row.lw[1] * .9) / 1000,
  maxKg: Math.round(row.lw[0] * row.lengthCm[1] ** row.lw[1] * 1.1) / 1000});
// Identity (names, scientific name) comes from the shared catalogue; the
// ecology key `id` stays local. Old saves' `surfperch` was the redtail.
export const SPECIES = Object.freeze([
  species({id: 'surfperch', speciesId: 'barred_surfperch', lengthCm: [15, 43], lw: [.025, 3], baseValue: 15, valuePerKg: 13, strength: .65, color: '#eac896'}),
  species({id: 'striped_bass', speciesId: 'striped_bass', lengthCm: [35, 90], lw: [.0095, 3.09], baseValue: 25, valuePerKg: 12, strength: 1.05, color: '#b9d2cc'}),
  species({id: 'halibut', speciesId: 'california_halibut', lengthCm: [33, 90], lw: [.0086, 3.12], baseValue: 30, valuePerKg: 14, strength: .88, color: '#bca176'}),
  species({id: 'white_croaker', speciesId: 'white_croaker', lengthCm: [14, 35], lw: [.0101, 3.1], baseValue: 5, valuePerKg: 12, strength: .25, color: '#c4bb95'}),
  species({id: 'jacksmelt', speciesId: 'jacksmelt', lengthCm: [18, 44], lw: [.0045, 3.1], baseValue: 4, valuePerKg: 12, strength: .3, color: '#b5cfce'}),
  // Surfperch family (CDFW maximum sizes): redtail 16 in, calico 12, silver 10.5,
  // walleye 12, shiner 7, pile 17.5, striped seaperch 15.3. Old saves' plain
  // `surfperch` catches resolve to the redtail entry through the catalogue.
  species({id: 'redtail_surfperch', speciesId: 'redtail_surfperch', lengthCm: [18, 41], lw: [.025, 3], baseValue: 15, valuePerKg: 13, strength: .7, color: '#e6b98f'}),
  species({id: 'calico_surfperch', speciesId: 'calico_surfperch', lengthCm: [14, 30], lw: [.026, 3], baseValue: 11, valuePerKg: 13, strength: .55, color: '#d9c49a'}),
  species({id: 'silver_surfperch', speciesId: 'silver_surfperch', lengthCm: [11, 27], lw: [.022, 3], baseValue: 6, valuePerKg: 12, strength: .35, color: '#d8dfd4'}),
  species({id: 'walleye_surfperch', speciesId: 'walleye_surfperch', lengthCm: [13, 30], lw: [.021, 3], baseValue: 7, valuePerKg: 12, strength: .4, color: '#c9d2cf'}),
  species({id: 'shiner_perch', speciesId: 'shiner_perch', lengthCm: [7, 18], lw: [.018, 3], baseValue: 2, valuePerKg: 10, strength: .2, color: '#d9d5b0'}),
  species({id: 'pile_perch', speciesId: 'pile_perch', lengthCm: [20, 44], lw: [.03, 3], baseValue: 14, valuePerKg: 12, strength: .85, color: '#9aa39a'}),
  species({id: 'striped_seaperch', speciesId: 'striped_seaperch', lengthCm: [18, 39], lw: [.027, 3], baseValue: 14, valuePerKg: 12, strength: .75, color: '#c28a5c'}),
]);
export const fishWeightKg = (sp, lengthCm, condition = 1) => sp.lw[0] * lengthCm ** sp.lw[1] * condition / 1000;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const integer = (value, low, high, fallback = 0) => Math.floor(clamp(finite(value, fallback), low, high));
const baitIds = BAITS.map(item => item.id);
const upgradeIds = SHOP_ITEMS.filter(item => ['rod','reel','rig','book'].includes(item.kind)).map(item => item.id);
// Small fish can be swung in without first tiring them out.
const SMALL_FISH = new Set(['white_croaker', 'jacksmelt', 'silver_surfperch', 'walleye_surfperch', 'shiner_perch', 'calico_surfperch']);
const statKeys = ['caught', 'kept', 'released', 'sold', 'casts', 'missed'];
const saveVersions = [1, 2, 3, 4];
const catchStatuses = new Set(['kept', 'released', 'sold', 'confiscated']);
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
  const identity = fishSpecies(raw), species = SPECIES.find(item => item.speciesId === identity?.id);
  const mass = Number.isFinite(raw.weightKg) ? raw.weightKg : raw.kg;
  if (!species || !Number.isFinite(mass)) return null;
  const weightKg = Math.round(clamp(mass, species.minKg, species.maxKg) * 100) / 100;
  // A measured length is kept; records without one stay unrecorded (never invented).
  const rawLength = Number.isFinite(raw.length) ? raw.length : raw.lengthCm;
  const hasLength = Number.isFinite(rawLength) && rawLength > 0 && rawLength <= 1000;
  return normalizeFishIdentity({
    id: species.id, speciesId: species.speciesId, color: species.color,
    catchId: integer(raw.catchId, 1, 1e9, 1), weightKg, kg: weightKg,
    ...(hasLength ? {length: Math.round(rawLength * 10) / 10, lengthType: raw.lengthType === 'fork' ? 'fork' : 'total', ...(raw.lengthSource === 'mass-model' ? {lengthSource: 'mass-model'} : {})} : {}),
    caughtDate: typeof raw.caughtDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.caughtDate) ? raw.caughtDate : null,
    value: Math.round(species.baseValue + weightKg * species.valuePerKg),
    strength: species.strength, stamina: 0, run: 0,
  });
}

export class PacificaSimulation {
  constructor({sceneId = 'pacifica', saved, rng = Math.random, loreSeed, seaState = null, date = new Date().toISOString().slice(0,10), regular = true} = {}) {
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
      inventory: {sandcrab: 12, squid: 0, anchovy: 0, sandworm: 0, mussel: 0}, bait: 'sandcrab', rig: 'carolina', upgrades: [],
      catches: [], catchHistory: [], lastCatch: null, stats: Object.fromEntries(statKeys.map(key => [key, 0])),
      cast: null, lineDistance: 0, tension: 0, fish: null,
      biteRemaining: 0, fightElapsed: 0, lineStress: 0, slackTime: 0,
      encounter: null, biteSpeciesId: null, biteLengthCm: null, presentation: null, castId: 0, soakSeconds: 0,
      keptLog: [], warden: null, wardenNextAt: null, pierVisit: null,
      fishingDate: /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))?date:new Date().toISOString().slice(0,10),
      seaState: seaState && typeof seaState==='object' ? {...seaState} : null,
      walkTarget: null, walkRoute: [],
      message: '',
      nextCatchId: 1,
      onPier: false, leavingPier: false, inspectionCount: 0, inspection: null, fineDebt: 0,
      shoreSample: null,
    };
    if (saved?.scene === this.scene.id && saveVersions.includes(saved.version)) this.restore(saved);
    restoreShoreEquipment(this.state,saved?.scene===this.scene.id&&saveVersions.includes(saved.version)?saved:null);
    this.state.shoreLore=createShoreLore(this.scene,saved?.scene===this.scene.id?saved.shoreLore:null,this.state.elapsed,loreSeed);
    // Sharp Park's regular angler keeps his own random stream too.
    this.state.regular=regular?createShoreRegular(this.scene,saved?.scene===this.scene.id?saved.regular:null,(this.state.shoreLore.rngState^0x2545f491)>>>0):null;
    // Fish live in their own saved random stream, so reloading cannot reroll them.
    const savedPopulation = saved?.scene === this.scene.id && saved.population?.version === 1 ? saved.population : null;
    this.population = savedPopulation ? restorePopulation(savedPopulation, 1, SHORE_POPULATION_SPECIES.map(d => d.id))
      : createPopulation(Math.floor(this.random() * 4294967295) + 1);
    this.updateSea(true);
    this.refreshSample();
  }

  // The day's sea follows the scene's buoy climate for the trip date unless a
  // fixed scenario was supplied (tests, QA). Climate states carry climate:true.
  updateSea(force = false) {
    const s = this.state;
    if (s.seaState && !s.seaState.climate) return;
    if (!force && s.seaState && s.elapsed - (this.seaAt ?? -Infinity) < 5) return;
    this.seaAt = s.elapsed;
    s.seaState = climateSeaState(this.scene.id, this.calendarDate(), 6 + gameSeconds(s.elapsed) / 3600);
  }

  talkAngler(id){return talkShoreAngler(this,id);}
  talkRegular(options){return talkRegular(this,options);}

  random() { return clamp(finite(this.rng(), .5), 0, .999999); }

  recordCatch(fish, status) {
    const s = this.state, clean = safeFish(fish);
    if (!clean || !catchStatuses.has(status)) return null;
    const index = s.catchHistory.findIndex(record => record.catchId === clean.catchId), previous = s.catchHistory[index];
    // A terminal record cannot become inventory again after a stale save or
    // pending-catch retry. Recording never awards points or increments stats.
    if (previous && previous.status !== 'kept') return previous;
    const record = {...clean, status, kept: status !== 'released', recordedAtElapsed: previous?.recordedAtElapsed ?? s.elapsed};
    if (index < 0) s.catchHistory.push(record); else s.catchHistory[index] = record;
    if (s.lastCatch?.catchId === clean.catchId) s.lastCatch = {...record};
    s.nextCatchId = Math.max(s.nextCatchId, clean.catchId + 1);
    return record;
  }

  get nearShop() {
    return !this.state.inspection && this.state.phase === 'walk' && Math.hypot(this.state.player.x - this.shop.door.x, this.state.player.y - this.shop.door.y) <= 88;
  }

  get canCast() {
    const s = this.state, offset = s.player.y - this.world.shoreY(s.player.x);
    return !s.inspection && s.phase === 'walk' && (s.onPier || offset >= 19.9 && offset <= 130) && shoreReady(s);
  }

  get nearPier() {
    const pier = this.scene.pier, s = this.state;
    return Boolean(pier && !s.onPier && !s.inspection && s.phase === 'walk' && Math.hypot(s.player.x - pier.gate.x, s.player.y - pier.gate.y) <= 72);
  }

  get onPier() { return this.state.onPier; }

  // The repair fence closes the pier's landward ramp; the beach under the deck
  // near the water stays open.
  behindPierFence(x, y) {
    const pier = this.scene.pier;
    if (!pier) return false;
    return Math.abs(x - pier.x) <= pier.width / 2 && y >= pier.entry.y - 5 && y <= pier.gate.y - 6;
  }

  onSand(x, y) {
    return x >= 20 && x <= this.world.width - 20 && y >= this.world.shoreY(x) + 20 && y <= this.world.height - 25 && !inBuilding(this.building, x, y);
  }

  refreshSample() {
    const s = this.state, p = s.cast?.target || {x: s.player.x, y: this.world.shoreY(s.player.x) - 90};
    s.shoreSample = sampleShore(this.scene, p.x, p.y, s.elapsed, s.seaState || {});
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
    if (this.scene.pier && onPier(this.scene, x, y) && y < this.world.shoreY(x) + 20) return this.result(false, '栈桥入口被维修围栏挡住了。');
    x = clamp(x, 20, this.world.width - 20);
    y = clamp(y, this.world.shoreY(x) + 20, this.world.height - 25);
    if (inBuilding(this.building, x, y)) return this.result(false, '商店入口在建筑下方，走到门前即可交易。');
    const target = point(x, y), route = routeAroundShop(this.building, s.player, target);
    if (!route.length) return this.result(false, '这里暂时无法到达。');
    s.walkTarget = target; s.walkRoute = route;
    return this.result(true, '');
  }

  enterPier() {
    if (!this.nearPier) return this.result(false, '围栏挡住了去路。');
    const s = this.state;
    s.onPier = true; s.player.x = this.scene.pier.entry.x; s.player.y = this.scene.pier.entry.y;
    s.walkTarget = null; s.walkRoute = []; s.player.walking = false; s.pierPush = 0;
    const caught = this.random() < PIER_RULES.catchChance;
    s.pierVisit = {time: 0, patrolAt: caught ? PIER_RULES.earliestSeconds + this.random() * (PIER_RULES.latestSeconds - PIER_RULES.earliestSeconds) : null};
    this.refreshSample();
    return this.result(true, '你从围栏的缝隙挤上了旧栈桥。');
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
    return this.result(true, '');
  }

  leavePier() {
    const s = this.state;
    if (!s.onPier || s.inspection || s.phase !== 'walk') return this.result(false, '先收回钓线并处理渔获，再沿桥面离开。');
    return this.walkPierTo(this.scene.pier.entry.x, this.scene.pier.entry.y, true);
  }

  ejectFromPier() {
    const s = this.state;
    s.onPier = false; s.leavingPier = false; s.pierVisit = null;
    Object.assign(s.player, this.scene.pier.gate, {walking: false});
    s.walkTarget = null; s.walkRoute = [];
    this.refreshSample();
  }

  checkPier(dt) {
    const s = this.state;
    if (!s.onPier || s.inspection || s.phase === 'landed') return false;
    s.pierVisit ??= {time: 0, patrolAt: null};
    s.pierVisit.time += dt;
    if (s.pierVisit.patrolAt === null || s.pierVisit.time < s.pierVisit.patrolAt) return false;
    // Caught on the closed pier: every carried fish is confiscated. No fine.
    s.inspectionCount++;
    const confiscated = s.catches.map(f => this.recordCatch(f, 'confiscated')).filter(Boolean).map(f => ({...f})); s.catches = [];
    this.clearLine(); this.ejectFromPier();
    s.inspection = {id: s.inspectionCount, kind: 'pier', fine: 0, paid: 0, debt: 0, confiscated,
      findings: [{location: 'Pacifica Municipal Pier', code: 'closed_pier_entry', detail: '维修期间封闭的栈桥禁止进入。巡查员没收了你携带的全部鱼获，并把你带回入口。'}],
      message: `巡查员在封闭栈桥上拦下了你，没收全部 ${confiscated.length} 尾鱼获，已带回入口。`};
    s.message = s.inspection.message;
    return true;
  }

  acknowledgeInspection() {
    if (!this.state.inspection) return this.result(false, '当前没有待确认的检查。');
    this.state.inspection = null;
    return this.result(true, '检查已结束，可以留在沙滩继续钓鱼。');
  }

  previewCast(options = {}) {return createShoreCast(this.scene,this.state,options);}

  cast({power = 0, aim = 0} = {}) {
    const s = this.state;
    if (s.inspection) return this.result(false, '先确认本次检查结果。');
    if (s.phase !== 'walk') return this.result(false, '钓线已经在水里。');
    if (!shoreReady(s)) return this.result(false, '先在鱼竿配置里装好钓组和可用鱼饵。');
    if (!this.canCast) return this.result(false, '再靠近一些浪线，站在干沙上抛投。');
    const planned=this.previewCast({power,aim});
    s.stats.casts++;
    s.phase = 'casting'; s.walkTarget = null; s.walkRoute = []; s.player.walking = false; s.player.facing = -1;
    s.cast = planned;
    s.lineDistance = planned.distance; s.tension = 0; s.fish = null; s.lastCatch = null;
    const sample = this.refreshSample();
    s.presentation = shorePresentation(sample, shoreSupply(s).id, 0);
    // Each cast is a new bait in the water with a fresh, short scent plume.
    s.castId++; s.soakSeconds = 0;
    s.encounter = this.encounterRates(sample); s.biteSpeciesId = null; s.biteLengthCm = null;
    s.biteRemaining = 0; this.reeling = false;
    return this.result(true, planned.loadRatio>1?'钓组超出竿的抛重范围，挥竿距离受限；可换轻组或长竿。':`抛出约 ${Math.round(planned.distance*3.28084)} ft${planned.landing==='water'?'。':'，这一竿可能够不到水面。'}`);
  }

  strike() {
    const s = this.state;
    if (s.phase !== 'bite') return this.result(false, s.phase === 'waiting' ? '还没咬钩，留意竿尖与提示。' : '等鱼真正咬钩时再扬竿。');
    // The visitor is chosen at the encounter, not rerolled when the player strikes.
    const species = SPECIES.find(fish=>fish.id===s.biteSpeciesId);
    if (!species) return this.result(false, '还没有真实鱼讯，继续观察竿尖。');
    // The fish that bit belongs to a real school; its size comes from that cohort.
    const lengthCm = clamp(finite(s.biteLengthCm, (species.lengthCm[0] + species.lengthCm[1]) / 2), species.lengthCm[0], species.lengthCm[1]);
    const weightKg = Math.round(fishWeightKg(species, lengthCm, .92 + this.random() * .16) * 100) / 100;
    resolveBite(this.population, 'hooked', SHORE_POPULATION_SPECIES);
    s.fish = {...safeFish({id: species.id, speciesId: species.speciesId, weightKg, length: lengthCm, lengthType: 'total', catchId: s.nextCatchId++, caughtDate: this.calendarDate()}), stamina: 1, run: 0, runOffset: this.random() * Math.PI * 2};
    s.cast.fightDistance = Math.max(1,s.lineDistance);
    s.phase = 'fighting'; s.tension = .33; s.biteRemaining = 0; s.fightElapsed = 0; s.lineStress = 0; s.slackTime = 0;
    return this.result(true, '中鱼！按住收线；张力过高就松开，让鱼冲一阵。');
  }

  setReeling(value) { this.reeling = Boolean(value); }

  encounterRates(sample = this.refreshSample()) {
    const s=this.state,supply=shoreSupply(s);
    const calendar=gameCalendar(s.fishingDate,s.elapsed);
    return shoreEncounterRates({sample,bait:supply?.bait?.kind,rig:supply?.id,
      baitCondition:supply?.bait?.condition||0,month:calendar.getUTCMonth()+1,
      hour:calendar.getUTCHours()+calendar.getUTCMinutes()/60,
      presentation:s.presentation||{bottomContact:0,stability:0}});
  }

  speciesWeights(sample = this.refreshSample()) {
    const rates=this.encounterRates(sample);
    return SPECIES.map(fish=>rates.perSpecies.find(row=>row.id===fish.id)?.ratePerSecond||0);
  }

  calendar() { return gameCalendar(this.state.fishingDate, this.state.elapsed); }
  calendarDate() { return this.calendar().toISOString().slice(0, 10); }

  // Engine plane: x metres along the beach, y metres offshore from the shoreline.
  toPlane(x, y) { return {x: x / PIXELS_PER_METRE, y: (this.world.shoreY(x) - y) / PIXELS_PER_METRE}; }
  fromPlane(x, y) { const px = x * PIXELS_PER_METRE; return {x: px, y: this.world.shoreY(px) - y * PIXELS_PER_METRE}; }
  fishEnv(x, y) {
    const p = this.fromPlane(x, y);
    if (y < .3 || p.x < 20 || p.x > this.world.width - 20) return {water: false, depth: 0};
    const sample = sampleShore(this.scene, p.x, p.y, this.state.elapsed, this.state.seaState || {}, {surf: false});
    return {water: true, depth: sample.depth, currentX: sample.currentX, currentY: -sample.currentY, sample};
  }

  fishWorld() {
    const s = this.state, calendar = this.calendar(), month = calendar.getUTCMonth() + 1, hour = calendar.getUTCHours() + calendar.getUTCMinutes() / 60;
    const supply = shoreSupply(s), bait = supply?.bait?.kind, condition = supply?.bait?.condition || 0;
    const target = s.cast?.target, center = target && s.phase !== 'casting' ? this.toPlane(target.x, target.y) : {x: s.player.x / PIXELS_PER_METRE, y: 35};
    let stimulus = null;
    if (target && ['waiting', 'bite'].includes(s.phase) && condition > .08 && bait) {
      const sample = s.shoreSample || this.refreshSample(), p = s.presentation || {depth: 0};
      const submerged = clamp(finite(p.depth) / .2, 0, 1);
      stimulus = {id: s.castId, ...this.toPlane(target.x, target.y), depth: finite(p.depth),
        scent: (SHORE_BAIT_SCENT[bait] || .5) * condition ** 1.25 * submerged, flash: shoreBaitFlash(supply.id, bait) * submerged, motion: supply.id === 'float_rig' ? .15 : .05,
        soakSeconds: s.soakSeconds, currentX: sample.currentX, currentY: -sample.currentY,
        appeal: def => shoreBaitAppeal(def.id, {bait, rig: supply.id, baitCondition: condition, presentation: s.presentation})};
    }
    const daylight = clamp(Math.sin((hour - 5.3) * Math.PI / 13.9) * 1.4, .1, 1);
    return {species: SHORE_POPULATION_SPECIES, center, radius: 110, cellSize: 4, stimulus, stimuli: regularStimuli(this),
      env: (x, y) => this.fishEnv(x, y),
      suitability: (def, x, y) => { const e = this.fishEnv(x, y); return e.water ? shoreSuitability(def.id, e.sample, {month}) : 0; },
      feeding: def => .35 + .65 * shoreFeeding(def.id, hour), light: daylight,
      turbidity: (x, y) => this.fishEnv(x, y).sample?.turbidity || 0,
      mixing: finite(s.shoreSample?.whitewater)};
  }

  stepFish(dt) {
    const s = this.state, events = stepPopulation(this.population, dt, this.fishWorld());
    for (const event of events) {
      // Bites and nibbles on someone else's bait (the regular's) are his.
      if (event.stimulus != null) { if (event.type === 'bite') regularBite(this, event); continue; }
      if (event.type === 'nibble' && s.phase === 'waiting') s.nibbleAt = s.elapsed;
      if (event.type !== 'bite') continue;
      if (s.phase !== 'waiting') { resolveBite(this.population, 'refused', SHORE_POPULATION_SPECIES); continue; }
      s.biteSpeciesId = event.species; s.biteLengthCm = event.lengthCm;
      s.phase = 'bite'; wearShoreSupplies(s, 'bite'); s.biteRemaining = 3.2;
      s.message = '咬钩了！现在扬竿！';
    }
  }

  drift(dt) {
    const s = this.state;
    if (!s.cast) return;
    const sample = this.refreshSample(), supply=shoreSupply(s);
    s.presentation=stepShorePresentation(s.presentation,sample,supply?.id,dt);
    // Mean current and wave orbital motion act on the same terminal tackle.
    s.cast.target.x = clamp(s.cast.target.x + s.presentation.driftX * dt * 3.2, 24, this.world.width - 24);
    s.cast.target.y = Math.max(this.world.minY + 20,s.cast.target.y + s.presentation.driftY * dt * 3.2);
    if(s.cast.target.y>=this.world.shoreY(s.cast.target.x)){
      this.clearLine();s.message='钓组随浪搁上浅滩，已收回；重新选择落点。';return;
    }
    s.cast.drift = {x: s.presentation.driftX, y: s.presentation.driftY};
    if (s.phase !== 'fighting') {
      s.lineDistance=Math.hypot(s.cast.target.x-s.cast.origin.x,s.cast.target.y-s.cast.origin.y)/3.2;
      s.tension = clamp(.04 + Math.hypot(sample.currentX, sample.currentY) * .1 + finite(sample.waveLoad) * .12, 0, .35);
      // Natural bait slowly washes out. Retrieving preserves actual condition.
      if(supply?.bait) supply.bait.condition=Math.max(0,supply.bait.condition-dt*(1/2400+finite(sample.whitewater)/1800));
    }
    this.refreshSample();
  }

  retrieve() {
    if (!['casting', 'waiting', 'bite'].includes(this.state.phase)) return this.result(false, '现在没有可以收回的空钓组。');
    this.clearLine();
    return this.result(true, '');
  }

  clearLine() {
    if (this.state.phase === 'bite') resolveBite(this.population, 'missed', SHORE_POPULATION_SPECIES);
    Object.assign(this.state, {phase: 'walk', cast: null, fish: null, lineDistance: 0, tension: 0, biteRemaining: 0, lineStress: 0, slackTime: 0, presentation:null,encounter:null,biteSpeciesId:null,biteLengthCm:null,soakSeconds:0});
    this.reeling = false;
  }

  resolveCatch(keep) {
    const s = this.state;
    if (s.phase !== 'landed' || !s.fish) return this.result(false, '还没有需要处理的鱼。');
    if (s.catchHistory.some(record => record.catchId === s.fish.catchId)) return this.result(false, '这条鱼已经记录，不能重复处理。');
    if (keep && s.catches.length >= 20) return this.result(false, '鱼袋已经装满了，先放流这条鱼，再回店出售。');
    const fish = safeFish(s.fish);
    if (!fish) return this.result(false, '鱼获资料无效，无法处理。');
    s.lastCatch = {...this.recordCatch(fish, keep ? 'kept' : 'released')};
    if (keep) {
      s.catches.push(fish); s.stats.kept++;
      s.keptLog.push({catchId: fish.catchId, species: fish.id, date: fish.caughtDate || this.calendarDate()});
      s.keptLog = s.keptLog.slice(-300);
    } else s.stats.released++;
    this.clearLine();
    return this.result(true, keep ? `${fish.name}（${fish.length ? formatLength(fish.length) : '长度未记录'}）已放入鱼袋，回店出售可得 ${fish.value} 潮汐点。` : `${fish.name}（${fish.length ? formatLength(fish.length) : '长度未记录'}）游回浪里了。`, {fish});
  }

  get tackleReady(){return shoreReady(this.state);}
  equipBait(id){return configureShoreEquipment(this,id);}
  configureEquipment(id,rodId){return configureShoreEquipment(this,id,rodId);}
  inventorySlots(){return shoreSlots(this.state);}
  moveInventory(from,to){return moveShoreSlot(this.state,from,to);}

  buy(id) {
    const s = this.state, item = SHOP_ITEMS.find(item => item.id === id);
    if (!this.nearShop) return this.result(false, '走到 Bait & Tackle 门口再交易。');
    if (!item) return this.result(false, '店里没有这件物品。');
    if (['rod','reel','book'].includes(item.kind)&&s.upgrades.includes(id)) return this.result(false, '已经拥有这件装备。');
    if (s.credits < item.price) return this.result(false, '潮汐点不够。可以先带鱼回来出售。');
    if (item.kind === 'bait' && s.inventory[id] + item.quantity > 999) return this.result(false, '鱼饵盒已经装满了。');
    if(item.kind==='rig'&&s.rigStock[id].length>=999)return this.result(false,'备用钓组已满。');
    s.credits -= item.price;
    if (item.kind === 'bait') s.inventory[id] += item.quantity;
    else if(item.kind==='rig')s.rigStock[id].push({id,condition:1,bait:null});
    else {s.upgrades.push(id);if(item.kind==='rod')s.rodSupplies[id]=null;}
    shoreSlots(s);
    return this.result(true,`已购入${item.name}${item.kind==='bait'?` ×${item.quantity}`:''}，已放入背包。`);
  }

  sellCatch() {
    const s = this.state;
    if (!this.nearShop) return this.result(false, '带着鱼走回商店门口再出售。');
    const count = s.catches.length, total = s.catches.reduce((sum, fish) => sum + fish.value, 0);
    const debtPaid = Math.min(s.fineDebt, total);
    for (const fish of s.catches) this.recordCatch(fish, 'sold');
    s.catches = []; s.fineDebt -= debtPaid; s.credits += total - debtPaid; s.stats.sold += count;
    return this.result(true, count ? `出售 ${count} 条鱼，获得 ${total} 潮汐点。${debtPaid ? `其中 ${debtPaid} 点用于偿还罚款${s.fineDebt ? `，尚欠 ${s.fineDebt} 点` : ''}。` : ''}` : '鱼袋还是空的，先去浪线试试手气。', {count, total, debtPaid});
  }

  // A fisheries warden walks the beach now and then and checks the carried
  // catch against the same rules as the handbook. Anglers on the closed pier are
  // outside the warden's beat (the pier has its own patrol).
  stepWarden(dt) {
    const s = this.state, rules = WARDEN_RULES;
    s.wardenNextAt ??= s.elapsed + rules.firstAfter[0] + this.random() * (rules.firstAfter[1] - rules.firstAfter[0]);
    if (!s.warden) {
      if (s.elapsed < s.wardenNextAt || s.onPier || s.inspection) return;
      const side = this.random() < .5 ? -1 : 1, x = clamp(s.player.x + side * (280 + this.random() * 180), 40, this.world.width - 40);
      s.warden = {x, y: clamp(this.world.shoreY(x) + 150, this.world.shoreY(x) + 25, this.world.height - 30), phase: 'approach', walking: true, age: 0};
      return;
    }
    const w = s.warden; w.age += dt;
    const leaving = w.phase === 'leave' || s.onPier || w.age > 240;
    if (leaving) w.phase = 'leave';
    const tx = leaving ? (w.exitX ??= w.x + (w.x < s.player.x ? -700 : 700)) : s.player.x, ty = leaving ? w.y : s.player.y + 6;
    const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy), step = rules.speed * dt;
    if (d > 1) {w.x += dx / d * Math.min(step, d); w.y += dy / d * Math.min(step, d); w.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : -1);}
    if (leaving) {
      if (d < 4 || w.x < 20 || w.x > this.world.width - 20) {s.warden = null; s.wardenNextAt = s.elapsed + rules.between[0] + this.random() * (rules.between[1] - rules.between[0]);}
      return;
    }
    // The check waits until any fish on the line is dealt with.
    if (Math.hypot(s.player.x - w.x, s.player.y - w.y) <= rules.reach && ['walk', 'waiting', 'casting'].includes(s.phase)) {
      w.phase = 'leave'; this.wardenInspect();
    }
  }

  wardenInspect() {
    const s = this.state, assessment = assessShoreCatch(s.catches, s.keptLog);
    if (!assessment.findings.length) {
      s.message = s.catches.length ? `鱼警检查了鱼篓里的 ${s.catches.length} 尾鱼：尺寸和数量都合规。` : '鱼警打了个招呼，看了看空鱼篓。';
      return this.result(true, s.message, {clear: true});
    }
    this.clearLine();
    const confiscated = s.catches.map(f => this.recordCatch(f, 'confiscated')).filter(Boolean).map(f => ({...f})); s.catches = [];
    const paid = Math.min(s.credits, assessment.fine), debt = assessment.fine - paid;
    s.credits -= paid; s.fineDebt += debt; s.inspectionCount++;
    const findings = assessment.findings.map(f => { const index = confiscated.findIndex(c => c.catchId === f.catchId), fish = confiscated[index];
      return {catchId: f.catchId, catchNumber: index + 1, fishName: fish ? `${fish.name} · ${fish.nameEn}` : '鱼获', code: f.code, detail: shoreFindingDetail(f)}; });
    s.inspection = {id: s.inspectionCount, kind: 'beach', fine: assessment.fine, paid, debt, confiscated, findings,
      message: `鱼警查出 ${assessment.violatingFish} 尾违规鱼获：罚款 ${assessment.fine} 潮汐点，没收全部 ${confiscated.length} 尾。`};
    s.message = s.inspection.message;
    return this.result(false, s.message);
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
    this.updateSea();
    stepShoreLore(this);
    if (this.checkPier(dt)) return;
    this.stepFish(dt);
    stepShoreRegular(this, dt);
    this.stepWarden(dt);
    if (s.inspection) return;
    if (s.phase === 'walk') {this.move(dt, input); this.refreshSample(); return;}
    s.player.walking = false;
    if (['waiting', 'bite'].includes(s.phase)) this.drift(dt);
    if (s.phase === 'casting') {
      s.cast.flight += dt;
      if (s.cast.flight >= s.cast.flightDuration) {
        if(s.cast.landing!=='water'){
          const landing=s.cast.landing;this.clearLine();
          s.message=landing==='pier'?'钓组落在桥面，已收回。靠近栏边并调整方向再抛。':landing==='boundary'?'钓组越出可游玩的海岸范围，已收回。':'这一竿落在沙上，已收回。走近浪线，或多蓄一点力。';
          return;
        }
        s.cast.flight = s.cast.flightDuration; s.phase = 'waiting';
        // The sinker's splash briefly spooks wary fish right where it lands.
        const splash = this.toPlane(s.cast.target.x, s.cast.target.y), grams = SHORE_RIG_PHYSICS[shoreSupply(s)?.id]?.sinkerGrams || 28;
        disturb(this.population, {...splash, radius: 1.5 + grams / 25, strength: .7}, SHORE_POPULATION_SPECIES);
        s.message = '';
      }
    } else if (s.phase === 'waiting') {
      s.soakSeconds += dt;
    } else if (s.phase === 'bite') {
      s.biteRemaining -= dt;
      if (s.biteRemaining <= 0) {s.stats.missed++; this.clearLine(); s.message = '这次咬口错过了，收回后检查余饵。';}
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
        if (!s.walkRoute.length && s.leavingPier) {this.ejectFromPier(); return;}
        if (!s.walkRoute.length) s.walkTarget = null;
      } else {mx = dx; my = dy;}
    }
    // Undocumented: leaning on the closed gate long enough finds the gap in it.
    const gate = this.scene.pier?.gate;
    if (gate && !s.onPier && manual && my < -.5 && Math.hypot(player.x - gate.x, player.y - gate.y) <= 30) {
      s.pierPush = (s.pierPush || 0) + dt;
      if (s.pierPush >= 1.2) {this.enterPier(); return;}
    } else s.pierPush = 0;
    const length = Math.hypot(mx, my), speed = 112;
    if (length > 0) {
      const step = Math.min(speed * dt, manual ? Infinity : length);
      const x = clamp(player.x + mx / Math.max(1, length) * step, 20, this.world.width - 20);
      const proposedY = player.y + my / Math.max(1, length) * step;
      const y = s.onPier ? proposedY : clamp(proposedY, this.world.shoreY(x) + 20, this.world.height - 25);
      const oldX = player.x, oldY = player.y;
      const valid = (tx, ty) => s.onPier ? onPier(this.scene, tx, ty, 5) : this.onSand(tx, ty) && !this.behindPierFence(tx, ty);
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
    const upgraded = s.activeReel==='sealed_reel';
    // The returning fish crosses the breaking bar; sample its current position.
    const position=shoreFishPosition(this.scene,s);
    const sample=sampleShore(this.scene,position.x,position.y,s.elapsed,s.seaState||{});
    s.shoreSample=sample;
    const surfLoad=finite(sample.waveLoad)*.09+Math.hypot(sample.currentX,sample.currentY)*.027;
    s.tension = clamp(s.tension + ((reel ? .14 - (upgraded ? .025 : 0) : -.235) + fish.run * .155 + surfLoad) * dt, 0, 1);
    const retrieveSpeed = (upgraded ? 3.4 : 2.8) * (1 - Math.min(.6, fish.run * .47));
    s.lineDistance = Math.max(2.5, s.lineDistance + (fish.run * 1.45 - (reel ? retrieveSpeed : 0)) * dt);
    fish.stamina = Math.max(0, fish.stamina - (.009 + (reel ? .013 : 0)) * dt);
    s.lineStress = s.tension > .93 ? s.lineStress + dt : Math.max(0, s.lineStress - dt * 2);
    s.slackTime = s.tension < .045 ? s.slackTime + dt : 0;
    if (s.lineStress > 1.35 || s.lineDistance > 155) {
      wearShoreSupplies(s,'break'); this.clearLine(); s.message = '鱼线绷断，钓组已丢失。下一次张力进入红区时，及时松开收线。';
    } else if (s.slackTime > 3) {
      wearShoreSupplies(s,'escape'); this.clearLine(); s.message = '鱼线松弛太久，鱼脱钩了。适时收线，让钓线保持张力。';
    } else if (s.lineDistance <= 3 && (fish.stamina <= .32 || SMALL_FISH.has(fish.id)&&fish.weightKg<=.4)) {
      wearShoreSupplies(s,'catch'); s.phase = 'landed'; s.stats.caught++; s.tension = 0; fish.run = 0; this.reeling = false;
      s.message = `${fish.name}上岸了！${formatLength(fish.length)} · ${formatWeight(fish.weightKg)}。留在鱼袋里，或放回海里。`;
    }
  }

  snapshot() {
    const s = this.state;
    return JSON.parse(JSON.stringify({
      scene: this.scene.id, version: 4, elapsed: s.elapsed, credits: s.credits,
      fishingDate:s.fishingDate, population: serializePopulation(this.population), keptLog: s.keptLog,
      wardenNextAt: s.wardenNextAt, pierVisit: s.onPier ? s.pierVisit : null,
      activeRod:s.activeRod,activeReel:s.activeReel,rodSupplies:s.rodSupplies,rigStock:s.rigStock,inventorySlots:s.inventorySlots,
      inventory: s.inventory, bait: s.bait, upgrades: s.upgrades, catches: s.catches, catchHistory: s.catchHistory,
      stats: s.stats, nextCatchId: s.nextCatchId, player: {x: s.player.x, y: s.player.y},
      pendingCatch: s.phase === 'landed' ? s.fish : null,
      onPier: s.onPier, inspectionCount: s.inspectionCount,
      inspection: s.inspection, fineDebt: s.fineDebt, shoreLore:s.shoreLore, regular: serializeRegular(s.regular),
    }));
  }

  restore(saved) {
    const s = this.state;
    s.elapsed = clamp(finite(saved.elapsed), 0, 1e9);
    if(typeof saved.fishingDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(saved.fishingDate)&&Number.isFinite(Date.parse(saved.fishingDate)))s.fishingDate=saved.fishingDate;
    s.keptLog = (Array.isArray(saved.keptLog) ? saved.keptLog : []).filter(k => k && Number.isFinite(k.catchId) && typeof k.species === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.date)).slice(-300).map(k => ({catchId: k.catchId, species: k.species, date: k.date}));
    if (Number.isFinite(saved.wardenNextAt)) s.wardenNextAt = clamp(saved.wardenNextAt, s.elapsed, s.elapsed + 3600);
    s.credits = integer(saved.credits, 0, 1e7, 120);
    for (const id of baitIds) s.inventory[id] = integer(saved.inventory?.[id], 0, 999, id === 'sandcrab' ? 12 : 0);
    s.bait = baitIds.includes(saved.bait) ? saved.bait : 'sandcrab';
    s.upgrades = [...new Set(Array.isArray(saved.upgrades) ? saved.upgrades.filter(id => upgradeIds.includes(id)) : [])];
    s.rig = s.upgrades.includes('fishfinder_rig') ? 'fishfinder' : 'carolina';
    const records = new Map();
    for (const raw of saved.version >= 4 && Array.isArray(saved.catchHistory) ? saved.catchHistory : []) {
      const fish = safeFish(raw);
      if (!fish || !catchStatuses.has(raw.status)) continue;
      const previous = records.get(fish.catchId);
      if (!previous || previous.status === 'kept') records.set(fish.catchId, {...fish, status: raw.status, kept: raw.status !== 'released', recordedAtElapsed: clamp(finite(raw.recordedAtElapsed, s.elapsed), 0, 1e9)});
    }
    s.catchHistory = [...records.values()];
    const seen = new Set();
    s.catches = (Array.isArray(saved.catches) ? saved.catches : []).map(safeFish).filter(fish => {
      if (!fish || seen.has(fish.catchId) || seen.size >= 20 || records.has(fish.catchId) && records.get(fish.catchId).status !== 'kept') return false;
      seen.add(fish.catchId); return true;
    });
    // The cargo list is authoritative for what is physically in the bag.
    // Legacy saves gain history once; terminal history never creates cargo.
    s.catchHistory = s.catchHistory.filter(record => record.status !== 'kept' || seen.has(record.catchId));
    for (const fish of s.catches) this.recordCatch(fish, 'kept');
    for (const key of statKeys) s.stats[key] = integer(saved.stats?.[key], 0, 1e8);
    s.nextCatchId = s.catchHistory.reduce((next, fish) => Math.max(next, fish.catchId + 1), integer(saved.nextCatchId, 1, 1e9, 1));
    const x = finite(saved.player?.x, this.scene.spawn.x), y = finite(saved.player?.y, this.scene.spawn.y);
    if (this.onSand(x, y)) {s.player.x = x; s.player.y = y;}
    if (saved.version >= 2) {
      s.fineDebt = integer(saved.fineDebt, 0, 1e7);
      s.inspectionCount = integer(saved.inspectionCount, 0, 1e8);
      if (this.scene.pier && saved.onPier === true && onPier(this.scene, x, y, 5)) {
        s.onPier = true; s.player.x = x; s.player.y = y;
        // The visit's patrol roll survives reloads; old saves roll once now.
        const visit = saved.pierVisit;
        s.pierVisit = visit && Number.isFinite(visit.time) ? {time: Math.max(0, visit.time), patrolAt: Number.isFinite(visit.patrolAt) ? clamp(visit.patrolAt, PIER_RULES.earliestSeconds, PIER_RULES.latestSeconds) : null}
          : {time: 0, patrolAt: this.random() < PIER_RULES.catchChance ? PIER_RULES.earliestSeconds + this.random() * (PIER_RULES.latestSeconds - PIER_RULES.earliestSeconds) : null};
      }
      if (saved.inspection && typeof saved.inspection === 'object' && (this.scene.pier || saved.inspection.kind === 'beach')) {
        const id = integer(saved.inspection.id, 1, 1e8, 1), fine = integer(saved.inspection.fine, 0, 1e6), paid = integer(saved.inspection.paid, 0, fine);
        s.inspectionCount = Math.max(id, s.inspectionCount);
        // Balances in the save already contain this fine: displaying a pending
        // notice must never apply it a second time or mint a pending fish.
        const confiscatedById = new Map();
        for (const raw of [...(Array.isArray(saved.inspection.confiscated) ? saved.inspection.confiscated : []), ...s.catches]) {
          const fish = safeFish(raw);
          if (fish && !confiscatedById.has(fish.catchId)) confiscatedById.set(fish.catchId, {...this.recordCatch(fish, 'confiscated')});
        }
        const confiscated = [...confiscatedById.values()]; s.catches = [];
        const kind = saved.inspection.kind === 'beach' ? 'beach' : 'pier';
        const findings = Array.isArray(saved.inspection.findings) ? saved.inspection.findings.filter(f => f && typeof f.detail === 'string').slice(0, 40).map(f => ({catchNumber: integer(f.catchNumber, 0, 1e4), fishName: String(f.fishName || f.location || ''), location: String(f.location || ''), code: String(f.code || ''), detail: f.detail})) : [];
        s.inspection = {id, kind, fine, paid, debt: fine - paid, confiscated, findings,
          message: `${kind === 'beach' ? '海滩鱼警' : '栈桥巡查'}检查已结算${fine ? `：罚款 ${fine} 潮汐点` : ''}。${s.fineDebt ? `尚欠 ${s.fineDebt} 点。` : ''}请确认后继续。`};
        if (kind === 'pier') this.ejectFromPier();
      }
    }
    const pending = safeFish(saved.pendingCatch);
    s.lastCatch = s.catchHistory.length ? {...s.catchHistory.at(-1)} : null;
    if (s.inspection) s.message = s.inspection.message;
    else if (pending && !s.catchHistory.some(record => record.catchId === pending.catchId)) {
      s.fish = pending; s.phase = 'landed'; s.nextCatchId = Math.max(s.nextCatchId, pending.catchId + 1);
      s.message = '这条鱼还在等你决定：留下，还是放流？';
    } else s.message = '';
  }
}

// The historical name remains the controller's public API.
export {PacificaSimulation as ShoreSimulation};
