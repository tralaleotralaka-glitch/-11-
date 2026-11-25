/* ============ v3: встроенная сенсорная клавиатура (Windows Touch Keyboard) ============ */
'use strict';

const KB = {
  el: null,
  target: null,
  lang: 'ru',
  shift: false,
  mode: 'abc',      // abc | sym
  pinned: false,    // включена вручную из трея
  visible: false,

  L: {
    ru: [['й','ц','у','к','е','н','г','ш','щ','з','х','ъ'],
         ['ф','ы','в','а','п','р','о','л','д','ж','э'],
         ['я','ч','с','м','и','т','ь','б','ю']],
    en: [['q','w','e','r','t','y','u','i','o','p'],
         ['a','s','d','f','g','h','j','k','l'],
         ['z','x','c','v','b','n','m']],
    sym: [['1','2','3','4','5','6','7','8','9','0'],
          ['-','/',':',';','(',')','₽','&','@','"'],
          ['.',',','?','!','\'','+','=','*','%','#']],
  },

  init(){
    this.lang = S.data.kbLang || 'ru';
    this.el = document.querySelector('#osk');
    if(!this.el) return;
    // не даём клавиатуре забрать фокус у поля ввода
    this.el.addEventListener('pointerdown', e=>e.preventDefault());
    this.el.addEventListener('click', e=>{
      const k = e.target.closest('.kb-key');
      if(k) this.press(k.dataset.k);
    });
    document.addEventListener('focusin', e=>{
      const t = e.target;
      if(this.isEditable(t) && !t.readOnly && t.type!=='range'){
        this.target = t;
        if(this.visible || this.pinned) this.render();
        if(!this.visible) this.show();
      }
    });
    document.addEventListener('focusout', ()=>{
      setTimeout(()=>{
        const a = document.activeElement;
        if(!a || !this.isEditable(a)){
          if(!this.pinned) this.hide();
        }
      }, 150);
    });
  },

  isEditable(t){
    return t && (t.tagName === 'TEXTAREA' ||
      (t.tagName === 'INPUT' && ['','text','search','password','number','tel','url','email'].includes(t.type||'text')));
  },

  show(){
    this.visible = true;
    this.el.classList.add('open');
    this.render();
  },
  hide(){
    this.visible = false;
    this.pinned = false;
    this.el.classList.remove('open');
  },
  toggle(){
    if(this.visible){ this.hide(); return; }
    const a = document.activeElement;
    if(this.isEditable(a)) this.target = a;
    this.pinned = true;
    this.show();
  },

  sel(){
    const t = this.target;
    const s = t.selectionStart, e = t.selectionEnd;
    return [s == null ? t.value.length : s, e == null ? t.value.length : e];
  },
  insert(text){
    const t = this.target; if(!t) return;
    const [s, e] = this.sel();
    t.value = t.value.slice(0, s) + text + t.value.slice(e);
    const p = s + text.length;
    try{ t.setSelectionRange(p, p); }catch(_){}
    t.dispatchEvent(new Event('input', {bubbles:true}));
    t.focus();
  },
  backspace(){
    const t = this.target; if(!t) return;
    let [s, e] = this.sel();
    if(s === e){ if(s > 0){ t.value = t.value.slice(0, s-1) + t.value.slice(e); s--; } }
    else { t.value = t.value.slice(0, s) + t.value.slice(e); }
    try{ t.setSelectionRange(s, s); }catch(_){}
    t.dispatchEvent(new Event('input', {bubbles:true}));
    t.focus();
  },
  enter(){
    const t = this.target; if(!t) return;
    if(t.tagName === 'TEXTAREA'){ this.insert('\n'); return; }
    t.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
    t.dispatchEvent(new KeyboardEvent('keyup', {key:'Enter', bubbles:true}));
    t.focus();
  },

  press(k){
    if(k === 'lang'){
      this.lang = this.lang === 'ru' ? 'en' : 'ru';
      S.data.kbLang = this.lang; S.changed();
      this.render(); return;
    }
    if(k === 'sym'){ this.mode = this.mode === 'sym' ? 'abc' : 'sym'; this.render(); return; }
    if(k === 'shift'){ this.shift = !this.shift; this.render(); return; }
    if(k === 'hide'){ this.hide(); return; }
    if(k === 'bksp'){ this.backspace(); return; }
    if(k === 'enter'){ this.enter(); return; }
    if(k === ' '){ this.insert(' '); return; }
    const ch = this.shift ? k.toUpperCase() : k;
    this.insert(ch);
    if(this.shift){ this.shift = false; this.render(); }
  },

  render(){
    if(!this.el) return;
    const rows = this.mode === 'sym' ? this.L.sym : this.L[this.lang] || this.L.ru;
    const shiftOn = this.shift;
    const key = (k, cls)=>`<div class="kb-key ${cls||''}" data-k="${esc(k)}">${k === ' ' ? '&nbsp;' : (this.shift && k.length === 1 ? k.toUpperCase() : k)}</div>`;
    let html = '<div class="kb-wrap">';
    rows.forEach(row=>{
      html += `<div class="kb-row">${row.map(c=>key(c)).join('')}</div>`;
    });
    html += `<div class="kb-row kb-btm">
      <div class="kb-key kb-sp" data-k="sym">${this.mode === 'sym' ? 'АБВ' : '&123'}</div>
      <div class="kb-key kb-sp" data-k="lang">${this.lang.toUpperCase()}</div>
      <div class="kb-key kb-sp kb-shift ${shiftOn?'on':''}" data-k="shift">⇧</div>
      <div class="kb-key kb-space" data-k=" ">пробел</div>
      <div class="kb-key kb-sp kb-enter" data-k="enter">⏎</div>
      <div class="kb-key kb-sp" data-k="bksp">⌫</div>
      <div class="kb-key kb-sp kb-hide" data-k="hide">⌄</div>
    </div></div>`;
    this.el.innerHTML = html;
  },
};
