/* ============ Windows 11 clone — ядро системы ============ */
'use strict';

/* ---------- Состояние ---------- */
const S = {
  data: {
    theme:'dark', wallpaper:'bloom', accent:'#0078D4', volume:65, brightness:90, night:false,
    transparency:true, wifi:true, bt:false, air:false, saver:false,
    installed:[], iconPos:{}, notepadText:'', tasks:[], firstRun:true, userName:'Пользователь',
  },
  listeners: [],
  load(){
    try{
      const raw = localStorage.getItem('win11.state');
      if(raw) Object.assign(this.data, JSON.parse(raw));
    }catch(e){}
  },
  save(){
    try{ localStorage.setItem('win11.state', JSON.stringify(this.data)); }catch(e){}
  },
  changed(){
    this.save();
    this.listeners.forEach(f=>{ try{f();}catch(e){} });
  },
  on(f){ this.listeners.push(f); },
};

/* ---------- Звук ---------- */
const AudioFX = {
  ctx:null, master:null,
  ensure(){
    if(!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = (S.data.volume/100)*0.5;
      this.master.connect(this.ctx.destination);
    }
    if(this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  setVolume(v){ if(this.master) this.master.gain.value = (v/100)*0.5; },
  tone(freq, t0, dur, wave='sine', vol=0.5){
    if(!this.ensure()) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = wave; o.frequency.value = freq;
    const now = this.ctx.currentTime + t0;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now+dur+0.05);
  },
  startup(){ // мягкий перезвон при входе
    this.tone(392, 0, 0.5, 'sine', .35);
    this.tone(523.25, 0.12, 0.6, 'sine', .3);
    this.tone(659.25, 0.24, 0.8, 'sine', .28);
    this.tone(783.99, 0.42, 1.0, 'sine', .22);
  },
  shutdownSnd(){
    this.tone(659.25, 0, 0.35, 'sine', .3);
    this.tone(523.25, 0.14, 0.4, 'sine', .3);
    this.tone(392, 0.3, 0.7, 'sine', .32);
  },
  notify(){ this.tone(880, 0, 0.18, 'sine', .35); this.tone(1174.66, 0.16, 0.3, 'sine', .3); },
  error(){ this.tone(220, 0, 0.25, 'square', .12); },
  click(){ this.tone(1600, 0, 0.03, 'sine', .06); },
};

/* ---------- Мост к Android (файлы телефона, батарея) ---------- */
const Bridge = {
  get available(){ return typeof window.AndroidBridge !== 'undefined' && !!window.AndroidBridge; },
  list(path){
    if(!this.available) return {ok:false, error:'no-bridge'};
    try{ return JSON.parse(AndroidBridge.listFiles(path)); }catch(e){ return {ok:false, error:'bridge'}; }
  },
  readB64(path){
    if(!this.available) return {ok:false, error:'no-bridge'};
    try{ return JSON.parse(AndroidBridge.readFileB64(path)); }catch(e){ return {ok:false, error:'bridge'}; }
  },
  readText(path){
    if(!this.available) return {ok:false, error:'no-bridge'};
    try{ return JSON.parse(AndroidBridge.readText(path)); }catch(e){ return {ok:false, error:'bridge'}; }
  },
  battery(){
    if(!this.available) return null;
    try{ return JSON.parse(AndroidBridge.getBattery()); }catch(e){ return null; }
  },
  deviceInfo(){
    if(!this.available) return null;
    try{ return JSON.parse(AndroidBridge.getDeviceInfo()); }catch(e){ return null; }
  },
};

/* ---------- Батарея (реальная на телефоне, симуляция в браузере) ---------- */
const Battery = {
  level:.86, charging:false, real:false, _t0:null,
  refresh(){
    const b = Bridge.battery();
    if(b && typeof b.level === 'number'){
      this.level = b.level; this.charging = !!b.charging; this.real = true;
      this.temp = typeof b.temp === 'number' ? b.temp : this.temp;
      return;
    }
    if(!this._t0) this._t0 = Date.now();
    const hours = (Date.now()-this._t0)/3600000;
    if(S.data.saver) this.level = Math.max(.06, this.level - hours*.004);
    else this.level = Math.max(.06, .86 - hours*.018);
    this.charging = false; this.real = false;
  },
  pct(){ this.refresh(); return Math.round(this.level*100); },
  left(){
    const drain = this.charging ? -.30 : (S.data.saver ? .005 : .018);
    if(drain <= 0) return 99;
    return (this.level-.05)/drain;
  },
  leftText(){
    const h = this.left();
    if(h >= 99) return 'Заряд держится очень долго';
    return `Осталось примерно ${Math.floor(h)} ч ${Math.round((h%1)*60)} мин`;
  },
};

/* ---------- Утилиты ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
function ico(id, size){ return `<span style="width:${size||24}px;height:${size||24}px;display:inline-block">${I[id]||''}</span>`; }

/* ---------- Уведомления ---------- */
const notifHistory = [];
function toast(title, text, icon){
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="tst-ico">${I[icon||'store']||I['bell']}</div><div><div class="tst-title">${esc(title)}</div>${text?`<div class="tst-text">${esc(text)}</div>`:''}</div>`;
  $('#toasts').appendChild(el);
  notifHistory.unshift({title, text, icon:icon||'bell', time:new Date()});
  if(notifHistory.length>8) notifHistory.pop();
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 250); }, 4200);
}

/* ---------- Контекстное меню ---------- */
const Ctx = {
  el:null,
  build(items, x, y){
    this.close();
    const root = this.el = document.createElement('div');
    this.renderItems(items, root);
    document.body.appendChild(root);
    root.style.display='block';
    const r = root.getBoundingClientRect();
    root.style.left = clamp(x, 2, innerWidth - r.width - 4)+'px';
    root.style.top  = clamp(y, 2, innerHeight - r.height - 4)+'px';
    setTimeout(()=>document.addEventListener('pointerdown', this._close = (e)=>{ if(!root.contains(e.target)) this.close(); }), 10);
  },
  renderItems(items, host){
    items.forEach(it=>{
      if(it === '-'){ const s=document.createElement('div'); s.className='ctx-sep'; host.appendChild(s); return; }
      const d = document.createElement('div');
      d.className = 'ctx-item'+(it.disabled?' disabled':'')+(it.sub?' has-sub':'');
      d.innerHTML = `<span class="ci-ico">${it.icon||''}</span><span>${it.label}</span>`+
        (it.sub?'<span class="ci-arrow">›</span>':'');
      if(it.input){
        const inp = document.createElement('input'); inp.className='ni'; inp.placeholder=it.input;
        inp.addEventListener('keydown', e=>{ if(e.key==='Enter' && inp.value.trim()){ it.action(inp.value.trim()); this.close(); } });
        d.appendChild(inp);
        setTimeout(()=>inp.focus(),30);
      }
      if(it.sub){
        const sub = document.createElement('div'); sub.className='ctx-sub';
        this.renderItems(it.sub, sub);
        d.appendChild(sub);
      } else if(it.action){
        d.addEventListener('click', ()=>{ this.close(); it.action(); });
      }
      host.appendChild(d);
    });
  },
  close(){
    if(this.el){ this.el.remove(); this.el=null; }
    if(this._close){ document.removeEventListener('pointerdown', this._close); this._close=null; }
  }
};
document.addEventListener('contextmenu', e=>e.preventDefault());

/* ---------- Оконный менеджер ---------- */
const WM = {
  wins: new Map(), seq:0, zTop:100, cascade:0,
  focused: null,

  open(appId, args){
    const reg = APPS[appId];
    if(!reg) return null;
    const existing = [...this.wins.values()].find(w=>w.appId===appId);
    if(existing){
      if(existing.minimized) this.restore(existing.id);
      this.focus(existing.id);
      if(reg.onArgs) reg.onArgs(existing, args);
      return existing;
    }
    const vw = innerWidth, vh = innerHeight-48;
    let w = Math.min(reg.w||800, vw-24), h = Math.min(reg.h||540, vh-16);
    const n = this.cascade++ % 6;
    let x = Math.round((vw-w)/2) + n*26 - 60;
    let y = Math.round((vh-h)/2) + n*20 - 40;
    x = clamp(x, 4, vw-w-4); y = clamp(y, 4, vh-h-4);

    const id = 'w'+(++this.seq);
    const el = document.createElement('div');
    el.className = 'window opening';
    el.dataset.id = id;
    el.innerHTML = `
      <div class="titlebar">
        <div class="t-ico">${I[reg.icon]||''}</div>
        <div class="t-title">${esc(reg.name)}</div>
        <div class="t-ctl">
          <button class="tbtn tb-min" title="Свернуть"><svg viewBox="0 0 16 16"><path d="M3 8.5h10" stroke="currentColor" stroke-width="1.1"/></svg></button>
          <button class="tbtn tb-max" title="Развернуть"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="3.5" y="3.5" width="9" height="9" rx="1.2"/></svg></button>
          <button class="tbtn tb-close" title="Закрыть"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.1"/></svg></button>
        </div>
      </div>
      <div class="w-body"></div>
      ${['n','s','e','w','ne','nw','se','sw'].map(d=>`<div class="rz rz-${d}" data-dir="${d}"></div>`).join('')}`;
    $('#windows').appendChild(el);

    const win = {id, appId, el, x, y, w, h, min:false, max:false, prev:null, onClose:null, timers:[]};
    this.wins.set(id, win);
    this.place(win);
    this.focus(id);

    win.body = el.querySelector('.w-body');
    reg.render(win.body, win, args);
    if(reg.onArgs && args) reg.onArgs(win, args);

    setTimeout(()=>el.classList.remove('opening'), 170);

    el.addEventListener('pointerdown', ()=>this.focus(id), true);
    el.querySelector('.tb-min').addEventListener('click', e=>{ e.stopPropagation(); this.minimize(id); });
    el.querySelector('.tb-max').addEventListener('click', e=>{ e.stopPropagation(); this.toggleMax(id); });
    el.querySelector('.tb-close').addEventListener('click', e=>{ e.stopPropagation(); this.close(id); });

    this.setupDrag(win);
    this.setupResize(win);
    UI.renderTaskbar();
    return win;
  },

  place(win){
    if(win.max){
      Object.assign(win.el.style, {left:'0', top:'0', width:'100%', height:'100%'});
    } else {
      Object.assign(win.el.style, {left:win.x+'px', top:win.y+'px', width:win.w+'px', height:win.h+'px'});
    }
  },

  focus(id){
    const win = this.wins.get(id); if(!win) return;
    if(this.focused && this.focused!==id){
      const old = this.wins.get(this.focused);
      if(old){ old.el.classList.add('blurred'); old.el.classList.remove('active'); }
    }
    this.focused = id;
    win.el.classList.remove('blurred');
    win.el.classList.add('active');
    win.el.style.zIndex = ++this.zTop;
    UI.renderTaskbar();
  },

  minimize(id){
    const win = this.wins.get(id); if(!win) return;
    win.min = true;
    win.el.classList.add('minimized');
    setTimeout(()=>{ if(win.min) win.el.style.visibility='hidden'; }, 200);
    if(this.focused===id) this.focused = null;
    UI.renderTaskbar();
  },

  restore(id){
    const win = this.wins.get(id); if(!win) return;
    win.min = false;
    win.el.style.visibility='';
    requestAnimationFrame(()=>win.el.classList.remove('minimized'));
    this.focus(id);
  },

  toggleMax(id){
    const win = this.wins.get(id); if(!win) return;
    if(win.max){
      win.max = false;
      win.el.classList.remove('max');
      Object.assign(win, win.prev||{});
      this.place(win);
    } else {
      win.prev = {x:win.x, y:win.y, w:win.w, h:win.h};
      win.max = true;
      win.el.classList.add('max');
      this.place(win);
    }
    const btn = win.el.querySelector('.tb-max svg');
    btn.innerHTML = win.max
      ? '<rect x="2.8" y="5.3" width="8.4" height="8.4" rx="1.2"/><path d="M5.6 5.3V3.9a1.1 1.1 0 0 1 1.1-1.1h6.6a1.1 1.1 0 0 1 1.1 1.1v6.6a1.1 1.1 0 0 1-1.1 1.1h-1.4"/>'
      : '<rect x="3.5" y="3.5" width="9" height="9" rx="1.2"/>';
  },

  snapTo(id, mode){
    const win = this.wins.get(id); if(!win) return;
    const vw = innerWidth, vh = innerHeight-48;
    if(mode==='max'){ if(!win.max) this.toggleMax(id); return; }
    if(win.max){ win.max=false; win.el.classList.remove('max'); }
    if(!win.prev) win.prev = {x:win.x, y:win.y, w:win.w, h:win.h};
    if(mode==='left')  Object.assign(win, {x:0, y:0, w:Math.round(vw/2), h:vh});
    if(mode==='right') Object.assign(win, {x:Math.round(vw/2), y:0, w:Math.round(vw/2), h:vh});
    if(mode==='tl') Object.assign(win, {x:0, y:0, w:Math.round(vw/2), h:Math.round(vh/2)});
    if(mode==='tr') Object.assign(win, {x:Math.round(vw/2), y:0, w:Math.round(vw/2), h:Math.round(vh/2)});
    if(mode==='bl') Object.assign(win, {x:0, y:Math.round(vh/2), w:Math.round(vw/2), h:Math.round(vh/2)});
    if(mode==='br') Object.assign(win, {x:Math.round(vw/2), y:Math.round(vh/2), w:Math.round(vw/2), h:Math.round(vh/2)});
    this.place(win);
  },

  close(id){
    const win = this.wins.get(id); if(!win) return;
    win.timers.forEach(t=>clearInterval(t));
    if(win.onClose) try{ win.onClose(); }catch(e){}
    this.wins.delete(id);
    if(this.focused===id) this.focused=null;
    win.el.classList.add('closing');
    setTimeout(()=>win.el.remove(), 170);
    setTimeout(()=>UI.renderTaskbar(), 180);
  },

  setupDrag(win){
    const bar = win.el.querySelector('.titlebar');
    const ghost = $('#snap-ghost');
    let sx, sy, ox, oy, drag=false, pending=null;
    bar.addEventListener('pointerdown', e=>{
      if(e.target.closest('.t-ctl')) return;
      drag = true; bar.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY; ox = win.x; oy = win.y; pending=null;
    });
    bar.addEventListener('pointermove', e=>{
      if(!drag) return;
      const dx = e.clientX-sx, dy = e.clientY-sy;
      if(win.max && Math.abs(dy)+Math.abs(dx)>8){
        win.max=false; win.el.classList.remove('max');
        const pr = win.prev||{w:800,h:540};
        win.w = pr.w; win.h = pr.h;
        win.x = Math.round(e.clientX - win.w/2); win.y = Math.max(0, e.clientY-18);
        this.place(win); ox=win.x; oy=win.y;
      }
      win.x = clamp(ox+dx, -win.w+90, innerWidth-90);
      win.y = clamp(oy+dy, 0, innerHeight-48-40);
      this.place(win);
      // прилипание к краям
      const vw=innerWidth, vh=innerHeight-48;
      pending=null; ghost.style.display='none';
      if(e.clientY<=4){ pending='max';   this.showGhost(0,0,vw,vh); }
      else if(e.clientX<=4){ pending='left';  this.showGhost(0,0,Math.round(vw/2),vh); }
      else if(e.clientX>=vw-4){ pending='right'; this.showGhost(Math.round(vw/2),0,Math.round(vw/2),vh); }
    });
    const end = e=>{
      if(!drag) return;
      drag=false; ghost.style.display='none';
      if(pending) this.snapTo(win.id, pending);
      pending=null;
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  },
  showGhost(x,y,w,h){
    const g = $('#snap-ghost');
    Object.assign(g.style, {display:'block', left:x+'px', top:y+'px', width:w+'px', height:h+'px'});
  },

  setupResize(win){
    win.el.querySelectorAll('.rz').forEach(h=>{
      let sx, sy, o, active=false;
      h.addEventListener('pointerdown', e=>{
        if(win.max) return;
        active=true; h.setPointerCapture(e.pointerId);
        sx=e.clientX; sy=e.clientY;
        o = {x:win.x, y:win.y, w:win.w, h:win.h};
        e.stopPropagation();
      });
      h.addEventListener('pointermove', e=>{
        if(!active) return;
        const dx=e.clientX-sx, dy=e.clientY-sy, d=h.dataset.dir;
        if(d.includes('e')) win.w = clamp(o.w+dx, 320, innerWidth);
        if(d.includes('s')) win.h = clamp(o.h+dy, 220, innerHeight-48);
        if(d.includes('w')){ const nw=clamp(o.w-dx,320,innerWidth); win.x=o.x+(o.w-nw); win.w=nw; }
        if(d.includes('n')){ const nh=clamp(o.h-dy,220,innerHeight-48); win.y=o.y+(o.h-nh); win.h=nh; }
        this.place(win);
      });
      const end=()=>active=false;
      h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    });
  },
};

/* ---------- Интерфейс: панель задач, пуск, QS и т.д. ---------- */
const UI = {
  flyout: null, // текущая открытая панель

  closeAllFlyouts(){
    document.querySelectorAll('.flyout.open').forEach(f=>f.classList.remove('open'));
    this.flyout = null;
    $('#ctx') && Ctx.close();
  },

  toggleFlyout(id, beforeOpen){
    const el = $(id);
    const was = el.classList.contains('open');
    this.closeAllFlyouts();
    if(!was){
      if(beforeOpen) beforeOpen();
      el.classList.add('open');
      this.flyout = el;
    }
  },

  /* ==== панель задач ==== */
  renderTaskbar(){
    // выравнивание и виджет погоды
    $('#taskbar').classList.toggle('left', S.data.tbAlign === 'left');
    $('#tb-weather').style.display = (S.data.tbAlign === 'left' || S.data.weatherWidget === false) ? 'none' : '';
    const host = $('#tb-apps');
    const running = [...new Set([...WM.wins.values()].map(w=>w.appId))];
    const order = [...TASKBAR_PINNED.filter(a=>running.includes(a) || true), ...running.filter(a=>!TASKBAR_PINNED.includes(a))];
    // убрать непридстановленные из закреплённых (все предустановлены всегда)
    host.innerHTML = order.map(appId=>{
      const reg = APPS[appId]; if(!reg) return '';
      const win = [...WM.wins.values()].find(w=>w.appId===appId);
      const active = win && WM.focused===win.id && !win.min;
      return `<button class="tbtn-tb ${win?'running':''} ${active?'active':''}" data-app="${appId}" title="${esc(reg.name)}">${I[reg.icon]}</button>`;
    }).join('');
    host.querySelectorAll('.tbtn-tb').forEach(b=>{
      const appId = b.dataset.app;
      b.addEventListener('click', ()=>{
        const win = [...WM.wins.values()].find(w=>w.appId===appId);
        if(win){
          if(WM.focused===win.id && !win.min) WM.minimize(win.id);
          else { if(win.min) WM.restore(win.id); else WM.focus(win.id); }
        } else WM.open(appId);
      });
      b.addEventListener('contextmenu', e=>{
        e.preventDefault();
        const win = [...WM.wins.values()].find(w=>w.appId===appId);
        Ctx.build([
          {label:APPS[appId].name, icon:I[APPS[appId].icon], action:()=>WM.open(appId)},
          '-',
          {label:'Закрыть окно', icon:I['trash'], disabled:!win, action:()=>win&&WM.close(win.id)},
        ], e.clientX-40, e.clientY-110);
      });
    });
    // часы и батарея
    this.updateTray();
  },

  /* часы + процент батареи (обновляются раз в секунду без перерисовки) */
  updateTray(){
    const d = new Date();
    const t = $('#tb-time'); if(!t) return;
    t.textContent = d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    $('#tb-date').textContent = d.toLocaleDateString('ru-RU');
    const pct = Battery.pct();
    const el = document.querySelector('.tray-bat-pct');
    if(el) el.textContent = pct + '%';
  },

  /* ==== рабочий стол: значки ==== */
  renderIcons(){
    const host = $('#icons');
    host.innerHTML = '';
    const list = [
      {id:'bin', name:'Корзина', icon:'bin'},
      {id:'store', name:'Microsoft Store', icon:'store'},
      {id:'explorer', name:'Проводник', icon:'explorer'},
      {id:'edge', name:'Microsoft Edge', icon:'edge'},
      ...S.data.installed.map(id=>({id, name:APPS[id]?APPS[id].name:id, icon:APPS[id]?APPS[id].icon:'apps'})),
    ];
    const vh = innerHeight-48;
    const rows = Math.max(3, Math.floor((vh-16)/100));
    const cell = {x:96, y:100};
    list.forEach((item, i)=>{
      const pos = S.data.iconPos[item.id] ? {...S.data.iconPos[item.id]} : {x: 10 + Math.floor(i/rows)*cell.x, y: 10 + (i%rows)*cell.y};
      const el = document.createElement('div');
      el.className = 'dicon';
      el.dataset.id = item.id;
      el.style.left = pos.x+'px'; el.style.top = pos.y+'px';
      el.innerHTML = `<div class="di-ico">${I[item.icon]||I['apps']}</div><div class="di-label">${esc(item.name)}</div>`;
      host.appendChild(el);
      const open = ()=>WM.open(item.id);
      el.addEventListener('dblclick', open);
      let moved=false, sx, sy, ox, oy, dragging=false;
      el.addEventListener('pointerdown', e=>{
        e.stopPropagation();
        document.querySelectorAll('.dicon.sel').forEach(d=>d.classList.remove('sel'));
        el.classList.add('sel');
        moved=false; dragging=false;
        sx=e.clientX; sy=e.clientY; ox=pos.x; oy=pos.y;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', e=>{
        if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>6) moved=true;
        if(!moved) return;
        dragging=true;
        el.style.left = (ox+e.clientX-sx)+'px';
        el.style.top  = (oy+e.clientY-sy)+'px';
      });
      el.addEventListener('pointerup', e=>{
        if(dragging){
          const nx = Math.max(2, Math.round((ox+e.clientX-sx)/cell.x)*cell.x+10);
          const ny = Math.max(2, Math.min(vh-104, Math.round((oy+e.clientY-sy)/cell.y)*cell.y+10));
          el.style.left = nx+'px'; el.style.top = ny+'px';
          pos.x = nx; pos.y = ny;
          S.data.iconPos[item.id] = {x:nx, y:ny};
          S.changed();
        } else if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)<=4){
          // одиночный тап открывает на сенсорных устройствах
          if(e.pointerType !== 'mouse') open();
        }
      });
      el.addEventListener('contextmenu', e=>{
        e.preventDefault(); e.stopPropagation();
        el.classList.add('sel');
        Ctx.build([
          {label:'Открыть', icon:I['fwd'], action:open},
          '-',
          {label:'Закрепить в панели задач', icon:I['apps'], action:()=>{
            if(!TASKBAR_PINNED.includes(item.id)){ TASKBAR_PINNED.push(item.id); UI.renderTaskbar(); toast('Панель задач','Приложение закреплено','apps'); }
          }},
          {label:'Удалить', icon:I['trash'], disabled:item.id==='bin', action:()=>{
            if(S.data.installed.includes(item.id)){
              S.data.installed = S.data.installed.filter(a=>a!==item.id);
              delete S.data.iconPos[item.id];
              S.changed(); UI.renderIcons(); toast('Удаление', `«${item.name}» удалено`, 'trash');
            } else toast('Отказано','Этот значок удалить нельзя','lock');
          }},
        ], e.clientX, e.clientY);
      });
    });
  },

  /* рамка выделения */
  initMarquee(){
    const desk = $('#desktop'), mq = $('#marquee');
    let sx, sy, active=false;
    desk.addEventListener('pointerdown', e=>{
      if(e.target!==desk && e.target.id!=='wallpaper' && e.target.id!=='icons') return;
      UI.closeAllFlyouts();
      document.querySelectorAll('.dicon.sel').forEach(d=>d.classList.remove('sel'));
      active=true; sx=e.clientX; sy=e.clientY;
      mq.style.display='block';
      desk.setPointerCapture(e.pointerId);
    });
    desk.addEventListener('pointermove', e=>{
      if(!active) return;
      const x=Math.min(sx,e.clientX), y=Math.min(sy,e.clientY);
      const w=Math.abs(e.clientX-sx), h=Math.abs(e.clientY-sy);
      Object.assign(mq.style,{display:'block',left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
      document.querySelectorAll('.dicon').forEach(d=>{
        const r=d.getBoundingClientRect();
        const hit = r.left<x+w && r.right>x && r.top<y+h && r.bottom>y;
        d.classList.toggle('sel', hit);
      });
    });
    const end=()=>{ active=false; mq.style.display='none'; };
    desk.addEventListener('pointerup', end);
    desk.addEventListener('pointercancel', end);
    desk.addEventListener('contextmenu', e=>{
      if(e.target!==desk && e.target.id!=='wallpaper' && e.target.id!=='icons') return;
      e.preventDefault();
      Ctx.build([
        {label:'Вид', icon:I['apps'], sub:[
          {label:'Крупные значки', action:()=>$('#icons').classList.add('big')},
          {label:'Обычные значки', action:()=>$('#icons').classList.remove('big')},
        ]},
        {label:'Сортировка', icon:I['apps'], sub:[
          {label:'По имени', action:()=>{ S.data.iconPos={}; S.changed(); UI.renderIcons(); }},
          {label:'По типу', action:()=>{ S.data.iconPos={}; S.changed(); UI.renderIcons(); }},
        ]},
        {label:'Обновить', icon:I['refresh'], action:()=>{ UI.renderIcons(); toast('Рабочий стол','Обновлено','refresh'); }},
        '-',
        {label:'Создать', icon:I['notepad'], sub:[
          {label:'Папку', action:()=>{
            toast('Рабочий стол','Создание папок недоступно в демо-версии','folder');
          }},
          {label:'Текстовый документ', action:()=>WM.open('notepad',{fresh:true})},
        ]},
        '-',
        {label:'Параметры экрана', icon:I['monitor'], action:()=>WM.open('settings',{page:'display'})},
        {label:'Персонализация', icon:I['paint'], action:()=>WM.open('settings',{page:'person'})},
      ], e.clientX, e.clientY);
    });
  },

  /* ==== меню Пуск ==== */
  /* ==== меню Пуск (v4 — как в настоящем Windows 11) ==== */
  stPage: 0,

  addRecent(name, app, icon){
    let r = S.data.recent || [];
    r = r.filter(x=>x.name!==name);
    r.unshift({name, app, icon:icon||APPS[app]&&APPS[app].icon||'file', t:Date.now()});
    S.data.recent = r.slice(0,6);
    S.changed();
  },

  tileMenu(e, appId){
    e.preventDefault(); e.stopPropagation();
    const pinnedTb = TASKBAR_PINNED.includes(appId);
    Ctx.build([
      {label:'Открыть', icon:I.fwd, action:()=>{ WM.open(appId); UI.closeAllFlyouts(); }},
      '-',
      {label:'Открепить от начального экрана', icon:I.trash, action:()=>{
        S.data.startPins = S.data.startPins.filter(a=>a!==appId);
        S.changed(); UI.renderStart();
        toast('Пуск', `«${APPS[appId].name}» откреплено`, 'apps');
      }},
      {label:pinnedTb?'Закреплено на панели задач':'Закрепить на панели задач', icon:I.apps, disabled:pinnedTb, action:()=>{
        TASKBAR_PINNED.push(appId); UI.renderTaskbar();
        toast('Панель задач', `«${APPS[appId].name}» закреплено`, 'apps');
      }},
      ...(S.data.installed.includes(appId) ? [{label:'Удалить', icon:I.trash, action:()=>{
        S.data.installed = S.data.installed.filter(a=>a!==appId);
        S.data.startPins = (S.data.startPins||[]).filter(a=>a!==appId);
        S.changed(); UI.renderIcons(); UI.renderStart();
        WM.wins.forEach(w=>{ if(w.appId===appId) WM.close(w.id); });
        toast('Удаление', `«${APPS[appId].name}» удалено`, 'trash');
      }}] : [{label:'Свойства', icon:I.settings, action:()=>toast(APPS[appId].name, APPS[appId].desc||'Системный компонент Windows', APPS[appId].icon)}]),
    ], e.clientX-40, e.clientY-10);
  },

  renderStart(filter){
    if(!S.data.startPins) S.data.startPins = [...START_PINNED];
    if(!S.data.recent) S.data.recent = [];
    const q = (filter||'').trim();
    const ql = q.toLowerCase();
    const start = $('#start');
    const grid = $('#st-grid'), dots = $('#st-dots');
    const all = this.allApps();
    start.classList.toggle('searchmode', !!ql);

    /* --- режим поиска: список результатов --- */
    if(ql){
      const sr = $('#st-searchresults');
      const found = all.filter(a=>APPS[a].name.toLowerCase().includes(ql));
      sr.innerHTML = (found.length
        ? `<div class="sp-group">Приложения</div>` + found.slice(0,8).map(a=>`
            <button class="sp-item" data-app="${a}">${I[APPS[a].icon]}<span><div>${esc(APPS[a].name)}</div><div class="spi-sub">Приложение</div></span></button>`).join('')
        : `<div class="sp-group">Приложения</div><div class="sp-hint">Ничего не найдено. Попробуйте поиск в Интернете.</div>`)
        + `<div class="sp-group">Поиск в Интернете</div>
           <button class="sp-item" data-web="1">${I.search}<span><div>${esc(q)}</div><div class="spi-sub">Открыть результаты в Edge</div></span></button>`;
      sr.querySelectorAll('.sp-item[data-app]').forEach(b=>{
        b.addEventListener('click', ()=>{ WM.open(b.dataset.app); UI.closeAllFlyouts(); });
      });
      const web = sr.querySelector('[data-web]');
      if(web) web.addEventListener('click', ()=>{ WM.open('edge',{query:q}); UI.closeAllFlyouts(); });
      return;
    }

    /* --- Закреплено: страницы по 18 плиток (6×3, как в Win11) --- */
    const pins = S.data.startPins.filter(a=>APPS[a]);
    const PER = 18;
    const pages = Math.max(1, Math.ceil(pins.length/PER));
    this.stPage = clamp(this.stPage, 0, pages-1);
    const page = pins.slice(this.stPage*PER, (this.stPage+1)*PER);
    grid.innerHTML = page.map((a,i)=>`<button class="st-app" data-app="${a}" style="animation-delay:${i*14}ms">${I[APPS[a].icon]}<span>${esc(APPS[a].name)}</span></button>`).join('')
      || `<div class="st-empty">Нет закреплённых приложений</div>`;
    grid.querySelectorAll('.st-app').forEach(b=>{
      b.addEventListener('click', ()=>{ WM.open(b.dataset.app); UI.closeAllFlyouts(); });
      b.addEventListener('contextmenu', e=>this.tileMenu(e, b.dataset.app));
    });
    dots.innerHTML = pages>1 ? Array.from({length:pages},(_,i)=>`<button class="st-dot ${i===this.stPage?'on':''}" data-i="${i}" title="Страница ${i+1}"></button>`).join('') : '';
    dots.querySelectorAll('.st-dot').forEach(d=>d.addEventListener('click', ()=>{ this.stPage=+d.dataset.i; this.renderStart(); }));

    /* --- Рекомендуем: новые приложения + недавние файлы --- */
    const reco = $('#st-reco');
    const items = [];
    S.data.installed.slice(-2).reverse().forEach(id=>{
      if(APPS[id]) items.push({name:APPS[id].name, icon:APPS[id].icon, sub:'Недавно добавлено', app:id});
    });
    (S.data.recent||[]).forEach(r=>{
      if(items.length<6 && APPS[r.app]) items.push({name:r.name, icon:r.icon, sub:this.timeAgo(r.t), app:r.app});
    });
    if(items.length<4){
      [{name:'Заметки.txt', icon:'notepad', sub:'Документы', app:'notepad'},
       {name:'Список дел.txt', icon:'notepad', sub:'Документы', app:'notepad'},
       {name:'bloom.jpg', icon:'photos', sub:'Изображения', app:'photos'},
       {name:'Windows11.apk', icon:'apk', sub:'Загрузки', app:'explorer'}]
        .forEach(f=>{ if(items.length<6 && !items.some(i=>i.name===f.name)) items.push(f); });
    }
    reco.innerHTML = items.map(r=>`<button class="st-reco-item" data-app="${r.app}" data-name="${esc(r.name)}">
        <span class="ri-ico">${I[r.icon]||I.file}</span>
        <span><div class="ri-name">${esc(r.name)}</div><div class="ri-sub">${esc(r.sub)}</div></span></button>`).join('');
    reco.querySelectorAll('.st-reco-item').forEach(b=>{
      b.addEventListener('click', ()=>{
        const name = b.dataset.name;
        const isFile = name && (name.endsWith('.txt') || name.endsWith('.jpg') || name.endsWith('.apk'));
        WM.open(b.dataset.app, isFile ? {name, content:(FS[name]||{}).content} : undefined);
        UI.closeAllFlyouts();
      });
    });

    /* --- Все приложения --- */
    const allList = $('#st-all-list');
    const sorted = all.slice().sort((a,b)=>APPS[a].name.localeCompare(APPS[b].name,'ru'));
    let letter='';
    allList.innerHTML = sorted.map(a=>{
      const L = APPS[a].name[0].toUpperCase();
      const head = L!==letter ? `<div class="st-all-letter">${L}</div>` : '';
      letter = L;
      return head + `<button class="st-all-item" data-app="${a}">${I[APPS[a].icon]}<span>${esc(APPS[a].name)}</span></button>`;
    }).join('');
    allList.querySelectorAll('.st-all-item').forEach(b=>{
      b.addEventListener('click', ()=>{ WM.open(b.dataset.app); UI.closeAllFlyouts(); });
      b.addEventListener('contextmenu', e=>{
        e.preventDefault(); e.stopPropagation();
        const pinned = (S.data.startPins||[]).includes(b.dataset.app);
        Ctx.build([
          {label:pinned?'Открепить от начального экрана':'Закрепить на начальном экране', icon:I.apps, action:()=>{
            if(pinned) S.data.startPins = S.data.startPins.filter(a=>a!==b.dataset.app);
            else S.data.startPins.push(b.dataset.app);
            S.changed(); this.stPage=0; this.renderStart();
            toast('Пуск', pinned?'Откреплено':'Закреплено на начальном экране', 'apps');
          }},
          {label:'Закрепить на панели задач', icon:I.apps, disabled:TASKBAR_PINNED.includes(b.dataset.app), action:()=>{
            TASKBAR_PINNED.push(b.dataset.app); UI.renderTaskbar(); toast('Панель задач','Закреплено','apps');
          }},
        ], e.clientX-30, e.clientY-8);
      });
    });
  },

  timeAgo(t){
    const d = (Date.now()-t)/1000;
    if(d < 60) return 'Только что';
    if(d < 3600) return `${Math.floor(d/60)} мин назад`;
    if(d < 86400) return `${Math.floor(d/3600)} ч назад`;
    return `${Math.floor(d/86400)} дн назад`;
  },

  /* свайп по плиткам — перелистывание страниц Пуска */
  initStartSwipe(){
    const grid = $('#st-grid');
    let x0 = null;
    grid.addEventListener('pointerdown', e=>{ x0 = e.clientX; });
    grid.addEventListener('pointerup', e=>{
      if(x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if(Math.abs(dx) < 48) return;
      this.stPage += dx < 0 ? 1 : -1;
      this.renderStart();
    });
  },

  /* ==== быстрые действия ==== */
  renderQS(){
    const d = S.data;
    const tiles = [
      {k:'wifi',  name:'Wi-Fi', sub:d.wifi?'Дом_5G':'Отключено', icon:'wifi',  on:d.wifi},
      {k:'bt',    name:'Bluetooth', sub:d.bt?'Подключено':'Выключено', icon:'bt', on:d.bt},
      {k:'air',   name:'В самолёте', sub:'', icon:'plane', on:d.air},
      {k:'saver', name:'Экономия заряда', sub:'', icon:'leaf', on:d.saver},
      {k:'night', name:'Ночной свет', sub:'', icon:'moon', on:d.night},
      {k:'access',name:'Спец. возможности', sub:'', icon:'access', on:false, lock:true},
    ];
    $('#qs').innerHTML = `
      <div class="qs-tiles">${tiles.map(t=>`
        <button class="qs-tile ${t.on?'on':''}" data-k="${t.k}" data-lock="${t.lock?1:0}">
          ${I[t.icon]}<span>${t.name}</span>${t.sub?`<span class="qs-sub">${esc(t.sub)}</span>`:''}
        </button>`).join('')}</div>
      <div class="qs-slider">${I['sun']}<input class="wsl" id="qs-bright" type="range" min="15" max="100" value="${d.brightness}"></div>
      <div class="qs-slider">${I['speaker']}<input class="wsl" id="qs-vol" type="range" min="0" max="100" value="${d.volume}"></div>
      <div class="qs-foot">
        <button class="qs-bat" id="qs-bat" title="Питание и батарея">${I['battery']} ${Battery.pct()}%${Battery.charging?' ⚡':''}</button>
        <div class="qs-footbtns">
          <button class="qs-fbtn" id="qs-edit" title="Изменить">${I['edit']}</button>
          <button class="qs-fbtn" id="qs-gear" title="Все параметры">${I['gear']}</button>
        </div>
      </div>`;
    const sync = (inp)=>{ inp.style.setProperty('--p', ((inp.value-inp.min)/(inp.max-inp.min)*100)+'%'); };
    const br = $('#qs-bright'), vl = $('#qs-vol');
    sync(br); sync(vl);
    br.addEventListener('input', ()=>{ setBrightness(+br.value); sync(br); });
    vl.addEventListener('input', ()=>{ setVolume(+vl.value); sync(vl); });
    $('#qs').querySelectorAll('.qs-tile').forEach(t=>{
      t.addEventListener('click', ()=>{
        if(t.dataset.lock==='1'){ toast('Быстрые действия','Специальные возможности — смотрите Параметры','access'); return; }
        const k = t.dataset.k;
        if(k==='air' && !d.air){ d.wifi=false; d.bt=false; d.air=true; }
        else if(k==='air'){ d.air=false; d.wifi=true; }
        else if(k==='wifi' && d.air){ d.air=false; d.wifi=true; }
        else d[k] = !d[k];
        S.changed(); UI.renderQS(); UI.renderTaskbar();
        if(k==='wifi') toast('Wi-Fi', d.wifi?'Подключено к Дом_5G':'Wi-Fi отключён', 'wifi');
      });
    });
    $('#qs-edit').addEventListener('click', ()=>toast('Быстрые действия','Редактирование недоступно в демо','edit'));
    $('#qs-gear').addEventListener('click', ()=>{ UI.closeAllFlyouts(); WM.open('settings'); });
    $('#qs-bat').addEventListener('click', ()=>{ UI.closeAllFlyouts(); WM.open('settings',{page:'power'}); });
  },

  /* ==== календарь ==== */
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  renderCal(){
    const months=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
    const dows=['пн','вт','ср','чт','пт','сб','вс'];
    const now = new Date();
    const y=this.calYear, m=this.calMonth;
    const first = new Date(y, m, 1);
    let shift = (first.getDay()+6)%7;
    const days = new Date(y, m+1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    let cells='';
    dows.forEach(d=>cells+=`<span class="cg-dow">${d}</span>`);
    for(let i=shift-1;i>=0;i--) cells+=`<span class="cg-day dim">${prevDays-i}</span>`;
    for(let d=1;d<=days;d++){
      const today = d===now.getDate() && m===now.getMonth() && y===now.getFullYear();
      cells+=`<span class="cg-day ${today?'today':''}">${d}</span>`;
    }
    const rest = (7-((shift+days)%7))%7;
    for(let d=1;d<=rest;d++) cells+=`<span class="cg-day dim">${d}</span>`;

    const notifs = notifHistory.length
      ? notifHistory.map(n=>`<div class="cal-n-item"><span class="cn-ico">${I[n.icon]||I['bell']}</span><div><div class="cn-title">${esc(n.title)}</div><div class="cn-text">${esc(n.text||'')}</div></div></div>`).join('')
      : `<div class="cal-n-empty">Нет новых уведомлений</div>`;

    $('#cal').innerHTML = `
      <div class="cal-notif">
        ${notifs}
        ${notifHistory.length ? '<button class="cal-clear" id="cal-clear">Очистить всё</button>' : ''}
      </div>
      <div class="cal-bottom">
        <div class="cal-time">${now.toLocaleTimeString('ru-RU')}</div>
        <div class="cal-dow">${now.toLocaleDateString('ru-RU',{weekday:'long', day:'numeric', month:'long', year:'numeric'})}</div>
        <div class="cal-head">
          <span class="cal-mname">${months[m]} ${y}</span>
          <div class="cal-nav">
            <button id="cal-prev" title="Предыдущий месяц">${I['back']}</button>
            <button id="cal-today" title="Сегодня">•</button>
            <button id="cal-next" title="Следующий месяц">${I['fwd']}</button>
          </div>
        </div>
        <div class="cal-grid" id="cal-grid">${cells}</div>
      </div>`;
    $('#cal-prev').addEventListener('click', ()=>{ this.calMonth--; if(this.calMonth<0){this.calMonth=11;this.calYear--;} this.renderCal(); });
    $('#cal-next').addEventListener('click', ()=>{ this.calMonth++; if(this.calMonth>11){this.calMonth=0;this.calYear++;} this.renderCal(); });
    const todayBtn = $('#cal-today');
    if(todayBtn) todayBtn.addEventListener('click', ()=>{ this.calMonth=new Date().getMonth(); this.calYear=new Date().getFullYear(); this.renderCal(); });
    const clr = $('#cal-clear');
    if(clr) clr.addEventListener('click', ()=>{ notifHistory.length=0; this.renderCal(); });
    // выбор дня
    this.selDay = this.selDay || {d:now.getDate(), m:now.getMonth(), y:now.getFullYear()};
    $('#cal-grid').querySelectorAll('.cg-day:not(.dim)').forEach(el=>{
      el.addEventListener('click', ()=>{
        $('#cal-grid').querySelectorAll('.cg-day').forEach(x=>x.classList.remove('picked'));
        el.classList.add('picked');
      });
      const dd = +el.textContent;
      if(this.selDay.d===dd && this.selDay.m===m && this.selDay.y===y) el.classList.add('picked');
    });
    // свайп для перелистывания месяцев
    const grid = $('#cal-grid');
    grid.onpointerdown = (e)=>{ this._swx = e.clientX; };
    grid.onpointerup = (e)=>{
      const dx = e.clientX - (this._swx??e.clientX);
      if(Math.abs(dx) > 44){ dx < 0 ? $('#cal-next').click() : $('#cal-prev').click(); }
    };
  },

  /* ==== панель поиска ==== */
  /* полный список приложений (закреплённые + установленные + системные) */
  allApps(){
    return [...new Set([...START_PINNED, ...S.data.installed, ...Object.keys(APPS).filter(a=>APPS[a].pre)])].filter(a=>APPS[a]);
  },

  renderSearch(q){
    const body = $('#sp-body');
    const query = (q||'').trim().toLowerCase();
    const all = this.allApps();
    let html='';
    if(!query){
      html = `<div class="sp-group">Лучшее соответствие</div>` +
        all.slice(0,4).map(a=>`<button class="sp-item" data-app="${a}">${I[APPS[a].icon]}<span><div>${esc(APPS[a].name)}</div><div class="spi-sub">Приложение</div></span></button>`).join('');
    } else {
      const found = all.filter(a=>APPS[a].name.toLowerCase().includes(query));
      if(found.length) html += `<div class="sp-group">Приложения</div>` + found.map(a=>`<button class="sp-item" data-app="${a}">${I[APPS[a].icon]}<span><div>${esc(APPS[a].name)}</div><div class="spi-sub">Приложение</div></span></button>`).join('');
      html += `<div class="sp-group">Поиск в Интернете</div>
        <button class="sp-item" data-web="1">${I['search']}<span><div>${esc(q)}</div><div class="spi-sub">Поиск в Интернете через Edge</div></span></button>`;
      if(!found.length) html = `<div class="sp-group">Приложения</div><div class="sp-hint">Приложения не найдены</div>` + html.slice(html.indexOf('<div class="sp-group">Поиск'));
    }
    body.innerHTML = html;
    body.querySelectorAll('.sp-item[data-app]').forEach(b=>{
      b.addEventListener('click', ()=>{ WM.open(b.dataset.app); UI.closeAllFlyouts(); });
    });
    const web = body.querySelector('[data-web]');
    if(web) web.addEventListener('click', ()=>{ WM.open('edge',{query:q}); UI.closeAllFlyouts(); });
  },

  /* ==== представление задач ==== */
  renderTaskView(){
    const grid = $('#tv-grid');
    const wins = [...WM.wins.values()];
    grid.innerHTML = wins.length ? wins.map(w=>{
      const reg = APPS[w.appId];
      return `<div class="tv-card" data-id="${w.id}">
        <div class="tv-preview" style="background:linear-gradient(135deg,#33536F,#1A2A44)">
          ${I[reg.icon]}
          <button class="tv-close" title="Закрыть"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6"/></svg></button>
        </div>
        <div class="tv-title">${I[reg.icon]}<span>${esc(reg.name)}</span></div>
      </div>`;
    }).join('') : `<div class="tv-empty">Нет открытых окон</div>`;
    grid.querySelectorAll('.tv-card').forEach(c=>{
      c.addEventListener('click', e=>{
        if(e.target.closest('.tv-close')){ WM.close(c.dataset.id); UI.renderTaskView(); return; }
        const w = WM.wins.get(c.dataset.id);
        if(w && w.min) WM.restore(w.id); else WM.focus(w.id);
        $('#taskview').classList.remove('open');
      });
    });
  },
};

/* ---------- Применение настроек ---------- */
function applyTheme(){ document.documentElement.dataset.theme = S.data.theme; }
function applyAccent(){
  document.documentElement.style.setProperty('--acc', S.data.accent);
  document.documentElement.style.setProperty('--acc-h', S.data.accent);
  document.documentElement.style.setProperty('--acc-soft', hexA(S.data.accent, .28));
}
function hexA(hex, a){
  const n = parseInt(hex.slice(1),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function applyWallpaper(){
  const wp = WALLPAPERS.find(w=>w.id===S.data.wallpaper) || WALLPAPERS[0];
  $('#wallpaper').style.backgroundImage = `url(${wp.url})`;
  $('#lock').style.backgroundImage = `url(${wp.url})`;
}
function applyTransparency(){
  document.documentElement.style.setProperty('--flyout', S.data.transparency ? 'rgba(44,44,44,.86)' : 'rgb(50,50,50)');
  if(S.data.theme==='light') document.documentElement.style.setProperty('--flyout', S.data.transparency ? 'rgba(249,249,249,.88)' : 'rgb(247,247,247)');
}
function setVolume(v){
  S.data.volume = v; AudioFX.setVolume(v); S.changed();
  const s = $('#qs-vol'); if(s){ s.value=v; s.style.setProperty('--p', (v)+'%'); }
}
function setBrightness(v){
  S.data.brightness = v;
  $('#dim').style.opacity = (1 - v/100)*0.72;
  S.changed();
  const s = $('#qs-bright'); if(s){ s.value=v; s.style.setProperty('--p', ((v-15)/85*100)+'%'); }
}
function setNight(b){ S.data.night=b; $('#night').style.opacity = b? .28 : 0; S.changed(); }

/* ---------- Загрузка / блокировка / питание ---------- */
const Power = {
  boot(){
    const b = $('#boot');
    b.classList.remove('hide');
    document.body.classList.add('busy-cursor');
    $('#desktop').style.visibility='hidden';
    $('#lock').classList.remove('open','hide');
    setTimeout(()=>{
      b.classList.add('hide');
      document.body.classList.remove('busy-cursor');
      setTimeout(()=>{ this.lock(); b.style.display='none'; setTimeout(()=>{b.style.display='';},500); }, 500);
    }, 2200);
  },
  lock(){
    $('#lock').classList.add('open');
    const upd=()=>{
      const d=new Date();
      $('#lock .lk-time').textContent = d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
      $('#lock .lk-date').textContent = d.toLocaleDateString('ru-RU',{weekday:'long', day:'numeric', month:'long'});
    };
    upd(); this._lk = setInterval(upd, 1000);
  },
  enter(){
    const lk = $('#lock');
    if(!lk.classList.contains('open')) return;
    clearInterval(this._lk);
    lk.classList.add('hide');
    $('#desktop').style.visibility='';
    setTimeout(()=>{
      lk.classList.remove('open','hide');
      AudioFX.startup();
      if(S.data.firstRun){
        S.data.firstRun=false;
        S.data.installDate = S.data.installDate || new Date().toISOString();
        S.changed();
        setTimeout(()=>toast('Добро пожаловать!','Это Windows 11. Откройте Microsoft Store, чтобы установить приложения.','win'), 700);
      }
    }, 380);
  },
  shutdown(){
    AudioFX.shutdownSnd();
    UI.closeAllFlyouts();
    const sd = $('#shutdown');
    sd.querySelector('.sd-text').textContent = 'Завершение работы';
    sd.classList.add('open');
    setTimeout(()=>{ sd.classList.remove('open'); $('#poweroff').classList.add('open'); }, 1600);
  },
  restart(){
    AudioFX.shutdownSnd();
    UI.closeAllFlyouts();
    const sd = $('#shutdown');
    sd.querySelector('.sd-text').textContent = 'Перезагрузка';
    sd.classList.add('open');
    setTimeout(()=>{ sd.classList.remove('open'); WM.wins.forEach(w=>WM.close(w.id)); Power.boot(); }, 1500);
  },
  sleep(){
    $('#sleep').style.display='block';
    const wake = ()=>{ $('#sleep').style.display='none'; $('#sleep').removeEventListener('pointerdown', wake); };
    $('#sleep').addEventListener('pointerdown', wake);
  },
};

/* ---------- Инициализация ---------- */
function initSystem(){
  S.load();
  KB.init();
  applyTheme(); applyAccent(); applyWallpaper(); applyTransparency();
  AudioFX.setVolume(S.data.volume);
  setBrightness(S.data.brightness);
  if(S.data.night) $('#night').style.opacity=.28;

  // значок пуска и панели
  $('#tb-start').innerHTML = `<span class="tb-ico"></span>`;
  $('#tb-tasks').innerHTML = I.taskview;
  $('#tb-search .sp-ico').innerHTML = I.search;
  $('.st-search .sp-ico').innerHTML = I.search;
  $('.sp-head .sp-ico').innerHTML = I.search;
  $('#st-power').innerHTML = I.power;
  $('.tray-wifi').innerHTML = `<svg class="tray-svg" viewBox="0 0 24 24" fill="currentColor" style="width:17px;height:17px"><path d="M12 19.7l-2.5-2.9a3.9 3.9 0 0 1 5 0z"/><path d="M12 12.4c-2 0-3.9.8-5.3 2.1l1.7 1.9a5.3 5.3 0 0 1 7.2 0l1.7-1.9A7.7 7.7 0 0 0 12 12.4z"/><path d="M12 7.7c-3.3 0-6.3 1.3-8.5 3.4l1.7 1.9A9.9 9.9 0 0 1 12 10c2.7 0 5.1 1 6.8 2.9l1.7-1.9A12.3 12.3 0 0 0 12 7.7z"/></svg>`;
  $('.tray-vol').innerHTML = `<svg class="tray-svg" viewBox="0 0 24 24" fill="currentColor" style="width:17px;height:17px"><path d="M4 9.2h3.2L12 5v14l-4.8-4.2H4z"/><path d="M15.2 8.7a4.7 4.7 0 0 1 0 6.6M17.8 6.4a8.2 8.2 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  $('.tray-bat').innerHTML = `<svg class="tray-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" style="width:19px;height:19px"><rect x="3" y="8" width="16.5" height="8.5" rx="2"/><rect x="4.8" y="9.8" width="10.5" height="4.9" rx="1" fill="currentColor" stroke="none"/><path d="M21 10.5v3.5" stroke-linecap="round" stroke-width="2"/></svg>`;

  // погодный виджет
  const wt = ['Облачно','Ясно','Дождь','Облачно','Снег'];
  const wti = new Date().getDate() % wt.length;
  $('#tb-weather .tbw-temp').textContent = ((new Date().getDate()%5)-2) + 2 + '°';
  $('#tb-weather .tbw-desc').textContent = wt[wti];
  $('#tb-weather .tbw-ico').innerHTML = `<svg viewBox="0 0 48 48" style="width:22px;height:22px"><circle cx="19" cy="17" r="7" fill="#FFC83D"/><path d="M14.5 33a6 6 0 0 1 .4-12 8 8 0 0 1 15.4-2 6.6 6.6 0 0 1 1.3 13c-.5.1-16.6.7-17.1 1z" fill="#fff" opacity=".92"/></svg>`;
  $('#tb-weather').addEventListener('click', ()=>WM.open('weather'));

  // обработчики панели задач
  $('#tb-start').addEventListener('click', ()=>UI.toggleFlyout('#start', ()=>{ $('#start').classList.remove('allmode'); UI.stPage=0; $('#st-inp').value=''; UI.renderStart(); }));
  $('#tb-search').addEventListener('click', ()=>UI.toggleFlyout('#searchpanel', ()=>{ $('#sp-inp').value=''; UI.renderSearch(''); }));
  $('#tb-tasks').addEventListener('click', ()=>{ const tv=$('#taskview'); if(tv.classList.contains('open')) tv.classList.remove('open'); else { UI.renderTaskView(); tv.classList.add('open'); } });
  $('#tb-status').addEventListener('click', ()=>UI.toggleFlyout('#qs', ()=>UI.renderQS()));
  $('#tb-chev').addEventListener('click', ()=>{
    UI.toggleFlyout('#trayfly', ()=>{
      $('#trayfly').innerHTML = `<span class="tf-ico" title="OneDrive">${I.onedrive}</span><span class="tf-ico" title="Безопасность Windows">${I.shield}</span>`;
    });
  });
  $('#tb-clock').addEventListener('click', ()=>UI.toggleFlyout('#cal', ()=>UI.renderCal()));
  $('#tb-kbd').innerHTML = I.kb;
  $('#tb-kbd').addEventListener('click', ()=>KB.toggle());
  $('#tb-showdesk').addEventListener('click', ()=>{
    let anyVisible=false;
    WM.wins.forEach(w=>{ if(!w.min) anyVisible=true; });
    WM.wins.forEach(w=>{ if(anyVisible) WM.minimize(w.id); else WM.restore(w.id); });
  });
  $('#st-inp').addEventListener('input', e=>UI.renderStart(e.target.value));
  $('#st-inp').addEventListener('keydown', e=>{
    if(e.key!=='Enter') return;
    const q = e.target.value.trim().toLowerCase();
    const first = q ? document.querySelector('#st-searchresults .sp-item[data-app]') || document.querySelector('#st-searchresults [data-web]') : document.querySelector('#st-grid .st-app');
    if(first){ first.click(); UI.closeAllFlyouts(); }
  });
  $('#st-all').addEventListener('click', ()=>$('#start').classList.add('allmode'));
  $('#st-back').addEventListener('click', ()=>$('#start').classList.remove('allmode'));
  $('#st-more').addEventListener('click', ()=>{ WM.open('store'); UI.closeAllFlyouts(); });
  UI.initStartSwipe();
  $('.st-user').addEventListener('click', e=>{
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    Ctx.build([
      {label:'Изменить параметры учётной записи', icon:I.users, action:()=>{ UI.closeAllFlyouts(); WM.open('settings',{page:'acc'}); }},
      '-',
      {label:'Блокировать', icon:I.lock, action:()=>{ UI.closeAllFlyouts(); Power.lock(); }},
      {label:'Выйти', icon:I.fwd, action:()=>{ UI.closeAllFlyouts(); Power.lock(); }},
    ], Math.max(8, r.left-160), r.top-148);
  });
  $('#st-power').addEventListener('click', e=>{
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    Ctx.build([
      {label:'Спящий режим', icon:I.moon, action:()=>{ UI.closeAllFlyouts(); Power.sleep(); }},
      {label:'Завершение работы', icon:I.power, action:()=>{ UI.closeAllFlyouts(); Power.shutdown(); }},
      {label:'Перезагрузка', icon:I.refresh, action:()=>{ UI.closeAllFlyouts(); Power.restart(); }},
    ], Math.max(8, r.right-210), r.top-132);
  });
  $('#sp-inp').addEventListener('input', e=>UI.renderSearch(e.target.value));

  // экран блокировки
  $('#lock').addEventListener('click', ()=>Power.enter());
  document.addEventListener('keydown', e=>{
    if($('#lock').classList.contains('open')){ Power.enter(); return; }
    if($('#poweroff').classList.contains('open')){ $('#poweroff').classList.remove('open'); Power.boot(); return; }
    if(e.key==='Meta' || (e.key==='Escape' && !e.altKey)){
      if(e.key==='Escape'){ UI.closeAllFlyouts(); $('#taskview').classList.remove('open'); }
      else UI.toggleFlyout('#start', ()=>{ $('#start').classList.remove('allmode'); $('#st-inp').value=''; UI.renderStart(); });
    }
    if(e.key==='Escape') Ctx.close();
    if((e.metaKey||e.altKey) && e.key==='Tab'){
      e.preventDefault();
      const tv=$('#taskview');
      if(!tv.classList.contains('open')){ UI.renderTaskView(); tv.classList.add('open'); }
    }
    if(e.key==='L' && (e.metaKey||e.ctrlKey) && e.shiftKey){ e.preventDefault(); Power.lock(); }
  });
  document.addEventListener('keyup', e=>{
    if(e.key==='Meta' || e.key==='Alt'){ $('#taskview').classList.remove('open'); }
  });

  UI.renderIcons();
  UI.initMarquee();
  UI.renderTaskbar();
  setInterval(()=>UI.updateTray(), 1000);   // часы и батарея без перерисовки панели

  /* ---- Фикс «дырки» при открытой клавиатуре ----
     Экран всегда ровно по видимой области (visualViewport),
     панель задач прижата к видимой нижней кромке. */
  const fitViewport = ()=>{
    const vv = window.visualViewport;
    const scr = $('#screen');
    if(vv){
      scr.style.height = Math.round(vv.height)+'px';
      scr.style.width  = Math.round(vv.width)+'px';
    } else {
      scr.style.height = '100vh';
      scr.style.width = '100%';
    }
  };
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', fitViewport);
    window.visualViewport.addEventListener('scroll', fitViewport);
  }
  window.addEventListener('orientationchange', ()=>setTimeout(fitViewport, 120));
  fitViewport();

  // при фокусе на поле ввода — мягко поднять его над клавиатурой
  document.addEventListener('focusin', e=>{
    if(e.target.matches('input, textarea')){
      setTimeout(()=>{ try{ e.target.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(_){} }, 260);
    }
  });

  /* контекстное меню на пустом месте панели задач */
  $('#taskbar').addEventListener('contextmenu', e=>{
    if(e.target.closest('.tbtn-tb') || e.target.closest('.tb-ibtn') || e.target.closest('.tb-tray-btn') || e.target.closest('.tb-clock')) return;
    e.preventDefault();
    Ctx.build([
      {label:'Диспетчер задач', icon:I.taskmgr, action:()=>WM.open('taskmgr')},
      {label:'Параметры панели задач', icon:I.settings, action:()=>WM.open('settings',{page:'taskbar'})},
      '-',
      {label:'Показать рабочий стол', icon:I.pc, action:()=>{
        let any=false; WM.wins.forEach(w=>{ if(!w.min) any=true; });
        WM.wins.forEach(w=>{ any ? WM.minimize(w.id) : WM.restore(w.id); });
      }},
    ], e.clientX-60, innerHeight-170);
  });

  // при любом изменении состояния — обновить трей (батарея и т.д.)
  S.on(()=>UI.updateTray());

  // первый жест — оживить аудио
  document.addEventListener('pointerdown', ()=>AudioFX.ensure(), {once:true});

  // заставка приветствия после сборки APK
  const q = new URLSearchParams(location.search);
  if(q.get('demo')==='1') setTimeout(()=>toast('Демо-режим','Запущено из предпросмотра Arena','win'), 1500);
}

document.addEventListener('DOMContentLoaded', ()=>{
  initSystem();
  Power.boot();
});
