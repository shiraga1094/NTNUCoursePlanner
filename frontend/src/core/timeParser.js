// 節次對照表
export const SLOT_TABLE = [
  { code: "00", s: 710, e: 800 },
  { code: "01", s: 810, e: 900 },
  { code: "02", s: 910, e: 1000 },
  { code: "03", s: 1020, e: 1110 },
  { code: "04", s: 1120, e: 1210 },
  { code: "05", s: 1220, e: 1310 },
  { code: "06", s: 1320, e: 1410 },
  { code: "07", s: 1420, e: 1510 },
  { code: "08", s: 1530, e: 1620 },
  { code: "09", s: 1630, e: 1720 },
  { code: "10", s: 1730, e: 1820 },
  { code: "A", s: 1840, e: 1930 },
  { code: "B", s: 1935, e: 2025 },
  { code: "C", s: 2030, e: 2120 },
  { code: "D", s: 2125, e: 2215 },
];

export function parseSlot(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return "未排定";

  let m = timeRaw.match(
    /([一二三四五六日])[,，]?(\d{3,4})[~\-－]([一二三四五六日]?)[,，]?(\d{3,4})/
  );
  if (m) {
    const day = m[1];
    const start = parseInt(m[2].padStart(4, "0"));
    const end = parseInt((m[4] || m[3]).padStart(4, "0"));
    const slots = SLOT_TABLE.filter(s => s.s < end && s.e > start);
    if (slots.length === 0) return "未排定";
    return `星期${day} 第 ${slots[0].code}-${slots.at(-1).code} 節`;
  }

  m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let start = m[2];
    let end = m[3];
    if (/^\d+$/.test(start)) start = start.padStart(2, "0");
    if (/^\d+$/.test(end)) end = end.padStart(2, "0");
    return `星期${day} 第 ${start}-${end} 節`;
  }

  return timeRaw;
}

export function parseTimeToSchedule(timeRaw) {
  if (!timeRaw || timeRaw.trim() === "") return null;

  let m = timeRaw.match(
    /([一二三四五六日])[,，]?(\d{3,4})[~\-－]([一二三四五六日]?)[,，]?(\d{3,4})/
  );
  if (m) {
    const day = m[1];
    const start = parseInt(m[2].padStart(4, "0"));
    const end = parseInt((m[4] || m[3]).padStart(4, "0"));
    const slots = SLOT_TABLE.filter(s => s.s < end && s.e > start).map(s => s.code);
    return { day, slots };
  }

  m = timeRaw.match(/([一二三四五六日])\s*(\d{1,2}|[A-D])\s*[-－]\s*(\d{1,2}|[A-D])/);
  if (m) {
    const day = m[1];
    let startSlot = m[2];
    let endSlot = m[3];
    if (/^\d+$/.test(startSlot)) startSlot = startSlot.padStart(2, "0");
    if (/^\d+$/.test(endSlot)) endSlot = endSlot.padStart(2, "0");

    const all = SLOT_TABLE.map(s => s.code);
    const startIdx = all.indexOf(startSlot);
    const endIdx = all.indexOf(endSlot);
    if (startIdx === -1 || endIdx === -1) return null;

    return {
      day,
      slots: all.slice(startIdx, endIdx + 1),
    };
  }

  return null;
}
