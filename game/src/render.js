// Drawing only: the kitchen's state and the current screen in, pixels out.
// The 1280x800 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Everything is drawn with canvas shapes and
// text — no image files, no fonts to load, so the game opens anywhere offline.

import {
  FIELD, FONT, LAYOUT, PALETTE, RECIPES, SHOP_ITEMS, STAGES,
  ingredientById, recipeById,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SHOP = 'shop';
export const SCREEN_SHIFTEND = 'shiftend';

// -- hit-test geometry, shared with the main loop ---------------------------
// Bins: two rows of five across the counter. Plates: a row under the bins.
// Burners: a row on the stove. Tickets: stacked down the order board.
export function binRect(i) {
  const b = LAYOUT.bins;
  const col = i % 5;
  const row = Math.floor(i / 5);
  return { x: b.x + col * b.cellW, y: b.y + row * b.cellH, w: b.cellW - 8, h: b.cellH - 8 };
}
export function plateRect(i) {
  const p = LAYOUT.plates;
  const w = (p.w - 16) / 4;
  return { x: p.x + 8 + i * w, y: p.y + 6, w: w - 8, h: p.h - 12 };
}
export function burnerRect(i) {
  const s = LAYOUT.stove;
  const w = 118;
  return { x: s.x + 16 + i * (w + 14), y: s.y + 42, w, h: 76 };
}
export function ticketRect(i) {
  const b = LAYOUT.board;
  return { x: b.x + 12, y: b.y + 46 + i * 106, w: b.w - 24, h: 98 };
}
export function shopItemRect(i) {
  const x = 190;
  const y = 150 + i * 62;
  return { x, y, w: 900, h: 54 };
}
export function stageCardRect(i) {
  return { x: 190 + i * 310, y: 296, w: 290, h: 220 };
}

function inside(rect, p) {
  return p.x >= rect.x && p.x < rect.x + rect.w && p.y >= rect.y && p.y < rect.y + rect.h;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** One ingredient's pictogram, centred at (cx, cy) inside radius r. */
export function drawIngredient(ctx, ing, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = ing.dark;
  ctx.lineWidth = Math.max(1, r * 0.12);
  if (ing.draw === 'bun') {
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.35, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.5, r * 0.1, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.65, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ing.color;
    ctx.fillRect(-r * 0.95, r * 0.1, r * 1.9, r * 0.35);
  } else if (ing.draw === 'patty') {
    roundRect(ctx, -r, -r * 0.5, r * 2, r, r * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.4, 0, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.1, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (ing.draw === 'cheese') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.7);
    ctx.lineTo(r * 0.9, r * 0.7);
    ctx.lineTo(0, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.25, r * 0.2, r * 0.13, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.35, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else if (ing.draw === 'leaf') {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = ing.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.3);
    ctx.quadraticCurveTo(0, -r * 0.2, r * 0.8, -r * 0.35);
    ctx.stroke();
  } else if (ing.draw === 'tomato') {
    ctx.beginPath();
    ctx.arc(0, r * 0.1, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5da864';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.7, r * 0.35, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (ing.draw === 'onion') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ing.draw === 'fries') {
    ctx.fillStyle = ing.color;
    for (let i = -1; i <= 1; i += 1) {
      ctx.save();
      ctx.translate(i * r * 0.55, 0);
      ctx.rotate(i * 0.12);
      ctx.fillRect(-r * 0.22, -r * 0.9, r * 0.44, r * 1.8);
      ctx.restore();
    }
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-r, r * 0.55, r * 2, r * 0.45);
  } else if (ing.draw === 'egg') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.75, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8dcc0';
    ctx.stroke();
    ctx.fillStyle = '#f0a13a';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (ing.draw === 'bacon') {
    ctx.strokeStyle = ing.color;
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.75, r * 0.2, -r * 0.25);
    ctx.quadraticCurveTo(r * 0.6, r * 0.15, r * 0.85, -r * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.35);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, r * 0.3, r * 0.4);
    ctx.quadraticCurveTo(r * 0.65, r * 0.7, r * 0.85, r * 0.5);
    ctx.stroke();
  } else {
    // sauce: a glossy dollop with a drip
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.4);
    ctx.quadraticCurveTo(-r * 0.2, r, 0, r * 0.55);
    ctx.quadraticCurveTo(r * 0.2, r * 0.95, r * 0.4, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function mmss(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawHud(kitchen) {
    const st = kitchen.state;
    const h = LAYOUT.hud;
    context.fillStyle = PALETTE.panel;
    context.fillRect(h.x, h.y, h.w, h.h);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(h.x, h.y + h.h - 4, h.w, 4);
    text('SIZZLE & SERVE', 20, 40, 26, PALETTE.gold, 'left', 'bold');
    text('Ember & Thyme', 218, 40, 15, PALETTE.muted, 'left');
    // Coins
    context.fillStyle = PALETTE.coin;
    context.beginPath();
    context.arc(400, 32, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#8a6d00';
    text('C', 400, 37, 15, '#8a6d00', 'center', 'bold');
    text(`${st.coins}`, 420, 40, 26, PALETTE.textLight, 'left', 'bold');
    // Stars + reputation
    for (let i = 0; i < 3; i += 1) {
      star(context, 560 + i * 26, 32, 10, i < Math.min(3, st.stars) ? PALETTE.star : '#5a4632');
    }
    text(`Rep ${st.reputation}`, 640, 40, 18, PALETTE.textLight, 'left');
    // Shift timer (only while a shift runs)
    if (st.shift) {
      const left = st.shift.timeLeft;
      const urgent = left <= 30;
      context.fillStyle = urgent ? PALETTE.red : PALETTE.board;
      roundRect(context, 760, 12, 130, 40, 8);
      context.fill();
      text(`⏱ ${mmss(left)}`, 825, 40, 24, urgent ? '#ffffff' : PALETTE.text, 'center', 'bold');
      if (st.shift.rush) text('RUSH HOUR ×1.5', 905, 40, 16, PALETTE.flame, 'left', 'bold');
      else if (st.shift.combo > 1) text(`COMBO ×${st.shift.combo}`, 905, 40, 18, PALETTE.gold, 'left', 'bold');
    } else {
      const stage = STAGES[st.stageIndex];
      text(`${stage.name} · ${stage.sub}`, 760, 40, 18, PALETTE.textLight, 'left', 'bold');
    }
    // Shop + pause buttons
    context.fillStyle = PALETTE.gold;
    roundRect(context, LAYOUT.shopButton.x, LAYOUT.shopButton.y, LAYOUT.shopButton.w, LAYOUT.shopButton.h, 8);
    context.fill();
    text('🛒 SHOP', LAYOUT.shopButton.x + 42, 38, 16, PALETTE.text, 'center', 'bold');
    context.fillStyle = PALETTE.steel;
    roundRect(context, LAYOUT.pauseButton.x, LAYOUT.pauseButton.y, LAYOUT.pauseButton.w, LAYOUT.pauseButton.h, 8);
    context.fill();
    text('II PAUSE', LAYOUT.pauseButton.x + 40, 38, 16, PALETTE.text, 'center', 'bold');
  }

  function drawBoard(kitchen) {
    const st = kitchen.state;
    const b = LAYOUT.board;
    context.fillStyle = PALETTE.board;
    roundRect(context, b.x, b.y, b.w, b.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 3;
    roundRect(context, b.x, b.y, b.w, b.h, 12);
    context.stroke();
    text('ORDER BOARD', b.x + 16, b.y + 30, 20, PALETTE.text, 'left', 'bold');
    const shift = st.shift;
    if (!shift) {
      text('No shift running.', b.x + 16, b.y + 70, 16, PALETTE.muted, 'left');
      text('Pick a kitchen below', b.x + 16, b.y + 96, 16, PALETTE.muted, 'left');
      text('and press Space to start.', b.x + 16, b.y + 120, 16, PALETTE.muted, 'left');
      return;
    }
    const live = shift.orders.filter((o) => !o.failed && !o.served);
    if (live.length === 0) {
      text('All caught up!', b.x + 16, b.y + 70, 18, PALETTE.text, 'left', 'bold');
      text('New orders are on their way…', b.x + 16, b.y + 98, 15, PALETTE.muted, 'left');
      return;
    }
    for (let i = 0; i < live.length; i += 1) {
      const order = live[i];
      const recipe = recipeById(order.recipeId);
      const r = ticketRect(i);
      const wobble = order.patience < 12 ? Math.sin(order.wobble) * 2 : 0;
      context.save();
      context.translate(wobble, 0);
      context.fillStyle = PALETTE.ticket;
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.fill();
      context.strokeStyle = order.patience < 12 ? PALETTE.red : PALETTE.ticketEdge;
      context.lineWidth = order.patience < 12 ? 3 : 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.stroke();
      text(`#${order.id}  ${recipe.name}`, r.x + 12, r.y + 26, 18, PALETTE.text, 'left', 'bold');
      text(`$${recipe.price}`, r.x + r.w - 12, r.y + 26, 18, PALETTE.green, 'right', 'bold');
      // Needed ingredients as pictograms with a count.
      const counts = {};
      for (const id of recipe.needs) counts[id] = (counts[id] || 0) + 1;
      let ix = r.x + 26;
      for (const id of Object.keys(counts)) {
        drawIngredient(context, ingredientById(id), ix, r.y + 56, 13);
        if (counts[id] > 1) text(`×${counts[id]}`, ix + 15, r.y + 62, 13, PALETTE.text, 'left', 'bold');
        ix += counts[id] > 1 ? 52 : 34;
      }
      // Patience bar.
      const frac = Math.max(0, order.patience / order.maxPatience);
      context.fillStyle = '#e0d3b8';
      roundRect(context, r.x + 12, r.y + r.h - 18, r.w - 24, 9, 4);
      context.fill();
      context.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? PALETTE.orange : PALETTE.red;
      if (frac > 0) {
        roundRect(context, r.x + 12, r.y + r.h - 18, (r.w - 24) * frac, 9, 4);
        context.fill();
      }
      context.restore();
    }
  }

  function drawCounter(kitchen, hover) {
    const st = kitchen.state;
    const c = LAYOUT.counter;
    context.fillStyle = PALETTE.counter;
    roundRect(context, c.x, c.y, c.w, c.h, 12);
    context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, c.x + 6, c.y + 6, c.w - 12, 26, 8);
    context.fill();
    text('INGREDIENTS — click a bin, or press 1–0', c.x + 16, c.y + 25, 14, PALETTE.text, 'left', 'bold');

    // Ingredient bins.
    const ings = kitchen.ingredients();
    for (let i = 0; i < ings.length; i += 1) {
      const ing = ings[i];
      const r = binRect(i);
      const hot = hover && inside(r, hover);
      context.fillStyle = hot ? '#d9b98a' : '#f7ead2';
      roundRect(context, r.x, r.y, r.w, r.h, 8);
      context.fill();
      context.strokeStyle = ing.cook ? PALETTE.flame : PALETTE.counterEdge;
      context.lineWidth = 2;
      roundRect(context, r.x, r.y, r.w, r.h, 8);
      context.stroke();
      drawIngredient(context, ing, r.x + 26, r.y + r.h / 2, 16);
      text(ing.name, r.x + 48, r.y + 24, 15, PALETTE.text, 'left', 'bold');
      text(ing.cook ? '🔥 stove' : 'ready', r.x + 48, r.y + 42, 12, ing.cook ? PALETTE.orange : PALETTE.muted, 'left');
      text(String(i + 1 === 10 ? 0 : i + 1), r.x + r.w - 10, r.y + 18, 12, PALETTE.muted, 'right');
    }

    // Plates on the pass.
    text('PLATES — click to pick one, then build the dish (Q/W/E/R)', c.x + 16, LAYOUT.plates.y - 4, 14, PALETTE.textLight, 'left', 'bold');
    const shift = st.shift;
    const plates = shift ? shift.plates : [];
    for (let i = 0; i < 4; i += 1) {
      const r = plateRect(i);
      const plate = plates[i];
      const selected = st.selectedPlate === i && plate;
      context.fillStyle = selected ? '#ffe9a8' : PALETTE.plate;
      context.beginPath();
      context.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - 4, r.h / 2 - 4, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = selected ? PALETTE.gold : PALETTE.plateEdge;
      context.lineWidth = selected ? 4 : 2;
      context.beginPath();
      context.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - 4, r.h / 2 - 4, 0, 0, Math.PI * 2);
      context.stroke();
      if (!plate) {
        text('🔒', r.x + r.w / 2, r.y + r.h / 2 + 8, 22, PALETTE.muted, 'center');
        continue;
      }
      const shakeX = plate.shake > 0 ? Math.sin(plate.shake * 40) * 4 : 0;
      context.save();
      context.translate(shakeX, 0);
      if (plate.items.length === 0) {
        text(`Plate ${i + 1}`, r.x + r.w / 2, r.y + r.h / 2 + 5, 14, PALETTE.muted, 'center');
      } else {
        const n = plate.items.length;
        const stepX = Math.min(30, (r.w - 30) / Math.max(1, n));
        for (let j = 0; j < n; j += 1) {
          const item = plate.items[j];
          const ing = ingredientById(item.id);
          drawIngredient(context, ing, r.x + 22 + j * stepX, r.y + r.h / 2, 13);
          if (item.cooked) {
            context.fillStyle = PALETTE.green;
            context.beginPath();
            context.arc(r.x + 22 + j * stepX + 10, r.y + r.h / 2 - 12, 6, 0, Math.PI * 2);
            context.fill();
            text('✓', r.x + 22 + j * stepX + 10, r.y + r.h / 2 - 8, 9, '#ffffff', 'center', 'bold');
          }
        }
      }
      context.restore();
      if (plate.items.length > 0) {
        context.fillStyle = PALETTE.red;
        context.beginPath();
        context.arc(r.x + r.w - 8, r.y + 10, 9, 0, Math.PI * 2);
        context.fill();
        text('×', r.x + r.w - 8, r.y + 14, 12, '#ffffff', 'center', 'bold');
      }
    }

    // Stove burners.
    const s = LAYOUT.stove;
    context.fillStyle = PALETTE.steelDark;
    roundRect(context, s.x, s.y, s.w, s.h, 12);
    context.fill();
    text('STOVE — click a bin for raw food, click a done burner to plate it', s.x + 16, s.y + 24, 14, '#eef1f5', 'left', 'bold');
    const burners = shift ? shift.burners : [];
    for (let i = 0; i < 3; i += 1) {
      const r = burnerRect(i);
      const burner = burners[i];
      context.fillStyle = '#3a4148';
      context.beginPath();
      context.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 8, r.w / 2 - 6, 24, 0, 0, Math.PI * 2);
      context.fill();
      if (!burner) {
        text('🔒', r.x + r.w / 2, r.y + r.h / 2 + 10, 20, '#6e7a82', 'center');
        continue;
      }
      if (burner.ing !== null) {
        const ing = ingredientById(burner.ing);
        if (burner.burnt) {
          context.fillStyle = '#1c1c1c';
          context.beginPath();
          context.arc(r.x + r.w / 2, r.y + r.h / 2 - 6, 20, 0, Math.PI * 2);
          context.fill();
          text('BURNT!', r.x + r.w / 2, r.y + 18, 13, '#ffffff', 'center', 'bold');
          text('click to clear', r.x + r.w / 2, r.y + r.h - 4, 11, '#ffb3ad', 'center');
        } else {
          // Flame ring while cooking.
          if (!burner.done) {
            context.fillStyle = PALETTE.flame;
            context.beginPath();
            context.arc(r.x + r.w / 2, r.y + r.h / 2 - 4, 24 + Math.sin(Date.now() / 90 + i) * 2, 0, Math.PI * 2);
            context.fill();
          }
          drawIngredient(context, ing, r.x + r.w / 2, r.y + r.h / 2 - 4, 19);
          // Progress ring.
          context.strokeStyle = burner.done ? PALETTE.green : PALETTE.gold;
          context.lineWidth = 5;
          context.beginPath();
          context.arc(r.x + r.w / 2, r.y + r.h / 2 - 4, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * burner.progress);
          context.stroke();
          if (burner.done) text('READY ✓', r.x + r.w / 2, r.y + 16, 13, PALETTE.green, 'center', 'bold');
          else text(`${Math.ceil((1 - burner.progress) * ing.cookTime)}s`, r.x + r.w / 2, r.y + r.h - 4, 12, '#eef1f5', 'center', 'bold');
        }
      } else {
        text('empty burner', r.x + r.w / 2, r.y + r.h / 2 + 8, 13, '#9aa5ad', 'center');
      }
    }
    // Trash can.
    const t = LAYOUT.trash;
    context.fillStyle = '#5a4632';
    roundRect(context, t.x, t.y, t.w, t.h, 8);
    context.fill();
    text('🗑', t.x + t.w / 2, t.y + 34, 24, '#f7ead2', 'center');
  }

  function drawPass(kitchen, hover) {
    const st = kitchen.state;
    const p = LAYOUT.pass;
    context.fillStyle = PALETTE.board;
    roundRect(context, p.x, p.y, p.w, p.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 3;
    roundRect(context, p.x, p.y, p.w, p.h, 12);
    context.stroke();
    text('SERVE WINDOW', p.x + 16, p.y + 30, 20, PALETTE.text, 'left', 'bold');
    const shift = st.shift;
    if (!shift) {
      text('The pass is quiet.', p.x + 16, p.y + 70, 16, PALETTE.muted, 'left');
      text('Start a shift and the', p.x + 16, p.y + 96, 16, PALETTE.muted, 'left');
      text('window fills with orders.', p.x + 16, p.y + 120, 16, PALETTE.muted, 'left');
      return;
    }
    const plate = shift.plates[st.selectedPlate];
    text(`Selected: Plate ${st.selectedPlate + 1}`, p.x + 16, p.y + 62, 16, PALETTE.text, 'left', 'bold');
    // Big preview of the selected plate.
    context.fillStyle = PALETTE.plate;
    context.beginPath();
    context.ellipse(p.x + p.w / 2, p.y + 135, 110, 55, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.plateEdge;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(p.x + p.w / 2, p.y + 135, 110, 55, 0, 0, Math.PI * 2);
    context.stroke();
    if (plate && plate.items.length > 0) {
      const n = plate.items.length;
      const stepX = Math.min(36, 180 / Math.max(1, n));
      for (let j = 0; j < n; j += 1) {
        const item = plate.items[j];
        drawIngredient(context, ingredientById(item.id), p.x + p.w / 2 - ((n - 1) * stepX) / 2 + j * stepX, p.y + 135, 17);
      }
      // Which live order does it match, if any?
      const match = shift.orders.find((o) => !o.failed && !o.served && kitchen.plateMatches(plate, recipeById(o.recipeId)));
      if (match) {
        text('✓ READY TO SERVE!', p.x + p.w / 2, p.y + 218, 20, PALETTE.green, 'center', 'bold');
        text(`${recipeById(match.recipeId).name} — ticket #${match.id}`, p.x + p.w / 2, p.y + 242, 15, PALETTE.text, 'center');
      } else {
        text('Keep building…', p.x + p.w / 2, p.y + 218, 16, PALETTE.muted, 'center');
        text('match a ticket on the board', p.x + p.w / 2, p.y + 242, 14, PALETTE.muted, 'center');
      }
    } else {
      text('Empty plate', p.x + p.w / 2, p.y + 141, 16, PALETTE.muted, 'center');
      text('Click ingredient bins', p.x + p.w / 2, p.y + 218, 15, PALETTE.muted, 'center');
      text('to build a dish here.', p.x + p.w / 2, p.y + 242, 15, PALETTE.muted, 'center');
    }
    // Serve button.
    const sb = LAYOUT.serveButton;
    const hot = hover && inside(sb, hover);
    context.fillStyle = hot ? '#6fc97a' : PALETTE.green;
    roundRect(context, sb.x, sb.y, sb.w, sb.h, 10);
    context.fill();
    text('🍽  SERVE  (F)', sb.x + sb.w / 2, sb.y + 35, 20, '#ffffff', 'center', 'bold');
    // Shift stats.
    text(`Served ${shift.served}  ·  Earned ${shift.earned} coins  ·  Tips ${shift.tips}`, p.x + 16, p.y + 350, 15, PALETTE.text, 'left');
    text(`Best combo ×${shift.bestCombo}  ·  Burnt ${shift.burnt}  ·  Left ${shift.failed}`, p.x + 16, p.y + 374, 15, PALETTE.text, 'left');
    // Star progress for this shift.
    const stage = STAGES[st.stageIndex];
    for (let i = 0; i < 3; i += 1) {
      const bar = stage.stars[i];
      const frac = Math.min(1, shift.earned / bar);
      context.fillStyle = '#e0d3b8';
      roundRect(context, p.x + 16, p.y + 396 + i * 22, p.w - 32, 10, 5);
      context.fill();
      context.fillStyle = PALETTE.gold;
      if (frac > 0) {
        roundRect(context, p.x + 16, p.y + 396 + i * 22, (p.w - 32) * frac, 10, 5);
        context.fill();
      }
      star(context, p.x + p.w - 8, p.y + 401 + i * 22, 8, shift.earned >= bar ? PALETTE.star : '#c9b98f');
      text(`${bar}`, p.x + p.w - 26, p.y + 405 + i * 22, 12, PALETTE.text, 'right');
    }
  }

  function drawBottom(kitchen) {
    const st = kitchen.state;
    // Help strip.
    const h = LAYOUT.help;
    context.fillStyle = PALETTE.panel;
    roundRect(context, h.x, h.y, h.w, h.h, 8);
    context.fill();
    text('Click bins to build a dish · Raw food (🔥) cooks on the stove — click a done burner to plate it · Click a ticket or F to serve · 1–0 bins · Q/W/E/R plates · T trash · P pause · S shop · M mute', h.x + 14, h.y + 27, 13, PALETTE.textLight, 'left');

    // Daily quests.
    const q = LAYOUT.quests;
    context.fillStyle = PALETTE.board;
    roundRect(context, q.x, q.y, q.w, q.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 2;
    roundRect(context, q.x, q.y, q.w, q.h, 12);
    context.stroke();
    text('📋 DAILY QUESTS — finish one, earn its coins', q.x + 16, q.y + 28, 16, PALETTE.text, 'left', 'bold');
    if (st.quests.length === 0) {
      text('Quests appear when a shift starts.', q.x + 16, q.y + 60, 15, PALETTE.muted, 'left');
    }
    for (let i = 0; i < st.quests.length; i += 1) {
      const quest = st.quests[i];
      const y = q.y + 54 + i * 34;
      context.fillStyle = quest.done ? PALETTE.green : '#e0d3b8';
      roundRect(context, q.x + 16, y, 22, 22, 5);
      context.fill();
      if (quest.done) text('✓', q.x + 27, y + 17, 14, '#ffffff', 'center', 'bold');
      const target = quest.kind === 'noburn' ? 1 : quest.target;
      text(quest.text, q.x + 48, y + 17, 15, quest.done ? PALETTE.muted : PALETTE.text, 'left');
      text(quest.done ? 'DONE' : `${Math.min(quest.progress, target)}/${target}`, q.x + q.w - 140, y + 17, 14, quest.done ? PALETTE.green : PALETTE.text, 'left', 'bold');
      text(`+${quest.reward}c`, q.x + q.w - 16, y + 17, 14, PALETTE.gold, 'right', 'bold');
    }

    // Recipe menu for the current stage.
    const r = LAYOUT.recipes;
    context.fillStyle = PALETTE.board;
    roundRect(context, r.x, r.y, r.w, r.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.boardEdge;
    context.lineWidth = 2;
    roundRect(context, r.x, r.y, r.w, r.h, 12);
    context.stroke();
    const stage = STAGES[st.stageIndex];
    text(`📖 MENU — ${stage.name} (${kitchen.availableRecipes().length} recipes)`, r.x + 16, r.y + 28, 16, PALETTE.text, 'left', 'bold');
    const recipes = kitchen.availableRecipes();
    for (let i = 0; i < recipes.length; i += 1) {
      const recipe = recipes[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = r.x + 16 + col * 300;
      const y = r.y + 52 + row * 30;
      text(`${recipe.name}`, x, y, 14, PALETTE.text, 'left', 'bold');
      text(`$${recipe.price}`, x + 150, y, 14, PALETTE.green, 'left', 'bold');
      let ix = x + 190;
      for (const id of recipe.needs) {
        drawIngredient(context, ingredientById(id), ix, y - 4, 8);
        ix += 15;
      }
    }
  }

  function drawToast(kitchen) {
    // One slim bar in the strip below the panels: the shift message (rush
    // hour, stage name) wins over the toast, so the two never stack or cover
    // the quest and menu panels above.
    const st = kitchen.state;
    const line = st.messageTimer > 0 && st.message
      ? { text: st.message, color: PALETTE.gold }
      : st.toastTimer > 0 && st.toast
        ? { text: st.toast, color: PALETTE.textLight }
        : null;
    if (line === null) return;
    context.fillStyle = 'rgba(43,29,18,0.92)';
    const w = Math.min(1100, 40 + line.text.length * 8);
    roundRect(context, (FIELD.width - w) / 2, 770, w, 28, 8);
    context.fill();
    text(line.text, FIELD.width / 2, 789, 15, line.color, 'center', st.messageTimer > 0 ? 'bold' : '');
  }

  function drawTitle(kitchen, best) {
    const st = kitchen.state;
    // Warm title backdrop over the kitchen.
    context.fillStyle = 'rgba(36,26,18,0.82)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('🍳  SIZZLE & SERVE', FIELD.width / 2, 112, 64, PALETTE.gold, 'center', 'bold');
    text('Ember & Thyme — a cooking game in three kitchens', FIELD.width / 2, 148, 22, PALETTE.textLight, 'center');
    text('Build dishes on plates, mind the stove, serve before patience runs out.', FIELD.width / 2, 174, 17, PALETTE.muted, 'center');
    text('Coins you earn buy real upgrades in the shop — faster stoves, more burners, happier customers.', FIELD.width / 2, 198, 17, PALETTE.muted, 'center');
    text(`Coins ${st.coins}   ·   Stars ${st.stars}   ·   Best shift ${best} coins`, FIELD.width / 2, 232, 18, PALETTE.textLight, 'center', 'bold');
    text('PICK YOUR KITCHEN — click a card, or press Space for the next one', FIELD.width / 2, 268, 16, PALETTE.gold, 'center', 'bold');
    for (let i = 0; i < STAGES.length; i += 1) {
      const stage = STAGES[i];
      const r = stageCardRect(i);
      const locked = i > st.unlockedStage;
      context.fillStyle = locked ? '#4a3a2c' : PALETTE.board;
      roundRect(context, r.x, r.y, r.w, r.h, 12);
      context.fill();
      context.strokeStyle = i === st.stageIndex ? PALETTE.gold : PALETTE.boardEdge;
      context.lineWidth = i === st.stageIndex ? 4 : 2;
      roundRect(context, r.x, r.y, r.w, r.h, 12);
      context.stroke();
      text(locked ? '🔒 LOCKED' : `${i + 1}. ${stage.name}`, r.x + 20, r.y + 34, 20, locked ? PALETTE.muted : PALETTE.text, 'left', 'bold');
      text(stage.sub, r.x + 20, r.y + 62, 16, locked ? PALETTE.muted : PALETTE.muted, 'left');
      text(`Shift ${Math.floor(stage.shiftSeconds / 60)}:${String(stage.shiftSeconds % 60).padStart(2, '0')}  ·  up to ${stage.maxOrders} tickets`, r.x + 20, r.y + 88, 14, locked ? PALETTE.muted : PALETTE.text, 'left');
      text('Stars:', r.x + 20, r.y + 116, 14, locked ? PALETTE.muted : PALETTE.text, 'left');
      for (let s = 0; s < 3; s += 1) {
        star(context, r.x + 92 + s * 52, r.y + 112, 9, PALETTE.star);
        text(`${stage.stars[s]}`, r.x + 104 + s * 52, r.y + 117, 13, locked ? PALETTE.muted : PALETTE.text, 'left');
      }
      const words = stage.intro.split(' ');
      let line = '';
      let ly = r.y + 148;
      for (const word of words) {
        if ((line + word).length > 34) {
          text(line, r.x + 20, ly, 13, locked ? PALETTE.muted : PALETTE.text, 'left');
          line = '';
          ly += 18;
        }
        line += `${word} `;
      }
      text(line, r.x + 20, ly, 13, locked ? PALETTE.muted : PALETTE.text, 'left');
    }
    text('Press Space or click a kitchen to start the shift  ·  S opens the shop', FIELD.width / 2, 534, 17, PALETTE.textLight, 'center');
    text('Click bins to add ingredients · raw food cooks on the stove · serve matching tickets before they walk out', FIELD.width / 2, 556, 15, PALETTE.muted, 'center');
  }

  function drawShop(kitchen) {
    const st = kitchen.state;
    context.fillStyle = 'rgba(20,26,20,0.9)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('🛒  THE SHOP — spend the coins you earned', FIELD.width / 2, 90, 34, PALETTE.gold, 'center', 'bold');
    text(`You have ${st.coins} coins. Upgrades stay bought for every later shift.`, FIELD.width / 2, 122, 17, PALETTE.textLight, 'center');
    for (let i = 0; i < SHOP_ITEMS.length; i += 1) {
      const item = SHOP_ITEMS[i];
      const r = shopItemRect(i);
      const owned = !!st.shopOwned[item.id];
      const afford = st.coins >= item.cost;
      context.fillStyle = owned ? '#2e4a2e' : afford ? PALETTE.board : '#6b5a44';
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.fill();
      context.strokeStyle = owned ? PALETTE.green : PALETTE.boardEdge;
      context.lineWidth = 2;
      roundRect(context, r.x, r.y, r.w, r.h, 10);
      context.stroke();
      text(item.name, r.x + 20, r.y + 33, 19, owned || afford ? PALETTE.text : PALETTE.textLight, 'left', 'bold');
      text(item.desc, r.x + 260, r.y + 33, 15, owned || afford ? PALETTE.muted : '#c9b89a', 'left');
      text(owned ? 'OWNED ✓' : `${item.cost} coins`, r.x + r.w - 20, r.y + 33, 18, owned ? PALETTE.green : afford ? PALETTE.gold : PALETTE.muted, 'right', 'bold');
    }
    text('Click an item to buy it  ·  S or Esc to go back', FIELD.width / 2, 668, 17, PALETTE.textLight, 'center');
  }

  function drawPaused(kitchen) {
    context.fillStyle = 'rgba(36,26,18,0.85)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, 320, 56, PALETTE.textLight, 'center', 'bold');
    text('The stove waits. The customers do not — well, right now they do.', FIELD.width / 2, 360, 18, PALETTE.muted, 'center');
    text('P to resume  ·  S to open the shop  ·  Space to resume', FIELD.width / 2, 400, 17, PALETTE.textLight, 'center');
  }

  function drawShiftEnd(kitchen, best) {
    const s = kitchen.state.shiftSummary;
    context.fillStyle = 'rgba(36,26,18,0.88)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    if (!s) return;
    const stage = STAGES[s.stageIndex];
    text('SHIFT OVER', FIELD.width / 2, 130, 52, PALETTE.gold, 'center', 'bold');
    text(`${stage.name} · ${stage.sub}`, FIELD.width / 2, 168, 20, PALETTE.textLight, 'center');
    for (let i = 0; i < 3; i += 1) {
      star(context, FIELD.width / 2 - 52 + i * 52, 220, 22, i < s.stars ? PALETTE.star : '#5a4632');
    }
    const lines = [
      `Dishes served: ${s.served}`,
      `Coins earned this shift: ${s.earned}`,
      `Tips: ${s.tips} coins`,
      `Best combo: ×${s.bestCombo}`,
      `Burnt dishes: ${s.burnt}   ·   Walked out: ${s.failed}`,
    ];
    if (s.questBonus > 0) lines.push(`No-burn quest bonus: +${s.questBonus} coins`);
    lines.push(`Coins in the till: ${s.coins}`);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, 290 + i * 34, 19, PALETTE.textLight, 'center');
    }
    if (s.unlocked) text(`🎉 ${STAGES[s.stageIndex + 1].name} is unlocked!`, FIELD.width / 2, 290 + lines.length * 34 + 10, 20, PALETTE.gold, 'center', 'bold');
    else if (s.stars === 0) text('No star this time — the next kitchen stays locked. Try again!', FIELD.width / 2, 290 + lines.length * 34 + 10, 18, PALETTE.red, 'center', 'bold');
    text('Space — next shift in this kitchen  ·  S — spend coins in the shop  ·  T — title screen', FIELD.width / 2, 640, 17, PALETTE.textLight, 'center');
    text(`Best shift ever: ${best} coins`, FIELD.width / 2, 672, 15, PALETTE.muted, 'center');
  }

  function drawBackground() {
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, 560);
    context.fillStyle = PALETTE.wallTrim;
    for (let x = 0; x < FIELD.width; x += 160) {
      context.fillRect(x, 552, 160, 8);
    }
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 560, FIELD.width, FIELD.height - 560);
    // Hanging lamps.
    for (let x = 200; x < FIELD.width; x += 320) {
      context.strokeStyle = '#1c130c';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, 26);
      context.stroke();
      context.fillStyle = PALETTE.flame;
      context.beginPath();
      context.arc(x, 34, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,154,61,0.15)';
      context.beginPath();
      context.arc(x, 34, 34, 0, Math.PI * 2);
      context.fill();
    }
  }

  /** Paint one frame: the kitchen, then the HUD or a panel for the screen. */
  function draw(kitchen, screen, hover, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawBackground();
    drawHud(kitchen);
    drawBoard(kitchen);
    drawCounter(kitchen, hover);
    drawPass(kitchen, hover);
    drawBottom(kitchen);
    drawToast(kitchen);
    if (screen === SCREEN_TITLE) drawTitle(kitchen, best);
    else if (screen === SCREEN_SHOP) drawShop(kitchen);
    else if (screen === SCREEN_PAUSED) drawPaused(kitchen);
    else if (screen === SCREEN_SHIFTEND) drawShiftEnd(kitchen, best);
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a CSS pixel position on the canvas to logical playfield coordinates. */
    toLogical(cssX, cssY) {
      const ratio = window.devicePixelRatio || 1;
      return {
        x: (cssX * ratio - view.x) / view.scale,
        y: (cssY * ratio - view.y) / view.scale,
      };
    },
  };
}
