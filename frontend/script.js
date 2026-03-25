const REQUIRED = ['f-age','f-edu','f-job','f-exp'];
let currentIssues = [];
let corrections   = {};
let pendingData   = null;
let startTime     = Date.now();

const EDU_MIN_AGE = { primary:6, middle:12, high_school:15, bachelor:18, master:22, phd:26 };
const EDU_LABEL   = { primary:'ابتدائي', middle:'متوسط', high_school:'ثانوي', bachelor:'بكالوريوس', master:'ماجستير', phd:'دكتوراه' };

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  if (id === 'form') {
    document.getElementById('s-form').classList.add('active');
    document.querySelectorAll('.nav-tab')[0].classList.add('active');
  } else if (id === 'log') {
    document.getElementById('s-log').classList.add('active');
    document.querySelectorAll('.nav-tab')[1].classList.add('active');
    renderLog();
  } else if (id === 'success') {
    document.getElementById('s-success').classList.add('active');
  }
}

function openOv(id)  { document.getElementById(id).classList.add('open'); }
function closeOv(id) { document.getElementById(id).classList.remove('open'); }

function onInput() {
  const filled = REQUIRED.filter(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  }).length;
  const pct = Math.round(filled / REQUIRED.length * 100);
  document.getElementById('progBar').style.width = pct + '%';
  document.getElementById('progText').textContent = filled + ' من ' + REQUIRED.length + ' حقول';
  document.getElementById('submitBtn').disabled = filled < REQUIRED.length;
}

function getFormData() {
  return {
    age:        parseInt(document.getElementById('f-age').value) || 0,
    education:  document.getElementById('f-edu').value,
    job:        document.getElementById('f-job').value.trim(),
    experience: parseInt(document.getElementById('f-exp').value) || 0,
    notes:      document.getElementById('f-notes').value.trim()
  };
}

function resetForm() {
  [...REQUIRED, 'f-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  onInput();
  startTime = Date.now();
}

function saveDraft() {
  localStorage.setItem('semantix_draft', JSON.stringify(getFormData()));
  alert('تم حفظ المسودة ✅');
}

function validate(d) {
  const issues = [];

  const workable = Math.max(0, d.age - 18);
  if (d.experience > workable + 2) {
    issues.push({
      type: 'logic', label: 'منطقي', emoji: '🔗',
      fields: 'العمر · سنوات الخبرة',
      text: `أدخلت عمراً يساوي <em>${d.age} سنة</em>، في حين أن سنوات الخبرة <em>${d.experience} سنة</em> تتجاوز ما يمكن تراكمه منذ سن ١٨. بناءً على مسمى وظيفتك «<em>${d.job}</em>»، يتوقع النظام أن تكون سنوات الخبرة بين <em>٠ و ${workable} سنة</em> كحد أقصى منطقي.`,
      confidence: 87, conf_color: 'orange',
      fix_field: 'f-exp',
      fix_label: 'سنوات الخبرة',
      current_val: d.experience,
      context: `بناءً على عمرك ${d.age} سنة، أقصى سنوات خبرة ممكنة هي ${workable} سنة.`,
      options: []
    });
  }

  const eduReqJobs = ['مهندس','محاسب','طبيب','محلل','مدير','مستشار','أستاذ','باحث','مبرمج','مطور'];
  const jobNeedsDegree = eduReqJobs.some(k => d.job.includes(k));
  if (jobNeedsDegree && ['primary','middle','high_school'].includes(d.education)) {
    issues.push({
      type: 'semantic', label: 'دلالي', emoji: '💬',
      fields: 'المستوى التعليمي · المهنة',
      text: `مسمى «<em>${d.job}</em>» يستلزم عادةً شهادة بكالوريوس على الأقل، في حين أن المستوى المُدخل «<em>${EDU_LABEL[d.education]}</em>» لا يتوافق مع هذا المسار المهني. هل أدخلت المستوى التعليمي بشكل صحيح؟`,
      confidence: 93, conf_color: 'purple',
      fix_field: 'f-edu',
      fix_label: 'المستوى التعليمي',
      current_val: EDU_LABEL[d.education],
      context: `بناءً على مسمى وظيفتك «${d.job}»، يقترح النظام المستويات التالية:`,
      options: [
        { value:'bachelor', label:'بكالوريوس', sub:'الأكثر تطابقاً مع مهنتك ٩٣٪', suggested:true, pct:'٩٣٪' },
        { value:'master',   label:'ماجستير',   sub:'متوافق مع مسمى "أول" في بعض الشركات', suggested:false, pct:'' },
        { value:'diploma',  label:'دبلوم عالٍ', sub:'ممكن في بعض الحالات العملية', suggested:false, pct:'' },
        { value:'manual',   label:'إدخال يدوي', sub:'أكتب قيمة مختلفة', suggested:false, pct:'', manual:true }
      ]
    });
  }

  const minAge = EDU_MIN_AGE[d.education];
  if (minAge && d.age < minAge) {
    issues.push({
      type: 'stat', label: 'إحصائي', emoji: '📊',
      fields: 'العمر · المستوى التعليمي',
      text: `عمرك <em>${d.age} سنة</em> لا يكفي للحصول على شهادة «<em>${EDU_LABEL[d.education]}</em>» — يحتاج هذا المستوى عمراً لا يقل عن <em>${minAge} سنة</em>.`,
      confidence: 91, conf_color: 'blue',
      fix_field: 'f-edu',
      fix_label: 'المستوى التعليمي',
      current_val: EDU_LABEL[d.education],
      context: `بناءً على عمرك ${d.age} سنة، المستوى التعليمي المتاح:`,
      options: [
        { value:'high_school', label:'ثانوي',     sub:'الأنسب لهذا العمر', suggested:true,  pct:'' },
        { value:'middle',      label:'متوسط',      sub:'إن كنت لا تزال تدرس', suggested:false, pct:'' }
      ]
    });
  }

  return { has_issues: issues.length > 0, issues };
}

async function submitForm() {
  pendingData   = getFormData();
  currentIssues = [];
  corrections   = {};

  document.getElementById('loading').classList.add('open');
  await new Promise(r => setTimeout(r, 700));

  let result;
  try {
    const resp = await fetch('http://127.0.0.1:5000/validate-response', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(pendingData),
      signal: AbortSignal.timeout(15000)
    });
    result = await resp.json();
    console.log('SOURCE:', result.source, 'LLM_ERROR:', result.llm_error || '');
  } catch (err) {
    document.getElementById('loading').classList.remove('open');
    alert('تعذر الاتصال بالخادم. تأكد من تشغيل app.py');
    return;
  }

  document.getElementById('loading').classList.remove('open');

  if (result.llm_error) {
    console.warn('LLM_ERROR:', result.llm_error);
  }

  if (result.has_issues) {
    currentIssues = result.issues || [];
    showValModal(currentIssues);
  } else {
    finalize('clean');
  }
}

