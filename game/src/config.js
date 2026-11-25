// Sizzle & Serve: Ember & Thyme — every tuning number, recipe, stage, shop item and
// quest template in one place. The playfield is a fixed 1280x800 logical area; the
// renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Where the best shift score and the saved coins are kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
export const SAVE_KEY = 'sizzle-and-serve.save';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#3d2b1f',
  wallTrim: '#54382a',
  floor: '#2e2118',
  counter: '#8a5a33',
  counterTop: '#b07a45',
  counterEdge: '#6b4423',
  steel: '#9aa5ad',
  steelDark: '#6e7a82',
  board: '#f7ead2',
  boardEdge: '#c9a86a',
  ticket: '#fff8e7',
  ticketEdge: '#d9b96f',
  plate: '#f4f1ea',
  plateEdge: '#c9c2b2',
  text: '#2b1d12',
  textLight: '#f7ead2',
  muted: '#8b7a68',
  gold: '#f2c94c',
  coin: '#ffd94d',
  green: '#5da864',
  red: '#e5534b',
  orange: '#f08a24',
  blue: '#4fc3f7',
  purple: '#9b7ede',
  panel: '#2b1d12',
  panelEdge: '#6b4423',
  shop: '#1f2a1f',
  star: '#ffd94d',
  flame: '#ff9a3d',
};

// ---------------------------------------------------------------------------
// Ingredients. `cook` means the ingredient must spend time on a stove burner
// before it can go on a plate; `cookTime` is its seconds on the burner.
// `draw` picks the pictogram the renderer paints for the ingredient.
// ---------------------------------------------------------------------------
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     short: 'BUN', cook: false, cookTime: 0,   color: '#e8a54b', dark: '#b97e2e', draw: 'bun' },
  { id: 'patty',   name: 'Patty',   short: 'PTY', cook: true,  cookTime: 5,   color: '#7a4a2b', dark: '#5a341d', draw: 'patty' },
  { id: 'cheese',  name: 'Cheese',  short: 'CHS', cook: false, cookTime: 0,   color: '#ffd94d', dark: '#e0a92e', draw: 'cheese' },
  { id: 'lettuce', name: 'Lettuce', short: 'LET', cook: false, cookTime: 0,   color: '#7bc96f', dark: '#4f9e46', draw: 'leaf' },
  { id: 'tomato',  name: 'Tomato',  short: 'TOM', cook: false, cookTime: 0,   color: '#e5534b', dark: '#b73a32', draw: 'tomato' },
  { id: 'onion',   name: 'Onion',   short: 'ONI', cook: false, cookTime: 0,   color: '#f2e6f5', dark: '#c9a8d6', draw: 'onion' },
  { id: 'fries',   name: 'Fries',   short: 'FRI', cook: true,  cookTime: 4,   color: '#f7c948', dark: '#d9a41f', draw: 'fries' },
  { id: 'egg',     name: 'Egg',     short: 'EGG', cook: true,  cookTime: 4,   color: '#fff3c4', dark: '#f0c94a', draw: 'egg' },
  { id: 'bacon',   name: 'Bacon',   short: 'BAC', cook: true,  cookTime: 4.5, color: '#d96a4a', dark: '#a84a30', draw: 'bacon' },
  { id: 'sauce',   name: 'Sauce',   short: 'SAU', cook: false, cookTime: 0,   color: '#f08a24', dark: '#c96a12', draw: 'sauce' },
];

export function ingredientById(id) {
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (INGREDIENTS[i].id === id) return INGREDIENTS[i];
  }
  return INGREDIENTS[0];
}

