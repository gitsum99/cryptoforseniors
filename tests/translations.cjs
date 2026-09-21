const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pack = fs.readFileSync(path.join(root, 'extra-languages.js'), 'utf8');
const extra = vm.runInNewContext(pack + '; CFS_EXTRA');

function load(file, saved, old = false, missingPack = false) {
  const html = old ? execFileSync('git', ['show', '97a880c:' + file], {cwd: root, encoding:'utf8'}) : fs.readFileSync(path.join(root, file), 'utf8');
  const elements = {};
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = {textContent:'', innerHTML:'', value:'', options:[], add(o){this.options.push(o)}, appendChild(o){this.options.push(o)}};
  const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => ({dataset:{i18n:m[1]}, textContent:''}));
  const storage = {'cfs-lang':saved};
  const ctx = vm.createContext({...elements, document:{documentElement:{}, getElementById:id=>elements[id], createElement:()=>({}), querySelectorAll:()=>translated}, localStorage:{getItem:k=>storage[k], setItem:(k,v)=>storage[k]=v}, Option:function(text,value){this.text=text;this.value=value}});
  if (!old && !missingPack) vm.runInContext(pack, ctx);
  for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(script[1]) vm.runInContext(script[1], ctx);
  return {ctx, elements, translated, storage, dict:vm.runInContext(file==='index.html'?'TEXT':'E',ctx)};
}

for (const file of ['index.html','practice/index.html']) {
  const baseline = load(file,'en',true).dict;
  const current = load(file,'en').dict;
  assert.equal(Object.keys(current).length,32);
  for (const key of Object.keys(baseline)) assert.equal(JSON.stringify(current[key]),JSON.stringify(baseline[key]),'Original translation changed: '+key);
  for (const code of Object.keys(current)) {
    const page=load(file,code);
    assert.equal(page.ctx.document.documentElement.lang,code);
    assert.equal(page.ctx.document.documentElement.dir,['ar','fa'].includes(code)?'rtl':'ltr');
    assert.equal(page.elements.lang.value,code);
    assert.equal(new Set(page.elements.lang.options.map(o=>o.value)).size,32);
    assert.equal(page.storage['cfs-lang'],code);
    if(file==='index.html') for(const e of page.translated) assert.equal(e.textContent,page.dict[code][e.dataset.i18n]);
    else { assert.equal(page.elements.title.textContent,page.dict[code][1]); assert.ok(page.elements.notice.textContent); }
    for(const v of Object.values(page.dict[code])) assert.ok(typeof v==='string' && v.trim() && !v.includes('\uFFFD'));
    page.elements.lang.value='fr'; page.elements.lang.onchange({target:{value:'fr'}});
    assert.equal(page.storage['cfs-lang'],'fr');
  }
  assert.equal(load(file,'unknown').ctx.document.documentElement.lang,'en');
  assert.equal(load(file,'de',false,true).ctx.document.documentElement.lang,'en');
  console.log('PASS: '+file+' — 32 locales, rendering, switching, persistence, RTL, fallback, original translations');
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if(/^(https?:|#)/.test(match[1]))continue;
    assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),match[1])),'Broken link: '+match[1]);
  }
}
for(const code of Object.keys(extra.names)) assert.equal(extra.practice[code].length,12);
console.log('PASS: local links, UTF-8 strings, translation structure. DOM stub tests; browser/mobile and linguistic review remain required.');
