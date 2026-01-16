// Event binding and handlers
// Sets up all interactive elements and schedule export functionality

import { state } from './state.js';
import { $ } from './utils.js';
import { clearAll, resetAll } from './storage.js';
import { setActivePage, renderP1, renderP2, renderAll, toggleTheme, closeConflictNotice, closeModal, openSlotPicker, openExportPicker } from './ui.js';
import { parseTimeToSchedule, SLOT_TABLE, NTU_SLOT_TABLE } from './timeParser.js';

// Export image settings
const EXPORT_FIXED_WIDTH = 1200;

// Dynamically adjust content padding based on fixed header heights
function adjustContentPadding() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const pageTopP1 = document.querySelector('#pageP1 .page-top');
    const pageTopP2 = document.querySelector('#pageP2 .page-top');
    const layoutP1 = document.querySelector('#pageP1 .layout');
    const layoutP2 = document.querySelector('#pageP2 .layout');
    
    if (pageTopP1 && layoutP1) {
      const rect = pageTopP1.getBoundingClientRect();
      const paddingNeeded = rect.top + rect.height;
      layoutP1.style.paddingTop = paddingNeeded + 'px';
    }
    
    if (pageTopP2 && layoutP2) {
      const rect = pageTopP2.getBoundingClientRect();
      const paddingNeeded = rect.top + rect.height;
      layoutP2.style.paddingTop = paddingNeeded + 'px';
    }
  } else {
    const layoutP1 = document.querySelector('#pageP1 .layout');
    const layoutP2 = document.querySelector('#pageP2 .layout');
    if (layoutP1) layoutP1.style.paddingTop = '';
    if (layoutP2) layoutP2.style.paddingTop = '';
  }
}

// Bind all UI event handlers
export function bindEvents(){
  $("btnP1").onclick = ()=>setActivePage("P1");
  $("btnP2").onclick = ()=>setActivePage("P2");

  if ($("themeToggle")) $("themeToggle").addEventListener('click', ()=>toggleTheme());
  
  // Adjust padding on load and resize
  window.addEventListener('resize', adjustContentPadding);
  window.addEventListener('load', adjustContentPadding);
  
  // Re-render schedule on resize to recalculate spanning pill positions
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.activePage === 'P2') {
        renderP2();
      }
    }, 150);
  });
  setTimeout(adjustContentPadding, 100);

  $("searchInput").addEventListener("input", ()=>{ state.page=1; renderP1(); });
  $("filterDept").addEventListener("change", ()=>{ state.activeDept = $("filterDept").value; state.page=1; renderP1(); });
  $("filterCore").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  $("filterDay").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  $("filterMode").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  if ($("filterLocation")) $("filterLocation").addEventListener("change", ()=>{ state.page=1; renderP1(); });
  if ($("p1Sort")) $("p1Sort").addEventListener("change", ()=>{ state.page=1; renderP1(); });

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
      setTimeout(adjustContentPadding, 300);
    };
  }

  $("prevPage").onclick = ()=>{ state.page=Math.max(1,state.page-1); renderP1(); };
  $("nextPage").onclick = ()=>{ state.page=state.page+1; renderP1(); };

  $("btnClear").onclick = ()=>{ clearAll(); renderAll(); };
  $("btnReset").onclick = ()=>{ resetAll(); renderAll(); };
  $("btnClear2").onclick = ()=>{ clearAll(); renderAll(); };
  $("btnReset2").onclick = ()=>{ resetAll(); renderAll(); };

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
  if ($("exportBtn")) $("exportBtn").addEventListener("click", ()=>openExportPicker());
  
  document.addEventListener('click', (e) => {
    if (e.target.id === 'exportPNG') { closeModal(); exportSchedulePNG(); }
    if (e.target.id === 'exportPDF') { closeModal(); exportSchedulePDF(); }
    if (e.target.id === 'exportXLSX') { closeModal(); exportScheduleXLSX(); }
  });

  $("modalClose").onclick = ()=>closeModal();
  document.querySelector("#modal .modal-backdrop").onclick = ()=>closeModal();

  // If user hasn't explicitly set an export width yet, auto-measure
  // the currently rendered schedule width and persist it so exports
  // remain consistent across reloads on this device.
  try {
    if (!localStorage.getItem('exportWidth')) {
      const el = document.querySelector('#scheduleWrap');
      if (el) localStorage.setItem('exportWidth', Math.round(el.getBoundingClientRect().width));
    }
  } catch (e) {
    // ignore storage errors (e.g., disabled storage)
  }
}

// Load html2canvas library dynamically
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

