// Shared tree-first entrance for personal results and the isolated demo.
export function postcardEntrance(dialog, scene) {
  let timer, pending = false;
  const language = document.getElementById('language-dialog');
  function begin() {
    if (!pending || timer !== undefined || language?.open || document.body.classList.contains('welcome-playing')) return;
    scene?.scrollIntoView({ behavior: 'instant', block: 'center' });
    document.body.classList.add('tree-moment');
    timer = setTimeout(() => {
      timer = undefined;
      document.body.classList.remove('tree-moment');
      // A visitor may open the language picker during the tree introduction.
      if (language?.open) return;
      pending = false;
      dialog.showModal();
    }, 2200);
  }
  language?.addEventListener('close', begin);
  window.addEventListener('welcome-finished', begin);
  return {
    play() { if (pending || dialog.open) return; pending = true; begin(); },
    cancel() { clearTimeout(timer); timer = undefined; pending = false; document.body.classList.remove('tree-moment'); if (dialog.open) dialog.close(); }
  };
}
