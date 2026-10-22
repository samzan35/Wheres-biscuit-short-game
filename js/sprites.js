'use strict';
// Character sprites built from text templates + per-character palettes.
// Legend: O outline, H hair, S skin, E eyes, T top, P pants, B shoes,
//         L long hair (hair colour or empty), N neck (hair if long, else skin)

const CH_DOWN = [
  '................',
  '.....OOOOOO.....',
  '....OHHHHHHO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHSSSSHHO...',
  '...OHSESSESHO...',
  '...LOSSSSSSOL...',
  '...LLOSSSSOLL...',
  '..OTTTTTTTTTTO..',
  '..OTOTTTTTTOTO..',
  '..OSOTTTTTTOSO..',
  '...OOPPPPPPOO...',
  '....OPPOOPPO....',
  '....OBBOOBBO....',
  '.....OO..OO.....',
];

const CH_UP = [
  '................',
  '.....OOOOOO.....',
  '....OHHHHHHO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...LOHHHHHHOL...',
  '...LLONNNNOLL...',
  '..OTTTTTTTTTTO..',
  '..OTOTTTTTTOTO..',
  '..OSOTTTTTTOSO..',
  '...OOPPPPPPOO...',
  '....OPPOOPPO....',
  '....OBBOOBBO....',
  '.....OO..OO.....',
];

const CH_RIGHT = [
  '................',
  '.....OOOOOO.....',
  '....OHHHHHHO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHSSSO...',
  '...OHHHHSSESO...',
  '...LOHHHSSSSO...',
  '...LLOOSSSSO....',
  '....OTTTTTTO....',
  '....OTTTTTTO....',
  '....OTTSTTTO....',
  '....OOPPPPOO....',
  '.....OPPPPO.....',
  '.....OBBBBO.....',
  '......OOOOO.....',
];

const LEGS = {
  front: {
    a: ['....OPPOOPPO....', '....OBBOOPPO....', '.....OO.OBBO....'],
    b: ['....OPPOOPPO....', '....OPPOOBBO....', '....OBBO.OO.....'],
  },
  side: {
    a: ['....OPPOOPPO....', '...OBBO..OBBO...', '...OOO....OOO...'],
    b: ['.....OPPPPO.....', '.....OBBBBO.....', '......OOOOO.....'],
  },
};

function canvasFrom(rows, pal) {
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  const c = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const col = pal[row[x]];
      if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
    }
  });
  return cv;
}

function mirrorCanvas(src) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const c = cv.getContext('2d');
  c.translate(src.width, 0);
  c.scale(-1, 1);
  c.drawImage(src, 0, 0);
  return cv;
}

function withLegs(rows, legs) {
  return rows.slice(0, 13).concat(legs);
}

// Kids: drop an arm row and the belt row, push everything down two pixels.
function kidify(rows) {
  const out = rows.filter((_, i) => i !== 10 && i !== 12);
  return ['................', '................'].concat(out);
}

function makeCharacter(p) {
  const pal = {
    O: '#1a1420', E: '#1a1420',
    H: p.hair, S: p.skin, T: p.top, P: p.pants, B: p.shoes || '#3a2a22',
    L: p.long ? p.hair : null,
    N: p.long ? p.hair : p.skin,
  };
  const prep = (rows) => (p.kid ? kidify(rows) : rows);
  const set = (base, legKind) => [
    canvasFrom(prep(base), pal),
    canvasFrom(prep(withLegs(base, LEGS[legKind].a)), pal),
    canvasFrom(prep(withLegs(base, LEGS[legKind].b)), pal),
  ];
  const right = set(CH_RIGHT, 'side');
  return {
    down: set(CH_DOWN, 'front'),
    up: set(CH_UP, 'front'),
    right,
    left: right.map(mirrorCanvas),
  };
}

// ---- Biscuit the dog ----
const DOG_PAL = {
  O: '#2a1a10', C: '#d8a35a', D: '#8a5a2e', W: '#f5e6c8', E: '#1a1010', N: '#1a1010', R: '#d0302a',
};

const DOG_DOWN = [
  '................',
  '................',
  '................',
  '....OO....OO....',
  '...ODDO..ODDO...',
  '...ODCOOOOCDO...',
  '...ODCCCCCCDO...',
  '....OCECCECO....',
  '....OCCWWCCO....',
  '.....OWNNWO.....',
  '....ORRRRRRO....',
  '...OCCWWWWCCO...',
  '...OCCWWWWCCO...',
  '...OCCCCCCCCO...',
  '...OCOCOOCOCO...',
  '....O.O..O.O....',
];