// ---------------------------------------------------------------------------
// Recipes. `needs` lists ingredient ids in the order they are stacked on the
// plate; `stage` is the kitchen that first serves it; `price` is the base pay.
// ---------------------------------------------------------------------------
export const RECIPES = [
  { id: 'classic-burger',  name: 'Classic Burger',  stage: 1, price: 45,  needs: ['bun', 'patty', 'cheese', 'lettuce'], blurb: 'The truck legend. Bun, patty, cheese, lettuce.' },
  { id: 'cheese-fries',    name: 'Cheese Fries',    stage: 1, price: 30,  needs: ['fries', 'cheese', 'sauce'],           blurb: 'Golden fries drowned in cheese and sauce.' },
  { id: 'sunny-sandwich',  name: 'Sunny Sandwich',  stage: 1, price: 35,  needs: ['bun', 'egg', 'cheese'],               blurb: 'A fried egg, melted cheese, soft bun.' },
  { id: 'garden-salad',    name: 'Garden Salad',    stage: 1, price: 28,  needs: ['lettuce', 'tomato', 'onion', 'sauce'], blurb: 'Crisp, fresh, and gone in a minute.' },
  { id: 'bacon-burger',    name: 'Bacon Burger',    stage: 2, price: 60,  needs: ['bun', 'patty', 'bacon', 'cheese', 'tomato'], blurb: 'Smoky bacon over a seared patty.' },
  { id: 'breakfast-plate', name: 'Breakfast Plate', stage: 2, price: 55,  needs: ['egg', 'bacon', 'fries', 'sauce'],     blurb: 'Breakfast any hour of the day.' },
  { id: 'golden-stack',    name: 'Golden Stack',    stage: 2, price: 58,  needs: ['bun', 'egg', 'bacon', 'cheese'],      blurb: 'Egg, bacon and cheese stacked high.' },
  { id: 'loaded-fries',    name: 'Loaded Fries',    stage: 2, price: 52,  needs: ['fries', 'bacon', 'cheese', 'onion', 'sauce'], blurb: 'Fries loaded with everything we own.' },
  { id: 'royal-burger',    name: 'Royal Burger',    stage: 3, price: 85,  needs: ['bun', 'patty', 'bacon', 'egg', 'cheese', 'tomato'], blurb: 'Six layers. One crown. No shortcuts.' },
  { id: 'chefs-special',   name: "Chef's Special",  stage: 3, price: 80,  needs: ['patty', 'egg', 'bacon', 'lettuce', 'tomato', 'sauce'], blurb: 'The chef refuses to explain it. Just serve it.' },
  { id: 'truffle-fries',   name: 'Truffle Fries',   stage: 3, price: 65,  needs: ['fries', 'cheese', 'onion', 'sauce'],   blurb: 'Fries, dressed for the dining room.' },
  { id: 'grand-platter',   name: 'Grand Platter',   stage: 3, price: 110, needs: ['bun', 'patty', 'fries', 'egg', 'cheese', 'lettuce', 'tomato'], blurb: 'Everything the kitchen can make, on one plate.' },
];

export function recipeById(id) {
  for (let i = 0; i < RECIPES.length; i += 1) {
    if (RECIPES[i].id === id) return RECIPES[i];
  }
  return RECIPES[0];
}

// ---------------------------------------------------------------------------
// Kitchens (stages). Each shift is a timed service: orders arrive, patience
// drains, and the coins you bank decide your stars. Beat a stage's 1-star bar
// to unlock the next kitchen; recipes of that stage join the order pool.
// ---------------------------------------------------------------------------
export const STAGES = [
  {
    id: 'food-truck', name: 'Rolling Skillet', sub: 'Food Truck', shiftSeconds: 120,
    orderInterval: 14, maxOrders: 3, patience: 48, rushSeconds: 30,
    stars: [150, 260, 380], recipeStage: 1,
    intro: 'A truck, a grill, and a line down the block. Keep it simple, keep it fast.',
  },
  {
    id: 'bistro', name: 'Ember & Thyme', sub: 'Bistro', shiftSeconds: 150,
    orderInterval: 11, maxOrders: 4, patience: 42, rushSeconds: 30,
    stars: [260, 420, 580], recipeStage: 2,
    intro: 'White tablecloths, hungrier critics. Four new recipes join the board.',
  },
  {
    id: 'fine-dining', name: 'The Gilded Ladle', sub: 'Fine Dining', shiftSeconds: 180,
    orderInterval: 9, maxOrders: 4, patience: 38, rushSeconds: 36,
    stars: [420, 620, 820], recipeStage: 3,
    intro: 'The dining room that decides reputations. Every recipe we know, on the board.',
  },
];

export const BURN_WINDOW = 6; // Seconds a finished burner waits before the food burns.
export const COMBO_MAX = 5; // Combo multiplier caps at x5.
export const TIP_BASE = 12; // Base tip for a perfectly patient customer.

