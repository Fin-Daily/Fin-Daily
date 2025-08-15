// scripts/index.js
(async function () {
  // ===== BASEを実行時に算出（サブパス配下でもOK）=====
  // 例: https://fin-daily.github.io/Fin-Daily/index.html → BASE = https://fin-daily.github.io/Fin-Daily
  const here = new URL(location.href);
  const path = here.pathname.endsWith("/")
    ? here.pathname.slice(0, -1)
    : here.pathname.replace(/\/[^/]*$/, "");
  const BASE = `${here.origin}${path || ""}`;

  const INDEX_URL = `${BASE}/data/index.json`;
  const $ = (s) => document.querySelector(s);

  // 画面表示のフォールバック
  const latestContainer = $("#latest");
  const goBtn = $("#go-latest");
  function showError(msg) {
    if (latestContainer) {
      latestContainer.innerHTML = `<p style="color:crimson;">${msg}</p>`;
    }
  }
  function formatDate(s) {
    try { return new Date(s).toLocaleDateString("ja-JP"); }
    catch { return s || ""; }
  }

  try {
    const res = await fetch(INDEX_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`index.json: HTTP ${res.status}`);
    const list = await res.json();

    if (!Array.isArray(list) || list.length === 0) {
      showError("最新記事が見つかりません");
      return;
    }

    // published_at の降順（欠損は後ろへ）
    list.sort((a, b) => {
      const da = a?.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b?.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    const latest = list.find(x => x?.slug) || list[0];
    const slug = latest.slug;
    const latestUrl = `${BASE}/article.html?slug=${encodeURIComponent(slug)}`;

    // 1) ヒーローCTAを最新記事へ
    if (goBtn) goBtn.href = latestUrl;

    // 2) 最新カードを描画
    if (latestContainer) {
      const title = latest.title || `Fin Daily ${slug}`;
      const date = formatDate(latest.published_at);
      latestContainer.innerHTML = `
        <a class="card" href="${latestUrl}" aria-label="最新記事 ${title}">
          <div class="title">${title}</div>
          <div class="date">${date}</div>
        </a>
      `;
    }

    // 3) 追加の“最新記事へ”リンクが他にもあれば一括差し替え（任意）
    document.querySelectorAll('a.go-latest, [data-go-latest="1"]').forEach(a => {
      a.setAttribute("href", latestUrl);
    });

  } catch (err) {
    console.error(err);
    showError("最新記事の読み込みに失敗しました");
  }
})();
