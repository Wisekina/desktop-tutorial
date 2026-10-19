// An original, quiet music-box waltz. Synthesized locally; no audio downloads.
export function setupMusic({ button, label, t }) {
  let context, master, timer, step = 0, next = 0, wanted = true, busy = false, mutedByUser = false;
  const melody = [76,null,79,78,76,74, 72,null,76,74,72,69, 71,null,74,76,74,71, 69,null,72,74,72,null,
    76,79,83,null,81,79, 78,null,76,74,76,72, 74,76,79,78,74,71, 72,null,76,74,72,null];
  const chords = [[60,64,67],[57,60,64],[55,59,62],[53,57,60],[60,64,67],[57,60,64],[55,59,62],[60,64,67]];
  const duration = 60 / 94 / 2;
  function render() {
    const playing = wanted && context?.state === 'running';
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', t(playing ? 'musicOff' : 'musicOn'));
    button.title = t(playing ? 'musicOff' : 'musicOn');
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
    wanted = false; clearInterval(timer); timer = undefined;
    const previous = context; context = null;
    render();
    if (previous && previous.state !== 'closed') await previous.close();
  }
  function syncPlayback(current) {
    if (context !== current) return;
    if (wanted && current.state === 'running' && !document.hidden) {
      if (timer === undefined) {
        next = current.currentTime+.06;
        schedule(); timer = setInterval(schedule,100);
      }
    } else { clearInterval(timer); timer = undefined; }
    render();
  }
  function failed(manual) {
    // A blocked automatic start is normal: a later trusted gesture retries it.
    if (!manual) return;
    stop().catch(() => {}).then(() => {
      button.title = t('musicUnavailable'); label.textContent = t('musicUnavailable');
    });
  }
  function start(manual = false) {
    if (!wanted || document.hidden) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Audio unavailable');
        context = new Audio(); master = context.createGain(); master.gain.value = .16; master.connect(context.destination);
        const current = context;
        current.addEventListener('statechange',() => syncPlayback(current));
        step = 0;
      }
      const current = context;
      // Do not await here: some browsers leave resume pending until a gesture.
      current.resume().then(() => syncPlayback(current)).catch(() => { if (context === current) failed(manual); });
      syncPlayback(current);
    } catch { failed(manual); }
  }
  function firstGesture(event) {
    if (event.target.closest?.('#music-toggle') || !wanted || context?.state === 'running') return;
    start();
  }
  document.addEventListener('click',firstGesture,{capture:true});
  document.addEventListener('keydown',firstGesture,{capture:true});
  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      if (wanted && context?.state === 'running') { mutedByUser = true; await stop(); }
      else {
        mutedByUser = false; wanted = true; start(true);
      }
    } catch {
      await stop().catch(() => {});
      button.title = t('musicUnavailable');
      label.textContent = t('musicUnavailable');
    } finally { busy = false; }
  });
  document.addEventListener('visibilitychange', async () => {
    if (!wanted || busy) return;
    try {
      if (document.hidden) await context?.suspend();
      else start();
    } catch { await stop().catch(() => {}); }
  });
  window.addEventListener('app-language',render);
  window.addEventListener('pagehide',() => { stop().catch(() => {}); });
  window.addEventListener('pageshow',event => { if (event.persisted && !mutedByUser) { wanted = true; start(); } });
  render(); start();
}
