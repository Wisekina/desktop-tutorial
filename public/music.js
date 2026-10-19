// An original, quiet music-box waltz. Synthesized locally; no audio downloads.
export function setupMusic({ button, label, t }) {
  let context, master, timer, step = 0, next = 0, wanted = false, busy = false;
  const melody = [76,null,79,78,76,74, 72,null,76,74,72,69, 71,null,74,76,74,71, 69,null,72,74,72,null,
    76,79,83,null,81,79, 78,null,76,74,76,72, 74,76,79,78,74,71, 72,null,76,74,72,null];
  const chords = [[60,64,67],[57,60,64],[55,59,62],[53,57,60],[60,64,67],[57,60,64],[55,59,62],[60,64,67]];
  const duration = 60 / 94 / 2;
  function render() {
    button.setAttribute('aria-pressed', String(wanted));
    button.setAttribute('aria-label', t(wanted ? 'musicOff' : 'musicOn'));
    button.title = t(wanted ? 'musicOff' : 'musicOn');
    label.textContent = t('musicLabel');
  }
  function note(midi, when, length, volume, bell = false) {
    const gain = context.createGain(); gain.connect(master);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, when + length);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (const harmonic of bell ? [1, 2] : [1]) {
      const oscillator = context.createOscillator();
      const level = context.createGain(); level.gain.value = harmonic === 1 ? 1 : .12;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency * harmonic;
      oscillator.connect(level); level.connect(gain);
      oscillator.start(when); oscillator.stop(when + length + .03);
      oscillator.onended = () => { oscillator.disconnect(); level.disconnect(); };
    }
    // One short-lived gain per note; disconnect it after the scheduled tail.
    setTimeout(() => gain.disconnect(), Math.max(0, when-context.currentTime+length+.1)*1000);
  }
  function schedule() {
    if (!wanted || context?.state !== 'running') return;
    while (next < context.currentTime + .3) {
      const index = step % melody.length;
      if (melody[index] !== null) note(melody[index],next,1.25,.23,true);
      const chord = chords[Math.floor(index/6)];
      if (index % 6 === 0) note(chord[0]-12,next,1.7,.2);
      if (index % 2 === 0) note(chord[(index%6)/2],next,1.1,.08);
      next += duration; step++;
    }
  }
  async function stop() {
    wanted = false; clearInterval(timer); render();
    const previous = context; context = null;
    if (previous && previous.state !== 'closed') await previous.close();
  }
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      if (wanted) await stop();
      else {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Audio unavailable');
        context = new Audio(); master = context.createGain(); master.gain.value = .16; master.connect(context.destination);
        await context.resume(); wanted = true; step = 0; next = context.currentTime+.06;
        render(); schedule(); timer = setInterval(schedule,100);
      }
    } catch {
      await stop().catch(() => {});
      button.title = t('musicUnavailable');
      label.textContent = t('musicUnavailable');
    } finally { busy = false; }
  });
  document.addEventListener('visibilitychange', async () => {
    if (!wanted || !context || busy) return;
    try {
      if (document.hidden) await context.suspend();
      else { await context.resume(); next = context.currentTime+.06; schedule(); }
    } catch { await stop().catch(() => {}); }
  });
  window.addEventListener('app-language',render);
  window.addEventListener('pagehide',() => { stop().catch(() => {}); });
  render();
}
