// The screenshot scenes behind ?shot=kitchen|counter|assembly|serve. Each one
// plays the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (take finished burners to the plate, serve a
// matching plate, otherwise add the oldest ticket's next missing ingredient),
// so the frame is what a real shift looks like — and the same seed always
// gives the same frame. After the simulation each scene forces the exact
// moment its screenshot must show (a plate mid-assembly, a dish ready to
// serve), using only the world's own state.

import { STEP } from './config.js';
import { ingredientById, recipeById } from './config.js';
import { SCREEN_PLAY } from './render.js';

/** One autopilot decision: the next useful action, or nothing if it must wait. */
function autopilot(kitchen) {
  const st = kitchen.state;
  const shift = st.shift;
  if (shift === null) return;
  // A finished burner goes to the selected plate at once; a burnt one is cleared.
  for (let i = 0; i < shift.burners.length; i += 1) {
    const burner = shift.burners[i];
    if (burner.ing === null) continue;
    if (burner.burnt) {
      kitchen.clearBurner(i);
      return;
    }
    if (burner.done) {
      kitchen.takeFromBurner(i);
      return;
    }
  }
  // A plate that matches a live ticket is served at once.
  for (let p = 0; p < shift.plates.length; p += 1) {
    const plate = shift.plates[p];
    for (let o = 0; o < shift.orders.length; o += 1) {
      const order = shift.orders[o];
      if (order.failed || order.served) continue;
      if (kitchen.plateMatches(plate, recipeById(order.recipeId))) {
        st.selectedPlate = p;
        kitchen.serveOrder(o);
        return;
      }
    }
  }
  // Otherwise build the oldest ticket on the selected plate.
  const order = shift.orders.find((o) => !o.failed && !o.served);
  if (!order) return;
  const recipe = recipeById(order.recipeId);
  const plate = shift.plates[st.selectedPlate];
  const have = {};
  for (const item of plate.items) have[item.id] = (have[item.id] || 0) + 1;
  const want = {};
  for (const id of recipe.needs) want[id] = (want[id] || 0) + 1;
  for (const id of Object.keys(want)) {
    if ((have[id] || 0) >= want[id]) continue;
    const ing = ingredientById(id);
    if (ing.cook) {
      if (shift.burners.some((b) => b.ing === id && !b.done)) return;
      if (shift.burners.some((b) => b.ing === null)) kitchen.addIngredient(id);
      return;
    }
    kitchen.addIngredient(id);
    return;
  }
}

/** Run the world forward `seconds` with the autopilot deciding every 0.25 s. */
function simulate(kitchen, seconds) {
  const steps = Math.floor(seconds / STEP);
  let sinceDecision = 0;
  for (let i = 0; i < steps; i += 1) {
    sinceDecision += STEP;
    if (sinceDecision >= 0.25) {
      autopilot(kitchen);
      sinceDecision = 0;
    }
    kitchen.step(STEP);
    if (kitchen.state.shift === null) break;
  }
}

/** Make sure at least `n` live tickets are on the board for the scene. */
function topUpOrders(kitchen, n) {
  const shift = kitchen.state.shift;
  if (shift === null) return;
  let guard = 0;
  while (shift.orders.filter((o) => !o.failed && !o.served).length < n && guard < 6) {
    kitchen.spawnOrder();
    guard += 1;
  }
}

/** The oldest ticket still waiting, or null. */
function oldestOrder(shift) {
  return shift.orders.find((o) => !o.failed && !o.served) || null;
}

/** Fill `plate` with the recipe's ingredients, cooked where the recipe needs it. */
function fillPlate(plate, recipe, skipLast) {
  plate.items = [];
  const needs = skipLast ? recipe.needs.slice(0, -1) : recipe.needs;
  for (const id of needs) {
    const ing = ingredientById(id);
    plate.items.push({ id, cooked: ing.cook });
  }
}

/** Put a burner to work on one ingredient, part-way through its cook time. */
function setBurner(shift, index, ingId, progress) {
  const burner = shift.burners[index];
  if (!burner) return;
  burner.ing = ingId;
  burner.progress = progress;
  burner.done = false;
  burner.burnt = false;
  burner.overTime = 0;
}

/**
 * Set `kitchen` to the named scene and return the screen to draw over it and
 * the best score to show. Any unknown name stages the kitchen scene.
 */
export function stageShot(name, kitchen) {
  const st = kitchen.state;
  if (name === 'counter') {
    kitchen.startShift(1);
    simulate(kitchen, 40);
    topUpOrders(kitchen, 3); // the autopilot may have cleared the board; refill it
    const shift = st.shift;
    if (shift) {
      // Two plates mid-assembly, both burners busy, bins full of ingredients.
      const first = oldestOrder(shift);
      if (first) fillPlate(shift.plates[0], recipeById(first.recipeId), true);
      const second = shift.orders.find((o) => !o.failed && !o.served && o !== first);
      if (second) fillPlate(shift.plates[1], recipeById(second.recipeId), true);
      setBurner(shift, 0, 'patty', 0.55);
      setBurner(shift, 1, 'fries', 0.7);
      st.selectedPlate = 0;
      st.toast = 'Two dishes on the go — the counter is full of ingredients';
      st.toastTimer = 60;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'assembly') {
    kitchen.startShift(1);
    simulate(kitchen, 50);
    topUpOrders(kitchen, 3); // the autopilot may have cleared the board; refill it
    const shift = st.shift;
    if (shift) {
      // One dish one ingredient from done, a second plate half built, a burner ready.
      const first = oldestOrder(shift);
      if (first) fillPlate(shift.plates[0], recipeById(first.recipeId), true);
      const second = shift.orders.find((o) => !o.failed && !o.served && o !== first);
      if (second) {
        const recipe = recipeById(second.recipeId);
        shift.plates[1].items = recipe.needs.slice(0, 2).map((id) => ({ id, cooked: ingredientById(id).cook }));
      }
      const burner = shift.burners[0];
      if (burner && burner.ing === null) {
        const missing = first ? recipeById(first.recipeId).needs.slice(-1)[0] : 'patty';
        if (ingredientById(missing).cook) {
          burner.ing = missing;
          burner.progress = 1;
          burner.done = true;
        }
      }
      st.selectedPlate = 0;
      st.toast = 'One more ingredient and this dish is ready to serve';
      st.toastTimer = 60;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    kitchen.startShift(1);
    simulate(kitchen, 60);
    topUpOrders(kitchen, 3); // the autopilot may have cleared the board; refill it
    const shift = st.shift;
    if (shift) {
      // A finished plate that matches the oldest ticket, timer still healthy.
      const first = oldestOrder(shift);
      if (first) {
        fillPlate(shift.plates[0], recipeById(first.recipeId), false);
        st.selectedPlate = 0;
      }
      setBurner(shift, 0, 'bacon', 0.6);
      shift.timeLeft = 42;
      st.toast = 'Plate ready — serve it before the ticket walks out!';
      st.toastTimer = 60;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // Default: the kitchen scene — a busy mid-shift with tickets, a plate
  // mid-assembly, food on the stove and the timer running.
  kitchen.startShift(1);
  simulate(kitchen, 25);
  topUpOrders(kitchen, 3); // the autopilot may have cleared the board; refill it
  const shift = st.shift;
  if (shift) {
    const first = oldestOrder(shift);
    if (first && shift.plates[0].items.length === 0) {
      fillPlate(shift.plates[0], recipeById(first.recipeId), true);
    }
    setBurner(shift, 0, 'patty', 0.45);
    st.selectedPlate = 0;
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
