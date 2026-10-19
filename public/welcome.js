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
    clearTimers(); stage = 'scene';
    prologue.hidden = true; main.inert = false;
    document.body.classList.remove('prologue-playing');
    document.body.classList.add('welcome-scene');
    later(finish,3600);
  }
  function start() {
    if (started || language?.open) return;
    started = true;
    if (motion.matches) return;
    stage = 'prologue'; prologue.hidden = false; main.inert = true;
    document.body.classList.add('welcome-playing','prologue-playing');
    later(() => prologue.classList.add('prologue-leaving'),3300);
    later(showScene,4200);
  }
  document.getElementById('skip-welcome').addEventListener('click',() => {
    showScene(); main.focus({preventScroll:true});
  });
  language?.addEventListener('close', start);
  motion.addEventListener('change', () => { if (motion.matches && stage !== 'idle' && stage !== 'finished') finish(); });
  start();
}
