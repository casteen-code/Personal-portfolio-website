(() => {
  'use strict';
  const M = window.PortfolioMedia;
  const status = document.querySelector('#editor-status');
  const projectSelect = document.querySelector('#project-select');
  const videoSelect = document.querySelector('#video-select');
  const pf = document.querySelector('#project-form');
  const vf = document.querySelector('#video-form');
  const remove = document.querySelector('#remove-video');
  let data = M.normalize(window.PORTFOLIO_DATA), projectId, dirtyProject = false, dirtyVideo = false;
  const isDirty = () => dirtyProject || dirtyVideo;
  function message(value, error = false) { status.textContent = value; status.dataset.error = String(error); }
  try {
    const stored = localStorage.getItem(M.DRAFT_KEY);
    if (stored) { data = M.normalize(JSON.parse(stored)); message('已恢复这台设备上的草稿。草稿尚未发布。'); }
  } catch { message('无法读取原草稿。当前显示网站中保存的内容。', true); }
  const field = (form, name) => form.elements.namedItem(name);
  const value = (form, name) => field(form, name).value.trim();
  const project = () => data.projects.find(p => p.id === projectId);
  function option(value, name) { const o = document.createElement('option'); o.value = value; o.textContent = name; return o; }
  function persist() {
    try { localStorage.setItem(M.DRAFT_KEY, JSON.stringify(data)); return true; }
    catch { message('浏览器无法保存草稿。当前内容仍在页面中，请立即「导出更新文件」或「备份草稿」，不要关闭页面。', true); return false; }
  }
  function loadProjects(id) {
    projectSelect.replaceChildren(...data.projects.map(p => option(p.id, p.name)));
    projectId = data.projects.some(p => p.id === id) ? id : data.projects[0]?.id;
    if (!projectId) return;
    projectSelect.value = projectId;
    loadProject();
  }
  function loadProject() {
    const p = project();
    ['name','description','theme'].forEach(key => { field(pf, key).value = p[key]; });
    field(pf, 'accounts').value = p.accounts.map(a => (a.label ? a.label + ' | ' : '') + a.url + (a.role ? ' | ' + (a.role === 'official' ? '官方' : '矩阵') : '')).join('\n');
    loadVideos();
    document.querySelector('#preview-draft').href = 'index.html?preview=draft&project=' + encodeURIComponent(projectId) + '#projects';
  }
  function loadVideos(id = 'new') {
    videoSelect.replaceChildren(option('new','＋ 添加新作品'), ...project().videos.map(v => option(v.id,v.title)));
    videoSelect.value = project().videos.some(v => v.id === id) ? id : 'new';
    loadVideo();
  }
  function loadVideo() {
    const video = project().videos.find(v => v.id === videoSelect.value);
    vf.reset();
    if (video) ['title','url','file','cover','orientation','background','idea','role','result'].forEach(key => { field(vf,key).value = video[key] || (key === 'orientation' ? 'auto' : ''); });
    editingVideoId = videoSelect.value;
    remove.hidden = !video; updateLinkHint();
  }
  function updateLinkHint() {
    const raw = value(vf,'url');
    const url = M.extractURL(raw) || M.assetURL(raw);
    const media = M.media(url);
    const hint = document.querySelector('#video-link-hint');
    if (M.media(value(vf,'file')).kind === 'video') { hint.textContent = '将使用站内视频文件播放，原平台链接保留为来源入口。'; return; }
    if (!raw) { hint.textContent = '支持抖音、TikTok、YouTube、Bilibili 完整视频链接，以及 MP4。其他来源保留原页观看入口。'; return; }
    if (media.kind === 'invalid') { hint.textContent = '暂未找到有效网址，请粘贴含 https:// 的链接。'; return; }
    if (media.kind === 'external') {
      hint.textContent = media.shortLink ? '这是分享短链接。请先打开链接，再把地址栏中的完整视频网址复制回来。' : '这个链接会作为作品原页入口。账号主页请填写在左侧「账号主页」中。';
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = ' 打开链接 ↗'; hint.append(a);
    } else hint.textContent = '已识别：' + media.provider + '。会显示站内播放器，实际播放以来源平台的权限为准。';
  }
  function hasUnsaved() {
    if (!isDirty()) return false;
    message('表单中有尚未保存的修改。请先点击对应的保存按钮，再切换或导出。', true); return true;
  }
  pf.addEventListener('input', () => { dirtyProject = true; });
  vf.addEventListener('input', () => { dirtyVideo = true; });
  field(vf,'url').addEventListener('input',updateLinkHint);
  field(vf,'file').addEventListener('input',updateLinkHint);
  projectSelect.addEventListener('change', () => {
    if (hasUnsaved()) { projectSelect.value = projectId; return; }
    projectId = projectSelect.value; loadProject();
  });
  let editingVideoId = 'new';
  videoSelect.addEventListener('change', () => {
    if (hasUnsaved()) { videoSelect.value = editingVideoId; return; }
    editingVideoId = videoSelect.value; loadVideo();
  });
  document.querySelector('#add-project').addEventListener('click', () => {
    if (hasUnsaved()) return;
    if (data.projects.length >= 50) { message('最多可创建 50 个项目。',true); return; }
    const id = 'project-' + Date.now().toString(36);
    data.projects.push({id,name:'新项目',nameEn:'',description:'',descriptionEn:'',theme:'aigc',accounts:[],videos:[]});
    persist(); loadProjects(id); message('已新建项目。填写名称和账号后，点击「保存项目与账号」。');
  });
  pf.addEventListener('submit', event => {
    event.preventDefault();
    const p = project();
    const accounts = [];
    for (const line of value(pf,'accounts').split('\n').filter(s => s.trim())) {
      const url = M.extractURL(line);
      if (!url) { message('账号列表有一行没有有效链接，请检查后再保存。', true); return; }
      const label = line.includes('|') ? line.split('|')[0].trim() : new URL(url).hostname.replace(/^www\./,'');
      const group = line.split('|')[2]?.trim();
      if (group && !['官方','矩阵','official','distribution'].includes(group)) {
        message('账号分组请填写「官方」或「矩阵」。',true); return;
      }
      const role = group ? (['官方','official'].includes(group) ? 'official' : 'distribution') : p.accounts.find(a => a.url === url)?.role;
      accounts.push({label,url,...(role ? {role} : {})});
    }
    if (accounts.length > 40) { message('一个项目最多可放置 40 个账号。',true); return; }
    const name = value(pf,'name'), description = value(pf,'description');
    if (name !== p.name) p.nameEn = '';
    if (description !== p.description) p.descriptionEn = '';
    Object.assign(p,{name,description,theme:value(pf,'theme'),accounts});
    dirtyProject = false;
    if (persist()) message('项目与账号已保存到本机草稿。可以预览，尚未发布。');
    // Refresh only the project menu; do not discard a video form in progress.
    projectSelect.replaceChildren(...data.projects.map(p => option(p.id,p.name))); projectSelect.value = projectId;
  });
  vf.addEventListener('submit', event => {
    event.preventDefault();
    const url = M.extractURL(value(vf,'url')) || M.assetURL(value(vf,'url'));
    if (M.media(url).kind === 'invalid') { message('请填入有效的视频或作品网址。', true); return; }
    const cover = value(vf,'cover');
    if (cover && !M.assetURL(cover)) { message('封面需要有效的图片网址，或 assets/ 开头的网站图片路径。', true); return; }
    const file = value(vf,'file');
    if (file && M.media(file).kind !== 'video') { message('站内播放文件需要 MP4、WebM 或 OGG 视频地址，例如 assets/videos/example.mp4。', true); return; }
    const p = project();
    const original = p.videos.find(v => v.id === videoSelect.value);
    if (!original && p.videos.length >= 100) { message('一个项目最多可添加 100 条作品。',true); return; }
    const v = {...(original || {}),id:original?.id || 'video-' + Date.now().toString(36),url,file,cover,orientation:value(vf,'orientation')};
    ['title','background','idea','role','result'].forEach(key => { const next = value(vf,key); if (next !== v[key]) v[key+'En']=''; v[key]=next; });
    if (original) p.videos[p.videos.indexOf(original)] = v; else p.videos.push(v);
    dirtyVideo = false;
    if (persist()) message('作品已保存。预览时将指针移到封面上，或点「作品背景」查看说明。');
    editingVideoId = v.id; loadVideos(v.id);
  });
  remove.addEventListener('click', () => {
    const p = project(); p.videos = p.videos.filter(v => v.id !== videoSelect.value);
    dirtyVideo = false;
    if (persist()) message('这条作品已从本机草稿移除，网站保存的原内容仍然保留。');
    editingVideoId = 'new'; loadVideos();
  });
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content],{type}));
    const a = document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  document.querySelector('#export-data').addEventListener('click', () => {
    if (hasUnsaved()) return;
    download('portfolio-data.js', '// Portfolio content exported from the local editor.\nwindow.PORTFOLIO_DATA = ' + JSON.stringify(M.normalize(data),null,2).replace(/</g,'\\u003c') + ';\n','text/javascript');
    message('更新文件已导出。替换网站中的 portfolio-data.js 并正式提交后，线上内容才会更新。');
  });
  document.querySelector('#export-backup').addEventListener('click', () => {
    if (hasUnsaved()) return;
    download('casper-portfolio-backup-' + new Date().toISOString().slice(0,10) + '.json',JSON.stringify(M.normalize(data),null,2),'application/json');
    message('草稿备份已导出。以后可用「导入备份」恢复。');
  });
  document.querySelector('#import-backup').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (hasUnsaved()) { event.target.value=''; return; }
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large');
      const imported = M.normalize(JSON.parse(await file.text()));
      if (!imported.projects.length) throw new Error('No projects');
      // Keep the previous saved content available as a second local recovery copy.
      localStorage.setItem(M.DRAFT_KEY + '-before-import',JSON.stringify(data));
      data = imported; editingVideoId='new';
      if (persist()) message('备份已导入为本机草稿，尚未发布。');
      loadProjects();
    } catch { message('无法导入这份文件。请使用本编辑器导出的 JSON 备份，且文件小于 5 MB。',true); }
    event.target.value='';
  });
  window.addEventListener('beforeunload', event => { if (isDirty()) { event.preventDefault(); event.returnValue=''; } });
  document.querySelector('#preview-draft').addEventListener('click', event => { if (hasUnsaved()) event.preventDefault(); });
  loadProjects();
})();
