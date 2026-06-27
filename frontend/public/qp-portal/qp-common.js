/* qp-common.js — shared across all QP portal pages */

// Auto-detect backend URL.
// Production bases come from config.js (window.QP_CONFIG.apiBases), which is
// generated from env vars at build time. The portal tries them in order and
// pins the first that responds for the rest of the session.
const _isLocalDev = /localhost:(3000|3001)|127\.0\.0\.1:(3000|3001)/.test(window.location.origin);
function _qpBases(){
  if (_isLocalDev) return ['http://localhost:8000'];
  let bases = (window.QP_CONFIG && Array.isArray(window.QP_CONFIG.apiBases) && window.QP_CONFIG.apiBases.length)
    ? window.QP_CONFIG.apiBases.slice()
    : ['https://sdps-website-main.onrender.com'];
  const pinned = sessionStorage.getItem('qp_api_base');
  if (pinned) bases = [pinned, ...bases.filter(b => b !== pinned)];
  return bases;
}
let API = _qpBases()[0];

/**
 * HTML-escape a value before inserting into innerHTML / template literals.
 * Prevents stored XSS when rendering server data into DOM tables.
 * Usage:  `<td>${esc(user.name)}</td>`
 */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const CLASSES = ["Class I","Class II","Class III","Class IV","Class V","Class VI","Class VII","Class VIII","Class IX","Class X"];
// Classes that use a sectioned paper format (Section A / Section B …)
const SECTIONED_CLASSES = ["Class IX","Class X"];

// Display the class as an ordinal on the printed paper: "Class I" -> "Ist", etc.
function stdLabel(cn){
  const map={
    'Class I':'Ist','Class II':'IInd','Class III':'IIIrd','Class IV':'IVth','Class V':'Vth',
    'Class VI':'VIth','Class VII':'VIIth','Class VIII':'VIIIth','Class IX':'IXth','Class X':'Xth'
  };
  return map[cn] || cn || '';
}
const SUBJECTS = ["English","Hindi","Mathematics","Science","Social Science","Computer","Sanskrit","Environmental Studies","General Knowledge","Art & Craft","Physical Education","Music","Drawing"];
const EXAM_TYPES = ["F.A.-I","F.A.-II","F.A.-III","F.A.-IV","S.A.-I","S.A.-II"];
const QUESTION_TYPES = {
  MCQ:"📝 MCQ (Multiple Choice Options)", 
  FIB:"✏️ Fill in Blanks (Use ___ for blank line)", 
  TrueFalse:"✅ True / False",
  Assertion:"🧠 Assertion & Reason (Reason goes in Option A)", 
  Short:"✍️ Short Answer (Provides 3 lines)", 
  Long:"✍️ Long Answer / Essay (Provides 6 lines)",
  Grammar:"⚙️ Grammar Exercise", 
  Poem:"📖 Poem / Creative Writing",
  Map:"🗺️ Map / Picture Marking", 
  Puzzle:"🧩 Word Puzzle / Rearrange", 
  Comprehension:"📖 Comprehension Passage"
};
const STATUS_META = {
  draft:          {label:"Draft",            color:"#6b7280", bg:"#6b728015", icon:"✏️"},
  submitted:      {label:"Submitted",        color:"#2563eb", bg:"#2563eb15", icon:"📤"},
  incharge_approved:{label:"IC Approved",   color:"#7c3aed", bg:"#7c3aed15", icon:"✅"},
  approved:       {label:"Approved",         color:"#059669", bg:"#05966915", icon:"✅"},
  printing:       {label:"Sent to Print",    color:"#0e7490", bg:"#0e749015", icon:"🖨️"},
};

// Auth token (Authorization header) — works cross-site, unlike a third-party
// cookie. The backend accepts either the cookie or this header.
function getToken(){ return localStorage.getItem('qp_token'); }
function getUser(){ try{ return JSON.parse(localStorage.getItem('qp_user')); }catch{ return null; } }
function logout(){
  fetch(`${API}/api/qp/logout`, {method:'POST', credentials:'include'})
    .catch(()=>{})
    .finally(()=>{ localStorage.removeItem('qp_token'); localStorage.removeItem('qp_user'); location.href='index.html'; });
}

