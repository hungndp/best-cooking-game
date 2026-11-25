// Boot and the one loop: input is read every frame, the kitchen advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, shop and shift-end.
//
// ?seed=N fixes the shift's order pattern. ?shot=kitchen|counter|assembly|serve
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.

import { FIELD, LAYOUT, STAGES, STEP, recipeById } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  EVENT_ADD, EVENT_BURNT, EVENT_BUY, EVENT_COOK_READY, EVENT_COOK_START,
  EVENT_ERROR, EVENT_FAIL, EVENT_QUEST, EVENT_RUSH, EVENT_SERVE,
  EVENT_SHIFT_END, createKitchen,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_SERVE, ACTION_SHOP,
  ACTION_TRASH, createInput,
} from './input.js';
import {
  SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SHIFTEND, SCREEN_SHOP, SCREEN_TITLE,
  burnerRect, binRect, createRenderer, plateRect, shopItemRect,
  stageCardRect, ticketRect,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function inside(rect, p) {
  return p.x >= rect.x && p.x < rect.x + rect.w && p.y >= rect.y && p.y < rect.y + rect.h;
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen, scene.screen, { x: -1, y: -1 }, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let screen = SCREEN_TITLE;
  let shopReturn = SCREEN_TITLE;
  let best = kitchen.readBest();

  // Screen readers (and anyone watching the page's text) hear the screen
  // changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function playSound(events) {
    if (events & EVENT_SERVE) audio.coin();
    else if (events & EVENT_QUEST) audio.fanfare();
    else if (events & EVENT_RUSH) audio.rush();
    else if (events & EVENT_BURNT) audio.burnt();
    else if (events & EVENT_FAIL) audio.error();
    else if (events & EVENT_COOK_READY) audio.ready();
    else if (events & EVENT_COOK_START) audio.sizzle();
    else if (events & EVENT_ADD) audio.add();
    else if (events & EVENT_BUY) audio.coin();
    else if (events & EVENT_ERROR) audio.error();
  }

  function startShift() {
    kitchen.startShift(kitchen.state.stageIndex);
    screen = SCREEN_PLAY;
    announce(`Shift started at ${STAGES[kitchen.state.stageIndex].name}.`);
  }

  function openShop() {
    shopReturn = screen;
    screen = SCREEN_SHOP;
    announce('Shop open. Click an item to buy it.');
  }

  function closeShop() {
    screen = shopReturn === SCREEN_SHOP ? SCREEN_TITLE : shopReturn;
    announce(screen === SCREEN_PLAY ? 'Back in the kitchen.' : 'Shop closed.');
  }

  function serveSelected() {
    const shift = kitchen.state.shift;
    if (shift === null) return;
    const plate = shift.plates[kitchen.state.selectedPlate];
    if (!plate || plate.items.length === 0) {
      kitchen.state.toast = 'The selected plate is empty — build a dish first';
      kitchen.state.toastTimer = 2;
      audio.error();
      return;
    }
    // Find the first live ticket this plate matches and serve it. The match
    // is checked first: serveOrder on a wrong ticket shakes the plate and
    // breaks the combo, so a blind try of every ticket would punish a good plate.
    let served = false;
    for (let o = 0; o < shift.orders.length; o += 1) {
      const order = shift.orders[o];
      if (order.failed || order.served) continue;
      if (!kitchen.plateMatches(plate, recipeById(order.recipeId))) continue;
      const events = kitchen.serveOrder(o);
      if (events & EVENT_SERVE) {
        served = true;
        playSound(events);
        announce(kitchen.state.toast);
        break;
      }
    }
    if (!served) {
      kitchen.state.toast = 'No ticket matches this plate — check the order board';
      kitchen.state.toastTimer = 2.5;
      audio.error();
    }
  }

  function handleClick(point) {
    audio.unlock();
    const st = kitchen.state;
    if (screen === SCREEN_TITLE) {
      for (let i = 0; i < STAGES.length; i += 1) {
        if (inside(stageCardRect(i), point)) {
          if (i > st.unlockedStage) {
            audio.error();
            st.toast = 'That kitchen is locked — earn a star in the previous one first';
            st.toastTimer = 2.5;
            return;
          }
          st.stageIndex = i;
          audio.click();
          startShift();
          return;
        }
      }
      if (inside(LAYOUT.shopButton, point)) {
        openShop();
        return;
      }
      return;
    }
    if (screen === SCREEN_SHOP) {
      for (let i = 0; i < 8; i += 1) {
        if (inside(shopItemRect(i), point)) {
          const events = kitchen.buyShop(['turbo-stove', 'extra-burner', 'golden-pan', 'herb-garden', 'extra-plate', 'neon-sign', 'comfy-stools', 'chandelier'][i]);
          playSound(events);
          return;
        }
      }
      closeShop();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen === SCREEN_SHIFTEND) {
      if (inside(LAYOUT.shopButton, point)) {
        openShop();
        return;
      }
      startShift();
      return;
    }
    // SCREEN_PLAY clicks.
    if (inside(LAYOUT.shopButton, point)) {
      openShop();
      return;
    }
    if (inside(LAYOUT.pauseButton, point)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    const shift = st.shift;
    if (shift === null) return;
    // Tickets first: clicking one serves the selected plate to it.
    const live = shift.orders.filter((o) => !o.failed);
    for (let i = 0; i < live.length; i += 1) {
      if (inside(ticketRect(i), point)) {
        const orderIndex = shift.orders.indexOf(live[i]);
        const events = kitchen.serveOrder(orderIndex);
        playSound(events);
        if (events & EVENT_SERVE) announce(st.toast);
        return;
      }
    }
    if (inside(LAYOUT.serveButton, point)) {
      serveSelected();
      return;
    }
    if (inside(LAYOUT.trash, point)) {
      const events = kitchen.clearPlate(st.selectedPlate);
      playSound(events);
      return;
    }
    // Ingredient bins.
    for (let i = 0; i < 10; i += 1) {
      if (inside(binRect(i), point)) {
        const events = kitchen.addIngredient(kitchen.ingredients()[i].id);
        playSound(events);
        return;
      }
    }
    // Plates: the × corner clears, anywhere else selects.
    for (let i = 0; i < shift.plates.length; i += 1) {
      const r = plateRect(i);
      if (!inside(r, point)) continue;
      const plate = shift.plates[i];
      if (plate.items.length > 0 && point.x > r.x + r.w - 22 && point.y < r.y + 22) {
        const events = kitchen.clearPlate(i);
        playSound(events);
        return;
      }
      st.selectedPlate = i;
      audio.click();
      return;
    }
    // Burners: a done one plates its food, a burnt one is cleared.
    for (let i = 0; i < shift.burners.length; i += 1) {
      const r = burnerRect(i);
      if (!inside(r, point)) continue;
      const burner = shift.burners[i];
      if (!burner || burner.ing === null) return;
      if (burner.burnt) {
        const events = kitchen.clearBurner(i);
        playSound(events);
        return;
      }
      if (burner.done) {
        const events = kitchen.takeFromBurner(i);
        playSound(events);
        return;
      }
      audio.click();
      return;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startShift();
      else if (actions & ACTION_SHOP) openShop();
      return;
    }
    if (screen === SCREEN_SHOP) {
      if (actions & (ACTION_PAUSE | ACTION_SHOP | ACTION_CONFIRM)) closeShop();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_SHOP) openShop();
      return;
    }
    if (screen === SCREEN_SHIFTEND) {
      if (actions & ACTION_CONFIRM) startShift();
      else if (actions & ACTION_SHOP) openShop();
      else if (actions & ACTION_TRASH) {
        screen = SCREEN_TITLE;
        announce('Title screen.');
      }
      return;
    }
    // SCREEN_PLAY actions.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_SHOP) {
      openShop();
      return;
    }
    if (actions & ACTION_SERVE) serveSelected();
    if (actions & ACTION_TRASH) {
      const events = kitchen.clearPlate(kitchen.state.selectedPlate);
      playSound(events);
    }
    const ingKey = input.takeIngredientKey();
    if (ingKey >= 0 && ingKey < 10) {
      const events = kitchen.addIngredient(kitchen.ingredients()[ingKey].id);
      playSound(events);
    }
    const plateKey = input.takePlateKey();
    if (plateKey >= 0) {
      const shift = kitchen.state.shift;
      if (shift && plateKey < shift.plates.length) {
        kitchen.state.selectedPlate = plateKey;
        audio.click();
      }
    }
  }

  function step() {
    const events = kitchen.step(STEP);
    if (events !== 0) playSound(events);
    if (events & EVENT_SHIFT_END) {
      screen = SCREEN_SHIFTEND;
      const summary = kitchen.state.shiftSummary;
      if (summary && summary.earned > best) {
        best = summary.earned;
        kitchen.saveBest(best);
      }
      announce(
        `Shift over. ${summary ? summary.served : 0} dishes served, ` +
          `${summary ? summary.earned : 0} coins earned, ${summary ? summary.stars : 0} stars.`,
      );
    }
  }

  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    for (const click of input.takeClicks()) handleClick(click);
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // The title screen's backdrop still simmers: orders drift, nothing scores.
      if (screen === SCREEN_TITLE && kitchen.state.shift !== null) {
        kitchen.step(STEP);
      }
    }
    renderer.draw(kitchen, screen, input.hover(), best);
  }

  // Leaving the tab pauses a running shift rather than letting tickets walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A ?screen=shop (or =title) deep link opens that screen directly: handy
  // for a quick look at the shop, and harmless in normal play.
  const screenParam = params.get('screen');
  if (screenParam === 'shop') openShop();

  announce('Sizzle and Serve. Pick a kitchen and press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
