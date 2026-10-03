(function (root) {
  "use strict";
  const DRAFT_KEY = "casper-portfolio-draft-v1";
  function webURL(value) {
    try {
      const url = new URL(String(value).trim());
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }
  function assetURL(value) {
    const input = String(value || "").trim();
    if (webURL(input)) return webURL(input);
    try {
      const decoded = decodeURIComponent(input);
      return /^(?:\.\/)?assets\/[a-zA-Z0-9_./%-]+$/.test(input) && !decoded.includes("..") && !decoded.includes("\\") ? input : "";
    } catch { return ""; }
  }
  function extractURL(value) {
    const match = String(value || "").match(/https?:\/\/[^\s<>"'，。；）]+/i);
    return match ? webURL(match[0]) : "";
  }
  function media(value) {
    const raw = String(value || "").trim();
    const safe = webURL(raw) || assetURL(raw);
    if (!safe) return { kind: "invalid", provider: "", url: "" };
    const url = new URL(safe, "https://portfolio.invalid/");
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const direct = /\.(mp4|webm|ogg)$/i.test(path);
    if (direct) return { kind: "video", provider: "Video", src: safe, url: safe };
    let id = "";
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      id = path === "/watch" ? url.searchParams.get("v") : path.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1];
    } else if (host === "youtu.be" || host === "www.youtu.be") id = path.split("/")[1];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      const embed = new URL("https://www.youtube.com/embed/" + id);
      embed.searchParams.set("playsinline", "1");
      embed.searchParams.set("rel", "0");
      return { kind: "iframe", provider: "YouTube", src: embed.href, url: safe, thumbnail: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg", portrait: path.startsWith("/shorts/") };
    }
    if (["tiktok.com", "www.tiktok.com", "m.tiktok.com"].includes(host)) {
      id = path.match(/\/(?:video|player\/v1)\/(\d{10,25})(?:\/|$)/)?.[1];
      if (id) return { kind: "iframe", provider: "TikTok", src: "https://www.tiktok.com/player/v1/" + id + "?autoplay=0&description=1&music_info=1", url: safe, portrait: true };
    }
    if (["bilibili.com", "www.bilibili.com", "m.bilibili.com", "player.bilibili.com"].includes(host)) {
      id = path.match(/\/video\/(BV[a-zA-Z0-9]{10})(?:\/|$)/)?.[1] || url.searchParams.get("bvid");
      if (id && /^BV[a-zA-Z0-9]{10}$/.test(id)) return { kind: "iframe", provider: "Bilibili", src: "https://player.bilibili.com/player.html?bvid=" + id + "&autoplay=0&danmaku=0", url: safe };
    }
    if (["douyin.com", "www.douyin.com", "iesdouyin.com", "www.iesdouyin.com", "open.douyin.com"].includes(host)) {
      id = path.match(/\/(?:share\/)?video\/(\d{10,25})(?:\/|$)/)?.[1] || (path === "/player/video" ? url.searchParams.get("vid") : url.searchParams.get("modal_id"));
      if (id && /^\d{10,25}$/.test(id)) return { kind: "iframe", provider: "抖音", src: "https://open.douyin.com/player/video?vid=" + id + "&autoplay=0", url: safe, portrait: true };
    }
    if (["xiaohongshu.com", "www.xiaohongshu.com", "xhslink.com", "xhslink.cn"].includes(host)) {
      return { kind: "external", provider: "小红书", url: safe, shortLink: host.startsWith("xhslink.") };
    }
    const shortLink = ["vm.tiktok.com", "vt.tiktok.com", "b23.tv", "v.douyin.com"].includes(host) || (["tiktok.com", "www.tiktok.com"].includes(host) && /^\/t\//.test(path));
    return { kind: "external", provider: host.replace(/^www\./, ""), url: safe, shortLink };
  }
  function text(value, max = 5000) { return typeof value === "string" ? value.slice(0, max) : ""; }
  function normalizeMetrics(value) {
    if (!value || typeof value !== 'object') return null;
    const result = {};
    for (const key of ['views', 'likes', 'comments']) {
      if (Number.isSafeInteger(value[key]) && value[key] >= 0) result[key] = value[key];
    }
    if (!Object.keys(result).length) return null;
    const date = typeof value.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.asOf) ? value.asOf : '';
    const parsed = Date.parse(date);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) return null;
    result.asOf = date;
    return result;
  }
  function formatCount(value, language = 'zh') {
    if (!Number.isSafeInteger(value) || value < 0) return '';
    const en = language === 'en';
    const units = en ? [[1e9, 'B', 2], [1e6, 'M', 1], [1e3, 'K', 1]] : [[1e8, '亿', 2], [1e4, '万', 1]];
    const unit = units.find(([scale]) => value >= scale);
    if (!unit) return value.toLocaleString(en ? 'en-US' : 'zh-CN');
    const [scale, suffix, digits] = unit;
    const short = (value / scale).toLocaleString(en ? 'en-US' : 'zh-CN', {maximumFractionDigits: digits});
    return '≈' + short + suffix;
  }
  function normalize(input) {
    if (!input || !Array.isArray(input.projects) || input.projects.length > 50) throw new Error("Invalid project data");
    const ids = new Set();
    const videoIds = new Set();
    return { version: 1, projects: input.projects.map((p, n) => {
      if (!p || typeof p !== "object" || !text(p.name, 120).trim()) throw new Error("Missing project name");
      let id = /^[a-z0-9_-]{1,80}$/i.test(p.id || "") ? p.id : "project-" + n;
      if (ids.has(id)) throw new Error("Duplicate project ID");
      ids.add(id);
      return {
        id, name: text(p.name, 120), nameEn: text(p.nameEn, 160), description: text(p.description, 1000), descriptionEn: text(p.descriptionEn, 1000),
        theme: ["aigc", "realme", "dopreel"].includes(p.theme) ? p.theme : "aigc",
        accounts: (Array.isArray(p.accounts) ? p.accounts : []).slice(0, 40).map(a => ({label: text(a?.label, 120), url: webURL(a?.url)})).filter(a => a.url),
        videos: (Array.isArray(p.videos) ? p.videos : []).slice(0, 100).map((v, i) => {
          if (!v || typeof v !== "object") throw new Error("Invalid video");
          const key = /^[a-z0-9_-]{1,100}$/i.test(v.id || "") ? v.id : id + "-video-" + i;
          if (videoIds.has(key)) throw new Error("Duplicate video ID");
          videoIds.add(key);
          const link = media(v.url);
          if (link.kind === "invalid" || !text(v.title, 180).trim()) throw new Error("Missing video title or valid URL");
          const preview = media(v.previewUrl);
          const hostedFile = media(v.file);
          return {id: key, title: text(v.title, 180), titleEn: text(v.titleEn, 220), url: link.url, cover: assetURL(v.cover),
            file: hostedFile.kind === "video" ? hostedFile.src : "", metrics: normalizeMetrics(v.metrics),
            previewUrl: preview.kind === "video" ? preview.src : "", background: text(v.background), backgroundEn: text(v.backgroundEn),
            idea: text(v.idea), ideaEn: text(v.ideaEn), role: text(v.role, 600), roleEn: text(v.roleEn, 600), result: text(v.result, 1000), resultEn: text(v.resultEn, 1000),
            orientation: ["portrait", "landscape"].includes(v.orientation) ? v.orientation : "auto"};
        })
      };
    }) };
  }
  const api = { DRAFT_KEY, webURL, assetURL, extractURL, media, normalize, formatCount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PortfolioMedia = api;
})(typeof window !== "undefined" ? window : globalThis);