// Friendly handling when the session/token has expired (vs. an explicit logout).
function sessionExpired(){
  try{ toast('Your session expired. Please sign in again.', 'warn'); }catch(e){}
  localStorage.removeItem('qp_token');
  localStorage.removeItem('qp_user');
  fetch(`${API}/api/qp/logout`, {method:'POST', credentials:'include'}).catch(()=>{});
  setTimeout(()=>{ location.href='index.html'; }, 1600);
}

async function apiFetch(path, opts={}){
  const token = getToken();
  const isFormData = opts.body instanceof FormData;
  const headers={
    ...(token?{Authorization:`Bearer ${token}`}:{}),
    ...(!isFormData?{'Content-Type':'application/json'}:{}),
    ...(opts.headers||{})
  };
  const bases = _qpBases();
  for (let i = 0; i < bases.length; i++){
    const base = bases[i];
    let r;
    try{
      const isLocal = base.includes('localhost') || base.includes('10.0.2.2');
      const timeout = isLocal ? 1500 : 8000;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      r = await fetch(`${base}/api/qp${path}`, {
        ...opts, 
        credentials: 'include', 
        headers,
        signal: controller.signal
      });
      clearTimeout(id);
    }catch(e){
      // Network/CORS failure — try the next configured base, if any.
      if (i < bases.length - 1) continue;
      console.error('Cannot reach QP backend on any base:', bases);
      throw new Error('Cannot connect to server. Check backend is running.');
    }
    // Connected — remember this base for the rest of the session.
    sessionStorage.setItem('qp_api_base', base); API = base;
    if (r.status === 401){ sessionExpired(); return null; }
    if (!r.ok){ const d = await r.json().catch(()=>({detail:'Error'})); throw new Error(d.detail || r.statusText); }
    return r.json();
  }
}

function statusBadge(status){
  const m=STATUS_META[status]||{label:status,color:'#6b7280',bg:'#6b728015',icon:'•'};
  return `<span style="background:${m.bg};color:${m.color};font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">${m.icon} ${m.label}</span>`;
}

function toast(msg,type='success'){
  const t=document.createElement('div');
  const colors={success:'#059669',error:'#dc2626',warn:'#d97706',info:'#2563eb'};
  t.style.cssText=`position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:12px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:#fff;z-index:99999;background:${colors[type]||colors.success};box-shadow:0 8px 30px rgba(0,0,0,.2);animation:slideIn .25s ease`;
  t.textContent=msg;
  const style=document.createElement('style');
  style.textContent='@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(()=>{t.style.animation='';t.style.transition='opacity .3s';t.style.opacity='0';setTimeout(()=>t.remove(),300);},3000);
}

