// Keyboard and pointer input. Clicks arrive as logical playfield coordinates
// (the renderer scales the canvas, so the main loop converts them); one-shot
// presses (serve, pause, shop, mute, plate and ingredient keys) are queued as
// bit flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SHOP = 4;
export const ACTION_SERVE = 8;
export const ACTION_MUTE = 16;
export const ACTION_TRASH = 32;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SHOP = new Set(['KeyS']);
const SERVE = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const TRASH = new Set(['KeyT', 'Backspace', 'Delete']);

export function createInput(canvas, toLogical) {
  let actions = 0;
  let clicks = [];
  let ingredientKey = -1;
  let plateKey = -1;
  let hover = { x: -1, y: -1 };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (SHOP.has(event.code)) actions |= ACTION_SHOP;
    else if (SERVE.has(event.code)) actions |= ACTION_SERVE;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (TRASH.has(event.code)) actions |= ACTION_TRASH;
    else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= 10) ingredientKey = n - 1;
    } else if (event.code === 'KeyQ') plateKey = 0;
    else if (event.code === 'KeyW') plateKey = 1;
    else if (event.code === 'KeyE') plateKey = 2;
    else if (event.code === 'KeyR') plateKey = 3;
    else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    hover = toLogical(event.clientX - rect.left, event.clientY - rect.top);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toLogical(event.clientX - rect.left, event.clientY - rect.top);
    clicks.push(point);
    hover = point;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Clicks since the last call, in logical playfield coordinates. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    /** The ingredient-bin index (0-9) a Digit key picked since the last call, else -1. */
    takeIngredientKey() {
      const taken = ingredientKey;
      ingredientKey = -1;
      return taken;
    },
    /** The plate index (0-3) a Q/W/E/R key picked since the last call, else -1. */
    takePlateKey() {
      const taken = plateKey;
      plateKey = -1;
      return taken;
    },
    /** The pointer's current logical position, for hover highlights. */
    hover() {
      return hover;
    },
  };
}
