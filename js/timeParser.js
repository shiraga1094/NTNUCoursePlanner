// Time and schedule parsing utilities
// Handles conversion between course time strings and schedule grid

// Slot time table: maps slot codes to start/end times (HHMM format)
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

// NTU slot times for intercollegiate courses (臺大時間)
export const NTU_SLOT_TABLE = [
  { code: "A", s:1825, e:1915 },
  { code: "B", s:1920, e:2010 },
  { code: "C", s:2015, e:2105 },
  { code: "D", s:2110, e:2200 },
];

// Format time from HHMM to HH:MM
export function formatTime(hhmm) {
  const str = String(hhmm).padStart(4, '0');
  return `${str.substring(0, 2)}:${str.substring(2)}`;
}

// Parse actual time range considering NTU times for ABCD slots
export function parseActualTimeRange(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return null;
  const segments = timeRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  
  for (const seg of segments) {
    const m = seg.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
    if (m) {
      const day = m[1];
      let startCode = m[2];
      let endCode = m[3];
      if (/^\d+$/.test(startCode)) startCode = startCode.padStart(2,'0');
      if (/^\d+$/.test(endCode)) endCode = endCode.padStart(2,'0');
      
      // Use NTU times for ABCD slots
      const useNTU = /[ABCD]/.test(startCode) || /[ABCD]/.test(endCode);
      const table = useNTU ? NTU_SLOT_TABLE : SLOT_TABLE;
      
      const startSlot = table.find(s => s.code === startCode);
      const endSlot = table.find(s => s.code === endCode);
      
      if (startSlot && endSlot) {
        return {
          day,
          startCode,
          endCode,
          startTime: startSlot.s,
          endTime: endSlot.e
        };
      }
    }
  }
  return null;
}

// Parse time string into human-readable format
// Example: "二 3-4 公館 Ｓ401" -> "星期二 第 03-04 節"
export function parseSlot(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return "未排定";
  const segments = timeRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const results = [];
  for (const seg of segments) {
    let m = seg.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
    if (m) {
      const day = m[1];
      let start = m[2];
      let end = m[3];
      if (/^\d+$/.test(start)) start = start.padStart(2,'0');
      if (/^\d+$/.test(end)) end = end.padStart(2,'0');
      results.push(`星期${day} 第 ${start}-${end} 節`);
    } else {
      m = seg.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])/);
      if (m) {
        const day = m[1];
        let slot = m[2];
        if (/^\d+$/.test(slot)) slot = slot.padStart(2,'0');
        results.push(`星期${day} 第 ${slot} 節`);
      }
    }
  }
  return results.length > 0 ? results.join(', ') : timeRaw;
}

// Parse time string into schedule data structure
// Returns array of {day, slots} objects for multi-segment courses
export function parseTimeToSchedule(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return [];
  const segments = timeRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const results = [];
  
  for (const seg of segments) {
    let m = seg.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
    if (m) {
      const day = m[1];
      let startSlot = m[2];
      let endSlot = m[3];
      if (/^\d+$/.test(startSlot)) startSlot = startSlot.padStart(2,'0');
      if (/^\d+$/.test(endSlot)) endSlot = endSlot.padStart(2,'0');

      const all = SLOT_TABLE.map(s => s.code);
      const si = all.indexOf(startSlot);
      const ei = all.indexOf(endSlot);
      if (si !== -1 && ei !== -1) {
        const slots = [];
        for (let i = si; i <= ei; i++) slots.push(all[i]);
        results.push({ day, slots });
      }
    } else {
      m = seg.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])/);
      if (m) {
        const day = m[1];
        let slot = m[2];
        if (/^\d+$/.test(slot)) slot = slot.padStart(2,'0');
        
        const all = SLOT_TABLE.map(s => s.code);
        if (all.includes(slot)) {
          results.push({ day, slots: [slot] });
        }
      }
    }
  }
  
  return results;
}

// Extract location from time string
export function parseLocation(timeRaw){
  if (!timeRaw || timeRaw.trim() === "") return "";
  const segments = timeRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const locations = [];
  
  for (const seg of segments) {
    let m = seg.match(/([一二三四五六日])\s*(?:\d{1,2}|[A-D])\s*[-－]\s*(?:\d{1,2}|[A-D])\s*(.+)/);
    if (m && m[2]) {
      const loc = m[2].trim();
      if (!locations.includes(loc)) locations.push(loc);
    } else {
      m = seg.match(/([一二三四五六日])\s*(?:\d{1,2}|[A-D])\s+(.+)/);
      if (m && m[2]) {
        const loc = m[2].trim();
        if (!locations.includes(loc)) locations.push(loc);
      }
    }
  }
  
  return locations.join(', ');
}

// Extract campus key from location string (e.g., "公館", "和平")
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

// Get index of day in week (0-6)
export function dayIndex(d){
  return ["一","二","三","四","五","六","日"].indexOf(d);
}

// Get index of slot code in SLOT_TABLE
export function slotIndex(code){
  return SLOT_TABLE.map(s=>s.code).indexOf(code);
}
