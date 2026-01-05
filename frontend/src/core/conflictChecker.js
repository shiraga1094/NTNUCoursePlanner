import { parseTimeToSchedule } from "./timeParser";

export function checkCourseConflicts(courses) {
  const conflicts = [];

  for (let i = 0; i < courses.length; i++) {
    const a = parseTimeToSchedule(courses[i].timeRaw);
    if (!a) continue;

    for (let j = i + 1; j < courses.length; j++) {
      const b = parseTimeToSchedule(courses[j].timeRaw);
      if (!b) continue;

      if (a.day !== b.day) continue;

      const overlap = a.slots.some(s => b.slots.includes(s));
      if (overlap) {
        conflicts.push([courses[i], courses[j]]);
      }
    }
  }

  return conflicts;
}
