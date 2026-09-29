'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const M = require('../video-utils.js');
test('supported platform links use their own official players', () => {
  const links = [
    ['https://youtu.be/M7lc1UVf-VE?t=12','www.youtube.com'],
    ['https://www.youtube.com/shorts/M7lc1UVf-VE','www.youtube.com'],
    ['https://www.tiktok.com/@sample/video/6718335390845095173','www.tiktok.com'],
    ['https://www.douyin.com/video/7356906132482428172','open.douyin.com'],
    ['https://www.douyin.com/user/sample?modal_id=7356906132482428172','open.douyin.com'],
    ['https://www.bilibili.com/video/BV1B7411m7LV/','player.bilibili.com']
  ];
  for (const [url,host] of links) {
    const media = M.media(url);
    assert.equal(media.kind,'iframe'); assert.equal(new URL(media.src).hostname,host);
  }
});
test('short links and account pages do not pretend to be playable videos', () => {
  for (const url of ['https://v.douyin.com/mljj-JvdqjE/','https://vt.tiktok.com/abc/','https://b23.tv/abc']) {
    assert.equal(M.media(url).kind,'external'); assert.equal(M.media(url).shortLink,true);
  }
  assert.equal(M.media('https://www.tiktok.com/@dopreel').kind,'external');
  assert.equal(M.media('https://www.youtube.com/@Dopreel-indonesia').kind,'external');
});
test('untrusted URLs cannot inject a player or executable URL', () => {
  for (const url of ['javascript:alert(1)','data:text/html,bad','file:///etc/passwd','https://user:password@youtube.com/watch?v=M7lc1UVf-VE']) assert.equal(M.media(url).kind,'invalid');
  assert.equal(M.media('https://www.youtube.com.evil.example/watch?v=M7lc1UVf-VE').kind,'external');
  assert.equal(M.media('https://eviltiktok.com/@x/video/6718335390845095173').kind,'external');
  assert.equal(M.assetURL('assets/../../secret.png'),'');
});
test('direct videos, source query parameters and pasted share text are handled', () => {
  const url='https://example.org/clip.mp4?token=abc';
  assert.deepEqual(M.media(url),{kind:'video',provider:'Video',src:url,url});
  assert.equal(M.media('assets/example.webm').kind,'video');
  assert.equal(M.extractURL('复制打开抖音 https://v.douyin.com/mljj-JvdqjE/ 0@5.com :0pm'),'https://v.douyin.com/mljj-JvdqjE/');
});
test('draft import preserves stories and removes unsafe account and cover values', () => {
  const data=M.normalize({projects:[{id:'one',name:'个人 AIGC',accounts:[{label:'bad',url:'javascript:alert(1)'}],videos:[{id:'clip',title:'<script>not HTML</script>',url:'https://youtu.be/M7lc1UVf-VE',cover:'javascript:bad',background:'背景',idea:'思路',role:'职责',result:'反馈'}]}]});
  assert.equal(data.projects[0].accounts.length,0);
  const v=data.projects[0].videos[0];
  assert.equal(v.idea,'思路'); assert.equal(v.role,'职责'); assert.equal(v.cover,'');
  assert.equal(v.title,'<script>not HTML</script>');
  assert.throws(()=>M.normalize({projects:[{id:'x',name:'a'},{id:'x',name:'b'}]}),/Duplicate/);
  assert.throws(()=>M.normalize({projects:[{name:'x',videos:[{title:'x',url:'javascript:bad'}]}]}),/valid URL/);
});
test('hosted video survives export while keeping its original platform link', () => {
  const source='https://www.tiktok.com/@realme.indonesia/video/7633722299027426577';
  const input={projects:[{id:'realme',name:'realme',videos:[{id:'c100',title:'C100',url:source,file:'assets/videos/realme-c100-teaser.mp4'}]}]};
  const normalized=M.normalize(input);
  const restored=M.normalize(JSON.parse(JSON.stringify(normalized)));
  const v=restored.projects[0].videos[0];
  assert.equal(v.file,'assets/videos/realme-c100-teaser.mp4');
  assert.equal(v.url,source);
  assert.equal(M.media(v.file).kind,'video');
  input.projects[0].videos[0].file='javascript:alert(1)';
  assert.equal(M.normalize(input).projects[0].videos[0].file,'');
  input.projects[0].videos[0].file='https://www.youtube.com/watch?v=M7lc1UVf-VE';
  assert.equal(M.normalize(input).projects[0].videos[0].file,'');
});
test('public metric snapshots survive editing exports without turning missing metrics into zero', () => {
  const source={projects:[{id:'one',name:'One',videos:[{id:'v',title:'Video',url:'https://example.org/a.mp4',metrics:{views:13700000,likes:16700,asOf:'2026-09-29'}}]}]};
  const saved=M.normalize(JSON.parse(JSON.stringify(M.normalize(source)))).projects[0].videos[0];
  assert.deepEqual(saved.metrics,{views:13700000,likes:16700,asOf:'2026-09-29'});
  assert.equal(saved.metrics.comments,undefined);
  source.projects[0].videos[0].metrics={views:-1,likes:'5000',comments:0,asOf:'2026-09-29'};
  assert.deepEqual(M.normalize(source).projects[0].videos[0].metrics,{comments:0,asOf:'2026-09-29'});
  source.projects[0].videos[0].metrics={views:Infinity,asOf:'2026-09-29'};
  assert.equal(M.normalize(source).projects[0].videos[0].metrics,null);
  source.projects[0].videos[0].metrics={views:10,asOf:'2026-02-30'};
  assert.equal(M.normalize(source).projects[0].videos[0].metrics,null);
});
test('compact counts mark rounding and preserve small exact counts', () => {
  assert.equal(M.formatCount(13700000),'≈1,370万');
  assert.equal(M.formatCount(115800000),'≈1.16亿');
  assert.equal(M.formatCount(16700),'≈1.7万');
  assert.equal(M.formatCount(189),'189');
  assert.equal(M.formatCount(0),'0');
  assert.equal(M.formatCount(13700000,'en'),'≈13.7M');
  assert.equal(M.formatCount(null),'');
  assert.equal(M.formatCount(-1),'');
});
