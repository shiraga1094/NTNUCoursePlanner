import { state } from './state.js';
import { loadJson, $ } from './utils.js';
import { normalizeCourse } from './courseData.js';
import { loadFromStorage } from './storage.js';
import { renderDeptSelect, renderCoreSelect, renderLocationSelect, renderDeptSidebar, renderAll, applyTheme } from './ui.js';
import { bindEvents } from './events.js';

async function detectAvailableTerms(){
  const terms = [];
  for (let year = 112; year <= 120; year++) {
    for (let term = 1; term <= 3; term++) {
      const termStr = `${year}-${term}`;
      const testPath = `data/${termStr}/courses.json`;
      try {
        const res = await fetch(testPath, { method: 'HEAD' });
        if (res.ok) terms.push(termStr);
      } catch {}
    }
  }
  return terms;
}

async function loadTermData(term){
  if (!term) return;
  
  state.currentTerm = term;
  const basePath = `data/${term}`;
  
  const rawCourses = await loadJson(`${basePath}/courses.json`, []);
  state.courses = rawCourses.map(normalizeCourse);
  state.denseMap = await loadJson(`${basePath}/dense.json`, {});
  
  loadFromStorage();
  
  renderDeptSelect();
  renderCoreSelect();
  renderLocationSelect();
  renderDeptSidebar();
  renderAll();
}

async function switchTerm(term){
  if (term === state.currentTerm) return;
  
  state.courses = [];
  state.denseMap = {};
  state.savedCourses = [];
  state.selectedCourses = [];
  
  await loadTermData(term);
}

function renderTermSelect(){
  const sel = $("termSelect");
  if (!sel) return;
  
  sel.innerHTML = state.availableTerms.map(t => 
    `<option value="${t}">${t}</option>`
  ).join("");
  
  if (state.currentTerm && state.availableTerms.includes(state.currentTerm)) {
    sel.value = state.currentTerm;
  }
  
  sel.onchange = async () => {
    await switchTerm(sel.value);
  };
}

async function init(){
  bindEvents();

  state.availableTerms = await detectAvailableTerms();
  
  if (state.availableTerms.length === 0) {
    console.error("找不到任何學期資料");
    return;
  }
  
  const lastTerm = localStorage.getItem("lastTerm");
  if (lastTerm && state.availableTerms.includes(lastTerm)) {
    state.currentTerm = lastTerm;
  } else {
    state.currentTerm = state.availableTerms[state.availableTerms.length - 1];
  }
  
  renderTermSelect();
  await loadTermData(state.currentTerm);

  try{ const theme = localStorage.getItem('theme') || 'dark'; applyTheme(theme); }catch(e){}
  renderAll();
}

init().catch(err=>{
  console.error("init failed", err);
});
