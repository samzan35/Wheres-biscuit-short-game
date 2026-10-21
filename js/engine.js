'use strict';
// Core engine: input, entities and grid movement, map loading, rendering, lighting,
// and the promise-based helpers that cutscenes are written with.

const VIEW_W = 240, VIEW_H = 176;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
const Input = (() => {
  const held = { up: false, down: false, left: false, right: false, a: false, b: false };
  const pressed = { a: false, b: false, up: false, down: false, left: false, right: false, start: false };
  const stack = []; // most recent direction last
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', Enter: 'a', KeyE: 'a',
    KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', Escape: 'b', Backspace: 'b',
  };

  function down(k) {
    if (!held[k]) pressed[k] = true;
    held[k] = true;
    if (DIRS[k] && !stack.includes(k)) stack.push(k);
  }
  function up(k) {
    held[k] = false;
    const i = stack.indexOf(k);
    if (i >= 0) stack.splice(i, 1);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') { Sound.toggleMute(); return; }
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    down(k);
    pressed.start = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYS[e.code];
    if (k) up(k);
  });
  window.addEventListener('blur', () => { for (const k in held) up(k); });

  // touch buttons
  document.querySelectorAll('#touch button').forEach((btn) => {
    const k = btn.dataset.dir || btn.dataset.btn;
    const on = (e) => { e.preventDefault(); btn.classList.add('on'); down(k); pressed.start = true; };
    const off = (e) => { e.preventDefault(); btn.classList.remove('on'); up(k); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
  });

  return {
    held,
    get dir() { return stack.length ? stack[stack.length - 1] : null; },
    consume(k) { const v = pressed[k]; pressed[k] = false; return v; },
    consumeDir(k) { const v = pressed[k]; pressed[k] = false; return v; },
    clear() { for (const k in pressed) pressed[k] = false; },
    pressStart() { pressed.start = true; },
  };
})();

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const lightCanvas = document.createElement('canvas');
lightCanvas.width = VIEW_W;
lightCanvas.height = VIEW_H;
const lctx = lightCanvas.getContext('2d');

const Game = {
  mode: 'title', // title | play | end
  map: null,
  entities: [],
  player: null,
  flags: {},
  busy: 0,
  time: 0,
  fade: 1,
  fadeTarget: 1,
  fadeSpeed: 2,
  cam: { x: 0, y: 0 },
  titlePan: 0,
  waiters: [],
  extraLights: [],
  shake: 0,
};

function makeEntity(o) {
  return Object.assign({
    x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, progress: 0, fx: 0, fy: 0,
    speed: 4.5, frame: 0, stepParity: 0, visible: true, solid: true, emote: null, follower: false,
  }, o, { px: (o.x || 0) * TS, py: (o.y || 0) * TS });
}

function placeEntity(e, x, y, dir) {
  e.x = x; e.y = y; e.px = x * TS; e.py = y * TS; e.moving = false; e.progress = 0;
  if (dir) e.dir = dir;
}

// ---------------------------------------------------------------------------
// Map prerendering
// ---------------------------------------------------------------------------
function prerenderMap(m) {
  const H = m.grid.length, W = m.grid[0].length;
  m.w = W; m.h = H;
  const cv = document.createElement('canvas');
  cv.width = W * TS;
  cv.height = H * TS;
  const c = cv.getContext('2d');
  const at = (x, y) => (m.grid[y] && m.grid[y][x]) || '';
  const pass = (key) => {
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const def = TILES[at(tx, ty)];
      if (!def) continue;
      const name = def[key];
      if (!name) continue;
      const fn = key === 'base' ? GROUND[name] : OVER[name];
      const info = { tx, ty, nb: (dx, dy) => at(tx + dx, ty + dy) };
      fn(c, tx * TS, ty * TS, tileRng(tx, ty, key === 'base' ? 1 : 2), info);
    }
  };
  pass('base');
  pass('over');
  for (const b of m.buildings) drawBuilding(c, b);
  m.canvas = cv;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
function objectActive(o) {
  return !o.when || o.when(Game.flags);
}

function objectCovers(o, x, y) {
  return x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1);
}

function objectAt(x, y) {
  return Game.map.objects.find((o) => objectActive(o) && objectCovers(o, x, y));
}

