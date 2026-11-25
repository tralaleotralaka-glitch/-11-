/* ============ Windows 11 clone — встроенные приложения ============ */
'use strict';

/* ---------- Проводник ---------- */
APPS.explorer.render = function(body, win){
  let cur = 'Этот компьютер';
  const tree = FS;
  const sideItems = [
    {label:'Главная', icon:'home', path:'Этот компьютер'},
    {label:'Галерея', icon:'gallery', path:'Изображения'},
    {label:'Загрузки', icon:'folder', path:'Загрузки'},
    {label:'Документы', icon:'folder', path:'Документы'},
    {label:'Изображения', icon:'folder', path:'Изображения'},
    {label:'Музыка', icon:'folder', path:'Музыка'},
    {label:'Этот компьютер', icon:'pc', path:'Этот компьютер'},
    {label:'Телефон', icon:'phone', path:'phone:/'},
  ];
  body.innerHTML = `
    <div class="ex-root">
      <div class="ex-side">
        ${sideItems.map((s,i)=>`<button class="ex-side-item ${i===0?'on':''}" data-p="${esc(s.path)}">${I[s.icon]}<span>${s.label}</span></button>`).join('')}
        <div class="ex-sep"></div>
        <button class="ex-side-item" data-p="C:">${I.pc}<span>Локальный диск (C:)</span></button>
        <button class="ex-side-item" data-p="D:">${I.pc}<span>Данные (D:)</span></button>
      </div>
      <div class="ex-main">
        <div class="ex-toolbar">
          <button class="ex-navbtn nav-back" title="Назад">${I.back}</button>
          <button class="ex-navbtn nav-fwd" title="Вперёд" disabled>${I.fwd}</button>
          <button class="ex-navbtn nav-up" title="Вверх">${I.fwd}</button>
          <div class="ex-crumb"></div>
        </div>
        <div class="ex-body"></div>
        <div class="ex-status"><span class="ex-count"></span></div>
      </div>
    </div>`;
  const backStack=[], fwdStack=[];
  const crumb = body.querySelector('.ex-crumb');
  const bodyEl = body.querySelector('.ex-body');

  function childrenOf(path){
    /* реальные файлы телефона через мост AndroidBridge */
    if(path === 'phone:/' || path.startsWith('phone:/')){
      const r = Bridge.list(path);
      if(r && r.ok) return r.items.map(it=>({name:it.n, raw:it.p, kind:it.d?'folder':'file', real:true}));
      const msg = r && r.error === 'permission'
        ? 'Разрешите доступ к файлам и перезапустите'
        : 'Файлы телефона доступны в APK-приложении';
      return [{name:msg, raw:'__info__', kind:'file'}];
    }
    const node = tree[path];
    if(!node) return [];
    if(node.type==='root') return node.children.map(c=>({name:c==='C:'?'Локальный диск (C:)':c==='D:'?'Данные (D:)':c, raw:c, kind:'drive'}));
    return (node.children||[]).map(c=>{
      const n = tree[c];
      if(!n) return {name:c, raw:c, kind:'file'};
      if(n.type==='drive') return {name:n.name, raw:c, kind:'drive'};
      if(n.type==='folder') return {name:c, raw:c, kind:'folder'};
      return {name:c, raw:c, kind:'file'};
    });
  }

  function render(){
    const kids = childrenOf(cur);
    /* хлебные крошки: телефон */
    if(cur === 'phone:/' || cur.startsWith('phone:/')){
      const parts = [`<span class="crumb-part" data-p="phone:/">Телефон</span>`];
      const rel = cur === 'phone:/' ? '' : cur.slice(8);
      if(rel){
        const segs = rel.split('/').filter(Boolean);
        segs.forEach((seg, i)=>{
          const p = 'phone:/' + segs.slice(0, i+1).join('/');
          parts.push(`<span class="crumb-sep">›</span><span class="crumb-part" data-p="${esc(p)}">${esc(seg)}</span>`);
        });
      }
      crumb.innerHTML = parts.join('');
    } else if(cur==='Этот компьютер'){
      crumb.innerHTML = `<span class="crumb-part">Этот компьютер</span>`;
    } else if(tree[cur] && tree[cur].type==='drive'){
      crumb.innerHTML = `<span class="crumb-part" data-p="Этот компьютер">Этот компьютер</span><span class="crumb-sep">›</span><span class="crumb-part">${esc(tree[cur].name)}</span>`;
    } else if(cur==='Пользователи'){
      crumb.innerHTML = `<span class="crumb-part" data-p="Этот компьютер">Этот компьютер</span><span class="crumb-sep">›</span><span class="crumb-part" data-p="C:">Локальный диск (C:)</span><span class="crumb-sep">›</span><span class="crumb-part">Пользователи</span>`;
    } else {
      const parts = [`<span class="crumb-part" data-p="Этот компьютер">Этот компьютер</span><span class="crumb-sep">›</span><span class="crumb-part" data-p="C:">Локальный диск (C:)</span><span class="crumb-sep">›</span><span class="crumb-part" data-p="Пользователь">Пользователь</span>`];
      if(cur!=='Пользователь') parts.push(`<span class="crumb-sep">›</span><span class="crumb-part">${esc(cur)}</span>`);
      crumb.innerHTML = parts.join('');
    }
    crumb.querySelectorAll('.crumb-part[data-p]').forEach(p=>{
      p.addEventListener('click', ()=>navigate(p.dataset.p));
    });
    const iconFor = k=>{
      if(k.kind==='drive') return I.pc;
      if(k.kind==='folder') return I.folder;
      if(k.real){
        const n = k.name.toLowerCase();
        if(/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return I.photos;
        if(n.endsWith('.apk')) return I.apk;
        if(/\.(mp3|wav|ogg|flac)$/.test(n)) return I.music;
        return I.file;
      }
      if(tree[k.raw] && tree[k.raw].content==='[аудио] Откройте Медиаплеер.') return I.music;
      if(k.raw && k.raw.endsWith('.apk')) return I.apk;
      return I.file;
    };
    bodyEl.innerHTML = kids.length ? kids.map((k,i)=>{
      const ic = iconFor(k);
      return `<button class="ex-item" data-i="${i}" data-kind="${k.kind}" data-raw="${esc(k.raw)}">${ic}<span>${esc(k.name)}</span></button>`;
    }).join('') : `<div class="ex-empty">Эта папка пуста</div>`;
    body.querySelector('.ex-count').textContent = `Элементов: ${kids.length}`;
    bodyEl.querySelectorAll('.ex-item').forEach(it=>{
      it.addEventListener('click', ()=>{ bodyEl.querySelectorAll('.ex-item.sel').forEach(x=>x.classList.remove('sel')); it.classList.add('sel'); });
      it.addEventListener('dblclick', ()=>openItem(it.dataset.raw, it.dataset.kind));
    });
  }

  function openItem(raw, kind){
    if(raw === '__info__'){
      toast('Проводник', 'Реальные файлы телефона (Download, DCIM…) доступны в APK: выдайте разрешение на хранилище', 'phone');
      return;
    }
    /* открытие реальных файлов с телефона */
    if(raw.startsWith('phone:/')){
      const n = raw.split('/').pop();
      const ext = n.includes('.') ? n.split('.').pop().toLowerCase() : '';
      if(kind === 'folder' || !ext){ navigate(raw); return; }
      if(['jpg','jpeg','png','gif','webp','bmp'].includes(ext)){
        const r = Bridge.readB64(raw);
        if(r && r.ok) WM.open('photos', {dataUrl:`data:${r.mime};base64,${r.b64}`, name:n});
        else toast('Проводник', 'Не удалось открыть «'+n+'»', 'phone');
      } else if(['txt','log','md','json','xml','csv'].includes(ext)){
        const r = Bridge.readText(raw);
        if(r && r.ok) WM.open('notepad', {name:n, content:r.text});
        else toast('Проводник', 'Не удалось прочитать «'+n+'»', 'phone');
      } else if(['mp3','wav','ogg','flac'].includes(ext)){
        toast('Медиаплеер', 'Воспроизведение файлов телефона — в следующей версии', 'music');
      } else if(ext === 'apk'){
        toast(n, 'Это APK-файл. Устанавливайте его через проводник Android', 'apk');
      } else {
        toast(n, 'Нет приложения для открытия этого типа файла', 'file');
      }
      return;
    }
    if(kind==='drive'||kind==='folder'){ navigate(raw); return; }
    if(raw.endsWith('.txt')){
      const node = tree[raw];
      WM.open('notepad', {name:raw, content:node?node.content:''});
      return;
    }
    if(raw.endsWith('.jpg')){
      const photos = ['bloom','bloom-light','aurora','peaks'];
      const idx = photos.indexOf(raw.replace('.jpg',''));
      const gIdx = PHOTO_GRADS.findIndex(p=>p.name===raw);
      const src = idx>=0 ? WALLPAPERS[idx].url : (gIdx>=0 ? PHOTO_GRADS[gIdx].url : PHOTO_GRADS[0].url);
      WM.open('photos', {src});
      return;
    }
    if(raw.endsWith('.mp3')){
      WM.open('music');
      return;
    }
    const node = tree[raw];
    toast(raw, node ? (node.content||'Нет данных') : 'Нет данных', 'file');
  }

  function navigate(path){
    backStack.push(cur); fwdStack.length=0;
    cur=path; render();
    body.querySelectorAll('.ex-side-item').forEach(s=>s.classList.toggle('on', s.dataset.p===path || (s.dataset.p==='phone:/' && path.startsWith('phone:/'))));
  }
  body.querySelectorAll('.ex-side-item').forEach(s=>{
    s.addEventListener('click', ()=>{
      body.querySelectorAll('.ex-side-item').forEach(x=>x.classList.remove('on'));
      s.classList.add('on');
      navigate(s.dataset.p);
    });
  });
  body.querySelector('.nav-back').addEventListener('click', ()=>{ if(backStack.length){ fwdStack.push(cur); cur=backStack.pop(); render(); } });
  body.querySelector('.nav-up').addEventListener('click', ()=>{
    if(cur.startsWith('phone:/')){
      if(cur==='phone:/') return;
      const rel = cur.slice(8);
      const idx = rel.lastIndexOf('/');
      navigate(idx<0 ? 'phone:/' : 'phone:/'+rel.slice(0, idx));
      return;
    }
    const node = tree[cur];
    if(cur==='Этот компьютер') return;
    if(node&&node.type==='drive') navigate('Этот компьютер');
    else if(['Документы','Изображения','Музыка','Загрузки'].includes(cur)) navigate('Пользователь');
    else if(cur==='Пользователь') navigate('Пользователи');
    else if(cur==='Пользователи'||cur==='Программы'||cur==='Windows') navigate('C:');
    else navigate('Этот компьютер');
  });
  bodyEl.addEventListener('contextmenu', e=>{
    e.preventDefault();
    Ctx.build([
      {label:'Обновить', icon:I.refresh, action:render},
      {label:'Создать текстовый документ', icon:I.notepad, action:()=>WM.open('notepad',{fresh:true})},
    ], e.clientX, e.clientY);
  });
  render();
  /* компактный сайдбар по ширине окна */
  const applyCompact = ()=>{
    const root = body.querySelector('.ex-root');
    if(root) root.classList.toggle('compact', win.el.clientWidth < 700);
  };
  applyCompact();
  win.timers.push(setInterval(applyCompact, 400));
};

/* ---------- Microsoft Edge ---------- */
APPS.edge.render = function(body, win){
  const tabs = [{title:'Новая вкладка', page:'start', hist:[{title:'Новая вкладка', page:'start'}], hi:0}];
  let cur = 0;
  const pushState = (t, st)=>{
    t.hist = (t.hist||[]).slice(0, (t.hi??0)+1);
    t.hist.push(st); t.hi = t.hist.length-1;
  };
  body.innerHTML = `<div class="eg-root">
    <div class="eg-tabs"><div class="eg-tablist" style="display:flex;gap:2px"></div><button class="eg-newtab">${I.apps}</button></div>
    <div class="eg-bar">
      <button class="ex-navbtn eg-back" title="Назад">${I.back}</button>
      <button class="ex-navbtn eg-fwd" title="Вперёд">${I.fwd}</button>
      <button class="ex-navbtn eg-rel" title="Обновить">${I.reload}</button>
      <div class="eg-url">${I.lock}<input type="text" placeholder="Поиск или введите веб-адрес" spellcheck="false"></div>
      <button class="ex-navbtn" title="Избранное">${I.star}</button>
    </div>
    <div class="eg-page"></div>
  </div>`;
  const tablist = body.querySelector('.eg-tablist');
  const urlInp = body.querySelector('.eg-url input');
  const page = body.querySelector('.eg-page');

  function renderTabs(){
    tablist.innerHTML = tabs.map((t,i)=>`
      <button class="eg-tab ${i===cur?'on':''}" data-i="${i}">
        <span class="eg-tt">${esc(t.title)}</span>
        <span class="eg-x" data-x="${i}"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.4"/></svg></span>
      </button>`).join('');
    tablist.querySelectorAll('.eg-tab').forEach(tb=>{
      tb.addEventListener('click', e=>{
        if(e.target.closest('.eg-x')) return;
        cur = +tb.dataset.i; renderTabs(); renderPage();
      });
      const x = tb.querySelector('.eg-x');
      x.addEventListener('click', e=>{
        e.stopPropagation();
        tabs.splice(+x.dataset.x,1);
        if(!tabs.length){ WM.close(win.id); return; }
        cur = Math.min(cur, tabs.length-1);
        renderTabs(); renderPage();
      });
    });
  }

  function startPageHTML(){
    return `<div class="eg-start">
      <div class="eg-logo">Edge <b>Web</b></div>
      <div class="eg-search">${I.search}<input type="text" placeholder="Поиск в Интернете" spellcheck="false"></div>
      <div class="eg-links">
        ${[['MSN','#4C7BD9','M'],['Wikipedia','#5A5A5A','W'],['GitHub','#24292F','G'],['Windows','#0078D4','W'],['YouTube','#C4302B','▶'],['Почта','#0B64C0','✉']].map(l=>`
          <button class="eg-link" data-name="${l[0]}"><span class="el-ico" style="background:${l[1]}">${l[2]}</span><span>${l[0]}</span></button>`).join('')}
      </div>
    </div>`;
  }

  function docHTML(title, lines){
    return `<div class="eg-doc"><h1>${title}</h1>${lines.map(l=>l.startsWith('# ')?`<h2>${l.slice(2)}</h2>`:`<p>${l}</p>`).join('')}</div>`;
  }

  function searchResults(q){
    const items = [
      {url:`https://search.example.com/?q=${encodeURIComponent(q)}`, title:`${q} — все результаты`, desc:'Полнотекстовый поиск по индексу демо-браузера. Результаты сгенерированы локально.'},
      {url:'https://wikipedia.org', title:`${q} — Википедия`, desc:'Свободная энциклопедия, доступная на более чем 300 языках.'},
      {url:'https://microsoft.com/windows', title:'Windows 11 — официальный сайт', desc:'Узнайте о новинках Windows 11: новый дизайн, меню Пуск, Microsoft Store.'},
      {url:'https://github.com', title:`github.com: ${q}`, desc:'Миллионы репозиториев с открытым исходным кодом.'},
    ];
    return `<div class="eg-doc" style="max-width:680px"><div style="font-size:13px;color:var(--txt2);margin-bottom:14px">Примерно 1 240 000 результатов (0,32 сек.)</div>`+
      items.map(r=>`<div class="eg-res-item"><div class="rg-url">${r.url}</div><div class="rg-title">${esc(r.title)}</div><div class="rg-desc">${esc(r.desc)}</div></div>`).join('')+`</div>`;
  }

  function renderPage(){
    const t = tabs[cur];
    urlInp.value = t.url||'';
    if(t.page==='start'){
      page.innerHTML = startPageHTML();
      const inp = page.querySelector('.eg-search input');
      inp.addEventListener('keydown', e=>{ if(e.key==='Enter' && inp.value.trim()) navigate(inp.value.trim()); });
      page.querySelectorAll('.eg-link').forEach(l=>{
        l.addEventListener('click', ()=>openDoc(l.dataset.name));
      });
    } else if(t.page==='doc'){
      page.innerHTML = t.html;
    } else if(t.page==='results'){
      page.innerHTML = searchResults(t.query);
    } else if(t.page==='ext'){
      page.innerHTML = `<div class="eg-err"><h2>Не удалось открыть страницу</h2><p>${esc(t.url||'')}<br>Внешние сайты недоступны в демо-версии без подключения к Интернету.</p></div>`;
    }
    page.scrollTop = 0;
  }

  function openDoc(name){
    const docs = {
      'MSN': docHTML('MSN Новости', ['# Главные новости','Сегодня облачно с прояснениями, температура около +2°C.','Смотрите также: Погода в приложении «Погода».']),
      'Wikipedia': docHTML('Wikipedia — свободная энциклопедия', ['Википедия — общедоступная многоязычная универсальная интернет-энциклопедия со свободным контентом.','# Windows 11','Windows 11 — операционная система семейства Windows NT, разработанная корпорацией Microsoft.','Ключевые особенности: скруглённые углы окон, центрированная панель задач, меню Пуск с закреплёнными приложениями, виджеты и Microsoft Store нового поколения.']),
      'GitHub': docHTML('GitHub', ['GitHub — крупнейшая платформа для хостинга IT-проектов и совместной разработки с использованием Git.','# Этот проект','Данный клон Windows 11 написан на чистом HTML/CSS/JS и собран в APK через GitHub Actions.']),
      'Windows': docHTML('Windows 11', ['# Что нового в Windows 11','— Новый дизайн в стиле Fluent','— Центрированная панель задач','— Быстрые действия: Wi-Fi, Bluetooth, яркость и громкость','— Microsoft Store: приложения, игры, фильмы','— Снап-макеты для окон','Попробуйте: нажмите на кнопку «Пуск» внизу экрана.']),
      'YouTube': docHTML('YouTube', ['Видеохостинг. В демо-версии видео недоступны — нет подключения к сети.']),
      'Почта': docHTML('Почта', ['Входящие (0) — новых писем нет.']),
    };
    const html = docs[name] || docHTML(name, ['Страница не найдена.']);
    const st = {title:name, page:'doc', html, url:name.toLowerCase()+'.example'};
    pushState(tabs[cur], st); Object.assign(tabs[cur], st);
    renderTabs(); renderPage();
  }

  function navigate(q){
    const looksUrl = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(q);
    const st = looksUrl
      ? {title:q, page:'ext', url:q}
      : {title:q, page:'results', query:q, url:'поиск: '+q};
    pushState(tabs[cur], st); Object.assign(tabs[cur], st);
    renderTabs(); renderPage();
  }
  win._edgeNavigate = navigate;

  body.querySelector('.eg-newtab').addEventListener('click', ()=>{ tabs.push({title:'Новая вкладка', page:'start'}); cur=tabs.length-1; renderTabs(); renderPage(); });
  urlInp.addEventListener('keydown', e=>{ if(e.key==='Enter' && urlInp.value.trim()) navigate(urlInp.value.trim()); });
  body.querySelector('.eg-back').addEventListener('click', ()=>{
    const t = tabs[cur];
    if(t.hi > 0){ t.hi--; Object.assign(t, t.hist[t.hi]); renderTabs(); renderPage(); }
  });
  body.querySelector('.eg-fwd').addEventListener('click', ()=>{
    const t = tabs[cur];
    if(t.hist && t.hi < t.hist.length-1){ t.hi++; Object.assign(t, t.hist[t.hi]); renderTabs(); renderPage(); }
  });
  body.querySelector('.eg-rel').addEventListener('click', ()=>{ renderPage(); });
  renderTabs(); renderPage();
};
APPS.edge.onArgs = function(win, args){
  if(args && args.query && win._edgeNavigate){ WM.focus(win.id); win._edgeNavigate(args.query); }
};

/* ---------- Блокнот ---------- */
APPS.notepad.render = function(body, win){
  body.innerHTML = `<div class="np-root">
    <div class="np-menu">
      <button data-m="file">Файл</button><button data-m="edit">Правка</button><button data-m="fmt">Вид</button>
      <span style="flex:1"></span>
      <button class="np-save" style="color:var(--acc)">Сохранить</button>
    </div>
    <textarea class="np-area" spellcheck="false" placeholder="Начните вводить текст..."></textarea>
    <div class="np-status"><span class="np-count"></span><span>UTF-8</span><span>Windows (CRLF)</span></div>
  </div>`;
  const ta = body.querySelector('.np-area');
  const count = body.querySelector('.np-count');
  ta.value = win.args && win.args.content!=null ? win.args.content : S.data.notepadText;
  const upd = ()=>{ count.textContent = `Символов: ${ta.value.length}`; };
  upd();
  ta.addEventListener('input', ()=>{ upd(); S.data.notepadText = ta.value; S.changed(); });
  body.querySelector('.np-save').addEventListener('click', ()=>{
    S.data.notepadText = ta.value; S.changed();
    toast('Блокнот', 'Файл сохранён в памяти устройства', 'notepad');
  });
  body.querySelectorAll('.np-menu button[data-m]').forEach(b=>{
    b.addEventListener('click', e=>{
      e.stopPropagation();
      const r = b.getBoundingClientRect();
      if(b.dataset.m==='file'){
        Ctx.build([
          {label:'Создать', action:()=>{ ta.value=''; upd(); }},
          {label:'Сохранить', action:()=>{ S.data.notepadText=ta.value; S.changed(); toast('Блокнот','Сохранено','notepad'); }},
          '-',
          {label:'Выход', action:()=>WM.close(win.id)},
        ], r.left, r.bottom+2);
      } else if(b.dataset.m==='edit'){
        Ctx.build([
          {label:'Выделить всё', action:()=>{ ta.focus(); ta.select(); }},
          {label:'Вставить дату и время', action:()=>{ ta.value += '\n'+new Date().toLocaleString('ru-RU'); upd(); }},
        ], r.left, r.bottom+2);
      } else {
        Ctx.build([
          {label:'Крупный шрифт', action:()=>ta.style.fontSize='18px'},
          {label:'Обычный шрифт', action:()=>ta.style.fontSize='14px'},
        ], r.left, r.bottom+2);
      }
    });
  });
};
APPS.notepad.onArgs = function(win, args){
  if(args && args.name){
    win.el.querySelector('.t-title').textContent = args.name+' — Блокнот';
    const ta = win.body.querySelector('.np-area');
    if(ta){ ta.value = args.content!=null ? args.content : ta.value; ta.dispatchEvent(new Event('input')); }
  } else if(args && args.fresh){
    const ta = win.body.querySelector('.np-area');
    if(ta){ ta.value=''; ta.dispatchEvent(new Event('input')); }
  }
};

/* ---------- Калькулятор ---------- */
APPS.calc.render = function(body, win){
  body.innerHTML = `<div class="cl-root">
    <div class="cl-top">Стандартный</div>
    <div class="cl-mode">Обычный</div>
    <div class="cl-disp"><div class="cl-expr"></div><div class="cl-main">0</div></div>
    <div class="cl-grid">
      ${['%','CE','C','⌫','1/x','x²','√x','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0',',','='].map(b=>`<button class="cl-btn ${'÷×−+'.includes(b)&&b.length===1?'fn':''} ${['%','CE','C','⌫','1/x','x²','√x'].includes(b)?'fn':''} ${b==='='?'eq':''}" data-b="${b}">${b}</button>`).join('')}
    </div></div>`;
  const main = body.querySelector('.cl-main'), expr = body.querySelector('.cl-expr');
  let cur='0', acc=null, op=null, fresh=true;
  const fmt = n=>{ if(!isFinite(n)) return 'Деление на ноль невозможно'; const s=(+n.toPrecision(12)).toString().replace('.',','); return s.length>14?(+n.toPrecision(9)).toString():s; };
  function show(){ main.textContent = cur; main.style.fontSize = cur.length>9?'26px':'44px'; }
  function calc(){
    const a=acc, b=parseFloat(cur.replace(',','.'));
    if(op==='÷'&&b===0){ return NaN; }
    return op==='+'?a+b : op==='−'?a-b : op==='×'?a*b : b;
  }
  function setOp(o){
    const v = parseFloat(cur.replace(',','.')) || 0;
    if(acc!==null && op && !fresh){ const r=calc(); if(isNaN(r)){ cur='Деление на ноль невозможно'; fresh=true; acc=null; op=null; expr.textContent=''; show(); return; } acc=r; }
    else acc = v;
    op=o; fresh=true;
    cur = fmt(acc); expr.textContent = fmt(acc)+' '+o;
    show();
  }
  function eq(){
    if(acc===null||!op){ expr.textContent=''; return; }
    const r = calc();
    expr.textContent = `${fmt(acc)} ${op} ${cur} =`;
    if(isNaN(r)){ cur='Деление на ноль невозможно'; }
    else cur = fmt(r);
    acc=null; op=null; fresh=true;
    show();
  }
  body.querySelectorAll('.cl-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const k = b.dataset.b;
      if(k>='0'&&k<='9'){ if(fresh||cur==='0'){cur=k;fresh=false;} else cur+=k; }
      else if(k===','){ if(fresh){cur='0,';fresh=false;} else if(!cur.includes(',')) cur+=k; }
      else if(k==='C'){ cur='0'; acc=null; op=null; fresh=true; expr.textContent=''; }
      else if(k==='CE'){ cur='0'; fresh=true; }
      else if(k==='⌫'){ if(!fresh) cur=cur.length>1?cur.slice(0,-1):'0'; }
      else if(k==='±'){ cur = cur.startsWith('-')?cur.slice(1):'-'+cur; }
      else if(k==='x²'){ cur=fmt(parseFloat(cur.replace(',','.'))**2); fresh=true; }
      else if(k==='√x'){ cur=fmt(Math.sqrt(parseFloat(cur.replace(',','.')))); fresh=true; }
      else if(k==='1/x'){ const v=parseFloat(cur.replace(',','.')); cur=v===0?'Деление на ноль невозможно':fmt(1/v); fresh=true; }
      else if(k==='%'){ cur=fmt(parseFloat(cur.replace(',','.'))/100); fresh=true; }
      else if(k==='='){ eq(); }
      else { setOp(k); }
      if(k!=='=') show(); else show();
      main.style.fontSize = cur.length>9?'26px':'44px';
    });
  });
};

