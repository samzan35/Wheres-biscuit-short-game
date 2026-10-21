'use strict';
// Tile legend and the three maps: the house, the street, and the backyard.

const TILES = {
  // outdoors
  g: { base: 'grass' },
  f: { base: 'grass', over: 'flowers' },
  T: { base: 'grass', over: 'tree', solid: true },
  b: { base: 'grass', over: 'bush', solid: true },
  s: { base: 'sidewalk' },
  c: { base: 'sidewalk', over: 'curbBottom' },
  C: { base: 'sidewalk', over: 'curbTop' },
  r: { base: 'road' },
  y: { base: 'road', over: 'roadLine' },
  p: { base: 'grass', over: 'stones' },
  d: { base: 'driveway' },
  j: { base: 'dirt' },
  F: { base: 'grass', over: 'fenceH', solid: true },
  V: { base: 'grass', over: 'fenceV', solid: true },
  H: { base: 'grass', solid: true }, // under a house; the house is drawn on top
  X: { base: 'backwall', solid: true },
  x: { base: 'backwall', over: 'backwindow', solid: true },
  Z: { base: 'backwall', over: 'backdoor', solid: true },
  q: { base: 'patio' },
  G: { base: 'dirt', over: 'garden', solid: true },
  // indoors
  '#': { base: 'walltop', solid: true },
  w: { base: 'wallface', solid: true },
  n: { base: 'wallface', over: 'window', solid: true },
  B: { base: 'wallface', over: 'idoorBack', solid: true },
  D: { base: 'walltop', over: 'idoorFront', solid: true },
  '.': { base: 'wood' },
  k: { base: 'checker' },
  u: { base: 'rug' },
  m: { base: 'wood', over: 'mat' },
  R: { base: 'checker', over: 'fridge', solid: true },
  K: { base: 'checker', over: 'counter', solid: true },
  U: { base: 'checker', over: 'sink', solid: true },
  S: { base: 'checker', over: 'stove', solid: true },
  Q: { base: 'wood', over: 'bookshelf', solid: true },
  v: { base: 'wood', over: 'tv', solid: true },
  o: { base: 'rug', over: 'couch', solid: true },
  t: { base: 'checker', over: 'table', solid: true },
  h: { base: 'checker', over: 'chair', solid: true },
  P: { base: 'wood', over: 'plant', solid: true },
  M: { base: 'wood', over: 'dogbed', solid: true },
  l: { base: 'wood', over: 'lamp', solid: true },
};

function makeGrid(w, h, ch) {
  return Array.from({ length: h }, () => Array(w).fill(ch));
}

// ---------------------------------------------------------------------------
// HOME (interior)
// ---------------------------------------------------------------------------
const HOUSE_ROWS = [
  '##############',
  '#wwnwwwBwwwnw#',
  '#RKUSk.m..QvQ#',
  '#kkkkk...uuuu#',
  '#htthk...uuuu#',
  '#kkkkk...ooou#',
  '#.......P....#',
  '#M...........#',
  '#l.....m....l#',
  '#######D######',
];

const MAP_HOUSE = {
  id: 'house',
  name: 'Home',
  grid: HOUSE_ROWS.map((r) => r.split('')),
  outdoor: false,
  darkness: 0.28,
  buildings: [],
  lights: [
    { x: 1 * TS + 8, y: 8 * TS - 6, r: 56, i: 0.9, warm: true },
    { x: 12 * TS + 8, y: 8 * TS - 6, r: 56, i: 0.9, warm: true },
    { x: 3 * TS + 8, y: 2 * TS, r: 40, i: 0.6, warm: true },
    { x: 11 * TS + 8, y: 2 * TS, r: 30, i: 0.5 },
  ],
  doors: [
    { x: 7, y: 9, id: 'house_front' },
    { x: 7, y: 1, id: 'house_back' },
  ],
  objects: [],
};

// ---------------------------------------------------------------------------
// STREET (front yards, the road, neighbors, and the park at the east end)
// ---------------------------------------------------------------------------
const STREET_BUILDINGS = [
  { id: 'home', x: 3, y: 1, w: 6, h: 5, door: 5, roof: '#7a3b34', wall: '#e8dcc0', doorColor: '#3d5a80', windows: [4, 7], lit: [true, true], porch: true },
  { id: 'patel', x: 12, y: 1, w: 6, h: 5, door: 14, roof: '#4a5a7a', wall: '#d8c8e0', doorColor: '#7a3a5a', windows: [13, 16], lit: [true, true], porch: true },
  { id: 'kowalski', x: 20, y: 1, w: 6, h: 5, door: 23, roof: '#4a4a4a', wall: '#b8b0a0', doorColor: '#5a3a2a', windows: [21, 24], lit: [false, false], porch: false },
  { id: 'nguyen', x: 28, y: 1, w: 6, h: 5, door: 30, roof: '#3a6a5a', wall: '#f0e0b0', doorColor: '#c05a30', windows: [29, 32], lit: [false, true], porch: false },
  { id: 'abernathy', x: 36, y: 1, w: 6, h: 5, door: 39, roof: '#6a4a2a', wall: '#c0d0d8', doorColor: '#2a4a3a', windows: [37, 40], lit: [true, false], porch: false },
];

