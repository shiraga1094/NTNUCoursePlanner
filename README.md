# NTNU Course Planner / NTNU 課程排課系統

## 專案簡介 / Project Description

本專案為國立臺灣師範大學課程查詢與選課規劃系統，提供學生便捷的課程搜尋、篩選及課表規劃功能。

This project is a course search and schedule planning system for National Taiwan Normal University (NTNU), providing students with convenient course search, filtering, and timetable planning features.

## 主要功能 / Key Features

- **課程搜尋** / Course Search
  - 支援課名、課碼、教師姓名關鍵字搜尋
  - Multiple search options: course name, course code, instructor name

- **進階篩選** / Advanced Filtering
  - 系所分類篩選 / Department filtering
  - 通識向度篩選 / General education category filtering
  - 星期與節次篩選 / Day and time slot filtering
  - 上課地點篩選 / Location filtering

- **課表規劃** / Schedule Planning
  - 視覺化課表檢視 / Visual timetable view
  - 衝堂檢測 / Conflict detection
  - 學分計算 / Credit calculation
  - 課程清單管理 / Course list management

- **多種匯出格式** / Multiple Export Formats
  - PNG 圖片匯出 / PNG image export
  - PDF 文件匯出 / PDF document export
  - Excel (XLSX) 表格匯出 / Excel spreadsheet export

- **響應式設計** / Responsive Design
  - 支援桌面與行動裝置 / Desktop and mobile support
  - 三種主題切換（深色/淺色/灰色）/ Three theme options (dark/light/gray)

## 資料來源聲明 / Data Source Declaration

本系統所使用之課程資料來源為**國立臺灣師範大學**公開課程資訊。

**重要聲明：**
- 本專案僅供**學術研究與教育用途**使用
- 所有課程資料之著作權與所有權歸屬於國立臺灣師範大學
- 本系統非官方選課系統，僅作為課程查詢與規劃輔助工具
- 實際選課結果與課程資訊以學校官方系統為準
- 使用者應遵守學校相關規定與著作權法

**資料更新：**
- 課程資料定期自學校公開資訊更新
- 如發現資料有誤，請以學校官方公告為準


The course data used in this system is sourced from publicly available course information from **National Taiwan Normal University (NTNU)**.

**Important Notice:**
- This project is intended for **academic research and educational purposes only**
- All course data copyright and ownership belong to National Taiwan Normal University
- This is NOT an official course registration system, but rather a course search and planning tool
- Actual course registration and information should be verified with the university's official system
- Users must comply with university regulations and copyright laws

**Data Updates:**
- Course data is periodically updated from publicly available university information
- In case of any discrepancies, please refer to official university announcements

## 快速開始 / Getting Started

### 線上使用 / Online Usage

直接訪問網站：[https://shiraga1094.github.io/CoursePlanner/](https://shiraga1094.github.io/CoursePlanner/)

Visit the website directly: [https://shiraga1094.github.io/CoursePlanner/](https://shiraga1094.github.io/CoursePlanner/)

### 本地運行 / Local Development

```bash
# 克隆專案 / Clone the repository
git clone https://github.com/shiraga1094/CoursePlanner.git

# 進入專案目錄 / Navigate to project directory
cd CoursePlanner

# 使用任意網頁伺服器運行 / Run with any web server
# 例如 Python / For example, Python:
python -m http.server 8000

# 或使用 Node.js / Or Node.js:
npx serve
```

然後在瀏覽器開啟 `http://localhost:8000`

Then open `http://localhost:8000` in your browser

## 免責聲明 / Disclaimer


1. 本系統提供之課程資訊僅供參考，實際課程內容、時間、地點等資訊以學校公告為準
2. 使用者須自行負責確認選課結果與課程安排
3. 開發者不對因使用本系統而產生的任何問題負責
4. 本專案與國立臺灣師範大學無正式關聯
5. 使用本系統即表示同意以上聲明

##

1. Course information provided by this system is for reference only; actual course content, time, and location should be verified with official university announcements
2. Users are responsible for confirming their course registration and schedule
3. The developers are not responsible for any issues arising from the use of this system
4. This project has no official affiliation with National Taiwan Normal University
5. By using this system, you agree to the above statements

## 授權 / License

本專案採用 MIT License 授權 - 詳見 [LICENSE](LICENSE) 文件

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


**最後更新 / Last Updated:** 2026-01

**版本 / Version:** 1.0.0
