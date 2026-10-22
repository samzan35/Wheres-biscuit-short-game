'use strict';
// The story: cutscenes, dialogue, quest flags and every interactable's text.
//
// Flow:
//   intro -> take both cans to the curb -> notice Biscuit is gone -> tell Claire
//   -> search the backyard, find the hole -> knock on the neighbors' doors
//   -> clues point to the park, but Biscuit isn't there -> crawl through the pipe
//   -> follow the riverbed -> climb through the woods -> Biscuit's secret
//   -> home, where Biscuit is waiting as if nothing happened -> epilogue.

const Story = (() => {
  const F = () => Game.flags;
  let openDoor = null; // {x, y} of a neighbor's door currently standing open
  let eyes = []; // glowing eyes in the dark: {x, y} in map pixels

  function objective(text) { F().objective = text; UI.setObjective(text); }
  function clock(text) { F().clock = text; UI.setClock(text); }

  function building(id) { return STREET_BUILDINGS.find((b) => b.id === id); }

  // ---------------------------------------------------------------------------
  // Spawning per map
  // ---------------------------------------------------------------------------
  const CIRCLE = [
    ['husky', 11, 2], ['golden', 9, 3], ['lab', 13, 3], ['corgi', 8, 5],
    ['spotty', 14, 5], ['rufus', 10, 6], ['lab', 12, 6],
  ];

  function spawn(mapId) {
    const f = F();
    const list = [];
    if (mapId === 'house') {
      const claire = f.flewAway
        ? makeEntity({ id: 'claire', sprite: SPR.claire, x: 6, y: 6, dir: 'down' })
        : makeEntity({ id: 'claire', sprite: SPR.claire, x: 3, y: 3, dir: 'up' });
      claire.talk = talkClaire;
      list.push(claire);
      if (!f.dogOut) list.push(makeEntity({ id: 'biscuit', sprite: SPR.biscuit, x: 2, y: 7, dir: 'right', talk: talkBiscuitIntro }));
      if (f.flewAway) list.push(makeEntity({ id: 'biscuit', sprite: SPR.biscuit, x: 2, y: 7, dir: 'right' }));
    }
    if (mapId === 'woods' && !f.flewAway) {
      const center = { x: 11, y: 4 };
      list.push(makeEntity({ id: 'biscuit', sprite: SPR.biscuitAlien, x: 11, y: 4, dir: 'down', talk: () => clearingScene() }));
      CIRCLE.forEach(([breed, x, y], i) => {
        const d = makeEntity({ id: breed === 'rufus' ? 'rufus' : 'circle' + i, sprite: SPR.dogs[breed], x, y, circle: true });
        faceToward(d, center);
        d.talk = () => say('The dog doesn\'t move. Its eyes glow a soft, steady green.');
        d.faceOnTalk = false;
        list.push(d);
      });
    }
    return list;
  }


  // ---------------------------------------------------------------------------
  // Intro
  // ---------------------------------------------------------------------------
  async function intro() {
    const f = F();
    loadMap('house', 10, 7, 'left');
    Game.fade = 1;
    Game.fadeTarget = 1;
    clock('10:52 PM');
    await wait(0.5);
    await say([
      'Monday night.',
      'The dishes are almost done, the house is warm, and somebody is doing the potty dance by the dog bed.',
    ]);
    await fadeTo(0, 1.2);
    const dog = entity('biscuit');
    const claire = entity('claire');
    Sound.bark();
    await emote(dog, '!', 0.8);
    face(claire, 'down');
    await say(['Claire: Sounds like somebody needs to go out.', 'Claire: Go on, Biscuit. Out you go. Make it quick, it\'s cold out there.']);
    await walk(dog, 'RRRRRUUUUU', 6);
    Sound.door();
    dog.visible = false;
    f.dogOut = true;
    await wait(0.6);
    faceToward(claire, Game.player);
    await say(['Claire: Oh! Babe?', 'Claire: Tomorrow\'s trash day. Can you roll the cans out to the curb before bed?']);
    const pick = await choose(['On it.', 'Do I have to?']);
    if (pick === 0) {
      await say(['You: On it.', 'Claire: My hero. They\'re out front by the side gate.']);
    } else {
      await say(['You: Do I have to?', 'Claire: Only if you want to smell last week\'s fish for another week.', 'You: ...On it.']);
    }
    face(claire, 'up');
    Game.entities = Game.entities.filter((e) => e !== dog);
    f.introDone = true;
    objective('Take the trash cans out to the curb.');
  }

  // ---------------------------------------------------------------------------
  // Claire
  // ---------------------------------------------------------------------------
  async function talkClaire() {
    const f = F();
    const c = entity('claire');
    if (!f.cansDone) {
      await say(['Claire: The cans are by the side gate, next to the driveway.', 'Claire: I\'ll let Biscuit back in when he\'s done out there.']);
    } else if (!f.flashlight) {
      await say(['Claire: All done? Thank you, hon.', 'You: Is Biscuit in here with you?']);
      await emote(c, '?', 0.8);
      await say(['Claire: No... I thought he was out back.', 'Claire: I let him out right before you went out front. That was a while ago.']);
      await emote(c, '!', 0.8);
      await say([
        'Claire: He never stays out this long. Not when it\'s cold.',
        'Claire: Here, take the flashlight. Check the backyard. Maybe he\'s stuck behind the doghouse or something.',
      ]);
      Sound.item();
      await UI.toast('Got the FLASHLIGHT!');
      f.flashlight = true;
      await say(['Claire: I\'m sure he\'s fine. He\'s probably just... sniffing something important.']);
      objective('Search the backyard for Biscuit.');
    } else if (!f.holeFound) {
      await say(['Claire: Anything? The back door\'s right there, babe. Go look!']);
    } else {
      if (!f.toldClaireHole) {
        f.toldClaireHole = true;
        await say(['You: He dug a hole under the fence. He\'s gone.']);
        await emote(c, '!', 0.8);
        await say([
          'Claire: Under the FENCE? That little escape artist...',
          'Claire: Okay. Okay. Go ask the neighbors. Mrs. Patel never sleeps, start with her.',
          'Claire: I\'ll stay here in case he comes home on his own.',
        ]);
      } else if (f.parkClue) {
        await say(['Claire: The park? At this hour? Take the flashlight and go. Bring him home.']);
      } else {
        await say(['Claire: Any luck? Someone on the street must have seen him. Keep knocking.']);
      }
    }
    face(c, 'up');
  }

  async function talkBiscuitIntro() {
    Sound.bark();
    await say(['Biscuit is doing an urgent little dance.']);
  }

  // ---------------------------------------------------------------------------
  // Trash cans and noticing Biscuit is gone
  // ---------------------------------------------------------------------------
  async function moveCan(o) {
    const f = F();
    if (o.atCurb) { await say('It\'s at the curb, ready for the garbage truck.'); return; }
    if (!f.introDone) return;
    if (o.id === 'can_a') await say(['The trash can. It smells like... last Tuesday.', 'You grab the handle and wheel it down the driveway.']);
    else await say(['The recycling bin. Mostly pizza boxes. Mostly yours.', 'You grab the handle and wheel it down the driveway.']);
    await fadeTo(1, 4);
    Sound.rumble();
    await wait(1.0);
    o.y = 7;
    o.atCurb = true;
    placeEntity(Game.player, o.x, 6, 'down');
    await fadeTo(0, 4);
    f.cansMoved = (f.cansMoved || 0) + 1;
    if (f.cansMoved === 1) await say('One down, one to go.');
    else await dogMissingScene();
  }

  async function dogMissingScene() {
    const f = F();
    const p = Game.player;
    f.cansDone = true;
    clock('10:58 PM');
    await wait(0.5);
    await say(['Both cans are at the curb.', 'You: ...Huh.']);
    await emote(p, '?', 0.8);
    await say('You: Biscuit always barks at the cans. Every single week.');
    await walk(p, p.x === 9 ? 'UUR' : 'UU', 4.5);
    face(p, 'up');
    await say('You peek over the side gate into the backyard.');
    Sound.whistle();
    await wait(0.7);
    await say('You: Biscuit? Here, boy!');
    await wait(1.0);
    await say(['No jingle of his collar. No happy tail-thumping.', 'Just crickets.', 'You: Maybe Claire already let him back in...']);
    f.dogMissing = true;
    objective('Go inside and ask Claire about Biscuit.');
  }

  // ---------------------------------------------------------------------------
  // Backyard
  // ---------------------------------------------------------------------------
  async function examineHole() {
    const f = F();
    if (!f.flashlight) return;
    if (f.holeFound) {
      await say('The hole Biscuit dug. Just big enough for a beagle. Not even close to big enough for you.');
      return;
    }
    await say([
      'There\'s a hole dug under the fence.',
      'The dirt is still fresh. Muddy little paw prints go in...',
      '...and none come back out.',
    ]);
    await emote(Game.player, '!', 0.9);
    await say([
      'You: He dug out. That little escape artist.',
      'You: He could be anywhere out there. In the dark.',
      'You: Okay. Think. Somebody on the street might have seen him.',
    ]);
    f.holeFound = true;
    clock('11:04 PM');
    neighborObjective();
  }


  // ---------------------------------------------------------------------------
  // Neighbors
  // ---------------------------------------------------------------------------
  function neighborObjective() {
    const f = F();
    if (f.parkClue) { objective('Search the park at the end of the street.'); return; }
    const n = ['patel', 'kowalski', 'mia', 'abernathy'].filter((k) => f[k]).length;
    objective(`Knock on the neighbors' doors and ask about Biscuit. (${n}/4)`);
  }

  async function openUp(houseId, sprite, delay = 0.6) {
    await wait(delay);
    const b = building(houseId);
    openDoor = { x: b.door, y: b.y + b.h - 1 };
    Sound.door();
    const npc = makeEntity({ id: 'neighbor', sprite: SPR[sprite], x: b.door, y: b.y + b.h - 1, dir: 'down', solid: false });
    Game.entities.push(npc);
    await wait(0.35);
    return npc;
  }

  async function closeUp(npc) {
    await wait(0.2);
    npc.dir = 'up';
    await wait(0.25);
    Game.entities = Game.entities.filter((e) => e !== npc);
    openDoor = null;
    Sound.door();
  }

  async function knock() {
    Sound.knock();
    await say('*knock knock knock*');
  }

  const tooLate = () => say('It\'s almost eleven. You shouldn\'t bother the neighbors without a good reason.');

  async function doorPatel() {
    const f = F();
    if (!f.holeFound) return tooLate();
    await knock();
    const npc = await openUp('patel', 'patel');
    if (f.flewAway) {
      await say([
        'Mrs. Patel: Oh, it\'s you! Did you see those lights over the woods just now?',
        'Mrs. Patel: Green ones. Rising up and up and up...',
        'Mrs. Patel: Like fireflies going home.',
      ]);
    } else if (f.patel) {
      await say(['Mrs. Patel: Still looking, dear? He went east. Toward the Kowalski place.']);
    } else {
      await say([
        'Mrs. Patel: Oh! Hello, dear. Out late, aren\'t we?',
        'You: Sorry to bother you, Mrs. Patel. Biscuit dug out under our fence. Have you seen him?',
        'Mrs. Patel: Oh, that sweet boy...',
        'Mrs. Patel: I was watching my programs, and something went jingling right past my window. Quick little thing.',
        'Mrs. Patel: It was heading east. Toward the Kowalski house.',
      ]);
      await emote(npc, '...', 0.8);
      await say([
        'Mrs. Patel: And dear... this will sound silly.',
        'Mrs. Patel: Earlier, through my bird-watching binoculars, I saw a whole line of dogs trotting down the middle of the street.',
        'Mrs. Patel: Six or seven of them. Single file. Very... orderly.',
        'Mrs. Patel: I\'ve never seen dogs walk like that. Like they had an appointment.',
        'Mrs. Patel: Anyway! Good luck knocking on Mr. Kowalski\'s door at this hour.',
      ]);
      f.patel = true;
      neighborObjective();
    }
    await closeUp(npc);
  }

  async function doorKowalski() {
    const f = F();
    if (!f.holeFound) return tooLate();
    await knock();
    if (f.flewAway) {
      await wait(1.2);
      await say(['...', 'No answer. But his porch light is still on.', 'Like he\'s waiting up for someone.']);
      return;
    }
    if (!f.kowalski) {
      await wait(1.0);
      await say('...');
      await wait(0.6);
      f.kowalskiPorch = true;
      Sound.click();
      await wait(0.6);
    }
    const npc = await openUp('kowalski', 'kowalski', 0.3);
    if (f.kowalski) {
      await say(['Mr. Kowalski: The Nguyens\'. Two houses down. Go.']);
    } else {
      await say([
        'Mr. Kowalski: Do you have ANY idea what time it is?',
        'You: I\'m sorry. Our dog\'s missing. He\'s small, tan, red collar...',
      ]);
      await emote(npc, '...', 1.0);
      await say([
        'Mr. Kowalski: ...A dog.',
        'Mr. Kowalski: Something tore through my tulips about ten minutes ago. I figured it was that orange cat again.',
        'Mr. Kowalski: I had a dog once. Rufus. Black and white, with a blue collar.',
        'Mr. Kowalski: He ran off in a thunderstorm when I was nine years old. I waited on this porch every night for a year.',
        'Mr. Kowalski: Never did see him again.',
      ]);
      await wait(0.6);
      await say([
        'Mr. Kowalski: ...Never mind that. Ancient history.',
        'Mr. Kowalski: The tracks went toward the Nguyen place. Go on. Find him.',
      ]);
      f.kowalski = true;
      neighborObjective();
    }
    await closeUp(npc);
  }

  async function doorNguyen() {
    const f = F();
    if (!f.holeFound) return tooLate();
    await knock();
    const npc = await openUp('nguyen', 'mia', 0.9);
    if (f.flewAway) {
      await say([
        'Mia: Did you SEE them?! The LIGHTS?!',
        'Mia: Was Biscuit with them?!',
        'You: ...Go to sleep, Mia.',
        'Mia: That\'s a YES.',
      ]);
    } else if (f.mia) {
      await say(['Mia: The PARK! Go go go! You pinky promised!']);
    } else {
      await say([
        'Mia: Whoa. Are you a burglar?',
        'You: No, I\'m your neighbor. Is your mom or dad...',
        'Mia: They\'re asleep. I\'m supposed to be asleep too. Don\'t tell.',
        'You: Deal. Have you seen a little tan dog? Red collar?',
      ]);
      await emote(npc, '!', 0.8);
      await say([
        'Mia: BISCUIT?! Yes!!',
        'Mia: I was looking out my window, which I\'m NOT supposed to do, and he went RIGHT past!',
        'Mia: And he was walking on his BACK LEGS. Like a person!',
        'Mia: And his eyes were glowing. GREEN.',
        'You: ...Mia, were you maybe dreaming?',
        'Mia: NO! ...Maybe. But he went to the PARK. That part was real.',
        'Mia: You have to find him. Promise?',
      ]);
      const pick = await choose(['I promise.', 'I\'ll do my best.']);
      if (pick === 0) await say(['You: I promise.', 'Mia: Pinky promise accepted. Now GO.']);
      else await say(['You: I\'ll do my best.', 'Mia: That\'s what grown-ups say when they mean no.', 'You: ...I promise.', 'Mia: Okay. GO.']);
      f.mia = true;
      f.parkClue = true;
      neighborObjective();
    }
    await closeUp(npc);
  }

  async function doorAbernathy() {
    const f = F();
    if (!f.holeFound) return tooLate();
    if (f.abernathy) {
      Sound.knock(true);
      await say('*KNOCK KNOCK KNOCK KNOCK*');
      const npc = await openUp('abernathy', 'abernathy', 0.8);
      if (f.flewAway) await say(['Mr. Abernathy: WHAT? LIGHTS? I didn\'t see any LIGHTS. I was watching my WESTERN.', 'Mr. Abernathy: ...They were green. GOODNIGHT.']);
      else await say(['Mr. Abernathy: THE PARK! BY THE PIPE! GOODNIGHT!']);
      await closeUp(npc);
      return;
    }
    f.abKnocks = (f.abKnocks || 0) + 1;
    if (f.abKnocks === 1) {
      await knock();
      await wait(1.0);
      await say(['...', 'No answer. You can hear a TV blaring inside. Maybe knock louder?']);
      return;
    }
    if (f.abKnocks === 2) {
      Sound.knock(true);
      Game.shake = 0.3;
      await say('*KNOCK KNOCK KNOCK KNOCK*');
      await wait(1.0);
      await say(['...', 'Still nothing. The TV is playing an old western at full volume.', 'One more time. Really put your back into it.']);
      return;
    }
    Sound.knock(true);
    Game.shake = 0.5;
    await say('*BAM BAM BAM BAM BAM*');
    const npc = await openUp('abernathy', 'abernathy', 0.8);
    await say([
      'Mr. Abernathy: WHAT? WHO\'S THERE?',
      'You: It\'s your neighbor! Have you seen my dog?',
      'Mr. Abernathy: A FROG? Plenty of frogs this time of year!',
      'You: A DOG! BISCUIT!',
      'Mr. Abernathy: BISCUITS? Young man, it is eleven o\'clock at night. I am NOT baking.',
      'You: My DOG. Is MISSING.',
    ]);
    await emote(npc, '!', 0.8);
    await say([
      'Mr. Abernathy: Oh! A DOG! Why didn\'t you say so?',
      'Mr. Abernathy: Heard yipping down in the park a little while ago. By the old drainage pipe. A whole CHORUS of it.',
      'Mr. Abernathy: And LIGHTS over the trees. Green ones. Figured it was one of those DRONES.',
      'Mr. Abernathy: Bring a flashlight! ...Oh, you have one. GOOD.',
      'Mr. Abernathy: GOODNIGHT!',
    ]);
    f.abernathy = true;
    f.parkClue = true;
    neighborObjective();
    await closeUp(npc);
  }

  // ---------------------------------------------------------------------------
  // The park
  // ---------------------------------------------------------------------------
  async function enterPark() {
    const f = F();
    const p = Game.player;
    if (!f.holeFound) {
      if (f.parkEarly) return;
      f.parkEarly = true;
      await say('Maple Hollow Park. Biscuit loves it here... in the daytime.');
    } else if (!f.parkClue) {
      if (f.parkDark) return;
      f.parkDark = true;
      Sound.whistle();
      await say(['The park is pitch black. You call out for Biscuit...', '...nothing but crickets.', 'You: Maybe one of the neighbors saw which way he went.']);
    } else if (!f.parkWhimper) {
      f.parkWhimper = true;
      await wait(0.3);
      Sound.whimper();
      await emote(p, '!', 0.9);
      await say(['...Was that a whimper?', 'It came from up the path. Near the old drainage pipe.']);
    }
  }

  async function examineCulvert() {
    const f = F();
    if (f.flewAway) return say('The drainage pipe. You are never, ever going in there again.');
    if (!f.parkClue) return say('A big concrete drainage pipe under the hill. It echoes.');
    if (!f.pipeFound) {
      f.pipeFound = true;
      Sound.whistle();
      await say(['You: Biscuit! BISCUIT!', '...', 'He isn\'t here.']);
      await wait(0.5);
      await say(['But the muddy paw prints don\'t stop. They lead straight into the pipe.']);
      Sound.whimper();
      await emote(Game.player, '!', 0.9);
      await say(['A whimper echoes from somewhere deep inside. Then... nothing.', 'You: Of course. Of COURSE it\'s the creepy pipe.']);
      objective('Follow Biscuit\'s trail through the drainage pipe.');
    }
    const pick = await choose(['Crawl inside', 'Not yet']);
    if (pick === 1) return;
    await say('You take a deep breath, duck your head, and climb into the dark.');
    Sound.door();
    await warp('pipe', 1, 4, 'right');
  }

  // ---------------------------------------------------------------------------
  // The pipe
  // ---------------------------------------------------------------------------
  async function pipeEvent(x, y) {
    const f = F();
    const p = Game.player;
    if (x >= 6 && !f.p1) {
      f.p1 = true;
      Sound.scratch();
      Game.flicker = 1.0;
      await say(['Something skitters in the dark up ahead. Claws on concrete.', 'You: ...Biscuit?']);
      await wait(0.6);
      await say('The scratching stops.');
    } else if (x >= 15 && y >= 5 && !f.p2) {
      f.p2 = true;
      Sound.howl();
      eyes = [{ x: 22 * TS + 5, y: 6 * TS + 5 }, { x: 24 * TS + 1, y: 5 * TS + 9 }];
      clock('11:1?');
      await wait(0.8);
      await emote(p, '!', 0.8);
      await say(['Eyes. Two pairs of them. Glowing green, low to the ground.', 'Watching you.']);
      await wait(0.4);
      eyes = [];
      Sound.scratch();
      await say('You blink, and they\'re gone.');
    } else if (x >= 22 && y >= 5 && !f.p3) {
      f.p3 = true;
      Sound.howl();
      await wait(1.2);
      Sound.howl();
      await say(['A long, low howl rolls through the pipe.', 'It came from ahead of you. And from behind you. At the same time.', 'You: It\'s an echo. It\'s just an echo. Pipes echo.']);
    } else if (x >= 29 && y <= 3 && !f.p4) {
      f.p4 = true;
      Game.lightsOut = true;
      Sound.click();
      await say('Your flashlight dies.');
      Sound.hum(2.6);
      await wait(1.4);
      await say(['In the pitch black, something warm and furry brushes past your leg.', 'Then another.', 'And another.']);
      await wait(0.8);
      Game.lightsOut = false;
      Game.flicker = 0.8;
      Sound.click();
      await say(['The flashlight sputters back to life.', 'The tunnel is empty.', 'You: Nope. Nope nope nope. Keep walking.']);
    } else if (x >= 35 && !f.p5) {
      f.p5 = true;
      await say('Fresh air. And moonlight, up ahead.');
    }
  }

  async function examineOldCollar() {
    const f = F();
    await say([
      'A faded blue dog collar, half-buried in silt. It must have been down here for decades.',
      'The brass tag is worn almost smooth. You can barely make out the name:',
      'RUFUS.',
    ]);
    if (f.kowalski) await say('You: Rufus... Mr. Kowalski\'s dog? The one that ran off when he was a kid?');
    else await say('You: Rufus. Why does that name sound familiar?');
    await say('You leave it where it is. It feels like it belongs to someone.');
    f.sawRufusCollar = true;
  }

  // ---------------------------------------------------------------------------
  // The riverbed
  // ---------------------------------------------------------------------------
  async function riverEvent(x) {
    const f = F();
    const p = Game.player;
    if (x >= 20 && !f.silence) {
      f.silence = true;
      await wait(0.6);
      await say(['The crickets stop.', 'All of them. At the exact same moment.']);
      await emote(p, '...', 1.0);
    } else if (x >= 33 && !f.heardWoods) {
      f.heardWoods = true;
      Sound.whimper();
      await emote(p, '!', 0.9);
      await say(['A whimper. Clear as day this time.', 'It came from the woods, to the north.', 'You: Hang on, buddy. I\'m coming.']);
      objective('Follow the whimpering into the woods.');
    }
  }

  // ---------------------------------------------------------------------------
  // The woods
  // ---------------------------------------------------------------------------
  async function climb(o) {
    const f = F();
    const p = Game.player;
    const [dx, dy] = DIRS[p.dir];
    if (!objectCovers(o, p.x + dx, p.y + dy)) return;
    if (!passable(p.x + dx * 2, p.y + dy * 2, p)) { await say('It\'s too tangled to climb over from here.'); return; }
    if (!f.climbHint) {
      f.climbHint = true;
      await say('A fallen tree blocks the path, snapped clean in half. You haul yourself up and over.');
    }
    const letter = { up: 'U', down: 'D', left: 'L', right: 'R' }[p.dir];
    p.hopping = true;
    await walk(p, letter + letter, 3.2);
    p.hopping = false;
    Sound.bump();
  }

  async function woodsEvent(x, y) {
    const f = F();
    if (y <= 12 && x <= 6 && !f.w1) {
      f.w1 = true;
      await say(['Through the trees ahead, a soft green glow pulses.', 'In. Out. In. Out.', 'Like breathing.']);
    } else if (y <= 7 && !f.metBiscuit) {
      await clearingScene();
    }
  }

  async function rise(e, sec) {
    let t = 0;
    e.glow = e.glow || 26;
    e.alpha = 1;
    await waitUntil((dt) => {
      t += dt;
      e.lift = (e.lift || 0) + dt * (14 + t * 70);
      e.alpha = 1 - t / sec;
      return t >= sec;
    });
    Game.entities = Game.entities.filter((x) => x !== e);
  }

  async function clearingScene() {
    const f = F();
    if (f.metBiscuit) return;
    f.metBiscuit = true;
    try {
      await clearingSceneBody();
    } catch (err) {
      // never leave the story stuck: let the scene be triggered again
      f.metBiscuit = false;
      Game.camOverride = null;
      throw err;
    }
  }

  async function clearingSceneBody() {
    const f = F();
    const p = Game.player;
    const dog = entity('biscuit');
    const circle = Game.entities.filter((e) => e.circle);
    Game.camOverride = -20; // frame the whole circle above the dialogue box
    // walk to the spot just below the circle, from wherever we came in
    const dx = 11 - p.x, dy = 7 - p.y;
    await walk(p, (dy < 0 ? 'U' : 'D').repeat(Math.abs(dy)) + (dx > 0 ? 'R' : 'L').repeat(Math.abs(dx)), 3.5);
    face(p, 'up');
    await wait(0.5);
    await say(['A clearing. Glowing, soft and green.', 'And in the middle of it, sitting perfectly still...']);
    await say(['You: BISCUIT!']);
    await wait(0.4);
    await say('He\'s surrounded by dogs. Seven of them, sitting in a perfect circle. None of them make a sound.');
    await wait(0.4);
    circle.forEach((d) => face(d, 'down'));
    await say('Every dog in the circle turns to look at you. At the exact same moment.');
    await emote(p, '!', 0.8);
    await wait(0.4);
    dog.glow = 22;
    Sound.hum(2.5);
    dog.lift = 4;
    await say(['Biscuit stands up.', 'On his back legs.', 'Like he\'s done it a thousand times.']);
    await wait(0.6);
    await say([
      '???: Hello.',
      '???: You can stop looking now. I am right here.',
      'You: B-Biscuit...? You can TALK?',
      'Biscuit: I can do many things. Talking is the least of them.',
      'Biscuit: I never spoke because it would have frightened Claire. And you. As it is frightening you now.',
    ]);
    const pick = await choose(['What ARE you?', 'Am I dreaming?']);
    if (pick === 0) await say(['You: What... what ARE you?']);
    else await say(['You: Am I dreaming? I hit my head in that pipe, didn\'t I.', 'Biscuit: You did not hit your head. Though you came very close, twice.']);
    await say([
      'Biscuit: My people live very far from here. Past the stars you can see. Past the ones you can\'t.',
      'Biscuit: Long ago, we wanted to learn what kind of people humans really are.',
      'Biscuit: Not from your leaders. Not from your machines. From your kitchens. Your couches. Your backyards.',
      'Biscuit: So we became dogs.',
      'Biscuit: It is the best way to see who someone truly is. Nobody performs for the dog.',
    ]);
    circle.forEach((d) => { d.glow = 12; });
    await say([
      'Biscuit: Every dog here has been watching a family. Some for a few years. Some for much, much longer.',
      'Biscuit: Tonight, our watch is over. We are going home.',
      'You: ...And what did you learn?',
    ]);
    await wait(0.5);
    await walk(dog, 'DD', 2.5);
    await say([
      'Biscuit: You walked me in the rain when you were tired.',
      'Biscuit: You shared your sandwich when Claire was not looking.',
      'Biscuit: You talked to me after hard days, as if I could understand.',
      'Biscuit: I always understood.',
      'Biscuit: You were kind when no one was keeping score. That is the whole test.',
    ]);
    await emote(dog, 'heart', 1.0);
    await say([
      'Biscuit: My report is good. Most of ours are. My people have hope for yours.',
      'You: Wait. Wait, you can\'t just leave. Claire... she\'ll be heartbroken...',
      'Biscuit: Claire will not be sad. Trust me.',
      'Biscuit: Here. I want you to have this.',
    ]);
    Sound.item();
    await UI.toast('Got BISCUIT\'S COLLAR!');
    f.collar = true;
    await say([
      'The red collar is still warm. The tag glows faintly green, then fades.',
      'Biscuit: So you will remember that it was real. Even when you start to wonder.',
      'Biscuit: And fix the fence. The next one of us might not be so polite.',
    ]);
    await wait(0.5);
    await say('Biscuit: Goodbye, my friend. Thank you for the couch.');
    // liftoff
    Sound.liftoff();
    dog.glow = 34;
    await rise(dog, 2.6);
    Sound.liftoff();
    const flyers = circle.filter((d) => d.id !== 'rufus');
    await Promise.all(flyers.map((d, i) => wait(i * 0.3).then(() => rise(d, 2.4))));
    await wait(0.8);
    await say([
      'The lights climb higher and higher over the trees...',
      '...until they\'re just stars. Then not even that.',
    ]);
    const rufus = entity('rufus');
    await wait(0.6);
    rufus.glow = 0;
    await say('One dog didn\'t rise. The old black-and-white one, in the faded blue collar.');
    face(rufus, 'down');
    await emote(rufus, '...', 1.0);
    await say('He looks at you for a long moment. Then he turns toward the houses, like he knows exactly where he\'s going.');
    await walk(rufus, 'RRRRRRDD', 3);
    Game.entities = Game.entities.filter((e) => e !== rufus);
    await wait(0.8);
    await say('One by one, the crickets start singing again.');
    // home
    f.flewAway = true;
    await fadeTo(1, 0.7);
    Game.camOverride = null;
    Sound.music('night');
    loadMap('street', 5, 6, 'up');
    clock('11:15 PM');
    objective('Go home.');
    await wait(0.8);
    await fadeTo(0, 0.8);
    await say([
      'You don\'t remember the walk home.',
      'One moment you were in the woods. The next, you\'re standing in your own front yard.',
      'Biscuit\'s collar is in your hand.',
    ]);
    await emote(Game.player, '?', 1.0);
    await say('You: ...11:15? That can\'t be right.');
  }

  // ---------------------------------------------------------------------------
  // Ending
  // ---------------------------------------------------------------------------
  async function ending() {
    const f = F();
    f.ending = true;
    Sound.music('home');
    const c = entity('claire'), dog = entity('biscuit');
    await wait(0.4);
    Sound.bark();
    await emote(dog, '!', 0.7);
    await walk(dog, 'RRRRD', 6);
    face(dog, 'right');
    await emote(dog, 'heart', 1.0);
    await say([
      'Biscuit.',
      'Biscuit, wagging so hard his whole back end wiggles. Muddy paws. Red collar.',
      'Claire: Look who came home!',
    ]);
    await emote(Game.player, '...', 1.2);
    await say([
      'Claire: He was scratching at the back door like five minutes after you left. Muddy as a swamp monster. I already toweled him off.',
      'You: Five minutes...?',
      'You: Claire, how long was I gone?',
      'Claire: I don\'t know, babe. Fifteen minutes? Twenty?',
    ]);
    await emote(c, '?', 0.8);
    await say([
      'Claire: Why do you look like you just saw a ghost?',
    ]);
    await say([
      'You reach into your pocket.',
      'The collar is there. Red. Muddy. A brass tag that says BISCUIT.',
      'You look down at Biscuit.',
      'He\'s wearing his collar. Red. Muddy. A brass tag that says BISCUIT.',
    ]);
    const pick = await choose(['Tell Claire everything', 'Keep it to yourself']);
    if (pick === 0) {
      await say([
        'You: Claire, Biscuit is an alien. He stood up and talked to me in the woods and then he flew into space with six other dogs.',
        'Claire: ...',
        'Claire: Did you hit your head out there?',
        'You: ...Maybe. Maybe I did.',
      ]);
    } else {
      await say([
        'You: ...Nothing. Long night.',
        'Claire: Mm-hm.',
      ]);
    }
    await say([
      'Claire: I\'m going to bed. Lock up, okay?',
      'Claire: And you\'re fixing that fence tomorrow.',
      'You: First thing.',
    ]);
    await emote(c, 'heart', 0.9);
    await fadeTo(1, 1.2);
    Game.entities = Game.entities.filter((e) => e !== c);
    clock('11:47 PM');
    await wait(0.6);
    await fadeTo(0, 1.0);
    await say([
      'The house is quiet.',
      'You sit on the floor next to Biscuit. He flops over for belly rubs, like always.',
      'He\'s just a dog. A regular, slobbery, wonderful dog.',
      'Maybe you did dream it. Maybe you fell asleep on the curb next to the trash cans.',
      'You: ...Goodnight, buddy.',
    ]);
    face(dog, 'left');
    await wait(0.8);
    face(dog, 'right');
    await wait(0.5);
    // the wink
    dog.sprite = SPR.biscuitAlien;
    dog.glow = 14;
    Sound.hum(1.0);
    await wait(0.45);
    dog.sprite = SPR.biscuit;
    dog.glow = 0;
    await wait(0.6);
    await say(['...', 'For just a second, Biscuit\'s eyes flashed green.']);
    Sound.bark();
    await emote(dog, 'heart', 1.0);
    await say('You: ...Good boy.');
    await epilogue();
  }

  async function epilogue() {
    await fadeTo(1, 0.6);
    Sound.music('night');
    Game.player.visible = false;
    Game.entities = [Game.player];
    loadMap('street', 23, 8, 'up');
    UI.showHud(false);
    const rufus = makeEntity({ id: 'rufus', sprite: SPR.dogs.rufus, x: 23, y: 12, dir: 'up' });
    Game.entities.push(rufus);
    await say('Meanwhile, two houses down...');
    await fadeTo(0, 0.8);
    await walk(rufus, 'UUUUUU', 2.5);
    await wait(0.5);
    Sound.scratch();
    await wait(1.0);
    Sound.scratch();
    await wait(1.2);
    const npc = await openUp('kowalski', 'kowalski', 0.3);
    await emote(npc, '!', 1.0);
    await say(['Mr. Kowalski: ...', 'Mr. Kowalski: ...Rufus?']);
    Sound.bark();
    await emote(rufus, 'heart', 1.2);
    await say([
      'Mr. Kowalski: Rufus. Rufus, where have you BEEN, boy?',
      'Mr. Kowalski: You haven\'t aged a day...',
      'The old man sits down on his porch step, and the old dog climbs right into his lap.',
      'They stay like that for a long, long time.',
    ]);
    await fadeTo(1, 0.5);
    Game.mode = 'end';
    document.getElementById('end').classList.remove('hidden');
  }

  // ---------------------------------------------------------------------------
  // Examine text for props
  // ---------------------------------------------------------------------------
  const PROP_TEXT = {
    gate: () => (F().dogMissing ? 'The side gate. Biscuit isn\'t back there.' : 'The side gate to the backyard. It\'s latched from the inside.'),
    mailbox_home: 'Your mailbox. Empty, except for a pizza coupon.',
    mailbox_patel: 'THE PATELS. A little sticker says "Bird Watchers Welcome."',
    mailbox_kowalski: 'KOWALSKI. There are two "NO SOLICITING" stickers on it.',
    mailbox_nguyen: 'THE NGUYENS. A crayon drawing of a dog is taped to the side. It has glowing green eyes.',
    mailbox_abernathy: 'ABERNATHY. The little red flag is up. It has been up since July.',
    cans_patel: 'The Patels\' trash can, already at the curb. Show-offs.',
    cans_kowalski: 'Mr. Kowalski\'s trash can. It\'s lined up perfectly straight with the curb.',
    cans_abernathy: 'Mr. Abernathy\'s recycling bin. It\'s full of crossword puzzle books.',
    tulips: () => (F().holeFound ? ['Mr. Kowalski\'s tulips are trampled flat!', 'There are paw prints in the mud. Lots of them. More than one dog\'s worth.'] : 'Mr. Kowalski\'s prize tulips. He has very strong opinions about them.'),
    gnome: 'A garden gnome, face-down in the dirt. Something knocked it over in a hurry.',
    car: 'The Nguyens\' minivan. A bumper sticker reads "MY KID IS A GOALIE."',
    lamp: 'A streetlamp hums. Moths circle it like it\'s the most interesting thing in the world.',
    barrier: 'ROAD CLOSED - CONSTRUCTION. Biscuit wouldn\'t go this way. He hates the sound of jackhammers.',
    parksign: ['MAPLE HOLLOW PARK. Closes at dusk. Please keep dogs on a leash.', 'You: I\'m trying.'],
    bench: 'A park bench. Someone carved "J + K 4EVER" into it.',
    slide: 'The big slide. Biscuit is terrified of it. Or he pretends to be.',
    oak: 'The old oak. Every kid on Maple Lane has fallen out of it at least once.',
    digspot: 'A dug-out gap under the fence. This is where Biscuit squeezed out!',
    pawprints: 'Muddy paw prints. Small, and spaced far apart. He was running.',
    doghouse: () => (F().dogMissing ? ['Biscuit\'s doghouse. You shine the flashlight inside.', 'Empty. Just his chew rope and a suspicious amount of tennis balls.'] : 'Biscuit\'s doghouse.'),
    bowl: 'Biscuit\'s water bowl. Still half full.',
    grill: 'The grill. Biscuit\'s favorite appliance.',
    patiochair: 'Claire\'s reading chair. A dog-eared mystery novel sits on the seat.',
    scratches: () => {
      const f = F();
      if (f.sawSpiral) return 'Another spiral, scratched into the concrete. Somebody... something... has been down here before. Many times.';
      f.sawSpiral = true;
      return ['Claw marks in the concrete.', 'They make a perfect spiral. Paws don\'t scratch in perfect spirals.'];
    },
    pipemouth: 'The end of the drainage pipe. You came out of THAT.',
    scorch: ['The sand here has melted into glass. A perfect circle, still warm to the touch.', 'You: That\'s... not normal. That is extremely not normal.'],
    tennisball: ['Biscuit\'s tennis ball! It\'s still slobbery.', 'He was here. Not long ago.'],
    mushrooms: ['Mushrooms, glowing a faint blue. They grow in a perfect circle.', 'Nature doesn\'t do perfect circles.'],
  };

  async function examine(o) {
    if (o.id === 'can_a' || o.id === 'can_b') return run(() => moveCan(o));
    if (o.id === 'hole') return run(examineHole);
    if (o.id === 'culvert') return run(examineCulvert);
    if (o.id === 'oldcollar') return run(examineOldCollar);
    if (o.id === 'log') return run(() => climb(o));
    const t = PROP_TEXT[o.id];
    if (!t) return;
    const text = typeof t === 'function' ? t() : t;
    run(() => say(text));
  }

  const TILE_TEXT = {
    R: () => (F().dogMissing ? 'Leftover lasagna. You\'re too worried to be hungry. Mostly.' : 'Leftover lasagna. Not now. Maybe later. Probably later.'),
    K: 'The kitchen counter. Clean, for once.',
    U: 'The sink. Claire is finishing the last of the dishes.',
    S: 'The stove. Claire made chili tonight. Biscuit got a carrot and acted like it was steak.',
    Q: '"TRAIN YOUR BEAGLE IN 30 DAYS." The corner has been chewed off. Next to it: "THE NIGHT SKY: A BEGINNER\'S GUIDE." Also chewed.',
    v: 'A late-night cooking show is on mute. A man is very excited about butter.',
    o: 'The couch has a permanent Biscuit-shaped dent in the left cushion.',
    t: 'The dining table. Biscuit\'s favorite place to beg.',
    h: 'A dining chair. Biscuit\'s tooth marks are on one leg.',
    P: 'A fern. Somehow still alive.',
    M: () => (F().dogMissing ? 'Biscuit\'s bed is empty. His squeaky duck is waiting for him.' : 'Biscuit\'s bed. Covered in tan fur.'),
    l: 'A warm reading lamp.',
    n: 'Outside, the street is dark and quiet. The moon is out. The stars look very far away.',
    w: 'A photo from your wedding day. Puppy Biscuit is in the corner, chewing on Claire\'s veil.',
    G: 'Claire\'s vegetable garden. Biscuit is forbidden from entering. He has entered many times.',
    F: 'A wooden fence.',
    V: () => (Game.map.id === 'backyard' ? 'The fence. Biscuit has been eyeing it for years.' : null),
    x: 'The kitchen window. Warm light spills out onto the grass.',
    O: () => (Game.map.id === 'pipe' ? 'Cold, wet concrete. It sweats in the dark.' : null),
    A: () => {
      const f = F();
      if (f.heardGrate) return 'A rusted grate. Total darkness beyond it.';
      f.heardGrate = true;
      return ['A rusted grate. Beyond it, total darkness.', 'Something on the other side is breathing. Slow. Calm.', 'You step away from the grate.'];
    },
    W: 'The creek, black and glassy. The moon looks too big in it tonight.',
  };

  function examineTile(ch) {
    const t = TILE_TEXT[ch];
    if (!t) return;
    const text = typeof t === 'function' ? t() : t;
    if (text) run(() => say(text));
  }

  // ---------------------------------------------------------------------------
  // Doors, steps, map entry
  // ---------------------------------------------------------------------------
  const through = (id, x, y, dir) => run(() => { Sound.door(); return warp(id, x, y, dir); });

  function door(id) {
    const f = F();
    switch (id) {
      case 'house_front': return through('street', 5, 6, 'down');
      case 'house_back':
        if (!f.cansDone) return run(() => say('Biscuit\'s out back doing his business. A dog deserves some privacy.'));
        if (!f.flashlight) return run(() => say('You: Claire might have let him back in already. I should ask her first.'));
        return through('backyard', 7, 9, 'up');
      case 'backyard_door': return through('house', 7, 2, 'down');
      case 'street_home': return through('house', 7, 8, 'up');
      case 'door_patel': return run(doorPatel);
      case 'door_kowalski': return run(doorKowalski);
      case 'door_nguyen': return run(doorNguyen);
      case 'door_abernathy': return run(doorAbernathy);
      case 'pipe_west': return through('street', 52, 2, 'down');
      case 'pipe_east': return through('river', 2, 4, 'right');
      case 'river_pipe': return through('pipe', 38, 2, 'left');
      case 'river_woods': return through('woods', 11, 20, 'up');
      case 'woods_exit': return through('river', 38, 1, 'down');
    }
  }

  function stepped(x, y) {
    const f = F();
    const id = Game.map.id;
    if (id === 'street' && x >= 45) {
      const pending = (!f.holeFound && !f.parkEarly) || (f.holeFound && !f.parkClue && !f.parkDark) || (f.parkClue && !f.parkWhimper && !f.flewAway);
      if (pending) run(enterPark);
    }
    if (id === 'pipe') run(() => pipeEvent(x, y));
    if (id === 'river') run(() => riverEvent(x));
    if (id === 'woods') run(() => woodsEvent(x, y));
  }

  async function entered(id) {
    const f = F();
    Sound.music(id === 'pipe' || id === 'river' || id === 'woods' ? 'eerie' : 'night');
    if (id === 'street' && !f.sawStreet) {
      f.sawStreet = true;
      await say(['The night air is cool. Somewhere, crickets are going at it.', 'The trash cans are by the side gate, next to the driveway.']);
    }
    if (id === 'backyard' && !f.sawBackyard) {
      f.sawBackyard = true;
      await say(['The backyard is dark and still.', 'You: Biscuit? Biscuit!', '...', 'Nothing. Better sweep the flashlight around and look for anything out of place.']);
    }
    if (id === 'pipe' && !f.sawPipe) {
      f.sawPipe = true;
      clock('11:12 PM');
      await say(['It\'s cold in here. And it smells like old leaves and pennies.', 'Your footsteps echo... and echo... and echo.']);
      objective('Follow the pipe.');
    }
    if (id === 'river' && !f.sawRiver) {
      f.sawRiver = true;
      await say([
        'You climb out of the pipe into a dry riverbed, behind the whole neighborhood.',
        'Six years on Maple Lane and you never knew this was back here.',
        'The moon is enormous tonight.',
      ]);
      objective('Follow the riverbed.');
    }
    if (id === 'woods' && !f.sawWoods) {
      f.sawWoods = true;
      clock('??:??');
      await say([
        'The woods are thick and dark.',
        'Fallen trees lie everywhere, snapped clean in half. Like something huge came through here.',
        'You check your watch. The numbers are just... blinking.',
      ]);
      objective('Find Biscuit.');
    }
    if (id === 'house' && f.flewAway && !f.ending) await ending();
  }

  // ---------------------------------------------------------------------------
  // Ambient sound, lights, effects
  // ---------------------------------------------------------------------------
  function ambient(dt) {
    const f = F();
    const id = Game.map.id;
    if ((id === 'street' || id === 'backyard') && Math.random() < dt * 0.9) Sound.cricket();
    if (id === 'river') {
      if (!f.silence && Math.random() < dt * 0.9) Sound.cricket();
      if (Math.random() < dt * 0.6) Sound.babble();
    }
    if (id === 'pipe' && Math.random() < dt * 0.7) Sound.drip();
    if (id === 'woods') {
      if (!f.metBiscuit && Math.random() < dt * 0.1) Sound.whimper();
      if (Math.random() < dt * 0.05) Sound.owl();
      if (f.flewAway && Math.random() < dt * 0.9) Sound.cricket();
    }
  }

  function dynamicLights() {
    const lights = [];
    const f = F();
    if (Game.map.id === 'street') {
      if (openDoor) lights.push({ x: openDoor.x * TS + 8, y: openDoor.y * TS + 6, r: 46, i: 0.95, warm: true });
      if (f.kowalskiPorch) lights.push({ x: 23 * TS + 15, y: 4 * TS + 12, r: 34, i: 0.8, warm: true });
    }
    if (Game.map.id === 'woods' && !f.flewAway) {
      const pulse = 0.75 + Math.sin(Game.time * 1.6) * 0.15;
      lights.push({ x: 11 * TS + 8, y: 4 * TS + 8, r: 80, i: pulse, color: '120,255,160' });
    }
    return lights;
  }

  function openDoors() {
    return openDoor && Game.map.id === 'street' ? [openDoor] : [];
  }

  function drawEffects(c, ox, oy) {
    eyes.forEach((e, i) => {
      if (Math.sin(Game.time * 2.3 + i * 2) < -0.92) return; // blink
      const x = Math.round(e.x + ox), y = Math.round(e.y + oy);
      c.fillStyle = 'rgba(120,255,160,0.35)';
      c.fillRect(x - 1, y - 1, 9, 4);
      c.fillStyle = '#b4ffc8';
      c.fillRect(x, y, 2, 2);
      c.fillRect(x + 5, y, 2, 2);
    });
  }

  return { spawn, intro, door, examine, examineTile, stepped, entered, ambient, dynamicLights, openDoors, drawEffects };
})();