function navBar(role,pageName){
  const user=getUser();
  const r = String(role).toLowerCase();
  const isDark = (r === 'teacher');
  
  const roleColors={qp_admin:'#ef4444',teacher:'#3b82f6',incharge:'#8b5cf6',printing_head:'#10b981'};
  const roleBgs={qp_admin:'rgba(239, 68, 68, 0.1)',teacher:'rgba(59, 130, 246, 0.1)',incharge:'rgba(139, 92, 246, 0.1)',printing_head:'rgba(16, 185, 129, 0.1)'};
  const roleBorders={qp_admin:'rgba(239, 68, 68, 0.2)',teacher:'rgba(59, 130, 246, 0.2)',incharge:'rgba(139, 92, 246, 0.2)',printing_head:'rgba(16, 185, 129, 0.2)'};
  const roleLabels={qp_admin:'QP Admin',teacher:'Teacher',incharge:'Incharge',printing_head:'Printing Head'};

  const badgeColor = roleColors[r] || '#6b7280';
  const badgeBg = roleBgs[r] || 'rgba(107, 114, 128, 0.1)';
  const badgeBorder = roleBorders[r] || 'rgba(107, 114, 128, 0.2)';
  const badgeLabel = roleLabels[r] || role;

  const navBg = isDark ? 'rgba(13, 18, 30, 0.8)' : 'rgba(255, 255, 255, 0.85)';
  const navBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)';
  const navShadow = isDark ? '0 4px 30px rgba(0, 0, 0, 0.2)' : '0 4px 30px rgba(0, 0, 0, 0.03)';
  const textColor = isDark ? '#ffffff' : '#0e3b91';
  const labelColor = isDark ? '#94a3b8' : '#475569';
  const subtextColor = isDark ? '#64748b' : '#94a3b8';
  const dividerBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
  const userNameColor = isDark ? '#f8fafc' : '#1e293b';
  const logoBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(14, 59, 145, 0.1)';

  const btnBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(241, 245, 249, 0.8)';
  const btnColor = isDark ? '#cbd5e1' : '#475569';
  const btnBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)';
  const btnHoverBg = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2';
  const btnHoverColor = isDark ? '#fca5a5' : '#dc2626';
  const btnHoverBorder = isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)';

  return `<nav style="background:${navBg};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid ${navBorder};padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:56px;font-family:'Inter',sans-serif;flex-shrink:0;box-shadow:${navShadow};z-index:100;position:relative">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="https://sdpublic.org/assets/img/logo.png" style="height:36px;width:36px;object-fit:contain;border-radius:50%;border:1px solid ${logoBorder}" onerror="this.onerror=null;this.src='/logo512.png'"/>
      <div>
        <div style="font-size:13px;font-weight:800;color:${textColor};letter-spacing:-.3px;font-family:'Outfit',sans-serif">S.D. Public School</div>
        <div style="font-size:9px;color:${subtextColor};font-weight:600;margin-top:-1px;text-transform:uppercase;letter-spacing:.05em">Question Paper Portal</div>
      </div>
      <div style="width:1px;height:24px;background:${dividerBg};margin:0 6px"></div>
      <span style="font-size:12px;color:${labelColor};font-weight:600">${pageName}</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:600;color:${userNameColor}">${esc(user?.name||'')}</div>
        <span style="font-size:9px;font-weight:700;color:${badgeColor};background:${badgeBg};padding:2px 8px;border-radius:20px;border:1px solid ${badgeBorder};text-transform:uppercase;letter-spacing:.04em;display:inline-block;margin-top:2px">${badgeLabel}</span>
      </div>
      <button onclick="logout()" style="background:${btnBg};border:1px solid ${btnBorder};color:${btnColor};font-family:'Inter',sans-serif;font-size:11px;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:600;transition:all .2s ease;outline:none" onmouseover="this.style.background='${btnHoverBg}';this.style.color='${btnHoverColor}';this.style.borderColor='${btnHoverBorder}';this.style.transform='translateY(-0.5px)'" onmouseout="this.style.background='${btnBg}';this.style.color='${btnColor}';this.style.borderColor='${btnBorder}';this.style.transform='none'">Sign Out</button>
    </div>
  </nav>`;
}

/* Inject shared mobile/responsive rules (navbar wrap) into every QP page. */
(function injectQpResponsive(){
  if (!document.head || document.getElementById('qp-responsive-style')) return;
  const s = document.createElement('style');
  s.id = 'qp-responsive-style';
  s.textContent = `
    @media (max-width: 600px){
      nav{height:auto!important;padding:8px 12px!important;flex-wrap:wrap!important;row-gap:6px!important;}
      nav > div{gap:8px!important;}
    }
  `;
  document.head.appendChild(s);
})();

/* Keep-alive: ping the backend every 12 min while a QP page is open. */
(function qpKeepAlive(){
  const ping = () => {
    try {
      const base = (typeof _qpBases === 'function') ? _qpBases()[0] : API;
      fetch(`${base}/api/ping`, { credentials: 'include' }).catch(()=>{});
    } catch (e) { /* ignore */ }
  };
  setInterval(ping, 12 * 60 * 1000);
})();

/* Native mobile status bar and splash screen handling */
(function initQpNativeMobile() {
  const init = () => {
    if (window.Capacitor && window.Capacitor.Plugins) {
      const { StatusBar, SplashScreen } = window.Capacitor.Plugins;
      if (StatusBar) {
        StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#090d16' }).catch(() => {});
      }
      if (SplashScreen) {
        setTimeout(() => {
          SplashScreen.hide().catch(() => {});
        }, 300);
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
