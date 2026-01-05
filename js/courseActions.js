import { state } from './state.js';
import { denseKey } from './courseData.js';
import { isSaved, isSelected } from './filters.js';
import { saveToStorage } from './storage.js';
import { parseTimeToSchedule } from './timeParser.js';

export function addToSaved(course){
  const key = denseKey(course);
  if (isSaved(key)) return;
  state.savedCourses.push(course);
  saveToStorage();
}

export function removeSaved(key){
  state.savedCourses = state.savedCourses.filter(c=>denseKey(c) !== key);
  state.selectedCourses = state.selectedCourses.filter(c=>denseKey(c) !== key);
  saveToStorage();
}

function checkNewCourseConflict(newCourse){
  const newInfo = parseTimeToSchedule(newCourse.time);
  if (!newInfo) return [];
  const conflicts = [];
  for (const ex of state.selectedCourses){
    const exInfo = parseTimeToSchedule(ex.time);
    if (!exInfo) continue;
    if (newInfo.day !== exInfo.day) continue;
    const overlap = newInfo.slots.some(s => exInfo.slots.includes(s));
    if (overlap) conflicts.push(ex);
  }
  return conflicts;
}

export function toggleSelected(key, onConflict){
  const course = state.savedCourses.find(c=>denseKey(c)===key);
  if (!course) return;

  if (isSelected(key)){
    state.selectedCourses = state.selectedCourses.filter(c=>denseKey(c)!==key);
    saveToStorage();
    return { success: true };
  }

  const conflicts = checkNewCourseConflict(course);
  if (conflicts.length){
    return { success: false, conflicts };
  }

  state.selectedCourses.push(course);
  saveToStorage();
  return { success: true };
}
