(() => {
  'use strict';
  const toggle = document.querySelector('.language-toggle');
  let language = 'zh';
  try {
    const saved = localStorage.getItem('portfolio-language') || localStorage.getItem('resume-language');
    if (saved === 'en') language = 'en';
  } catch { /* Language storage is optional. */ }
  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'zh';
    document.body.dataset.lang = language;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-zh][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    document.title = language === 'zh' ? '李二虎 · 海外社媒增长运营简历' : 'Casteen · Overseas Social Media & Growth Resume';
    document.querySelector('meta[name="description"]').content = language === 'zh'
      ? '李二虎 / Casteen 的海外社媒增长运营简历：realme 印尼自然与付费内容、DopReel 广告与社媒矩阵增长、网易有道广告运营及北美 TikTok 电商内容。'
      : 'Resume of Casteen: realme Indonesia organic and paid content, DopReel paid and social growth, Youdao advertising, and North American TikTok commerce content.';
    toggle.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换为中文');
    document.querySelector('.section-index nav').setAttribute('aria-label', language === 'zh' ? '简历目录' : 'Resume sections');
    try {
      localStorage.setItem('resume-language', language);
      localStorage.setItem('portfolio-language', language);
    } catch { /* Continue when storage is unavailable. */ }
  }
  toggle.addEventListener('click', () => setLanguage(language === 'zh' ? 'en' : 'zh'));
  setLanguage(language);
})();
