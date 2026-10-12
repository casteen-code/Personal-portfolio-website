'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const directory = html.match(/<article\b[^>]*id="ai-projects"[^>]*>([\s\S]*?)<\/article>/)?.[1];

test('six projects are visible by default with accurate, distinct source and app entrances', () => {
  assert.ok(directory);
  const cards = [...directory.matchAll(/<li class="ai-featured-project" data-project="([^"]+)">([\s\S]*?)<\/li>/g)];
  assert.deepEqual(cards.map(x => x[1]), ['inventory', 'dashboard', 'campaign', 'fb_auto', 'live-overlay-studio', 'yt-logo-tool']);
  const repositories = ['realme-inventory-turnover', 'realme-id-tiktok-dashboard', 'campaign-motion-studio', 'fb_auto', 'live-overlay-studio', 'yt-logo-tool'];
  const applications = [
    'https://casteen-code.github.io/realme-inventory-turnover/',
    'https://casteen-code.github.io/realme-id-tiktok-dashboard/',
    'https://casteen-code.github.io/campaign-motion-studio/',
    null, null,
    'https://casteen-code.github.io/yt-logo-tool/logo-tool.html',
  ];
  cards.forEach(([, , content], i) => {
    const links = [...content.matchAll(/<a\b([^>]+)>/g)].map(x => x[1]);
    const expected = [...(applications[i] ? [applications[i]] : []), `https://github.com/casteen-code/${repositories[i]}`];
    assert.deepEqual(links.map(attributes => attributes.match(/href="([^"]+)"/)[1]), expected);
    for (const attributes of links) {
      assert.match(attributes, /target="_blank"/);
      assert.match(attributes, /rel="noopener noreferrer"/);
    }
    assert.match(content, /class="ai-project-limit"/);
    assert.match(content, /class="ai-project-state"/);
    assert.doesNotMatch(content, /<(?:details|summary)\b|<[^>]*\shidden(?:\s|=|>)/);
    for (const tag of content.matchAll(/<(?:h4|p)\b([^>]*)>/g)) {
      assert.match(tag[1], /data-zh="[^"]+"/);
      assert.match(tag[1], /data-en="[^"]+"/);
    }
    assert.match(content, /data-en="Overview & source"/);
  });
  assert.match(cards[1][2], /data-en="Authorized access"/);
  assert.match(cards[1][2], /不是公开数据演示/);
  assert.match(cards[0][2], /数据不跨同事同步/);
  assert.match(cards[2][2], /视频导出格式取决于浏览器/);
  assert.match(cards[3][2], /Facebook \/ Meta 自动日报/);
  assert.match(cards[3][2], /广告账户权限及本地或服务器配置/);
  assert.match(cards[3][2], /不自动修改广告投放/);
  assert.match(cards[4][2], /公开演示待开放/);
  assert.match(cards[4][2], /直播软件兼容性需实测/);
  assert.match(cards[5][2], /不连接或更新 YouTube 频道/);
  assert.doesNotMatch(cards[5][2], /完全离线|fully offline/i);
  assert.ok(directory.indexOf('data-project="yt-logo-tool"') < directory.indexOf('<details'), 'all six cards precede the optional method disclosure');
});

test('only the existing film prompt method is collapsed, with no hidden projects or fabricated entry', () => {
  assert.equal([...directory.matchAll(/<details\b/g)].length, 1);
  const details = directory.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(details);
  assert.doesNotMatch(details[1], /\bopen\b/);
  for (const repository of ['fb_auto', 'live-overlay-studio', 'yt-logo-tool']) {
    assert.ok(!details[2].includes(`href="https://github.com/casteen-code/${repository}"`));
  }
  assert.equal([...details[2].matchAll(/<li\b/g)].length, 1);
  assert.doesNotMatch(details[2], /<a\b|data-project=/);
  assert.match(details[2], /AI 影片 Prompt 提示词 Skills/);
  assert.match(details[2], /整理影片创意与镜头提示词，沉淀可复用的写作 Skills。/);
  assert.match(directory, /我定义业务规则与操作流程，用 AI 辅助开发和测试/);
});

test('directory translations remain paired and contain no translated containers that would destroy controls', () => {
  for (const tag of directory.matchAll(/<([a-z0-9]+)\b([^>]*\bdata-(?:zh|en)="[^>]+)>/g)) {
    assert.match(tag[2], /data-zh="[^"]+"/);
    assert.match(tag[2], /data-en="[^"]+"/);
    assert.ok(['span', 'h3', 'h4', 'p'].includes(tag[1]), 'translate text leaves, not link or disclosure containers');
  }
  for (const label of ['Open tool', 'Open editor', 'Authorized access', 'Overview & source', 'Creative method: film prompt Skills', 'Setup required', 'Public demo not yet available']) {
    assert.ok(directory.includes(`data-en="${label}"`));
  }
});

test('existing marketing, video, resume and contact anchors survive without broken in-page links', () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
  for (const id of ['top', 'projects', 'social-wall', 'project-content', 'work', 'casework', 'marketing-cases', 'creative-practice', 'ai-projects', 'about', 'experience', 'skills', 'contact', 'case-campaign', 'case-research', 'case-design', 'video-dialog']) {
    assert.ok(ids.has(id), `existing anchor missing: ${id}`);
  }
  for (const link of html.matchAll(/\bhref="#([^"]+)"/g)) assert.ok(ids.has(decodeURIComponent(link[1])), `broken anchor: ${link[1]}`);
  assert.match(html, /class="more-card film-card"/);
  const film = html.match(/<article class="more-card film-card">[\s\S]*?<\/article>/)?.[0];
  assert.ok(film);
  assert.equal(createHash('sha256').update(film).digest('hex'), '4363b2ecc510b3b9b99311a67c9cc1a979f4c8d311931eaf59e8b54f95a0b08d', 'preserve the film card markup and copy byte-for-byte');
  assert.match(html, /创意短片《弈语道文》/);
  assert.match(html, /学而思学习机 · 产品短视频/);
  assert.ok(html.includes('href="02-网页简历/index.html?v=20261005-resume-aigc"'));
  for (const source of ['video-utils.js?v=20261005-channel-wall', 'portfolio-data.js?v=20261009-tennis-film', 'script.js', 'gallery.js?v=20261005-channel-wall']) {
    assert.ok(html.includes(`src="${source}"`), `existing script changed: ${source}`);
  }
  assert.match(html, /style\.css\?v=20261012-six-projects/);
});

test('directory controls retain touch targets, visible focus and responsive six-card grid', () => {
  assert.match(css, /\.ai-project-links a\{[^}]*min-height:44px/);
  assert.match(css, /\.ai-more-practices summary\{[^}]*min-height:48px/);
  assert.match(css, /\.ai-practice-list h4 a\{[^}]*min-height:44px/);
  assert.match(css, /\.ai-project-links a:focus-visible[^}]*outline:2px solid var\(--accent\)/);
  assert.match(css, /\.more-grid\{display:grid;grid-template-columns:1fr 1fr/);
  assert.match(css, /\.more-grid>\.ai-tools-card\{grid-column:1\/-1/);
  assert.match(css, /\.ai-project-list\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1100px\)\{\.ai-project-list\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:640px\)\{\.ai-project-list\{grid-template-columns:1fr/);
  assert.match(css, /\.more-grid>\.film-card\{grid-column:1\/-1/);
  assert.doesNotMatch(css, /\.ai-featured-project[^{}]*\{[^}]*display:none/);
});
