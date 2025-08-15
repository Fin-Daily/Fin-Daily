// scripts/index.js
(async function(){
  const BASE = "https://fin-daily.github.io/Fin-Daily";
  const INDEX_URL = `${BASE}/data/index.json`;

  try {
    const res = await fetch(INDEX_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (!Array.isArray(list) || list.length === 0) {
      console.warn("index.json が空です");
      return;
    }

    // 最新記事（published_at降順）
    list.sort((a,b) => new Date(b.published_at) - new Date(a.published_at));
    const latest = list[0];
    const latestUrl = `${BASE}/article.html?slug=${latest.slug}`;

    // 1) ヒーローのCTAリンクを更新
    const goBtn = document.getElementById("go-latest");
    if (goBtn) goBtn.href = latestUrl;

    // 2) 最新のサマリーカードを描画
    const latestContainer = document.getElementById("latest");
    if (latestContainer) {
      latestContainer.innerHTML = `
        <a class="card" href="${latestUrl}">
          <div class="title">${latest.title}</div>
          <div class="date">${new Date(latest.published_at).toLocaleDateString('ja-JP')}</div>
        </a>
      `;
    }

  } catch (err) {
    console.error("最新記事の読み込みに失敗:", err);
    const latestContainer = document.getElementById("latest");
    if (latestContainer) {
      latestContainer.innerHTML = `<p style="color:crimson;">最新記事の読み込みに失敗しました</p>`;
    }
  }
})();
