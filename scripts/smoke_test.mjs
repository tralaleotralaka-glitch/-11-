/* Дымовой тест: загружает систему в jsdom, открывает Пуск и все приложения, ловит ошибки */
import { JSDOM } from 'jsdom';
import fs from 'fs';

const polyfill = `<script>
window.innerWidth = 1280; window.innerHeight = 800; window.devicePixelRatio = 2;
window.matchMedia = window.matchMedia || (q => ({matches:false, media:q,
  addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}, dispatchEvent(){return false;}}));
window.HTMLCanvasElement.prototype.getContext = function(){
  const self = this;
  return new Proxy({}, { get(t,p){ if(p==='canvas') return self; return typeof p==='string' ? (()=>1) : undefined; }, set(){ return true; } });
};
window.scrollTo = ()=>{};
window.Element.prototype.scrollIntoView = window.Element.prototype.scrollIntoView || function(){};
<\/script>`;

let html = fs.readFileSync('www/index.html', 'utf8');
const files = ['js/data.js','js/icons2.js','js/keyboard.js','js/core.js','js/apps.js','js/store.js','js/settings.js'];
const inline = files.map(f => `<script>\n${fs.readFileSync('www/' + f, 'utf8')}\n<\/script>`).join('\n');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*>\s*<\/script>/g, '');
html = html.replace('</head>', polyfill + '</head>');
html = html.replace('</body>', inline + '</body>');

const dom = new JSDOM(html, {
  url: 'https://appassets.androidplatform.net/assets/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) { /* полифилы уже внутри html */ }
});

const w = dom.window;
const errors = [];
w.addEventListener('error', e => errors.push('window.onerror: ' + e.message));

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(100);
try { w.eval('if(document.readyState!=="loading" && !window.__win11Init){ initSystem(); Power.boot(); }'); } catch(e){ errors.push('manual init: '+e.message); }
await sleep(400);
try { w.eval('Power.enter();'); } catch (e) { errors.push('enter: ' + e.message); }
await sleep(300);

const doc = w.document;
const count = sel => doc.querySelectorAll(sel).length;
console.log('boot скрыт:', doc.querySelector('#boot').classList.contains('hide'));
console.log('локскрин открылся и ушёл:', count('#lock.open') === 0 ? '✓' : 'нет');
console.log('значков на рабочем столе:', count('.dicon'), '(ожидалось 5)');
console.log('кнопок панели задач:', count('#tb-apps .tbtn-tb'));

try {
  doc.querySelector('#tb-start').click();
  await sleep(80);
  console.log('— ПУСК —');
  console.log('  плиток в сетке:', count('#st-grid .st-app'), '(ожидалось 15+)');
  console.log('  плитки:', [...doc.querySelectorAll('#st-grid .st-app span')].map(s=>s.textContent).join(', ') || '(пусто)');
  console.log('  рекомендуем:', count('#st-reco .st-reco-item'));
  doc.querySelector('#st-all').click();
  await sleep(50);
  console.log('  все приложения (список):', count('#st-all-list .st-all-item'));
  doc.querySelector('#st-back').click();
} catch (e) { errors.push('start: ' + (e.stack||e.message)); }

for (const [btn, sel, label] of [['#tb-status','.qs-tile','QS'], ['#tb-clock','.cg-day','календарь'], ['#tb-search','.sp-item','поиск']]) {
  try {
    doc.querySelector(btn).click();
    await sleep(60);
    console.log(`— ${label}:`, count(sel));
  } catch (e) { errors.push(label + ': ' + (e.stack||e.message)); }
}

const apps = ['explorer','edge','store','settings','notepad','calc','photos','bin','taskmgr','weather','clockapp','tasks','snake','mines','music','paint','terminal'];
for (const app of apps) {
  try { w.eval(`WM.open('${app}')`); await sleep(30); }
  catch (e) { errors.push(`open ${app}: ${e.message}`); }
}
await sleep(300);
console.log('открыто окон:', w.eval('WM.wins.size'), '/', apps.length);

try {
  w.eval(`(function(){
    const win=[...WM.wins.values()].find(w=>w.appId==='explorer');
    const side=win.body.querySelector('.ex-side-item[data-p="phone:/"]');
    if(side) side.click();
    return win.body.querySelector('.ex-body').children.length;
  })()`);
  console.log('проводник «Телефон»: ок');
} catch (e) { errors.push('explorer phone: ' + e.message); }

try {
  w.eval(`(function(){
    const win=[...WM.wins.values()].find(w=>w.appId==='settings');
    ['display','sound','power','about','bt','net','person','apps','acc','time','games','access','privacy','update'].forEach(p=>win._nav(p));
  })()`);
  console.log('настройки: все страницы отрисованы');
} catch (e) { errors.push('settings pages: ' + (e.stack||e.message)); }

// Встроенная клавиатура
try {
  w.eval(`document.querySelector('#st-inp').focus()`);
  await sleep(80);
  console.log('— КЛАВИАТУРА —');
  console.log('  открылась при фокусе:', w.eval('KB.visible'));
  w.eval(`['п','р','и','в','е','т'].forEach(c=>KB.press(c))`);
  console.log('  ввод «привет»:', JSON.stringify(w.eval(`document.querySelector('#st-inp').value`)));
  w.eval(`KB.press('bksp')`);
  console.log('  после ⌫:', JSON.stringify(w.eval(`document.querySelector('#st-inp').value`)));
  w.eval(`KB.press('shift'); KB.press('п')`);
  console.log('  ⇧ + п:', JSON.stringify(w.eval(`document.querySelector('#st-inp').value`)));
  w.eval(`KB.press('sym'); KB.press('5')`);
  console.log('  символ 5:', JSON.stringify(w.eval(`document.querySelector('#st-inp').value`)));
  w.eval(`KB.press('lang')`);
  console.log('  переключение языка:', w.eval('KB.lang'));
  console.log('  клавиш на панели:', w.eval(`document.querySelectorAll('#osk .kb-key').length`));
  w.eval(`KB.press('hide')`);
  console.log('  скрылась:', !w.eval('KB.visible'));
} catch (e) { errors.push('kb: ' + (e.stack||e.message)); }

console.log('\n=== ОШИБКИ ===');
console.log(errors.length ? errors.join('\n') : 'нет ✓');
process.exit(errors.length ? 1 : 0);
