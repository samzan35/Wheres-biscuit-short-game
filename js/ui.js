'use strict';
// DOM overlay UI: dialogue box with typewriter text, choices, objective HUD, toasts.

const SPEAKERS = {
  'You': { pitch: 0.9 },
  'Claire': { pitch: 1.25 },
  'Mrs. Patel': { pitch: 1.1 },
  'Mr. Kowalski': { pitch: 0.7 },
  'Mia': { pitch: 1.6 },
  'Mr. Abernathy': { pitch: 0.8 },
  'Biscuit': { pitch: 0.55 },
  '???': { pitch: 0.55 },
};

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const box = $('dialog'), nameEl = $('speaker'), textEl = $('text'), nextEl = $('next');
  const choicesEl = $('choices'), toastEl = $('toast');
  const hud = $('hud'), objEl = $('objective'), objText = $('objective-text'), clockEl = $('clock');

  let measure = null;
  let page = null; // { text, shown, resolve, pitch }
  let choice = null; // { options, index, resolve }

  function ensureMeasure() {
    if (measure) return;
    measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;visibility:hidden;left:0;top:0;pointer-events:none;word-wrap:break-word;';
    box.appendChild(measure);
  }

  // Split text into pages that fit the box.
  function paginate(text) {
    ensureMeasure();
    measure.style.width = textEl.clientWidth + 'px';
    const maxH = textEl.clientHeight + 1;
    const words = text.split(' ');
    const pages = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      measure.textContent = test;
      if (measure.scrollHeight > maxH && cur) {
        pages.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) pages.push(cur);
    return pages;
  }

  function parse(line) {
    const m = line.match(/^([A-Z?][A-Za-z.? ]*?): (.*)$/);
    if (m && SPEAKERS[m[1]]) return { speaker: m[1], text: m[2] };
    return { speaker: null, text: line };
  }

  function showPage(speaker, text) {
    return new Promise((resolve) => {
      box.classList.remove('hidden');
      if (speaker) { nameEl.textContent = speaker; nameEl.classList.remove('hidden'); }
      else nameEl.classList.add('hidden');
      textEl.textContent = '';
      nextEl.classList.remove('show');
      page = { text, shown: 0, acc: 0, resolve, pitch: speaker ? SPEAKERS[speaker].pitch : 1, narr: !speaker };
    });
  }

  async function say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    for (const line of lines) {
      const { speaker, text } = parse(line);
      box.classList.remove('hidden');
      if (speaker) nameEl.classList.remove('hidden'); else nameEl.classList.add('hidden');
      const pages = paginate(text);
      for (const p of pages) await showPage(speaker, p);
    }
    box.classList.add('hidden');
  }

  function choose(options) {
    return new Promise((resolve) => {
      choice = { options, index: 0, resolve };
      renderChoices();
      choicesEl.classList.remove('hidden');
    });
  }

  function renderChoices() {
    choicesEl.innerHTML = '';
    choice.options.forEach((o, i) => {
      const d = document.createElement('div');
      d.textContent = o;
      if (i === choice.index) d.className = 'sel';
      d.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!choice) return;
        choice.index = i;
        finishChoice();
      });
      choicesEl.appendChild(d);
    });
  }

  function finishChoice() {
    const c = choice;
    choice = null;
    choicesEl.classList.add('hidden');
    Sound.select();
    c.resolve(c.index);
  }

  function update(dt) {
    if (choice) {
      if (Input.consumeDir('up')) { choice.index = (choice.index + choice.options.length - 1) % choice.options.length; Sound.click(); renderChoices(); }
      if (Input.consumeDir('down')) { choice.index = (choice.index + 1) % choice.options.length; Sound.click(); renderChoices(); }
      if (Input.consume('a')) finishChoice();
      Input.consume('b');
      return;
    }
    if (!page) return;
    const speed = Input.held.b || Input.held.a ? 90 : 42;
    if (page.shown < page.text.length) {
      page.acc += dt * speed;
      let advanced = false;
      while (page.acc >= 1 && page.shown < page.text.length) {
        page.acc -= 1;
        page.shown++;
        advanced = true;
      }
      if (advanced) {
        textEl.textContent = page.text.slice(0, page.shown);
        if (page.shown % 2 === 0 && page.text[page.shown - 1] !== ' ') Sound.blip(page.narr ? 0.8 : page.pitch);
      }
      if (Input.consume('a') || Input.consume('b')) {
        page.shown = page.text.length;
        textEl.textContent = page.text;
      }
      if (page.shown >= page.text.length) nextEl.classList.add('show');
    } else if (Input.consume('a') || Input.consume('b')) {
      const p = page;
      page = null;
      nextEl.classList.remove('show');
      p.resolve();
    }
  }

  function setObjective(text) {
    hud.classList.remove('hidden');
    if (objText.textContent === text) return;
    objText.textContent = text;
    objEl.classList.remove('flash');
    void objEl.offsetWidth;
    objEl.classList.add('flash');
  }

  function setClock(text) { clockEl.textContent = text; }

  function toast(text, ms = 1800) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    return new Promise((r) => setTimeout(() => { toastEl.classList.add('hidden'); r(); }, ms));
  }

  return {
    say,
    choose,
    update,
    setObjective,
    setClock,
    toast,
    showHud(v) { hud.classList.toggle('hidden', !v); },
    get active() { return !!page || !!choice; },
  };
})();