function showValModal(issues) {
  const types = [...new Set(issues.map(i => i.type))];
  const tagMap = { logic:'منطقية 🔗 . Logical', semantic:'دلالية 💬 . Semantic', stat:'إحصائية 📊 . Statistical' };
  document.getElementById('typeTags').innerHTML = types.map(t =>
    `<span class="type-tag ${t}">${tagMap[t] || t}</span>`
  ).join('');

  const cols = document.getElementById('issuesCols');
  cols.className = 'issues-cols' + (issues.length === 1 ? ' single' : '');
  cols.innerHTML = issues.map((iss, i) => {
    const confBar = `<div class="conf-bg"><div class="conf-bar" style="width:${iss.confidence}%;background:${iss.type==='logic'?'var(--orange)':iss.type==='semantic'?'var(--purple)':'#0369a1'}"></div></div>`;
    return `
      <div class="issue-card ${iss.type}">
        <div class="issue-card-tag ${iss.type}">${iss.emoji} ${iss.label}</div>
        <div class="issue-fields-label">الحقلان: ${iss.fields}</div>
        <div class="issue-text ${iss.type}-color">${iss.text}</div>
        <hr class="issue-divider">
        <div class="conf-row">
          <span class="conf-label">درجة الثقة</span>
          ${confBar}
          <span class="conf-pct ${iss.conf_color}">${iss.confidence}٪</span>
        </div>
      </div>
    `;
  }).join('');

  openOv('ov-val');
}

function ignoreAndSend() {
  closeOv('ov-val');
  finalize('ignored');
}

function goToCorrection() {
  closeOv('ov-val');
  buildCorrectionScreen();
  openOv('ov-corr');
}

