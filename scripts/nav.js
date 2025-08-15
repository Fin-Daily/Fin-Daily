// scripts/nav.js
(function(){
  const btn = document.getElementById('hamburger');
  const drawer = document.getElementById('mobile-nav');
  const scrim = document.getElementById('scrim');
  if(!btn || !drawer || !scrim) return;

  function open(){
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
    btn.setAttribute('aria-expanded','true');
    scrim.setAttribute('aria-hidden','false');
    // フォーカス移動（アクセシビリティ）
    drawer.querySelector('a')?.focus();
    // スクロールロック
    document.documentElement.style.overflow = 'hidden';
  }
  function close(){
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
    btn.setAttribute('aria-expanded','false');
    scrim.setAttribute('aria-hidden','true');
    btn.focus();
    document.documentElement.style.overflow = '';
  }

  btn.addEventListener('click', ()=>{
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? close() : open();
  });
  scrim.addEventListener('click', close);
  // ESCキーで閉じる
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });

  // リンククリックで閉じる
  drawer.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if(a) close();
  });
})();