function buildStreet() {
  const W = 58, H = 15;
  const g = makeGrid(W, H, 'g');
  for (let x = 0; x < W; x++) { g[0][x] = 'T'; g[14][x] = 'T'; }
  for (let y = 0; y < H; y++) { g[y][0] = 'T'; g[y][56] = 'T'; g[y][57] = 'T'; }

  // sidewalks and road
  for (let x = 1; x <= 43; x++) {
    g[8][x] = 'c';
    g[9][x] = 'r';
    g[10][x] = 'y';
    g[11][x] = 'r';
    g[12][x] = 'C';
    g[13][x] = x % 5 === 0 ? 'b' : x % 7 === 3 ? 'f' : 'g';
  }

  // houses, back fences between them, front walks
  const inHouse = (x) => STREET_BUILDINGS.some((b) => x >= b.x && x < b.x + b.w);
  for (let x = 1; x <= 42; x++) if (!inHouse(x)) g[3][x] = 'F';
  for (const b of STREET_BUILDINGS) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) g[y][x] = 'H';
    g[6][b.door] = 'p';
    g[7][b.door] = 'p';
  }
  for (let y = 1; y <= 7; y++) g[y][1] = 'T';
  // our driveway
  for (let y = 4; y <= 7; y++) { g[y][9] = 'd'; g[y][10] = 'd'; }
  // hedge between the last house and the park
  for (let y = 1; y <= 7; y++) g[y][43] = 'b';
  // a few flowers in front yards
  [[4, 6], [7, 6], [13, 6], [16, 7], [21, 6], [22, 6], [29, 7], [33, 6], [37, 6], [41, 7]].forEach(([x, y]) => { g[y][x] = 'f'; });

  // park: a dirt path from the end of the road up to the culvert
  for (let x = 44; x <= 46; x++) for (let y = 9; y <= 11; y++) g[y][x] = 'j';
  for (let y = 3; y <= 8; y++) g[y][46] = 'j';
  for (let x = 46; x <= 52; x++) g[3][x] = 'j';
  g[2][52] = 'j'; g[2][53] = 'j';
  [[44, 2], [45, 5], [49, 6], [55, 3], [55, 10], [51, 13], [44, 13], [48, 1], [55, 12]].forEach(([x, y]) => { g[y][x] = 'T'; });
  [[47, 12], [53, 10], [50, 4], [44, 5], [54, 13]].forEach(([x, y]) => { g[y][x] = 'b'; });
  [[48, 10], [50, 9], [52, 5], [45, 12], [53, 12], [49, 2]].forEach(([x, y]) => { g[y][x] = 'f'; });
  return g;
}

const LAMP_POSITIONS = [[11, 8], [27, 8], [42, 8], [6, 12], [19, 12], [35, 12]];