function buildCorrectionScreen() {
  const fixable = currentIssues.filter(i => i.fix_field);
  document.getElementById('corrCount').textContent = fixable.length + ' من الحقول تحتاج تصحيحاً';

  document.getElementById('corrFields').innerHTML = fixable.map((iss, idx) => {
    const optsHTML = iss.options && iss.options.length > 0 ? `
      <div class="opts-grid">
        ${iss.options.map((opt, oi) => opt.manual ? `
          <div class="opt-card" id="opt-${idx}-${oi}">
            <div class="opt-label">إدخال يدوي</div>
            <div class="opt-sub">أكتب قيمة مختلفة</div>
            ${iss.fix_field === 'f-edu'
              ? `<select oninput="corrections['${iss.fix_field}']=this.value">
                   <option value="">اختر...</option>
                   <option value="primary">ابتدائي</option>
                   <option value="middle">متوسط</option>
                   <option value="high_school">ثانوي</option>
                   <option value="bachelor">بكالوريوس</option>
                   <option value="master">ماجستير</option>
                   <option value="phd">دكتوراه</option>
                 </select>`
              : `<input type="text" placeholder="اكتب قيمة مختلفة" oninput="corrections['${iss.fix_field}']=this.value">`}
          </div>
        ` : `
          <div class="opt-card ${opt.suggested?'chosen':''}" id="opt-${idx}-${oi}"
               onclick="pickOpt('${iss.fix_field}','${opt.value}',${idx},${oi})">
            ${opt.suggested ? '<div class="opt-badge">♦ مقترح</div>' : ''}
            ${opt.pct ? `<span class="opt-pct">${opt.pct}</span>` : ''}
            <div class="opt-label">${opt.label}</div>
            <div class="opt-sub">${opt.sub}</div>
          </div>
        `).join('')}
      </div>
    ` : '<p style="font-size:13px;color:var(--slate-500)">يرجى تعديل القيمة يدوياً في حقل الاستمارة.</p>';

    const suggested = iss.options.find(o => o.suggested && !o.manual);
    if (suggested) corrections[iss.fix_field] = suggested.value;

    return `
      <div class="corr-field-card">
        <div class="corr-field-head">
          <div class="corr-field-info">
            <span class="corr-field-icon">${iss.type==='semantic'?'🎓':iss.type==='logic'?'📅':'📊'}</span>
            <div>
              <div class="corr-field-name">${iss.fix_label}</div>
              <div class="corr-field-val">القيمة الحالية: ${iss.current_val}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="type-tag ${iss.type}" style="font-size:10px;padding:3px 8px">تعارض ${iss.label}</span>
            <button class="corr-expand-btn">▾</button>
          </div>
        </div>
        <div class="corr-field-body">
          <div class="corr-context">${iss.context} <strong>${iss.fix_label === 'سنوات الخبرة' ? '' : ''}</strong></div>
          ${optsHTML}
        </div>
      </div>
    `;
  }).join('');
}

function pickOpt(field, value, issIdx, optIdx) {
  document.querySelectorAll(`[id^="opt-${issIdx}-"]`).forEach(el => el.classList.remove('chosen'));
  document.getElementById(`opt-${issIdx}-${optIdx}`).classList.add('chosen');
  corrections[field] = value;
}

function saveCorrections() {
  alert('تم حفظ التصحيحات ✅');
}

async function confirmAndRecheck() {
  Object.entries(corrections).forEach(([field, value]) => {
    const el = document.getElementById(field);
    if (el) el.value = value;
  });
  closeOv('ov-corr');

  document.getElementById('loading').classList.add('open');
  await new Promise(r => setTimeout(r, 800));

  const newData   = getFormData();
  const newResult = validate(newData);
  document.getElementById('loading').classList.remove('open');

  if (newResult.has_issues) {
    currentIssues = newResult.issues;
    showValModal(newResult.issues);
  } else {
    finalize('corrected');
  }
}