/* ---------- Paint ---------- */
APPS.paint.render = function(body, win){
  const colors = ['#000000','#7F7F7F','#C42B1C','#E81123','#FF8C00','#F8C842','#107C10','#16C60C','#0078D4','#00B7C3','#744DA9','#C239B3','#8E5B2F','#FFFFFF'];
  body.innerHTML = `<div class="pt-root">
    <div class="pt-toolbar">
      <span style="font-size:12px;color:var(--txt2)">Размер:</span>
      <div class="pt-sizes">${[3,7,14,26].map((s,i)=>`<button class="pt-size ${i===1?'on':''}" data-s="${s}"><i style="width:${Math.min(s+3,18)}px;height:${Math.min(s+3,18)}px"></i></button>`).join('')}</div>
      <span style="width:1px;height:22px;background:var(--stroke)"></span>
      <div class="pt-colors">${colors.map((c,i)=>`<button class="pt-c ${i===0?'on':''}" data-c="${c}" style="background:${c};${c==='#FFFFFF'?'border:1px solid var(--stroke2)':''}"></button>`).join('')}</div>
      <span style="flex:1"></span>
      <button class="btn small pt-eraser">Ластик</button>
      <button class="btn small pt-clear">Очистить</button>
    </div>
    <div class="pt-canvas-wrap"><canvas class="pt-canvas" width="1200" height="800"></canvas></div>
  </div>`;
  const canvas = body.querySelector('.pt-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.lineCap='round'; ctx.lineJoin='round';
  let color='#000000', size=7, eraser=false, drawing=false, lx, ly;
  function fit(){
    const wrap = body.querySelector('.pt-canvas-wrap');
    const w = Math.min(1200, Math.max(400, wrap.clientWidth-30));
    const h = Math.min(800, Math.max(300, wrap.clientHeight-30));
    const img = ctx.getImageData(0,0,canvas.width,canvas.height);
    canvas.width=w; canvas.height=h;
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
    ctx.putImageData(img, 0, 0);
  }
  win.timers.push(setInterval(fit, 600));
  setTimeout(fit, 60);
  canvas.addEventListener('pointerdown', e=>{
    drawing=true; canvas.setPointerCapture(e.pointerId);
    const r=canvas.getBoundingClientRect();
    lx=(e.clientX-r.left)*canvas.width/r.width; ly=(e.clientY-r.top)*canvas.height/r.height;
    ctx.beginPath(); ctx.fillStyle=eraser?'#fff':color;
    ctx.arc(lx,ly,size/2,0,7); ctx.fill();
  });
  canvas.addEventListener('pointermove', e=>{
    if(!drawing) return;
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)*canvas.width/r.width, y=(e.clientY-r.top)*canvas.height/r.height;
    ctx.strokeStyle=eraser?'#fff':color; ctx.lineWidth=size;
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(x,y); ctx.stroke();
    lx=x; ly=y;
  });
  canvas.addEventListener('pointerup', ()=>drawing=false);
  body.querySelectorAll('.pt-size').forEach(b=>b.addEventListener('click', ()=>{
    body.querySelectorAll('.pt-size').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); size=+b.dataset.s;
  }));
  body.querySelectorAll('.pt-c').forEach(b=>b.addEventListener('click', ()=>{
    body.querySelectorAll('.pt-c').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); color=b.dataset.c; eraser=false;
    body.querySelector('.pt-eraser').classList.remove('acc');
  }));
  body.querySelector('.pt-eraser').addEventListener('click', e=>{ eraser=!eraser; e.currentTarget.classList.toggle('acc', eraser); });
  body.querySelector('.pt-clear').addEventListener('click', ()=>{ ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); });
};

