export const state = {
  courses: [],
  denseMap: {},
  savedCourses: [],
  selectedCourses: [],
  currentTerm: "",
  availableTerms: [],
  activePage: "P1",
  activeDept: "",
  page: 1,
  PAGE_SIZE: 20,
  selectedSlotKeys: new Set(),
  strictSlotSearch: true,
  _slotDragging: false,
  _slotDragAdd: true,
  _slotMouseDownKey: null
};

export function resetCourseData() {
  state.courses = [];
  state.denseMap = {};
  state.savedCourses = [];
  state.selectedCourses = [];
}
