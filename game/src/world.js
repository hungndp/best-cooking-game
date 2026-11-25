// The kitchen's rules and state, with no drawing and no browser in it: orders
// arriving on the board, plates being built on the pass, burners cooking, the
// serve window, combos, coins, quests and the shop. step() advances one fixed
// step and returns what happened as bit flags, so the caller can react (sounds,
// announcements) without the world knowing about screens.

import {
  BURN_WINDOW, COMBO_MAX, INGREDIENTS, QUEST_POOL, RECIPES, SHOP_ITEMS,
  STAGES, TIP_BASE, ingredientById, recipeById,
} from './config.js';
import { pick, shuffled } from './random.js';

export const EVENT_ADD = 1;
export const EVENT_COOK_START = 2;
export const EVENT_COOK_READY = 4;
export const EVENT_SERVE = 8;
export const EVENT_FAIL = 16;
export const EVENT_BURNT = 32;
export const EVENT_QUEST = 64;
export const EVENT_RUSH = 128;
export const EVENT_SHIFT_END = 256;
export const EVENT_ERROR = 512;
export const EVENT_BUY = 1024;

const MAX_PLATE_ITEMS = 7;

function orderPool(stage) {
  return RECIPES.filter((r) => r.stage <= stage.recipeStage);
}

function questProgress(quest, world) {
  if (quest.kind === 'served') return world.shift.served;
  if (quest.kind === 'earned') return world.shift.earned;
  if (quest.kind === 'combo') return world.shift.bestCombo;
  if (quest.kind === 'tips') return world.shift.tips;
  if (quest.kind === 'fancy') return world.shift.fancyServed;
  if (quest.kind === 'noburn') return world.shift.burnt === 0 ? 1 : 0;
  return 0;
}