// ---------------------------------------------------------------------------
// The shop: coins earned from served dishes are spent here, between shifts
// (and from the pause menu). Every item changes the kitchen for real.
// ---------------------------------------------------------------------------
export const SHOP_ITEMS = [
  { id: 'turbo-stove',    name: 'Turbo Stove',     cost: 120, icon: 'flame',  desc: 'Burners cook 40% faster.',            effect: { cookSpeed: 1.4 } },
  { id: 'extra-burner',   name: 'Second Burner',   cost: 150, icon: 'burner', desc: 'A third burner on the stove.',        effect: { burners: 1 } },
  { id: 'golden-pan',     name: 'Golden Pan',      cost: 100, icon: 'pan',    desc: 'Tips worth 25% more.',               effect: { tipBonus: 0.25 } },
  { id: 'herb-garden',    name: 'Herb Garden',     cost: 90,  icon: 'leaf',   desc: 'Customers wait 25% longer.',         effect: { patienceBonus: 0.25 } },
  { id: 'extra-plate',    name: 'Extra Plate',     cost: 130, icon: 'plate',  desc: 'A fourth plate on the pass.',        effect: { plates: 1 } },
  { id: 'neon-sign',      name: 'Neon Sign',       cost: 80,  icon: 'sign',   desc: 'Orders arrive 20% faster.',         effect: { spawnBonus: 0.2 } },
  { id: 'comfy-stools',   name: 'Comfy Stools',    cost: 110, icon: 'stool',  desc: 'Customers wait 15% longer, happier.', effect: { patienceBonus: 0.15 } },
  { id: 'chandelier',     name: 'Grand Chandelier', cost: 200, icon: 'star',  desc: '+1 star on every finished shift.',   effect: { starBonus: 1 } },
];

// ---------------------------------------------------------------------------
// Daily quests: three per shift, drawn from this pool. Each pays coins when
// its target is hit during the shift, and the chain carries to the next shift.
// ---------------------------------------------------------------------------
export const QUEST_POOL = [
  { id: 'serve-6',   text: 'Serve 6 dishes',            target: 6,  reward: 50, kind: 'served' },
  { id: 'serve-9',   text: 'Serve 9 dishes',            target: 9,  reward: 80, kind: 'served' },
  { id: 'earn-250',  text: 'Earn 250 coins in a shift', target: 250, reward: 60, kind: 'earned' },
  { id: 'earn-400',  text: 'Earn 400 coins in a shift', target: 400, reward: 90, kind: 'earned' },
  { id: 'combo-3',   text: 'Reach a x3 combo',          target: 3,  reward: 60, kind: 'combo' },
  { id: 'combo-5',   text: 'Reach a x5 combo',          target: 5,  reward: 100, kind: 'combo' },
  { id: 'no-burn',   text: 'Finish a shift with no burnt dish', target: 1, reward: 70, kind: 'noburn' },
  { id: 'tips-100',  text: 'Earn 100 coins in tips',    target: 100, reward: 70, kind: 'tips' },
  { id: 'fancy-3',   text: 'Serve 3 bistro or finer dishes', target: 3, reward: 80, kind: 'fancy' },
];

// ---------------------------------------------------------------------------
// Fixed geometry, shared by the renderer and the click handling so a click
// always lands where the picture says it does.
// ---------------------------------------------------------------------------
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 64 },
  board: { x: 16, y: 76, w: 296, h: 470 },
  counter: { x: 328, y: 76, w: 624, h: 470 },
  pass: { x: 968, y: 76, w: 296, h: 470 },
  bins: { x: 344, y: 108, w: 592, h: 118, cols: 5, cellW: 118, cellH: 56 },
  plates: { x: 344, y: 240, w: 592, h: 118 },
  stove: { x: 344, y: 380, w: 592, h: 130 },
  help: { x: 16, y: 560, w: 1248, h: 44 },
  quests: { x: 16, y: 616, w: 620, h: 148 },
  recipes: { x: 652, y: 616, w: 612, h: 148 },
  shopButton: { x: 1092, y: 12, w: 84, h: 40 },
  pauseButton: { x: 1184, y: 12, w: 80, h: 40 },
  serveButton: { x: 984, y: 334, w: 264, h: 56 },
  trash: { x: 884, y: 380, w: 52, h: 52 },
};
