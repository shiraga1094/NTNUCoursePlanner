import { state } from './state.js';
import { $, deptMatchesCategory } from './utils.js';
import { denseKey } from './courseData.js';
import { parseTimeToSchedule } from './timeParser.js';

export function isSaved(key){
  return state.savedCourses.some(c=>denseKey(c) === key);
}

export function isSelected(key){
  return state.selectedCourses.some(c=>denseKey(c) === key);
}

export function getFilteredCourses(strictOverride){
  const kw = $("searchInput").value.trim().toLowerCase();
  const dept = $("filterDept").value || state.activeDept || "";
  const core = $("filterCore").value;
  const day = $("filterDay").value;
  const loc = $("filterLocation") ? $("filterLocation").value || "" : "";
  const mode = $("filterMode").value;

  return state.courses.filter(c=>{
    if (dept){
      if (dept.startsWith("__")){
        if (dept === "__COMMON__" && !deptMatchesCategory(c.dept, 'COMMON')) return false;
        if (dept === "__SPORTS__" && !deptMatchesCategory(c.dept, 'SPORTS')) return false;
        if (dept === "__DEFENSE__" && !deptMatchesCategory(c.dept, 'DEFENSE')) return false;
        if (dept === "__EXCHANGE__" && !deptMatchesCategory(c.dept, 'EXCHANGE')) return false;
        if (dept.startsWith("__PROGRAM__")) {
          const programName = dept.replace("__PROGRAM__", "");
          if (!c.programs || !c.programs.includes(programName)) return false;
        }
      } else {
        if (c.dept !== dept) return false;
      }
    }
    if (loc){
      const pk = c.location.toLowerCase();
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

    if (state.selectedSlotKeys.size > 0){
      const info = parseTimeToSchedule(c.time);
      if (!info) return false;
      const courseKeys = (info.slots || []).map(s => `${info.day}-${s}`);
      if (courseKeys.length === 0) return false;
      const effectiveStrict = (typeof strictOverride !== 'undefined') ? strictOverride : state.strictSlotSearch;
      if (effectiveStrict){
        const ok = courseKeys.every(k2 => state.selectedSlotKeys.has(k2));
        if (!ok) return false;
      } else {
        const ok = courseKeys.some(k2 => state.selectedSlotKeys.has(k2));
        if (!ok) return false;
      }
    }

    return true;
  });
}