/* ---------- Фотографии ---------- */
APPS.photos.render = function(body, win, args){
  const items = [...WALLPAPERS.map(w=>({name:w.name, url:w.url, wallpaper:w.id})), ...PHOTO_GRADS.map(g=>({name:g.name, url:g.url}))];
  let viewing = args && args.src ? items.findIndex(i=>i.url===args.src) : -1;
  if(viewing<0 && args && args.src) items.push({name:'Изображение.jpg', url:args.src});
  if(args && args.dataUrl){ items.push({name:args.name||'Изображение.jpg', url:args.dataUrl}); viewing = items.length-1; }
  function renderGrid(){
    body.innerHTML = `<div class="ph-root">
      <div class="ph-toolbar"><span class="tb-title">Коллекция</span><span style="flex:1"></span><span>${items.length} элементов</span></div>
      <div class="ph-grid">${items.map((it,i)=>`<div class="ph-item" data-i="${i}"><img src="${it.url}" alt="${esc(it.name)}" loading="lazy"></div>`).join('')}</div>
    </div>`;
    body.querySelectorAll('.ph-item').forEach(p=>p.addEventListener('click', ()=>{
      viewing=+p.dataset.i; renderView();
    }));
  }
  function renderView(){
    const it = items[viewing];
    body.innerHTML = `<div class="ph-root">
      <div class="ph-view" style="position:relative">
        <button class="btn small ph-back">${I.back} Назад</button>
        <img src="${it.url}">
        <div class="ph-vbar">
          <button class="btn small ph-prev">‹</button>
          <span style="font-size:12.5px">${esc(it.name)} (${viewing+1}/${items.length})</span>
          <button class="btn small ph-next">›</button>
          ${it.wallpaper?'<button class="btn small acc ph-wall">Сделать фоном</button>':''}
        </div>
      </div>
    </div>`;
    body.querySelector('.ph-back').addEventListener('click', renderGrid);
    body.querySelector('.ph-prev').addEventListener('click', ()=>{ viewing=(viewing-1+items.length)%items.length; renderView(); });
    body.querySelector('.ph-next').addEventListener('click', ()=>{ viewing=(viewing+1)%items.length; renderView(); });
    const wbtn = body.querySelector('.ph-wall');
    if(wbtn) wbtn.addEventListener('click', ()=>{ S.data.wallpaper=it.wallpaper; S.changed(); applyWallpaper(); toast('Фотографии','Обои изменены: '+it.name,'photos'); });
  }
  if(viewing>=0) renderView(); else renderGrid();
};

