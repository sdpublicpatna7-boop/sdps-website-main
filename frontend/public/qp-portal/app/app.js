/* app.js — Dedicated Mobile-First SPA Logic for QP Portal App */

// ── STATE MANAGEMENT ──
let state = {
  user: null,
  assignments: [],
  currentAssignment: null,
  currentPaper: { questions: [], sections: [] },
  currentQuestion: null,
  aiQuestions: [],
  activeView: 'login'
};

// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupLoginForm();
  setupEditorEvents();
  setupAIEvents();
  setupConnectionIndicator();
  
  // Auto-authenticate if token exists
  const u = getUser();
  const token = getToken();
  if (u && token) {
    state.user = u;
    loginSuccess();
  } else {
    showView('login');
  }
});

// ── ROUTING & VIEW CONTROLLER ──
function showView(viewId) {
  state.activeView = viewId;
  
  // Hide all views, activate the target
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewId}`);
  });
  
  // Sync bottom nav links
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });
  
  // Toggle layout sections based on view
  const isLogin = (viewId === 'login');
  document.getElementById('main-header').style.display = isLogin ? 'none' : 'flex';
  document.getElementById('main-navigation').style.display = isLogin ? 'none' : 'flex';
  
  // Trigger data refreshes on view entry
  if (viewId === 'papers') {
    loadAssignments();
  } else if (viewId === 'settings') {
    loadSettings();
  }
}
window.showView = showView;

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.dataset.view;
      showView(targetView);
    });
  });
  
  document.getElementById('btn-logout').addEventListener('click', logout);
}

// ── CONNECTION STATUS DIAGNOSTICS ──
function setupConnectionIndicator() {
  const indicator = document.getElementById('connection-indicator');
  
  function updateIndicator() {
    if (navigator.onLine) {
      indicator.textContent = '● Online';
      indicator.className = 'sync-status online';
    } else {
      indicator.textContent = '● Offline';
      indicator.className = 'sync-status offline';
    }
  }
  
  window.addEventListener('online', updateIndicator);
  window.addEventListener('offline', updateIndicator);
  updateIndicator();
}

// ── USER LOGIN FLOW ──
function setupLoginForm() {
  const form = document.getElementById('login-form');
  const errDiv = document.getElementById('login-err');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errDiv.style.display = 'none';
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit');
    
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> <span>Connecting...</span>';
    
    try {
      // Step 1: Check username
      const userCheck = await apiFetch(`/check-user`, {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      
      if (!userCheck) {
        throw new Error('User check failed. Username not found.');
      }
      
      // Step 2: Perform password verification
      const loginRes = await apiFetch(`/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      if (loginRes && loginRes.access_token) {
        localStorage.setItem('qp_token', loginRes.access_token);
        localStorage.setItem('qp_user', JSON.stringify(loginRes.user));
        state.user = loginRes.user;
        loginSuccess();
      } else {
        throw new Error('Verification failed. Invalid password.');
      }
    } catch (err) {
      errDiv.textContent = err.message || 'Verification failed. Try again.';
      errDiv.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
    }
  });
}

function loginSuccess() {
  // Populate user meta in top bar
  document.getElementById('header-user-name').textContent = state.user.name || 'User';
  
  const roleLabel = state.user.role === 'qp_admin' ? 'QP Admin' : 
                    state.user.role === 'incharge' ? 'Incharge' : 
                    state.user.role === 'printing_head' ? 'Print Head' : 'Teacher';
  document.getElementById('header-user-role').textContent = roleLabel;
  
  // Show assignments lists
  showView('papers');
}

