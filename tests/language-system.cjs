/* Run with Node and Playwright available; uses a local HTTP server and Edge. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const baseline='249fb3e29f70c6bfdf3231098ca10f2e97b1b45e';
const specs=[['main','index.html','TEXT'],['ai','ai/index.html','T'],['security','security/index.html','T'],['practice','practice/index.html','E'],['launchpad','launchpad/index.html','X'],['troil','troil/index.html','X'],['simulator','practice/simulator/index.html','S'],['lab','practice/simulator/boris-13-wallet-example.html','T']];
const expected=['en','fr','es','hr','tl','ja','zh-cn','zh-tw','ar','no','sv','az','uk','nl','fa','de','ro','pl','sq','fi','is','pt','it','rm','sw','ha','yo','zu','am','so','ln'];
const originals={};
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++;}
const decoder=new TextDecoder('utf-8',{fatal:true});
for(const [,file] of specs){
  const html=decoder.decode(fs.readFileSync(path.join(root,file)));
  originals[file]=execFileSync('git',['show',baseline+':'+file],{cwd:root,encoding:'utf8'});
  const oldScript=originals[file].match(/<script>([\s\S]*?)<\/script>/)[1];
  const anchor=file==='index.html'?'const sel=':file.includes('boris-')?'A.en=en;':file==='practice/simulator/index.html'?'const ids=':'Object.entries(';
  check(html.replace(/\r\n/g,'\n').includes(oldScript.slice(0,oldScript.indexOf(anchor)).replace(/\r\n/g,'\n')),file+': existing dictionary text preserved');
  for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
}
const sandbox={window:{}};vm.runInNewContext(decoder.decode(fs.readFileSync(path.join(root,'assets/translations.js'))),sandbox);
const additions=sandbox.window.CFS_TRANSLATIONS;
check(Object.keys(additions).length===16,'16 unique additions');
const source={};
for(const [page,file] of specs){
  const script=originals[file].match(/<script>([\s\S]*?)<\/script>/)[1];
  const dict={main:'TEXT',ai:'T',security:'T',practice:'E',launchpad:'X',troil:'X',simulator:'S',lab:'A'}[page];
  const anchor=page==='main'?'const sel=':page==='lab'?'A.en=en;':page==='simulator'?'const ids=':'Object.entries(';
  const context={};vm.runInNewContext(script.slice(0,script.indexOf(anchor))+(page==='lab'?'A.en=en;':'')+`;out=${dict}.en`,context);source[page]=context.out;
  for(const [code,data] of Object.entries(additions))for(const [key,value]of Object.entries(context.out)){
    const translated=data[page][key];
    check(typeof translated==='string'&&translated.trim().length>0,`${page}/${code}/${key}: present`);
    check(!/[<>\uFFFD]/.test(translated),`${page}/${code}/${key}: plain UTF-8 text`);
    check(translated.split('|').length===value.split('|').length,`${page}/${code}/${key}: list integrity`);
  }
}
const protectedFunctions={simulator:['maxDD','init','buy','sell','val','total','snap'],lab:['init','buy','sell','val','step','start']};
function functionText(s,name){const start=s.indexOf('function '+name+'(');const end=s.indexOf('function ',start+9);return s.slice(start,end<0?undefined:end).replace(/\r\n/g,'\n');}
for(const [page,file]of specs.filter(([page])=>protectedFunctions[page])){
 const current=fs.readFileSync(path.join(root,file),'utf8');
 for(const name of protectedFunctions[page])check(functionText(current,name)===functionText(originals[file],name),`${page}: ${name} unchanged`);
}
const server=http.createServer((req,res)=>{
 let requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const old=requested.startsWith('/baseline/');if(old)requested=requested.slice(9);
 if(requested.endsWith('/'))requested+='index.html';
 const file=path.resolve(root,'.'+requested);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try {const data=old?originals[requested.slice(1)]:fs.readFileSync(file);if(data===undefined)throw Error('missing');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(data);}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:process.env.CFS_BROWSER_CHANNEL||'msedge',headless:true});
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  for(const [section,file,dict]of specs){
   await page.goto(base+'/'+file);
   const options=await page.locator('#lang option').evaluateAll(es=>es.map(e=>e.value));
   check(JSON.stringify(options)===JSON.stringify(expected),section+': 31 unique languages');
   for(const code of expected){
    await page.selectOption('#lang',code);
    const state=await page.evaluate(()=>({language:document.documentElement.lang,dir:document.documentElement.dir,saved:localStorage.getItem('cfs-lang'),label:document.querySelector('#lang').getAttribute('aria-label'),text:document.body.innerText}));
    check(state.language===code&&state.saved===code&&state.dir===(['ar','fa'].includes(code)?'rtl':'ltr'),section+'/'+code+': switching');
    check(state.label&& !/undefined|\uFFFD/.test(state.text),section+'/'+code+': rendered strings');
    if(additions[code]){
     const actual=await page.evaluate(name=>JSON.parse(JSON.stringify(eval(name)[document.documentElement.lang])),dict);
     const wanted=additions[code][section];
     check(JSON.stringify(Object.values(actual))===JSON.stringify(Object.values(wanted)),section+'/'+code+': complete dictionary');
    }
   }
   await page.reload();check(await page.locator('#lang').inputValue()==='ln',section+': reload persistence');
   const links=await page.locator('a[href]').evaluateAll(es=>es.map(e=>e.href));
   for(const link of links){const response=await context.request.get(link);check(response.ok(),section+': navigation '+link);}
   // Individual missing strings must fall back to English, even after another language.
   await page.selectOption('#lang','fr');
   await page.evaluate(({dict,section})=>{
    const table=eval(dict);const key=section==='main'?'intro':section==='lab'?'title':1;
    delete table.de[key];document.querySelector('#lang').value='de';document.querySelector('#lang').dispatchEvent(new Event('change'));
   },{dict,section});
   const fallbackText=section==='main'?source.main.intro:section==='lab'?source.lab[1]:source[section][1];
   check((await page.locator('body').innerText()).includes(fallbackText),section+': per-string English fallback');
   for(const [stored,result]of [['xx-unknown','en'],['__proto__','en'],['de-DE','de'],['zh-Hant-TW','zh-tw']]){
    await page.evaluate(v=>localStorage.setItem('cfs-lang',v),stored);await page.reload();
    check(await page.locator('#lang').inputValue()===result,section+': stored locale '+stored);
   }
   console.log('PASS '+section+': all 31 languages, navigation and fallbacks');
  }
  // Compare complete simulated state with the baseline, then switch languages mid-session.
  for(const [section,file]of specs.filter(([p])=>['simulator','lab'].includes(p))){
   const snapshot=()=>page.evaluate(section=>section==='lab'?JSON.stringify({wallets,i,displayVol}):JSON.stringify({wallets,multiVals,singleVals}),section);
   await page.goto(base+'/baseline/'+file);await page.click(section==='lab'?'#run':'#runBtn');const original=await snapshot();
   await page.goto(base+'/'+file);await page.click(section==='lab'?'#run':'#runBtn');check(await snapshot()===original,section+': numeric baseline parity');
   if(section==='lab')await page.click('#reveal');
   for(const code of expected){await page.selectOption('#lang',code);check(await snapshot()===original,section+'/'+code+': state preserved');}
   if(section==='lab'){
    check(await page.locator('#log tr').count()===8,'lab: event log preserved');
    check(await page.locator('#links h2').count()===1,'lab: revealed clues preserved');
    await page.click('#reset');await page.click('#next');const partial=await snapshot();await page.selectOption('#lang','de');check(await snapshot()===partial,'lab: partial scenario preserved');
   }else{
    for(const id of ['ts','tm','tt','tg']){await page.click('#'+id);check(await page.locator('section.tab.active').count()===1,'simulator tab '+id);}
    await page.selectOption('#lang','en');
    check((await page.locator('#wallets').innerText()).startsWith('Wallet 1'),'simulator: correct wallet label');
    check((await page.locator('#tx').innerText()).includes('BUY 13'),'simulator: correct BUY label');
   }
  }
  // Follow actual links with a newly added language selected.
  await page.goto(base+'/');await page.selectOption('#lang','sw');
  await page.click('a[href="./practice/"]');await page.click('#launch');await page.click('#lab');await page.click('#home');
  check(await page.locator('#lang').inputValue()==='sw','main -> practice -> simulator -> lab -> main persistence');
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});
  const denied=await blocked.newPage();denied.on('pageerror',e=>errors.push(e.message));
  for(const [,file]of specs){await denied.goto(base+'/'+file);await denied.selectOption('#lang','de');check(await denied.locator('html').getAttribute('lang')==='de','storage denied: '+file);}
  await blocked.close();
  // Translation asset unavailable: existing translations remain usable; new entries fall back.
  await page.route('**/assets/translations.js',route=>route.abort());
  for(const [,file]of specs){await page.goto(base+'/'+file);await page.selectOption('#lang','de');check(!/undefined/.test(await page.locator('body').innerText()),'asset fallback '+file);}
  await page.unroute('**/assets/translations.js');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/');await page.selectOption('#lang','ar');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Arabic mobile layout');
  if(process.env.CFS_SCREENSHOTS){fs.mkdirSync(process.env.CFS_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.CFS_SCREENSHOTS,'arabic-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});await page.goto(base+'/practice/simulator/');await page.selectOption('#lang','de');await page.click('#runBtn');await page.screenshot({path:path.join(process.env.CFS_SCREENSHOTS,'german-simulator.png'),fullPage:true});}
  check(errors.length===0,'Browser errors: '+errors.join('; '));
  console.log('PASS '+checks+' checks; 8 pages × 31 languages; no browser exceptions.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
