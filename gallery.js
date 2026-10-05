(() => {
  'use strict';
  const M = window.PortfolioMedia;
  const content = document.querySelector('#project-content');
  if (!M || !content) return;
  const dialog = document.querySelector('#video-dialog');
  const viewer = document.querySelector('#video-content');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let data, activeTrigger;
  let cleanupPlayback = () => {};
  let activePreview;
  const hoverPlayback = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function stopPreview() { activePreview?.stop(); }
  const previewObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (activePreview?.cover === entry.target && entry.intersectionRatio < .35) stopPreview();
    });
  }, {threshold: [0, .35]});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreview(); });
  window.addEventListener('pagehide', stopPreview);
  hoverPlayback.addEventListener('change', stopPreview);
  reducedMotion.addEventListener('change', stopPreview);
  function el(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function words(node, zh, en) {
    node.dataset.zh = zh;
    node.dataset.en = en || zh;
    node.textContent = document.body.dataset.lang === 'en' ? (en || zh) : zh;
    return node;
  }
  function link(url, label, cls) {
    const a = el('a', cls, label);
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function text(tag, cls, zh, en) { return words(el(tag, cls), zh, en); }
  try {
    data = M.normalize(window.PORTFOLIO_DATA);
    if (new URLSearchParams(location.search).get('preview') === 'draft') {
      const stored = localStorage.getItem(M.DRAFT_KEY);
      if (stored) {
        data = M.normalize(JSON.parse(stored));
        const banner = el('aside', 'draft-banner');
        banner.append(text('span', '', '正在预览本机草稿 · 尚未发布', 'Local draft preview · Not published'));
        banner.append(link('portfolio-editor.html', ' 编辑草稿 ↗'));
        document.querySelector('main').prepend(banner);
      }
    }
  } catch {
    data = M.normalize(window.PORTFOLIO_DATA);
    document.querySelector('#projects').prepend(text('p', 'draft-warning', '草稿读取失败，已显示保存的作品。', 'Draft unavailable. Showing saved work.'));
  }
  if (local) document.querySelector('#editor-link').hidden = false;
  const selected = new URLSearchParams(location.search).get('project');
  const filterRoot = document.querySelector('#project-filters');
  const icons = {aigc: '✧', realme: 'r', dopreel: '▶'};
  const scrollBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  function label(node, zh, en) {
    node.dataset.labelZh = zh; node.dataset.labelEn = en;
    node.setAttribute('aria-label', document.body.dataset.lang === 'en' ? en : zh);
    return node;
  }
  data.projects.forEach(project => {
    const jump = text('a', 'filter-button theme-' + project.theme, project.name, project.nameEn);
    jump.href = '#collection-' + project.id;
    filterRoot.append(jump);
  });

  function contextFields(video, root, complete) {
    const fields = [
      ['background', '作品看点', 'Creative highlights'], ['idea', '我的创作思路', 'My creative approach'],
      ['role', '我参与的部分', 'My part'], ['result', '带来的变化', 'The impact']
    ];
    fields.forEach(([key, zh, en]) => {
      if (!video[key]) return;
      const section = el('div', 'context-field');
      section.append(text('h4', '', zh, en), text('p', '', video[key], video[key + 'En']));
      root.append(section);
    });
    if (!root.childElementCount) root.append(text('p', '', '先看作品，幕后故事慢慢补上。', 'Enjoy the film. Its behind-the-scenes story is coming soon.'));
    if (complete) root.classList.add('full-context');
  }

  function metricRow(video) {
    if (!video.metrics) return null;
    const row = link(video.url, '', 'video-metrics');
    const labels = [['views', '播放', 'views'], ['likes', '赞', 'likes'], ['comments', '评论', 'comments']];
    const zh = [], en = [];
    labels.forEach(([key, name, nameEn]) => {
      const value = video.metrics[key];
      if (!Number.isSafeInteger(value)) return;
      const count = M.formatCount(value), countEn = M.formatCount(value, 'en');
      const item = el('span', 'video-metric');
      item.append(text('strong', '', count, countEn), text('span', '', name, nameEn));
      row.append(item); zh.push(count + name); en.push(countEn + ' ' + nameEn);
    });
    label(row, '平台公开数据：' + zh.join('，') + '。截至 ' + video.metrics.asOf + '，打开原作品查看。',
      'Public platform data: ' + en.join(', ') + '. As of ' + video.metrics.asOf + '. Open the original post.');
    row.title = 'Platform snapshot · ' + video.metrics.asOf;
    return row;
  }

  function openVideo(video, project, trigger) {
    const media = M.media(video.file || video.url);
    const source = M.media(video.url);
    stopPreview();
    cleanupPlayback();
    activeTrigger = trigger;
    const header = el('header', 'video-heading');
    const title = text('h2', '', video.title, video.titleEn); title.id = 'video-title';
    header.append(text('p', 'work-kicker', project.name + ' / ' + source.provider + (video.file ? ' · 站内播放' : ''), (project.nameEn || project.name) + ' / ' + source.provider + (video.file ? ' · Hosted video' : '')), title);
    const stage = el('div', 'video-stage');
    const playbackStatus = text('p', 'playback-status', '播放器加载中…', 'Loading player…');
    playbackStatus.setAttribute('role','status');
    const portrait = video.orientation === 'portrait' || (video.orientation === 'auto' && media.portrait);
    if (portrait) stage.classList.add('portrait');
    if (media.kind === 'iframe') {
      const frame = el('iframe');
      frame.src = media.src; frame.title = video.title;
      frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      const placeholder = el('div', 'player-placeholder');
      if (video.cover) { const poster = el('img'); poster.src=video.cover; poster.alt=''; placeholder.append(poster); }
      placeholder.append(text('span', '', '正在连接视频平台…', 'Connecting to the video platform…'));
      stage.append(frame, placeholder);
      let ready = false;
      const showPlayer = () => { ready=true; placeholder.hidden=true; words(playbackStatus, '点击播放器观看。', 'Use the player to watch.'); };
      const messageHandler = event => {
        if (event.source !== frame.contentWindow || event.origin !== new URL(media.src).origin || event.data?.['x-tiktok-player'] !== true) return;
        if (event.data.type === 'onPlayerReady' || event.data.type === 'onStateChange') showPlayer();
        if (event.data.type === 'onPlayerError') words(playbackStatus, '平台暂时无法播放这条视频，可打开原视频观看。', 'The platform could not play this video. Open the original to watch.');
      };
      if (media.provider === 'TikTok') window.addEventListener('message',messageHandler);
      else frame.addEventListener('load',showPlayer,{once:true});
      const timer = setTimeout(() => {
        if (ready) return;
        words(playbackStatus, '平台连接较慢，可先打开原视频观看。', 'The platform is taking longer to connect. Try the original video.');
        words(placeholder.querySelector('span'), '暂未连接到播放器', 'Waiting for the player');
      },8000);
      cleanupPlayback = () => { clearTimeout(timer); window.removeEventListener('message',messageHandler); };
    } else if (media.kind === 'video') {
      const player = el('video'); player.src = media.src; player.controls = true;
      player.playsInline = true; player.preload = 'metadata';
      if (video.cover) player.poster = video.cover;
      player.addEventListener('loadedmetadata', () => words(playbackStatus, '点击播放器观看。', 'Use the player to watch.'), {once:true});
      player.addEventListener('playing', () => words(playbackStatus, '正在播放 · 可调节音量或进入全屏', 'Playing · Adjust volume or enter fullscreen'));
      player.addEventListener('error', () => words(playbackStatus, '视频暂时无法加载，可打开原链接查看。', 'Video unavailable. Try the original link.'));
      stage.append(player);
      cleanupPlayback = () => { player.pause(); };
    } else {
      stage.classList.add('external-stage');
      stage.append(el('span', 'external-symbol', '↗'), text('h3', '', '在作品原页观看', 'Watch on the original page'), text('p', '', media.shortLink ? '这是分享短链接。添加跳转后的完整视频链接，即可尝试站内播放。' : '这个来源暂不支持站内播放，可打开原页查看完整内容。', media.shortLink ? 'This is a shortened share link. Use the full video link to enable supported players.' : 'This source does not support playback here. Open the original page to view the full work.'), words(link(video.url, '', 'button primary'), '打开作品 ↗', 'Open original ↗'));
    }
    const note = el('div', 'player-note');
    note.append(text('p', '', media.kind === 'external' ? '原页可能需要登录或在对应 App 中打开。' : '如播放器无法加载，或平台要求登录，可打开原视频观看。', media.kind === 'external' ? 'The original page may require a login or its app.' : 'If the player is unavailable or asks you to sign in, watch on the original platform.'), words(link(video.url, '', 'text-link'), '打开原视频 ↗', 'Open original ↗'));
    const context = el('div', 'video-story'); contextFields(video, context, true);
    const layout = el('div', portrait && media.kind !== 'external' ? 'video-layout portrait-layout' : 'video-layout');
    layout.append(stage, context);
    if (media.kind !== 'external') note.firstElementChild.replaceWith(playbackStatus);
    viewer.replaceChildren(header, note, layout);
    dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add('dialog-open');
    const hostedPlayer = stage.querySelector('video');
    if (hostedPlayer) hostedPlayer.play().catch(() => words(playbackStatus, '点击播放器即可观看。', 'Press play to watch.'));
  }

  function videoCard(video, project) {
    const media = M.media(video.file || video.url);
    const source = M.media(video.url);
    const card = el('article', 'video-card theme-' + project.theme);
    const cover = el('div', 'video-cover');
    const art = el('div', 'video-art');
    const imageURL = video.cover || source.thumbnail;
    if (imageURL) {
      const img = el('img'); img.src = imageURL; img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => img.remove()); art.append(img);
    }
    art.append(el('span', 'video-monogram', icons[project.theme]), el('span', 'video-art-word', project.nameEn || project.name));
    const previewMedia = M.media(video.previewUrl || video.file || video.url);
    const canPreview = previewMedia.kind === 'video';
    const open = el('button', 'play-work');
    label(open, (media.kind === 'external' ? '打开作品：' : '放大观看：') + video.title, (media.kind === 'external' ? 'Explore: ' : 'Watch: ') + (video.titleEn || video.title));
    const playMark = el('span', 'play-work-mark', media.kind === 'external' ? '↗' : '▶');
    playMark.setAttribute('aria-hidden', 'true');
    open.append(playMark);
    open.type = 'button'; open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', () => openVideo(video, project, open));
    const badge = el('span', 'video-platform', media.kind === 'external' ? 'PORTFOLIO ARCHIVE' : media.provider);
    if (video.file) words(badge, '站内视频 · ' + source.provider, 'HOSTED · ' + source.provider);
    const storyKey = ['background', 'idea', 'role', 'result'].find(key => video[key]);
    const info = el(storyKey ? 'details' : 'aside', 'video-context' + (storyKey ? '' : ' context-pending'));
    if (storyKey) {
      const summary = el('summary');
      summary.append(text('span', 'context-label', '看点与创作思路', 'Highlights & approach'), text('span', 'context-teaser', video[storyKey], video[storyKey + 'En']));
      const more = el('span', 'context-more', '+'); more.setAttribute('aria-hidden', 'true');
      summary.append(more);
      const copy = el('div', 'context-copy'); contextFields(video, copy);
      info.append(summary, copy);
      info.addEventListener('keydown', event => {
        if (event.key === 'Escape') { info.open = false; summary.focus(); }
      });
    } else {
      info.append(text('span', 'context-label', '一点幕后', 'Behind the scenes'), text('p', '', '先看作品，幕后故事慢慢补上。', 'Enjoy the film. More of the story soon.'));
    }
    cover.append(art, badge, open);
    const hint = el('p', 'preview-hint');
    const hintText = text('span', '', canPreview ? '移入即播 · 点击有声观看' : media.kind === 'external' ? '点击打开作品 ↗' : '点击打开播放器 ↗', canPreview ? 'Hover to play · Click for sound' : media.kind === 'external' ? 'Open the work ↗' : 'Open player ↗');
    hint.append(hintText);
    if (canPreview) {
      cover.classList.add('has-preview');
      const touchHint = text('span', 'touch-preview-hint', '点击播放 · 有声观看', 'Tap to watch with sound');
      hintText.classList.add('hover-preview-hint'); hint.append(touchHint);
      let preview, requested = false, playbackRequest = 0;
      const idleHint = () => words(hintText, '移入即播 · 点击有声观看', 'Hover to play · Click for sound');
      const controller = {cover, stop() {
        requested = false; playbackRequest++;
        preview?.pause();
        cover.classList.remove('is-previewing');
        idleHint();
        if (activePreview === controller) activePreview = null;
      }};
      const start = () => {
        if (!hoverPlayback.matches || reducedMotion.matches || document.hidden || document.querySelector('dialog[open]') || activePreview === controller) return;
        stopPreview(); activePreview = controller; requested = true;
        const request = ++playbackRequest;
        if (!preview) {
          preview = el('video', 'hover-video');
          preview.muted = true; preview.defaultMuted = true; preview.playsInline = true;
          preview.loop = true; preview.preload = 'none';
          preview.setAttribute('aria-hidden', 'true'); preview.tabIndex = -1;
          preview.addEventListener('playing', () => {
            if (!requested || activePreview !== controller) { preview.pause(); return; }
            cover.classList.add('is-previewing');
            words(hintText, '静音播放中 · 点击有声观看', 'Playing muted · Click for sound');
          });
          preview.addEventListener('error', () => {
            controller.stop();
            words(hintText, '点击打开播放器观看', 'Click to open the player');
          });
          art.append(preview); preview.src = previewMedia.src;
        }
        if (preview.readyState > 0) preview.currentTime = 0;
        preview.play().catch(() => {
          if (request === playbackRequest && requested && activePreview === controller) {
            controller.stop();
            words(hintText, '点击打开播放器观看', 'Click to open the player');
          }
        });
      };
      cover.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') start(); });
      cover.addEventListener('pointerleave', () => controller.stop());
      open.addEventListener('focus', () => { if (open.matches(':focus-visible')) start(); });
      open.addEventListener('blur', () => controller.stop());
      previewObserver.observe(cover);
    }
    const caption = el('div', 'video-caption');
    caption.append(text('p', 'work-kicker', project.name, project.nameEn), text('h4', '', video.title, video.titleEn));
    card.append(cover, hint, caption);
    const metrics = metricRow(video); if (metrics) card.append(metrics);
    card.append(info); return card;
  }

  function accountCard(account, project) {
    const card = el('article', 'account-card');
    const url = new URL(account.url);
    const platform = account.label?.split(' · ')[0] || url.hostname.replace(/^www\./, '');
    const name = account.label?.split(' · ').slice(1).join(' · ') || project.name;
    const visual = link(account.url, '', 'account-cover');
    label(visual, '访问账号：' + (account.label || name), 'Visit channel: ' + (account.label || name));
    visual.append(text('span', 'account-type', '账号入口 ↗', 'CHANNEL ↗'));
    const mark = el('span', 'account-symbol', platform === 'YouTube' ? '▶' : platform === 'TikTok' || platform === '抖音' ? '♪' : platform === 'Instagram' ? '◎' : platform === 'Facebook' ? 'f' : icons[project.theme]);
    mark.setAttribute('aria-hidden', 'true');
    visual.append(mark, el('span', 'account-platform', platform), text('span', 'account-visit', '进入主页 ↗', 'Visit channel ↗'));
    const caption = el('div', 'video-caption');
    caption.append(text('p', 'work-kicker', '账号 / ' + platform, 'CHANNEL / ' + platform), el('h4', '', name));
    card.append(visual, caption);
    return card;
  }

  function renderContent() {
    data.projects.forEach((project, index) => {
      const section = el('section', 'project-collection theme-' + project.theme);
      section.id = 'collection-' + project.id;
      section.setAttribute('aria-labelledby', section.id + '-title');
      const intro = el('div', 'collection-intro');
      const identity = el('div', 'project-identity');
      const icon = el('span', 'project-icon', icons[project.theme]); icon.setAttribute('aria-hidden', 'true');
      identity.append(icon, el('span', 'project-number', String(index + 1).padStart(2, '0') + ' / COLLECTION'));
      const heading = text('h3', '', project.name, project.nameEn); heading.id = section.id + '-title';
      intro.append(identity, heading, text('p', 'project-description', project.description, project.descriptionEn));
      intro.append(text('p', 'collection-count', project.videos.length + ' 件作品 · ' + project.accounts.length + ' 个账号', project.videos.length + (project.videos.length === 1 ? ' work' : ' works') + ' · ' + project.accounts.length + (project.accounts.length === 1 ? ' channel' : ' channels')));
      if (project.accounts.length) {
        const channels = el('div', 'collection-channels');
        // Small channel sets get direct entrances; larger directories stay in the shelf.
        const directAccounts = project.accounts.length <= 3 ? project.accounts : project.accounts.slice(0, 1);
        const multiple = directAccounts.length > 1;
        if (multiple) intro.classList.add('has-channel-options');
        directAccounts.forEach(account => {
          const home = label(link(account.url, '', 'collection-home'), '访问 ' + account.label + ' 账号主页', 'Visit ' + account.label + ' channel');
          const arrow = el('span', 'collection-home-arrow', '↗'); arrow.setAttribute('aria-hidden', 'true');
          if (multiple) {
            const [platform, ...names] = account.label.split(' · ');
            const platformEn = {'抖音': 'Douyin', '小红书': 'RED'}[platform] || platform;
            const copy = el('span', 'collection-home-copy');
            copy.append(text('span', 'collection-home-platform', platform + '主页', platformEn + ' profile'));
            if (names.length) copy.append(el('span', 'collection-home-name', names.join(' · ')));
            home.append(copy, arrow);
          } else home.append(text('span', '', '访问账号主页', 'Visit channel'), arrow);
          channels.append(home);
        });
        intro.append(channels);
      }
      if (!project.videos.length && project.accounts.length) intro.append(text('p', 'collection-note', '先逛逛账号，精选视频陆续补充。', 'Explore the channels. Selected videos are coming soon.'));

      const main = el('div', 'collection-main');
      const toolbar = el('div', 'collection-toolbar');
      const hint = text('p', 'collection-hint', '作品与账号', 'WORK & CHANNELS');
      const controls = el('div', 'collection-controls');
      const arrows = el('div', 'collection-arrows');
      const previous = label(el('button', 'shelf-arrow', '←'), '向左浏览 ' + project.name, 'Scroll ' + (project.nameEn || project.name) + ' left');
      const next = label(el('button', 'shelf-arrow', '→'), '向右浏览 ' + project.name, 'Scroll ' + (project.nameEn || project.name) + ' right');
      previous.type = next.type = 'button'; previous.disabled = true;
      const shelf = el('div', 'collection-shelf'); shelf.id = section.id + '-items';
      shelf.setAttribute('role', 'region');
      label(shelf, project.name + ' 合集，左右滑动或使用方向键浏览', (project.nameEn || project.name) + ' collection. Scroll or use arrow keys to browse.');
      [previous, next].forEach(button => button.setAttribute('aria-controls', shelf.id));
      arrows.append(previous, next);
      const expand = text('button', 'collection-expand', '展开全部 ↗', 'View all ↗'); expand.type = 'button';
      expand.setAttribute('aria-controls', shelf.id); expand.setAttribute('aria-expanded', 'false');
      const collapse = text('button', 'collection-collapse', '收起合集 ↑', 'Collapse collection ↑'); collapse.type = 'button'; collapse.hidden = true;
      collapse.setAttribute('aria-controls', shelf.id);
      controls.append(arrows, expand); toolbar.append(hint, controls);
      project.videos.forEach(video => shelf.append(videoCard(video, project)));
      project.accounts.forEach(account => shelf.append(accountCard(account, project)));
      if (!shelf.childElementCount) shelf.append(text('p', 'empty-collection', '这个合集的内容正在整理中。', 'This collection is being prepared.'));
      expand.hidden = shelf.childElementCount < 2;
      main.append(toolbar, shelf, collapse); section.append(intro, main); content.append(section);

      let expanded = false, savedLeft = 0;
      function updateNavigation() {
        const max = Math.max(0, shelf.scrollWidth - shelf.clientWidth);
        arrows.hidden = expanded || max < 2;
        shelf.tabIndex = !expanded && max > 2 ? 0 : -1;
        previous.disabled = shelf.scrollLeft <= 2;
        next.disabled = shelf.scrollLeft >= max - 2;
        section.classList.toggle('has-more', !expanded && shelf.scrollLeft < max - 2);
      }
      function move(direction) {
        const item = shelf.firstElementChild;
        const step = item.getBoundingClientRect().width + parseFloat(getComputedStyle(shelf).columnGap || '0');
        shelf.scrollBy({left: direction * step * Math.max(1, Math.floor(shelf.clientWidth / step)), behavior: scrollBehavior()});
      }
      previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
      shelf.addEventListener('scroll', updateNavigation, {passive: true});
      shelf.addEventListener('keydown', event => {
        if (event.target !== shelf || expanded || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') shelf.scrollTo({left:event.key === 'Home' ? 0 : shelf.scrollWidth, behavior:scrollBehavior()});
        else move(event.key === 'ArrowLeft' ? -1 : 1);
      });
      function toggleExpanded() {
        if (!expanded) savedLeft = shelf.scrollLeft;
        expanded = !expanded;
        section.classList.toggle('is-expanded', expanded);
        expand.setAttribute('aria-expanded', String(expanded));
        words(expand, expanded ? '收起合集 ↑' : '展开全部 ↗', expanded ? 'Collapse ↑' : 'View all ↗');
        collapse.hidden = !expanded || shelf.childElementCount < 4;
        shelf.scrollTo({left: expanded ? 0 : savedLeft, behavior:'instant'});
        updateNavigation();
      }
      expand.addEventListener('click', toggleExpanded);
      collapse.addEventListener('click', () => {
        toggleExpanded(); expand.focus({preventScroll:true});
        section.scrollIntoView({behavior:scrollBehavior(), block:'start'});
      });
      new ResizeObserver(updateNavigation).observe(shelf);
      updateNavigation();
    });
    if (selected) document.getElementById('collection-' + selected)?.scrollIntoView({block:'start', behavior:'instant'});
  }
  document.querySelector('.video-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    cleanupPlayback(); cleanupPlayback = () => {};
    viewer.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    viewer.replaceChildren(); document.body.classList.remove('dialog-open'); activeTrigger?.focus({preventScroll:true});
  });
  renderContent();
  const snapshotDates = [...new Set(data.projects.flatMap(p => p.videos.map(v => v.metrics?.asOf).filter(Boolean)))];
  if (snapshotDates.length) {
    content.after(text('p', 'gallery-data-note', snapshotDates.length === 1 ? '平台公开数据 · ' + snapshotDates[0].replaceAll('-', '.') + ' 快照 · 非实时更新' : '平台公开数据 · 各作品标注采集日期 · 非实时更新',
      snapshotDates.length === 1 ? 'Public platform data · Snapshot: ' + snapshotDates[0] + ' · Not live' : 'Public platform snapshots · Dates shown on each work · Not live'));
  }
})();
