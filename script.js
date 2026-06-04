const toggle = document.querySelector(".language-toggle");
const translatable = document.querySelectorAll("[data-zh][data-en]");

function setLanguage(lang) {
  document.body.dataset.lang = lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  translatable.forEach((item) => {
    item.textContent = item.dataset[lang];
  });
  localStorage.setItem("resume-language", lang);
}

const initialLanguage = localStorage.getItem("resume-language") || "zh";
setLanguage(initialLanguage);

toggle.addEventListener("click", () => {
  const nextLanguage = document.body.dataset.lang === "zh" ? "en" : "zh";
  setLanguage(nextLanguage);
});
