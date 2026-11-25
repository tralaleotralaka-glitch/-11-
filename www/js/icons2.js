/* ============ v2: иконки в стиле Fluent (Windows 11) + системные данные ============ */
'use strict';

Object.assign(I, {
  /* Проводник — двухтоновая папка */
  explorer: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="ica" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCF65"/><stop offset="1" stop-color="#EFA02B"/></linearGradient>
    <linearGradient id="icb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#F7B33C"/></linearGradient></defs>
    <path d="M4 13.2A3.2 3.2 0 0 1 7.2 10h10.2c.9 0 1.7.35 2.3 1l2.9 3H40a3.2 3.2 0 0 1 3.2 3.2v2.4H4z" fill="url(#icb)"/>
    <rect x="4" y="14.6" width="39.2" height="23.8" rx="3.2" fill="url(#ica)"/>
    <path d="M4 17.6h39.2v1.6H4z" fill="#FFDF8F" opacity=".5"/></svg>`,

  /* Edge — сфера с белым росчерком */
  edge: `<svg viewBox="0 0 48 48"><defs>
    <radialGradient id="ieg" cx=".32" cy=".22" r="1.05"><stop offset="0" stop-color="#86E8DC"/><stop offset=".42" stop-color="#2FB1E8"/><stop offset="1" stop-color="#0B5CAD"/></radialGradient></defs>
    <circle cx="24" cy="24" r="19" fill="url(#ieg)"/>
    <path d="M8.4 26.6c1.3 8.4 8.8 13.2 17.2 13.2 6.4 0 11-2.7 12.8-5.8-4 1.8-8.6 2.1-12.5.6-6.6-2.4-9.5-8.4-7.5-14.4 1.3-4 4.7-6.7 8.3-8.3-10-.6-20 4.5-18.3 14.7z" fill="#fff" opacity=".95"/>
    <path d="M34.8 13.6c3.7 3.1 5.3 7.8 3.5 12.2-1.5 3.7-5.1 5.7-8.8 5.5 4.8-2.4 7-6.9 6-11.4-.8-3.3-3.3-5.9-6.5-7.3 2-.4 4.1-.1 5.8 1z" fill="#0B5CAD" opacity=".3"/></svg>`,

  /* Store — синяя сумка с флажком Windows */
  store: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="isg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3ECBF6"/><stop offset="1" stop-color="#0B64C0"/></linearGradient></defs>
    <path d="M7.6 14.5h32.8l-2.7 24.2a4.3 4.3 0 0 1-4.3 3.8H14.6a4.3 4.3 0 0 1-4.3-3.8z" fill="url(#isg)"/>
    <path d="M17 18.4v-5A7.4 7.4 0 0 1 24.4 6c4.1 0 7.4 3.3 7.4 7.4v5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <g fill="#fff"><rect x="16.4" y="23.6" width="6.8" height="6.8" rx="1.1"/><rect x="24.8" y="23.6" width="6.8" height="6.8" rx="1.1"/><rect x="16.4" y="32" width="6.8" height="6.8" rx="1.1"/><rect x="24.8" y="32" width="6.8" height="6.8" rx="1.1"/></g></svg>`,

  /* Параметры — шестерёнка с градиентом */
  settings: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="ise" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D8E4EC"/><stop offset="1" stop-color="#8CA8BA"/></linearGradient></defs>
    <g fill="url(#ise)">
      <rect x="21.3" y="3" width="5.4" height="10" rx="2"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(45 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(90 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(135 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(180 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(225 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(270 24 24)"/><rect x="21.3" y="3" width="5.4" height="10" rx="2" transform="rotate(315 24 24)"/>
    </g>
    <circle cx="24" cy="24" r="11.6" fill="url(#ise)"/>
    <circle cx="24" cy="24" r="6.4" fill="none" stroke="#5D7B90" stroke-width="3.4"/></svg>`,

  /* Фотографии — синий квадрат с пейзажем */
  photos: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="iph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FC8F8"/><stop offset="1" stop-color="#2E6EE0"/></linearGradient></defs>
    <rect x="4" y="4" width="40" height="40" rx="8.5" fill="url(#iph)"/>
    <circle cx="17.5" cy="16" r="4.2" fill="#FFF0BF"/>
    <path d="M8 36l9.7-11c.9-1 2.3-1 3.1 0l6.4 7.2 3.5-3.9c.9-1 2.3-1 3.1 0L40 35.6V38.6A4.4 4.4 0 0 1 35.6 43H12.4A4.4 4.4 0 0 1 8 38.6z" fill="#fff" opacity=".94"/></svg>`,

  /* Калькулятор */
  calc: `<svg viewBox="0 0 48 48">
    <rect x="7" y="4" width="34" height="40" rx="5.5" fill="#F5F7FA"/>
    <rect x="7.8" y="4.8" width="32.4" height="38.4" rx="4.8" fill="none" stroke="#C6D1DB" stroke-width="1.5"/>
    <rect x="11" y="8.5" width="26" height="9" rx="2.2" fill="#22334B"/>
    <path d="M31.5 13h3.2" stroke="#7FD1FF" stroke-width="1.8" stroke-linecap="round"/>
    <g fill="#9AA7B4"><rect x="11" y="21.5" width="7" height="7" rx="1.8"/><rect x="20.5" y="21.5" width="7" height="7" rx="1.8"/><rect x="30" y="21.5" width="7" height="7" rx="1.8"/><rect x="11" y="31" width="7" height="7" rx="1.8"/><rect x="20.5" y="31" width="7" height="7" rx="1.8"/></g>
    <rect x="30" y="31" width="7" height="7" rx="1.8" fill="#2E6DA4"/></svg>`,

  /* Блокнот */
  notepad: `<svg viewBox="0 0 48 48">
    <rect x="8.5" y="5" width="31" height="38" rx="3" fill="#FBFCFE"/>
    <rect x="9.2" y="5.7" width="29.6" height="36.6" rx="2.4" fill="none" stroke="#C6D1DB" stroke-width="1.4"/>
    <path d="M8.5 8a3 3 0 0 1 3-3h25a3 3 0 0 1 3 3v4.5h-31z" fill="#3E76C4"/>
    <g stroke="#AEB9C6" stroke-width="2.1" stroke-linecap="round"><path d="M13.5 20.5h21M13.5 26.5h21M13.5 32.5h13"/></g>
    <path d="M28.5 38.5l9.8-9.8 2.8 2.8-9.8 9.8-3.4.6z" fill="#F8C842"/>
    <path d="M38.3 28.7l1.9-1.9a1.6 1.6 0 0 1 2.3 0l.5.5a1.6 1.6 0 0 1 0 2.3l-1.9 1.9z" fill="#5D7B90"/></svg>`,

  /* Paint */
  paint: `<svg viewBox="0 0 48 48">
    <path d="M24 5.5C13.3 5.5 4.8 13.3 4.8 22.8c0 9.5 8.5 17.2 19.2 17.2 2.5 0 4-1.6 4-3.6 0-1-.4-1.9-1-2.6-.6-.6-1-1.4-1-2.2 0-2 1.7-3.6 3.9-3.6h4.4c5.6 0 9.9-4.1 9.9-9.1 0-7.4-8.7-13.4-20.2-13.4z" fill="#FAFBFC" stroke="#C6D1DB" stroke-width="1.4"/>
    <circle cx="14" cy="18.5" r="3.1" fill="#E81123"/><circle cx="22.5" cy="13.5" r="3.1" fill="#F8C842"/><circle cx="31.5" cy="15.5" r="3.1" fill="#16C60C"/><circle cx="36" cy="22.5" r="3.1" fill="#0078D4"/>
    <path d="M27.5 30.5L39.6 16l4.9 4.2-12.7 13.2z" fill="#8E5B2F"/><path d="M27.5 30.5l3.4 2.4-4.4 4.6z" fill="#C9A063"/></svg>`,

  /* Терминал */
  terminal: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="itmg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33343B"/><stop offset="1" stop-color="#17181D"/></linearGradient></defs>
    <rect x="4" y="6.5" width="40" height="35" rx="6.5" fill="url(#itmg)"/>
    <path d="M11 17l7.4 6.2L11 29.4" stroke="#4CC2FF" stroke-width="3.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22.8 31.6H36.5" stroke="#E8E8E8" stroke-width="3.3" stroke-linecap="round"/></svg>`,

  /* Погода — солнце за облаком */
  weather: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="iwe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE18A"/><stop offset="1" stop-color="#FFB43B"/></linearGradient></defs>
    <circle cx="18.5" cy="16.5" r="8.4" fill="url(#iwe)"/>
    <path d="M14 35.5a6.8 6.8 0 0 1 .4-13.6 9.4 9.4 0 0 1 18-2.4 7.7 7.7 0 0 1 1.5 15.2c-.5.1-19.4.8-19.9.8z" fill="#fff"/>
    <path d="M14.4 35.5h19.5a7.7 7.7 0 0 0 3.2-2H11.7a6.8 6.8 0 0 0 2.7 2z" fill="#E3EAF2"/></svg>`,

  /* Часы */
  clockapp: `<svg viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18.5" fill="#fff"/>
    <circle cx="24" cy="24" r="18.5" fill="none" stroke="#2C7BD4" stroke-width="3.2"/>
    <g stroke="#9FB2C4" stroke-width="1.6" stroke-linecap="round"><path d="M24 8.5v2.5M24 37v2.5M8.5 24H11M37 24h2.5"/></g>
    <path d="M24 14.5V24l6.4 4.6" stroke="#1B4C7E" stroke-width="2.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 24l7-4" stroke="#E81123" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="24" cy="24" r="2" fill="#1B4C7E"/></svg>`,

  /* Медиаплеер */
  music: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="imu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7B5BE6"/><stop offset="1" stop-color="#3B2FA0"/></linearGradient></defs>
    <rect x="4" y="4" width="40" height="40" rx="8.5" fill="url(#imu)"/>
    <path d="M31 12v16.4a5.6 5.6 0 1 1-3.1-5V16.2l-10.2 2.7v12.6a5.6 5.6 0 1 1-3.1-5V14.8z" fill="#fff"/></svg>`,

  /* Задачи (To Do) */
  tasks: `<svg viewBox="0 0 48 48"><defs>
    <linearGradient id="ita" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#36B7E8"/><stop offset="1" stop-color="#1F77D2"/></linearGradient></defs>
    <rect x="4" y="4" width="40" height="40" rx="8.5" fill="url(#ita)"/>
    <path d="M13.5 24.8l7 7L34.5 16" stroke="#fff" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  /* Диспетчер задач */
  taskmgr: `<svg viewBox="0 0 48 48">
    <rect x="5" y="6.5" width="38" height="35" rx="4.5" fill="#F5F7FA"/>
    <rect x="5.8" y="7.3" width="36.4" height="33.4" rx="3.8" fill="none" stroke="#C6D1DB" stroke-width="1.4"/>
    <path d="M5 11a4.5 4.5 0 0 1 4.5-4.5h29A4.5 4.5 0 0 1 43 11v3H5z" fill="#3E76C4"/>
    <g fill="#2E6DA4"><rect x="10.5" y="27" width="5.4" height="9" rx="1.1"/><rect x="18.6" y="22.5" width="5.4" height="13.5" rx="1.1"/><rect x="26.7" y="17.5" width="5.4" height="18.5" rx="1.1"/></g>
    <rect x="34.8" y="30" width="5.4" height="6" rx="1.1" fill="#9AA7B4"/></svg>`,

  /* Смартфон (для доступа к файлам) */
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="2.8" width="10" height="18.4" rx="2.6"/><path d="M10.5 5.4h3" stroke-linecap="round"/><circle cx="12" cy="17.8" r="1.1" fill="currentColor" stroke="none"/></svg>`,

  /* Клавиатура (трей) */
  kb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M5.8 9h.01M9 9h.01M12.2 9h.01M15.4 9h.01M18.6 9h.01M5.8 12h.01M9 12h.01M12.2 12h.01M15.4 12h.01M18.6 12h.01M8 15h8"/></svg>`,

  /* Цветные значки «Быстрого поиска» */
  qchrome: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#fff"/><path d="M24 4a20 20 0 0 1 17.3 10H24a10 10 0 0 0-9.2 6.1L8.2 8.9A20 20 0 0 1 24 4z" fill="#EA4335"/><path d="M8.2 8.9l6.6 11.2A10 10 0 0 0 15.4 30L4.6 25.8A20 20 0 0 1 8.2 8.9z" fill="#FBBC05"/><path d="M4.6 25.8L15.4 30a10 10 0 0 0 14.9-3.1l6 10.4A20 20 0 0 1 4.6 25.8z" fill="#34A853"/><path d="M41.4 14a20 20 0 0 1-4.9 22.5l-6.2-10.7A10 10 0 0 0 31.9 14z" fill="#0F9D58" opacity="0"/><circle cx="24" cy="24" r="9" fill="#fff"/><circle cx="24" cy="24" r="7" fill="#4285F4"/></svg>`,
  qgallery: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="10" fill="#00C7B3"/><path d="M13 31.5l7.4-8.6c1-1.2 2.6-1.2 3.6 0l4.6 5.3 2.7-3c1-1.2 2.6-1.2 3.6 0L40 31.2V36a4 4 0 0 1-4 4H13z" fill="#fff"/><circle cx="17.5" cy="16" r="4" fill="#FFD54F"/></svg>`,
  qplay: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="10" fill="#fff" stroke="#E4E7EB"/><path d="M17 13.5v21c0 1.2 1.3 1.9 2.3 1.3l16.8-10.5c1-.6 1-2 0-2.6L19.3 12.2c-1-.6-2.3.1-2.3 1.3z" fill="url(#qpg)"/><defs><linearGradient id="qpg" x1="17" y1="12" x2="37" y2="36"><stop offset="0" stop-color="#00D7FE"/><stop offset=".45" stop-color="#2BC79A"/><stop offset=".7" stop-color="#F9CE4A"/><stop offset="1" stop-color="#EC4A3D"/></linearGradient></defs></svg>`,
  qassist: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#fff" stroke="#E4E7EB"/><circle cx="24" cy="14.5" r="4.6" fill="#4285F4"/><circle cx="33.5" cy="24" r="4.6" fill="#EA4335"/><circle cx="24" cy="33.5" r="4.6" fill="#FBBC05"/><circle cx="14.5" cy="24" r="4.6" fill="#34A853"/></svg>`,
  qgear: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="10" fill="#ECEFF3"/><g fill="#5F6B7A"><rect x="21.5" y="9" width="5" height="9.5" rx="2"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(45 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(90 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(135 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(180 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(225 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(270 24 24)"/><rect x="21.5" y="9" width="5" height="9.5" rx="2" transform="rotate(315 24 24)"/></g><circle cx="24" cy="24" r="6.6" fill="#ECEFF3" stroke="#5F6B7A" stroke-width="3.4"/></svg>`,
});

/* Диспетчер задач — системное приложение */
APPS.taskmgr = {name:'Диспетчер задач', icon:'taskmgr', w:660, h:470, pinned:false, pre:true, cat:'Система', dev:'Microsoft Corporation', size:'2,1 МБ', rating:4.5, revs:4102, desc:'Просмотр запущенных процессов и загрузки ресурсов. Завершайте задачи одним нажатием.'};
