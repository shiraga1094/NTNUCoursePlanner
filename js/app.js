/* ===== State ===== */
let courses = [];
let denseMap = {};
let savedCourses = [];     // 加入清單（右側）
let selectedCourses = [];  // 真正選課（會進課表）
let currentTerm = "";      // 當前學期 (如 "113-1")
let availableTerms = [];   // 可用學期列表

let activePage = "P1";
let activeDept = "";
let page = 1;
const PAGE_SIZE = 20;
// slot picker state: set of keys like '一-03'
let selectedSlotKeys = new Set();
let strictSlotSearch = true; // 嚴格模式：課程必須完全位於所選範圍
let _slotDragging = false;
let _slotDragAdd = true;
let _slotMouseDownKey = null;

/* ===== Time parsing ===== */
const SLOT_TABLE = [
  { code: "00", s:710, e:800 },
  { code: "01", s:810, e:900 },
  { code: "02", s:910, e:1000 },
  { code: "03", s:1020, e:1110 },
  { code: "04", s:1120, e:1210 },
  { code: "05", s:1220, e:1310 },
  { code: "06", s:1320, e:1410 },
  { code: "07", s:1420, e:1510 },
  { code: "08", s:1530, e:1620 },
  { code: "09", s:1630, e:1720 },
  { code: "10", s:1730, e:1820 },
  { code: "A",  s:1840, e:1930 },
  { code: "B",  s:1935, e:2025 },
  { code: "C",  s:2030, e:2120 },
  { code: "D",  s:2125, e:2215 },
];

/* ===== General core mapping (frontend) ===== */
const CORE_MAP = {
  "A1UG": "人文藝術",
  "A2UG": "社會科學",
  "A3UG": "自然科學",
  "A4UG": "邏輯運算",
  "B1UG": "學院共同課程",
  "B2UG": "跨域專業探索課程",
  "B3UG": "大學入門",
  "C1UG": "專題探究",
  "C2UG": "MOOCs"
};

function mapCoreLabel(raw){
  if (!raw) return "";
  // raw may be like "A1UG" or "A1UG/A2UG" or already human text
  const parts = String(raw).split(/[\/,]+/).map(s=>s.trim()).filter(Boolean);
  const mapped = parts.map(p => CORE_MAP[p] || p);
  // remove duplicates while preserving order
  return Array.from(new Set(mapped)).join(" / ");
}

function parseSlot(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return "未排定";
  // ex: "四 8-9 公館 Ｓ101"
  let m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let start = m[2];
    let end = m[3];
    if (/^\d+$/.test(start)) start = start.padStart(2,'0');
    if (/^\d+$/.test(end)) end = end.padStart(2,'0');
    return `星期${day} 第 ${start}-${end} 節`;
  }
  // fallback
  return timeRaw;
}

function parseTimeToSchedule(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return null;
  // ex: "四 8-9 公館 Ｓ101"
  let m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let startSlot = m[2];
    let endSlot = m[3];
    if (/^\d+$/.test(startSlot)) startSlot = startSlot.padStart(2,'0');
    if (/^\d+$/.test(endSlot)) endSlot = endSlot.padStart(2,'0');

    const all = SLOT_TABLE.map(s => s.code);
    const si = all.indexOf(startSlot);
    const ei = all.indexOf(endSlot);
    if (si === -1 || ei === -1) return null;
    const slots = [];
    for (let i = si; i <= ei; i++) slots.push(all[i]);
    return { day, slots };
  }
  return null;
}

function parseLocation(timeRaw){
  if (!timeRaw || timeRaw.trim() === "") return "";
  // match trailing text after the time range, e.g. "四 8-9 公館 Ｓ101" -> "公館 Ｓ101"
  const m = timeRaw.match(/([一二三四五六日])\s*(?:\d{1,2}|[A-D])\s*[-－]\s*(?:\d{1,2}|[A-D])\s*(.+)/);
  if (m && m[2]) return m[2].trim();
  return "";
}

// derive a place key by removing classroom / room identifiers
function placeKey(locationRaw){
  if (!locationRaw) return "";
  const parts = String(locationRaw).split(/[\s,、·]+/).map(p=>p.trim()).filter(Boolean);
  const keep = [];
  for (const original of parts){
    let t = original;
    // remove parenthetical content and common room/level suffixes
    t = t.replace(/\(.*?\)|（.*?）/g, '').replace(/(教室|室|號樓|樓|號|樓層)/g, '').trim();
    // remove trailing ascii/alphanumeric room numbers like S101 or 101
    t = t.replace(/[A-Za-zＡ-Ｚａ-ｚ0-9０-９\-]+$/,'').trim();
    // if what's left contains CJK (likely building/branch), keep it
    if (/[\p{Script=Han}\u3040-\u30ff]/u.test(t)){
      keep.push(t);
      continue;
    }
    // special-case: if original contains '分部' or '分校' glued with digits, extract the '...分部' substring
    const m = original.match(/([\p{Script=Han}\u3040-\u30ff]*分(?:部|校|區)[\p{Script=Han}\u3040-\u30ff]*)/u);
    if (m) { keep.push(m[1]); continue; }
  }
  const unique = Array.from(new Set(keep.filter(Boolean)));
  const key = unique.join(' ').replace(/\s+/g,' ').trim();
  // Map to allowed site names only: 公館分部 or 和平本部
  const raw = (key || locationRaw || "").toString();
  if (/公館/.test(raw)) return '公館分部';
  if (/和平|本部/.test(raw)) return '和平本部';
  // no match -> return empty so it's not listed
  return "";
}