// ── VIEW: PAPERS LIST ──
async function loadAssignments() {
  const container = document.getElementById('papers-container');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading assignments...</p>
    </div>
  `;
  
  try {
    const list = await apiFetch('/assignments') || [];
    state.assignments = list;
    
    document.getElementById('papers-count').textContent = list.length;
    
    if (list.length === 0) {
      container.innerHTML = `
        <div class="editor-placeholder-msg">
          <div class="icon-illustration">📂</div>
          <h4>No Assignments Found</h4>
          <p>You have no active question papers assigned.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = list.map(a => {
      const isTeacher = (state.user.role === 'teacher');
      const isAdmin = (state.user.role === 'qp_admin');
      let actionLabel = '👁️ Preview';
      let actionClass = '';
      
      if (isAdmin) {
        actionLabel = '✏️ Edit Paper';
        actionClass = 'btn-primary-card';
      } else if (isTeacher && (a.status === 'draft')) {
        actionLabel = '✏️ Edit Paper';
        actionClass = 'btn-primary-card';
      } else if (state.user.role === 'incharge' && a.status === 'submitted') {
        actionLabel = '🛡️ Review';
      }
      
      return `
        <div class="paper-card" id="paper-card-${a.id}">
          <div class="paper-card-header">
            <h4>${esc(a.subject)}</h4>
            ${statusBadge(a.status)}
          </div>
          <div class="paper-card-meta">
            <div class="meta-item">👤 ${esc(a.teacher_name || 'Unknown')}</div>
            <div class="meta-item">🏫 ${esc(a.class_name)}</div>
            <div class="meta-item">🎯 Marks: ${a.max_marks}</div>
            <div class="meta-item">📅 ${a.exam_type}</div>
          </div>
          <div class="paper-card-footer">
            <span style="font-size: 11px; color: var(--text-muted)">ID: ${a.id.slice(-6)}</span>
            <button class="btn-card-action ${actionClass}" onclick="selectPaper('${a.id}')">
              ${actionLabel}
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div class="editor-placeholder-msg">
        <div class="icon-illustration">⚠️</div>
        <h4>Error loading papers</h4>
        <p>${err.message}</p>
        <button class="btn-primary" onclick="loadAssignments()" style="margin-top:10px; width:auto; padding: 0 16px;">Try Again</button>
      </div>
    `;
  }
}

async function selectPaper(id) {
  const match = state.assignments.find(a => a.id === id);
  if (!match) return;
  
  state.currentAssignment = match;
  
  // Update editor view headers
  document.getElementById('editor-paper-title').textContent = `${match.subject} — ${match.class_name}`;
  document.getElementById('editor-paper-info').textContent = `${match.exam_type} · ${match.max_marks} Marks`;
  
  // Show workspace, hide placeholder
  document.getElementById('editor-placeholder').style.display = 'none';
  document.getElementById('editor-workspace').style.display = 'block';
  
  // Toggle submit action button visibility (only for drafts and teachers)
  const submitBtn = document.getElementById('btn-submit-paper');
  if (state.user.role === 'teacher' && match.status === 'draft') {
    submitBtn.style.display = 'block';
  } else {
    submitBtn.style.display = 'none';
  }
  
  // Toggle add button based on editability
  const isEditable = (match.status === 'draft' || state.user.role === 'qp_admin');
  document.getElementById('btn-add-question').style.display = isEditable ? 'block' : 'none';
  
  // Load questions data
  await loadQuestions();
  
  // Transition to editor view
  showView('editor');
}
window.selectPaper = selectPaper;

// ── EDITOR & QUESTIONS WORKSPACE ──
async function loadQuestions() {
  const container = document.getElementById('questions-list-container');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading questions...</p>
    </div>
  `;
  
  try {
    const data = await apiFetch(`/papers/${state.currentAssignment.id}`) || {};
    state.currentPaper = data;
    
    const list = data.questions || [];
    document.getElementById('q-list-count').textContent = list.length;
    
    if (list.length === 0) {
      container.innerHTML = `
        <div class="editor-placeholder-msg">
          <div class="icon-illustration">📝</div>
          <h4>No Questions Yet</h4>
          <p>Tap <strong>+ Add</strong> above to write your first question.</p>
        </div>
      `;
      return;
    }
    
    // Sort questions by their sequence
    list.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    container.innerHTML = list.map((q, idx) => {
      const hasOptions = q.options && q.options.length > 0 && q.options.some(o => o.trim() !== '');
      const optHtml = hasOptions ? `
        <div class="q-card-options">
          ${q.options.map((o, oIdx) => `<div><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${esc(o)}</div>`).join('')}
        </div>
      ` : '';
      
      const isEditable = (state.currentAssignment.status === 'draft' || state.user.role === 'qp_admin');
      const actionHtml = isEditable ? `
        <div class="q-card-actions">
          <button class="btn-icon" onclick="editQuestion(${idx})">✏️</button>
          <button class="btn-icon" onclick="deleteQuestion(${idx})">🗑️</button>
          <button class="btn-icon" onclick="duplicateQuestion(${idx})">📋</button>
        </div>
      ` : '';
      
      return `
        <div class="q-card">
          <div class="q-card-header">
            <span>Q${idx + 1} · ${esc(q.type)}</span>
            <span>Marks: ${q.marks || 1}</span>
          </div>
          <div class="q-card-text">${esc(q.question_text)}</div>
          ${optHtml}
          ${actionHtml}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div class="editor-placeholder-msg">
        <div class="icon-illustration">⚠️</div>
        <h4>Error loading questions</h4>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// ── BOTTOM SHEET / FORM MODAL CONTROL ──
let lastFocusedInput = null;

function setupEditorEvents() {
  const modal = document.getElementById('question-modal-backdrop');
  const addBtn = document.getElementById('btn-add-question');
  const closeBtn = document.getElementById('btn-close-sheet');
  const qForm = document.getElementById('question-form');
  const qType = document.getElementById('q-input-type');
  
  // Populate Question Types select
  qType.innerHTML = Object.entries(QUESTION_TYPES).map(([val, label]) => `
    <option value="${val}">${label}</option>
  `).join('');
  
  // Show / Hide option panels based on type
  qType.addEventListener('change', () => {
    toggleOptionsPanel(qType.value);
  });
  
  addBtn.addEventListener('click', () => {
    openQuestionSheet();
  });
  
  closeBtn.addEventListener('click', () => {
    closeQuestionSheet();
  });
  
  // Intercept click on backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeQuestionSheet();
  });
  
  // Question Form Submission
  qForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveQuestionForm();
  });
  
  // Keep track of cursor selections inside textareas for mathematical symbol inserting
  const textarea = document.getElementById('q-input-text');
  textarea.addEventListener('focus', () => { lastFocusedInput = textarea; });
  textarea.addEventListener('click', () => { lastFocusedInput = textarea; });
  textarea.addEventListener('keyup', () => { lastFocusedInput = textarea; });
  
  // Symbol keyboard handler
  document.querySelectorAll('.btn-math').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const symbol = btn.dataset.symbol;
      insertSymbol(symbol);
    });
  });
  
  // Submit paper
  document.getElementById('btn-submit-paper').addEventListener('click', submitPaper);
}