const DOG_UP = [
  '................',
  '................',
  '................',
  '....OO....OO....',
  '...ODDO..ODDO...',
  '...ODCOOOOCDO...',
  '...ODCCCCCCDO...',
  '....OCCCCCCO....',
  '....OCCCCCCO....',
  '.....OCCCCO.....',
  '....ORRRRRRO....',
  '...OCCCDDCCCO...',
  '...OCCCDDCCCO...',
  '...OCCCCCCCCO...',
  '...OCOCOOCOCO...',
  '....O.O..O.O....',
];

const DOG_RIGHT = [
  '................',
  '................',
  '................',
  '................',
  '..........OOO...',
  '.........OCCCO..',
  '........OCCCECO.',
  '..O.....ODCCCCNO',
  '.OCO....ODDCCCO.',
  '..OCOOOOORRRRO..',
  '...OCCCCCCCCO...',
  '...OCWWWWWCCO...',
  '...OCCCCCCCCO...',
  '...OCOO...OCOO..',
  '...OO.....OO....',
  '................',
];

function dogFrames(base, a, b, pal) {
  return [
    canvasFrom(base, pal),
    canvasFrom(base.slice(0, 14).concat(a), pal),
    canvasFrom(base.slice(0, 14).concat(b), pal),
  ];
}

function makeDog(overrides = {}) {
  const pal = Object.assign({}, DOG_PAL, overrides);
  const frontA = ['...OCOCOOCOCO...', '....O.O.........'];
  const frontB = ['...OCOCOOCOCO...', '.........O.O....'];
  const sideA = ['..OCO.O..OCO.O..', '..OO..O..OO..O..'];
  const sideB = ['....OCOO..OCOO..', '....OO....OO....'];
  const right = [
    canvasFrom(DOG_RIGHT, pal),
    canvasFrom(DOG_RIGHT.slice(0, 13).concat(sideA, ['................']), pal),
    canvasFrom(DOG_RIGHT.slice(0, 13).concat(sideB, ['................']), pal),
  ];
  return {
    down: dogFrames(DOG_DOWN, frontA, frontB, pal),
    up: dogFrames(DOG_UP, frontA, frontB, pal),
    right,
    left: right.map(mirrorCanvas),
  };
}

let SPR = null;
function buildSprites() {
  SPR = {
    player: makeCharacter({ hair: '#5a3a22', skin: '#f1c7a0', top: '#3d6fb5', pants: '#2f3442', shoes: '#6b4a33' }),
    claire: makeCharacter({ hair: '#b5562e', skin: '#f3cfae', top: '#7fae6b', pants: '#4a3f6b', shoes: '#3a2a2a', long: true }),
    patel: makeCharacter({ hair: '#c9c4cc', skin: '#b57a52', top: '#8a4f9e', pants: '#6b3f7a', shoes: '#3a2a2a', long: true }),
    kowalski: makeCharacter({ hair: '#8f8f8f', skin: '#e8b896', top: '#8a2f3a', pants: '#7a2632', shoes: '#5a4030' }),
    mia: makeCharacter({ hair: '#2a1d18', skin: '#e0b48a', top: '#f29ab8', pants: '#e486a8', shoes: '#f4f4f4', long: true, kid: true }),
    abernathy: makeCharacter({ hair: '#f2f2f2', skin: '#f0c8a8', top: '#5f7d4a', pants: '#7a6a55', shoes: '#3a2a1f' }),
    biscuit: makeDog(),
    // Biscuit with his eyes glowing, for when he isn't pretending
    biscuitAlien: makeDog({ E: '#7affa0' }),
    dogs: {
      rufus: makeDog({ C: '#ece8e0', D: '#1e1e22', W: '#ffffff', R: '#3a5a8a', E: '#7affa0' }),
      husky: makeDog({ C: '#8e96a0', D: '#4a4f58', W: '#eef0f2', R: '#2a8a5a', E: '#7affa0' }),
      lab: makeDog({ C: '#3a3030', D: '#241c1c', W: '#4a4040', R: '#d8a020', E: '#7affa0' }),
      golden: makeDog({ C: '#e0b060', D: '#c08a40', W: '#f5e0b0', R: '#4060c0', E: '#7affa0' }),
      corgi: makeDog({ C: '#d87a3a', D: '#a85a2a', W: '#fff0e0', R: '#8a3ab0', E: '#7affa0' }),
      spotty: makeDog({ C: '#f0ece4', D: '#5a3a28', W: '#ffffff', R: '#c03030', E: '#7affa0' }),
    },
  };
}
