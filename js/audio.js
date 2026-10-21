'use strict';
// Tiny WebAudio synth: sound effects plus a soft looping night theme.

const Sound = (() => {
  let ac = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.55;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      ac = null;
    }
  }

  function tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, attack = 0.005 } = {}) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, { vol = 0.2, delay = 0, freq = 1000, type = 'lowpass' } = {}) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---- Music: a slow arpeggio loop scheduled ahead of time ----
  const THEMES = {
    night: {
      bpm: 76,
      chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      melody: [76, null, 74, 72, null, 69, null, null, 72, null, 71, 67, null, null, 69, null],
      wave: 'triangle',
    },
    home: {
      bpm: 84,
      chords: [[48, 52, 55], [53, 57, 60], [57, 60, 64], [55, 59, 62]],
      melody: [72, 74, 76, null, 79, null, 76, null, 77, 76, 74, null, 72, null, null, null],
      wave: 'triangle',
    },
  };
  let theme = null;
  let step = 0;
  let nextTime = 0;
  let timer = null;
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function schedule() {
    if (!ac || !theme) return;
    const spb = 60 / theme.bpm / 2; // eighth notes
    while (nextTime < ac.currentTime + 0.3) {
      const delay = nextTime - ac.currentTime;
      const chord = theme.chords[Math.floor(step / 8) % theme.chords.length];
      const note = chord[step % 3];
      tone(midi(note), spb * 1.8, { type: theme.wave, vol: 0.035, delay: Math.max(0, delay), attack: 0.02 });
      if (step % 8 === 0) tone(midi(chord[0] - 12), spb * 7, { type: 'sine', vol: 0.05, delay: Math.max(0, delay), attack: 0.05 });
      const m = theme.melody[step % theme.melody.length];
      if (m && Math.floor(step / 16) % 2 === 1) {
        tone(midi(m), spb * 2.5, { type: 'sine', vol: 0.04, delay: Math.max(0, delay), attack: 0.03 });
      }
      step++;
      nextTime += spb;
    }
  }

  function music(name) {
    if (timer) { clearInterval(timer); timer = null; }
    theme = THEMES[name] || null;
    if (!ac || !theme) return;
    step = 0;
    nextTime = ac.currentTime + 0.1;
    timer = setInterval(schedule, 100);
  }

  return {
    init,
    music,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    blip(pitch = 1) { tone(480 * pitch, 0.035, { vol: 0.045 }); },
    select() { tone(880, 0.05, { vol: 0.06 }); },
    bump() { tone(80, 0.07, { vol: 0.08 }); },
    knock(loud = false) {
      const n = loud ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const d = i * (loud ? 0.17 : 0.24);
        tone(loud ? 170 : 140, 0.13, { type: 'sine', vol: loud ? 0.9 : 0.6, slide: -70, delay: d });
        noise(0.05, { vol: loud ? 0.4 : 0.25, delay: d, freq: 700 });
      }
    },
    door() {
      tone(260, 0.4, { type: 'sawtooth', vol: 0.035, slide: 180 });
      noise(0.12, { vol: 0.12, freq: 500, delay: 0.35 });
    },
    bark() {
      [0, 0.2].forEach((d) => {
        tone(640, 0.1, { type: 'square', vol: 0.12, slide: -320, delay: d });
        noise(0.07, { vol: 0.1, delay: d, freq: 2200 });
      });
    },
    whimper() {
      tone(900, 0.45, { type: 'sine', vol: 0.08, slide: 450 });
      tone(1250, 0.35, { type: 'sine', vol: 0.06, slide: -450, delay: 0.5 });
    },
    mew() { tone(1100, 0.3, { type: 'triangle', vol: 0.07, slide: 600 }); },
    rumble() {
      noise(1.0, { vol: 0.25, freq: 260 });
      for (let i = 0; i < 6; i++) tone(70 + Math.random() * 40, 0.06, { vol: 0.06, delay: i * 0.15 });
    },
    item() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { vol: 0.07, delay: i * 0.1 }));
    },
    whistle() {
      tone(1500, 0.25, { type: 'sine', vol: 0.09, slide: 600 });
      tone(2100, 0.35, { type: 'sine', vol: 0.09, slide: -900, delay: 0.3 });
    },
    jingle() {
      for (let i = 0; i < 4; i++) tone(2400 + Math.random() * 600, 0.06, { type: 'triangle', vol: 0.04, delay: i * 0.06 });
    },
    cricket() {
      const f = 4200 + Math.random() * 500;
      for (let i = 0; i < 3; i++) tone(f, 0.03, { type: 'sine', vol: 0.012, delay: i * 0.05 });
    },
    click() { tone(1800, 0.02, { vol: 0.05 }); },
  };
})();