function dayIndex(d){
  return ["一","二","三","四","五","六","日"].indexOf(d);
}
function slotIndex(code){
  return SLOT_TABLE.map(s=>s.code).indexOf(code);
}

/* ===== Data normalize (courses.json -> our view model) ===== */
function normalizeCourse(raw){
  let courseName = (raw.chn_name || "").replaceAll("</br>", " ").replaceAll("<br>", " ");
  let programs = [];
  
  // Extract credit programs from course name
  // Pattern: [ 學分學程：program1 program2 ... ]
  const programMatch = courseName.match(/\[\s*學分學程[：:](.*?)\]/i);
  if (programMatch) {
    const programText = programMatch[1].trim();
    // Split by spaces and filter empty strings
    programs = programText.split(/\s+/).filter(Boolean);
    // Remove the program section from course name
    courseName = courseName.replace(/\s*\[\s*學分學程[：:].*?\]\s*/i, "").trim();
  }
  
  return {
    code: raw.course_code || "",
    name: courseName,
    teacher: raw.teacher || "",
    dept: raw.dept_chiabbr || raw.dept_code || "",
    credit: Number(raw.credit || 0),
    time: raw.time_inf || "",
    location: parseLocation(raw.time_inf) || "",
    group: raw.course_group || "",       // A/B/...
    core: mapCoreLabel(raw.generalCore) || "",         // 通識向度（若沒有也OK）
    restrict: raw.restrict || "",
    programs: programs,  // 學分學程列表
    engTeach: raw.eng_teach === "是",  // 英文授課
    __raw: raw
  };
}

function denseKey(course){
  // dense.json 的 key 看起來是 `${course_code}-${course_group}`，沒組就會是 "XXXX-"
  return `${course.code}-${course.group || ""}`;
}

/* ===== Dept category helpers ===== */
function deptMatchesCategory(dept, cat){
  if (!dept) return false;
  const d = String(dept);
  if (cat === 'COMMON') return /共同/.test(d);
  if (cat === 'SPORTS') return /體育/.test(d);
  if (cat === 'DEFENSE') return /國防/.test(d);
  if (cat === 'EXCHANGE') return /校際/.test(d);
  return false;
}

/* ===== Storage ===== */
function saveToStorage(){
  if (!currentTerm) return;
  const key = `savedCourses_${currentTerm}`;
  const key2 = `selectedCourses_${currentTerm}`;
  localStorage.setItem(key, JSON.stringify(savedCourses));
  localStorage.setItem(key2, JSON.stringify(selectedCourses));
  // 記住最後選擇的學期
  localStorage.setItem("lastTerm", currentTerm);
}
function loadFromStorage(){
  if (!currentTerm) return;
  const key = `savedCourses_${currentTerm}`;
  const key2 = `selectedCourses_${currentTerm}`;
  try { savedCourses = JSON.parse(localStorage.getItem(key) || "[]"); } catch { savedCourses=[]; }
  try { selectedCourses = JSON.parse(localStorage.getItem(key2) || "[]"); } catch { selectedCourses=[]; }
}

/* ===== UI helpers ===== */
const $ = (id)=>document.getElementById(id);
function setActivePage(p){
  activePage = p;
  $("pageP1").classList.toggle("active", p==="P1");
  $("pageP2").classList.toggle("active", p==="P2");
  $("btnP1").classList.toggle("btn-primary", p==="P1");
  $("btnP2").classList.toggle("btn-primary", p==="P2");

  closeConflictNotice();
  renderAll();
}

function openModal(title, html){
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html || "<div class='tiny'>無資料</div>";
  $("modal").classList.remove("hidden");
}
function closeModal(){
  $("modal").classList.add("hidden");
  $("modalBody").innerHTML = "";
}

