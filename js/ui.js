import { state } from './state.js';
import { $, escapeHtml, deptMatchesCategory } from './utils.js';
import { denseKey } from './courseData.js';
import { isSaved, isSelected, getFilteredCourses } from './filters.js';
import { addToSaved, removeSaved, toggleSelected, checkNewCourseConflict } from './courseActions.js';
import { parseSlot, parseTimeToSchedule, dayIndex, slotIndex, SLOT_TABLE, parseActualTimeRange, formatTime, NTU_SLOT_TABLE } from './timeParser.js';

function generateCourseInfo(course) {
  const info = [];
  
  info.push(`<div style="padding: 15px; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word;">`);
  
  if (course.code) {
    info.push(`<p style="margin: 8px 0;"><strong>課程代碼：</strong>${escapeHtml(course.code)}${course.group ? `-${escapeHtml(course.group)}` : ''}</p>`);
  }
  
  if (course.dept) {
    info.push(`<p style="margin: 8px 0;"><strong>開課系所：</strong>${escapeHtml(course.dept)}</p>`);
  }
  
  if (course.teacher) {
    info.push(`<p style="margin: 8px 0;"><strong>授課教師：</strong>${escapeHtml(course.teacher)}</p>`);
  }
  
  if (course.credit) {
    info.push(`<p style="margin: 8px 0;"><strong>學分：</strong>${escapeHtml(course.credit)}</p>`);
  }
  
  if (course.time_inf) {
    info.push(`<p style="margin: 8px 0;"><strong>上課時間：</strong>${escapeHtml(course.time_inf)}</p>`);
  } else if (course.time) {
    info.push(`<p style="margin: 8px 0;"><strong>上課時間：</strong>${escapeHtml(parseSlot(course.time))}</p>`);
  }
  
  if (course.location) {
    info.push(`<p style="margin: 8px 0;"><strong>上課地點：</strong>${escapeHtml(course.location)}</p>`);
  }
  
  if (course.restrict) {
    info.push(`<p style="margin: 8px 0;"><strong>修課限制：</strong>${escapeHtml(course.restrict)}</p>`);
  }
  
  info.push(`</div>`);
  
  return info.join('');
}

export function setActivePage(p){
  state.activePage = p;
  $("pageP1").classList.toggle("active", p==="P1");
  $("pageP2").classList.toggle("active", p==="P2");
  $("btnP1").classList.toggle("btn-primary", p==="P1");
  $("btnP2").classList.toggle("btn-primary", p==="P2");
  closeConflictNotice();
  renderAll();
  
  // Recalculate padding when switching pages
  setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const pageTop = document.querySelector(`#page${p} .page-top`);
      const layout = document.querySelector(`#page${p} .layout`);
      if (pageTop && layout) {
        const rect = pageTop.getBoundingClientRect();
        const paddingNeeded = rect.top + rect.height;
        layout.style.paddingTop = paddingNeeded + 'px';
      }
    }
  }, 50);
}

export function openModal(title, html){
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html || "<div class='tiny'>無資料</div>";
  $("modal").classList.remove("hidden");
}

export function closeModal(){
  $("modal").classList.add("hidden");
  $("modalBody").innerHTML = "";
}

export function applyTheme(theme){
  document.body.classList.remove('light', 'gray');
  if (theme === 'light') document.body.classList.add('light');
  else if (theme === 'gray') document.body.classList.add('gray');
  
  const btn = document.getElementById('themeToggle');
  if (btn) {
    if (theme === 'light') btn.textContent = '☀️';
    else if (theme === 'gray') btn.textContent = '◐';
    else btn.textContent = '🌙';
  }
}

export function toggleTheme(){
  const current = document.body.classList.contains('light') ? 'light' : 
                  document.body.classList.contains('gray') ? 'gray' : 'dark';
  
  let next;
  if (current === 'dark') next = 'light';
  else if (current === 'light') next = 'gray';
  else next = 'dark';
  
  localStorage.setItem('theme', next);
  applyTheme(next);
}

export function showConflictNotice(msg){
}

