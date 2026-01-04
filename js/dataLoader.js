(function () {
    let cachedCourses = null;
    let cachedDense = null;

    async function loadCourses() {
        if (cachedCourses) return cachedCourses;

        const res = await fetch("data/courses.json");
        if (!res.ok) throw new Error("無法載入 courses.json");

        const raw = await res.json();

        cachedCourses = raw.map(c => ({
            "開課代碼": c.course_code || "",
            "中文課程名稱": c.chn_name || "",
            "系所": c.dept_chiabbr || c.dept_code || "",
            "教師": c.teacher || "",
            "必/選": c.option_code || "",
            "學分": c.credit || "",
            "地點時間": c.time_inf || "",
            "限修條件": c.restrict || "",
            "組": c.course_group || "",
            "年": c.form_s || "",
            "班": c.classes || "",

            // 保留 raw（未來用）
            __raw: c
        }));

        return cachedCourses;
    }

    async function loadDenseMap() {
        if (cachedDense) return cachedDense;

        try {
            const res = await fetch("data/dense.json");
            if (!res.ok) {
                cachedDense = {};
                return cachedDense;
            }
            cachedDense = await res.json();
            return cachedDense;
        } catch {
            cachedDense = {};
            return cachedDense;
        }
    }

    async function loadDepartments() {
        const courses = await loadCourses();
        const set = new Set();
        courses.forEach(c => {
            if (c["系所"]) set.add(c["系所"]);
        });
        return Array.from(set).sort();
    }

    // 👉 掛到全域（這就是你原本在用的模型）
    window.DataLoader = {
        loadCourses,
        loadDenseMap,
        loadDepartments
    };
})();
