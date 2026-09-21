const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = 'practice/simulator/boris-13-wallet-example.html';
const old = execFileSync('git',['show','97a880c:'+file],{cwd:root,encoding:'utf8'});
const html = fs.readFileSync(path.join(root,file),'utf8');
// Everything after the translation setup, including all calculations, is untouched.
assert.equal(html.slice(html.indexOf('const events=')).trimEnd(),old.slice(old.indexOf('const events=')).trimEnd());
function load(code, baseline=false, missingPack=false) {
  const source=baseline?old:html, elements={},storage={'cfs-lang':code};
  for(const match of source.matchAll(/id="([^"]+)"/g)) elements[match[1]]={textContent:'',innerHTML:'',value:'',options:[],add(o){this.options.push(o)}};
  const ctx=vm.createContext({...elements,document:{documentElement:{},getElementById:id=>elements[id]},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},Option:function(text,value){this.text=text;this.value=value}});
  if(!baseline&&!missingPack) for(const f of ['extra-languages.js','wallet-languages.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
  for(const s of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(s[1])vm.runInContext(s[1],ctx);
  return {ctx,elements,storage,dict:vm.runInContext('T',ctx)};
}
const reference=load('en',true);
const dict=load('en').dict;
assert.equal(Object.keys(dict).length,32);
for(const code of Object.keys(reference.dict))assert.equal(JSON.stringify(dict[code]),JSON.stringify(reference.dict[code]));
function state(ctx){return vm.runInContext('JSON.stringify({wallets,i,displayVol})',ctx)}
function noMissing(page){for(const el of Object.values(page.elements))assert.ok(!/undefined|NaN/.test(el.innerHTML+el.textContent));}
for(const code of Object.keys(dict)) {
  const p=load(code),base=load('en',true);
  assert.equal(p.elements.lang.options.length,32);
  assert.equal(new Set(p.elements.lang.options.map(o=>o.value)).size,32);
  assert.equal(p.ctx.document.documentElement.lang,code);
  assert.equal(p.ctx.document.documentElement.dir,['ar','fa'].includes(code)?'rtl':'ltr');
  assert.equal(p.storage['cfs-lang'],code);
  assert.equal(Object.keys(p.dict[code]).length,40);
  for(const v of Object.values(p.dict[code]))assert.ok(typeof v==='string'&&v.trim()&&!v.includes('\uFFFD'));
  assert.equal(p.elements.title.textContent,p.dict[code].title);
  assert.equal(p.elements.notice.textContent,p.dict[code].notice);
  for(let n=0;n<10;n++){
    p.elements.next.onclick();base.elements.next.onclick();
    assert.equal(state(p.ctx),state(base.ctx),'Numerical regression '+code+' step '+n);
    noMissing(p);
  }
  p.elements.reveal.onclick(); assert.ok(p.elements.links.innerHTML.includes(p.dict[code].defensive));
  p.elements.reset.onclick();base.elements.reset.onclick();assert.equal(state(p.ctx),state(base.ctx));
  p.elements.run.onclick();base.elements.run.onclick();assert.equal(state(p.ctx),state(base.ctx));
  p.elements.lang.value='ar';p.elements.lang.onchange({target:{value:'ar'}});
  assert.equal(p.storage['cfs-lang'],'ar');assert.equal(p.ctx.document.documentElement.dir,'rtl');noMissing(p);
}
assert.equal(load('unknown').ctx.document.documentElement.lang,'en');
assert.equal(load('de',false,true).ctx.document.documentElement.lang,'en');
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),m[1])));
console.log('PASS: wallet lab — 32 locales × 40 strings; original 15 unchanged; controls, results, reset, reveal, switching, RTL and fallback. Simulation source and numerical states unchanged. DOM-stub tests only.');
