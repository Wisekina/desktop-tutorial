// A short wish, then the tree, then the presents. Play once after language choice.
export function welcomeEntrance() {
  const language = document.getElementById('language-dialog');
  const prologue = document.getElementById('welcome-prologue');
  const main = document.querySelector('main');
  if (!prologue || !main) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let started = false, stage = 'idle', timers = [];
  const later = (fn, delay) => timers.push(setTimeout(fn,delay));
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function finish() {
    clearTimers(); stage = 'finished';
    prologue.hidden = true; main.inert = false;
    document.body.classList.remove('welcome-playing','prologue-playing','welcome-scene');
    window.dispatchEvent(new Event('welcome-finished'));
  }
  function showScene() {
    if (stage !== 'prologue') return;
    if (motion.matches) { finish(); return; }
    clearTimers(); stage = 'scene';
    prologue.hidden = true; main.inert = false;
    document.body.classList.remove('prologue-playing');
    document.body.classList.add('welcome-scene');
    later(finish,3600);
  }
  function start() {
    if (started || language?.open || document.hidden) return;
    started = true;
    prologue.classList.remove('prologue-leaving');
    stage = 'prologue'; prologue.hidden = false; main.inert = true;
    window.scrollTo({top:0,behavior:'instant'});
    document.body.classList.add('welcome-playing','prologue-playing');
    schedulePrologue();
  }
  function schedulePrologue() {
    clearTimers();
    later(() => prologue.classList.add('prologue-leaving'),5000);
    later(showScene,6000);
  }
  document.getElementById('skip-welcome').addEventListener('click',() => {
    showScene(); main.focus({preventScroll:true});
  });
  language?.addEventListener('close', start);
  // The wish remains readable when motion is reduced or the tab was in back.
  motion.addEventListener('change', () => { if (motion.matches && stage === 'scene') finish(); });
  document.addEventListener('visibilitychange',() => {
    if (stage === 'prologue') {
      clearTimers(); prologue.classList.remove('prologue-leaving');
      if (!document.hidden) schedulePrologue();
    } else if (!document.hidden) start();
  });
  document.getElementById('replay-welcome')?.addEventListener('click',() => {
    if (stage !== 'finished') return;
    started = false; start();
  });
  start();
}
