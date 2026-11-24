/* ============ Windows 11 clone — Параметры ============ */
'use strict';

APPS.settings.render = function(body, win){
  const nav = [
    {id:'system', name:'Система', icon:'pc'},
    {id:'bt', name:'Bluetooth и устройства', icon:'bt'},
    {id:'net', name:'Сеть и Интернет', icon:'wifi'},
    {id:'person', name:'Персонализация', icon:'paint'},
    {id:'apps', name:'Приложения', icon:'apps'},
    {id:'acc', name:'Учётные записи', icon:'users'},
    {id:'time', name:'Время и язык', icon:'time'},
    {id:'games', name:'Игры', icon:'game'},
    {id:'access', name:'Специальные возможности', icon:'access'},
    {id:'privacy', name:'Конфиденциальность и защита', icon:'shield'},
    {id:'update', name:'Центр обновления Windows', icon:'refresh'},
  ];
  let cur = 'system';
  let sub = null;

  body.innerHTML = `<div class="se-root">
    <div class="se-side">
      <div class="se-user"><span class="st-ava"></span><span><div class="su-name">Пользователь</div><div class="su-mail">user@arena.local</div></span></div>
      <div class="se-search">${I.search}<input type="text" placeholder="Найти параметр" spellcheck="false"></div>
      ${nav.map(n=>`<button class="se-nav" data-p="${n.id}">${I[n.icon]}<span>${n.name}</span></button>`).join('')}
    </div>
    <div class="se-page"></div>
  </div>`;

  const pageEl = body.querySelector('.se-page');
  const titleMap = Object.fromEntries(nav.map(n=>[n.id,n.name]));

  function card(o){
    return `<div class="se-card ${o.link?'link':''}" data-go="${o.go||''}">
      ${o.icon?`<span class="sc-ico">${o.icon}</span>`:''}
      <div class="sc-body"><div class="sc-title">${o.title}</div>${o.sub?`<div class="sc-sub">${o.sub}</div>`:''}</div>
      ${o.right||''}${o.link?'<span class="sc-arrow">›</span>':''}
    </div>`;
  }

  function syncSwitch(el, key, cb){
    const d = S.data;
    el.classList.toggle('on', !!d[key]);
    el.addEventListener('click', ()=>{
      d[key] = !d[key]; S.changed();
      el.classList.toggle('on', !!d[key]);
      if(cb) cb(d[key]);
    });
  }
  function sliderRow(id, val, min, max, cb){
    setTimeout(()=>{
      const inp = pageEl.querySelector('#'+id);
      if(!inp) return;
      const sync=()=>{ inp.style.setProperty('--p', ((inp.value-min)/(max-min)*100)+'%'); };
      sync();
      inp.addEventListener('input', ()=>{ cb(+inp.value); sync(); });
    }, 0);
  }

  function render(){
    const d = S.data;
    const T = titleMap[cur] || 'Система';
    const subNames = {display:'Дисплей', sound:'Звук', about:'О системе'};
    pageEl.innerHTML = '';

    if(cur==='system'){
      if(!sub){
        pageEl.innerHTML = `<div class="se-h1">Система</div>
          ${card({icon:I.monitor, title:'Дисплей', sub:'Яркость, ночной свет, масштаб экрана', link:1, go:'display'})}
          ${card({icon:I.speaker, title:'Звук', sub:'Уровни громкости, устройства вывода', link:1, go:'sound'})}
          ${card({icon:I.bell, title:'Уведомления', sub:'Оповещения от приложений и системы', right:'<button class="switch on" data-k="notif"></button>'})}
          ${card({icon:I.battery, title:'Питание и батарея', sub:'86% • Остаётся ~3 ч 20 мин', right:'<span class="sc-arrow">›</span>', link:1})}
          ${card({icon:I.win, title:'О системе', sub:'Устройство DESKTOP-ARENA11 • Windows 11 Pro', link:1, go:'about'})}`;
        syncSwitch(pageEl.querySelector('[data-k="notif"]'), 'notif');
        pageEl.querySelectorAll('[data-go]').forEach(c=>c.addEventListener('click', ()=>{ sub=c.dataset.go; render(); }));
      } else if(sub==='display'){
        pageEl.innerHTML = `<div class="se-crumb">Система › <b>Дисплей</b></div><div class="se-h1">Дисплей</div>
          <div class="se-card col">
            <div class="sc-body"><div class="sc-title">Яркость</div><div class="sc-sub">Настройка яркости встроенного дисплея — <b class="br-val">${d.brightness}%</b></div></div>
            <input class="wsl" id="se-bright" type="range" min="15" max="100" value="${d.brightness}">
          </div>
          <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.moon}</span>`}<div class="sc-body"><div class="sc-title">Ночной свет</div><div class="sc-sub">Тёплые цвета помогают уснуть</div></div><button class="switch ${d.night?'on':''}" id="se-night"></button></div>
          <div class="se-card col"><div class="sc-body"><div class="sc-title">Масштаб</div><div class="sc-sub">Изменение размера текста, приложений и других элементов</div></div>
            <select class="winp" style="margin-top:10px;max-width:220px"><option>100% (рекомендуется)</option><option>125%</option><option>150%</option></select></div>
          <div class="se-card col"><div class="sc-body"><div class="sc-title">Разрешение экрана</div><div class="sc-sub">Текущее: ${innerWidth} × ${innerHeight} (рекомендуется)</div></div></div>`;
        sliderRow('se-bright', d.brightness, 15, 100, v=>{
          setBrightness(v);
          const el = pageEl.querySelector('.br-val'); if(el) el.textContent=v+'%';
        });
        pageEl.querySelector('#se-night').addEventListener('click', function(){ setNight(!S.data.night); this.classList.toggle('on', S.data.night); });
      } else if(sub==='sound'){
        pageEl.innerHTML = `<div class="se-crumb">Система › <b>Звук</b></div><div class="se-h1">Звук</div>
          <div class="se-card col">
            <div class="sc-body"><div class="sc-title">Громкость</div><div class="sc-sub">Динамики (Realtek(R) Audio) — <b class="vl-val">${d.volume}%</b></div></div>
            <input class="wsl" id="se-vol" type="range" min="0" max="100" value="${d.volume}">
          </div>
          <div class="se-card">${`<span class="sc-ico">${I.speaker}</span>`}<div class="sc-body"><div class="sc-title">Динамики (Realtek(R) Audio)</div><div class="sc-sub">Устройство вывода по умолчанию • Готово</div></div><button class="btn small" id="se-test">Проверить</button></div>
          <div class="se-card">${`<span class="sc-ico">${I.speaker}</span>`}<div class="sc-body"><div class="sc-title">Системные звуки</div><div class="sc-sub">Звуковой сигнал уведомлений Windows</div></div><button class="btn small" id="se-playsnd">Воспроизвести</button></div>`;
        sliderRow('se-vol', d.volume, 0, 100, v=>{
          setVolume(v);
          const el = pageEl.querySelector('.vl-val'); if(el) el.textContent=v+'%';
        });
        pageEl.querySelector('#se-test').addEventListener('click', ()=>{ AudioFX.ensure(); AudioFX.startup(); });
        pageEl.querySelector('#se-playsnd').addEventListener('click', ()=>{ AudioFX.ensure(); AudioFX.notify(); });
      } else if(sub==='about'){
        pageEl.innerHTML = `<div class="se-crumb">Система › <b>О системе</b></div><div class="se-h1">О системе</div>
          <div class="se-about-logo"><img src="assets/boot-logo.png"><div><div class="sa-t">DESKTOP-ARENA11</div><div class="sa-s">Переименовать этот компьютер</div></div></div>
          <div class="se-card col"><div class="sc-title" style="font-weight:600">Характеристики устройства</div>
            <table class="se-specs">
              <tr><td>Процессор</td><td>Intel Core i5-12400, 2,50 ГГц</td></tr>
              <tr><td>Оперативная память</td><td>16,0 ГБ (доступно: 10,9 ГБ)</td></tr>
              <tr><td>Код устройства</td><td>1A2B-3C4D-11E6-2026</td></tr>
              <tr><td>Код продукта</td><td>00330-80000-00000-AA112</td></tr>
              <tr><td>Тип системы</td><td>64-разрядная, процессор x64</td></tr>
            </table></div>
          <div class="se-card col"><div class="sc-title" style="font-weight:600">Характеристики Windows</div>
            <table class="se-specs">
              <tr><td>Выпуск</td><td>Windows 11 Pro</td></tr>
              <tr><td>Версия</td><td>23H2</td></tr>
              <tr><td>Дата установки</td><td>24.11.2026</td></tr>
              <tr><td>Сборка ОС</td><td>22631.4460</td></tr>
            </table></div>`;
      }
    }
    else if(cur==='person'){
      pageEl.innerHTML = `<div class="se-h1">Персонализация</div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Фон (обои)</div><div class="se-wallpapers">${WALLPAPERS.map(w=>`<button class="se-wp ${d.wallpaper===w.id?'on':''}" data-wp="${w.id}" style="background-image:url(${w.url})" title="${esc(w.name)}"></button>`).join('')}</div></div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Режим приложений и Windows</div>
          <div class="seg" style="margin-top:10px;max-width:260px">
            <button data-th="light" class="${d.theme==='light'?'on':''}">Светлый</button>
            <button data-th="dark" class="${d.theme==='dark'?'on':''}">Тёмный</button>
          </div></div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Цвет (акцент)</div>
          <div class="se-swatches">${ACCENTS.map(c=>`<button class="se-sw ${d.accent===c?'on':''}" data-ac="${c}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.globe}</span>`}<div class="sc-body"><div class="sc-title">Эффекты прозрачности</div><div class="sc-sub">Окна и поверхности отображаются полупрозрачными</div></div><button class="switch ${d.transparency?'on':''}" id="se-tr"></button></div>`;
      pageEl.querySelectorAll('.se-wp').forEach(b=>b.addEventListener('click', ()=>{
        d.wallpaper=b.dataset.wp; S.changed(); applyWallpaper(); render();
        toast('Персонализация', 'Обои обновлены', 'photos');
      }));
      pageEl.querySelectorAll('[data-th]').forEach(b=>b.addEventListener('click', ()=>{
        d.theme=b.dataset.th; S.changed(); applyTheme(); applyTransparency(); render();
      }));
      pageEl.querySelectorAll('.se-sw').forEach(b=>b.addEventListener('click', ()=>{
        d.accent=b.dataset.ac; S.changed(); applyAccent(); render();
      }));
      pageEl.querySelector('#se-tr').addEventListener('click', function(){ d.transparency=!d.transparency; S.changed(); applyTransparency(); this.classList.toggle('on', d.transparency); });
    }
    else if(cur==='net'){
      pageEl.innerHTML = `<div class="se-h1">Сеть и Интернет</div>
        <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.wifi}</span>`}<div class="sc-body"><div class="sc-title">Wi-Fi</div><div class="sc-sub">${d.wifi?'Подключено к «Дом_5G» — защищено':'Отключено'}</div></div><button class="switch" id="se-wifi"></button></div>
        ${card({icon:I.globe, title:'Дом_5G', sub:d.wifi?'Подключено, защищено • Отличный сигнал':'Недоступно', right:`<span class="sc-arrow">${d.wifi?'✓':''}</span>`})}
        ${card({icon:I.lock, title:'Neighbour_2G', sub:'Защищено'})}
        ${card({icon:I.lock, title:'MTS_FREE', sub:'Открытая сеть'})}
        ${card({icon:I.globe, title:'Использование данных', sub:'Последние 30 дней: 24,7 ГБ', link:1})}`;
      syncSwitch(pageEl.querySelector('#se-wifi'), 'wifi', ()=>{ UI.renderQS(); render(); });
    }
    else if(cur==='bt'){
      pageEl.innerHTML = `<div class="se-h1">Bluetooth и устройства</div>
        <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.bt}</span>`}<div class="sc-body"><div class="sc-title">Bluetooth</div><div class="sc-sub">${d.bt?'Включено':'Выключено — устройства не отображаются'}</div></div><button class="switch" id="se-bt"></button></div>
        ${card({icon:I.speaker, title:'Наушники WH-1000', sub:d.bt?'Сопряжено • Батарея 82%':'Требуется Bluetooth'})}
        ${card({icon:I.pc, title:'Мышь Surface', sub:d.bt?'Подключено':'Требуется Bluetooth'})}
        ${card({icon:I.apps, title:'Добавить устройство', sub:'Телефон, наушники, клавиатура', link:1})}`;
      syncSwitch(pageEl.querySelector('#se-bt'), 'bt', ()=>{ UI.renderQS(); render(); });
    }
    else if(cur==='apps'){
      const storeApps = S.data.installed;
      pageEl.innerHTML = `<div class="se-h1">Приложения</div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Установленные приложения</div>
          <div class="sc-sub">${storeApps.length} приложений из Microsoft Store • всего ${Object.keys(APPS).length}</div></div>
        ${storeApps.map(id=>`<div class="se-card">${I[APPS[id].icon]}<div class="sc-body"><div class="sc-title">${esc(APPS[id].name)}</div><div class="sc-sub">${esc(APPS[id].dev)} • ${APPS[id].size}</div></div><button class="btn small" data-open="${id}">Открыть</button><button class="btn small" data-un="${id}">Удалить</button></div>`).join('') || '<div class="se-card"><div class="sc-body"><div class="sc-title" style="color:var(--txt2)">Скачайте приложения из Microsoft Store</div></div></div>'}
        ${card({icon:I.store, title:'Microsoft Store', sub:'Открыть магазин для загрузки приложений', link:1, go:'__store'})}`;
      pageEl.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click', ()=>WM.open(b.dataset.open)));
      pageEl.querySelectorAll('[data-un]').forEach(b=>b.addEventListener('click', ()=>{
        const id = b.dataset.un;
        S.data.installed = S.data.installed.filter(x=>x!==id);
        S.changed(); UI.renderIcons();
        WM.wins.forEach(w=>{ if(w.appId===id) WM.close(w.id); });
        toast('Параметры', `«${APPS[id].name}» удалено`, 'trash');
        render();
      }));
      const st = pageEl.querySelector('[data-go="__store"]');
      if(st) st.addEventListener('click', ()=>WM.open('store'));
    }
    else if(cur==='acc'){
      pageEl.innerHTML = `<div class="se-h1">Учётные записи</div>
        <div class="se-card"><span class="st-ava" style="width:44px;height:44px"></span><div class="sc-body"><div class="sc-title">Пользователь</div><div class="sc-sub">Локальная учётная запись • Администратор</div></div></div>
        ${card({icon:I.users, title:'Ваши данные', sub:'Учётные записи электронной почты, вход', link:1})}
        ${card({icon:I.lock, title:'Варианты входа', sub:'Windows Hello, PIN-код, графический ключ', link:1})}
        ${card({icon:I.cloud, title:'Резервное копирование Windows', sub:'Синхронизация параметров включена', link:1})}`;
    }
    else if(cur==='time'){
      const d2 = new Date();
      pageEl.innerHTML = `<div class="se-h1">Время и язык</div>
        <div class="se-card">${`<span class="sc-ico">${I.time}</span>`}<div class="sc-body"><div class="sc-title">Дата и время</div><div class="sc-sub">${d2.toLocaleString('ru-RU')}</div></div><button class="switch on" style="pointer-events:none"></button></div>
        ${card({icon:I.globe, title:'Часовой пояс', sub:'UTC+03:00 Москва, Санкт-Петербург', link:1})}
        ${card({icon:I.time, title:'Язык и регион', sub:'Русский (Россия) • Русская раскладка', link:1})}`;
    }
    else if(cur==='games'){
      pageEl.innerHTML = `<div class="se-h1">Игры</div>
        <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.game}</span>`}<div class="sc-body"><div class="sc-title">Режим игры</div><div class="sc-sub">Приоритет ресурсов для игр</div></div><button class="switch on" data-k="gameMode"></button></div>
        ${card({icon:I.store, title:'Xbox Game Pass', sub:'Откройте для себя сотни игр', link:1})}
        ${card({icon:I.apps, title:'Установленные игры', sub:'Змейка Neon, Сапёр и другие', link:1})}`;
      syncSwitch(pageEl.querySelector('[data-k="gameMode"]'), 'gameMode');
    }
    else if(cur==='access'){
      pageEl.innerHTML = `<div class="se-h1">Специальные возможности</div>
        ${card({icon:I.monitor, title:'Размер текста', sub:'Только в полной версии Windows', link:1})}
        ${card({icon:I.bell, title:'Визуальные эффекты', sub:'Прозрачность, анимация', link:1})}
        ${card({icon:I.speaker, title:'Экранный диктор', sub:'Чтение текста вслух', link:1})}
        ${card({icon:I.lock, title:'Экранная лупа', sub:'Увеличение области экрана', link:1})}`;
    }
    else if(cur==='privacy'){
      pageEl.innerHTML = `<div class="se-h1">Конфиденциальность и защита</div>
        <div class="se-card">${`<span class="sc-ico">${I.shield}</span>`}<div class="sc-body"><div class="sc-title">Безопасность Windows</div><div class="sc-sub">Защита в реальном времени • Угроз не обнаружено</div></div><span class="sc-arrow">✓</span></div>
        ${card({icon:I.globe, title:'Разрешения для расположения', sub:'Приложения не запрашивали доступ', link:1})}
        ${card({icon:I.photos, title:'Камера', sub:'Нет доступа', link:1})}
        ${card({icon:I.speaker, title:'Микрофон', sub:'Нет доступа', link:1})}`;
    }
    else if(cur==='update'){
      pageEl.innerHTML = `<div class="se-h1">Центр обновления Windows</div>
        <div class="se-card col" id="up-card">
          <div style="display:flex;align-items:center;gap:15px;width:100%">
            ${`<span class="sc-ico" style="width:26px;height:26px">${I.win}</span>`}
            <div class="sc-body"><div class="sc-title" id="up-status">Проверьте наличие обновлений</div><div class="sc-sub" id="up-sub">Устройство защищено и обновлено</div></div>
            <button class="btn acc" id="up-check">Проверить наличие обновлений</button>
          </div>
        </div>
        ${card({icon:I.time, title:'История обновлений', sub:'Обновление для Windows 11 (23H2) — установлено 20.11.2026', link:1})}
        ${card({icon:I.apps, title:'Дополнительные параметры', sub:'Часы активности, доставка обновлений', link:1})}`;
      pageEl.querySelector('#up-check').addEventListener('click', function(){
        this.disabled=true; this.textContent='Проверка...';
        const st = pageEl.querySelector('#up-status'), su = pageEl.querySelector('#up-sub');
        setTimeout(()=>{ st.textContent='Загрузка обновлений — 45%'; su.textContent='Обновление для Windows 11 (KB5039302)'; }, 900);
        setTimeout(()=>{ st.textContent='Перезагрузка не требуется'; su.textContent='Вы используете последнюю версию'; this.disabled=false; this.textContent='Проверить наличие обновлений'; AudioFX.notify(); toast('Windows Update','Все обновления установлены','refresh'); }, 2600);
      });
    }

    if(!pageEl.innerHTML){
      pageEl.innerHTML = `<div class="se-h1">${esc(T)}</div><div class="se-card"><div class="sc-body"><div class="sc-title" style="color:var(--txt2)">Раздел в разработке</div></div></div>`;
    }
  }

  body.querySelectorAll('.se-nav').forEach(b=>{
    b.addEventListener('click', ()=>{
      cur=b.dataset.p; sub=null;
      body.querySelectorAll('.se-nav').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      render();
    });
  });
  body.querySelector('.se-nav[data-p="system"]').classList.add('on');

  // синхронизация при изменении состояния извне
  const syncer = ()=>{ if(cur==='system'&&sub==='display') return; };
  S.on(syncer);
  win.onClose = ()=>{ const i = S.listeners.indexOf(syncer); if(i>=0) S.listeners.splice(i,1); };

  render();
};
APPS.settings.onArgs = function(win, args){
  if(!args) return;
  if(args.page==='display'){ /* открыть Дисплей */ }
};