/* ---------- Терминал ---------- */
APPS.terminal.render = function(body, win){
  body.innerHTML = `<div class="tm-root"><div class="tm-out"></div>
    <div class="tm-in"><span>PS C:\\Users\\Пользователь&gt;</span><input type="text" spellcheck="false" autocomplete="off"></div></div>`;
  const out = body.querySelector('.tm-out');
  const inp = body.querySelector('.tm-in input');
  const print = (t, cls)=>{ const d=document.createElement('div'); if(cls)d.className=cls; d.textContent=t; out.appendChild(d); out.scrollTop=out.scrollHeight; };
  print('Windows 11 Terminal [Версия 10.0.22631.4460]', 'tm-info');
  print('(c) Корпорация Майкрософт. Все права защищены.', 'tm-info');
  print('');
  print('Введите "help" для списка команд.');
  print('');
  let busy=false;
  inp.addEventListener('keydown', e=>{
    if(e.key!=='Enter' || !inp.value.trim() || busy) return;
    const line = inp.value.trim(); inp.value='';
    print('PS C:\\Users\\Пользователь> '+line, 'tm-cmd');
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    switch(cmd.toLowerCase()){
      case 'help':
        print('Доступные команды:');
        ['help        — этот список','ver         — версия Windows','systeminfo  — информация о системе','echo <текст> — вывести текст','dir         — содержимое текущей папки','cd <папка>  — сменить папку (пусто — вверх)','tree        — дерево папок','date/time   — дата и время','whoami      — текущий пользователь','ipconfig    — сетевые настройки','ping <хост> — проверить соединение','color <hex> — цвет текста (например a)','cls         — очистить экран','shutdown /s — выключить','shutdown /r — перезагрузить','exit        — закрыть терминал'].forEach(l=>print(' '+l));
        break;
      case 'ver': print('Microsoft Windows [Version 10.0.22631.4460]'); break;
      case 'systeminfo':
        ['Имя узла:                DESKTOP-ARENA11','Название ОС:             Microsoft Windows 11 Pro','Версия ОС:               10.0.22631 Н/Д построение 22631','Изготовитель системы:    Arena Systems','Тип системы:             x64-based PC','Процессор:               Intel Core i5-12400, 2.50 ГГц','Полный объём физической памяти: 16 384 МБ','Доступная физическая память: 10 890 МБ'].forEach(l=>print(l));
        break;
      case 'echo': print(arg||''); break;
      case 'dir':
        print(' Том в устройстве C имеет метку OS\n Серийный номер тома: 11A2-B33C\n\n Содержимое папки C:\\Users\\Пользователь\n');
        ['Документы','Изображения','Музыка','Загрузки','Заметки.txt','Список дел.txt'].forEach(n=>print(n.includes('.')?'    Файл     '+n : '    Папка    '+n));
        print('\n               6 файлов / папок');
        break;
      case 'cd': print(arg? 'C:\\Users\\Пользователь\\'+arg : 'C:\\Users\\Пользователь'); break;
      case 'tree':
        ['C:.','├── Пользователи','│   └── Пользователь','│       ├── Документы','│       ├── Изображения','│       ├── Музыка','│       └── Загрузки','├── Программы','└── Windows'].forEach(l=>print(l));
        break;
      case 'date': print('Текущая дата: '+new Date().toLocaleDateString('ru-RU')); break;
      case 'time': print('Текущее время: '+new Date().toLocaleTimeString('ru-RU')); break;
      case 'whoami': print('desktop-arena11\\пользователь'); break;
      case 'ipconfig':
        print('Настройка протокола IP для Windows\n\nEthernet adapter Ethernet:');
        ['   IPv4-адрес. . . . . . . . . . . . : 192.168.1.42','   Маска подсети . . . . . . . . . . : 255.255.255.0','   Основной шлюз . . . . . . . . . . : 192.168.1.1'].forEach(l=>print(l));
        break;
      case 'ping': {
        const host = arg||'localhost';
        print(`Обмен пакетами с ${host} [93.184.216.34] с 32 байтами данных:`);
        busy=true; let i=0;
        const t = setInterval(()=>{
          i++;
          print(`Ответ от 93.184.216.34: число байт=32 время=${20+Math.floor(Math.random()*25)}мс TTL=118`);
          if(i>=4){ clearInterval(t); busy=false; print(''); print('Статистика: отправлено = 4, получено = 4, потеряно = 0 (0% потерь)'); }
        }, 420);
        win.timers.push(t);
        break;
      }
      case 'color':
        if(/^([0-9a-f])$/i.test(arg)){ const map={a:'#16C60C',b:'#3B78FF',c:'#E81123',d:'#CE50E8',e:'#F8C842',f:'#FFFFFF'}; out.style.color = map[arg.toLowerCase()]||'#CCCCCC'; print('Цвет текста изменён.'); }
        else print('Использование: color a', 'tm-err');
        break;
      case 'cls': out.innerHTML=''; break;
      case 'shutdown':
        if(arg.includes('/r')){ print('Перезагрузка...', 'tm-ok'); setTimeout(()=>Power.restart(), 800); }
        else if(arg.includes('/s')){ print('Завершение работы...', 'tm-ok'); setTimeout(()=>Power.shutdown(), 800); }
        else print('Использование: shutdown /s | /r', 'tm-err');
        break;
      case 'exit': WM.close(win.id); break;
      default: print(`"${cmd}" не является внутренней или внешней командой.\nВведите help для списка команд.`, 'tm-err');
    }
    print('');
  });
  setTimeout(()=>inp.focus(), 100);
};

