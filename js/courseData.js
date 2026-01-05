import { parseLocation } from './timeParser.js';

const CORE_MAP = {
  "A1UG": "人文藝術",
  "A2UG": "社會科學",
  "A3UG": "自然科學",
  "A4UG": "邏輯運算",
  "B1UG": "學院共同課程",
  "B2UG": "跨域專業探索課程",
  "B3UG": "大學入門",
  "C1UG": "專題探究",
  "C2UG": "MOOCs"
};

function mapCoreLabel(raw){
  if (!raw) return "";
  const parts = String(raw).split(/[\/,]+/).map(s=>s.trim()).filter(Boolean);
  const mapped = parts.map(p => CORE_MAP[p] || p);
  return Array.from(new Set(mapped)).join(" / ");
}

export function normalizeCourse(raw){
  let courseName = (raw.chn_name || "").replaceAll("</br>", " ").replaceAll("<br>", " ");
  let programs = [];
  
  const programMatch = courseName.match(/\[\s*學分學程[：:](.*?)\]/i);
  if (programMatch) {
    const programText = programMatch[1].trim();
    programs = programText.split(/\s+/).filter(Boolean);
    courseName = courseName.replace(/\s*\[\s*學分學程[：:].*?\]\s*/i, "").trim();
  }
  
  return {
    code: raw.course_code || "",
    name: courseName,
    teacher: raw.teacher || "",
    dept: raw.dept_chiabbr || raw.dept_code || "",
    credit: Number(raw.credit || 0),
    time: raw.time_inf || "",
    location: parseLocation(raw.time_inf) || "",
    group: raw.course_group || "",
    core: mapCoreLabel(raw.generalCore) || "",
    restrict: raw.restrict || "",
    programs: programs,
    engTeach: raw.eng_teach === "是",
    __raw: raw
  };
}

export function denseKey(course){
  return `${course.code}-${course.group || ""}`;
}