export function closeConflictNotice(){
  document.querySelectorAll(".slotcell.has-conflict").forEach(c=>c.classList.remove("has-conflict"));
  document.querySelectorAll(".coursepill.conflict").forEach(c=>c.classList.remove("conflict"));
}

export function renderDeptSidebar(){
  const el = $("deptList");
  if (!el) return;
  el.innerHTML = "";

  const depts = Array.from(new Set(state.courses.map(c=>c.dept).filter(Boolean))).sort();
  for (const d of depts){
    const item = document.createElement("div");
    item.className = "item" + ((state.activeDept===d) ? " active" : "");
    item.textContent = d;
    item.onclick = ()=>{
      state.activeDept = (state.activeDept===d) ? "" : d;
      $("filterDept").value = state.activeDept;
      state.page = 1;
      renderP1();
    };
    el.appendChild(item);
  }
}

export function renderDeptSelect(){
  const sel = $("filterDept");
  const depts = Array.from(new Set(state.courses.map(c=>c.dept).filter(Boolean))).sort();
  let html = `<option value="">所有系所</option>`;

  const specials = [
    { val: '__COMMON__', label: '共同' , match: d=>deptMatchesCategory(d,'COMMON') },
    { val: '__SPORTS__', label: '體育' , match: d=>deptMatchesCategory(d,'SPORTS') },
    { val: '__DEFENSE__', label: '國防' , match: d=>deptMatchesCategory(d,'DEFENSE') },
    { val: '__EXCHANGE__', label: '校際' , match: d=>deptMatchesCategory(d,'EXCHANGE') }
  ];

  for (const s of specials){
    if (depts.some(s.match)) html += `<option value="${s.val}">${s.label}</option>`;
  }

  const allPrograms = new Set();
  state.courses.forEach(c => {
    if (c.programs && c.programs.length) {
      c.programs.forEach(p => allPrograms.add(p));
    }
  });
  
  if (allPrograms.size > 0) {
    const sortedPrograms = Array.from(allPrograms).sort();
    sortedPrograms.forEach(p => {
      html += `<option value="__PROGRAM__${escapeHtml(p)}">${escapeHtml(p)}</option>`;
    });
  }

  html += depts.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  sel.innerHTML = html;
  if (state.activeDept) sel.value = state.activeDept;
}

export function renderLocationSelect(){
  const sel = $("filterLocation");
  if (!sel) return;
  const allowed = ['公館分部','和平本部'];
  const prev = sel.value || "";
  sel.innerHTML = `<option value="">所有地點</option>` + allowed.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
  if (prev) sel.value = prev;
}

export function renderCoreSelect(){
  const sel = $("filterCore");
  const cores = Array.from(new Set(state.courses.map(c=>c.core).filter(Boolean))).sort();
  sel.innerHTML = `<option value="">通識領域（若無可忽略）</option>` + cores.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
}