export function createKitchen(random) {
  const state = {
    stageIndex: 0,
    coins: 0,
    stars: 0,
    reputation: 0,
    bestShift: 0,
    unlockedStage: 0,
    shopOwned: {},
    selectedPlate: 0,
    screen: 'title',
    shift: null,
    shiftSummary: null,
    quests: [],
    message: '',
    messageTimer: 0,
    toast: '',
    toastTimer: 0,
  };

  // -- derived shop effects -------------------------------------------------
  function effects() {
    const e = { cookSpeed: 1, burners: 2, plates: 3, tipBonus: 0, patienceBonus: 0, spawnBonus: 0, starBonus: 0 };
    for (const item of SHOP_ITEMS) {
      if (!state.shopOwned[item.id]) continue;
      if (item.effect.cookSpeed) e.cookSpeed *= item.effect.cookSpeed;
      if (item.effect.burners) e.burners += item.effect.burners;
      if (item.effect.plates) e.plates += item.effect.plates;
      if (item.effect.tipBonus) e.tipBonus += item.effect.tipBonus;
      if (item.effect.patienceBonus) e.patienceBonus += item.effect.patienceBonus;
      if (item.effect.spawnBonus) e.spawnBonus += item.effect.spawnBonus;
      if (item.effect.starBonus) e.starBonus += item.effect.starBonus;
    }
    return e;
  }

  function newPlate(id) {
    return { id, items: [], shake: 0, flash: 0 };
  }

  function newBurner(id) {
    return { id, ing: null, progress: 0, done: false, burnt: false, overTime: 0 };
  }

  function makeOrder(id) {
    const stage = STAGES[state.stageIndex];
    const pool = orderPool(stage);
    const recipe = pick(random, pool);
    const eff = effects();
    const patience = stage.patience * (1 + eff.patienceBonus);
    return {
      id, recipeId: recipe.id, patience, maxPatience: patience,
      wobble: random() * Math.PI * 2, served: false, failed: false,
    };
  }

  function drawQuests() {
    const pool = shuffled(random, QUEST_POOL);
    state.quests = pool.slice(0, 3).map((q) => ({ ...q, progress: 0, done: false, paid: false }));
  }

  function startShift(stageIndex) {
    state.stageIndex = stageIndex;
    const stage = STAGES[stageIndex];
    const eff = effects();
    const shift = {
      stageIndex, timeLeft: stage.shiftSeconds, shiftSeconds: stage.shiftSeconds,
      orders: [], plates: [], burners: [], nextOrderId: 1,
      spawnTimer: 2.5, combo: 0, bestCombo: 0, served: 0, earned: 0, tips: 0,
      burnt: 0, failed: 0, fancyServed: 0, rush: false, rushAnnounced: false,
    };
    for (let i = 0; i < eff.plates; i += 1) shift.plates.push(newPlate(i));
    for (let i = 0; i < eff.burners; i += 1) shift.burners.push(newBurner(i));
    state.shift = shift;
    state.selectedPlate = 0;
    state.screen = 'play';
    drawQuests();
    state.message = `${stage.name} — ${stage.sub}`;
    state.messageTimer = 3;
    spawnOrder();
    spawnOrder();
  }

  function spawnOrder() {
    const shift = state.shift;
    if (shift === null) return;
    const stage = STAGES[state.stageIndex];
    if (shift.orders.filter((o) => !o.failed && !o.served).length >= stage.maxOrders) return;
    shift.orders.push(makeOrder(shift.nextOrderId));
    shift.nextOrderId += 1;
  }

  function plateMatches(plate, recipe) {
    if (plate.items.length !== recipe.needs.length) return false;
    const have = {};
    for (const item of plate.items) {
      const ing = ingredientById(item.id);
      if (ing.cook && !item.cooked) return false;
      have[item.id] = (have[item.id] || 0) + 1;
    }
    const want = {};
    for (const id of recipe.needs) want[id] = (want[id] || 0) + 1;
    for (const id of Object.keys(want)) {
      if (have[id] !== want[id]) return false;
    }
    return true;
  }

  function checkQuests() {
    let events = 0;
    for (const quest of state.quests) {
      if (quest.done) continue;
      quest.progress = questProgress(quest, state);
      const target = quest.kind === 'noburn' ? 1 : quest.target;
      if (quest.progress >= target) {
        // The no-burn quest only pays when the shift ends clean; the rest pay at once.
        if (quest.kind === 'noburn') continue;
        quest.done = true;
        state.coins += quest.reward;
        state.toast = `Quest done: ${quest.text}  +${quest.reward} coins`;
        state.toastTimer = 3;
        events |= EVENT_QUEST;
      }
    }
    return events;
  }

  // -- player actions -------------------------------------------------------
  function addIngredient(ingId) {
    const shift = state.shift;
    if (shift === null) return EVENT_ERROR;
    const ing = ingredientById(ingId);
    const plate = shift.plates[state.selectedPlate];
    if (ing.cook) {
      const burner = shift.burners.find((b) => b.ing === null);
      if (!burner) {
        state.toast = 'No free burner — move a cooked item to a plate first';
        state.toastTimer = 2;
        return EVENT_ERROR;
      }
      burner.ing = ingId;
      burner.progress = 0;
      burner.done = false;
      burner.burnt = false;
      burner.overTime = 0;
      return EVENT_COOK_START;
    }
    if (plate.items.length >= MAX_PLATE_ITEMS) {
      state.toast = 'That plate is full — serve it or trash it';
      state.toastTimer = 2;
      return EVENT_ERROR;
    }
    plate.items.push({ id: ingId, cooked: false });
    plate.flash = 0.25;
    return EVENT_ADD;
  }

  function takeFromBurner(burnerIndex) {
    const shift = state.shift;
    if (shift === null) return EVENT_ERROR;
    const burner = shift.burners[burnerIndex];
    if (!burner || burner.ing === null || !burner.done || burner.burnt) return EVENT_ERROR;
    const plate = shift.plates[state.selectedPlate];
    if (plate.items.length >= MAX_PLATE_ITEMS) {
      state.toast = 'That plate is full — serve it or trash it';
      state.toastTimer = 2;
      return EVENT_ERROR;
    }
    plate.items.push({ id: burner.ing, cooked: true });
    plate.flash = 0.25;
    burner.ing = null;
    burner.progress = 0;
    burner.done = false;
    burner.overTime = 0;
    return EVENT_ADD;
  }

  function clearBurner(burnerIndex) {
    const shift = state.shift;
    if (shift === null) return EVENT_ERROR;
    const burner = shift.burners[burnerIndex];
    if (!burner || burner.ing === null) return EVENT_ERROR;
    burner.ing = null;
    burner.progress = 0;
    burner.done = false;
    burner.burnt = false;
    burner.overTime = 0;
    if (burner.burnt) shift.burnt += 1;
    return EVENT_ADD;
  }

  function clearPlate(plateIndex) {
    const shift = state.shift;
    if (shift === null) return EVENT_ERROR;
    const plate = shift.plates[plateIndex];
    if (!plate || plate.items.length === 0) return EVENT_ERROR;
    plate.items = [];
    return EVENT_ADD;
  }

  function serveOrder(orderIndex) {
    const shift = state.shift;
    if (shift === null) return EVENT_ERROR;
    const order = shift.orders[orderIndex];
    if (!order || order.failed || order.served) return EVENT_ERROR;
    const plate = shift.plates[state.selectedPlate];
    const recipe = recipeById(order.recipeId);
    if (!plateMatches(plate, recipe)) {
      plate.shake = 0.4;
      shift.combo = 0;
      state.toast = `That plate is not a ${recipe.name} — check the ticket`;
      state.toastTimer = 2.5;
      return EVENT_ERROR;
    }
    const stage = STAGES[state.stageIndex];
    const eff = effects();
    const patienceFrac = Math.max(0, order.patience / order.maxPatience);
    const tip = Math.round(TIP_BASE * patienceFrac * (1 + shift.combo * 0.2) * (1 + eff.tipBonus));
    const rushMult = shift.rush ? 1.5 : 1;
    const pay = Math.round((recipe.price + tip) * rushMult);
    state.coins += pay;
    shift.earned += pay;
    shift.tips += tip;
    shift.served += 1;
    shift.combo = Math.min(COMBO_MAX, shift.combo + 1);
    shift.bestCombo = Math.max(shift.bestCombo, shift.combo);
    if (recipe.stage >= 2) shift.fancyServed += 1;
    order.served = true;
    plate.items = [];
    // A served ticket leaves the board at once, so the next spawn and the
    // board's own count always see the live tickets only.
    shift.orders.splice(shift.orders.indexOf(order), 1);
    state.toast = `Served ${recipe.name}! +${pay} coins${shift.combo > 1 ? `  (combo x${shift.combo})` : ''}`;
    state.toastTimer = 2.5;
    return EVENT_SERVE | checkQuests();
  }

  function buyShop(itemId) {
    const item = SHOP_ITEMS.find((s) => s.id === itemId);
    if (!item || state.shopOwned[itemId]) return EVENT_ERROR;
    if (state.coins < item.cost) {
      state.toast = `Need ${item.cost - state.coins} more coins for the ${item.name}`;
      state.toastTimer = 2.5;
      return EVENT_ERROR;
    }
    state.coins -= item.cost;
    state.shopOwned[itemId] = true;
    state.toast = `Bought ${item.name}!`;
    state.toastTimer = 3;
    return EVENT_BUY;
  }

  function starsFor(earned) {
    const stage = STAGES[state.stageIndex];
    const eff = effects();
    let stars = 0;
    for (const bar of stage.stars) if (earned >= bar) stars += 1;
    return Math.min(3, stars + eff.starBonus);
  }

  function endShift() {
    const shift = state.shift;
    if (shift === null) return null;
    const stage = STAGES[state.stageIndex];
    const stars = starsFor(shift.earned);
    const noBurnQuest = state.quests.find((q) => q.kind === 'noburn');
    let questBonus = 0;
    if (noBurnQuest && !noBurnQuest.done && shift.burnt === 0) {
      noBurnQuest.done = true;
      state.coins += noBurnQuest.reward;
      questBonus += noBurnQuest.reward;
    }
    state.stars += stars;
    state.reputation += stars;
    state.bestShift = Math.max(state.bestShift, shift.earned);
    if (stars >= 1 && state.stageIndex < STAGES.length - 1) {
      state.unlockedStage = Math.max(state.unlockedStage, state.stageIndex + 1);
    }
    state.shiftSummary = {
      stageIndex: state.stageIndex, earned: shift.earned, served: shift.served,
      tips: shift.tips, burnt: shift.burnt, failed: shift.failed,
      bestCombo: shift.bestCombo, stars, questBonus,
      coins: state.coins, unlocked: stars >= 1 && state.stageIndex < STAGES.length - 1,
    };
    state.shift = null;
    state.screen = 'shiftend';
    save();
    return state.shiftSummary;
  }

  function step(dt) {
    let events = 0;
    const shift = state.shift;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.toastTimer > 0) state.toastTimer -= dt;
    if (shift === null) return events;
    const stage = STAGES[state.stageIndex];
    const eff = effects();

    shift.timeLeft -= dt;
    if (!shift.rush && shift.timeLeft <= stage.rushSeconds) {
      shift.rush = true;
      if (!shift.rushAnnounced) {
        shift.rushAnnounced = true;
        state.message = 'RUSH HOUR! Orders pay 1.5x — keep the pans moving!';
        state.messageTimer = 3;
        events |= EVENT_RUSH;
      }
    }

    // New orders arrive on a timer (faster in rush hour, faster with the sign).
    const interval = stage.orderInterval / (1 + eff.spawnBonus) / (shift.rush ? 2 : 1);
    shift.spawnTimer -= dt;
    if (shift.spawnTimer <= 0) {
      spawnOrder();
      shift.spawnTimer = interval * (0.85 + random() * 0.3);
    }

    // Patience drains; an abandoned ticket walks out and breaks the combo.
    for (const order of shift.orders) {
      if (order.failed || order.served) continue;
      order.patience -= dt;
      order.wobble += dt * 2;
      if (order.patience <= 0) {
        order.failed = true;
        shift.failed += 1;
        shift.combo = 0;
        state.toast = `A customer walked out — ${recipeById(order.recipeId).name} was too slow`;
        state.toastTimer = 2.5;
        events |= EVENT_FAIL;
      }
    }
    // Failed tickets linger a moment so the player sees what walked out.
    for (const order of shift.orders) {
      if (order.failed) order.failedAge = (order.failedAge || 0) + dt;
    }
    shift.orders = shift.orders.filter((o) => !o.failed || (o.failedAge || 0) < 1.2);

    // Burners cook; a finished burner waits BURN_WINDOW seconds, then burns.
    for (const burner of shift.burners) {
      if (burner.ing === null || burner.burnt) continue;
      const ing = ingredientById(burner.ing);
      if (!burner.done) {
        burner.progress += (dt * eff.cookSpeed) / ing.cookTime;
        if (burner.progress >= 1) {
          burner.progress = 1;
          burner.done = true;
          burner.overTime = 0;
          events |= EVENT_COOK_READY;
        }
      } else {
        burner.overTime += dt;
        if (burner.overTime >= BURN_WINDOW) {
          burner.burnt = true;
          shift.burnt += 1;
          shift.combo = 0;
          state.toast = `The ${ing.name} burnt! Click the burner to clear it`;
          state.toastTimer = 2.5;
          events |= EVENT_BURNT;
        }
      }
    }

    for (const plate of shift.plates) {
      if (plate.shake > 0) plate.shake -= dt;
      if (plate.flash > 0) plate.flash -= dt;
    }

    if (shift.timeLeft <= 0) {
      shift.timeLeft = 0;
      endShift();
      events |= EVENT_SHIFT_END;
    }
    return events;
  }

  // -- persistence ----------------------------------------------------------
  function save() {
    try {
      const data = {
        coins: state.coins, stars: state.stars, reputation: state.reputation,
        bestShift: state.bestShift, unlockedStage: state.unlockedStage,
        shopOwned: state.shopOwned,
      };
      window.localStorage.setItem('sizzle-and-serve.save', JSON.stringify(data));
    } catch {
      // Storage can be off: the career then lasts this visit only.
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem('sizzle-and-serve.save');
      if (!raw) return;
      const data = JSON.parse(raw);
      state.coins = data.coins || 0;
      state.stars = data.stars || 0;
      state.reputation = data.reputation || 0;
      state.bestShift = data.bestShift || 0;
      state.unlockedStage = data.unlockedStage || 0;
      state.shopOwned = data.shopOwned || {};
    } catch {
      // A corrupt save is ignored, not fatal.
    }
  }

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem('sizzle-and-serve.best') ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem('sizzle-and-serve.best', String(value));
    } catch {
      // Storage can be off (private windows): the best then lasts this visit only.
    }
  }

  load();

  return {
    state,
    effects,
    startShift,
    endShift,
    step,
    addIngredient,
    takeFromBurner,
    clearBurner,
    clearPlate,
    serveOrder,
    buyShop,
    plateMatches,
    save,
    saveBest,
    readBest,
    /** Spawn one more ticket now (the shift timer does this on its own). */
    spawnOrder,
    /** The recipes the current stage can order, for the menu panel. */
    availableRecipes() {
      return orderPool(STAGES[state.stageIndex]);
    },
    /** Every ingredient, for the counter bins. */
    ingredients() {
      return INGREDIENTS;
    },
  };
}