function toggleOptionsPanel(type) {
  const optPanel = document.getElementById('options-panel');
  const rowC = document.getElementById('opt-c-row');
  const rowD = document.getElementById('opt-d-row');
  
  if (['MCQ', 'Assertion'].includes(type)) {
    optPanel.style.display = 'block';
    rowC.style.display = 'flex';
    rowD.style.display = 'flex';
  } else if (type === 'TrueFalse') {
    optPanel.style.display = 'block';
    rowC.style.display = 'none';
    rowD.style.display = 'none';
    
    // Auto-populate A & B
    document.getElementById('q-opt-a').value = 'True';
    document.getElementById('q-opt-b').value = 'False';
  } else {
    optPanel.style.display = 'none';
  }
}

function openQuestionSheet(index = null) {
  const modal = document.getElementById('question-modal-backdrop');
  const title = document.getElementById('sheet-title');
  const qForm = document.getElementById('question-form');
  
  qForm.reset();
  state.currentQuestion = index;
  
  if (index !== null) {
    title.textContent = 'Edit Question';
    const q = state.currentPaper.questions[index];
    
    document.getElementById('q-input-type').value = q.type;
    document.getElementById('q-input-text').value = q.question_text;
    document.getElementById('q-input-marks').value = q.marks || 1;
    
    toggleOptionsPanel(q.type);
    
    if (q.options && q.options.length) {
      document.getElementById('q-opt-a').value = q.options[0] || '';
      document.getElementById('q-opt-b').value = q.options[1] || '';
      document.getElementById('q-opt-c').value = q.options[2] || '';
      document.getElementById('q-opt-d').value = q.options[3] || '';
    }
  } else {
    title.textContent = 'Add Question';
    toggleOptionsPanel('MCQ');
  }
  
  modal.style.display = 'flex';
  document.getElementById('q-input-text').focus();
}

