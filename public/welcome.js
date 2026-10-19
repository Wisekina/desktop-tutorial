// A short wish, then the tree, then the presents. Play once after language choice.
export function welcomeEntrance() {
  const language = document.getElementById('language-dialog');
  const prologue = document.getElementById('welcome-prologue');
  const main = document.querySelector('main');
  const guide = document.getElementById('welcome-guide');
  const footer = document.querySelector('footer');
  if (!prologue || !main) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let started = false, stage = 'idle', timers = [], guideReturnsToMain = false;
  const later = (fn, delay) => timers.push(setTimeout(fn,delay));
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function finish() {
    clearTimers(); stage = 'finished';
    prologue.hidden = true; if (guide) guide.hidden = true;
    main.inert = false; if (footer) footer.inert = false;
    document.body.classList.remove('welcome-playing','prologue-playing','welcome-scene');
    window.dispatchEvent(new Event('welcome-finished'));
  }
  function showScene() {
    if (stage !== 'prologue') return;
    if (motion.matches) { finish(); return; }
    clearTimers(); stage = 'scene';
    prologue.hidden = true; main.inert = false; if (footer) footer.inert = false;
    document.body.classList.remove('prologue-playing');
    document.body.classList.add('welcome-scene');
    later(finish,3600);
  }
  function start() {
    if (started || language?.open || document.hidden) return;
    started = true;
    if (guide) showGuide(false);
    else showWish();
  }
  function prepareOverlay() {
    clearTimers(); main.inert = true; if (footer) footer.inert = true;
    window.scrollTo({top:0,behavior:'instant'});
    document.body.classList.remove('welcome-scene');
    document.body.classList.add('welcome-playing','prologue-playing');
  }
  function showGuide(returnToMain) {
    prepareOverlay(); stage = 'guide'; guideReturnsToMain = returnToMain;
    prologue.hidden = true; guide.hidden = false;
    guide.querySelector('h2').focus({preventScroll:true});
  }
  function showWish() {
    prepareOverlay(); if (guide) guide.hidden = true;
    prologue.classList.remove('prologue-leaving');
    stage = 'prologue'; prologue.hidden = false;
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
  document.getElementById('continue-guide')?.addEventListener('click',() => {
    if (stage !== 'guide') return;
    if (guideReturnsToMain) { finish(); main.focus({preventScroll:true}); }
    else showWish();
  });
  document.getElementById('open-guide')?.addEventListener('click',() => {
    if (stage === 'finished' && guide) showGuide(true);
  });
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
    showWish();
  });
  start();
}
