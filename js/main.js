let excelData = [];
let departments = [];
let denseMap = [];

let savedCourses = [];
let selectedCourses = [];

async function init() {
    excelData = await DataLoader.loadCourses();
    departments = await DataLoader.loadDepartments();
    denseMap = await DataLoader.loadDenseMap();

    loadFromStorage();

    buildDeptOptions();
    buildScheduleTable();
    render();
    renderSaved();
    renderSchedule();
}

init().catch(err => {
    console.error("初始化失敗", err);
});