/* ===== Theme helpers ===== */
function applyTheme(theme){
  if (theme === 'light') document.body.classList.add('light');
  else document.body.classList.remove('light');
  // update toggle icon if present
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}
function toggleTheme(){
  const isLight = document.body.classList.toggle('light');
  const theme = isLight ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

function showConflictNotice(msg){
  $("conflictMessage").textContent = msg;
  $("conflictNotice").classList.remove("hidden");
  // 5 秒後自動關閉
  window.clearTimeout(showConflictNotice._t);
  showConflictNotice._t = window.setTimeout(()=>closeConflictNotice(), 5000);
}
function closeConflictNotice(){
  $("conflictNotice").classList.add("hidden");
  // 清衝突樣式（只在 P2 用得到）
  document.querySelectorAll(".slotcell.has-conflict").forEach(c=>c.classList.remove("has-conflict"));
  document.querySelectorAll(".coursepill.conflict").forEach(c=>c.classList.remove("conflict"));
}

/* ===== Selection logic ===== */
function isSaved(key){
  return savedCourses.some(c=>denseKey(c) === key);
}
function isSelected(key){
  return selectedCourses.some(c=>denseKey(c) === key);
}
function addToSaved(course){
  const key = denseKey(course);
  if (isSaved(key)) return;
  savedCourses.push(course);
  saveToStorage();
  renderAll();
}
function removeSaved(key){
  savedCourses = savedCourses.filter(c=>denseKey(c) !== key);
  selectedCourses = selectedCourses.filter(c=>denseKey(c) !== key);
  saveToStorage();
  renderAll();
}

function checkNewCourseConflict(newCourse){
  const newInfo = parseTimeToSchedule(newCourse.time);
  if (!newInfo) return [];
  const conflicts = [];
  for (const ex of selectedCourses){
    const exInfo = parseTimeToSchedule(ex.time);
    if (!exInfo) continue;
    if (newInfo.day !== exInfo.day) continue;
    const overlap = newInfo.slots.some(s => exInfo.slots.includes(s));
    if (overlap) conflicts.push(ex);
  }
  return conflicts;
}

function toggleSelected(key){
  const course = savedCourses.find(c=>denseKey(c)===key);
  if (!course) return;

  if (isSelected(key)){
    selectedCourses = selectedCourses.filter(c=>denseKey(c)!==key);
    saveToStorage();
    closeConflictNotice();
    renderAll();
    return;
  }

  const conflicts = checkNewCourseConflict(course);
  if (conflicts.length){
    const names = conflicts.map(c=>c.name).join("、");
    showConflictNotice(`無法選課！此課程與「${names}」時間衝突，請先取消衝突課程。`);
    if (activePage === "P2") highlightConflicts(conflicts);
    return;
  }

  selectedCourses.push(course);
  saveToStorage();
  closeConflictNotice();
  renderAll();
}

function clearAll(){
  savedCourses = [];
  selectedCourses = [];
  saveToStorage();
  closeConflictNotice();
  renderAll();
}
function resetAll(){
  if (!currentTerm) return;
  localStorage.removeItem(`savedCourses_${currentTerm}`);
  localStorage.removeItem(`selectedCourses_${currentTerm}`);
  savedCourses = [];
  selectedCourses = [];
  closeConflictNotice();
  renderAll();
}

/* ===== P1 filtering & rendering ===== */
function getFilteredCourses(strictOverride){
  const kw = $("searchInput").value.trim().toLowerCase();
  const dept = $("filterDept").value || activeDept || "";
  const core = $("filterCore").value;
  const day = $("filterDay").value;
  const loc = $("filterLocation") ? $("filterLocation").value || "" : "";
  const mode = $("filterMode").value;

  return courses.filter(c=>{
    // dept can be a special category code (prefixed with __) or an exact dept name
    if (dept){
      if (dept.startsWith("__")){
        // special categories: __COMMON__, __SPORTS__, __DEFENSE__, __EXCHANGE__
        if (dept === "__COMMON__" && !deptMatchesCategory(c.dept, 'COMMON')) return false;
        if (dept === "__SPORTS__" && !deptMatchesCategory(c.dept, 'SPORTS')) return false;
        if (dept === "__DEFENSE__" && !deptMatchesCategory(c.dept, 'DEFENSE')) return false;
        if (dept === "__EXCHANGE__" && !deptMatchesCategory(c.dept, 'EXCHANGE')) return false;
        // program filter: __PROGRAM__xxx
        if (dept.startsWith("__PROGRAM__")) {
          const programName = dept.replace("__PROGRAM__", "");
          if (!c.programs || !c.programs.includes(programName)) return false;
        }
      } else {
        if (c.dept !== dept) return false;
      }
    }
    // location filter: match normalized placeKey (exclude classroom parts)
    if (loc){
      const pk = placeKey(c.location || "").toLowerCase();
      if (pk !== loc.toLowerCase()) return false;
    }
    if (core && c.core !== core) return false;
    if (day && !(c.time || "").includes(day)) return false;

    if (kw){
      const hay = `${c.name} ${c.code} ${c.teacher} ${c.dept}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    const k = denseKey(c);
    if (mode === "saved" && !isSaved(k)) return false;
    if (mode === "selected" && !isSelected(k)) return false;

    // slot picker filtering
    if (selectedSlotKeys.size > 0){
      const info = parseTimeToSchedule(c.time);
      if (!info) return false;
      const courseKeys = (info.slots || []).map(s => `${info.day}-${s}`);
      if (courseKeys.length === 0) return false;
      const effectiveStrict = (typeof strictOverride !== 'undefined') ? strictOverride : strictSlotSearch;
      if (effectiveStrict){
        // all course slots must be within selected set
        const ok = courseKeys.every(k2 => selectedSlotKeys.has(k2));
        if (!ok) return false;
      } else {
        // at least one overlap
        const ok = courseKeys.some(k2 => selectedSlotKeys.has(k2));
        if (!ok) return false;
      }
    }

    return true;
  });
}

function renderDeptSidebar(){
  const el = $("deptList");
  if (!el) return; // sidebar removed from HTML — nothing to render
  el.innerHTML = "";

  const depts = Array.from(new Set(courses.map(c=>c.dept).filter(Boolean))).sort();
  for (const d of depts){
    const item = document.createElement("div");
    item.className = "item" + ((activeDept===d) ? " active" : "");
    item.textContent = d;
    item.onclick = ()=>{
      activeDept = (activeDept===d) ? "" : d;
      $("filterDept").value = activeDept;
      page = 1;
      renderP1();
    };
    el.appendChild(item);
  }
}

function renderDeptSelect(){
  const sel = $("filterDept");
  const depts = Array.from(new Set(courses.map(c=>c.dept).filter(Boolean))).sort();
  // Build select with special category options first, then individual departments
  let html = `<option value=\"\">所有系所</option>`;

  // Special categories (only add if there are matching depts)
  const specials = [
    { val: '__COMMON__', label: '共同' , match: d=>deptMatchesCategory(d,'COMMON') },
    { val: '__SPORTS__', label: '體育' , match: d=>deptMatchesCategory(d,'SPORTS') },
    { val: '__DEFENSE__', label: '國防' , match: d=>deptMatchesCategory(d,'DEFENSE') },
    { val: '__EXCHANGE__', label: '校際' , match: d=>deptMatchesCategory(d,'EXCHANGE') }
  ];

  for (const s of specials){
    if (depts.some(s.match)) html += `<option value="${s.val}">${s.label}</option>`;
  }

  // Collect all unique programs (學分學程)
  const allPrograms = new Set();
  courses.forEach(c => {
    if (c.programs && c.programs.length) {
      c.programs.forEach(p => allPrograms.add(p));
    }
  });
  
  // Add program options
  if (allPrograms.size > 0) {
    const sortedPrograms = Array.from(allPrograms).sort();
    sortedPrograms.forEach(p => {
      html += `<option value="__PROGRAM__${escapeHtml(p)}">${escapeHtml(p)}</option>`;
    });
  }

  html += depts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  sel.innerHTML = html;
  if (activeDept) sel.value = activeDept;
}

function renderLocationSelect(){
  const sel = $("filterLocation");
  if (!sel) return;
  // Only allow these two canonical locations
  const allowed = ['公館分部','和平本部'];
  const prev = sel.value || "";
  sel.innerHTML = `<option value="">所有地點</option>` + allowed.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  if (prev) sel.value = prev;
}

function renderCoreSelect(){
  const sel = $("filterCore");
  const cores = Array.from(new Set(courses.map(c=>c.core).filter(Boolean))).sort();
  sel.innerHTML = `<option value=\"\">通識領域（若無可忽略）</option>` + cores.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
}

function renderResults(){
  const list = getFilteredCourses();
  $("p1Count").textContent = String(list.length);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(page, totalPages);

  const start = (page-1)*PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);

  $("pageInfo").textContent = `${page} / ${totalPages}`;
  $("prevPage").disabled = (page<=1);
  $("nextPage").disabled = (page>=totalPages);

  const wrap = $("resultList");
  wrap.innerHTML = "";
  if (!slice.length){
    wrap.innerHTML = `<div class="tiny">查無符合的課程</div>`;
    return;
  }

  for (const c of slice){
    const card = document.createElement("div");
    const key = denseKey(c);
    card.className = "card" + (isSaved(key) ? " added" : "");

    const timeText = parseSlot(c.time);
    const tags = [
      c.dept ? `<span class="tag">${escapeHtml(c.dept)}</span>` : "",
      `<span class="tag">📚 ${c.credit} 學分</span>`,
      c.core ? `<span class="tag">🧭 ${escapeHtml(c.core)}</span>` : "",
      timeText ? `<span class="tag">🕒 ${escapeHtml(timeText)}</span>` : "",
      c.location ? `<span class="tag">🏫 ${escapeHtml(c.location)}</span>` : "",
      c.engTeach ? `<span class="tag eng-tag">🌐 英文授課</span>` : "",
      ...(c.programs || []).map(p => `<span class="tag program-tag">🎓 ${escapeHtml(p)}</span>`)
    ].filter(Boolean).join("");

    card.innerHTML = `
      <div class="title">${escapeHtml(c.name)} <span class="small">(${escapeHtml(c.code)}${c.group?`-${escapeHtml(c.group)}`:""})</span></div>
      <div class="meta">${tags}</div>
      <div class="small">老師：${escapeHtml(c.teacher || "—")}</div>
      ${c.restrict ? `<div class="small">限修：${escapeHtml(c.restrict)}</div>` : ""}
      <div class="actions">
        <button class="btn btn-sm">${isSaved(key) ? "移出清單" : "加入清單"}</button>
        <button class="btn btn-sm btn-primary">${isSelected(key) ? "取消選課" : "選課"}</button>
        <button class="btn btn-sm">詳細</button>
      </div>
    `;

    const [btnSave, btnSelect, btnDense] = card.querySelectorAll("button");
    btnSave.onclick = (e)=>{
      e.stopPropagation();
      const key = denseKey(c);
      if (isSaved(key)) removeSaved(key);
      else addToSaved(c);
    };
    btnSelect.onclick = (e)=>{
      e.stopPropagation();
      if (!isSaved(denseKey(c))) addToSaved(c);
      toggleSelected(denseKey(c));
    };
    btnDense.onclick = (e)=>{
      e.stopPropagation();
      // Open syllabus page for this course in a new tab
      const raw = c.__raw || {};
      const year = raw.acadm_year || "";
      const term = raw.acadm_term || "";
      const courseCode = raw.course_code || c.code || "";
      const courseGroup = raw.course_group || c.group || "";
      const deptCode = raw.dept_code || raw.dept_chiabbr || "";
      const base = 'https://courseap2.itc.ntnu.edu.tw/acadmOpenCourse/SyllabusCtrl';
      const params = new URLSearchParams({
        year: String(year),
        term: String(term),
        courseCode: String(courseCode),
        courseGroup: String(courseGroup),
        deptCode: String(deptCode),
        formS: String(raw.form_s || raw.form_s_name || ''),
        classes1: String(raw.classes || raw.classes1 || c.classes || ''),
        deptGroup: String(raw.dept_group || '')
      });
      const url = base + '?' + params.toString();
      window.open(url, '_blank');
    };

    // 點卡片：預設加入/移出清單（跟你原本點搜尋結果加入一致）
    card.onclick = ()=>{
      const key = denseKey(c);
      if (isSaved(key)) removeSaved(key);
      else addToSaved(c);
    };

    wrap.appendChild(card);
  }
}

function renderSavedPanels(){
  renderSavedInto($("savedList"));
  renderSavedInto($("savedList2"));
  renderSavedInto($("savedListFloat"));  // P1 悬浮面板
  renderSavedInto($("savedListFloat2")); // P2 悬浮面板
  
  // 更新悬浮按钮计数
  const p1FloatCount = $("p1FloatCount");
  if (p1FloatCount) {
    p1FloatCount.textContent = String(savedCourses.length);
  }
  
  // 更新悬浮面板学分
  const totalCredits = selectedCourses.reduce((sum,c)=>sum + (Number(c.credit)||0), 0);
  const creditSumFloat = $("creditSumFloat");
  if (creditSumFloat) {
    creditSumFloat.textContent = String(totalCredits);
  }
  const creditSumFloat2 = $("creditSumFloat2");
  if (creditSumFloat2) {
    creditSumFloat2.textContent = String(totalCredits);
  }
}

function renderSavedInto(container){
  const totalCredits = selectedCourses.reduce((sum,c)=>sum + (Number(c.credit)||0), 0);
  $("creditSum").textContent = String(totalCredits);
  $("creditSum2").textContent = String(totalCredits);
  $("p2SelectedCount").textContent = String(selectedCourses.length);

  container.innerHTML = "";
  if (!savedCourses.length){
    container.innerHTML = `<div class="tiny">尚未加入任何課程</div>`;
    return;
  }

  // apply sorting according to p2Sort
  const sortMode = $("p2Sort") ? $("p2Sort").value : 'time';
  const list = savedCourses.slice();
  if (sortMode === 'name'){
    list.sort((a,b)=> (a.name||"").localeCompare(b.name||"", 'zh-Hant'));
  } else if (sortMode === 'dept'){
    list.sort((a,b)=> (a.dept||"").localeCompare(b.dept||"", 'zh-Hant'));
  } else {
    list.sort((a,b)=>{
      const ta = parseTimeToSchedule(a.time) || {day:'', slots:[]};
      const tb = parseTimeToSchedule(b.time) || {day:'', slots:[]};
      const da = dayIndex(ta.day), db = dayIndex(tb.day);
      if (da !== db) return da - db;
      const sa = (ta.slots[0] || '');
      const sb = (tb.slots[0] || '');
      return slotIndex(sa) - slotIndex(sb);
    });
  }

  for (const c of list){
    const item = document.createElement("div");
    item.innerHTML = `
      <div class="x" title="移除">✕</div>
      <div class="name">${escapeHtml(c.name)}</div>
      <div class="line">${escapeHtml(c.dept || "—")} ・ ${escapeHtml(c.teacher || "—")}</div>
      <div class="line">📚 ${c.credit} ・ ${escapeHtml(parseSlot(c.time))}${c.location ? ' ・ ' + escapeHtml(c.location) : ''}</div>
    `;

    const key = denseKey(c);
    item.className = "saved-item" + (isSelected(key) ? " active" : "");
    item.querySelector(".x").onclick = (e)=>{
      e.stopPropagation();
      removeSaved(key);
    };

    item.onclick = ()=>{
      toggleSelected(key);
    };

    container.appendChild(item);
  }
}

/* ===== P2 schedule / list ===== */
function buildScheduleTable(){
  const days = ["一","二","三","四","五","六"];
  const slots = SLOT_TABLE.map(s => ({
    code: s.code,
    time: `${String(s.s).padStart(4,"0").replace(/(\d{2})(\d{2})/,"$1:$2")}-${String(s.e).padStart(4,"0").replace(/(\d{2})(\d{2})/,"$1:$2")}`
  }));

  let html = `<table class="table"><thead><tr><th>節次</th>`;
  for (const d of days) html += `<th>星期${d}</th>`;
  html += `</tr></thead><tbody>`;

  for (const sl of slots){
    html += `<tr><td class="timecell">${escapeHtml(sl.code)}<br><small>${escapeHtml(sl.time)}</small></td>`;
    for (const d of days){
      html += `<td class="slotcell" data-day="${d}" data-slot="${escapeHtml(sl.code)}"></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function renderSchedule(){
  const wrap = $("scheduleWrap");
  wrap.innerHTML = buildScheduleTable();

  // reflect current slot selection (slot-picker modal controls selection)
  wrap.querySelectorAll('.slotcell').forEach(cell=>{
    const day = cell.getAttribute('data-day');
    const slot = cell.getAttribute('data-slot');
    const key = `${day}-${slot}`;
    cell.classList.toggle('slot-selected', selectedSlotKeys.has(key));
  });
  // after attaching handlers, update filter info
  renderP1();

  // 先建立 cell->courses
  const cellCourses = new Map(); // key day-slot => array of course
  for (const c of selectedCourses){
    const t = parseTimeToSchedule(c.time);
    if (!t) continue;
    for (const slot of t.slots){
      const key = `${t.day}-${slot}`;
      if (!cellCourses.has(key)) cellCourses.set(key, []);
      cellCourses.get(key).push(c);
    }
  }

  // 渲染 pills + 衝突標示
  const showConflict = $("p2ShowConflict").checked;
  for (const [key, arr] of cellCourses.entries()){
    const [day, slot] = key.split("-");
    const cell = document.querySelector(`.slotcell[data-day="${day}"][data-slot="${slot}"]`);
    if (!cell) continue;

    const isConflict = arr.length > 1;
    if (showConflict && isConflict) cell.classList.add("has-conflict");

    for (const c of arr){
      const pill = document.createElement("div");
      pill.className = "coursepill" + (showConflict && isConflict ? " conflict" : "");
      pill.innerHTML = `
        <div class="pname">${escapeHtml(c.name)}</div>
        <div class="pinfo">${escapeHtml(c.teacher || "")}</div>
      `;
      pill.onclick = ()=>{
        const key2 = denseKey(c);
        const html = denseMap[key2];
        openModal(`${c.name}（${c.code}${c.group?`-${c.group}`:""}）`, html || "<div class='tiny'>dense.json 無對應資料</div>");
      };
      cell.appendChild(pill);
    }
  }
}

function highlightConflicts(conflicts){
  // 只要把 conflicts 裡的課，對應到格子加上樣式（P2 才存在格子）
  for (const c of conflicts){
    const t = parseTimeToSchedule(c.time);
    if (!t) continue;
    for (const slot of t.slots){
      const cell = document.querySelector(`.slotcell[data-day="${t.day}"][data-slot="${slot}"]`);
      if (!cell) continue;
      cell.classList.add("has-conflict");
      cell.querySelectorAll(".coursepill").forEach(p=>p.classList.add("conflict"));
    }
  }
}

function renderSortedList(){
  const wrap = $("sortedList");
  wrap.innerHTML = "";

  // 展開成 entry（day/slotStart/slotEnd）
  const entries = selectedCourses.map(c=>{
    const t = parseTimeToSchedule(c.time);
    const day = t?.day || "";
    const slots = t?.slots || [];
    const s = slots[0] || "";
    const e = slots[slots.length-1] || "";
    return { c, day, s, e };
  });

  const sortMode = $("p2Sort").value;
  if (sortMode === "name"){
    entries.sort((a,b)=> (a.c.name||"").localeCompare(b.c.name||"", "zh-Hant"));
  } else if (sortMode === "dept"){
    entries.sort((a,b)=> (a.c.dept||"").localeCompare(b.c.dept||"", "zh-Hant"));
  } else {
    entries.sort((a,b)=>{
      const da = dayIndex(a.day), db = dayIndex(b.day);
      if (da !== db) return da - db;
      return slotIndex(a.s) - slotIndex(b.s);
    });
  }

  if (!entries.length){
    wrap.innerHTML = `<div class="tiny">尚未選課</div>`;
    return;
  }

  for (const it of entries){
    const div = document.createElement("div");
    div.className = "row";
    div.innerHTML = `
      <div class="rtitle">${escapeHtml(it.c.name)} <span class="small">(${escapeHtml(it.c.code)}${it.c.group?`-${escapeHtml(it.c.group)}`:""})</span></div>
      <div class="rmeta">${escapeHtml(it.c.dept||"—")} ・ ${escapeHtml(it.c.teacher||"—")} ・ 📚 ${it.c.credit}</div>
      <div class="rmeta">🕒 ${escapeHtml(parseSlot(it.c.time))}</div>
    `;
    div.onclick = ()=>{
      const key = denseKey(it.c);
      openModal(`${it.c.name}（${it.c.code}${it.c.group?`-${it.c.group}`:""}）`, denseMap[key] || "<div class='tiny'>dense.json 無對應資料</div>");
    };
    wrap.appendChild(div);
  }
}

/* ===== Render orchestration ===== */
function renderP1(){
  renderDeptSidebar();
  renderLocationSelect();
  renderResults();
  renderSavedPanels();
  // update slot filter info
  const info = $("slotFilterInfo");
  if (info){
    const n = selectedSlotKeys.size;
    info.textContent = n ? `${n} 個節次${strictSlotSearch? '（嚴格）': ''}` : "";
  }
}
function renderP2(){
  // always show schedule in this view (simplified)
  $("scheduleWrap").classList.remove("hidden");
  $("sortedList").classList.add("hidden");

  renderSavedPanels();
  renderSchedule();
}

function renderAll(){
  if (activePage === "P1") renderP1();
  else renderP2();
}

/* ===== Events ===== */
function bindEvents(){
  $("btnP1").onclick = ()=>setActivePage("P1");
  $("btnP2").onclick = ()=>setActivePage("P2");

  if ($("themeToggle")) $("themeToggle").addEventListener('click', ()=>toggleTheme());

  $("searchInput").addEventListener("input", ()=>{ page=1; renderP1(); });
  $("filterDept").addEventListener("change", ()=>{ activeDept = $("filterDept").value; page=1; renderP1(); });
  $("filterCore").addEventListener("change", ()=>{ page=1; renderP1(); });
  $("filterDay").addEventListener("change", ()=>{ page=1; renderP1(); });
  $("filterMode").addEventListener("change", ()=>{ page=1; renderP1(); });
  if ($("filterLocation")) $("filterLocation").addEventListener("change", ()=>{ page=1; renderP1(); });

  if ($("slotFilterBtn")) $("slotFilterBtn").addEventListener("click", ()=>openSlotPicker());

  // 篩選器折疊按鈕 (手機版)
  const filterToggle = $("filterToggle");
  const filterPanel = $("filterPanel");
  if (filterToggle && filterPanel) {
    filterToggle.onclick = () => {
      const isExpanded = filterPanel.classList.toggle("expanded");
      const icon = filterToggle.querySelector(".filter-toggle-icon");
      if (icon) {
        icon.textContent = isExpanded ? "▲" : "▼";
      }
    };
  }

  $("prevPage").onclick = ()=>{ page=Math.max(1,page-1); renderP1(); };
  $("nextPage").onclick = ()=>{ page=page+1; renderP1(); };

  $("btnClear").onclick = ()=>clearAll();
  $("btnReset").onclick = ()=>resetAll();
  $("btnClear2").onclick = ()=>clearAll();
  $("btnReset2").onclick = ()=>resetAll();

  $("closeNotice").onclick = ()=>closeConflictNotice();

  $("p2Sort").addEventListener("change", ()=>renderP2());
  $("p2ShowConflict").addEventListener("change", ()=>renderP2());

  // P1 悬浮面板
  const p1FloatToggle = $("p1FloatToggle");
  const p1FloatPanel = $("p1FloatPanel");
  const p1FloatClose = $("p1FloatClose");
  
  if (p1FloatToggle && p1FloatPanel) {
    p1FloatToggle.onclick = () => {
      p1FloatPanel.classList.toggle("show");
    };
  }
  
  if (p1FloatClose && p1FloatPanel) {
    p1FloatClose.onclick = () => {
      p1FloatPanel.classList.remove("show");
    };
  }
  
  // P2 悬浮面板
  const p2FloatToggle = $("p2FloatToggle");
  const p2FloatPanel = $("p2FloatPanel");
  const p2FloatClose = $("p2FloatClose");
  
  if (p2FloatToggle && p2FloatPanel) {
    p2FloatToggle.onclick = () => {
      p2FloatPanel.classList.toggle("show");
    };
  }
  
  if (p2FloatClose && p2FloatPanel) {
    p2FloatClose.onclick = () => {
      p2FloatPanel.classList.remove("show");
    };
  }
  
  // P2 悬浮面板的排序和按钮
  if ($("p2SortFloat")) {
    $("p2SortFloat").addEventListener("change", ()=>{
      $("p2Sort").value = $("p2SortFloat").value;
      renderP2();
    });
  }
  if ($("btnClearFloat")) {
    $("btnClearFloat").onclick = ()=>clearAll();
  }
  if ($("btnResetFloat")) {
    $("btnResetFloat").onclick = ()=>resetAll();
  }
  if ($("exportBtn")) $("exportBtn").addEventListener("click", ()=>exportSchedule());

  $("modalClose").onclick = ()=>closeModal();
  document.querySelector("#modal .modal-backdrop").onclick = ()=>closeModal();
}

/* ===== Load data ===== */
async function loadJson(path, fallback){
  try{
    const res = await fetch(path);
    if (!res.ok) return fallback;
    return await res.json();
  }catch{
    return fallback;
  }
}

function openSlotPicker(){
  const days = ["一","二","三","四","五","六"];
  const slots = SLOT_TABLE.map(s=>s.code);
  // build grid HTML
  let html = `<div style="padding:6px 4px; max-width:760px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <label style="display:flex;align-items:center;gap:6px;"><input id="slotStrict" type="checkbox" ${strictSlotSearch? 'checked':''}/> 嚴格節次搜尋</label>
      <div style="flex:1"></div>
      <button id="slotClear" class="btn btn-sm">清除</button>
      <button id="slotSave" class="btn btn-sm btn-primary">套用</button>
    </div>`;

  html += `<div style="display:grid;grid-template-columns:80px repeat(6,1fr);gap:6px;align-items:center;">`;
  html += `<div></div>`;
  for (const d of days) html += `<div style="text-align:center;font-weight:700">星期${d}</div>`;
  for (const s of slots){
    html += `<div style="text-align:center;font-weight:700">${escapeHtml(s)}</div>`;
    for (const d of days){
      const key = `${d}-${s}`;
      const active = selectedSlotKeys.has(key) ? 'selected' : '';
      html += `<div><button data-key="${key}" class="slotcell-btn btn" style="width:100%;">${escapeHtml('')}</button></div>`;
    }
  }
  html += `</div></div>`;

  openModal('節次選擇', html);
  // make modal smaller so entire grid fits on common screens
  const modalCard = document.querySelector('#modal .modal-card');
  if (modalCard) modalCard.style.width = 'min(640px, calc(100vw - 20px))';

  // after modal shown, bind events
  const modal = document.getElementById('modal');
  const strict = modal.querySelector('#slotStrict');
  // populate buttons state
  modal.querySelectorAll('.slotcell-btn').forEach(btn=>{
    const k = btn.dataset.key;
    // initial state
    if (selectedSlotKeys.has(k)) btn.classList.add('active');

    const applySelection = (doAdd) => {
      if (doAdd) selectedSlotKeys.add(k);
      else selectedSlotKeys.delete(k);
      btn.classList.toggle('active', selectedSlotKeys.has(k));
    };

    // mousedown starts drag-select
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      _slotDragging = true;
      _slotMouseDownKey = k;
      _slotDragAdd = !selectedSlotKeys.has(k);
      applySelection(_slotDragAdd);
      // update filter preview immediately
      renderP1(!!strict?.checked);
      // stop on mouseup anywhere — ensure click handler can see last mousedown by clearing the key slightly later
      const up = () => { _slotDragging = false; window.removeEventListener('mouseup', up); setTimeout(()=>{ _slotMouseDownKey = null; }, 0); };
      window.addEventListener('mouseup', up);
    });

    // while dragging, mouseenter toggles according to drag mode
    btn.addEventListener('mouseenter', ()=>{
      if (!_slotDragging) return;
      applySelection(_slotDragAdd);
      renderP1(!!strict?.checked);
    });

    // click toggles single cell — if this click follows a mousedown on the same button,
    // treat it the same as the drag action (use _slotDragAdd); otherwise toggle.
    btn.addEventListener('click', (e)=>{
      const doAdd = (_slotMouseDownKey === k) ? _slotDragAdd : !selectedSlotKeys.has(k);
      applySelection(doAdd);
      renderP1(!!strict?.checked);
    });
  });

  const save = modal.querySelector('#slotSave');
  const clear = modal.querySelector('#slotClear');
  save.onclick = ()=>{
    strictSlotSearch = !!strict.checked;
    closeModal();
    page = 1;
    renderP1();
  };
  clear.onclick = ()=>{
    selectedSlotKeys.clear();
    modal.querySelectorAll('.slotcell-btn').forEach(b=>b.classList.remove('active'));
    strict.checked = true;
    renderP1(!!strict?.checked);
  };
}
/* ===== 偵測可用學期 ===== */
async function detectAvailableTerms(){
  const terms = [];
  // 從 112-1 開始嘗試偵測
  for (let year = 112; year <= 120; year++) {
    for (let term = 1; term <= 3; term++) {
      const termStr = `${year}-${term}`;
      const testPath = `data/${termStr}/courses.json`;
      try {
        const res = await fetch(testPath, { method: 'HEAD' });
        if (res.ok) {
          terms.push(termStr);
        }
      } catch {
        // 忽略錯誤，繼續嘗試
      }
    }
  }
  return terms;
}

/* ===== 載入學期數據 ===== */
async function loadTermData(term){
  if (!term) return;
  
  currentTerm = term;
  const basePath = `data/${term}`;
  
  const rawCourses = await loadJson(`${basePath}/courses.json`, []);
  courses = rawCourses.map(normalizeCourse);
  
  denseMap = await loadJson(`${basePath}/dense.json`, {});
  
  loadFromStorage();
  
  renderDeptSelect();
  renderCoreSelect();
  renderLocationSelect();
  renderDeptSidebar();
  
  renderAll();
}

/* ===== 切換學期 ===== */
async function switchTerm(term){
  if (term === currentTerm) return;
  
  // 清空當前狀態
  courses = [];
  denseMap = {};
  savedCourses = [];
  selectedCourses = [];
  
  await loadTermData(term);
}

/* ===== 渲染學期選擇器 ===== */
function renderTermSelect(){
  const sel = $("termSelect");
  if (!sel) return;
  
  sel.innerHTML = availableTerms.map(t => 
    `<option value="${t}">${t}</option>`
  ).join("");
  
  if (currentTerm && availableTerms.includes(currentTerm)) {
    sel.value = currentTerm;
  }
  
  sel.onchange = () => {
    switchTerm(sel.value);
  };
}

async function init(){
  bindEvents();

  // 1. 偵測可用學期
  availableTerms = await detectAvailableTerms();
  
  if (availableTerms.length === 0) {
    console.error("找不到任何學期資料");
    return;
  }
  
  // 2. 決定要載入的學期（優先順序：localStorage > 最新學期）
  const lastTerm = localStorage.getItem("lastTerm");
  if (lastTerm && availableTerms.includes(lastTerm)) {
    currentTerm = lastTerm;
  } else {
    currentTerm = availableTerms[availableTerms.length - 1]; // 最新學期
  }
  
  // 3. 渲染學期選擇器
  renderTermSelect();
  
  // 4. 載入學期數據
  await loadTermData(currentTerm);

  // apply saved theme (default dark)
  try{ const theme = localStorage.getItem('theme') || 'dark'; applyTheme(theme); }catch(e){}
  renderAll();
}

init().catch(err=>{
  console.error("init failed", err);
});

// Export schedule as PNG using html2canvas (loaded dynamically)
async function ensureHtml2Canvas(){
  if (window.html2canvas) return window.html2canvas;
  return new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = ()=> resolve(window.html2canvas);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function exportSchedule(){
  try{
    const html2canvas = await ensureHtml2Canvas();
    const node = document.querySelector('#scheduleWrap');
    if (!node) return alert('找不到課表節點');
    const table = node.querySelector('table');
    if (!table) {
      // fallback: capture node
      const origOverflow = node.style.overflow;
      node.style.overflow = 'visible';
      const canvas = await html2canvas(node, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', scale: 2});
      node.style.overflow = origOverflow;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = `timetable.png`; document.body.appendChild(a); a.click(); a.remove();
      return;
    }

    // Clone table into an offscreen wrapper sized to full scroll dimensions to ensure full capture
    const clone = table.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.background = getComputedStyle(document.body).backgroundColor || '#ffffff';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Ensure clone width/height match full scroll size
    clone.style.width = table.scrollWidth + 'px';
    clone.style.height = table.scrollHeight + 'px';

    const canvas = await html2canvas(clone, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', scale: 2});
    wrapper.remove();
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }catch(err){
    console.error('export failed', err);
    alert('匯出失敗：' + (err && err.message));
  }
}

/* ===== utils ===== */
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll("\"","&quot;")
    .replaceAll("'","&#039;");
}