const MAP_STREET = {
  id: 'street',
  name: 'Maple Lane',
  grid: buildStreet(),
  outdoor: true,
  darkness: 0.66,
  buildings: STREET_BUILDINGS,
  lights: [
    ...LAMP_POSITIONS.map(([x, y]) => ({ x: x * TS + 8, y: y * TS - 12, r: 62, i: 0.95, warm: true })),
    // lit windows
    ...STREET_BUILDINGS.flatMap((b) => b.windows.filter((_, i) => b.lit[i]).map((wx) => ({ x: wx * TS + 8, y: (b.y + b.h - 2) * TS + 10, r: 22, i: 0.55, warm: true }))),
    // porch lights that are always on
    { x: 5 * TS + 15, y: 4 * TS + 12, r: 34, i: 0.8, warm: true },
    { x: 14 * TS + 15, y: 4 * TS + 12, r: 34, i: 0.8, warm: true },
  ],
  doors: [
    { x: 5, y: 5, id: 'street_home' },
    { x: 14, y: 5, id: 'door_patel' },
    { x: 23, y: 5, id: 'door_kowalski' },
    { x: 30, y: 5, id: 'door_nguyen' },
    { x: 39, y: 5, id: 'door_abernathy' },
  ],
  objects: [
    { id: 'can_a', x: 9, y: 4, art: 'trashcan', color: '#3f7a4a', solid: true },
    { id: 'can_b', x: 10, y: 4, art: 'trashcan', color: '#3b5fa8', solid: true },
    { id: 'gate', x: 10, y: 3, art: 'gate', solid: true },
    { id: 'mailbox_home', x: 4, y: 7, art: 'mailbox', color: '#3a3a44', solid: true },
    { id: 'mailbox_patel', x: 13, y: 7, art: 'mailbox', color: '#8a4f9e', solid: true },
    { id: 'mailbox_kowalski', x: 22, y: 7, art: 'mailbox', color: '#2a2a2a', solid: true },
    { id: 'mailbox_nguyen', x: 31, y: 7, art: 'mailbox', color: '#c05a30', solid: true },
    { id: 'mailbox_abernathy', x: 38, y: 7, art: 'mailbox', color: '#2a4a3a', solid: true },
    { id: 'cans_patel', x: 17, y: 7, art: 'trashcan', color: '#3f7a4a', solid: true },
    { id: 'cans_kowalski', x: 25, y: 7, art: 'trashcan', color: '#3f7a4a', solid: true },
    { id: 'cans_abernathy', x: 41, y: 7, art: 'trashcan', color: '#3b5fa8', solid: true },
    { id: 'tulips', x: 24, y: 6, art: 'tulips', ground: true },
    { id: 'gnome', x: 21, y: 7, art: 'gnome', solid: true },
    { id: 'car', x: 31, y: 9, w: 2, art: 'car', color: '#8a9ab0', stickers: true, solid: true },
    ...LAMP_POSITIONS.map(([x, y], i) => ({ id: 'lamp', key: 'lamp' + i, x, y, art: 'streetlamp', solid: true })),
    { id: 'barrier', x: 1, y: 9, art: 'barrier', solid: true },
    { id: 'barrier', key: 'barrier2', x: 1, y: 10, art: 'barrier', solid: true },
    { id: 'barrier', key: 'barrier3', x: 1, y: 11, art: 'barrier', solid: true },
    { id: 'parksign', x: 44, y: 7, art: 'sign', solid: true },
    { id: 'bench', x: 48, y: 8, w: 2, art: 'bench', solid: true },
    { id: 'slide', x: 51, y: 11, w: 2, art: 'slide', solid: true },
    { id: 'oak', x: 53, y: 6, w: 2, h: 2, art: 'oak', solid: true },
    { id: 'culvert', x: 52, y: 1, w: 2, art: 'culvert', solid: true },
    // trail Biscuit left (only after he's gone)
    { id: 'digspot', x: 11, y: 3, art: 'smallhole', ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw1', x: 11, y: 4, art: 'pawprints', vertical: true, ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw2', x: 11, y: 5, art: 'pawprints', vertical: true, ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw3', x: 11, y: 6, art: 'pawprints', vertical: true, ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw4', x: 12, y: 7, art: 'pawprints', ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw5', x: 19, y: 7, art: 'pawprints', ground: true, when: (f) => f.holeFound },
    { id: 'pawprints', key: 'paw6', x: 27, y: 6, art: 'pawprints', ground: true, when: (f) => f.holeFound },
  ],
};

// ---------------------------------------------------------------------------
// BACKYARD
// ---------------------------------------------------------------------------
function buildBackyard() {
  const W = 16, H = 11;
  const g = makeGrid(W, H, 'g');
  for (let x = 0; x < W; x++) { g[0][x] = 'T'; g[1][x] = 'F'; g[10][x] = 'X'; }
  for (let y = 2; y <= 9; y++) { g[y][0] = 'V'; g[y][15] = 'V'; }
  g[10][3] = 'x'; g[10][11] = 'x'; g[10][7] = 'Z';
  for (let x = 9; x <= 12; x++) { g[3][x] = 'G'; g[4][x] = 'G'; }
  for (let x = 5; x <= 10; x++) { g[8][x] = 'q'; g[9][x] = 'q'; }
  g[8][13] = 'T';
  g[2][6] = 'f'; g[6][3] = 'f'; g[7][12] = 'f';
  return g;
}

const MAP_BACKYARD = {
  id: 'backyard',
  name: 'Backyard',
  grid: buildBackyard(),
  outdoor: true,
  darkness: 0.74,
  buildings: [],
  lights: [
    { x: 7 * TS + 8, y: 10 * TS + 2, r: 46, i: 0.85, warm: true },
    { x: 3 * TS + 8, y: 10 * TS + 6, r: 20, i: 0.5, warm: true },
    { x: 11 * TS + 8, y: 10 * TS + 6, r: 20, i: 0.5, warm: true },
  ],
  doors: [{ x: 7, y: 10, id: 'backyard_door' }],
  objects: [
    { id: 'doghouse', x: 2, y: 3, w: 2, h: 2, art: 'doghouse', solid: true },
    { id: 'bowl', x: 4, y: 5, art: 'bowl', solid: true },
    { id: 'hole', x: 14, y: 5, art: 'hole', solid: true },
    { id: 'grill', x: 9, y: 8, art: 'grill', solid: true },
    { id: 'patiochair', x: 5, y: 8, art: 'patiochair', solid: true },
  ],
};

const MAPS = { house: MAP_HOUSE, street: MAP_STREET, backyard: MAP_BACKYARD };
