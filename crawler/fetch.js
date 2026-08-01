// NTNU Course API Crawler
// Fetches course data from NTNU's course selection system

import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

// API endpoints
const BASE = "https://courseap2.itc.ntnu.edu.tw";
const INDEX = `${BASE}/acadmOpenCourse/index.jsp`;
const API = `${BASE}/acadmOpenCourse/CofopdlCtrl`;
const DEPT_API = `${BASE}/acadmOpenCourse/CofnameCtrl`;
const GU_API = `${BASE}/acadmOpenCourse/cofopdlGeneral.do`;
const DENSE_API = `${BASE}/acadmOpenCourse/coftmscDate.do`;

// General education core codes
const GU_CORE = ["A1UG","A2UG","A3UG","A4UG","B1UG","B2UG","B3UG","C1UG","C2UG"];
const GU_MAP = {
  "人文藝術":"A1UG","社會科學":"A2UG","自然科學":"A3UG","邏輯運算":"A4UG",
  "學院共同課程":"B1UG","跨域專業探索課程":"B2UG","大學入門":"B3UG",
  "專題探究":"C1UG","MOOCs":"C2UG"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Create HTTP client with session cookies
export async function createClient() {
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 60000,
    headers: {
      "Referer": INDEX,
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "zh-TW,zh;q=0.9"
    }
  }));
  await client.get(INDEX);
  await sleep(1000);
  return client;
}

// Build base request parameters
function baseParams(year, term, dept) {
  return {
    _dc: Date.now(),
    acadmYear: year,
    acadmTerm: term,
    deptCode: dept,
    action: "showGrid",
    language: "chinese",
    start: 0,
    limit: 2000,
    page: 1,
    chn: "", engTeach: "N", clang: "N", moocs: "N",
    remoteCourse: "N", digital: "N", adsl: "N",
    zuDept: "", classCode: "", kind: "",
    generalCore: "", teacher: "", serial_number: "", course_code: ""
  };
}

// Safe GET request with rate limiting
async function safeGet(client, url, params) {
  try {
    const r = await client.get(url, { params });
    await sleep(100);
    return r;
  } catch {
    await sleep(1000);
    return null;
  }
}

// Main fetch function: get all courses for a given semester
export async function fetchAll(year, term) {
  const client = await createClient();
  console.log(`  → 正在獲取科系列表...`);

  // 1) Fetch department list
  const deptRes = await safeGet(client, DEPT_API, {
    _dc: Date.now(), action: "cof", type: "chn",
    year, term, page: 1, start: 0, limit: 25
  });
  const deptList = deptRes ? JSON.parse(deptRes.data.replace(/'/g,'"')) : [];
  const depts = deptList.map(d => d[0]);
  const deptNames = Object.fromEntries(deptList);
  
  console.log(`  → 找到 ${depts.length} 個科系`);

  const all = [];

  // 2) Fetch courses by department (split GU into core categories)
  for (let i = 0; i < depts.length; i++) {
    const dept = depts[i];
    const deptName = deptNames[dept] || dept;
    
    if (dept === "GU") {
      console.log(`  → [${i+1}/${depts.length}] 抓取 ${deptName} (通識)`);
      for (const core of GU_CORE) {
        const p = baseParams(year, term, "GU");
        p.kind = 3;
        p.generalCore = core;
        const r = await safeGet(client, API, p);
        if (r?.data?.List) {
          console.log(`     · ${core}: ${r.data.List.length} 門課程`);
          for (const c of r.data.List) {
            c.generalCore = c.generalCore ? `${c.generalCore}/${core}` : core;
            all.push(c);
          }
        }
      }
    } else {
      const r = await safeGet(client, API, baseParams(year, term, dept));
      if (r?.data?.List) {
        console.log(`  → [${i+1}/${depts.length}] ${deptName}: ${r.data.List.length} 門課程`);
        all.push(...r.data.List);
      } else {
        console.log(`  → [${i+1}/${depts.length}] ${deptName}: 無資料`);
      }
    }
  }

  // 3) Deduplicate courses by serial_no
  console.log(`  → 去除重複課程... (原始: ${all.length} 門)`);
  const seen = new Set();
  const uniq = [];
  for (const c of all) {
    const key = c.serial_no || `${c.course_code}-${c.course_group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(c);
  }
  console.log(`  → 去重後: ${uniq.length} 門課程`);

  // 4) Enrich courses with GE core info and intensive course dates
  const denseMap = {};
  let guCoreCount = 0;
  let denseCount = 0;
  
  console.log(`  → 補充課程詳細資訊...`);
  for (let i = 0; i < uniq.length; i++) {
    const c = uniq[i];
    
    // Fetch GE core category for general education courses
    if (c.option_code === "通" && !c.generalCore) {
      const r = await safeGet(client, GU_API, {
        _dc: Date.now(), action: "show",
        acadmYear: c.acadm_year, acadmTerm: c.acadm_term,
        courseCode: c.course_code, courseGroup: c.course_group,
        deptCode: c.dept_code, deptGroup: c.dept_group_name || "",
        formS: c.form_s || "", aClass: c.classes || "", language: "chinese"
      });
      const m = /109以後入學：([^<]+)/.exec(r?.data?.msg || "");
      if (m && GU_MAP[m[1].trim()]) {
        c.generalCore = GU_MAP[m[1].trim()];
        guCoreCount++;
      }
    }

    // Fetch intensive course schedule details
    if ((c.time_inf || "").includes("密集課程")) {
      const r = await safeGet(client, DENSE_API, {
        _dc: Date.now(), action: "show",
        acadmYear: c.acadm_year, acadmTerm: c.acadm_term,
        courseCode: c.course_code, courseGroup: c.course_group,
        deptCode: c.dept_code, deptGroup: c.dept_group_name || "",
        formS: c.form_s || "", aClass: c.classes || "", language: "chinese"
      });
      denseMap[`${c.course_code}-${c.course_group}`] = r?.data?.msg || "";
      denseCount++;
    }
    
    // Progress indicator every 100 courses
    if ((i + 1) % 100 === 0) {
      console.log(`     · 已處理 ${i + 1}/${uniq.length} 門課程...`);
    }
  }
  
  if (guCoreCount > 0) console.log(`  → 補充通識核心: ${guCoreCount} 門`);
  if (denseCount > 0) console.log(`  → 密集課程: ${denseCount} 門`);

  return { courses: uniq, denseMap };
}
