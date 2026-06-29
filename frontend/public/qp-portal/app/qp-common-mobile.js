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
      if (window.state && window.state.notifInterval) {
        clearInterval(window.state.notifInterval);
        window.state.notifInterval = null;
      }
      if (window.showView) window.showView('login');
    });
}

function sessionExpired(){
  try{ toast('Your session expired. Please sign in again.', 'warn'); }catch(e){}
  localStorage.removeItem('qp_token');
  localStorage.removeItem('qp_user');
  if (window.state && window.state.notifInterval) {
    clearInterval(window.state.notifInterval);
    window.state.notifInterval = null;
  }
  fetch(`${API}/api/qp/logout`, {method:'POST', credentials:'include'}).catch(()=>{});
  setTimeout(()=>{ 
    if (window.showView) window.showView('login');
  }, 1600);
}

// Initialize Supabase if configuration is set
const useSupabase = window.QP_CONFIG && window.QP_CONFIG.SUPABASE_URL && window.QP_CONFIG.SUPABASE_URL !== "https://your-project-id.supabase.co";
let supabase = null;
if (useSupabase) {
  supabase = window.supabase.createClient(window.QP_CONFIG.SUPABASE_URL, window.QP_CONFIG.SUPABASE_ANON_KEY);
}

async function apiFetchSupabase(path, opts={}) {
  const body = opts.body ? JSON.parse(opts.body) : {};
  const esc = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // 1. Check User
  if (path === '/check-user') {
    const { data, error } = await supabase.from('qp_profiles').select('password_set').eq('username', body.username).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Account not found.');
    return { first_login: !data.password_set };
  }
  
  // 2. Login
  if (path === '/login') {
    const { data: profile, error: pErr } = await supabase.from('qp_profiles').select('email, name, role, phone').eq('username', body.username).maybeSingle();
    if (pErr || !profile) throw new Error('Account not found.');
    
    const email = profile.email || body.username;
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email,
      password: body.password
    });
    if (authErr) throw new Error(authErr.message);
    
    return {
      access_token: authData.session.access_token,
      user: {
        id: authData.user.id,
        username: body.username,
        name: profile.name,
        role: profile.role,
        email: email,
        phone: profile.phone || ''
      }
    };
  }
  
  // 3. Forgot Password / Resend OTP
  if (path === '/staff/forgot-password' || path === '/staff/resend-otp') {
    const action = path.includes('forgot-password') ? 'forgot-password' : 'resend-otp';
    const { data, error } = await supabase.functions.invoke('auth-handler', {
      body: { action, username: body.username }
    });
    if (error) throw new Error(error.message);
    return data;
  }
  
  // 4. Set Password / Reset Password
  if (path === '/staff/set-password' || path === '/staff/reset-forgotten-password') {
    const action = path.includes('set-password') ? 'set-password' : 'reset-forgotten-password';
    const { data, error } = await supabase.functions.invoke('auth-handler', {
      body: { action, username: body.username, otp: body.otp, new_password: body.new_password }
    });
    if (error) throw new Error(error.message);
    
    // Automatically sign in
    const { data: profile } = await supabase.from('qp_profiles').select('email, name, role, phone').eq('username', body.username).single();
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: body.new_password
    });
    if (authErr) throw new Error(authErr.message);
    
    return {
      access_token: authData.session.access_token,
      user: {
        id: authData.user.id,
        username: body.username,
        name: profile.name,
        role: profile.role,
        email: profile.email,
        phone: profile.phone || ''
      }
    };
  }
  
  // 5. Fetch Assignments
  if (path === '/assignments') {
    const user = getUser();
    let query = supabase.from('qp_assignments').select('*');
    if (user.role === 'teacher') {
      query = query.eq('teacher_id', user.id);
    } else if (user.role === 'incharge') {
      const { data: profile } = await supabase.from('qp_profiles').select('incharge_classes').eq('id', user.id).single();
      query = query.in('class_name', profile.incharge_classes || []);
    } else if (user.role === 'printing_head') {
      query = query.in('status', ['approved', 'printing']);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
  
  // 6. Papers Sync & Fetch
  if (path.startsWith('/papers/')) {
    const assignmentId = path.split('/')[2];
    if (opts.method === 'PUT') {
      const { error } = await supabase.from('qp_papers').upsert({
        id: `paper_${assignmentId}`,
        assignment_id: assignmentId,
        questions: body.questions || [],
        sections: body.sections || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'assignment_id' });
      if (error) throw new Error(error.message);
      return { status: "saved" };
    } else {
      const { data, error } = await supabase.from('qp_papers').select('*').eq('assignment_id', assignmentId).maybeSingle();
      if (error) throw new Error(error.message);
      return data || { questions: [], sections: [] };
    }
  }
  
  // 7. Submit Paper
  if (path.endsWith('/submit')) {
    const aid = path.split('/')[2];
    const { error } = await supabase.from('qp_assignments').update({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', aid);
    if (error) throw new Error(error.message);
    
    // Notifications
    const { data: ass } = await supabase.from('qp_assignments').select('*').eq('id', aid).single();
    const { data: incharges } = await supabase.from('qp_profiles').select('id').eq('role', 'incharge').contains('incharge_classes', [ass.class_name]);
    for (let ic of (incharges || [])) {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ic.id,
        title: "Paper Submitted for Review",
        message: `${ass.teacher_name} submitted the ${ass.subject} paper for ${ass.class_name}.`,
        type: "paper_submitted",
        assignment_id: aid,
        is_read: false
      });
    }
    const { data: admins } = await supabase.from('qp_profiles').select('id').eq('role', 'qp_admin');
    for (let adm of (admins || [])) {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: adm.id,
        title: "Paper Submitted",
        message: `${ass.teacher_name} submitted the ${ass.subject} paper for ${ass.class_name}.`,
        type: "paper_submitted",
        assignment_id: aid,
        is_read: false
      });
    }
    return { status: "submitted" };
  }
  
  // 8. Incharge review
  if (path.endsWith('/incharge-review')) {
    const aid = path.split('/')[2];
    const status = body.action === 'approve' ? 'incharge_approved' : 'draft';
    const updatePayload = { status };
    if (body.action === 'reject') {
      updatePayload.rejection_reason = body.reason || 'Needs revision';
      updatePayload.rejected_by = 'incharge';
      updatePayload.rejected_at = new Date().toISOString();
    }
    const { error } = await supabase.from('qp_assignments').update(updatePayload).eq('id', aid);
    if (error) throw new Error(error.message);
    
    const { data: ass } = await supabase.from('qp_assignments').select('*').eq('id', aid).single();
    if (body.action === 'approve') {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ass.teacher_id,
        title: "Incharge Review: Approved",
        message: `Your ${ass.subject} paper for ${ass.class_name} was approved by the Incharge.`,
        type: "paper_approved",
        assignment_id: aid,
        is_read: false
      });
      const { data: admins } = await supabase.from('qp_profiles').select('id').eq('role', 'qp_admin');
      for (let adm of (admins || [])) {
        await supabase.from('qp_notifications').insert({
          id: `notif_${Math.random().toString(36).substring(2, 11)}`,
          user_id: adm.id,
          title: "Paper IC Approved",
          message: `The ${ass.subject} paper for ${ass.class_name} was approved by the Incharge.`,
          type: "paper_approved",
          assignment_id: aid,
          is_read: false
        });
      }
    } else {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ass.teacher_id,
        title: "Paper Rejected by Incharge",
        message: `Your ${ass.subject} paper for ${ass.class_name} was rejected. Reason: ${body.reason}`,
        type: "paper_rejected",
        assignment_id: aid,
        is_read: false
      });
    }
    return { status };
  }
  
  // 9. Admin review action
  if (path.endsWith('/admin-action')) {
    const aid = path.split('/')[2];
    let status = 'approved';
    const updatePayload = {};
    if (body.action === 'approve') {
      status = 'approved';
      updatePayload.status = 'approved';
    } else if (body.action === 'reject') {
      status = body.reject_to || 'draft';
      updatePayload.status = status;
      updatePayload.rejection_reason = body.reason || 'Needs revision';
      updatePayload.rejected_by = 'admin';
      updatePayload.rejected_at = new Date().toISOString();
    } else if (body.action === 'send_to_print') {
      status = 'printing';
      updatePayload.status = 'printing';
    }
    const { error } = await supabase.from('qp_assignments').update(updatePayload).eq('id', aid);
    if (error) throw new Error(error.message);
    
    const { data: ass } = await supabase.from('qp_assignments').select('*').eq('id', aid).single();
    if (body.action === 'approve') {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ass.teacher_id,
        title: "Paper Approved by Admin",
        message: `Congratulations! Your ${ass.subject} paper for ${ass.class_name} has been approved by the Admin.`,
        type: "paper_approved",
        assignment_id: aid,
        is_read: false
      });
    } else if (body.action === 'reject') {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ass.teacher_id,
        title: "Paper Rejected by Admin",
        message: `Your ${ass.subject} paper for ${ass.class_name} was rejected by the Admin. Reason: ${body.reason}`,
        type: "paper_rejected",
        assignment_id: aid,
        is_read: false
      });
    } else if (body.action === 'send_to_print') {
      await supabase.from('qp_notifications').insert({
        id: `notif_${Math.random().toString(36).substring(2, 11)}`,
        user_id: ass.teacher_id,
        title: "Paper Sent to Print",
        message: `Your ${ass.subject} paper for ${ass.class_name} has been sent to the print queue.`,
        type: "paper_printing",
        assignment_id: aid,
        is_read: false
      });
      const { data: printers } = await supabase.from('qp_profiles').select('id').eq('role', 'printing_head');
      for (let ph of (printers || [])) {
        await supabase.from('qp_notifications').insert({
          id: `notif_${Math.random().toString(36).substring(2, 11)}`,
          user_id: ph.id,
          title: "New Paper to Print",
          message: `The ${ass.subject} paper for ${ass.class_name} is ready in the queue.`,
          type: "paper_printing",
          assignment_id: aid,
          is_read: false
        });
      }
    }
    return { status };
  }
  
  // 10. Fetch notifications
  if (path === '/notifications') {
    const user = getUser();
    const { data, error } = await supabase.from('qp_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  
  // 11. Mark notifications read
  if (path === '/notifications/mark-read') {
    const user = getUser();
    if (body.id) {
      await supabase.from('qp_notifications').update({ is_read: true }).eq('id', body.id).eq('user_id', user.id);
    } else {
      await supabase.from('qp_notifications').update({ is_read: true }).eq('user_id', user.id);
    }
    return { status: "ok" };
  }
  
  // 12. Claude Fable 5 AI Generator
  if (path === '/ai') {
    const { data, error } = await supabase.functions.invoke('generate-questions', {
      body: { prompt: body.prompt }
    });
    if (error) throw new Error(error.message);
    try {
      return JSON.parse(data.text);
    } catch(e) {
      const match = data.text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Failed to parse structured JSON from AI output.");
    }
  }
  
  // 13. Logout
  if (path === '/logout') {
    await supabase.auth.signOut();
    return { status: "ok" };
  }
  
  throw new Error(`Unsupported Supabase Route: ${path}`);
}

async function apiFetch(path, opts={}){
  if (useSupabase) {
    return await apiFetchSupabase(path, opts);
  }

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
