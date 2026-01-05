import { state } from './state.js';

export function saveToStorage(){
  if (!state.currentTerm) return;
  const key = `savedCourses_${state.currentTerm}`;
  const key2 = `selectedCourses_${state.currentTerm}`;
  localStorage.setItem(key, JSON.stringify(state.savedCourses));
  localStorage.setItem(key2, JSON.stringify(state.selectedCourses));
  localStorage.setItem("lastTerm", state.currentTerm);
}

export function loadFromStorage(){
  if (!state.currentTerm) return;
  const key = `savedCourses_${state.currentTerm}`;
  const key2 = `selectedCourses_${state.currentTerm}`;
  try { state.savedCourses = JSON.parse(localStorage.getItem(key) || "[]"); } catch { state.savedCourses=[]; }
  try { state.selectedCourses = JSON.parse(localStorage.getItem(key2) || "[]"); } catch { state.selectedCourses=[]; }
}

export function clearAll(){
  state.savedCourses = [];
  state.selectedCourses = [];
  saveToStorage();
}

export function resetAll(){
  if (!state.currentTerm) return;
  localStorage.removeItem(`savedCourses_${state.currentTerm}`);
  localStorage.removeItem(`selectedCourses_${state.currentTerm}`);
  state.savedCourses = [];
  state.selectedCourses = [];
}
