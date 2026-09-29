(() => {
  "use strict";
  const dialog = document.querySelector("#case-dialog");
  const content = document.querySelector("#case-content");
  let currentLanguage = "zh";
  let activeTrigger = null;

  // Language preferences are optional; the page works with storage disabled.
  try {
    const saved = localStorage.getItem("portfolio-language") || localStorage.getItem("resume-language");
    if (saved === "en") currentLanguage = "en";
  } catch { /* Keep the default when browser storage is unavailable. */ }

  function translate(root = document) {
    root.querySelectorAll("[data-zh][data-en]").forEach((item) => {
      item.textContent = item.getAttribute("data-" + currentLanguage);
    });
    root.querySelectorAll("[data-alt-zh][data-alt-en]").forEach((item) => {
      item.alt = item.getAttribute("data-alt-" + currentLanguage);
    });
    root.querySelectorAll("[data-label-zh][data-label-en]").forEach((item) => {
      item.setAttribute("aria-label", item.getAttribute("data-label-" + currentLanguage));
    });
  }

  function setLanguage(language) {
    currentLanguage = language === "en" ? "en" : "zh";
    document.body.dataset.lang = currentLanguage;
    document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
    translate();
    document.querySelectorAll(".language-toggle").forEach((button) => {
      button.setAttribute("aria-label", currentLanguage === "zh" ? "Switch to English" : "切换为中文");
    });
    document.title = currentLanguage === "zh"
      ? "李二虎 · 内容、营销与增长作品集"
      : "casteen LI · Content, Marketing & Growth Portfolio";
    document.querySelector('meta[name="description"]').content = currentLanguage === "zh"
      ? "李二虎 / casteen LI 的作品集：营销方案案例、社媒内容、AI 工具与自动化、实拍视频创作。通过作品，了解内容从策划到传播的过程。"
      : "Work by casteen LI: marketing case studies, social content, AI tools and automation, and live-action video. Explore how ideas become content.";
    try { localStorage.setItem("portfolio-language", currentLanguage); } catch { /* Non-essential preference. */ }
  }

  document.querySelectorAll(".language-toggle").forEach((button) => {
    button.addEventListener("click", () => setLanguage(currentLanguage === "zh" ? "en" : "zh"));
  });

  document.querySelectorAll("[data-case]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      // Keep modified clicks and original-image fallback in browsers without dialog support.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog?.showModal !== "function") return;
      const template = document.getElementById("case-" + trigger.dataset.case);
      if (!template || !content) return;
      event.preventDefault();
      activeTrigger = trigger;
      content.replaceChildren(template.content.cloneNode(true));
      translate(content);
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add("dialog-open");
    });
  });
  document.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog?.addEventListener("close", () => {
    document.body.classList.remove("dialog-open");
    activeTrigger?.focus({ preventScroll: true });
  });
  setLanguage(currentLanguage);
  document.querySelector("#year").textContent = new Date().getFullYear();
})();
