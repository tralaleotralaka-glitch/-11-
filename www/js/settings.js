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

  // навигация из любого места (контекстные меню, быстрые действия, трей)
  win._nav = (page)=>{
    const subs = ['display','sound','power','about'];
    if(subs.includes(page)){ cur='system'; sub=page; }
    else { cur=page; sub=null; }
    body.querySelectorAll('.se-nav').forEach(x=>x.classList.toggle('on', x.dataset.p===cur));
    render();
  };

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
          ${card({icon:I.battery, title:'Питание и батарея', sub:Battery.pct()+'% • '+Battery.leftText(), right:'<span class="sc-arrow">›</span>', link:1, go:'power'})}
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
      } else if(sub==='power'){
        Battery.refresh();
        const pct = Battery.pct();
        const modes = ['Экономный', 'Сбалансированный', 'Наилучшая производительность'];
        const pm = S.data.powerMode==null ? 1 : S.data.powerMode;
        // график за 24 часа: 100% -> текущий уровень
        const pts = Array.from({length:25}, (_,i)=>{
          const t = i/24;
          const noise = Math.sin(i*2.7)*1.2 + Math.sin(i*1.3)*.8;
          const v = clamp(pct + (100-pct)*Math.pow(1-t, 1.35) + noise, pct-1, 100);
          const x = (t*280).toFixed(1), y = ((100-v)/100*78+8).toFixed(1);
          return `${x},${y}`;
        });
        const nowX = (24*280/24).toFixed(0);
        const usage = [['Экран',34,'#0078D4'],['Система',22,'#9AA7B4'],['Microsoft Edge',14,'#3E76C4'],['Microsoft Store',9,'#18A89C'],['Змейка Neon',7,'#7B5BE6'],['Прочее',14,'#C9D4DE']];
        pageEl.innerHTML = `<div class="se-crumb">Система › <b>Питание и батарея</b></div><div class="se-h1">Питание и батарея</div>
          <div class="se-card col se-batt-hero">
            <div class="sb-top">
              <div class="sb-gfx ${Battery.charging?'chg':''}"><i style="height:${pct}%"></i><b>${pct}%</b></div>
              <div class="sc-body"><div class="sc-title" style="font-size:16px">${Battery.charging?'⚡ Заряжается':'От батареи'}</div>
              <div class="sc-sub">${Battery.leftText()}${Battery.real && Battery.temp ? ` • температура ${Battery.temp.toFixed(0)}°C` : ''}</div>
              <div class="sc-sub" style="color:var(--txt3)">${Battery.real?'Данные с устройства Android':'Демо-режим: симуляция расхода'}</div></div>
            </div>
            <div class="se-chart">
              <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs><linearGradient id="bcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".45"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
                <g stroke="var(--stroke)" stroke-width="1"><line x1="0" y1="8" x2="300" y2="8"/><line x1="0" y1="47" x2="300" y2="47"/><line x1="0" y1="86" x2="300" y2="86"/></g>
                <polygon points="0,100 ${pts.join(' ')} 300,100" fill="url(#bcg)"/>
                <polyline points="${pts.join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.4" stroke-linejoin="round"/>
                <circle cx="${nowX}" cy="${((100-pct)/100*78+8).toFixed(1)}" r="3.4" fill="var(--acc)"/>
              </svg>
              <div class="se-chart-x"><span>24 ч назад</span><span>12 ч</span><span>сейчас</span></div>
            </div>
          </div>
          <div class="se-card se-toggle-row"><span class="sc-ico">${I.leaf}</span><div class="sc-body"><div class="sc-title">Экономия заряда</div><div class="sc-sub">Ограничивает фоновую активность и уведомления</div></div><button class="switch ${d.saver?'on':''}" id="se-saver"></button></div>
          <div class="se-card col"><div class="sc-body"><div class="sc-title">Режим питания</div><div class="sc-sub">Баланс между производительностью и зарядом</div></div>
            <div class="seg" style="margin-top:10px;flex-wrap:wrap" id="se-modes">${modes.map((m,i)=>`<button data-m="${i}" class="${pm===i?'on':''}">${m}</button>`).join('')}</div></div>
          <div class="se-card col"><div class="sc-title" style="font-weight:600">Расход заряда за 24 часа</div>
            ${usage.map(u=>`<div class="se-usage"><span class="su-name">${u[0]}</span><span class="su-bar"><i style="width:${u[1]*2.4}%;background:${u[2]}"></i></span><span class="su-pct">${u[1]}%</span></div>`).join('')}
          </div>`;
        pageEl.querySelector('#se-saver').addEventListener('click', function(){
          S.data.saver = !S.data.saver; S.changed();
          this.classList.toggle('on', S.data.saver);
          toast('Питание', S.data.saver?'Экономия заряда включена':'Экономия заряда выключена', 'leaf');
        });
        pageEl.querySelectorAll('#se-modes button').forEach(b=>b.addEventListener('click', ()=>{
          S.data.powerMode = +b.dataset.m; S.changed();
          pageEl.querySelectorAll('#se-modes button').forEach(x=>x.classList.remove('on'));
          b.classList.add('on');
        }));
      } else if(sub==='about'){
        const info = Bridge.deviceInfo();
        const gb = b => (b/1073741824).toFixed(1);
        const dpr = window.devicePixelRatio || 1;
        const devName = S.data.deviceName || (info ? info.model : 'DESKTOP-ARENA11');
        const install = S.data.installDate ? new Date(S.data.installDate).toLocaleDateString('ru-RU') : '24.11.2026';
        const hwRows = info ? [
          ['Имя устройства', esc(devName)],
          ['Полное имя', esc(`${info.manufacturer||''} ${info.model||''}`.trim())],
          ['Процессор', `${info.cpuCores}-ядерный (${info.abi||'ARM64'})`],
          ['Оперативная память', `${gb(info.ramTotal)} ГБ (доступно: ${gb(info.ramAvail)} ГБ)`],
          ['Дисплей', `${Math.round(info.screenW*dpr)} × ${Math.round(info.screenH*dpr)} • ${Math.round(info.density||dpr*160)} dpi`],
          ['Накопитель', `свободно ${gb(info.storageFree)} ГБ из ${gb(info.storageTotal)} ГБ`],
          ['Тип системы', '64-разрядная ОС, процессор ARM64'],
        ] : [
          ['Имя устройства', esc(devName)],
          ['Процессор', 'Intel Core i5-12400, 2,50 ГГц'],
          ['Оперативная память', '16,0 ГБ (доступно: 10,9 ГБ)'],
          ['Дисплей', `${innerWidth} × ${innerHeight} • 96 dpi`],
          ['Код устройства', '1A2B-3C4D-11E6-2026'],
          ['Код продукта', '00330-80000-00000-AA112'],
          ['Тип системы', '64-разрядная, процессор x64'],
        ];
        pageEl.innerHTML = `<div class="se-crumb">Система › <b>О системе</b></div><div class="se-h1">О системе</div>
          <div class="se-about-logo"><img src="assets/boot-logo.png"><div><div class="sa-t">${esc(devName)}</div><button class="btn small" id="se-rename" style="margin-top:5px">Переименовать это устройство</button></div></div>
          <div class="se-card col"><div class="sc-title" style="font-weight:600">Характеристики устройства${info?' <span style="color:var(--acc);font-size:11px;font-weight:400">— реальные данные вашего девайса</span>':''}</div>
            <table class="se-specs">
              ${hwRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}
            </table></div>
          <div class="se-card col"><div class="sc-title" style="font-weight:600">Характеристики Windows</div>
            <table class="se-specs">
              <tr><td>Выпуск</td><td>Windows 11 Pro</td></tr>
              <tr><td>Версия</td><td>23H2</td></tr>
              <tr><td>Дата установки</td><td>${install}</td></tr>
              <tr><td>Сборка ОС</td><td>22631.4460</td></tr>
              ${info?`<tr><td>Оболочка на базе</td><td>Android ${esc(info.android||'')} (SDK ${esc(String(info.sdk||''))})</td></tr>`:''}
            </table></div>`;
        pageEl.querySelector('#se-rename').addEventListener('click', e=>{
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          Ctx.build([
            {label:'Новое имя устройства:', input:'', action:val=>{
              if(!val.trim()) return;
              S.data.deviceName = val.trim(); S.changed();
              render();
              toast('О системе', `Устройство переименовано в «${val.trim()}»`, 'pc');
            }},
          ], r.left-40, r.bottom+8);
        });
      }
    }
    else if(cur==='taskbar'){
      const al = S.data.tbAlign || 'center';
      pageEl.innerHTML = `<div class="se-h1">Панель задач</div>
        <div class="se-card col"><div class="sc-body"><div class="sc-title">Выравнивание панели задач</div><div class="sc-sub">Центр — как в Windows 11 по умолчанию, слева — классическое</div></div>
          <div class="seg" style="margin-top:10px;max-width:240px" id="se-align">
            <button data-a="center" class="${al==='center'?'on':''}">По центру</button>
            <button data-a="left" class="${al==='left'?'on':''}">Слева</button>
          </div></div>
        <div class="se-card se-toggle-row"><span class="sc-ico">${I.weather}</span><div class="sc-body"><div class="sc-title">Погодный виджет</div><div class="sc-sub">Показывать погоду слева на панели задач</div></div><button class="switch ${S.data.weatherWidget!==false?'on':''}" id="se-ww"></button></div>
        <div class="se-card se-toggle-row"><span class="sc-ico">${I.battery}</span><div class="sc-body"><div class="sc-title">Процент заряда</div><div class="sc-sub">Показывать процент рядом со значком батареи</div></div><button class="switch on" id="se-bpct" style="pointer-events:none"></button></div>`;
      pageEl.querySelectorAll('#se-align button').forEach(b=>b.addEventListener('click', ()=>{
        S.data.tbAlign = b.dataset.a; S.changed(); UI.renderTaskbar(); render();
      }));
      pageEl.querySelector('#se-ww').addEventListener('click', function(){
        S.data.weatherWidget = S.data.weatherWidget===false ? true : false;
        S.changed(); UI.renderTaskbar(); this.classList.toggle('on', S.data.weatherWidget!==false);
      });
    }
    else if(cur==='person'){
      pageEl.innerHTML = `<div class="se-h1">Персонализация</div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Фон (обои)</div><div class="se-wallpapers">${WALLPAPERS.map(w=>`<button class="se-wp ${d.wallpaper===w.id && !d.wallpaperCustom?'on':''}" data-wp="${w.id}" style="background-image:url(${w.url})" title="${esc(w.name)}"></button>`).join('')}</div></div>
        <div class="se-card col" id="se-custom-card">
          <div class="sc-body"><div class="sc-title" style="font-weight:600">Фото с устройства</div>
          <div class="sc-sub">Выберите любое фото с телефона или своё изображение — оно станет фоном рабочего стола</div></div>
          <div class="se-wallpapers" id="se-phone-photos"></div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn small" id="se-pickfile">${I.gallery} Выбрать файл…</button>
            ${d.wallpaperCustom?'<button class="btn small" id="se-custreset">Сбросить своё фото</button>':''}
          </div>
          <input type="file" id="se-file" accept="image/*" style="display:none">
        </div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Режим приложений и Windows</div>
          <div class="seg" style="margin-top:10px;max-width:260px">
            <button data-th="light" class="${d.theme==='light'?'on':''}">Светлый</button>
            <button data-th="dark" class="${d.theme==='dark'?'on':''}">Тёмный</button>
          </div></div>
        <div class="se-card col"><div class="sc-title" style="font-weight:600">Цвет (акцент)</div>
          <div class="se-swatches">${ACCENTS.map(c=>`<button class="se-sw ${d.accent===c?'on':''}" data-ac="${c}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="se-card se-toggle-row">${`<span class="sc-ico">${I.globe}</span>`}<div class="sc-body"><div class="sc-title">Эффекты прозрачности</div><div class="sc-sub">Окна и поверхности отображаются полупрозрачными</div></div><button class="switch ${d.transparency?'on':''}" id="se-tr"></button></div>`;
      pageEl.querySelectorAll('.se-wp').forEach(b=>b.addEventListener('click', ()=>{
        d.wallpaper=b.dataset.wp; d.wallpaperCustom=null; S.changed(); applyWallpaper(); render();
        toast('Персонализация', 'Обои обновлены', 'photos');
      }));

      /* ---- фото с телефона / свои файлы ---- */
      const setCustomPath = p=>{
        d.wallpaperCustom = {path:p}; d.wallpaper='__custom'; S.changed(); applyWallpaper();
        toast('Персонализация', 'Обои установлены из вашего фото', 'photos');
        render();
      };
      const imgGrid = pageEl.querySelector('#se-phone-photos');
      if(Bridge.available){
        (function loadPhonePhotos(){
          let items = null;
          for(const folder of ['phone:/DCIM/Camera','phone:/DCIM','phone:/Pictures','phone:/Download','phone:/']){
            const r = Bridge.list(folder);
            if(r && r.ok){
              const imgs = r.items.filter(it=>!it.d && /\.(jpg|jpeg|png|webp|bmp)$/i.test(it.n));
              if(imgs.length){ items = imgs.slice(0,12); break; }
            }
          }
          if(!items){
            imgGrid.innerHTML = '<div class="sc-sub" style="margin-top:10px">Фото на телефоне не найдены. Сфотографируйте что-нибудь камерой — или выберите файл ниже.</div>';
            return;
          }
          imgGrid.innerHTML = items.map((it,i)=>`<button class="se-wp ${d.wallpaperCustom&&d.wallpaperCustom.path===it.p?'on':''}" data-path="${esc(it.p)}" data-i="${i}" title="${esc(it.n)}"><span class="se-wp-thumb" data-p="${esc(it.p)}"></span></button>`).join('');
          imgGrid.querySelectorAll('.se-wp-thumb').forEach(el=>{
            const r = Bridge.readThumb(el.dataset.p);
            if(r && r.ok) el.style.backgroundImage = `url(data:${r.mime};base64,${r.b64})`;
            else el.parentElement.style.display='none';
          });
          imgGrid.querySelectorAll('.se-wp').forEach(b=>b.addEventListener('click', ()=>setCustomPath(b.dataset.path)));
        })();
      } else {
        imgGrid.innerHTML = '<div class="sc-sub" style="margin-top:10px">В APK-версии здесь появятся фото из вашего телефона (DCIM, Pictures). В браузере — выберите файл кнопкой ниже.</div>';
      }
      pageEl.querySelector('#se-pickfile').addEventListener('click', ()=>pageEl.querySelector('#se-file').click());
      pageEl.querySelector('#se-file').addEventListener('change', function(){
        const f = this.files && this.files[0];
        if(!f) return;
        const rd = new FileReader();
        rd.onload = ()=>{
          d.wallpaperCustom = {data:rd.result}; d.wallpaper='__custom';
          try{ S.changed(); }catch(e){}
          applyWallpaper();
          toast('Персонализация', 'Обои установлены из выбранного файла', 'photos');
          render();
        };
        rd.readAsDataURL(f);
      });
      const rst = pageEl.querySelector('#se-custreset');
      if(rst) rst.addEventListener('click', ()=>{
        d.wallpaperCustom=null; d.wallpaper='bloom'; S.changed(); applyWallpaper(); render();
      });

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

  /* компактный сайдбар по ширине ОКНА, а не экрана */
  const applyCompact = ()=>{
    const root = body.querySelector('.se-root');
    if(root) root.classList.toggle('compact', win.el.clientWidth < 800);
  };
  applyCompact();
  win.timers.push(setInterval(applyCompact, 400));

  render();
};
APPS.settings.onArgs = function(win, args){
  if(args && args.page && win._nav) win._nav(args.page);
};
