import { parseTimeToSchedule } from "./timeParser";
import { checkCourseConflicts } from "./conflictChecker";

export function buildSchedule(courses) {
  const grid = {};

  courses.forEach(course => {
    const time = parseTimeToSchedule(course.timeRaw);
    if (!time) return;

    if (!grid[time.day]) grid[time.day] = {};

    time.slots.forEach(slot => {
      if (!grid[time.day][slot]) {
        grid[time.day][slot] = [];
      }
      grid[time.day][slot].push(course);
    });
  });

  return {
    grid,
    conflicts: checkCourseConflicts(courses),
  };
}
