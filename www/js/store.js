/* ============ Windows 11 clone — Microsoft Store ============ */
'use strict';

const StoreState = { progress:{} }; // appId -> {pct, speed}

function starsHTML(r){
  const full = Math.floor(r), half = r-full>=0.5;
  return `<span class="stars">${'★'.repeat(full)}${half?'½':''}${'☆'.repeat(5-full-(half?1:0))}</span> <span style="font-size:12px;color:var(--txt2)">${String(r).replace('.',',')} / 5</span>`;
}

APPS.store.render = function(body, win){
  let view = {page:'home', cat:null, app:null};
  const catalog = ['paint','terminal','weather','clockapp','snake','mines','music','tasks'];

  body.innerHTML = `<div class="sto-root">
    <div class="sto-top">
      <button class="sto-navbtn" data-t="home"><span>${I.home}</span>Главная</button>
      <button class="sto-navbtn" data-t="apps"><span>${I.apps}</span>Приложения</button>
      <button class="sto-navbtn" data-t="games"><span>${I.game}</span>Игры</button>
      <button class="sto-navbtn" data-t="lib"><span>${I.gallery}</span>Библиотека</button>
      <div class="sto-search">${I.search}<input type="text" placeholder="Поиск приложений" spellcheck="false"></div>
    </div>
    <div class="sto-body"></div>
  </div>`;
  const pageEl = body.querySelector('.sto-body');
  const searchInp = body.querySelector('.sto-search input');

  function navBtns(){
    body.querySelectorAll('.sto-navbtn').forEach(b=>{
      b.classList.toggle('on', (view.page==='home'&&b.dataset.t==='home')||(view.page==='list'&&view.cat===b.dataset.t)||(view.page==='lib'&&b.dataset.t==='lib'));
    });
  }

  function cardHTML(id){
    const a = APPS[id];
    const inst = S.data.installed.includes(id);
    return `<button class="sto-card" data-app="${id}">
      ${I[a.icon]}<span class="sc-name">${esc(a.name)}</span>
      <span class="sc-meta"><span class="stars" style="font-size:11px">${'★'.repeat(Math.round(a.rating))}</span> ${a.cat}</span>
      <span class="sc-price">${inst?'Установлено':'Бесплатно'}</span>
    </button>`;
  }

  function renderHome(){
    navBtns();
    pageEl.innerHTML = `
      <div class="sto-hero" id="hero">
        <div class="sh-ico">${I.snake}</div>
        <div>
          <div class="sh-badge">Выбор редакции</div>
          <div class="sh-name">Змейка Neon</div>
          <div class="sh-desc">Легендарная аркада возвращается в неоновом свете. Собирайте яблоки и побейте свой рекорд!</div>
          <span class="sh-get">Скачать</span>
        </div>
      </div>
      <div class="sto-sec"><h3>Рекомендуем для вас</h3><button class="sto-more" data-cat="apps">Показать все ›</button></div>
      <div class="sto-cards">${['snake','paint','terminal','tasks','mines','music'].map(cardHTML).join('')}</div>
      <div class="sto-sec"><h3>Популярные игры</h3><button class="sto-more" data-cat="games">Показать все ›</button></div>
      <div class="sto-cards">${['snake','mines'].map(cardHTML).join('')}</div>
      <div class="sto-sec"><h3>Инструменты и творчество</h3><button class="sto-more" data-cat="apps">Показать все ›</button></div>
      <div class="sto-cards">${['paint','terminal','weather','clockapp'].map(cardHTML).join('')}</div>`;
    wireCards();
    pageEl.querySelector('#hero').addEventListener('click', ()=>renderDetail('snake'));
    pageEl.querySelectorAll('.sto-more').forEach(b=>b.addEventListener('click', ()=>{ view={page:'list', cat:b.dataset.cat, app:null}; renderList(); }));
  }

  function renderList(){
    navBtns();
    const ids = view.cat==='games' ? catalog.filter(id=>APPS[id].cat==='Игры') : catalog;
    pageEl.innerHTML = `
      <div class="sto-chips">${['Все','Игры','Творчество','Инструменты','Продуктивность','Музыка','Погода'].map((c,i)=>`<button class="sto-chip ${i===0?'on':''}">${c}</button>`).join('')}</div>
      <div class="sto-sec"><h3>${view.cat==='games'?'Игры':'Все приложения'}</h3><span style="font-size:12px;color:var(--txt2)">${ids.length} приложений</span></div>
      <div class="sto-cards">${ids.map(cardHTML).join('')}</div>`;
    wireCards();
    pageEl.querySelectorAll('.sto-chip').forEach(ch=>{
      ch.addEventListener('click', ()=>{
        pageEl.querySelectorAll('.sto-chip').forEach(x=>x.classList.remove('on'));
        ch.classList.add('on');
        const f = ch.textContent;
        const flt = f==='Все' ? catalog : catalog.filter(id=>APPS[id].cat===f);
        pageEl.querySelector('.sto-cards').innerHTML = flt.map(cardHTML).join('');
        wireCards();
      });
    });
  }

  function progressHTML(id){
    const p = StoreState.progress[id];
    if(!p) return '';
    return `<div class="sto-progress"><div class="sp-pbar"><i style="width:${p.pct}%"></i></div>
      <span class="sp-ptext">Загрузка — ${p.pct}%  •  ${p.speed} МБ/с</span></div>`;
  }

  function renderDetail(id){
    view = {page:'detail', app:id};
    navBtns();
    const a = APPS[id];
    const inst = S.data.installed.includes(id);
    const p = StoreState.progress[id];
    const userAv = ['#E81123','#0078D4','#107C10','#744DA9','#CA5010'];
    pageEl.innerHTML = `<div class="sto-detail">
      <button class="btn small sto-back">${I.back} Назад</button>
      <div class="sd-head">
        ${I[a.icon]}
        <div style="flex:1;min-width:0">
          <div class="sd-hname">${esc(a.name)}</div>
          <div class="sd-hdev">${esc(a.dev)}</div>
          <div class="sd-hmeta"><span>${a.cat}</span><span>•</span><span>${a.size}</span><span>•</span><span>Для всех возрастов</span></div>
          <div class="sd-hmeta" style="margin-top:6px">${starsHTML(a.rating)} <span style="font-size:12px;color:var(--txt2);margin-left:6px">${a.revs.toLocaleString('ru-RU')} отзывов</span></div>
          <div class="sd-get" data-zone="get">
            ${p ? progressHTML(id) : (inst
              ? '<button class="sto-getbtn" data-act="open">Открыть</button>'
              : '<button class="sto-getbtn" data-act="get">Получить</button>')}
          </div>
        </div>
      </div>
      <div class="sd-shots">
        ${[0,1,2].map(i=>`<div class="sd-shot"><div class="ss-bar"><i style="background:#E81123"></i><i style="background:#F8C842"></i><i style="background:#107C10"></i></div>
          <div class="ss-body"><i style="width:40%;height:10px"></i><i style="width:90%;height:${30+i*18}px"></i><i style="width:70%;height:14px"></i><i style="width:85%;height:12px"></i></div>
        </div>`).join('')}
      </div>
      <div class="sd-h3">Описание</div>
      <div class="sd-desc"><p>${esc(a.desc)}</p>
      <p>Приложение устанавливается мгновенно и работает офлайн. Версия для Windows 11 с поддержкой тёмной и светлой темы.</p></div>
      <div class="sd-h3">Отзывы</div>
      ${REVIEWS.map(r=>`<div class="sd-rev"><div class="sr-ava" style="background:${userAv[Math.floor(Math.random()*5)]}">${r.name[0]}</div>
        <div><div class="sr-name">${r.name}</div><div class="sr-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div><div class="sr-text">${esc(r.text)}</div></div>
      </div>`).join('')}
    </div>`;
    pageEl.querySelector('.sto-back').addEventListener('click', ()=>{ view={page:'home'}; renderHome(); });
    wireActions(id);
  }

  function wireActions(id){
    const zone = pageEl.querySelector('[data-zone="get"]');
    if(!zone) return;
    const btn = zone.querySelector('[data-act]');
    if(!btn) return;
    if(btn.dataset.act==='open') btn.addEventListener('click', ()=>{ WM.open(id); });
    else btn.addEventListener('click', ()=>startDownload(id));
  }

  function startDownload(id){
    const a = APPS[id];
    StoreState.progress[id] = {pct:0, speed:(2+Math.random()*6).toFixed(1)};
    const zone = pageEl.querySelector('[data-zone="get"]');
    if(zone) zone.innerHTML = progressHTML(id);
    const t = setInterval(()=>{
      const p = StoreState.progress[id];
      if(!p){ clearInterval(t); return; }
      p.pct = Math.min(100, p.pct + 6+Math.random()*14);
      p.speed = (2+Math.random()*6).toFixed(1);
      const bar = pageEl.querySelector('[data-zone="get"] .sp-pbar i');
      const txt = pageEl.querySelector('[data-zone="get"] .sp-ptext');
      if(bar) bar.style.width = p.pct+'%';
      if(txt) txt.textContent = `Загрузка — ${Math.floor(p.pct)}%  •  ${p.speed} МБ/с`;
      if(p.pct>=100){
        clearInterval(t);
        delete StoreState.progress[id];
        if(!S.data.installed.includes(id)) S.data.installed.push(id);
        S.changed();
        UI.renderIcons();
        AudioFX.notify();
        toast('Microsoft Store', `«${a.name}» установлено. Приложение закреплено на рабочем столе.`, a.icon);
        renderDetail(id);
      }
    }, 260);
    win.timers.push(t);
  }

  function renderLib(){
    navBtns();
    const inst = S.data.installed;
    pageEl.innerHTML = `
      <div class="sto-sec"><h3>Библиотека</h3><span style="font-size:12px;color:var(--txt2)">Установлено: ${inst.length}</span></div>
      ${inst.length ? inst.map(id=>{
        const a = APPS[id];
        return `<div class="sto-lib-item" style="max-width:640px">${I[a.icon]}<span style="flex:1"><div class="sl-name">${esc(a.name)}</div><div class="sl-sub">${esc(a.dev)} • ${a.size} • Установлено</div></span><button class="btn small acc" data-open="${id}">Открыть</button><button class="btn small" data-del="${id}">Удалить</button></div>`;
      }).join('') : `<div class="sto-detail" style="color:var(--txt2)">В библиотеке пока пусто. Скачайте приложения из Microsoft Store!</div>`}
      <div class="sto-sec" style="margin-top:20px"><h3>Обновления</h3></div>
      <div class="sto-detail" style="color:var(--txt2);padding-top:0">Все приложения обновлены ✓</div>`;
    pageEl.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click', ()=>WM.open(b.dataset.open)));
    pageEl.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>{
      const id = b.dataset.del;
      S.data.installed = S.data.installed.filter(x=>x!==id);
      S.changed(); UI.renderIcons();
      WM.wins.forEach(w=>{ if(w.appId===id) WM.close(w.id); });
      toast('Microsoft Store', `«${APPS[id].name}» удалено`, 'trash');
      renderLib();
    }));
  }

  function wireCards(){
    pageEl.querySelectorAll('.sto-card').forEach(c=>c.addEventListener('click', ()=>renderDetail(c.dataset.app)));
  }

  body.querySelectorAll('.sto-navbtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const t = b.dataset.t;
      if(t==='home'){ view={page:'home'}; renderHome(); }
      else if(t==='lib'){ view={page:'lib'}; renderLib(); }
      else { view={page:'list', cat:t}; renderList(); }
    });
  });
  searchInp.addEventListener('keydown', e=>{
    if(e.key!=='Enter') return;
    const q = searchInp.value.trim().toLowerCase();
    const found = catalog.filter(id=>APPS[id].name.toLowerCase().includes(q));
    view={page:'list', cat:'apps'};
    renderList();
    pageEl.querySelector('.sto-cards').innerHTML = found.length ? found.map(cardHTML).join('') : '<div style="color:var(--txt2);padding:20px">Ничего не найдено по запросу «'+esc(q)+'»</div>';
    wireCards();
  });
  renderHome();
};