export function renderResults(){
  let list = getFilteredCourses();
  
  const sortMode = $("p1Sort") ? $("p1Sort").value : 'default';
  if (sortMode !== 'default') {
    list = [...list];
    const [type, order] = sortMode.split('-');
    const isDesc = order === 'desc';
    
    if (type === 'name') {
      list.sort((a,b) => {
        const cmp = (a.name||'').localeCompare(b.name||'', 'zh-Hant');
        return isDesc ? -cmp : cmp;
      });
    } else if (type === 'dept') {
      list.sort((a,b) => {
        const cmp = (a.dept||'').localeCompare(b.dept||'', 'zh-Hant');
        return isDesc ? -cmp : cmp;
      });
    } else if (type === 'credit') {
      list.sort((a,b) => {
        const diff = (Number(a.credit)||0) - (Number(b.credit)||0);
        return isDesc ? -diff : diff;
      });
    } else if (type === 'time') {
      list.sort((a,b) => {
        const ta = parseTimeToSchedule(a.time);
        const tb = parseTimeToSchedule(b.time);
        const aFirst = ta && ta.length > 0 ? ta[0] : {day:'', slots:[]};
        const bFirst = tb && tb.length > 0 ? tb[0] : {day:'', slots:[]};
        const da = dayIndex(aFirst.day), db = dayIndex(bFirst.day);
        if (da !== db) return isDesc ? db - da : da - db;
        const sa = (aFirst.slots[0] || '');
        const sb = (bFirst.slots[0] || '');
        const diff = slotIndex(sa) - slotIndex(sb);
        return isDesc ? -diff : diff;
      });
    }
  }
  
  $("p1Count").textContent = String(list.length);

  const totalPages = Math.max(1, Math.ceil(list.length / state.PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);

  const start = (state.page-1)*state.PAGE_SIZE;
  const slice = list.slice(start, start + state.PAGE_SIZE);

  $("pageInfo").textContent = `${state.page} / ${totalPages}`;
  $("prevPage").disabled = (state.page<=1);
  $("nextPage").disabled = (state.page>=totalPages);

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
      <div class="title">${escapeHtml(c.name)} <span class="small">(${escapeHtml(c.code)}${c.group?`-${escapeHtml(c.group)}`:""})${c.serial?` (#${escapeHtml(c.serial)})`:""}</span></div>
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
      renderAll();
    };
    btnSelect.onclick = (e)=>{
      e.stopPropagation();
      if (!isSaved(denseKey(c))) addToSaved(c);
      const result = toggleSelected(denseKey(c));
      if (!result.success) {
        const names = result.conflicts.map(c=>c.name).join("、");
        showConflictNotice(`無法選課！此課程與「${names}」時間衝突，請先取消衝突課程。`);
        if (state.activePage === "P2") highlightConflicts(result.conflicts);
      } else {
        closeConflictNotice();
      }
      renderAll();
    };
    btnDense.onclick = (e)=>{
      e.stopPropagation();
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

    card.onclick = ()=>{
      const key = denseKey(c);
      if (isSaved(key)) removeSaved(key);
      else addToSaved(c);
      renderAll();
    };

    wrap.appendChild(card);
  }
}