// Export schedule as PNG image
// Removes conflict highlighting from exported image
async function exportSchedulePNG(){
  try{
    const html2canvas = await ensureHtml2Canvas();
    const node = document.querySelector('#scheduleWrap');
    if (!node) return alert('找不到課表節點');
    const table = node.querySelector('table');
    if (!table) {
      // No table: render offscreen clone
      const SCALE = 2;
      const exportWidth = EXPORT_FIXED_WIDTH;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '-99999px';
      wrap.style.top = '0';
      wrap.style.background = getComputedStyle(document.body).backgroundColor || '#ffffff';

      const cloned = node.cloneNode(true);
      cloned.style.width = exportWidth + 'px';
      cloned.style.overflow = 'visible';
      
      // Remove conflict highlighting for clean export
      cloned.querySelectorAll('.has-conflict').forEach(el => el.classList.remove('has-conflict'));
      cloned.querySelectorAll('.conflict').forEach(el => el.classList.remove('conflict'));
      
      wrap.appendChild(cloned);
      document.body.appendChild(wrap);

      const canvas = await html2canvas(cloned, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', width: exportWidth, scale: SCALE});
      document.body.removeChild(wrap);

      await new Promise(resolve => canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `timetable.png`; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png'));
      return;
    }

    // Export table directly
    const clone = table.cloneNode(true);
    
    // Clone tbody and its spanning pills (coursepill-span elements)
    const originalTbody = table.querySelector('tbody');
    const clonedTbody = clone.querySelector('tbody');
    if (originalTbody && clonedTbody) {
      // Copy spanning pills from original tbody
      const spanningPills = originalTbody.querySelectorAll('.coursepill-span');
      spanningPills.forEach(pill => {
        const clonedPill = pill.cloneNode(true);
        clonedTbody.appendChild(clonedPill);
      });
    }
    
    // Remove conflict highlighting for clean export
    clone.querySelectorAll('.has-conflict').forEach(el => el.classList.remove('has-conflict'));
    clone.querySelectorAll('.conflict').forEach(el => el.classList.remove('conflict'));
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.background = getComputedStyle(document.body).backgroundColor || '#ffffff';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const SCALE = 2;
    const exportWidth = EXPORT_FIXED_WIDTH;
    clone.style.width = exportWidth + 'px';
    
    // Recalculate spanning pill positions at export width
    if (clonedTbody) {
      const spanningPills = clonedTbody.querySelectorAll('.coursepill-span');
      spanningPills.forEach(pill => {
        const day = pill.getAttribute('data-day');
        const firstSlot = pill.getAttribute('data-first-slot');
        const lastSlot = pill.getAttribute('data-last-slot');
        
        if (day && firstSlot && lastSlot) {
          const firstCell = clone.querySelector(`.slotcell[data-day="${day}"][data-slot="${firstSlot}"]`);
          const lastCell = clone.querySelector(`.slotcell[data-day="${day}"][data-slot="${lastSlot}"]`);
          
          if (firstCell && lastCell) {
            const firstRect = firstCell.getBoundingClientRect();
            const lastRect = lastCell.getBoundingClientRect();
            const tbodyRect = clonedTbody.getBoundingClientRect();
            
            pill.style.top = `${firstRect.top - tbodyRect.top}px`;
            pill.style.height = `${lastRect.bottom - firstRect.top}px`;
          }
        }
      });
    }

    const canvas = await html2canvas(clone, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', width: exportWidth, scale: SCALE});
    wrapper.remove();
    await new Promise(resolve => canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png'));
  }catch(err){
    console.error('export failed', err);
    alert('匯出失敗：' + (err && err.message));
  }
}

async function exportSchedulePDF(){
  try{
    const html2canvas = await ensureHtml2Canvas();
    const node = document.querySelector('#scheduleWrap');
    if (!node) return alert('找不到課表節點');
    
    const table = node.querySelector('table') || node;
    const clone = table.cloneNode(true);
    
    // Clone tbody and its spanning pills
    const originalTbody = table.querySelector('tbody');
    const clonedTbody = clone.querySelector('tbody');
    if (originalTbody && clonedTbody) {
      const spanningPills = originalTbody.querySelectorAll('.coursepill-span');
      spanningPills.forEach(pill => {
        const clonedPill = pill.cloneNode(true);
        clonedTbody.appendChild(clonedPill);
      });
    }
    
    clone.querySelectorAll('.has-conflict').forEach(el => el.classList.remove('has-conflict'));
    clone.querySelectorAll('.conflict').forEach(el => el.classList.remove('conflict'));
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.background = getComputedStyle(document.body).backgroundColor || '#ffffff';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const SCALE = 2;
    const exportWidth = EXPORT_FIXED_WIDTH;
    clone.style.width = exportWidth + 'px';
    clone.style.height = table.scrollHeight + 'px';
    
    // Recalculate spanning pill positions at export width
    if (clonedTbody) {
      const spanningPills = clonedTbody.querySelectorAll('.coursepill-span');
      spanningPills.forEach(pill => {
        const day = pill.getAttribute('data-day');
        const firstSlot = pill.getAttribute('data-first-slot');
        const lastSlot = pill.getAttribute('data-last-slot');
        
        if (day && firstSlot && lastSlot) {
          const firstCell = clone.querySelector(`.slotcell[data-day="${day}"][data-slot="${firstSlot}"]`);
          const lastCell = clone.querySelector(`.slotcell[data-day="${day}"][data-slot="${lastSlot}"]`);
          
          if (firstCell && lastCell) {
            const firstRect = firstCell.getBoundingClientRect();
            const lastRect = lastCell.getBoundingClientRect();
            const tbodyRect = clonedTbody.getBoundingClientRect();
            
            pill.style.top = `${firstRect.top - tbodyRect.top}px`;
            pill.style.height = `${lastRect.bottom - firstRect.top}px`;
          }
        }
      });
    }

    const canvas = await html2canvas(clone, {backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff', width: exportWidth, scale: SCALE});
    wrapper.remove();
    
    const imgData = canvas.toDataURL('image/png');
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    const pdf = new window.jspdf.jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('timetable.pdf');
  }catch(err){
    console.error('PDF export failed', err);
    alert('PDF 匯出失敗：' + (err && err.message));
  }
}

async function exportScheduleXLSX(){
  try{
    const XLSX = await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
      script.onload = () => resolve(window.XLSX);
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    const days = ["一","二","三","四","五","六"];
    const slots = state.SLOT_TABLE || SLOT_TABLE;
    
    const data = [];
    const header = ['節次', '時間', ...days.map(d => `週${d}`)];
    data.push(header);
    
    // Track which cells should be merged for intercollegiate courses
    const mergeCells = []; // array of {s:{r,c}, e:{r,c}}
    const intercollegiateData = new Map(); // key: "day-firstSlot", value: {course, lastSlot}
    
    // Pre-process intercollegiate courses
    for (const c of state.selectedCourses) {
      if (c.dept && c.dept.includes('校際')) {
        const times = parseTimeToSchedule(c.time);
        if (!times || times.length === 0) continue;
        for (const t of times) {
          if (t.slots && t.slots.length > 1) {
            const firstSlot = t.slots[0];
            const lastSlot = t.slots[t.slots.length - 1];
            const parts = [c.name];
            if (c.teacher) parts.push(c.teacher);
            if (c.location) parts.push(c.location);
                        // Add time info - intercollegiate courses: try NTU times first, fallback to SLOT_TABLE
            let firstSlotInfo = NTU_SLOT_TABLE.find(s => s.code === firstSlot);
            if (!firstSlotInfo) {
              firstSlotInfo = SLOT_TABLE.find(s => s.code === firstSlot);
            }
            
            let lastSlotInfo = NTU_SLOT_TABLE.find(s => s.code === lastSlot);
            if (!lastSlotInfo) {
              lastSlotInfo = SLOT_TABLE.find(s => s.code === lastSlot);
            }
            
            if (firstSlotInfo && lastSlotInfo) {
              const timeStart = String(firstSlotInfo.s).padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
              const timeEnd = String(lastSlotInfo.e).padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2');
              parts.push(`${timeStart} - ${timeEnd}`);
            }
            
            const key = `${t.day}-${firstSlot}`;
            intercollegiateData.set(key, {
              course: parts.join('\n'),
              firstSlot,
              lastSlot,
              slots: t.slots,
              day: t.day
            });
          }
        }
      }
    }
    
    for (const slot of slots) {
      const timeStr = `${String(slot.s).padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2')} - ${String(slot.e).padStart(4,'0').replace(/(\d{2})(\d{2})/,'$1:$2')}`;
      const row = [slot.code, timeStr];
      
      for (const day of days) {
        const courses = [];
        
        // Check if this is the start of an intercollegiate course span
        const interKey = `${day}-${slot.code}`;
        let isPartOfSpan = false;
        
        // Check if this slot is part of any intercollegiate course
        for (const [key, info] of intercollegiateData.entries()) {
          if (info.day === day && info.slots.includes(slot.code)) {
            if (info.firstSlot === slot.code) {
              // This is the first slot - add course info
              courses.push('[\u6821\u969b]\n' + info.course);
              
              // Calculate merge range
              const firstRowIdx = 1 + slots.findIndex(s => s.code === info.firstSlot);
              const lastRowIdx = 1 + slots.findIndex(s => s.code === info.lastSlot);
              const colIdx = 2 + days.indexOf(day);
              
              if (firstRowIdx < lastRowIdx) {
                mergeCells.push({
                  s: {r: firstRowIdx, c: colIdx},
                  e: {r: lastRowIdx, c: colIdx}
                });
              }
            }
            isPartOfSpan = true;
            break;
          }
        }
        
        if (!isPartOfSpan) {
          // Regular courses (non-intercollegiate)
          for (const c of state.selectedCourses) {
            if (c.dept && c.dept.includes('校際')) continue;
            
            const times = parseTimeToSchedule(c.time);
            if (!times || times.length === 0) continue;
            for (const t of times) {
              if (t.day === day && t.slots.includes(slot.code)) {
                const parts = [c.name];
                if (c.teacher) parts.push(c.teacher);
                if (c.location) parts.push(c.location);
                courses.push(parts.join('\n'));
                break;
              }
            }
          }
        }
        
        row.push(courses.join('\n\n'));
      }
      data.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Apply cell merges
    if (mergeCells.length > 0) {
      ws['!merges'] = mergeCells;
    }
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    ws['!cols'] = [{wch: 6}, {wch: 14}, ...days.map(() => ({wch: 18}))];
    ws['!rows'] = data.map((row, idx) => {
      if (idx === 0) return {hpt: 28};
      const maxLines = Math.max(1, ...row.slice(2).map(cell => 
        ((cell || '').match(/\n/g) || []).length + 1
      ));
      return {hpt: Math.max(50, maxLines * 16 + 10)};
    });
    
    const isLight = document.body.classList.contains('light');
    const isGray = document.body.classList.contains('gray');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({r: R, c: C});
        if (!ws[cellRef]) {
          ws[cellRef] = {t: 's', v: ''};
        }
        
        const cellValue = ws[cellRef].v || '';
        const hasContent = cellValue && cellValue.trim() !== '';
        let bgColor, fontColor, borderColor;
        
        if (isLight) {
          if (R === 0) {
            bgColor = 'f3eae0';
            fontColor = '1A202C';
          } else if (C === 0 || C === 1) {
            bgColor = 'fbf7f3';
            fontColor = '1A202C';
          } else if (hasContent) {
            bgColor = 'fffaf7';
            fontColor = '1A202C';
          } else {
            bgColor = 'fefcfa';
            fontColor = '999999';
          }
          borderColor = 'E0E0E0';
        } else if (isGray) {
          if (R === 0) {
            bgColor = '3a3a3a';
            fontColor = 'F0F0F0';
          } else if (C === 0 || C === 1) {
            bgColor = '4a4a4a';
            fontColor = 'DCDCDC';
          } else if (hasContent) {
            bgColor = '525252';
            fontColor = 'E8E8E8';
          } else {
            bgColor = '404040';
            fontColor = '999999';
          }
          borderColor = '5a5a5a';
        } else {
          if (R === 0) {
            bgColor = '0b0d12';
            fontColor = 'FFFFFF';
          } else if (C === 0 || C === 1) {
            bgColor = '0f1320';
            fontColor = 'EAEAEA';
          } else if (hasContent) {
            bgColor = '0c101a';
            fontColor = 'EAEAEA';
          } else {
            bgColor = '0a0c11';
            fontColor = '666666';
          }
          borderColor = '1a1f2b';
        }
        
        ws[cellRef].s = {
          alignment: {
            vertical: 'center',
            horizontal: 'center',
            wrapText: true
          },
          border: {
            top: {style: 'thin', color: {rgb: borderColor}},
            bottom: {style: 'thin', color: {rgb: borderColor}},
            left: {style: 'thin', color: {rgb: borderColor}},
            right: {style: 'thin', color: {rgb: borderColor}}
          },
          font: {
            name: '微軟正黑體',
            sz: R === 0 ? 11 : (C === 0 || C === 1 ? 9 : 10),
            bold: R === 0 || C === 0,
            color: {rgb: fontColor}
          },
          fill: {
            patternType: 'solid',
            fgColor: {rgb: bgColor}
          }
        };
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '課表');
    
    XLSX.writeFile(wb, 'timetable.xlsx');
  }catch(err){
    console.error('XLSX export failed', err);
    alert('Excel 匯出失敗：' + (err && err.message));
  }
}
