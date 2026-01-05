import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAll } from "./fetch.js";

// ===== 路徑：以檔案位置為基準（不會漂）=====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const CONFIG_FILE = path.join(__dirname, "config.json");

// ===== 確保 data/ 存在 =====
fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== 學期計算函數 =====
function getPreviousTerm(year, term) {
  if (term === 1) {
    return { year: year - 1, term: 3 };
  } else {
    return { year, term: term - 1 };
  }
}

function getNextTerm(year, term) {
  if (term === 3) {
    return { year: year + 1, term: 1 };
  } else {
    return { year, term: term + 1 };
  }
}

// ===== 載入/儲存配置 =====
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.log("無法載入配置，使用預設值");
  }
  // 預設配置：起始學期 114-2
  return { currentYear: 114, currentTerm: 2 };
}

function saveConfig(year, term) {
  const config = { currentYear: year, currentTerm: term };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

// ===== 自動抓取所有學期 =====
async function fetchAllSemesters() {
  const config = loadConfig();
  let currentYear = config.currentYear;
  let currentTerm = config.currentTerm;
  
  console.log(`\n========== 當前學期設定：${currentYear}-${currentTerm} ==========`);
  
  // 嘗試抓取當前學期的下一個學期（檢查是否有新學期）
  const next = getNextTerm(currentYear, currentTerm);
  console.log(`\n檢查新學期 ${next.year}-${next.term} 是否可用...`);
  
  try {
    const { courses } = await fetchAll(next.year, next.term);
    if (courses && courses.length > 0) {
      console.log(`✓ 發現新學期！更新當前學期為 ${next.year}-${next.term}`);
      currentYear = next.year;
      currentTerm = next.term;
      saveConfig(currentYear, currentTerm);
    } else {
      console.log(`✗ 新學期尚未開放，維持當前學期 ${currentYear}-${currentTerm}`);
    }
  } catch (err) {
    console.log(`✗ 新學期尚未開放，維持當前學期 ${currentYear}-${currentTerm}`);
  }
  
  // 從當前學期往前推6個學期
  const termsToFetch = [];
  let y = currentYear;
  let t = currentTerm;
  
  for (let i = 0; i < 6; i++) {
    termsToFetch.push({ year: y, term: t });
    const prev = getPreviousTerm(y, t);
    y = prev.year;
    t = prev.term;
  }
  
  console.log(`\n========== 將抓取以下學期 ==========`);
  termsToFetch.forEach(({ year, term }) => {
    console.log(`  - ${year}-${term}`);
  });
  console.log(`==============================\n`);
  
  let successCount = 0;
  let skipCount = 0;

  for (const { year, term } of termsToFetch) {
    const semesterName = `${year}-${term}`;
    const outDir = path.join(DATA_DIR, semesterName);
    
    console.log(`\n[${semesterName}] 開始抓取...`);
    
    try {
      const { courses, denseMap } = await fetchAll(year, term);
      
      if (!courses || courses.length === 0) {
        console.log(`[${semesterName}] 沒有課程資料，跳過`);
        skipCount++;
      } else {
        // 建立學期目錄
        fs.mkdirSync(outDir, { recursive: true });
        
        // 儲存 courses.json
        fs.writeFileSync(
          path.join(outDir, "courses.json"),
          JSON.stringify(courses, null, 2),
          "utf8"
        );
        
        // 儲存 dense.json
        fs.writeFileSync(
          path.join(outDir, "dense.json"),
          JSON.stringify(denseMap, null, 2),
          "utf8"
        );
        
        console.log(`[${semesterName}] ✓ 成功抓取 ${courses.length} 門課程`);
        console.log(`[${semesterName}] 儲存至: ${outDir}`);
        
        successCount++;
      }
    } catch (err) {
      console.error(`[${semesterName}] ✗ 錯誤: ${err.message}`);
      skipCount++;
    }
    
    // 防止過度請求
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n========== 抓取完成 ==========`);
  console.log(`當前學期: ${currentYear}-${currentTerm}`);
  console.log(`成功: ${successCount} 個學期`);
  console.log(`跳過: ${skipCount} 個學期`);
  console.log(`資料儲存於: ${DATA_DIR}`);
}

(async () => {
  await fetchAllSemesters();
})().catch(err => {
  console.error(err);
  process.exit(1);
});