/* ---------- Змейка ---------- */
APPS.snake.render = function(body, win){
  body.innerHTML = `<div class="sn-root">
    <div class="sn-head"><span>Счёт: <b class="sc">0</b></span><span>Рекорд: <b class="rc">${localStorage.getItem('win11.snakeHi')||0}</b></span></div>
    <div class="sn-wrap"><canvas class="sn-canvas" width="360" height="360"></canvas>
      <div class="sn-over" style="display:none"><span style="font-size:22px">Игра окончена</span><span class="sn-final" style="font-size:14px;font-weight:400"></span><button class="btn acc sn-again">Играть снова</button></div>
    </div>
    <div class="sn-dpad">
      <button class="empty"></button><button data-d="u">▲</button><button class="empty"></button>
      <button data-d="l">◀</button><button data-d="d">▼</button><button data-d="r">▶</button>
    </div>
    <div style="font-size:11.5px;color:var(--txt2)">Стрелки / WASD или свайпы по полю</div>
  </div>`;
  const cv = body.querySelector('.sn-canvas'), ctx = cv.getContext('2d');
  const N=18, CS=20;
  let snake=[{x:9,y:9}], dir={x:1,y:0}, nextDir={x:1,y:0}, food=null, score=0, dead=false, timer=null;
  function place(){ do{ food={x:Math.floor(Math.random()*N), y:Math.floor(Math.random()*N)}; } while(snake.some(s=>s.x===food.x&&s.y===food.y)); }
  place();
  function draw(){
    ctx.fillStyle='#101418'; ctx.fillRect(0,0,360,360);
    ctx.strokeStyle='rgba(255,255,255,.04)';
    for(let i=1;i<N;i++){ ctx.beginPath(); ctx.moveTo(i*CS,0); ctx.lineTo(i*CS,360); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,i*CS); ctx.lineTo(360,i*CS); ctx.stroke(); }
    ctx.fillStyle='#FF5A5F'; ctx.shadowColor='#FF5A5F'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(food.x*CS+CS/2, food.y*CS+CS/2, 6.5, 0, 7); ctx.fill();
    ctx.shadowBlur=0;
    snake.forEach((s,i)=>{
      ctx.fillStyle = i===0 ? '#7CFC9A' : `rgba(61,220,132,${1-i/snake.length*0.7})`;
      ctx.shadowColor='#3DDC84'; ctx.shadowBlur=i===0?14:0;
      const r=6, x=s.x*CS+1.5, y=s.y*CS+1.5, w=CS-3, h=CS-3;
      ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
    });
    ctx.shadowBlur=0;
  }
  function step(){
    dir=nextDir;
    const head={x:(snake[0].x+dir.x+N)%N, y:(snake[0].y+dir.y+N)%N};
    if(snake.some(s=>s.x===head.x&&s.y===head.y)){ die(); return; }
    snake.unshift(head);
    if(head.x===food.x&&head.y===food.y){
      score+=10; body.querySelector('.sc').textContent=score; place(); AudioFX.tone(660,0,.08,'sine',.15);
    } else snake.pop();
    draw();
  }
  function die(){
    dead=true; clearInterval(timer);
    AudioFX.error();
    const hi = Math.max(score, +(localStorage.getItem('win11.snakeHi')||0));
    localStorage.setItem('win11.snakeHi', hi);
    body.querySelector('.rc').textContent=hi;
    body.querySelector('.sn-final').textContent='Ваш счёт: '+score;
    body.querySelector('.sn-over').style.display='flex';
  }
  function start(){
    snake=[{x:9,y:9}]; dir={x:1,y:0}; nextDir={x:1,y:0}; score=0; dead=false;
    body.querySelector('.sc').textContent=0;
    body.querySelector('.sn-over').style.display='none';
    place(); draw();
    clearInterval(timer); timer=setInterval(step, 130);
    win.timers.push(timer);
  }
  function setDir(d){
    const m={u:{x:0,y:-1},d:{x:0,y:1},l:{x:-1,y:0},r:{x:1,y:0}}[d];
    if(m && !(m.x===-dir.x&&m.y===-dir.y) && !(m.x===dir.x&&m.y===dir.y)) nextDir=m;
  }
  win.keyHandler = e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','w'].includes(k)) setDir('u');
    else if(['arrowdown','s'].includes(k)) setDir('d');
    else if(['arrowleft','a'].includes(k)) setDir('l');
    else if(['arrowright','d'].includes(k)) setDir('r');
    if(k.startsWith('arrow')) e.preventDefault();
  };
  const kh = e=>{ if(!win.min && WM.focused===win.id && win.keyHandler) win.keyHandler(e); };
  document.addEventListener('keydown', kh);
  win.onClose = ()=>document.removeEventListener('keydown', kh);
  body.querySelectorAll('.sn-dpad button[data-d]').forEach(b=>b.addEventListener('click', ()=>setDir(b.dataset.d)));
  let tx,ty;
  cv.addEventListener('touchstart', e=>{ tx=e.touches[0].clientX; ty=e.touches[0].clientY; }, {passive:true});
  cv.addEventListener('touchend', e=>{
    const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)+Math.abs(dy)<24) return;
    setDir(Math.abs(dx)>Math.abs(dy) ? (dx>0?'r':'l') : (dy>0?'d':'u'));
  }, {passive:true});
  body.querySelector('.sn-again').addEventListener('click', start);
  start();
};

