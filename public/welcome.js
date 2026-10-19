// Play once per visit, after the first language choice. The page stays usable.
export function welcomeEntrance() {
  const language = document.getElementById('language-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let started = false, timer;
  function finish() {
    clearTimeout(timer);
    document.body.classList.remove('welcome-playing');
    window.dispatchEvent(new Event('welcome-finished'));
  }
  function start() {
    if (started || language?.open) return;
    started = true;
    if (motion.matches) return;
    document.body.classList.add('welcome-playing');
    timer = setTimeout(finish, 1900);
  }
  language?.addEventListener('close', start);
  motion.addEventListener('change', () => { if (motion.matches) finish(); });
  start();
}
