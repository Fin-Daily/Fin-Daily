
/**
 * FinDaily article renderer
 * - ?slug=YYYY-MM-DD を受け取り、/data/articles/<slug>.json を読み込んで描画
 * - title / description / og:image などのメタもJSONから動的に更新
 * - すべて絶対パスで運用（GitHub Pagesのサブパス配下でも安全）
 */

(function () {
  // ======= 設定（絶対パス）======
  const BASE = "https://fin-daily.github.io/Fin-Daily";
  const DATA_BASE = `${BASE}/data/articles`;

  // ======= ユーティリティ =======
  const $ = (sel) => document.querySelector(sel);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function setMeta(nameOrProp, content, isProperty=false) {
    if (!content) return;
    let sel = isProperty ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
    let m = document.head.querySelector(sel);
    if (!m) {
      m = document.createElement('meta');
      if (isProperty) m.setAttribute('property', nameOrProp);
      else m.setAttribute('name', nameOrProp);
      document.head.appendChild(m);
    }
    m.setAttribute('content', content);
  }
  function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  // ======= ルーティング =======
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const root = $("#article");
  const pageTitle = $("#page-title");

  if (!slug) {
    if (root) {
      root.innerHTML = '<p>表示する記事が指定されていません。例：<code>./article.html?slug=2025-08-14</code></p>';
    }
    document.title = "記事 | FinDaily";
    return;
  }

  const jsonUrl = `${DATA_BASE}/${slug}.json`;

  // ======= メイン処理 =======
  fetch(jsonUrl, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((a) => {
      // --- メタ類 ---
      const title = a.title || `FinDaily ${slug}`;
      const desc = a.seo?.description || "毎朝の相場ハイライトを1枚で。";
      const ogImg = a.seo?.og_image
        ? (a.seo.og_image.startsWith("http") ? a.seo.og_image : `${BASE}${a.seo.og_image}`)
        : `${BASE}/assets/images/XCard.png`;
      const canonical = `${BASE}/article.html?slug=${encodeURIComponent(slug)}`;

      document.title = `${title} | FinDaily`;
      setMeta("description", desc);
      setMeta("og:title", title, true);
      setMeta("og:description", desc, true);
      setMeta("og:image", ogImg, true);
      setMeta("twitter:title", title);
      setMeta("twitter:description", desc);
      setMeta("twitter:image", ogImg);
      setCanonical(canonical);
      if (pageTitle) pageTitle.textContent = title;

      // --- 本文描画 ---
      if (!root) return;

      // ヘッダー
      const metaDiv = el("div", "meta", new Date(a.published_at).toLocaleString("ja-JP"));
      root.appendChild(metaDiv);

      // セクション
      (a.sections || []).forEach((sec) => {
        const wrap = el("section", `sec sec--${sec.type}`);
        if (sec.heading) wrap.appendChild(el("h2", "section-title", sec.heading));

        if (sec.type === "highlight") {
          const ul = el("ul", "highlight-list");
          (sec.items || []).forEach((t) => ul.appendChild(el("li", null, `・${t}`)));
          wrap.appendChild(ul);
        }

        if (sec.type === "market_table") {
          // テーブル
          const table = el("table", "market-table");
          const trh = el("tr");
          (sec.columns || []).forEach((c) => trh.appendChild(el("th", null, c)));
          table.appendChild(trh);
          (sec.data || []).forEach((row) => {
            const tr = el("tr");
            row.forEach((cell) => tr.appendChild(el("td", null, String(cell))));
            table.appendChild(tr);
          });
          if (sec.notes) wrap.appendChild(el("p", "notes", sec.notes));
          // カード（任意：モバイル向け）
          const cards = el("div", "market-cards");
          (sec.data || []).forEach((row) => {
            const [name, latest, pct] = row;
            const card = el("div", "market-card");
            const row1 = el("div", "row");
            row1.appendChild(el("span", "name", String(name)));
            if (pct != null) row1.appendChild(el("span", "pct", String(pct)));
            card.appendChild(row1);
            card.appendChild(el("div", "latest", String(latest)));
            cards.appendChild(card);
          });

          const group = el("div", "market-category");
          const details = el("details", "toggle");
          details.open = sec.heading === "株価・為替・債券"; // 1つだけ開いておく例
          const summary = el("summary", "toggle-summary", sec.heading || "市場データ");
          const content = el("div", "toggle-content");
          content.appendChild(table);
          content.appendChild(cards);
          details.appendChild(summary);
          details.appendChild(content);
          wrap.appendChild(details);
        }

        if (sec.type === "news_summary") {
          const list = el("div", "news-list");
          (sec.articles || []).forEach((n, i) => {
            const card = el("article", "news-card");
            const label = `📰【${i + 1}】`;
            card.appendChild(el("h3", "news-title", `${label}${n.headline}`));
            if (n.summary) {
              const p = document.createElement("p");
              p.innerHTML = `<strong>📌 要点:</strong> ${n.summary}`;
              card.appendChild(p);
            }
            if (Array.isArray(n.points) && n.points.length) {
              const ul = el("ul", "news-points");
              n.points.forEach((pt) => {
                const li = document.createElement("li");
                li.textContent = pt;
                ul.appendChild(li);
              });
              card.appendChild(ul);
            }
            if (n.interpretation) {
              const p2 = document.createElement("p");
              p2.innerHTML = `<strong>📊 解釈:</strong> ${n.interpretation}`;
              card.appendChild(p2);
            }
            if (n.source?.url) {
              const a = document.createElement("a");
              a.href = n.source.url; a.target = "_blank"; a.rel = "noopener";
              a.textContent = n.source.name || "Source";
              card.appendChild(a);
            }
            list.appendChild(card);
          });
          wrap.appendChild(list);
        }

        if (sec.type === "link_list") {
          const ul = el("ul", "source-list");
          (sec.links || []).forEach((l) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.href = l.url; a.target = "_blank"; a.rel = "noopener";
            a.textContent = l.label || l.url;
            li.appendChild(a);
            ul.appendChild(li);
          });
          wrap.appendChild(ul);
        }

        root.appendChild(wrap);
      });
    })
    .catch((err) => {
      console.error(err);
      if (root) root.innerHTML = "<p>記事の読み込みに失敗しました。</p>";
      if (pageTitle) pageTitle.textContent = "読み込み失敗";
      document.title = "読み込み失敗 | FinDaily";
    });
})();