export function renderSavedPanels(){
  renderSavedInto($("savedList"));
  renderSavedInto($("savedList2"));
  renderSavedInto($("savedListFloat"));
  renderSavedInto($("savedListFloat2"));
  
  const p1FloatCount = $("p1FloatCount");
  if (p1FloatCount) {
    p1FloatCount.textContent = String(state.savedCourses.length);
  }
  
  const totalCredits = state.selectedCourses.reduce((sum,c)=>sum + (Number(c.credit)||0), 0);
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
  const totalCredits = state.selectedCourses.reduce((sum,c)=>sum + (Number(c.credit)||0), 0);
  $("creditSum").textContent = String(totalCredits);
  $("creditSum2").textContent = String(totalCredits);
  $("p2SelectedCount").textContent = String(state.selectedCourses.length);

  container.innerHTML = "";
  if (!state.savedCourses.length){
    container.innerHTML = `<div class="tiny">尚未加入任何課程</div>`;
    return;
  }

  const sortMode = $("p2Sort") ? $("p2Sort").value : 'time';
  const list = state.savedCourses.slice();
  if (sortMode === 'name'){
    list.sort((a,b)=> (a.name||"").localeCompare(b.name||"", 'zh-Hant'));
  } else if (sortMode === 'dept'){
    list.sort((a,b)=> (a.dept||"").localeCompare(b.dept||"", 'zh-Hant'));
  } else {
    list.sort((a,b)=>{
      const ta = parseTimeToSchedule(a.time);
      const tb = parseTimeToSchedule(b.time);
      const aFirst = ta && ta.length > 0 ? ta[0] : {day:'', slots:[]};
      const bFirst = tb && tb.length > 0 ? tb[0] : {day:'', slots:[]};
      const da = dayIndex(aFirst.day), db = dayIndex(bFirst.day);
      if (da !== db) return da - db;
      const sa = (aFirst.slots[0] || '');
      const sb = (bFirst.slots[0] || '');
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
      renderAll();
    };

    item.onclick = ()=>{
      const result = toggleSelected(key);
      if (!result.success) {
        const names = result.conflicts.map(c=>c.name).join("、");
        showConflictNotice(`無法選課！此課程與「${names}」時間衝突，請先取消衝突課程。`);
        if (state.activePage === "P2") highlightConflicts(result.conflicts);
      } else {
        closeConflictNotice();
      }
      renderAll();
    };

    container.appendChild(item);
  }
}

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

export function renderSchedule(){
  const wrap = $("scheduleWrap");
  wrap.innerHTML = buildScheduleTable();

  renderP1();

  const conflictingCourseKeys = new Set();
  if (state.conflictingCourse) {
    const conflicts = checkNewCourseConflict(state.conflictingCourse);
    for (const c of conflicts) {
      conflictingCourseKeys.add(denseKey(c));
    }
  }

  // Separate regular courses and intercollegiate courses
  // Check dept field for "校際" keyword
  const regularCourses = [];
  const intercollegiateCourses = [];
  
  for (const c of state.selectedCourses) {
    if (c.dept && c.dept.includes('校際')) {
      intercollegiateCourses.push(c);
    } else {
      regularCourses.push(c);
    }
  }

  // Render regular courses in cells
  const cellCourses = new Map();
  for (const c of regularCourses){
    const times = parseTimeToSchedule(c.time);
    if (!times || times.length === 0) continue;
    for (const t of times) {
      for (const slot of t.slots){
        const key = `${t.day}-${slot}`;
        if (!cellCourses.has(key)) cellCourses.set(key, []);
        cellCourses.get(key).push(c);
      }
    }
  }

  const showConflict = $("p2ShowConflict").checked;
  for (const [key, arr] of cellCourses.entries()){
    const [day, slot] = key.split("-");
    const cell = document.querySelector(`.slotcell[data-day="${day}"][data-slot="${slot}"]`);
    if (!cell) continue;

    const isConflict = arr.length > 1;
    if (showConflict && isConflict) cell.classList.add("has-conflict");

    for (const c of arr){
      const courseKey = denseKey(c);
      const isConflictingWithAttempted = conflictingCourseKeys.has(courseKey);
      
      const pill = document.createElement("div");
      pill.className = "coursepill" + (showConflict && (isConflict || isConflictingWithAttempted) ? " conflict" : "");
      pill.innerHTML = `
        <div class="pname">${escapeHtml(c.name)}</div>
        <div class="pinfo">${escapeHtml(c.teacher || "")}${c.location ? ' <small>' + escapeHtml(c.location) + '</small>' : ''}</div>
      `;
      pill.onclick = ()=>{
        const key2 = denseKey(c);
        const html = state.denseMap[key2] || generateCourseInfo(c);
        openModal(`${c.name}（${c.code}${c.group?`-${c.group}`:""}${c.serial?` (#${c.serial})`:""}）`, html);
      };
      cell.appendChild(pill);
    }
  }

  // Render intercollegiate courses as spanning pills
  const tbody = wrap.querySelector('tbody');
  if (tbody && intercollegiateCourses.length > 0) {
    const showConflict = $("p2ShowConflict").checked;
    
    for (const c of intercollegiateCourses) {
      const times = parseTimeToSchedule(c.time);
      if (!times || times.length === 0) continue;
      
      for (const t of times) {
        const firstSlot = t.slots[0];
        const lastSlot = t.slots[t.slots.length - 1];
        
        // Find first and last cells
        const firstCell = document.querySelector(`.slotcell[data-day="${t.day}"][data-slot="${firstSlot}"]`);
        const lastCell = document.querySelector(`.slotcell[data-day="${t.day}"][data-slot="${lastSlot}"]`);
        
        if (!firstCell || !lastCell) continue;
        
        // Calculate position
        const firstRect = firstCell.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();
        const tbodyRect = tbody.getBoundingClientRect();
        
        const top = firstRect.top - tbodyRect.top;
        const height = lastRect.bottom - firstRect.top;
        const dayIdx = ["一","二","三","四","五","六"].indexOf(t.day);
        const left = `calc((100% / 7) * ${dayIdx + 1} + 4px)`;
        
        // Get time for first and last slots
        // Intercollegiate courses: try NTU times first, fallback to SLOT_TABLE
        let startSlotInfo = NTU_SLOT_TABLE.find(s => s.code === firstSlot);
        if (!startSlotInfo) {
          startSlotInfo = SLOT_TABLE.find(s => s.code === firstSlot);
        }
        
        let endSlotInfo = NTU_SLOT_TABLE.find(s => s.code === lastSlot);
        if (!endSlotInfo) {
          endSlotInfo = SLOT_TABLE.find(s => s.code === lastSlot);
        }
        
        let timeDisplay = '';
        if (startSlotInfo && endSlotInfo) {
          timeDisplay = `${formatTime(startSlotInfo.s)} - ${formatTime(endSlotInfo.e)}`;
        } else {
          timeDisplay = `${firstSlot} - ${lastSlot}`;
        }
        
        const courseKey = denseKey(c);
        const isConflictingWithAttempted = conflictingCourseKeys.has(courseKey);
        
        const pill = document.createElement('div');
        pill.className = 'coursepill coursepill-span' + 
          (showConflict && isConflictingWithAttempted ? ' conflict' : '');
        pill.style.top = `${top}px`;
        pill.style.height = `${height}px`;
        pill.style.left = left;
        
        // Store data attributes for export recalculation
        pill.setAttribute('data-day', t.day);
        pill.setAttribute('data-first-slot', firstSlot);
        pill.setAttribute('data-last-slot', lastSlot);
        
        pill.innerHTML = `
          <div class="pname">${escapeHtml(c.name)}</div>
          <div class="pinfo" style="margin-top:4px; font-weight:600;">${escapeHtml(timeDisplay)}</div>
          <div class="pinfo" style="margin-top:2px;">${escapeHtml(c.teacher || "")}${c.location ? ' ' + escapeHtml(c.location) : ''}</div>
        `;
        
        pill.onclick = () => {
          const key2 = denseKey(c);
          const html = state.denseMap[key2] || generateCourseInfo(c);
          openModal(`${c.name}（${c.code}${c.group?`-${c.group}`:""}${c.serial?` (#${c.serial})`:""}）`, html);
        };
        
        tbody.appendChild(pill);
      }
    }
  }
}

function highlightConflicts(conflicts){
  for (const c of conflicts){
    const times = parseTimeToSchedule(c.time);
    if (!times || times.length === 0) continue;
    for (const t of times) {
      for (const slot of t.slots){
        const cell = document.querySelector(`.slotcell[data-day="${t.day}"][data-slot="${slot}"]`);
        if (!cell) continue;
        cell.classList.add("has-conflict");
        cell.querySelectorAll(".coursepill").forEach(p=>p.classList.add("conflict"));
      }
    }
  }
}

export function renderSortedList(){
  const wrap = $("sortedList");
  wrap.innerHTML = "";

  const entries = state.selectedCourses.map(c=>{
    const times = parseTimeToSchedule(c.time);
    const first = times && times.length > 0 ? times[0] : {day:'', slots:[]};
    const day = first.day || "";
    const slots = first.slots || [];
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
      <div class="rtitle">${escapeHtml(it.c.name)} <span class="small">(${escapeHtml(it.c.code)}${it.c.group?`-${escapeHtml(it.c.group)}`:""}${it.c.serial?` (#${escapeHtml(it.c.serial)})`:""})</span></div>
      <div class="rmeta">${escapeHtml(it.c.dept||"—")} ・ ${escapeHtml(it.c.teacher||"—")} ・ 📚 ${it.c.credit}</div>
      <div class="rmeta">🕒 ${escapeHtml(parseSlot(it.c.time))}</div>
    `;
    div.onclick = ()=>{
      const key = denseKey(it.c);
      openModal(`${it.c.name}（${it.c.code}${it.c.group?`-${escapeHtml(it.c.group)}`:""}${it.c.serial?` (#${it.c.serial})`:""}）`, state.denseMap[key] || generateCourseInfo(it.c));
    };
    wrap.appendChild(div);
  }
}

export function renderP1(){
  renderDeptSidebar();
  renderLocationSelect();
  renderResults();
  renderSavedPanels();
  const info = $("slotFilterInfo");
  if (info){
    const n = state.selectedSlotKeys.size;
    info.textContent = n ? `${n} 個節次${state.strictSlotSearch? '（嚴格）': ''}` : "";
  }
}

export function renderP2(){
  $("scheduleWrap").classList.remove("hidden");
  $("sortedList").classList.add("hidden");
  renderSavedPanels();
  renderSchedule();
}

export function renderAll(){
  if (state.activePage === "P1") renderP1();
  else renderP2();
}

export function renderTermSelect(){
  const sel = $("termSelect");
  if (!sel) return;
  
  sel.innerHTML = state.availableTerms.map(t => 
    `<option value="${t}">${t}</option>`
  ).join("");
  
  if (state.currentTerm && state.availableTerms.includes(state.currentTerm)) {
    sel.value = state.currentTerm;
  }
}

export function openExportPicker(){
  const html = `
    <div style="padding:24px;display:flex;flex-direction:column;gap:16px;">
      <div style="text-align:center;font-size:14px;color:#666;">選擇匯出格式</div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button id="exportPNG" class="btn btn-primary" style="padding:12px;">匯出為 PNG 圖片</button>
        <button id="exportPDF" class="btn btn-primary" style="padding:12px;">匯出為 PDF 文件</button>
        <button id="exportXLSX" class="btn btn-primary" style="padding:12px;">匯出為 Excel 表格</button>
      </div>
    </div>
  `;
  openModal('匯出課表', html);
  const modalCard = document.querySelector('#modal .modal-card');
  if (modalCard) modalCard.style.width = 'min(420px, calc(100vw - 20px))';
}

export function openSlotPicker(){
  const days = ["一","二","三","四","五","六"];
  const slots = SLOT_TABLE.map(s=>s.code);
  let html = `<div style="padding:6px 4px; max-width:760px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <label style="display:flex;align-items:center;gap:6px;"><input id="slotStrict" type="checkbox" ${state.strictSlotSearch? 'checked':''}/> 嚴格節次搜尋</label>
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
      html += `<div><button data-key="${key}" class="slotcell-btn btn" style="width:100%;"></button></div>`;
    }
  }
  html += `</div></div>`;

  openModal('節次選擇', html);
  const modalCard = document.querySelector('#modal .modal-card');
  if (modalCard) modalCard.style.width = 'min(640px, calc(100vw - 20px))';

  const modal = document.getElementById('modal');
  const strict = modal.querySelector('#slotStrict');
  modal.querySelectorAll('.slotcell-btn').forEach(btn=>{
    const k = btn.dataset.key;
    if (state.selectedSlotKeys.has(k)) btn.classList.add('active');

    const applySelection = (doAdd) => {
      if (doAdd) state.selectedSlotKeys.add(k);
      else state.selectedSlotKeys.delete(k);
      btn.classList.toggle('active', state.selectedSlotKeys.has(k));
    };

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      state._slotDragging = true;
      state._slotMouseDownKey = k;
      state._slotDragAdd = !state.selectedSlotKeys.has(k);
      applySelection(state._slotDragAdd);
      renderP1(!!strict?.checked);
      const up = () => { state._slotDragging = false; window.removeEventListener('mouseup', up); setTimeout(()=>{ state._slotMouseDownKey = null; }, 0); };
      window.addEventListener('mouseup', up);
    });

    btn.addEventListener('mouseenter', ()=>{
      if (!state._slotDragging) return;
      applySelection(state._slotDragAdd);
      renderP1(!!strict?.checked);
    });

    btn.addEventListener('click', (e)=>{
      const doAdd = (state._slotMouseDownKey === k) ? state._slotDragAdd : !state.selectedSlotKeys.has(k);
      applySelection(doAdd);
      renderP1(!!strict?.checked);
    });
  });

  const save = modal.querySelector('#slotSave');
  const clear = modal.querySelector('#slotClear');
  save.onclick = ()=>{
    state.strictSlotSearch = !!strict.checked;
    closeModal();
    state.page = 1;
    renderP1();
  };
  clear.onclick = ()=>{
    state.selectedSlotKeys.clear();
    modal.querySelectorAll('.slotcell-btn').forEach(b=>b.classList.remove('active'));
    strict.checked = true;
    renderP1(!!strict?.checked);
  };
}