/* ---------- Сапёр ---------- */
APPS.mines.render = function(body, win){
  const N=9, MINES=10;
  body.innerHTML = `<div class="mn-root">
    <div class="mn-head"><span>💣 <b class="mn-left">10</b></span><button class="btn small mn-reset">🙂 Заново</button><span>⏱ <b class="mn-time">0</b></span></div>
    <div class="mn-grid"></div>
    <div style="font-size:11.5px;color:var(--txt2)">ЛКМ — открыть, ПКМ (долгое нажатие) — флажок</div>
  </div>`;
  const gridEl = body.querySelector('.mn-grid');
  gridEl.style.gridTemplateColumns = `repeat(${N},30px)`;
  let cells, opened, flags, over, won, time, timer;
  function reset(){
    clearInterval(timer); time=0; over=false; won=false; flags=0;
    body.querySelector('.mn-time').textContent=0;
    body.querySelector('.mn-left').textContent=MINES;
    cells = Array.from({length:N*N}, ()=>({mine:false, open:false, flag:false, n:0}));
    let placed=0;
    while(placed<MINES){ const i=Math.floor(Math.random()*N*N); if(!cells[i].mine){ cells[i].mine=true; placed++; } }
    for(let i=0;i<N*N;i++){
      let n=0; const x=i%N, y=Math.floor(i/N);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx, ny=y+dy;
        if(nx>=0&&nx<N&&ny>=0&&ny<N&&cells[ny*N+nx].mine) n++;
      }
      cells[i].n=n;
    }
    opened=0;
    render();
    timer=setInterval(()=>{ if(!over&&!won){ time++; body.querySelector('.mn-time').textContent=time; } }, 1000);
    win.timers.push(timer);
  }
  function render(){
    gridEl.innerHTML = cells.map((c,i)=>{
      let cls='mn-cell'+(c.open?' open':'')+((c.open&&c.mine)?' mine':'')+((c.flag&&!c.open)?' flag':'');
      let txt = c.open ? (c.mine?'✖':(c.n?c.n:'')) : (c.flag?'🚩':'');
      return `<button class="${cls} ${c.open&&c.n?'mn-c'+c.n:''}" data-i="${i}">${txt}</button>`;
    }).join('');
    gridEl.querySelectorAll('.mn-cell').forEach(b=>{
      const i=+b.dataset.i;
      b.addEventListener('click', ()=>openCell(i));
      b.addEventListener('contextmenu', e=>{ e.preventDefault(); flagCell(i); });
      let lp;
      b.addEventListener('touchstart', ()=>{ lp=setTimeout(()=>{ flagCell(i); }, 480); }, {passive:true});
      b.addEventListener('touchend', ()=>clearTimeout(lp));
      b.addEventListener('touchmove', ()=>clearTimeout(lp));
    });
  }
  function openCell(i){
    if(over||won||cells[i].flag||cells[i].open) return;
    const c=cells[i];
    if(c.mine){
      c.open=true; over=true; clearInterval(timer);
      cells.forEach(x=>{ if(x.mine) x.open=true; });
      render(); AudioFX.error();
      toast('Сапёр','Вы подорвались! Попробуйте снова.','mines');
      return;
    }
    const stack=[i];
    while(stack.length){
      const j=stack.pop(); const cc=cells[j];
      if(cc.open||cc.flag) continue;
      cc.open=true; opened++;
      if(cc.n===0){
        const x=j%N, y=Math.floor(j/N);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx, ny=y+dy;
          if(nx>=0&&nx<N&&ny>=0&&ny<N) stack.push(ny*N+nx);
        }
      }
    }
    if(opened===N*N-MINES){
      won=true; clearInterval(timer);
      toast('Сапёр','Победа! Все мины найдены за '+time+' сек.','mines');
      AudioFX.notify();
    }
    render();
  }
  function flagCell(i){
    if(over||won||cells[i].open) return;
    cells[i].flag=!cells[i].flag;
    flags+=cells[i].flag?1:-1;
    body.querySelector('.mn-left').textContent=MINES-flags;
    render();
  }
  body.querySelector('.mn-reset').addEventListener('click', reset);
  win.onClose = ()=>clearInterval(timer);
  reset();
};

