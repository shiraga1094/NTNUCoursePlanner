export const SLOT_TABLE = [
  { code: "00", s:710, e:800 },
  { code: "01", s:810, e:900 },
  { code: "02", s:910, e:1000 },
  { code: "03", s:1020, e:1110 },
  { code: "04", s:1120, e:1210 },
  { code: "05", s:1220, e:1310 },
  { code: "06", s:1320, e:1410 },
  { code: "07", s:1420, e:1510 },
  { code: "08", s:1530, e:1620 },
  { code: "09", s:1630, e:1720 },
  { code: "10", s:1730, e:1820 },
  { code: "A",  s:1840, e:1930 },
  { code: "B",  s:1935, e:2025 },
  { code: "C",  s:2030, e:2120 },
  { code: "D",  s:2125, e:2215 },
];

export function parseSlot(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return "未排定";
  let m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let start = m[2];
    let end = m[3];
    if (/^\d+$/.test(start)) start = start.padStart(2,'0');
    if (/^\d+$/.test(end)) end = end.padStart(2,'0');
    return `星期${day} 第 ${start}-${end} 節`;
  }
  return timeRaw;
}

export function parseTimeToSchedule(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return null;
  let m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let startSlot = m[2];
    let endSlot = m[3];
    if (/^\d+$/.test(startSlot)) startSlot = startSlot.padStart(2,'0');
    if (/^\d+$/.test(endSlot)) endSlot = endSlot.padStart(2,'0');

    const all = SLOT_TABLE.map(s => s.code);
    const si = all.indexOf(startSlot);
    const ei = all.indexOf(endSlot);
    if (si === -1 || ei === -1) return null;
    const slots = [];
    for (let i = si; i <= ei; i++) slots.push(all[i]);
    return { day, slots };
  }
  return null;
}

export function parseLocation(timeRaw){
  if (!timeRaw || timeRaw.trim() === "") return "";
  const m = timeRaw.match(/([一二三四五六日])\s*(?:\d{1,2}|[A-D])\s*[-－]\s*(?:\d{1,2}|[A-D])\s*(.+)/);
  if (m && m[2]) return m[2].trim();
  return "";
}

export function placeKey(locationRaw){
  if (!locationRaw) return "";
  const parts = String(locationRaw).split(/[\s,、·]+/).map(p=>p.trim()).filter(Boolean);
  const keep = [];
  for (const original of parts){
    let t = original;
    t = t.replace(/\(.*?\)|（.*?）/g, '').replace(/(教室|室|號樓|樓|號|樓層)/g, '').trim();
    t = t.replace(/[A-Za-zＡ-Ｚａ-ｚ0-9０-９\-]+$/,'').trim();
    if (/[\p{Script=Han}\u3040-\u30ff]/u.test(t)){
      keep.push(t);
      continue;
    }
    const m = original.match(/([\p{Script=Han}\u3040-\u30ff]*分(?:部|校|區)[\p{Script=Han}\u3040-\u30ff]*)/u);
    if (m) { keep.push(m[1]); continue; }
  }
  const unique = Array.from(new Set(keep.filter(Boolean)));
  const key = unique.join(' ').replace(/\s+/g,' ').trim();
  const raw = (key || locationRaw || "").toString();
  if (/公館/.test(raw)) return '公館分部';
  if (/和平|本部/.test(raw)) return '和平本部';
  return "";
}

export function dayIndex(d){
  return ["一","二","三","四","五","六","日"].indexOf(d);
}

export function slotIndex(code){
  return SLOT_TABLE.map(s=>s.code).indexOf(code);
}