async function finalize(action) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  const corrCount = Object.keys(corrections).length;

  const statusMap = { clean: 'مقبول', corrected: 'مُصحَّح', ignored: 'مرفوض' };
  const payload = {
    action,
    data:        getFormData(),
    issues:      currentIssues,
    corrections: { ...corrections },
  };

  let serverRef = null;
  try {
    const resp = await fetch('http://localhost:5000/submit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(4000),
    });
    if (resp.ok) {
      const result = await resp.json();
      serverRef = result.ref;   // رقم المرجع من الخادم
    }
  } catch (err) {
    console.warn('Backend /submit unreachable, saving locally only.', err);
  }

  const ref = serverRef || ('SE-2025-' + String(Math.floor(Math.random() * 9000) + 1000).padStart(6, '0'));

  document.getElementById('ss-corr').textContent = corrCount;
  document.getElementById('ss-time').textContent = mins + ':' + secs;
  document.getElementById('successRef').textContent = ref;

  const entry = {
    ref,
    ts:                  new Date().toLocaleString('ar-SA'),
    data:                getFormData(),
    issues:              currentIssues,
    corrections_applied: { ...corrections },
    action,
    status:              statusMap[action] || 'مقبول',
    _from_server:        serverRef !== null,  // علامة تُشير إلى مصدر السجل
  };
  const log = JSON.parse(localStorage.getItem('semantix_log') || '[]');
  log.unshift(entry);
  localStorage.setItem('semantix_log', JSON.stringify(log));

  goTo('success');
  resetForm();
}

function downloadPDF() {
  const btn = document.querySelector('[onclick="downloadPDF()"]');
  if (btn) { btn.textContent = '⏳ جاري التحميل...'; btn.disabled = true; }

  fetch('http://localhost:5000/export-pdf')
    .then(res => {
      if (!res.ok) throw new Error('فشل الاتصال بالخادم');
      return res.blob();
    })
    .then(blob => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = 'decision_log.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      alert('تعذّر تنزيل PDF — تأكد من تشغيل الخادم\n' + err.message);
    })
    .finally(() => {
      if (btn) { btn.textContent = '↓ تنزيل نسخة PDF'; btn.disabled = false; }
    });
}

const DEMO_ROWS = [];

function renderLog() {
  const stored    = JSON.parse(localStorage.getItem('semantix_log') || '[]');
  const search    = (document.getElementById('filterSearch')?.value || '').toLowerCase();
  const statusF   = document.getElementById('filterStatus')?.value || '';
  const typeF     = document.getElementById('filterType')?.value || '';

  const allRows = [
    ...stored.map(e => ({
      ref: e.ref, ts: e.ts,
      types: [...new Set((e.issues||[]).map(i=>i.type))],
      fields: (e.issues||[])[0]?.fields_label || (e.issues||[])[0]?.fields || '—',
      conf: e.issues?.length ? e.issues[0].confidence : 100,
      action: e.action === 'clean' ? 'لا يوجد تعارض' : e.action === 'corrected' ? 'قَبِل الاقتراح' : 'رفض التصحيح',
      status: e.status,
      deletable: true,   // فقط السجلات الحقيقية قابلة للحذف
    })),
    ...DEMO_ROWS.map(r => ({ ...r, deletable: false })),
  ];

  const filtered = allRows.filter(r => {
    if (search    && !r.ref.toLowerCase().includes(search)) return false;
    if (statusF   && r.status !== statusF) return false;
    if (typeF     && !r.types.includes(typeF)) return false;
    return true;
  });

  document.getElementById('st-total').textContent   = String(1340 + stored.length);
  document.getElementById('st-issues').textContent  = String(230  + stored.filter(e=>e.issues?.length>0).length);

  const pillMap   = { 'مقبول':'pill-green','مُصحَّح':'pill-blue','مرفوض':'pill-red','معلّق':'pill-orange' };
  const dotMap    = { logic:'tdot-l', semantic:'tdot-s', stat:'tdot-t' };
  const confColor = c => c>=85?'var(--green)':c>=70?'var(--orange)':'var(--red)';

  if (!filtered.length) {
    document.getElementById('logBody').innerHTML = `<div class="empty-state"><div class="ico">📋</div><p>لا توجد سجلات تطابق البحث</p></div>`;
    document.getElementById('logCount').textContent = 'لا توجد نتائج';
    return;
  }

  const rows = filtered.map(r => `
    <tr>
      <td><code>${r.ref}</code></td>
      <td style="font-size:11px;color:var(--slate-500)">${r.ts}</td>
      <td>
        <div class="tdots">
          ${r.types.map(t=>`<span class="tdot ${dotMap[t]||''}"></span>`).join('')}
          <span style="font-size:11px;color:var(--slate-700);margin-right:4px">
            ${r.types.length ? r.types.map(t=>t==='logic'?'منطقي':t==='semantic'?'دلالي':'إحصائي').join(' · ') : 'لا يوجد'}
          </span>
        </div>
      </td>
      <td style="font-size:11px">${r.fields}</td>
      <td>
        <div class="mini-conf">
          <div class="mini-bg"><div class="mini-fill" style="width:${r.conf}%;background:${confColor(r.conf)}"></div></div>
          <span class="mini-pct" style="color:${confColor(r.conf)}">${r.conf}٪</span>
        </div>
      </td>
      <td style="font-size:12px">${r.action}</td>
      <td><span class="pill ${pillMap[r.status]||'pill-orange'}">${r.status==='مقبول'?'✓ ':r.status==='مُصحَّح'?'✎ ':r.status==='مرفوض'?'✕ ':'⏳ '}${r.status}</span></td>
      <td style="text-align:center">
        ${r.deletable
          ? `<button
               onclick="deleteRecord('${r.ref}')"
               title="حذف هذا السجل"
               style="background:none;border:1px solid var(--red,#ef4444);color:var(--red,#ef4444);
                      border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer;
                      transition:background .15s,color .15s"
               onmouseover="this.style.background='var(--red,#ef4444)';this.style.color='#fff'"
               onmouseout="this.style.background='none';this.style.color='var(--red,#ef4444)'">
               ✕ حذف
             </button>`
          : '<span style="font-size:11px;color:var(--slate-400)">—</span>'
        }
      </td>
    </tr>
  `).join('');

  document.getElementById('logBody').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>رقم المرجع</th>
          <th>تاريخ الإرسال</th>
          <th>نوع التعارض</th>
          <th>الحقول المتأثرة</th>
          <th>درجة الثقة</th>
          <th>إجراء المستخدم</th>
          <th>الحالة النهائية</th>
          <th style="text-align:center">إجراءات</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  document.getElementById('logCount').textContent = `عرض ${filtered.length} من أصل ${filtered.length + 1242} سجلاً`;
}

