// scripts/article.js  ※<script>タグは入れない
(function () {
  // ==== 動的BASE算出（/Fin-Daily などサブパス対応）====
  // 例: https://fin-daily.github.io/Fin-Daily/article.html → https://fin-daily.github.io/Fin-Daily
  const here = new URL(location.href);
  const basePath = here.pathname.replace(/\/[^/]*$/, ""); // 末尾のファイル名を除去
  const BASE = `${here.origin}${basePath}`;               // 例: https://fin-daily.github.io/Fin-Daily
  const DATA_BASE = `${BASE}/data/articles`;

  const $ = (s) => document.querySelector(s);
  const root = $("#article");
  const pageTitle = $("#page-title");

  function showStatus(msg) {
    if (root) {
      const p = document.createElement("p");
      p.style.color = "#888";
      p.style.fontSize = "0.9rem";
      p.textContent = msg;
      root.appendChild(p);
    }
    console.log("[FinDaily]", msg);
  }

  function setMeta(nameOrProp, content, isProperty) {
    if (!content) return;
    const sel = isProperty ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
    let m = document.head.querySelector(sel);
    if (!m) {
      m = document.createElement("meta");
      if (isProperty) m.setAttribute("property", nameOrProp);
      else m.setAttribute("name", nameOrProp);
      document.head.appendChild(m);
    }
    m.setAttribute("content", content);
  }
  function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const safe = (v) => (v==null || String(v).toLowerCase()==="nan" || String(v)==="") ? "—" : String(v);

    // ---- Sentiment helpers ----
  function normalizeSentiment(val){
    // 受け取り例: "bullish" | "bearish" | "neutral" | 1 | 0 | -1 | 0.42 | -0.7
    if (val == null) return null;
    if (typeof val === "string"){
      const s = val.trim().toLowerCase();
      if (["bullish","positive","up","buy","long","強気"].includes(s)) return {label:"Bullish", cls:"sentiment--bullish", icon:"⬆️"};
      if (["bearish","negative","down","sell","short","弱気"].includes(s)) return {label:"Bearish", cls:"sentiment--bearish", icon:"⬇️"};
      if (["neutral","flat","中立"].includes(s)) return {label:"Neutral", cls:"sentiment--neutral", icon:"➡️"};
    }
    const n = Number(val);
    if (!Number.isNaN(n)){
      if (n > 0.1) return {label:`Bullish ${Math.round(n*100)/100}`, cls:"sentiment--bullish", icon:"⬆️"};
      if (n < -0.1) return {label:`Bearish ${Math.round(n*100)/100}`, cls:"sentiment--bearish", icon:"⬇️"};
      return {label:"Neutral", cls:"sentiment--neutral", icon:"➡️"};
    }
    return null;
  }

  function renderSentimentBadge(snt){
    const info = normalizeSentiment(snt);
    if (!info) return null;
    const span = document.createElement("span");
    span.className = `sentiment-badge ${info.cls}`;
    span.textContent = `${info.icon} ${info.label}`;
    return span;
  }


  // ==== ルーティング ====
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  if (!slug) {
    showStatus("slug クエリがありません。例: ?slug=2025-08-14");
    return;
  }

  const jsonUrl = `${DATA_BASE}/${slug}.json`;
  showStatus(`JSON取得: ${jsonUrl}`);

  // ==== 取得 → 描画 ====
  fetch(jsonUrl, { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`JSON fetch failed: HTTP ${r.status}`);
      return r.json();
    })
    .then((a) => {
      const title = a.title || `FinDaily ${slug}`;
      const desc = a.seo?.description || "毎朝の相場ハイライトを1枚で。";
      const ogImg = a.seo?.og_image
        ? (a.seo.og_image.startsWith("http") ? a.seo.og_image : `${BASE}${a.seo.og_image}`)
        : `${BASE}/assets/images/XCard.png`;
      const canonical = `${BASE}/article.html?slug=${encodeURIComponent(slug)}`;

      document.title = `${title} | FinDaily`;
      if (pageTitle) pageTitle.textContent = title;
      setMeta("description", desc);
      setMeta("og:title", title, true);
      setMeta("og:description", desc, true);
      setMeta("og:image", ogImg, true);
      setMeta("twitter:title", title);
      setMeta("twitter:description", desc);
      setMeta("twitter:image", ogImg);
      setCanonical(canonical);

      if (!root) return;
      root.innerHTML = ""; // “読み込み中…”を消す

      // 日付
      if (a.published_at) {
        root.appendChild(el("div", "meta", new Date(a.published_at).toLocaleString("ja-JP")));
      }

      // セクション描画
      (a.sections || []).forEach((sec) => {
        const wrap = el("section", `sec sec--${sec.type}`);
        if (sec.heading) wrap.appendChild(el("h2", "section-title", sec.heading));

        if (sec.type === "highlight") {
          const ul = el("ul", "highlight-list");
          (sec.items || []).forEach((t) => ul.appendChild(el("li", null, `・${t}`)));
          wrap.appendChild(ul);
        }

        if (sec.type === "market_table") {
          const details = el("details", "toggle");
          details.open = (sec.heading || "").includes("株価・為替・債券");
          const summary = el("summary", "toggle-summary", sec.heading || "市場データ");

          const table = el("table", "market-table");
          const trh = el("tr");
          (sec.columns || []).forEach((c) => trh.appendChild(el("th", null, c)));
          table.appendChild(trh);
          (sec.data || []).forEach((row) => {
            const tr = el("tr");
            row.forEach((cell) => tr.appendChild(el("td", null, safe(cell))));
            table.appendChild(tr);
          });

          const cards = el("div", "market-cards");
          (sec.data || []).forEach((row) => {
            const [name, latest, pct] = row;
            const card = el("div", "market-card");
            const row1 = el("div", "row");
            row1.appendChild(el("span", "name", safe(name)));
            row1.appendChild(el("span", "pct", safe(pct)));
            card.appendChild(row1);
            card.appendChild(el("div", "latest", safe(latest)));
            cards.appendChild(card);
          });

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
            card.appendChild(el("h3", "news-title", `📰【${i + 1}】${n.headline || ""}`));
            const badge = renderSentimentBadge(
              n.sentiment != null ? n.sentiment : (n.sentiment_score != null ? n.sentiment_score : null)
            );
            if (badge){
              // タイトルのすぐ下（上詰め）に配置
              const row = document.createElement("div");
              row.style.margin = "6px 0 2px";
              row.appendChild(badge);
              card.appendChild(row);
            }
            if (n.summary) {
              const p = document.createElement("p");
              p.innerHTML = `<strong>📌 要点:</strong> ${n.summary}`;
              card.appendChild(p);
            }
            if (Array.isArray(n.points) && n.points.length) {
              const ul = el("ul", "news-points");
              n.points.forEach((pt) => ul.appendChild(el("li", null, pt)));
              card.appendChild(ul);
            }
            if (n.interpretation) {
              const p2 = document.createElement("p");
              p2.innerHTML = `<strong>📊 解釈:</strong> ${n.interpretation}`;
              card.appendChild(p2);
            }
            if (n.source?.url) {
              const link = document.createElement("a");
              link.href = n.source.url;
              link.target = "_blank";
              link.rel = "noopener";
              link.className = "source-link"; // 新しいクラス
              link.innerHTML = `🔗 ${n.source.name || "Source"} <span class="link-icon">↗</span>`;
              card.appendChild(link);
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
      if (pageTitle) pageTitle.textContent = "読み込み失敗";
      if (root) {
        root.innerHTML = "";
        const e = document.createElement("pre");
        e.style.whiteSpace = "pre-wrap";
        e.style.color = "crimson";
        e.textContent = `読み込みエラー: ${err && err.message ? err.message : String(err)}\nURL: ${jsonUrl}`;
        root.appendChild(e);
      }
      document.title = "読み込み失敗 | FinDaily";
    });
})();
