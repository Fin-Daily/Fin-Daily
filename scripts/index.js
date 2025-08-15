// scripts/index.js
(async function () {
  // ===== 1) BASE を頑丈に決定 =====
  // 優先: 明示オーバーライド → script src から推定 → location から推定
  const override = window.__FIN_BASE; // 例: window.__FIN_BASE = "https://fin-daily.github.io/Fin-Daily"
  function baseFromScript() {
    // 現在ロード中の <script> から /Fin-Daily を含むベースを切り出す
    const scripts = document.getElementsByTagName('script');
    const cur = document.currentScript || scripts[scripts.length - 1];
    const src = cur && cur.src ? new URL(cur.src) : null;
    if (!src) return null;
    // /scripts/index.js → ベース = .../Fin-Daily
    return src.origin + src.pathname.replace(/\/scripts\/[^/]+$/, '');
  }
  function baseFromLocation() {
    const u = new URL(location.href);
    // 末尾が / のときはそのまま、index.html のときはファイル名を除去
    const path = u.pathname.endsWith('/')
      ? u.pathname.slice(0, -1)
      : u.pathname.replace(/\/[^/]*$/, '');
    return u.origin + (path || '');
  }
  const BASE = override || baseFromScript() || baseFromLocation();

  // ===== 2) index.json の場所 =====
  const INDEX_URL = `${BASE}/data/index.json`;

  // ===== 3) DOM 助手 =====
  const $ = (s) => document.querySelector(s);
  const latestEl = $("#latest");
  const goBtn = $("#go-latest");

  function showError(msg, detail) {
    console.error("[FinDaily:index.js]", msg, detail || "");
    if (latestEl) {
      latestEl.innerHTML =
        `<pre style="white-space:pre-wrap;color:crimson;border:1px solid rgba(220,20,60,.35);padding:10px;border-radius:8px;background:rgba(220,20,60,.06);">
最新記事の読み込みに失敗しました。
${msg}${detail ? "\n" + detail : ""}
INDEX_URL: ${INDEX_URL}
BASE: ${BASE}
</pre>`;
    }
  }
  function formatDate(s) {
    try { return new Date(s).toLocaleDateString("ja-JP"); }
    catch { return s || ""; }
  }

  // ===== 4) 取得 → パース（配列/オブジェクトどちらも許容）=====
  let list;
  try {
    const res = await fetch(INDEX_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray(data.items)) {
      // 万一 { items:[...] } 形式だった場合も拾う
      list = data.items;
    } else {
      throw new Error("index.json が配列ではありません（配列 or {items:[]} を想定）");
    }
    if (list.length === 0) throw new Error("index.json が空です");
  } catch (e) {
    showError("index.json の取得/解析に失敗しました。", e && e.message);
    return;
  }

  // ===== 5) 最新判定（published_at 降順、欠損は後方）=====
  list.sort((a, b) => {
    const da = a?.published_at ? Date.parse(a.published_at) : 0;
    const db = b?.published_at ? Date.parse(b.published_at) : 0;
    return isNaN(db - da) ? 0 : (db - da);
  });
  const latest = list.find(x => x && x.slug) || list[0];
  if (!latest || !latest.slug) {
    showError("index.json に slug がありません。", JSON.stringify(latest, null, 2));
    return;
  }

  const latestUrl = `${BASE}/article.html?slug=${encodeURIComponent(latest.slug)}`;
  const title = latest.title || `Fin Daily ${latest.slug}`;
  const date = formatDate(latest.published_at);

  // ===== 6) ヒーローCTAを更新 =====
  if (goBtn) goBtn.href = latestUrl;

  // ===== 7) 最新カードを描画 =====
  if (latestEl) {
    latestEl.innerHTML = `
      <a class="card" href="${latestUrl}" aria-label="最新記事 ${title}">
        <div class="title">${title}</div>
        <div class="date">${date}</div>
      </a>
    `;
  }

  // ===== 8) 他にも “最新へ” を一括差し替えしたい場合（任意）=====
  document.querySelectorAll('a.go-latest, [data-go-latest="1"]').forEach(a => {
    a.setAttribute("href", latestUrl);
  });
})();
