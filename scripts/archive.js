// scripts/archive.js
(function () {
  // ===== BASE算出（サブパス対応）=====
  const here = new URL(location.href);
  const path = here.pathname.endsWith('/')
    ? here.pathname.slice(0, -1)
    : here.pathname.replace(/\/[^/]*$/, '');
  const BASE = `${here.origin}${path || ''}`;
  const INDEX_URL = `${BASE}/data/index.json`;

  // ===== DOM =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const qEl = $('#q');
  const fromEl = $('#from');
  const toEl = $('#to');
  const tagbar = $('#tagbar');
  const listEl = $('#list');
  const moreBtn = $('#more');
  const pagerEl = $('#pager');

  // ===== State =====
  let all = [];           // 全件
  let filtered = [];      // 絞り込み後
  let page = 0;
  const PAGE_SIZE = 20;
  let activeTag = null;

  // ===== Helpers =====
  const fdate = (s) => {
    try { return new Date(s).toLocaleDateString('ja-JP'); }
    catch { return s || ''; }
  };
  const monthKey = (s) => {
    const d = new Date(s);
    if (isNaN(d)) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  };
  const slugUrl = (slug) => `${BASE}/article.html?slug=${encodeURIComponent(slug)}`;

  function normalize(items){
    // 期待フィールドが欠けていても落ちないよう保護
    return items.map(x => ({
      slug: x.slug,
      title: x.title || `Fin Daily ${x.slug || ''}`,
      published_at: x.published_at || '',
      type: x.type || '',
      tags: Array.isArray(x.tags) ? x.tags : []
    })).filter(x => !!x.slug);
  }

  function buildTags(items){
    const set = new Set();
    items.forEach(it => (it.tags||[]).forEach(t => set.add(t)));
    const tags = Array.from(set).sort((a,b)=> a.localeCompare(b,'ja'));
    tagbar.innerHTML = [
      `<button class="btn" data-tag="" aria-pressed="${activeTag? 'false':'true'}">すべて</button>`,
      ...tags.map(t => `<button class="btn" data-tag="${t}" aria-pressed="${activeTag===t? 'true':'false'}">${t}</button>`)
    ].join('');
    // クリックで切替
    tagbar.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        activeTag = btn.dataset.tag || null;
        tagbar.querySelectorAll('button').forEach(b=> b.setAttribute('aria-pressed','false'));
        btn.setAttribute('aria-pressed','true');
        applyFilters();
      });
    });
  }

  function applyFilters(){
    const q = (qEl?.value || '').trim().toLowerCase();
    const from = fromEl?.value ? new Date(fromEl.value) : null;
    const to = toEl?.value ? new Date(toEl.value) : null;

    filtered = all.filter(it => {
      // 日付
      const d = it.published_at ? new Date(it.published_at) : null;
      if (from && d && d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) return false;
      if (to && d && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)) return false;

      // タグ
      if (activeTag && !(it.tags||[]).includes(activeTag)) return false;

      // キーワード（タイトル/タグ）
      if (q) {
        const hay = `${it.title} ${(it.tags||[]).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // 降順
    filtered.sort((a,b)=> new Date(b.published_at) - new Date(a.published_at));

    // ページング初期化
    page = 0;
    renderPage(true);
  }

  function renderPage(reset=false){
    if (reset) listEl.innerHTML = '';
    const start = page * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    // 月ごとにまとまるよう、直前の月を覚えて見出しを挿む
    let lastMonth = listEl.getAttribute('data-last-month') || '';
    slice.forEach(it=>{
      const mk = monthKey(it.published_at);
      if (mk !== lastMonth) {
        const [y,m] = mk.split('-');
        const h = document.createElement('h3');
        h.className = 'section-title';
        h.style.margin = '18px 0 8px';
        h.textContent = (y && m) ? `${y}年 ${m}月` : '日付不明';
        listEl.appendChild(h);
        lastMonth = mk;
        listEl.setAttribute('data-last-month', mk);
      }

      const a = document.createElement('a');
      a.href = slugUrl(it.slug);
      a.className = 'card';
      a.style.display = 'grid';
      a.style.gridTemplateColumns = '1fr auto';
      a.style.alignItems = 'center';
      a.style.gap = '12px';
      a.style.margin = '6px 0';
      a.style.padding = '12px 14px';
      a.style.border = '1px solid var(--border)';
      a.style.borderRadius = '12px';
      a.style.background = '#121722';

      const t = document.createElement('div');
      t.className = 'title';
      t.textContent = it.title;

      const d = document.createElement('div');
      d.className = 'date';
      d.textContent = fdate(it.published_at);
      d.style.color = 'var(--muted)';

      a.appendChild(t);
      a.appendChild(d);
      listEl.appendChild(a);
    });

    page++;
    // もっと見るの表示切替
    const hasMore = start + PAGE_SIZE < filtered.length;
    pagerEl.style.display = hasMore ? 'flex' : 'none';

    // 件数ゼロのとき
    if (filtered.length === 0) {
      listEl.innerHTML = `<p style="color:var(--muted);">該当する記事がありません。</p>`;
      pagerEl.style.display = 'none';
      listEl.removeAttribute('data-last-month');
    }
  }

  function attachEvents(){
    qEl?.addEventListener('input', debounce(applyFilters, 200));
    fromEl?.addEventListener('change', applyFilters);
    toEl?.addEventListener('change', applyFilters);
    $('#clear')?.addEventListener('click', ()=>{
      if (qEl) qEl.value = '';
      if (fromEl) fromEl.value = '';
      if (toEl) toEl.value = '';
      activeTag = null;
      applyFilters();
      buildTags(all); // すべてに戻す→ボタンのaria状態更新
    });
    moreBtn?.addEventListener('click', ()=> renderPage(false));
  }

  function debounce(fn, ms){
    let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
  }

  // ===== Boot =====
  (async function init(){
    attachEvents();
    try{
      const res = await fetch(INDEX_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (!Array.isArray(list) || list.length === 0) {
        listEl.innerHTML = `<p style="color:crimson;">index.json が空、または配列ではありません。</p>`;
        pagerEl.style.display = 'none';
        return;
      }
      all = normalize(list);
      // タグバー作成
      buildTags(all);
      // 初回描画
      applyFilters();
    }catch(e){
      console.error(e);
      listEl.innerHTML = `<pre style="white-space:pre-wrap;color:crimson;">アーカイブ読み込み失敗: ${e && e.message ? e.message : e}\nURL: ${INDEX_URL}</pre>`;
      pagerEl.style.display = 'none';
    }
  })();
})();