/* ---------- Медиаплеер ---------- */
APPS.music.render = function(body, win){
  let cur=0, playing=false, step=0, timer=null, progTimer=null, pos=0;
  body.innerHTML = `<div class="mu-root">
    <div class="mu-side">
      <div style="font-size:13px;font-weight:600;padding:2px 10px 10px">Моя музыка</div>
      ${MUSIC_TRACKS.map((t,i)=>`<button class="mu-tr" data-i="${i}"><span class="mt-n" style="background:${t.color}">${i+1}</span><span style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div><div style="font-size:11px;color:var(--txt2)">Synth Wave</div></span></button>`).join('')}
    </div>
    <div class="mu-main">
      <div class="mu-now">
        <div class="mu-cover" id="mu-cover"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 4v10.3a3.4 3.4 0 1 1-2-3.1V6.7l-6 1.6v8.5a3.4 3.4 0 1 1-2-3.1V6z"/></svg></div>
        <div style="text-align:center"><div class="mu-name"></div><div class="mu-artist">Arena Synth Orchestra</div></div>
      </div>
      <div class="mu-bar">
        <div class="mu-progress"><span class="mp-cur">0:00</span><input class="wsl mp-bar" type="range" min="0" max="100" value="0" style="--p:0%"><span class="mp-dur">0:00</span></div>
        <div class="mu-controls">
          <button class="mu-btn m-prev">${I.prev}</button>
          <button class="mu-btn play m-play">${I.play}</button>
          <button class="mu-btn m-next">${I.next}</button>
        </div>
      </div>
    </div>
  </div>`;
  const nameEl = body.querySelector('.mu-name'), cover = body.querySelector('#mu-cover');
  const playBtn = body.querySelector('.m-play');
  const bar = body.querySelector('.mp-bar'), curEl = body.querySelector('.mp-cur'), durEl = body.querySelector('.mp-dur');
  const DUR = [124, 98, 152, 111];
  function sel(i){
    cur=(i+MUSIC_TRACKS.length)%MUSIC_TRACKS.length;
    body.querySelectorAll('.mu-tr').forEach(t=>t.classList.toggle('on', +t.dataset.i===cur));
    nameEl.textContent = MUSIC_TRACKS[cur].name;
    cover.style.background = `linear-gradient(135deg, ${MUSIC_TRACKS[cur].color}, #1A1A2E)`;
    durEl.textContent = fmt(DUR[cur]);
    pos=0; step=0; updBar();
    if(playing){ stopSeq(); startSeq(); }
  }
  const fmt = s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
  function updBar(){ bar.value=pos; bar.style.setProperty('--p', (pos/DUR[cur]*100)+'%'); curEl.textContent=fmt(pos); }
  function note(seq){
    const t = MUSIC_TRACKS[cur];
    const n = t.scale[seq % t.scale.length];
    AudioFX.tone(t.root*Math.pow(2, n/12), 0, 0.34, t.wave, .12);
    if(seq%4===0) AudioFX.tone(t.root/2, 0, 0.5, 'sine', .08);
  }
  function startSeq(){
    const t = MUSIC_TRACKS[cur];
    const iv = 60/t.bpm*1000/2;
    stopSeq();
    timer = setInterval(()=>{ note(step++); }, iv);
    progTimer = setInterval(()=>{ pos+=1; if(pos>=DUR[cur]){ sel(cur+1); } updBar(); }, 1000);
    win.timers.push(timer, progTimer);
  }
  function stopSeq(){ clearInterval(timer); clearInterval(progTimer); }
  function toggle(){
    playing=!playing;
    playBtn.innerHTML = playing? I.pause : I.play;
    if(playing) startSeq(); else stopSeq();
  }
  body.querySelectorAll('.mu-tr').forEach(t=>t.addEventListener('click', ()=>{ sel(+t.dataset.i); if(!playing) toggle(); }));
  playBtn.addEventListener('click', toggle);
  body.querySelector('.m-prev').addEventListener('click', ()=>sel(cur-1));
  body.querySelector('.m-next').addEventListener('click', ()=>sel(cur+1));
  win.onClose = ()=>stopSeq();
  sel(0);
};

/* ---------- Погода ---------- */
APPS.weather.render = function(body, win){
  function render(city){
    const c = WEATHER_CITIES[city];
    const names=['вс','пн','вт','ср','чт','пт','сб'];
    const icons={sun:`<circle cx="24" cy="24" r="9" fill="#FFC83D"/>${Array.from({length:8},(_,i)=>`<path d="M24 ${8+2}v-5" stroke="#FFC83D" stroke-width="2.4" stroke-linecap="round" transform="rotate(${i*45} 24 24)"/>`).join('')}`,
      cloud:`<path d="M14.5 34.5a6.5 6.5 0 0 1 .4-13 9 9 0 0 1 17.2-2.3 7.4 7.4 0 0 1 1.4 14.6c-.5.1-18.5.7-19 .7z" fill="#fff"/>`,
      drop:`<path d="M24 8s9 10 9 16.5a9 9 0 1 1-18 0C15 18 24 8 24 8z" fill="#7EC8FF"/>`,
      snow:`<g stroke="#CFF0FF" stroke-width="2.2" stroke-linecap="round"><path d="M24 12v24M14 18l20 12M34 18L14 30"/></g>`};
    const days = Array.from({length:7},(_,i)=>{
      const t = c.base + Math.round(Math.sin(i*1.7)*4 + (i%3));
      return {d: names[(new Date().getDay()+i)%7], t, icon: c.icon==='sun'&&i%2?'cloud':c.icon};
    });
    const t0 = days[0].t;
    body.innerHTML = `<div class="wt-root">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <select class="wt-select">${WEATHER_CITIES.map((w,i)=>`<option value="${i}" ${i===city?'selected':''}>${w.name}</option>`).join('')}</select>
        <span style="font-size:12px;opacity:.7">${new Date().toLocaleDateString('ru-RU',{weekday:'long', day:'numeric', month:'long'})}</span>
      </div>
      <div class="wt-now">
        <svg viewBox="0 0 48 48">${icons[c.icon]||icons.cloud}</svg>
        <div><div class="wt-temp">${t0>0?'+':''}${t0}°</div><div class="wt-desc">${({sun:'Ясно',cloud:'Облачно',drop:'Дождь',snow:'Снег'})[c.icon]} • ощущается как ${t0-2}°</div></div>
      </div>
      <div class="wt-meta">
        <span class="wm-i">Ветер<b>${1+city%5} м/с</b></span>
        <span class="wm-i">Влажность<b>${55+city*3}%</b></span>
        <span class="wm-i">Давление<b>${735+city*2} мм</b></span>
        <span class="wm-i">Восход<b>0${7-city%3}:${(15+city*7)%60<10?'0':''}${(15+city*7)%60}</b></span>
      </div>
      <div class="wt-cards">${days.map(d=>`<div class="wt-card"><div class="wc-d">${d.d}</div><svg viewBox="0 0 48 48">${icons[d.icon]||icons.cloud}</svg><div class="wc-t">${d.t>0?'+':''}${d.t}°</div></div>`).join('')}</div>
    </div>`;
    body.querySelector('.wt-select').addEventListener('change', e=>render(+e.target.value));
  }
  render(0);
};

