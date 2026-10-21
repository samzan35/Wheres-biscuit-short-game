'use strict';
// The story: cutscenes, dialogue, quest flags and every interactable's text.
//
// Flow:
//   intro -> take both cans to the curb -> notice Biscuit is gone -> tell Claire
//   -> search the backyard, find the hole -> knock on the neighbors' doors
//   -> clues point to the park -> find Biscuit (and a kitten) -> bring him home.

const Story = (() => {
  const F = () => Game.flags;
  let openDoor = null; // {x, y} of a neighbor's door currently standing open

  function objective(text) { F().objective = text; UI.setObjective(text); }
  function clock(text) { F().clock = text; UI.setClock(text); }

  function building(id) { return STREET_BUILDINGS.find((b) => b.id === id); }

  // ---------------------------------------------------------------------------
  // Spawning per map
  // ---------------------------------------------------------------------------
  function spawn(mapId) {
    const f = F();
    const list = [];
    if (mapId === 'house') {
      const claire = f.foundBiscuit
        ? makeEntity({ id: 'claire', sprite: SPR.claire, x: 7, y: 2, dir: 'down' })
        : makeEntity({ id: 'claire', sprite: SPR.claire, x: 3, y: 3, dir: 'up' });
      claire.talk = talkClaire;
      list.push(claire);
      if (!f.dogOut) list.push(makeEntity({ id: 'biscuit', sprite: SPR.biscuit, x: 2, y: 7, dir: 'right', talk: talkBiscuitIntro }));
    }
    if (mapId === 'street' && f.parkClue && !f.foundBiscuit) list.push(...parkPair());
    return list;
  }

  // Biscuit and the kitten, waiting by the culvert in the park.
  function parkPair() {
    return [
      makeEntity({ id: 'biscuit', sprite: SPR.biscuit, x: 52, y: 2, dir: 'down', talk: findBiscuit }),
      makeEntity({ id: 'kitten', sprite: SPR.kitten, x: 53, y: 2, dir: 'down', talk: findBiscuit, faceOnTalk: false }),
    ];
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
    } else if (!f.foundBiscuit) {
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
    } else {
      await say(['Claire: You found him!']);
    }
    if (!f.foundBiscuit) face(c, 'up');
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
    if (f.parkClue) {
      // the clue arrives while we're already on the street, so place the pair now
      if (Game.map.id === 'street' && !entity('biscuit')) Game.entities.push(...parkPair());
      objective('Search the park at the end of the street.');
      return;
    }
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
    if (f.foundBiscuit) {
      await say(['Mrs. Patel: You found him! Oh, I\'m so glad.', 'Mrs. Patel: ...Dear, why is your jacket purring?']);
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
        'Mrs. Patel: Good luck knocking on HIS door at this hour.',
        'Mrs. Patel: I\'ll leave my porch light on, in case Biscuit comes back this way.',
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
    if (!f.kowalski) {
      await wait(1.0);
      await say('...');
      await wait(0.6);
      f.kowalskiPorch = true;
      Sound.click();
      await wait(0.6);
    }
    const npc = await openUp('kowalski', 'kowalski', 0.3);
    if (f.foundBiscuit) {
      await say(['Mr. Kowalski: ...You found him.', 'Mr. Kowalski: Good. That\'s good.', 'Mr. Kowalski: Now go to bed.']);
    } else if (f.kowalski) {
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
        'Mr. Kowalski: I had a dog once. Rufus. He ran off in a thunderstorm when I was a kid. Never did...',
      ]);
      await wait(0.6);
      await say([
        'Mr. Kowalski: ...Never mind that.',
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
    if (f.foundBiscuit) {
      await say([
        'Mia: YOU FOUND HIM!!!',
        'Mia: Wait. Is that... a KITTY in your jacket?!',
        'Mia: Can I come visit her? Tomorrow? After school? PLEASE?',
        'You: Ask your parents. In the morning. When you\'re supposed to be awake.',
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
        'Mia: I was looking out my window, which I\'m NOT supposed to do, and he ran RIGHT past!',
        'Mia: He was going super fast toward the park. Like he heard something.',
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
      if (f.foundBiscuit) await say(['Mr. Abernathy: WHAT? Oh! The dog! GOOD BOY!', 'Mr. Abernathy: ...Is that a CAT? Never mind. GOODNIGHT!']);
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
      'Mr. Abernathy: Heard yipping down in the park a little while ago. By the old drainage pipe. Figured it was coyotes.',
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
    } else if (!f.foundBiscuit && !f.parkWhimper) {
      f.parkWhimper = true;
      await wait(0.3);
      Sound.whimper();
      await emote(p, '!', 0.9);
      await say(['...Was that a whimper?', 'It came from up the path. Near the old drainage pipe.']);
    }
  }

  async function findBiscuit() {
    const f = F();
    const dog = entity('biscuit'), kit = entity('kitten');
    dog.dir = OPPOSITE[Game.player.dir];
    Sound.bark();
    await emote(dog, 'heart', 1.0);
    await say([
      'You: BISCUIT!',
      'Biscuit wiggles so hard his whole back end wags. He\'s muddy and his ears are full of leaves, but he\'s okay.',
      'You: You scared us half to death, buddy. What are you even doing out h-',
    ]);
    Sound.mew();
    await emote(kit, '!', 0.8);
    await say([
      'Mew.',
      'Something tiny is pressed up against Biscuit\'s side.',
      'A soaking-wet orange kitten, shivering at the mouth of the pipe.',
    ]);
    await say([
      'Biscuit nudges the kitten toward you with his nose. He looks very, very proud of himself.',
      'You: ...So that\'s what this was all about. You heard her crying, didn\'t you?',
    ]);
    Sound.bark();
    await emote(dog, 'note', 0.8);
    await say('You scoop up the kitten and tuck her inside your jacket. She starts purring right away.');
    Game.entities = Game.entities.filter((e) => e !== kit);
    await say('You: Come on, you two. Let\'s go home. Claire\'s worried sick.');
    dog.follower = true;
    dog.solid = false;
    dog.talk = async () => { Sound.bark(); await say('Biscuit pants happily. He is not sorry. Not even a little.'); };
    f.foundBiscuit = true;
    clock('11:21 PM');
    objective('Bring Biscuit home.');
    Sound.music('home');
  }

  // ---------------------------------------------------------------------------
  // Ending
  // ---------------------------------------------------------------------------
  async function ending() {
    const f = F();
    f.ending = true;
    const c = entity('claire'), dog = entity('biscuit');
    await emote(c, '!', 0.7);
    await say('Claire: BISCUIT!');
    Sound.bark();
    dog.follower = false;
    await walk(dog, 'UUUU', 7);
    await emote(dog, 'heart', 1.0);
    walk(Game.player, 'UUU', 3.5);
    await say([
      'Claire: You muddy little escape artist! Where did you GO?',
      'Biscuit licks her entire face. This is apparently his answer.',
      'You: The park. Down by the drainage pipe.',
      'You: He wasn\'t running away. He was rescuing somebody.',
    ]);
    await emote(c, '?', 0.8);
    await say('You unzip your jacket. A small orange head pops out.');
    const kit = makeEntity({ id: 'kitten', sprite: SPR.kitten, x: 8, y: 4, dir: 'down', solid: false });
    Game.entities.push(kit);
    Sound.mew();
    await emote(kit, 'heart', 0.9);
    await say(['Mew.', 'Claire: ...Oh no.', 'Claire: Oh no, she\'s perfect.']);
    await say([
      'Claire: We are NOT keeping a-',
      'Biscuit sits down next to the kitten. He looks at Claire. The kitten looks at Claire.',
      'Claire: ...',
      'Claire: Okay. She can stay tonight. Just tonight.',
      'You: Just tonight.',
      'Claire: ...We\'re keeping her, aren\'t we.',
      'You: We\'re keeping her.',
    ]);
    await say([
      'Claire: And YOU are fixing that fence tomorrow.',
      'You: First thing.',
      'Claire: Did the cans at least make it to the curb?',
      'You: Both of them.',
      'Claire: My hero.',
    ]);
    await emote(c, 'heart', 1.2);
    clock('11:34 PM');
    await fadeTo(1, 0.6);
    await say([
      'That night, Biscuit slept in his bed with a small orange kitten curled up between his paws.',
      'They named her Tuesday. Trash day. It felt right.',
    ]);
    Game.mode = 'end';
    UI.showHud(false);
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
    mailbox_nguyen: 'THE NGUYENS. A crayon drawing of a cat is taped to the side.',
    mailbox_abernathy: 'ABERNATHY. The little red flag is up. It has been up since July.',
    cans_patel: 'The Patels\' trash can, already at the curb. Show-offs.',
    cans_kowalski: 'Mr. Kowalski\'s trash can. It\'s lined up perfectly straight with the curb.',
    cans_abernathy: 'Mr. Abernathy\'s recycling bin. It\'s full of crossword puzzle books.',
    tulips: () => (F().holeFound ? ['Mr. Kowalski\'s tulips are trampled flat!', 'There are tiny paw prints in the mud, heading east.'] : 'Mr. Kowalski\'s prize tulips. He has very strong opinions about them.'),
    gnome: 'A garden gnome, face-down in the dirt. Something knocked it over in a hurry.',
    car: 'The Nguyens\' minivan. A bumper sticker reads "MY KID IS A GOALIE."',
    lamp: 'A streetlamp hums. Moths circle it like it\'s the most interesting thing in the world.',
    barrier: 'ROAD CLOSED - CONSTRUCTION. Biscuit wouldn\'t go this way. He hates the sound of jackhammers.',
    parksign: ['MAPLE HOLLOW PARK. Closes at dusk. Please keep dogs on a leash.', 'You: I\'m trying.'],
    bench: 'A park bench. Someone carved "J + K 4EVER" into it.',
    slide: 'The big slide. Biscuit is terrified of it.',
    oak: 'The old oak. Every kid on Maple Lane has fallen out of it at least once.',
    culvert: () => (F().foundBiscuit ? 'The drainage pipe. Damp, dark, and now kitten-free.' : 'A big concrete drainage pipe under the hill. It echoes.'),
    digspot: 'A dug-out gap under the fence. This is where Biscuit squeezed out!',
    pawprints: 'Muddy paw prints. Small, and spaced far apart. He was running. They head east, down the street.',
    doghouse: () => (F().dogMissing ? ['Biscuit\'s doghouse. You shine the flashlight inside.', 'Empty. Just his chew rope and a suspicious amount of tennis balls.'] : 'Biscuit\'s doghouse.'),
    bowl: 'Biscuit\'s water bowl. Still half full.',
    grill: 'The grill. Biscuit\'s favorite appliance.',
    patiochair: 'Claire\'s reading chair. A dog-eared mystery novel sits on the seat.',
  };

  async function examine(o) {
    if (o.id === 'can_a' || o.id === 'can_b') return run(() => moveCan(o));
    if (o.id === 'hole') return run(examineHole);
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
    Q: '"TRAIN YOUR BEAGLE IN 30 DAYS." The corner has been chewed off.',
    v: 'A late-night cooking show is on mute. A man is very excited about butter.',
    o: 'The couch has a permanent Biscuit-shaped dent in the left cushion.',
    t: 'The dining table. Biscuit\'s favorite place to beg.',
    h: 'A dining chair. Biscuit\'s tooth marks are on one leg.',
    P: 'A fern. Somehow still alive.',
    M: () => (F().dogMissing ? 'Biscuit\'s bed is empty. His squeaky duck is waiting for him.' : 'Biscuit\'s bed. Covered in tan fur.'),
    l: 'A warm reading lamp.',
    n: 'Outside, the street is dark and quiet. The moon is out.',
    w: 'A photo from your wedding day. Puppy Biscuit is in the corner, chewing on Claire\'s veil.',
    G: 'Claire\'s vegetable garden. Biscuit is forbidden from entering. He has entered many times.',
    F: 'A wooden fence.',
    V: () => (Game.map.id === 'backyard' ? 'The fence. Biscuit has been eyeing it for years.' : null),
    X: null,
    x: 'The kitchen window. Warm light spills out onto the grass.',
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
  function door(id) {
    const f = F();
    switch (id) {
      case 'house_front':
        return run(() => { Sound.door(); return warp('street', 5, 6, 'down'); });
      case 'house_back':
        if (!f.cansDone) return run(() => say('Biscuit\'s out back doing his business. A dog deserves some privacy.'));
        if (!f.flashlight) return run(() => say('You: Claire might have let him back in already. I should ask her first.'));
        return run(() => { Sound.door(); return warp('backyard', 7, 9, 'up'); });
      case 'backyard_door':
        return run(() => { Sound.door(); return warp('house', 7, 2, 'down'); });
      case 'street_home':
        return run(() => { Sound.door(); return warp('house', 7, 8, 'up'); });
      case 'door_patel': return run(doorPatel);
      case 'door_kowalski': return run(doorKowalski);
      case 'door_nguyen': return run(doorNguyen);
      case 'door_abernathy': return run(doorAbernathy);
    }
  }

  function stepped(x) {
    if (Game.map.id === 'street' && x >= 45) {
      const f = F();
      const pending = (!f.holeFound && !f.parkEarly) || (f.holeFound && !f.parkClue && !f.parkDark) || (f.parkClue && !f.foundBiscuit && !f.parkWhimper);
      if (pending) run(enterPark);
    }
  }

  async function entered(id) {
    const f = F();
    if (id === 'street' && !f.sawStreet) {
      f.sawStreet = true;
      await say(['The night air is cool. Somewhere, crickets are going at it.', 'The trash cans are by the side gate, next to the driveway.']);
    }
    if (id === 'backyard' && !f.sawBackyard) {
      f.sawBackyard = true;
      await say(['The backyard is dark and still.', 'You: Biscuit? Biscuit!', '...', 'Nothing. Better sweep the flashlight around and look for anything out of place.']);
    }
    if (id === 'house' && f.foundBiscuit && !f.ending) await ending();
  }

  // ---------------------------------------------------------------------------
  // Dynamic lights / open doors
  // ---------------------------------------------------------------------------
  function dynamicLights() {
    const lights = [];
    if (Game.map.id !== 'street') return lights;
    if (openDoor) lights.push({ x: openDoor.x * TS + 8, y: openDoor.y * TS + 6, r: 46, i: 0.95, warm: true });
    if (F().kowalskiPorch) lights.push({ x: 23 * TS + 15, y: 4 * TS + 12, r: 34, i: 0.8, warm: true });
    return lights;
  }

  function openDoors() {
    return openDoor && Game.map.id === 'street' ? [openDoor] : [];
  }

  return { spawn, intro, door, examine, examineTile, stepped, entered, dynamicLights, openDoors };
})();
