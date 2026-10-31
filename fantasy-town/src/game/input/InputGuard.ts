/** DOM text entry and native app focus must never leave world movement held. */
export function installInputGuard(root:HTMLElement) {
  let blocked:boolean|undefined;
  const update = () => {
    const active = document.activeElement;
    // Hidden form controls otherwise keep receiving I/C/E after closing a window.
    if(active instanceof HTMLElement && root.contains(active) && active.getClientRects().length===0)active.blur();
    const editing = active instanceof HTMLElement && active.matches('input,textarea,select,[contenteditable="true"]')
      && active.getClientRects().length > 0;
    const modalOpen = !!root.querySelector('.modal-backdrop:not([hidden]),.item-window:not([hidden]),.craft-window:not([hidden]),.market-window:not([hidden])');
    const next = document.hidden || !document.hasFocus() || editing || modalOpen;
    if (next !== blocked) {
      blocked = next;
      window.dispatchEvent(new CustomEvent('town-input-focus', {detail:next}));
      if (next) window.dispatchEvent(new Event('town-input-reset'));
    }
  };
  root.addEventListener('focusin', update);
  root.addEventListener('focusout', () => queueMicrotask(update));
  window.addEventListener('blur', update);
  window.addEventListener('focus', update);
  document.addEventListener('visibilitychange', update);
  new MutationObserver(update).observe(root, {subtree:true, attributes:true, attributeFilter:['hidden']});
  // Scene listeners are installed later than the DOM interface.
  window.addEventListener('town-ready', () => { blocked=undefined; update(); });
}
