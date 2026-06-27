/* qp-common-mobile.js — shared across the mobile app views */

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
const SECTIONED_CLASSES = ["Class IX","Class X"];

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
  MCQ:"📝 MCQ (Multiple Choice)", 
  FIB:"✏️ Fill in Blanks", 
  TrueFalse:"✅ True / False",
  Assertion:"🧠 Assertion & Reason", 
  Short:"✍️ Short Answer", 
  Long:"✍️ Long Answer",
  Grammar:"⚙️ Grammar Exercise", 
  Poem:"📖 Poem / Creative",
  Map:"🗺️ Map Marking", 
  Puzzle:"🧩 Word Puzzle", 
  Comprehension:"📖 Comprehension Passage"
};

const STATUS_META = {
  draft:          {label:"Draft",            color:"#94a3b8", bg:"rgba(148, 163, 184, 0.15)", icon:"✏️"},
  submitted:      {label:"Submitted",        color:"#3b82f6", bg:"rgba(59, 130, 246, 0.15)", icon:"📤"},
  incharge_approved:{label:"IC Approved",   color:"#8b5cf6", bg:"rgba(139, 92, 246, 0.15)", icon:"✅"},
  approved:       {label:"Approved",         color:"#10b981", bg:"rgba(16, 185, 129, 0.15)", icon:"✅"},
  printing:       {label:"Sent to Print",    color:"#06b6d4", bg:"rgba(6, 182, 212, 0.15)", icon:"🖨️"},
};

function getToken(){ return localStorage.getItem('qp_token'); }
function getUser(){ try{ return JSON.parse(localStorage.getItem('qp_user')); }catch{ return null; } }

function logout(){
  fetch(`${API}/api/qp/logout`, {method:'POST', credentials:'include'})
    .catch(()=>{})
    .finally(()=>{ 
      localStorage.removeItem('qp_token'); 
      localStorage.removeItem('qp_user'); 
      if (window.showView) window.showView('login');
    });
}

function sessionExpired(){
  try{ toast('Your session expired. Please sign in again.', 'warn'); }catch(e){}
  localStorage.removeItem('qp_token');
  localStorage.removeItem('qp_user');
  fetch(`${API}/api/qp/logout`, {method:'POST', credentials:'include'}).catch(()=>{});
  setTimeout(()=>{ 
    if (window.showView) window.showView('login');
  }, 1600);
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
      if (i < bases.length - 1) continue;
      console.error('Cannot reach QP backend on any base:', bases);
      throw new Error('Cannot connect to server. Check backend is running.');
    }
    sessionStorage.setItem('qp_api_base', base); API = base;
    if (r.status === 401){ sessionExpired(); return null; }
    if (!r.ok){ const d = await r.json().catch(()=>({detail:'Error'})); throw new Error(d.detail || r.statusText); }
    return r.json();
  }
}

function statusBadge(status){
  const m=STATUS_META[status]||{label:status,color:'#94a3b8',bg:'rgba(148, 163, 184, 0.15)',icon:'•'};
  return `<span style="background:${m.bg};color:${m.color};font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap">${m.icon} ${m.label}</span>`;
}

function toast(msg,type='success'){
  const t=document.createElement('div');
  const colors={success:'#10b981',error:'#ef4444',warn:'#f59e0b',info:'#3b82f6'};
  t.style.cssText=`position:fixed;bottom:85px;left:50%;transform:translateX(-50%);padding:14px 24px;border-radius:16px;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:#fff;z-index:99999;background:${colors[type]||colors.success};box-shadow:0 12px 40px rgba(0,0,0,.45);animation:fadeInUp .3s cubic-bezier(0.16, 1, 0.3, 1);white-space:nowrap;max-width:90%`;
  t.textContent=msg;
  
  if (!document.getElementById('toast-styles')) {
    const style=document.createElement('style');
    style.id = 'toast-styles';
    style.textContent='@keyframes fadeInUp{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}';
    document.head.appendChild(style);
  }
  document.body.appendChild(t);
  setTimeout(()=>{
    t.style.transition='opacity .3s, transform .3s';
    t.style.opacity='0';
    t.style.transform='translate(-50%, -10px)';
    setTimeout(()=>t.remove(),300);
  },3000);
}
window.toast = toast;
