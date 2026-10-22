'use strict';
// Procedural pixel art: ground tiles, furniture, houses and props.
// Everything is drawn with plain fillRect calls so there are no image assets.

const TS = 16;

function rect(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

function disc(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy));
    c.fillRect(cx - w, cy + dy, w * 2, 1);
  }
}

function ellipse(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    c.fillRect(cx - w, cy + dy, w * 2, 1);
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v + amt));
  const r = cl(n >> 16), g = cl((n >> 8) & 255), b = cl(n & 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Deterministic per-tile random numbers so the map looks the same every time.
function tileRng(tx, ty, salt = 0) {
  let h = (tx * 374761393 + ty * 668265263 + salt * 982451653) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Ground / base tiles. Signature: (c, x, y, r, info) where info has tx, ty, nb(dx,dy)
// ---------------------------------------------------------------------------
const GROUND = {
  grass(c, x, y, r) {
    rect(c, x, y, TS, TS, '#3f7f3a');
    for (let i = 0; i < 7; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, '#356f33');
    for (let i = 0; i < 3; i++) {
      const gx = x + 1 + Math.floor(r() * 13), gy = y + 1 + Math.floor(r() * 13);
      rect(c, gx, gy, 1, 2, '#52984a');
      rect(c, gx + 2, gy + 1, 1, 2, '#52984a');
    }
  },
  sidewalk(c, x, y, r) {
    rect(c, x, y, TS, TS, '#a7a397');
    rect(c, x + 15, y, 1, TS, '#8e8a7f');
    for (let i = 0; i < 6; i++) rect(c, x + Math.floor(r() * 15), y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#9b978b' : '#b3afa3');
  },
  road(c, x, y, r) {
    rect(c, x, y, TS, TS, '#3a3b42');
    for (let i = 0; i < 10; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#45464e' : '#313238');
  },
  driveway(c, x, y, r, info) {
    rect(c, x, y, TS, TS, '#96938a');
    if (info.ty % 2 === 0) rect(c, x, y, TS, 1, '#828077');
    for (let i = 0; i < 5; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, '#88857c');
    if (r() < 0.4) { const cx = x + 3 + Math.floor(r() * 9); rect(c, cx, y + 5, 1, 3, '#7a776f'); rect(c, cx + 1, y + 8, 1, 3, '#7a776f'); }
  },
  dirt(c, x, y, r) {
    rect(c, x, y, TS, TS, '#7a5a3a');
    for (let i = 0; i < 9; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#6a4c30' : '#8a6a48');
  },
  patio(c, x, y) {
    rect(c, x, y, TS, TS, '#8c8478');
    rect(c, x, y + 7, TS, 1, '#76706a');
    rect(c, x + 7, y, 1, 7, '#76706a');
    rect(c, x + 15, y + 8, 1, 8, '#76706a');
    rect(c, x, y + 15, TS, 1, '#76706a');
  },
  backwall(c, x, y) {
    rect(c, x, y, TS, TS, '#d4c29c');
    for (let yy = 3; yy < 13; yy += 3) rect(c, x, y + yy, TS, 1, '#bba87f');
    rect(c, x, y, TS, 2, '#6a3a34');
    rect(c, x, y + 2, TS, 1, '#4a2824');
    rect(c, x, y + 13, TS, 3, '#6d6a64');
  },
  walltop(c, x, y) {
    rect(c, x, y, TS, TS, '#2a2230');
    rect(c, x, y, TS, 1, '#3a3044');
  },
  wallface(c, x, y) {
    rect(c, x, y, TS, TS, '#d9c7a1');
    for (let i = 1; i < 16; i += 4) rect(c, x + i, y, 1, 11, '#ceba92');
    rect(c, x, y, TS, 2, '#b9a47c');
    rect(c, x, y + 11, TS, 5, '#7a4f33');
    rect(c, x, y + 11, TS, 1, '#9a6a45');
    rect(c, x, y + 15, TS, 1, '#5a3a24');
  },
  wood(c, x, y, r, info) {
    rect(c, x, y, TS, TS, '#a8743f');
    for (let k = 0; k < 4; k++) {
      rect(c, x, y + k * 4 + 3, TS, 1, '#93632f');
      const off = (info.tx * 7 + (info.ty * 4 + k) * 5) % 16;
      rect(c, x + off, y + k * 4, 1, 3, '#93632f');
    }
    if (r() < 0.3) rect(c, x + Math.floor(r() * 14), y + Math.floor(r() * 14), 2, 1, '#b8834c');
  },
  checker(c, x, y) {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      rect(c, x + i * 8, y + j * 8, 8, 8, (i + j) % 2 ? '#b9c6c8' : '#e9e5d8');
    }
  },
  tunnelwall(c, x, y, r, info) {
    rect(c, x, y, TS, TS, '#24282c');
    rect(c, x, y + (info.ty % 2 ? 7 : 15), TS, 1, '#1a1d20');
    for (let i = 0; i < 6; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, r() < 0.6 ? '#2e3338' : '#2f4a2c');
    // lip where the wall meets the floor below it
    if (info.nb(0, 1) === 'e' || info.nb(0, 1) === 'i') { rect(c, x, y + 12, TS, 4, '#3a4046'); rect(c, x, y + 12, TS, 1, '#4a5056'); }
  },
  tunnelfloor(c, x, y, r) {
    rect(c, x, y, TS, TS, '#4a4f52');
    for (let i = 0; i < 8; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 2, 1, r() < 0.5 ? '#42474a' : '#565b5e');
    if (r() < 0.25) ellipse(c, x + 4 + Math.floor(r() * 8), y + 4 + Math.floor(r() * 8), 3, 1, '#3c5258');
  },
  tunnelwater(c, x, y, r) {
    rect(c, x, y, TS, TS, '#2c4048');
    for (let i = 0; i < 3; i++) rect(c, x + Math.floor(r() * 12), y + 2 + Math.floor(r() * 12), 4, 1, '#3e5c66');
  },
  sand(c, x, y, r) {
    rect(c, x, y, TS, TS, '#a89a7a');
    for (let i = 0; i < 10; i++) rect(c, x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1, r() < 0.5 ? '#98896a' : '#b8ab8c');
  },
  pebbles(c, x, y, r) {
    GROUND.sand(c, x, y, r);
    for (let i = 0; i < 5; i++) {
      const px = x + 1 + Math.floor(r() * 12), py = y + 1 + Math.floor(r() * 12);
      ellipse(c, px + 1, py + 1, 2, 1, r() < 0.5 ? '#7a7a74' : '#8e8a80');
    }
  },
  riverwater(c, x, y, r, info) {
    rect(c, x, y, TS, TS, '#1e3a58');
    for (let i = 0; i < 3; i++) rect(c, x + Math.floor(r() * 10), y + 2 + Math.floor(r() * 12), 5, 1, '#2e5478');
    if (info.nb(0, -1) !== 'W') { rect(c, x, y, TS, 2, '#c8d4dc'); rect(c, x, y + 2, TS, 1, '#4a7090'); }
    if (info.nb(0, 1) !== 'W') rect(c, x, y + 14, TS, 2, '#16304a');
  },
  leaves(c, x, y, r) {
    rect(c, x, y, TS, TS, '#3e3222');
    const cols = ['#5a4028', '#6a4a24', '#4a3a26', '#7a5a2a', '#3a4a26'];
    for (let i = 0; i < 9; i++) rect(c, x + Math.floor(r() * 15), y + Math.floor(r() * 15), 2, 1, cols[Math.floor(r() * cols.length)]);
  },
  rug(c, x, y, r, info) {
    rect(c, x, y, TS, TS, '#8a3a3a');
    const isRug = (ch) => ch === 'u' || ch === 'o';
    const b = '#d8b060';
    if (!isRug(info.nb(0, -1))) rect(c, x, y + 1, TS, 1, b);
    if (!isRug(info.nb(0, 1))) rect(c, x, y + 14, TS, 1, b);
    if (!isRug(info.nb(-1, 0))) rect(c, x + 1, y, 1, TS, b);
    if (!isRug(info.nb(1, 0))) rect(c, x + 14, y, 1, TS, b);
    rect(c, x + 7, y + 7, 2, 2, '#a85050');
    rect(c, x + 3, y + 3, 1, 1, '#a85050');
    rect(c, x + 12, y + 12, 1, 1, '#a85050');
  },
};

// ---------------------------------------------------------------------------
// Overlays drawn on top of the base pass (may spill above their tile).
// ---------------------------------------------------------------------------
const OVER = {
  flowers(c, x, y, r) {
    const cols = ['#e05a5a', '#f2d24a', '#f4f0f0', '#c070e0'];
    for (let i = 0; i < 3; i++) {
      const fx = x + 2 + Math.floor(r() * 11), fy = y + 2 + Math.floor(r() * 11);
      const col = cols[Math.floor(r() * cols.length)];
      rect(c, fx, fy + 1, 1, 2, '#2e6a2a');
      rect(c, fx - 1, fy, 3, 1, col);
      rect(c, fx, fy - 1, 1, 3, col);
      rect(c, fx, fy, 1, 1, '#f2d24a');
    }
  },
  tree(c, x, y, r) {
    ellipse(c, x + 8, y + 14, 6, 2, 'rgba(0,0,0,0.3)');
    rect(c, x + 6, y + 10, 4, 5, '#5a3a22');
    rect(c, x + 6, y + 10, 1, 5, '#7a5236');
    disc(c, x + 8, y + 6, 7, '#1f4a26');
    disc(c, x + 8, y + 5, 6, '#2c6634');
    disc(c, x + 6, y + 3, 3, '#3c8040');
    for (let i = 0; i < 4; i++) rect(c, x + 3 + Math.floor(r() * 10), y + 1 + Math.floor(r() * 9), 1, 1, '#4c9450');
  },
  bush(c, x, y, r) {
    ellipse(c, x + 8, y + 14, 7, 2, 'rgba(0,0,0,0.3)');
    disc(c, x + 8, y + 9, 7, '#24522a');
    disc(c, x + 8, y + 8, 6, '#2f6a34');
    disc(c, x + 6, y + 6, 3, '#3c8040');
    if (r() < 0.5) { rect(c, x + 10, y + 9, 2, 2, '#e05a5a'); rect(c, x + 5, y + 11, 2, 2, '#e05a5a'); }
  },
  pine(c, x, y, r) {
    ellipse(c, x + 8, y + 15, 6, 1, 'rgba(0,0,0,0.35)');
    rect(c, x + 7, y + 12, 2, 4, '#3a2618');
    const dark = r() < 0.5 ? '#173a24' : '#1a3e22';
    for (let i = 0; i < 3; i++) {
      const ty = y - 3 + i * 5, half = 3 + i * 2;
      for (let k = 0; k < 6; k++) rect(c, x + 8 - Math.floor(half * k / 5), ty + k, Math.max(1, Math.floor(half * k / 5) * 2), 1, k < 2 ? '#2a5a36' : dark);
    }
    rect(c, x + 6, y + 1, 1, 1, '#3a7046');
  },
  grate(c, x, y) {
    rect(c, x + 2, y + 2, 12, 12, '#0a0b0c');
    for (let i = 0; i < 4; i++) rect(c, x + 3 + i * 3, y + 2, 1, 12, '#6a5040');
    rect(c, x + 2, y + 2, 12, 1, '#7a5a44');
    rect(c, x + 2, y + 8, 12, 1, '#7a5a44');
    rect(c, x + 2, y + 13, 12, 1, '#5a4030');
  },
  curbBottom(c, x, y) {
    rect(c, x, y + 13, TS, 2, '#8a867b');
    rect(c, x, y + 15, TS, 1, '#5d5a52');
  },
  curbTop(c, x, y) {
    rect(c, x, y, TS, 1, '#5d5a52');
    rect(c, x, y + 1, TS, 2, '#8a867b');
  },
  roadLine(c, x, y, r, info) {
    if (info.tx % 2 === 0) rect(c, x + 2, y + 7, 12, 2, '#d9b84a');
  },
  stones(c, x, y) {
    ellipse(c, x + 5, y + 5, 4, 3, '#8f8c84');
    rect(c, x + 3, y + 3, 3, 1, '#aaa79e');
    ellipse(c, x + 11, y + 12, 4, 3, '#8f8c84');
    rect(c, x + 9, y + 10, 3, 1, '#aaa79e');
  },
  fenceH(c, x, y) {
    rect(c, x, y + 14, TS, 2, 'rgba(0,0,0,0.25)');
    rect(c, x, y + 5, TS, 2, '#8a6438');
    rect(c, x, y + 10, TS, 2, '#8a6438');
    for (let i = 0; i < 4; i++) {
      const px = x + i * 4;
      rect(c, px, y + 2, 3, 12, '#c49a5c');
      rect(c, px + 1, y + 1, 1, 1, '#c49a5c');
      rect(c, px + 2, y + 2, 1, 12, '#a07a44');
    }
  },
  fenceV(c, x, y) {
    rect(c, x + 5, y, 6, TS, '#a07a44');
    rect(c, x + 6, y, 4, TS, '#c49a5c');
    rect(c, x + 6, y + 4, 4, 1, '#8a6438');
    rect(c, x + 6, y + 12, 4, 1, '#8a6438');
    rect(c, x + 11, y, 2, TS, 'rgba(0,0,0,0.2)');
  },
  garden(c, x, y, r) {
    for (let row = 0; row < 2; row++) {
      const gy = y + 3 + row * 8;
      rect(c, x, gy + 3, TS, 2, '#5a4028');
      for (let i = 0; i < 3; i++) {
        const gx = x + 2 + i * 5;
        rect(c, gx, gy, 3, 3, '#3a8040');
        rect(c, gx + 1, gy - 1, 1, 1, '#4c9a4c');
        if (r() < 0.5) rect(c, gx + 2, gy + 1, 1, 1, '#d04030');
      }
    }
  },
  backwindow(c, x, y) {
    rect(c, x + 3, y + 3, 10, 8, '#f0ebe0');
    rect(c, x + 4, y + 4, 8, 6, '#ffd77a');
    rect(c, x + 7, y + 4, 2, 6, '#f0ebe0');
  },
  backdoor(c, x, y) {
    rect(c, x + 2, y + 2, 12, 12, '#e8e2d4');
    rect(c, x + 3, y + 3, 10, 11, '#ffd77a');
    rect(c, x + 7, y + 3, 2, 11, '#e8e2d4');
    rect(c, x + 1, y + 14, 14, 2, '#8a867b');
  },
  window(c, x, y) {
    rect(c, x + 1, y + 1, 14, 10, '#f2eadc');
    rect(c, x + 3, y + 2, 10, 8, '#1e2a4a');
    rect(c, x + 10, y + 3, 2, 2, '#ece8c4');
    rect(c, x + 5, y + 4, 1, 1, '#c8d0ff');
    rect(c, x + 7, y + 2, 1, 8, '#f2eadc');
    rect(c, x + 3, y + 6, 10, 1, '#f2eadc');
    rect(c, x + 1, y + 1, 2, 11, '#a83a3a');
    rect(c, x + 13, y + 1, 2, 11, '#a83a3a');
  },
  idoorBack(c, x, y) {
    rect(c, x + 2, y + 1, 12, 15, '#5a3820');
    rect(c, x + 3, y + 2, 10, 14, '#7a5030');
    rect(c, x + 4, y + 3, 8, 6, '#1e2a4a');
    rect(c, x + 7, y + 3, 1, 6, '#7a5030');
    rect(c, x + 11, y + 10, 1, 1, '#e0c060');
  },
  idoorFront(c, x, y) {
    rect(c, x + 2, y, 12, TS, '#5a3820');
    rect(c, x + 3, y, 10, 14, '#7a5030');
    for (let i = 0; i < 3; i++) rect(c, x + 4 + i * 3, y + 1, 1, 12, '#6a4428');
    rect(c, x + 3, y, 10, 1, '#c8a060');
  },
  mat(c, x, y) {
    rect(c, x + 2, y + 3, 12, 10, '#6b5a3a');
    rect(c, x + 3, y + 4, 10, 8, '#7d6a46');
    for (let i = 0; i < 4; i++) rect(c, x + 4, y + 5 + i * 2, 8, 1, '#6b5a3a');
  },
  fridge(c, x, y) {
    rect(c, x + 1, y - 9, 14, 24, '#8e98a0');
    rect(c, x + 2, y - 8, 12, 22, '#e8ecef');
    rect(c, x + 2, y - 1, 12, 1, '#8e98a0');
    rect(c, x + 12, y - 6, 1, 4, '#8e98a0');
    rect(c, x + 12, y + 2, 1, 5, '#8e98a0');
    rect(c, x + 4, y - 6, 2, 2, '#e05a5a');
    rect(c, x + 7, y - 5, 3, 3, '#f4f0d8');
    rect(c, x + 5, y + 3, 2, 2, '#4a7ad0');
  },
  counter(c, x, y) {
    rect(c, x, y - 3, TS, 6, '#dcd4c2');
    rect(c, x, y + 2, TS, 1, '#a8a090');
    rect(c, x, y + 3, TS, 12, '#8a5a36');
    rect(c, x + 7, y + 4, 1, 10, '#6a4024');
    rect(c, x + 5, y + 7, 1, 2, '#e0c060');
    rect(c, x + 10, y + 7, 1, 2, '#e0c060');
    rect(c, x, y + 15, TS, 1, '#5a3820');
  },
  sink(c, x, y) {
    OVER.counter(c, x, y);
    rect(c, x + 3, y - 2, 10, 4, '#9aa4ab');
    rect(c, x + 4, y - 1, 8, 2, '#bcc6cc');
    rect(c, x + 7, y - 5, 2, 3, '#c0c8cc');
  },
  stove(c, x, y) {
    rect(c, x, y - 3, TS, 6, '#3a3a3a');
    disc(c, x + 4, y - 1, 2, '#5a5a5a');
    disc(c, x + 11, y - 1, 2, '#5a5a5a');
    rect(c, x, y + 3, TS, 12, '#dcdcdc');
    rect(c, x + 3, y + 6, 10, 6, '#2a2a2a');
    rect(c, x + 3, y + 4, 10, 1, '#9a9a9a');
    rect(c, x, y + 15, TS, 1, '#6a6a6a');
  },
  bookshelf(c, x, y, r) {
    rect(c, x + 1, y - 11, 14, 26, '#5a3820');
    rect(c, x + 2, y - 10, 12, 24, '#6a4428');
    const books = ['#c04040', '#4070c0', '#e0c050', '#50a060', '#a060c0', '#e08040'];
    for (let s = 0; s < 3; s++) {
      const sy = y - 10 + s * 8;
      let bx = x + 2;
      while (bx < x + 13) {
        const w = 1 + Math.floor(r() * 2);
        const h = 4 + Math.floor(r() * 3);
        rect(c, bx, sy + 7 - h, w, h, books[Math.floor(r() * books.length)]);
        bx += w + (r() < 0.2 ? 1 : 0);
      }
      rect(c, x + 2, sy + 7, 12, 1, '#4a2c18');
    }
  },
  tv(c, x, y) {
    rect(c, x + 1, y + 6, 14, 9, '#5a3a22');
    rect(c, x + 2, y + 8, 12, 1, '#4a2c18');
    rect(c, x, y - 5, 16, 12, '#1a1a20');
    rect(c, x + 1, y - 4, 14, 9, '#3a6a9a');
    rect(c, x + 2, y - 3, 6, 2, '#6a9aca');
    rect(c, x + 7, y + 7, 2, 1, '#e04040');
  },
  couch(c, x, y, r, info) {
    const L = info.nb(-1, 0) !== 'o', R = info.nb(1, 0) !== 'o';
    rect(c, x, y + 1, TS, 14, '#3e4e78');
    rect(c, x, y + 2, TS, 7, '#5a6e9a');
    rect(c, x, y + 9, TS, 6, '#4a5e8a');
    rect(c, x, y + 14, TS, 1, '#2e3a5a');
    if (L) { rect(c, x, y + 1, 3, 14, '#3e4e78'); rect(c, x + 1, y + 2, 1, 11, '#5a6e9a'); }
    if (R) { rect(c, x + 13, y + 1, 3, 14, '#3e4e78'); rect(c, x + 14, y + 2, 1, 11, '#5a6e9a'); }
    if (!L) rect(c, x, y + 3, 1, 5, '#4a5e8a');
  },
  table(c, x, y, r, info) {
    const L = info.nb(-1, 0) !== 't', R = info.nb(1, 0) !== 't';
    rect(c, x + (L ? 1 : 0), y + 1, TS - (L ? 1 : 0) - (R ? 1 : 0), 10, '#9a6a40');
    rect(c, x + (L ? 1 : 0), y + 10, TS - (L ? 1 : 0) - (R ? 1 : 0), 2, '#6a4024');
    if (L) rect(c, x + 2, y + 12, 2, 3, '#6a4024');
    if (R) rect(c, x + 12, y + 12, 2, 3, '#6a4024');
    if (L) { disc(c, x + 10, y + 5, 3, '#f4f0e8'); disc(c, x + 10, y + 5, 2, '#e8e0d0'); }
    if (R) { rect(c, x + 5, y + 1, 3, 4, '#6ab0d0'); rect(c, x + 5, y - 2, 1, 3, '#3a8040'); rect(c, x + 7, y - 3, 1, 4, '#3a8040'); rect(c, x + 7, y - 3, 1, 1, '#f2d24a'); }
  },
  chair(c, x, y) {
    rect(c, x + 3, y + 2, 10, 3, '#6a4024');
    rect(c, x + 3, y + 5, 10, 6, '#9a6a40');
    rect(c, x + 3, y + 11, 2, 4, '#6a4024');
    rect(c, x + 11, y + 11, 2, 4, '#6a4024');
  },
  plant(c, x, y) {
    rect(c, x + 4, y + 9, 8, 6, '#b05a34');
    rect(c, x + 4, y + 9, 8, 1, '#c87048');
    disc(c, x + 8, y + 5, 5, '#2e6a34');
    disc(c, x + 6, y + 3, 3, '#3c8a40');
    disc(c, x + 10, y + 4, 2, '#4a9a4a');
  },
  dogbed(c, x, y) {
    ellipse(c, x + 8, y + 9, 7, 6, '#8a3a34');
    ellipse(c, x + 8, y + 9, 5, 4, '#d8a07a');
    rect(c, x + 9, y + 9, 3, 2, '#f2d24a');
    rect(c, x + 12, y + 9, 1, 1, '#e08030');
  },
  lamp(c, x, y) {
    ellipse(c, x + 8, y + 14, 4, 1, '#3a2a20');
    rect(c, x + 7, y - 2, 2, 16, '#3a2a20');
    rect(c, x + 3, y - 9, 10, 8, '#f2dca0');
    rect(c, x + 3, y - 2, 10, 1, '#c8a860');
    rect(c, x + 4, y - 10, 8, 1, '#f2dca0');
  },
};

// ---------------------------------------------------------------------------
// Houses on the street. b = {x,y,w,h, roof, wall, doorColor, door, windows, lit}
// ---------------------------------------------------------------------------
function drawBuilding(c, b) {
  const X = b.x * TS, Y = b.y * TS, W = b.w * TS, H = b.h * TS;
  const wallH = 2 * TS;
  const roofH = H - wallH;

  // walls
  rect(c, X, Y + roofH - 2, W, wallH + 2, b.wall);
  for (let yy = Y + roofH + 3; yy < Y + H - 3; yy += 4) rect(c, X, yy, W, 1, shade(b.wall, -20));
  rect(c, X, Y + H - 3, W, 3, '#5f5c56');
  rect(c, X, Y + roofH, 1, wallH, shade(b.wall, -40));
  rect(c, X + W - 1, Y + roofH, 1, wallH, shade(b.wall, -40));

  // roof with shingles, ridge and chimney
  rect(c, X - 2, Y, W + 4, roofH + 2, b.roof);
  for (let yy = Y + 4, row = 0; yy < Y + roofH; yy += 4, row++) {
    rect(c, X - 2, yy, W + 4, 1, shade(b.roof, -28));
    for (let xx = X - 2 + (row % 2) * 3; xx < X + W + 2; xx += 6) rect(c, xx, yy - 3, 1, 3, shade(b.roof, -16));
  }
  rect(c, X - 2, Y, W + 4, 3, shade(b.roof, 24));
  rect(c, X - 2, Y + roofH, W + 4, 2, shade(b.roof, -48));
  rect(c, X + W - 16, Y - 6, 7, 10, '#8a4a3a');
  rect(c, X + W - 17, Y - 7, 9, 2, '#6a3a2a');

  // windows
  b.windows.forEach((wx, i) => {
    const PX = wx * TS + 2, PY = Y + roofH + 5;
    const lit = b.lit[i];
    rect(c, PX - 1, PY - 1, 14, 12, '#efe8da');
    rect(c, PX, PY, 12, 10, lit ? '#ffd77a' : '#27324f');
    if (lit) rect(c, PX, PY, 12, 3, '#ffe9a8');
    else rect(c, PX + 1, PY + 1, 2, 2, '#3a4a70');
    rect(c, PX + 5, PY, 2, 10, '#efe8da');
    rect(c, PX, PY + 4, 12, 1, '#efe8da');
    rect(c, PX - 2, PY + 10, 16, 2, '#cfc6b4');
  });

  // door
  const DX = b.door * TS, DY = Y + H - TS;
  rect(c, DX + 2, DY - 7, 12, 20, '#efe8da');
  rect(c, DX + 4, DY - 5, 8, 18, b.doorColor);
  rect(c, DX + 5, DY - 4, 6, 6, shade(b.doorColor, 25));
  rect(c, DX + 5, DY + 4, 6, 7, shade(b.doorColor, 25));
  rect(c, DX + 10, DY + 3, 1, 2, '#e8c860');
  rect(c, DX + 1, DY + 13, 14, 3, '#8a867b');
  // porch lamp fixture
  rect(c, DX + 14, DY - 6, 2, 4, '#2a2a2a');
  rect(c, DX + 14, DY - 5, 2, 2, b.porch ? '#ffe9a8' : '#6a6a60');
}

// Overlay for a neighbor's door when it is open (warm light spilling out).
function drawOpenDoor(c, X, Y) {
  rect(c, X + 4, Y - 5, 8, 18, '#f6cf7a');
  rect(c, X + 5, Y - 4, 6, 16, '#ffe2a0');
  rect(c, X + 4, Y - 5, 2, 18, '#c89a50');
}

// ---------------------------------------------------------------------------
// Props / interactables. Signature: (c, X, Y, obj, t) with X,Y the top-left
// pixel of the object's footprint on screen and t = game time in seconds.
// ---------------------------------------------------------------------------
const PROPS = {
  trashcan(c, X, Y, o) {
    const col = o.color || '#3f7a4a';
    ellipse(c, X + 8, Y + 15, 6, 1, 'rgba(0,0,0,0.35)');
    rect(c, X + 3, Y + 2, 10, 13, shade(col, -40));
    rect(c, X + 4, Y + 3, 8, 11, col);
    for (let i = 0; i < 3; i++) rect(c, X + 5 + i * 3, Y + 5, 1, 8, shade(col, -20));
    rect(c, X + 2, Y, 12, 3, shade(col, -55));
    rect(c, X + 3, Y, 10, 2, shade(col, -15));
    rect(c, X + 6, Y - 1, 4, 1, shade(col, -55));
    rect(c, X + 3, Y + 13, 2, 3, '#1a1a1a');
    rect(c, X + 11, Y + 13, 2, 3, '#1a1a1a');
  },
  gate(c, X, Y) {
    rect(c, X, Y + 14, TS, 2, 'rgba(0,0,0,0.25)');
    for (let i = 0; i < 4; i++) {
      rect(c, X + i * 4, Y + 1, 3, 13, '#b48a50');
      rect(c, X + i * 4 + 2, Y + 1, 1, 13, '#9a7040');
    }
    rect(c, X, Y + 4, TS, 2, '#7a5430');
    rect(c, X, Y + 10, TS, 2, '#7a5430');
    rect(c, X + 1, Y + 3, 1, 10, '#7a5430');
    rect(c, X + 11, Y + 7, 3, 2, '#c0c0c8');
  },
  mailbox(c, X, Y, o) {
    rect(c, X + 7, Y + 6, 2, 9, '#5a3a22');
    ellipse(c, X + 8, Y + 15, 3, 1, 'rgba(0,0,0,0.35)');
    rect(c, X + 3, Y + 1, 10, 6, o.color || '#3a3a44');
    rect(c, X + 4, Y, 8, 1, o.color || '#3a3a44');
    rect(c, X + 12, Y + 1, 1, 3, '#d03030');
    rect(c, X + 3, Y + 6, 10, 1, '#1a1a20');
  },
  streetlamp(c, X, Y) {
    ellipse(c, X + 8, Y + 15, 4, 1, 'rgba(0,0,0,0.35)');
    rect(c, X + 6, Y + 12, 4, 3, '#2a2a30');
    rect(c, X + 7, Y - 14, 2, 27, '#3a3a42');
    rect(c, X + 4, Y - 18, 8, 4, '#2a2a30');
    rect(c, X + 5, Y - 14, 6, 2, '#fff2c0');
  },
  barrier(c, X, Y) {
    rect(c, X + 2, Y + 8, 2, 7, '#6a6a6a');
    rect(c, X + 12, Y + 8, 2, 7, '#6a6a6a');
    rect(c, X, Y + 3, 16, 6, '#f4f0e8');
    for (let i = 0; i < 4; i++) rect(c, X + i * 4, Y + 3, 2, 6, '#e06a20');
    rect(c, X + 7, Y + 1, 2, 2, '#ffd040');
  },
  car(c, X, Y, o) {
    const col = o.color || '#7a8aa0';
    ellipse(c, X + 16, Y + 15, 15, 2, 'rgba(0,0,0,0.4)');
    rect(c, X + 1, Y + 4, 30, 10, shade(col, -40));
    rect(c, X + 2, Y + 3, 28, 10, col);
    rect(c, X + 7, Y, 16, 6, shade(col, -20));
    rect(c, X + 8, Y + 1, 6, 4, '#2a3a5a');
    rect(c, X + 16, Y + 1, 6, 4, '#2a3a5a');
    rect(c, X + 2, Y + 8, 28, 1, shade(col, -30));
    rect(c, X + 29, Y + 6, 2, 2, '#f4f0c0');
    rect(c, X + 1, Y + 6, 2, 2, '#c03030');
    rect(c, X + 5, Y + 12, 5, 3, '#141418');
    rect(c, X + 22, Y + 12, 5, 3, '#141418');
    if (o.stickers) { rect(c, X + 4, Y + 9, 2, 2, '#f4f4f4'); rect(c, X + 7, Y + 10, 2, 2, '#f2d24a'); }
  },
  sign(c, X, Y) {
    rect(c, X + 7, Y + 6, 2, 9, '#5a3a22');
    rect(c, X + 1, Y - 2, 14, 9, '#6a4428');
    rect(c, X + 2, Y - 1, 12, 7, '#8a6038');
    rect(c, X + 4, Y + 1, 8, 1, '#e8dcc0');
    rect(c, X + 4, Y + 3, 6, 1, '#e8dcc0');
  },
  bench(c, X, Y) {
    ellipse(c, X + 16, Y + 14, 14, 2, 'rgba(0,0,0,0.3)');
    rect(c, X + 1, Y + 2, 30, 3, '#8a5a30');
    rect(c, X + 1, Y + 6, 30, 3, '#9a6a38');
    rect(c, X + 1, Y + 9, 30, 2, '#7a4a28');
    rect(c, X + 3, Y + 11, 2, 4, '#3a3a3a');
    rect(c, X + 27, Y + 11, 2, 4, '#3a3a3a');
  },
  slide(c, X, Y) {
    ellipse(c, X + 16, Y + 15, 14, 2, 'rgba(0,0,0,0.3)');
    rect(c, X + 2, Y - 8, 2, 23, '#9aa0a8');
    rect(c, X + 9, Y - 8, 2, 23, '#9aa0a8');
    for (let i = 0; i < 5; i++) rect(c, X + 2, Y - 6 + i * 4, 9, 1, '#9aa0a8');
    rect(c, X + 1, Y - 10, 11, 3, '#c04040');
    rect(c, X + 11, Y - 9, 6, 4, '#e0c040');
    rect(c, X + 15, Y - 6, 6, 4, '#e0c040');
    rect(c, X + 19, Y - 3, 6, 4, '#e0c040');
    rect(c, X + 23, Y, 6, 4, '#e0c040');
    rect(c, X + 26, Y + 4, 5, 3, '#e0c040');
    rect(c, X + 27, Y + 7, 2, 8, '#9aa0a8');
  },
  culvert(c, X, Y) {
    rect(c, X - 4, Y - 4, 40, 18, '#4a5a3a');
    rect(c, X - 4, Y - 4, 40, 3, '#3a4a2e');
    ellipse(c, X + 16, Y + 6, 13, 9, '#8a8a84');
    ellipse(c, X + 16, Y + 6, 11, 7, '#6a6a66');
    ellipse(c, X + 16, Y + 7, 9, 6, '#0e0e12');
    rect(c, X + 6, Y + 13, 20, 3, '#3a4a5a');
    rect(c, X + 10, Y + 14, 6, 1, '#6a8aa0');
  },
  oak(c, X, Y, o, t) {
    ellipse(c, X + 16, Y + 30, 14, 3, 'rgba(0,0,0,0.35)');
    rect(c, X + 12, Y + 16, 8, 15, '#4a3020');
    rect(c, X + 12, Y + 16, 2, 15, '#6a4a30');
    rect(c, X + 8, Y + 28, 5, 3, '#4a3020');
    rect(c, X + 19, Y + 28, 5, 3, '#4a3020');
    disc(c, X + 16, Y + 6, 17, '#1a4022');
    disc(c, X + 15, Y + 4, 15, '#25592c');
    disc(c, X + 9, Y - 1, 7, '#317036');
    disc(c, X + 22, Y + 2, 6, '#2c6634');
    disc(c, X + 8, Y - 3, 3, '#3e8442');
  },
  doghouse(c, X, Y) {
    ellipse(c, X + 16, Y + 30, 14, 2, 'rgba(0,0,0,0.3)');
    rect(c, X + 3, Y + 10, 26, 20, '#b07a44');
    for (let i = 0; i < 5; i++) rect(c, X + 3, Y + 13 + i * 4, 26, 1, '#946234');
    // roof
    for (let i = 0; i < 12; i++) rect(c, X + 16 - i - 3, Y - 2 + i, (i + 3) * 2, 1, i % 3 === 0 ? '#8a2a24' : '#b03a30');
    rect(c, X, Y + 10, 32, 2, '#7a2420');
    // entrance
    ellipse(c, X + 16, Y + 23, 6, 7, '#1a1010');
    rect(c, X + 10, Y + 23, 12, 7, '#1a1010');
    // bone sign
    rect(c, X + 12, Y + 13, 8, 2, '#f4f0e8');
    rect(c, X + 11, Y + 12, 2, 4, '#f4f0e8');
    rect(c, X + 19, Y + 12, 2, 4, '#f4f0e8');
  },
  bowl(c, X, Y) {
    ellipse(c, X + 8, Y + 11, 6, 3, '#2a5aa0');
    ellipse(c, X + 8, Y + 10, 5, 2, '#5a9ad0');
    rect(c, X + 5, Y + 9, 3, 1, '#9ad0f0');
  },
  hole(c, X, Y, o, t) {
    // dirt spray across the grass, hole disappearing under the fence on the right
    ellipse(c, X + 7, Y + 9, 7, 5, '#6a4a2c');
    ellipse(c, X + 6, Y + 8, 5, 3, '#8a6a44');
    rect(c, X + 2, Y + 4, 2, 2, '#6a4a2c');
    rect(c, X + 1, Y + 12, 2, 1, '#6a4a2c');
    ellipse(c, X + 17, Y + 9, 6, 5, '#120c08');
    ellipse(c, X + 17, Y + 9, 4, 3, '#060404');
    // paw prints
    [[3, 13], [9, 14]].forEach(([px, py]) => {
      rect(c, X + px, Y + py, 2, 2, '#3a2a18');
      rect(c, X + px - 1, Y + py - 2, 1, 1, '#3a2a18');
      rect(c, X + px + 2, Y + py - 2, 1, 1, '#3a2a18');
    });
  },
  smallhole(c, X, Y) {
    ellipse(c, X + 8, Y + 14, 6, 3, '#6a4a2c');
    ellipse(c, X + 8, Y + 13, 4, 2, '#120c08');
  },
  pawprints(c, X, Y, o) {
    const col = 'rgba(40,26,14,0.85)';
    const pts = o.vertical ? [[6, 2], [9, 9]] : [[2, 7], [10, 9]];
    pts.forEach(([px, py]) => {
      rect(c, X + px, Y + py, 2, 2, col);
      rect(c, X + px - 1, Y + py - 2, 1, 1, col);
      rect(c, X + px + 1, Y + py - 2, 1, 1, col);
      rect(c, X + px + 3, Y + py - 1, 1, 1, col);
    });
  },
  grill(c, X, Y) {
    ellipse(c, X + 8, Y + 15, 5, 1, 'rgba(0,0,0,0.35)');
    rect(c, X + 4, Y + 9, 1, 6, '#2a2a2a');
    rect(c, X + 11, Y + 9, 1, 6, '#2a2a2a');
    ellipse(c, X + 8, Y + 6, 6, 4, '#1a1a1a');
    ellipse(c, X + 8, Y + 5, 5, 3, '#2e2e2e');
    rect(c, X + 7, Y, 2, 2, '#3a3a3a');
    rect(c, X + 6, Y + 3, 2, 1, '#4a4a4a');
  },
  patiochair(c, X, Y) {
    rect(c, X + 3, Y + 1, 10, 4, '#e8e8e0');
    rect(c, X + 3, Y + 5, 10, 6, '#d0d0c8');
    rect(c, X + 3, Y + 11, 2, 4, '#a0a098');
    rect(c, X + 11, Y + 11, 2, 4, '#a0a098');
  },
  tulips(c, X, Y) {
    for (let i = 0; i < 4; i++) {
      const tx = X + 2 + i * 4, ty = Y + 6 + (i % 2) * 4;
      rect(c, tx, ty + 2, 3, 1, '#2e6a2a');
      rect(c, tx + 2, ty + 1, 2, 2, i === 2 ? '#e05a5a' : '#c04040');
    }
    rect(c, X + 5, Y + 3, 1, 3, '#2e6a2a');
    rect(c, X + 4, Y + 1, 3, 2, '#f05a6a');
    rect(c, X + 9, Y + 12, 2, 2, '#3a2a18');
  },
  gnome(c, X, Y) {
    // face-down in the dirt
    ellipse(c, X + 8, Y + 12, 6, 2, 'rgba(0,0,0,0.3)');
    rect(c, X + 3, Y + 8, 7, 4, '#3a6ad0');
    rect(c, X + 10, Y + 9, 3, 3, '#f0c8a8');
    rect(c, X + 1, Y + 9, 3, 2, '#d03030');
    rect(c, X, Y + 10, 1, 1, '#d03030');
    rect(c, X + 9, Y + 11, 4, 2, '#f4f4f4');
  },
  log(c, X, Y) {
    ellipse(c, X + 16, Y + 14, 16, 2, 'rgba(0,0,0,0.4)');
    rect(c, X - 2, Y + 3, 36, 10, '#4a3420');
    rect(c, X - 2, Y + 4, 36, 3, '#6a4a2c');
    for (let i = 0; i < 6; i++) rect(c, X + i * 6, Y + 8, 4, 1, '#3a2818');
    ellipse(c, X - 2, Y + 8, 3, 5, '#8a6a44');
    ellipse(c, X - 2, Y + 8, 1, 2, '#6a4a2c');
    rect(c, X + 20, Y, 2, 4, '#4a3420');
    rect(c, X + 22, Y - 2, 3, 2, '#2a5a30');
    rect(c, X + 6, Y + 3, 4, 2, '#3a6a34');
  },
  logv(c, X, Y) {
    ellipse(c, X + 8, Y + 30, 6, 2, 'rgba(0,0,0,0.4)');
    rect(c, X + 3, Y - 2, 10, 34, '#4a3420');
    rect(c, X + 4, Y - 2, 3, 34, '#6a4a2c');
    for (let i = 0; i < 6; i++) rect(c, X + 9, Y + i * 6, 1, 4, '#3a2818');
    ellipse(c, X + 8, Y - 2, 5, 2, '#8a6a44');
    rect(c, X + 12, Y + 12, 3, 2, '#2a5a30');
  },
  pipemouth(c, X, Y) {
    rect(c, X, Y - 4, 32, 52, '#5e6266');
    for (let i = 0; i < 6; i++) rect(c, X, Y - 4 + i * 9, 32, 1, '#4e5256');
    ellipse(c, X + 20, Y + 20, 12, 13, '#7a7e82');
    ellipse(c, X + 20, Y + 20, 10, 11, '#0c0d0f');
    rect(c, X + 18, Y + 31, 16, 4, '#2c4048');
  },
  scorch(c, X, Y) {
    ellipse(c, X + 24, Y + 16, 22, 13, '#4a4436');
    ellipse(c, X + 24, Y + 16, 19, 11, '#6e7a7c');
    ellipse(c, X + 24, Y + 16, 16, 9, '#8aa4a8');
    ellipse(c, X + 24, Y + 16, 12, 6, '#a8c8c8');
    rect(c, X + 18, Y + 12, 6, 1, '#d8f0f0');
    rect(c, X + 28, Y + 18, 4, 1, '#d8f0f0');
  },
  tennisball(c, X, Y) {
    ellipse(c, X + 8, Y + 12, 3, 1, 'rgba(0,0,0,0.3)');
    disc(c, X + 8, Y + 9, 3, '#c8e040');
    rect(c, X + 6, Y + 8, 4, 1, '#f4f4e0');
  },
  oldcollar(c, X, Y) {
    ellipse(c, X + 8, Y + 10, 5, 3, '#3a5a8a');
    ellipse(c, X + 8, Y + 10, 3, 1, '#4a4f52');
    rect(c, X + 7, Y + 12, 3, 3, '#a89a60');
  },
  scratches(c, X, Y) {
    // a spiral gouged into the concrete
    const pts = [[8, 7], [9, 7], [9, 8], [8, 9], [7, 9], [6, 8], [6, 7], [6, 6], [7, 5], [8, 5], [9, 5], [10, 6], [11, 7], [11, 8], [11, 9], [10, 10], [9, 11], [8, 11], [7, 11], [6, 11], [5, 10], [4, 9], [4, 8], [4, 7], [4, 6], [4, 5], [5, 4], [6, 3]];
    pts.forEach(([px, py]) => rect(c, X + px, Y + py, 1, 1, '#7a8a86'));
  },
  mushrooms(c, X, Y, o, t) {
    const pulse = 0.5 + Math.sin(t * 2) * 0.5;
    const col = pulse > 0.5 ? '#9ae0ff' : '#6ab8e0';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const mx = X + 16 + Math.round(Math.cos(a) * 11), my = Y + 16 + Math.round(Math.sin(a) * 8);
      rect(c, mx, my, 1, 2, '#d8d0c0');
      rect(c, mx - 1, my - 1, 3, 1, col);
    }
  },
};

const EMOTE_GLYPHS = {
  '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '..##.', '.....', '..#..'],
  '...': ['.....', '.....', '.....', '.....', '#.#.#'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  note: ['..##.', '..#.#', '..#..', '###..', '##...'],
};

function drawEmote(c, x, y, kind, t) {
  const g = EMOTE_GLYPHS[kind];
  if (!g) return;
  const bob = Math.round(Math.sin(t * 8) * 1);
  const bx = Math.round(x) + 3, by = Math.round(y) - 12 + bob;
  rect(c, bx - 1, by, 11, 9, '#1a1420');
  rect(c, bx, by - 1, 9, 11, '#1a1420');
  rect(c, bx, by, 9, 9, '#f4f0e8');
  rect(c, bx + 3, by + 10, 3, 1, '#1a1420');
  rect(c, bx + 4, by + 11, 1, 1, '#1a1420');
  const col = kind === 'heart' ? '#e03a4a' : '#1a1420';
  g.forEach((row, yy) => {
    for (let xx = 0; xx < 5; xx++) if (row[xx] === '#') rect(c, bx + 2 + xx, by + 2 + yy, 1, 1, col);
  });
}
