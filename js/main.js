'use strict';
// Boot: build sprites, show the title over a slow pan of the street, run the loop.

(function boot() {
  buildSprites();
  Game.player = makeEntity({ id: 'player', sprite: SPR.player, x: 5, y: 6, dir: 'down' });
  Game.entities = [Game.player];
  loadMap('street', 5, 6, 'down');
  Game.player.visible = false;
  Game.fade = 0;
  Game.fadeTarget = 0;

  const title = document.getElementById('title');
  let started = false;

  async function start() {
    if (started) return;
    started = true;
    Sound.init();
    Sound.select();
    await document.fonts.ready;
    Input.clear();
    await fadeTo(1, 2);
    title.classList.add('hidden');
    Game.mode = 'play';
    Game.player.visible = true;
    Sound.music('night');
    run(Story.intro);
  }

  title.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
  document.getElementById('restart').addEventListener('click', () => location.reload());

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (Game.mode === 'title' && Input.consume('start')) start();
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
