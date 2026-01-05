import { state } from './state.js';
import { $ } from './utils.js';
import { clearAll, resetAll } from './storage.js';
import { setActivePage, renderP1, renderP2, renderAll, toggleTheme, closeConflictNotice, closeModal, openSlotPicker } from './ui.js';

export function bindEvents(){
  $("btnP1").onclick = ()=>setActivePage("P1");
  $("btnP2").onclick = ()=>setActivePage("P2");

  if ($("themeToggle")) $("themeToggle").addEventListener('click', ()=>toggleTheme());

  $("searchInput").addEventListener("input", ()=>{ state.page=1; renderP1(); });
  $("filterDept").addEventListener("change", ()=>{ state.activeDept = $("filterDept").value; state.page=1; renderP1(); });
  $("filterCore").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  $("filterDay").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  $("filterMode").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  if ($("filterLocation")) $("filterLocation").addEventListener("change", ()=>{ state.page=1; renderP1(); });

  if ($("slotFilterBtn")) $("slotFilterBtn").addEventListener("click", ()=>openSlotPicker());

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

  $("prevPage").onclick = ()=>{ state.page=Math.max(1,state.page-1); renderP1(); };
  $("nextPage").onclick = ()=>{ state.page=state.page+1; renderP1(); };

  $("btnClear").onclick = ()=>{ clearAll(); renderAll(); };
  $("btnReset").onclick = ()=>{ resetAll(); renderAll(); };
  $("btnClear2").onclick = ()=>{ clearAll(); renderAll(); };
  $("btnReset2").onclick = ()=>{ resetAll(); renderAll(); };

  $("closeNotice").onclick = ()=>closeConflictNotice();

  $("p2Sort").addEventListener("change", ()=>renderP2());
  $("p2ShowConflict").addEventListener("change", ()=>renderP2());

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
  
  if ($("p2SortFloat")) {
    $("p2SortFloat").addEventListener("change", ()=>{
      $("p2Sort").value = $("p2SortFloat").value;
      renderP2();
    });
  }
  if ($("btnClearFloat")) {
    $("btnClearFloat").onclick = ()=>{ clearAll(); renderAll(); };
  }
  if ($("btnResetFloat")) {
    $("btnResetFloat").onclick = ()=>{ resetAll(); renderAll(); };
  }
  if ($("exportBtn")) $("exportBtn").addEventListener("click", ()=>exportSchedule());

  $("modalClose").onclick = ()=>closeModal();
  document.querySelector("#modal .modal-backdrop").onclick = ()=>closeModal();
}

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
      const origOverflow = node.style.overflow;
      node.style.overflow = 'visible';
      const canvas = await html2canvas(node, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', scale: 2});
      node.style.overflow = origOverflow;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = url; a.download = `timetable.png`; document.body.appendChild(a); a.click(); a.remove();
      return;
    }

    const clone = table.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.background = getComputedStyle(document.body).backgroundColor || '#ffffff';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

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