function entityAt(x, y, except) {
  return Game.entities.find((e) => e !== except && e.visible && ((e.x === x && e.y === y) || (e.moving && e.tx === x && e.ty === y)));
}

function doorAt(x, y) {
  return Game.map.doors.find((d) => d.x === x && d.y === y);
}

function tileSolid(x, y) {
  const m = Game.map;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
  const def = TILES[m.grid[y][x]];
  return !def || !!def.solid;
}

function passable(x, y, mover) {
  if (tileSolid(x, y)) return false;
  const o = objectAt(x, y);
  if (o && o.solid) return false;
  const e = entityAt(x, y, mover);
  if (e && e.solid && !(mover === Game.player && e.follower)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------
function startMove(e, dir) {
  const [dx, dy] = DIRS[dir];
  e.dir = dir;
  e.fx = e.x; e.fy = e.y;
  e.tx = e.x + dx; e.ty = e.y + dy;
  e.moving = true;
  e.progress = 0;
  e.stepParity ^= 1;
}

function updateEntity(e, dt) {
  if (!e.moving) return;
  e.progress += dt * e.speed;
  if (e.progress >= 1) {
    e.x = e.tx; e.y = e.ty;
    e.px = e.x * TS; e.py = e.y * TS;
    e.moving = false;
    e.progress = 0;
    if (e.onArrive) { const f = e.onArrive; e.onArrive = null; f(); }
  } else {
    e.px = (e.fx + (e.tx - e.fx) * e.progress) * TS;
    e.py = (e.fy + (e.ty - e.fy) * e.progress) * TS;
  }
}

function followerOf() {
  return Game.entities.find((e) => e.follower);
}

function playerStep(dir) {
  const p = Game.player;
  const [dx, dy] = DIRS[dir];
  const nx = p.x + dx, ny = p.y + dy;
  p.dir = dir;
  const door = doorAt(nx, ny);
  if (door) { Story.door(door.id); return; }
  if (!passable(nx, ny, p)) {
    if (Game.time - (p.lastBump || 0) > 0.35) { Sound.bump(); p.lastBump = Game.time; }
    return;
  }
  const f = followerOf();
  const fromX = p.x, fromY = p.y;
  startMove(p, dir);
  p.speed = Input.held.b ? 8 : 4.6;
  p.onArrive = () => Story.stepped(p.x, p.y);
  if (f) {
    if (f.x === nx && f.y === ny) {
      // walking back through the follower: swap places
      f.x = fromX; f.y = fromY; f.px = fromX * TS; f.py = fromY * TS;
    } else if (!(f.x === fromX && f.y === fromY)) {
      const ddx = fromX - f.x, ddy = fromY - f.y;
      if (Math.abs(ddx) + Math.abs(ddy) === 1) {
        startMove(f, ddx > 0 ? 'right' : ddx < 0 ? 'left' : ddy > 0 ? 'down' : 'up');
        f.speed = p.speed;
      } else {
        placeEntity(f, fromX, fromY, dir);
      }
    }
  }
}

function updatePlayerControl(dt) {
  const p = Game.player;
  if (p.moving) return;
  const dir = Input.dir;
  if (Input.consume('a')) { Input.clear(); interact(); return; }
  Input.consume('b');
  if (!dir) { p.turnTimer = 0; return; }
  if (dir !== p.dir && !p.wasMoving) {
    p.dir = dir;
    p.turnTimer = 0.09;
    return;
  }
  if (p.turnTimer > 0) { p.turnTimer -= dt; return; }
  playerStep(dir);
}

function interact() {
  const p = Game.player;
  const [dx, dy] = DIRS[p.dir];
  const x = p.x + dx, y = p.y + dy;
  const e = entityAt(x, y, p);
  if (e && e.talk) {
    if (e.faceOnTalk !== false) e.dir = OPPOSITE[p.dir];
    run(e.talk);
    return;
  }
  const o = objectAt(x, y);
  if (o) { Story.examine(o); return; }
  const door = doorAt(x, y);
  if (door) { Story.door(door.id); return; }
  if (!tileSolid(x, y) && x >= 0 && y >= 0) return;
  const ch = Game.map.grid[y] && Game.map.grid[y][x];
  if (ch) Story.examineTile(ch, x, y);
}

// ---------------------------------------------------------------------------
// Map loading
// ---------------------------------------------------------------------------
function loadMap(id, x, y, dir) {
  const m = MAPS[id];
  if (!m.canvas) prerenderMap(m);
  Game.map = m;
  const keep = Game.entities.filter((e) => e === Game.player || e.follower);
  Game.entities = keep.concat(Story.spawn(id));
  placeEntity(Game.player, x, y, dir);
  const f = followerOf();
  if (f) {
    const back = DIRS[OPPOSITE[dir]];
    const options = [back, DIRS[dir], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const spot = options.find(([dx, dy]) => passable(x + dx, y + dy, f)) || [0, 0];
    placeEntity(f, x + spot[0], y + spot[1], dir);
  }
  Game.extraLights = [];
  updateCamera(true);
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
function updateCamera() {
  const m = Game.map;
  const mw = m.w * TS, mh = m.h * TS;
  let cx, cy;
  if (Game.mode === 'title') {
    cx = Game.titlePan;
    cy = (mh - VIEW_H) / 2 + 8;
  } else {
    cx = Game.player.px + 8 - VIEW_W / 2;
    cy = Game.player.py + 8 - VIEW_H / 2;
  }
  cx = mw <= VIEW_W ? (mw - VIEW_W) / 2 : Math.max(0, Math.min(mw - VIEW_W, cx));
  cy = mh <= VIEW_H ? (mh - VIEW_H) / 2 : Math.max(0, Math.min(mh - VIEW_H, cy));
  Game.cam.x = Math.round(cx);
  Game.cam.y = Math.round(cy);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function spriteFrame(e) {
  const set = e.sprite[e.dir] || e.sprite.down;
  if (!e.moving) return set[0];
  if (e.progress < 0.5) return set[e.stepParity ? 1 : 2];
  return set[0];
}

function render() {
  const m = Game.map;
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!m) return;
  let sx = 0, sy = 0;
  if (Game.shake > 0) { sx = Math.round((Math.random() - 0.5) * 3); sy = Math.round((Math.random() - 0.5) * 2); }
  const ox = -Game.cam.x + sx, oy = -Game.cam.y + sy;
  ctx.drawImage(m.canvas, ox, oy);

  // open doors and ground decals
  for (const d of Story.openDoors()) drawOpenDoor(ctx, d.x * TS + ox, d.y * TS + oy);
  for (const o of m.objects) if (o.ground && objectActive(o)) PROPS[o.art](ctx, o.x * TS + ox, o.y * TS + oy, o, Game.time);

  // y-sorted props and entities
  const list = [];
  for (const o of m.objects) if (!o.ground && objectActive(o)) list.push({ y: (o.y + (o.h || 1)) * TS, o });
  for (const e of Game.entities) if (e.visible) list.push({ y: e.py + TS + 0.5, e });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.o) PROPS[it.o.art](ctx, it.o.x * TS + ox, it.o.y * TS + oy, it.o, Game.time);
    else {
      const e = it.e;
      const ex = Math.round(e.px + ox), ey = Math.round(e.py + oy) - (e.lift || 0);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(ex + 4, ey + 14, 8, 2);
      ctx.fillRect(ex + 3, ey + 15, 10, 1);
      const bob = e.moving && e.progress < 0.5 ? -1 : 0;
      ctx.drawImage(spriteFrame(e), ex, ey - 2 + bob);
    }
  }

  renderLighting(ox, oy);

  for (const e of Game.entities) {
    if (e.visible && e.emote) drawEmote(ctx, e.px + ox, e.py + oy - 2, e.emote, Game.time);
  }

  if (Game.fade > 0.001) {
    ctx.fillStyle = `rgba(0,0,0,${Game.fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function currentLights() {
  const m = Game.map;
  const lights = m.lights.slice();
  lights.push(...Story.dynamicLights());
  lights.push(...Game.extraLights);
  if (Game.mode === 'play' && m.outdoor) {
    const p = Game.player;
    const cx = p.px + 8, cy = p.py + 8;
    if (Game.flags.flashlight) {
      const [dx, dy] = DIRS[p.dir];
      lights.push({ x: cx, y: cy, r: 26, i: 0.75 });
      lights.push({ x: cx + dx * 30, y: cy + dy * 30, r: 40, i: 0.95, beam: true });
    } else {
      lights.push({ x: cx, y: cy, r: 30, i: 0.45 });
    }
  }
  return lights;
}

function renderLighting(ox, oy) {
  const m = Game.map;
  const lights = currentLights();
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  lctx.fillStyle = m.outdoor ? `rgba(6,8,28,${m.darkness})` : `rgba(20,12,30,${m.darkness})`;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const L of lights) {
    const x = L.x + ox, y = L.y + oy;
    const g = lctx.createRadialGradient(x, y, 0, x, y, L.r);
    g.addColorStop(0, `rgba(0,0,0,${L.i})`);
    g.addColorStop(0.55, `rgba(0,0,0,${L.i * 0.6})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
  }
  ctx.drawImage(lightCanvas, 0, 0);

  // warm glow on top
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    if (!L.warm && !L.beam) continue;
    const x = L.x + ox, y = L.y + oy;
    const g = ctx.createRadialGradient(x, y, 0, x, y, L.r * 0.8);
    const col = L.beam ? '255,250,220' : '255,190,90';
    g.addColorStop(0, `rgba(${col},${L.beam ? 0.08 : 0.13})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Update loop
// ---------------------------------------------------------------------------
function update(dt) {
  Game.time += dt;
  if (Game.fade !== Game.fadeTarget) {
    const d = Game.fadeSpeed * dt;
    Game.fade = Game.fade < Game.fadeTarget ? Math.min(Game.fadeTarget, Game.fade + d) : Math.max(Game.fadeTarget, Game.fade - d);
  }
  if (Game.shake > 0) Game.shake -= dt;
  UI.update(dt);
  for (const e of Game.entities) {
    const was = e.moving;
    updateEntity(e, dt);
    if (e === Game.player) e.wasMoving = was || e.moving;
  }
  if (Game.mode === 'play' && !Game.busy && !UI.active && Game.player) {
    updatePlayerControl(dt);
    if (!Game.player.moving && !Input.dir) Game.player.wasMoving = false;
  }
  for (let i = Game.waiters.length - 1; i >= 0; i--) {
    const w = Game.waiters[i];
    if (w.check(dt)) { Game.waiters.splice(i, 1); w.resolve(); }
  }
  if (Game.mode === 'title') {
    const m = Game.map;
    Game.titlePan = (Math.sin(Game.time * 0.06) * 0.5 + 0.5) * (m.w * TS - VIEW_W);
  }
  if (Game.map) updateCamera();
  if (Game.mode === 'play' && Game.map.outdoor && Math.random() < dt * 0.9) Sound.cricket();
}

// ---------------------------------------------------------------------------
// Script helpers (all return promises)
// ---------------------------------------------------------------------------
async function run(fn) {
  Game.busy++;
  try { await fn(); } catch (err) { console.error(err); }
  finally { Game.busy--; Input.clear(); }
}

function waitUntil(check) {
  return new Promise((resolve) => Game.waiters.push({ check, resolve }));
}

function wait(sec) {
  let t = 0;
  return waitUntil((dt) => (t += dt) >= sec);
}

const say = (lines) => UI.say(lines);
const choose = (opts) => UI.choose(opts);

function face(e, dir) { e.dir = dir; }

function faceToward(e, other) {
  const dx = other.x - e.x, dy = other.y - e.y;
  e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

// Walk an entity along a path like 'UULLD'. Ignores collisions (scripted).
async function walk(e, path, speed) {
  const map = { U: 'up', D: 'down', L: 'left', R: 'right' };
  for (const ch of path) {
    startMove(e, map[ch]);
    if (speed) e.speed = speed;
    await waitUntil(() => !e.moving);
  }
}

function fadeTo(v, speed = 2.5) {
  Game.fadeTarget = v;
  Game.fadeSpeed = speed;
  return waitUntil(() => Game.fade === v);
}

async function emote(e, kind, sec = 1) {
  e.emote = kind;
  await wait(sec);
  e.emote = null;
}

async function warp(id, x, y, dir) {
  await fadeTo(1, 4);
  loadMap(id, x, y, dir);
  await wait(0.1);
  await fadeTo(0, 4);
  await Story.entered(id);
}

function entity(id) {
  return Game.entities.find((e) => e.id === id);
}