/* ---------- Часы ---------- */
APPS.clockapp.render = function(body, win){
  body.innerHTML = `<div class="ck-root">
    <div class="ck-time">00:00:00</div>
    <div class="ck-date"></div>
    <div class="ck-world">
      ${[['Москва',0],['Лондон',-3],['Нью-Йорк',-8],['Токио',6]].map(w=>`<div class="ck-row"><span>${w[0]}</span><b data-off="${w[1]}">--:--</b></div>`).join('')}
    </div>
  </div>`;
  const timeEl = body.querySelector('.ck-time'), dateEl = body.querySelector('.ck-date');
  function upd(){
    const d = new Date();
    timeEl.textContent = d.toLocaleTimeString('ru-RU');
    dateEl.textContent = d.toLocaleDateString('ru-RU',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
    body.querySelectorAll('.ck-row b').forEach(b=>{
      const t = new Date(d.getTime() + (+b.dataset.off)*3600*1000);
      b.textContent = t.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
    });
  }
  upd();
  const t = setInterval(upd, 1000);
  win.timers.push(t);
};

/* ---------- Задачи ---------- */
APPS.tasks.render = function(body, win){
  body.innerHTML = `<div class="tk-root">
    <div class="tk-add"><input type="text" class="winp" placeholder="Добавить задачу"><button class="btn acc tk-addbtn">Добавить</button></div>
    <div class="tk-list"></div>
    <div style="padding:8px 14px;border-top:1px solid var(--stroke);font-size:11.5px;color:var(--txt2)"><span class="tk-done"></span></div>
  </div>`;
  const list = body.querySelector('.tk-list');
  function render(){
    const tasks = S.data.tasks;
    list.innerHTML = tasks.length ? tasks.map((t,i)=>`
      <div class="tk-item ${t.done?'done':''}" data-i="${i}">
        <span class="tk-check">${t.done?I.check:''}</span><span class="tk-name">${esc(t.name)}</span>
        <button class="tk-del"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.4"/></svg></button>
      </div>`).join('') : `<div class="tk-empty">Задач нет. Добавьте первую!</div>`;
    body.querySelector('.tk-done').textContent = `Выполнено: ${tasks.filter(t=>t.done).length} из ${tasks.length}`;
    list.querySelectorAll('.tk-item').forEach(el=>{
      const i = +el.dataset.i;
      el.querySelector('.tk-check').addEventListener('click', ()=>{ S.data.tasks[i].done=!S.data.tasks[i].done; S.changed(); render(); });
      el.querySelector('.tk-del').addEventListener('click', ()=>{ S.data.tasks.splice(i,1); S.changed(); render(); });
    });
  }
  const add = ()=>{
    const inp = body.querySelector('.tk-add input');
    if(!inp.value.trim()) return;
    S.data.tasks.push({name:inp.value.trim(), done:false});
    S.changed(); inp.value=''; render(); inp.focus();
  };
  body.querySelector('.tk-addbtn').addEventListener('click', add);
  body.querySelector('.tk-add input').addEventListener('keydown', e=>{ if(e.key==='Enter') add(); });
  render();
};

/* ---------- Диспетчер задач ---------- */
APPS.taskmgr.render = function(body, win){
  const sysProcs = [
    {name:'Система', icon:'win', base:1.2, mem:132},
    {name:'Проводник (оболочка)', icon:'explorer', base:.8, mem:88},
    {name:'Диспетчер окон рабочего стола', icon:'taskview', base:1.6, mem:146},
    {name:'Windows Audio', icon:'speaker', base:.3, mem:24},
    {name:'Служба узла: сеть', icon:'wifi', base:.5, mem:36},
    {name:'Антивредоносная служба', icon:'shield', base:2.4, mem:210},
  ];
  let procs = sysProcs.map(p=>({...p, cpu:p.base}));
  const cpuHist = Array.from({length:40}, ()=>5+Math.random()*8);

  body.innerHTML = `<div class="tmgr-root">
    <div class="tmgr-tabs"><button class="on" data-t="proc">Процессы</button><button data-t="perf">Производительность</button></div>
    <div class="tmgr-view"></div>
    <div class="tmgr-status"><span class="tmgr-count"></span><span class="tmgr-cpu"></span><span class="tmgr-mem"></span></div>
  </div>`;
  const view = body.querySelector('.tmgr-view');
  let tab = 'proc';

  function allProcs(){
    return [...[...WM.wins.values()].map(w=>({name:APPS[w.appId].name, icon:APPS[w.appId].icon, cpu:.4+Math.random()*5, mem:60+Math.random()*190, id:w.id})), ...procs];
  }
  function renderProc(){
    const all = allProcs();
    view.innerHTML = `
      <div class="tmgr-head"><span>Имя</span><span>ЦП</span><span>Память</span><span></span></div>
      <div class="tmgr-list">${all.map((p,i)=>`
        <div class="tmgr-row" data-win="${p.id||''}">
          <span class="tr-name">${I[p.icon]||I.apps}<span>${esc(p.name)}</span></span>
          <span class="tr-cpu">${p.cpu.toFixed(1)}%</span>
          <span class="tr-mem">${p.mem.toFixed(0)} МБ</span>
          ${p.id?'<button class="tr-end">Снять</button>':'<span></span>'}
        </div>`).join('')}</div>`;
    view.querySelectorAll('.tr-end').forEach(b=>b.addEventListener('click', e=>{
      const row = e.target.closest('.tmgr-row');
      if(row.dataset.win){ WM.close(row.dataset.win); renderProc(); }
    }));
    const cpu = Math.min(100, all.reduce((s,p)=>s+p.cpu,0));
    const mem = all.reduce((s,p)=>s+p.mem,0);
    body.querySelector('.tmgr-count').textContent = `Процессов: ${all.length}`;
    body.querySelector('.tmgr-cpu').textContent = `ЦП: ${cpu.toFixed(0)}%`;
    body.querySelector('.tmgr-mem').textContent = `Память: ${(mem/1024).toFixed(2)} ГБ / 16 ГБ`;
  }
  function renderPerf(){
    const cpu = Math.min(100, cpuHist.slice(-8).reduce((s,v)=>s+v,0)/8).toFixed(0);
    view.innerHTML = `
      <div class="tmgr-perf">
        <div class="tp-card"><div class="tp-title">ЦП — Intel Core i5-12400</div>
          <div class="tp-big">${cpu}%</div>
          <div class="tp-bars">${cpuHist.map(v=>`<i style="height:${Math.max(6,v)}%"></i>`).join('')}</div>
        </div>
        <div class="tp-card"><div class="tp-title">Память — 16,0 ГБ</div>
          <div class="tp-big">${(5.1+procs.reduce((s,p)=>s+p.mem,0)/1024/2).toFixed(1)} ГБ</div>
          <div class="tp-line"><i style="width:${(5.1+procs.reduce((s,p)=>s+p.mem,0)/1024/2)/16*100}%"></i></div>
        </div>
        <div class="tp-card"><div class="tp-title">Батарея</div>
          <div class="tp-big">${Battery.pct()}%</div>
          <div class="tp-line"><i style="width:${Battery.pct()}%;background:${Battery.charging?'#16C60C':'var(--acc)'}"></i></div>
          <div class="tp-sub">${Battery.leftText()}</div>
        </div>
      </div>`;
  }
  function renderAll(){ tab==='proc' ? renderProc() : renderPerf(); }
  body.querySelectorAll('.tmgr-tabs button').forEach(b=>b.addEventListener('click', ()=>{
    body.querySelectorAll('.tmgr-tabs button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); tab=b.dataset.t; renderAll();
  }));
  const t = setInterval(()=>{
    procs.forEach(p=>{ p.cpu = clamp(p.cpu + (Math.random()-.5)*1.2, .1, 9); });
    cpuHist.push(3+Math.random()*10+WM.wins.size*2); cpuHist.shift();
    renderAll();
  }, 1600);
  win.timers.push(t);
  renderAll();
};

/* ---------- Корзина ---------- */
APPS.bin.render = function(body, win){
  body.innerHTML = `<div class="bn-root">
    <div class="bn-toolbar"><button class="btn small bn-empty">Очистить корзину</button><span style="flex:1"></span><span style="font-size:12px;color:var(--txt2)">Корзина (Microsoft)</span></div>
    <div class="bn-empty">${I.bin}<span>Корзина пуста</span></div>
  </div>`;
  body.querySelector('.bn-empty').addEventListener('click', ()=>toast('Корзина','Удалять нечего — она и так пуста :)','bin'));
};
