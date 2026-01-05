import { useEffect, useState } from "react";

export default function useCourses() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetch("/data/courses.json")
      .then(res => res.json())
      .then(raw => {
        setCourses(raw.map((r, idx) => normalize(r, idx)));
      });
  }, []);

  return courses;
}

function normalize(r, idx) {
  return {
    id: `${r.course_code || "NO_CODE"}#${idx}`,
    code: r.course_code,
    group: r.course_group || "",
    name: r.chn_name,
    credit: Number(r.credit || 0),
    dept: r.dept_chiabbr || r.dept_code,
    teacher: r.teacher,
    timeRaw: r.time_inf,
    raw: r
  };
}