async function deleteRecord(ref) {
  if (!confirm(`هل أنت متأكد من حذف السجل\n${ref}؟\nلا يمكن التراجع عن هذه العملية.`)) return;

  let serverOk = false;
  try {
    const resp = await fetch(`http://localhost:5000/decision-log/${encodeURIComponent(ref)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000),
    });

    if (resp.ok) {
      serverOk = true;
    } else if (resp.status === 404) {
      const body = await resp.json().catch(() => ({}));
      const msg  = body.error || 'لم يُعثر على السجل في قاعدة البيانات';
      console.warn(`Backend delete 404 for ${ref}: ${msg}`);
    } else {
      const body = await resp.json().catch(() => ({}));
      alert(`فشل الحذف من الخادم: ${body.error || resp.statusText}`);
      return;
    }
  } catch (err) {
    console.warn('Backend DELETE unreachable, removing locally only.', err);
  }

  const log     = JSON.parse(localStorage.getItem('semantix_log') || '[]');
  const before  = log.length;
  const updated = log.filter(e => e.ref !== ref);

  if (updated.length === before && !serverOk) {
    alert(`لم يُعثر على السجل «${ref}».\nتأكد من صحة رقم المرجع.`);
    return;
  }

  localStorage.setItem('semantix_log', JSON.stringify(updated));

  renderLog();

  _showToast(`تم حذف السجل ${ref} بنجاح ✓`);
}

function _showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = [
    'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
    'background:#1e293b', 'color:#fff', 'padding:10px 22px',
    'border-radius:8px', 'font-size:13px', 'z-index:9999',
    'box-shadow:0 4px 16px rgba(0,0,0,.25)', 'pointer-events:none',
    'transition:opacity .3s',
  ].join(';');
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

function exportCSV() {

  const EXPORT_URL = 'http://localhost:5000/export-csv';

  fetch(EXPORT_URL, { method: 'GET' })
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`فشل الاتصال بالخادم (${resp.status})`);
      }
      return resp.blob();
    })
    .then(blob => {
      const fileName = 'decision_log.csv';

      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 200);
    })
    .catch(err => {
      console.warn('export-csv endpoint unreachable, falling back to in-memory export.', err);
      _exportFromMemory();
    });
}

function _exportFromMemory() {
  const headers = [
    'reference_number','submission_date','submission_time',
    'conflict_type','affected_fields','confidence_score',
    'user_action','final_status'
  ];

  const tableRows = document.querySelectorAll('#logTable tbody tr');
  const rows = [headers.join(',')];

  tableRows.forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => {
      const val = td.textContent.trim().replace(/"/g, '""');
      return `"${val}"`;
    });
    if (cells.length) rows.push(cells.join(','));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n'); // BOM للتوافق مع Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = 'decision_log.csv';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(link); }, 200);
}

onInput();
