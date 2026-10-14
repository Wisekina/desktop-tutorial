// Shared tree-first entrance for personal results and the isolated demo.
export function postcardEntrance(dialog, scene) {
  let timer, pending = false;
  const language = document.getElementById('language-dialog');
  function begin() {
    if (!pending || language?.open) return;
    scene?.scrollIntoView({ behavior: 'instant', block: 'center' });
    document.body.classList.add('tree-moment');
    timer = setTimeout(() => {
      document.body.classList.remove('tree-moment');
      // A visitor may open the language picker during the tree introduction.
      if (language?.open) return;
      pending = false;
      dialog.showModal();
    }, 2200);
  }
  language?.addEventListener('close', begin);
  return {
    play() { if (pending || dialog.open) return; pending = true; begin(); },
    cancel() { clearTimeout(timer); pending = false; document.body.classList.remove('tree-moment'); if (dialog.open) dialog.close(); }
  };
}
