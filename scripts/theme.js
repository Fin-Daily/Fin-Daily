// scripts/theme.js
(function () {
  const STORAGE_KEY = "fin-theme"; // 'auto' | 'dark' | 'light'
  const btn = document.getElementById("theme-toggle");

  function apply(mode) {
    const root = document.documentElement;
    // リセット
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";

    if (mode === "dark" || mode === "light") {
      root.setAttribute("data-theme", mode);
      root.style.colorScheme = mode; // フォームUIの色も統一
    }
    if (btn) {
      btn.dataset.mode = mode;
      btn.title = `テーマ切替（現在: ${mode}）`;
      btn.setAttribute("aria-label", `テーマ: ${mode}`);
      btn.textContent = mode === "dark" ? "🌙" : mode === "light" ? "☀️" : "🖥️";
    }
  }

  function next(mode) {
    return mode === "auto" ? "dark" : mode === "dark" ? "light" : "auto";
  }

  const saved = localStorage.getItem(STORAGE_KEY) || "auto";
  apply(saved);

  btn?.addEventListener("click", () => {
    const current = btn.dataset.mode || "auto";
    const m = next(current);
    localStorage.setItem(STORAGE_KEY, m);
    apply(m);
  });
})();
