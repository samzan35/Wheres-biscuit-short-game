# Where's Biscuit?

A short, narrative top-down pixel game in the style of the old handheld RPGs.

It's late on a Monday night. Your dog Biscuit goes out back to do his business, and your wife
Claire asks you to roll the trash cans out to the curb. When you finish, you realize Biscuit
never barked at the cans. He's gone.

## Play

Open `index.html` in a browser. There's no build step and there are no dependencies. Everything
is plain JavaScript, and all the art and sound is generated in code.

To serve it locally instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

| Action             | Keyboard                    | Touch     |
| ------------------ | --------------------------- | --------- |
| Move               | Arrow keys / WASD           | D-pad     |
| Talk / interact    | Z, Space, Enter or E        | A         |
| Run / fast text    | Hold X or Shift             | Hold B    |
| Mute               | M                           |           |

## Story beats

1. **Intro:** Biscuit heads out the back door, and Claire asks you to take the cans out.
2. **Front yard:** wheel both cans from the side gate down to the curb.
3. **Something's wrong:** Biscuit always barks at the cans. You peek over the gate and the yard is empty.
4. **Inside:** tell Claire. She gives you the flashlight.
5. **Backyard:** search with the flashlight until you find the hole dug under the fence.
6. **Maple Lane:** knock on the neighbors' doors. Each one gives you a clue:
   - **Mrs. Patel**, a kind night owl, heard his collar jingle past heading east.
   - **Mr. Kowalski** is grumpy, and his tulips got trampled.
   - **Mia** is a kid who's supposed to be asleep. She saw him run to the park.
   - **Mr. Abernathy** is hard of hearing, so knock three times. He heard yipping by the drainage pipe.
7. **The park:** follow the path to the culvert and find out why Biscuit really ran off.
8. **Home:** bring him back to Claire.

## Project layout

```
index.html        page shell, HUD and dialogue overlay
css/style.css     layout, dialogue box, touch controls
js/audio.js       WebAudio sound effects + soft looping music
js/art.js         procedural pixel art: tiles, furniture, houses, props, emote bubbles
js/sprites.js     character/dog/kitten sprites from text templates
js/maps.js        tile legend + the house, street and backyard maps
js/ui.js          typewriter dialogue, choices, objective HUD
js/engine.js      input, grid movement, collision, camera, lighting, cutscene helpers
js/story.js       all dialogue, cutscenes, quest flags and examine text
js/main.js        boot + title screen + game loop
```

### Editing the story

All the writing lives in `js/story.js`. Cutscenes are just `async` functions:

```js
await say(['Claire: Sounds like somebody needs to go out.', 'Narration has no speaker prefix.']);
await walk(dog, 'RRRUU', 6);          // scripted movement: U/D/L/R
await emote(claire, '!', 0.8);        // '!', '?', '...', 'heart', 'note'
const pick = await choose(['On it.', 'Do I have to?']);
objective('Take the trash cans out to the curb.');
```

Speaker names must be listed in `SPEAKERS` in `js/ui.js`. Maps are character grids in `js/maps.js`
(see `TILES` for the legend). Props and doors are listed per map and get their text from `PROP_TEXT` and
`door()` in `story.js`.