function closeQuestionSheet() {
  document.getElementById('question-modal-backdrop').style.display = 'none';
  state.currentQuestion = null;
}

// ── SYMBOL KEYBOARD CARET INJECTION ──
function insertSymbol(symbol) {
  const el = lastFocusedInput || document.getElementById('q-input-text');
  if (!el) return;
  
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;
  
  el.value = val.substring(0, start) + symbol + val.substring(end);
  el.selectionStart = el.selectionEnd = start + symbol.length;
  el.focus();
}

async function saveQuestionForm() {
  const type = document.getElementById('q-input-type').value;
  const text = document.getElementById('q-input-text').value.trim();
  const marks = parseFloat(document.getElementById('q-input-marks').value) || 1;
  
  let options = [];
  if (type === 'MCQ' || type === 'Assertion') {
    options = [
      document.getElementById('q-opt-a').value.trim(),
      document.getElementById('q-opt-b').value.trim(),
      document.getElementById('q-opt-c').value.trim(),
      document.getElementById('q-opt-d').value.trim()
    ].filter(o => o !== '');
  } else if (type === 'TrueFalse') {
    options = ['True', 'False'];
  }
  
  const qData = {
    type,
    question_text: text,
    marks,
    options,
    sequence: state.currentQuestion !== null ? state.currentPaper.questions[state.currentQuestion].sequence : state.currentPaper.questions.length + 1
  };
  
  if (state.currentQuestion !== null) {
    state.currentPaper.questions[state.currentQuestion] = qData;
  } else {
    state.currentPaper.questions.push(qData);
  }
  
  // Optimistically close modal
  closeQuestionSheet();
  
  // Re-render locally
  await syncPaperToServer();
}

async function deleteQuestion(idx) {
  if (!confirm('Are you sure you want to delete this question?')) return;
  state.currentPaper.questions.splice(idx, 1);
  
  // Re-sequence questions
  state.currentPaper.questions.forEach((q, i) => { q.sequence = i + 1; });
  
  await syncPaperToServer();
}
window.deleteQuestion = deleteQuestion;

async function duplicateQuestion(idx) {
  const orig = state.currentPaper.questions[idx];
  const copy = JSON.parse(JSON.stringify(orig));
  copy.sequence = state.currentPaper.questions.length + 1;
  
  state.currentPaper.questions.push(copy);
  await syncPaperToServer();
}
window.duplicateQuestion = duplicateQuestion;

function editQuestion(idx) {
  openQuestionSheet(idx);
}
window.editQuestion = editQuestion;

// ── SAVE & SUBMIT TO BACKEND ──
async function syncPaperToServer() {
  toast('Saving progress...', 'info');
  try {
    const payload = {
      questions: state.currentPaper.questions,
      sections: state.currentPaper.sections || []
    };
    
    await apiFetch(`/papers/${state.currentAssignment.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    toast('Draft saved to cloud!', 'success');
    await loadQuestions();
  } catch (err) {
    toast('Offline: Saved draft locally', 'warn');
  }
}

async function submitPaper() {
  if (!confirm('Submit paper for review? You will not be able to edit this draft once submitted.')) return;
  
  const submitBtn = document.getElementById('btn-submit-paper');
  submitBtn.disabled = true;
  
  try {
    await apiFetch(`/assignments/${state.currentAssignment.id}/submit`, {
      method: 'POST'
    });
    toast('Paper submitted successfully!', 'success');
    showView('papers');
  } catch (err) {
    toast(err.message || 'Could not submit paper', 'error');
    submitBtn.disabled = false;
  }
}

// ── AI GEMINI GENERATOR VIEWS ──
function setupAIEvents() {
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  document.getElementById('btn-generate-ai').addEventListener('click', triggerAIGenerator);
  document.getElementById('btn-close-ai-results').addEventListener('click', () => {
    document.getElementById('ai-results-panel').style.display = 'none';
  });
}

async function triggerAIGenerator() {
  const topic = document.getElementById('ai-prompt-topic').value.trim();
  if (!topic) {
    toast('Enter a topic for the AI', 'warn');
    return;
  }
  
  const type = document.querySelector('.btn-preset.active').dataset.type;
  const count = document.getElementById('ai-prompt-count').value;
  const genBtn = document.getElementById('btn-generate-ai');
  
  const origText = genBtn.innerHTML;
  genBtn.disabled = true;
  genBtn.innerHTML = '<div class="spinner"></div> <span>Claude Fable 5 is thinking...</span>';
  
  // Format prompt instructions matching backend prompt structure
  const prompt = `Generate ${count} school exam questions for ${state.currentAssignment ? state.currentAssignment.class_name : 'Class VIII'} students on the topic "${topic}". The question types must be strictly "${type}". Return a clean JSON array with fields: question_text, type, marks, options.`;
  
  try {
    const res = await apiFetch('/ai', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    });
    
    // Expecting array of questions
    const qList = res || [];
    state.aiQuestions = qList;
    
    renderAIResults(qList);
  } catch (err) {
    toast('AI generation failed. Try again.', 'error');
  } finally {
    genBtn.disabled = false;
    genBtn.innerHTML = origText;
  }
}

function renderAIResults(list) {
  const panel = document.getElementById('ai-results-panel');
  const container = document.getElementById('ai-results-container');
  
  if (list.length === 0) {
    panel.style.display = 'none';
    toast('No questions returned', 'warn');
    return;
  }
  
  container.innerHTML = list.map((q, idx) => `
    <div class="ai-q-card">
      <p style="font-weight:700; font-size:11px; color:var(--primary); margin-bottom:4px;">Suggestion ${idx + 1}</p>
      <p>${esc(q.question_text)}</p>
      <div class="ai-q-actions">
        <button class="btn-add-ai-q" onclick="addAIQuestion(${idx})">+ Add to Paper</button>
      </div>
    </div>
  `).join('');
  
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth' });
}

async function addAIQuestion(idx) {
  if (!state.currentAssignment) {
    toast('Select a paper in the Papers tab first', 'warn');
    return;
  }
  const isEditable = (state.currentAssignment.status === 'draft' || state.user.role === 'qp_admin');
  if (!isEditable) {
    toast('This paper is submitted and cannot be modified.', 'warn');
    return;
  }
  const q = state.aiQuestions[idx];
  
  // Add to local state paper list
  state.currentPaper.questions.push({
    type: q.type || 'MCQ',
    question_text: q.question_text,
    marks: q.marks || 1,
    options: q.options || [],
    sequence: state.currentPaper.questions.length + 1
  });
  
  // Sync
  await syncPaperToServer();
  toast('Added question to editor!', 'success');
}
window.addAIQuestion = addAIQuestion;

// ── SETTINGS VIEW ──
function loadSettings() {
  document.getElementById('settings-user-name').textContent = state.user.name || 'User';
  document.getElementById('settings-user-email').textContent = state.user.email || 'email@sdpublic.org';
  
  // Format initials
  const parts = (state.user.name || 'User').split(' ');
  const init = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('avatar-initials').textContent = init;
  
  document.getElementById('settings-api-base').textContent = API;
}
