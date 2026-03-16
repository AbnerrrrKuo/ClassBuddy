const stageData = {
  1: {
    tag: "阶段一 · 幼年期",
    energy: "48 Energy",
    description: "形象呆萌、体型较小、无特殊装备，是刚被激励点燃的小小潜力股。"
  },
  2: {
    tag: "阶段二 · 成长期",
    energy: "108 Energy",
    description: "体型增大、穿戴初级装备并散发微光，代表稳定持续的课堂参与表现。"
  },
  3: {
    tag: "阶段三 · 完全体",
    energy: "168 Energy",
    description: "拥有终极外观与耀眼光效，是课堂模范与班级荣誉感的视觉化象征。"
  }
};

const PET_MILESTONES = {
  1: { label: "阶段一 · 幼年期", min: 0, max: 50 },
  2: { label: "阶段二 · 成长期", min: 51, max: 150 },
  3: { label: "阶段三 · 完全体", min: 151, max: Infinity }
};

const REWARD_CONFIG = {
  "积极发言": 10,
  "作业优秀": 20,
  "小组协作": 15,
  "遵守纪律": 5
};

const PET_SERIES_ASSET_PREFIX = {
  "救援犬系列": "rescue-dog",
  "光之巨人系列": "light-giant",
  "魔法精灵系列": "magic-elf"
};

const CLASSBUDDY_STORAGE_KEY = "classbuddy-shared-state-v1";
const CLASSBUDDY_AUTH_KEY = "classbuddy-admin-session-v1";
const CLASSBUDDY_ADMIN_CREDENTIALS = {
  username: "admin",
  password: "ClassBuddy2026!"
};
const CLASSBUDDY_INITIAL_STATE = {
  students: [
    { id: "stu-luna", name: "Luna", petType: "救援犬系列", energy: 168, createdAt: "2026-03-15", lastRewardLabel: "作业优秀" },
    { id: "stu-milo", name: "Milo", petType: "光之巨人系列", energy: 108, createdAt: "2026-03-15", lastRewardLabel: "积极发言" },
    { id: "stu-coco", name: "Coco", petType: "魔法精灵系列", energy: 93, createdAt: "2026-03-15", lastRewardLabel: "小组协作" },
    { id: "stu-nova", name: "Nova", petType: "救援犬系列", energy: 44, createdAt: "2026-03-15", lastRewardLabel: "遵守纪律" }
  ],
  selectedIds: [],
  rewardCount: 0,
  spotlight: {
    title: "课堂就绪",
    text: "演示数据已加载。勾选学生并点击奖励按钮，就能看到真实的能量增长与进化变化。"
  }
};

const stageButtons = document.querySelectorAll(".stage-button");
const demoPet = document.getElementById("demoPet");
const demoPetImage = document.getElementById("demoPetImage");
const stageTag = document.getElementById("stageTag");
const energyValue = document.getElementById("energyValue");
const stageDescription = document.getElementById("stageDescription");

function setStage(stage) {
  const config = stageData[stage];
  if (!config || !demoPet) return;

  demoPet.dataset.evolution = String(stage);
  if (demoPetImage) {
    demoPetImage.src = getPetAssetPath("救援犬系列", Number(stage));
  }
  stageTag.textContent = config.tag;
  energyValue.textContent = config.energy;
  stageDescription.textContent = config.description;

  stageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.stage === String(stage));
  });
}

stageButtons.forEach((button) => {
  button.addEventListener("click", () => setStage(button.dataset.stage));
});

setStage(1);

const revealItems = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 360)}ms`;
  observer.observe(item);
});

function getEvolutionStage(energy) {
  if (energy >= PET_MILESTONES[3].min) return 3;
  if (energy >= PET_MILESTONES[2].min) return 2;
  return 1;
}

function getStageProgress(energy, stage) {
  if (stage === 1) return Math.min((energy / PET_MILESTONES[1].max) * 100, 100);
  if (stage === 2) {
    return Math.min(((energy - PET_MILESTONES[2].min) / (PET_MILESTONES[2].max - PET_MILESTONES[2].min + 1)) * 100, 100);
  }
  return 100;
}

function createPetMarkup(stage) {
  return `
    <div class="student-pet pet pet-asset" data-evolution="${stage}">
      <img class="pet-image" src="${getPetAssetPath("救援犬系列", stage)}" alt="宠物形象" />
    </div>
  `;
}

function getPetAssetPath(petType, stage) {
  const prefix = PET_SERIES_ASSET_PREFIX[petType] || "rescue-dog";
  return `assets/pets/${prefix}-${stage}.svg`;
}

function createPetAssetMarkup(petType, stage, altText) {
  return `
    <div class="student-pet pet pet-asset" data-evolution="${stage}">
      <img class="pet-image" src="${getPetAssetPath(petType, stage)}" alt="${escapeHtml(altText)}" />
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cloneInitialState() {
  return {
    students: CLASSBUDDY_INITIAL_STATE.students.map((student) => ({ ...student })),
    selectedIds: [...CLASSBUDDY_INITIAL_STATE.selectedIds],
    rewardCount: CLASSBUDDY_INITIAL_STATE.rewardCount,
    spotlight: { ...CLASSBUDDY_INITIAL_STATE.spotlight }
  };
}

function normalizeState(parsed) {
  if (!parsed || !Array.isArray(parsed.students)) {
    return cloneInitialState();
  }

  return {
    students: parsed.students.map((student) => ({
      id: String(student.id || `stu-${Date.now().toString(36)}`),
      name: String(student.name || "未命名学生"),
      petType: String(student.petType || "救援犬系列"),
      energy: Number(student.energy) || 0,
      createdAt: String(student.createdAt || new Date().toISOString().slice(0, 10)),
      lastRewardLabel: String(student.lastRewardLabel || "尚未获得奖励")
    })),
    selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds.map(String) : [],
    rewardCount: Number(parsed.rewardCount) || 0,
    spotlight: parsed.spotlight && typeof parsed.spotlight === "object"
      ? {
          title: String(parsed.spotlight.title || "课堂就绪"),
          text: String(parsed.spotlight.text || "演示数据已加载。")
        }
      : { ...CLASSBUDDY_INITIAL_STATE.spotlight }
  };
}

function loadSharedState() {
  try {
    const raw = window.localStorage.getItem(CLASSBUDDY_STORAGE_KEY);
    if (!raw) return cloneInitialState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return cloneInitialState();
  }
}

function saveSharedState(state) {
  window.localStorage.setItem(CLASSBUDDY_STORAGE_KEY, JSON.stringify(state));
}

function getSortedStudents(students) {
  return [...students].sort((a, b) => b.energy - a.energy || a.name.localeCompare(b.name));
}

function buildSharedSummary(state) {
  const students = Array.isArray(state.students) ? state.students : [];
  const sortedStudents = getSortedStudents(students);
  const leader = sortedStudents[0] || null;
  const totalEnergy = students.reduce((sum, student) => sum + (Number(student.energy) || 0), 0);
  const evolvedCount = students.filter((student) => getEvolutionStage(student.energy) > 1).length;

  return {
    students,
    sortedStudents,
    leader,
    totalEnergy,
    evolvedCount,
    studentCount: students.length
  };
}

function formatStageShort(stage) {
  if (stage === 3) return "完全体";
  if (stage === 2) return "成长期";
  return "幼年期";
}

function upsertStudents(existingStudents, incomingStudents) {
  const studentMap = new Map(existingStudents.map((student) => [student.id, { ...student }]));

  incomingStudents.forEach((student) => {
    studentMap.set(student.id, { ...student });
  });

  return [...studentMap.values()];
}

function createStudentId(name) {
  return `stu-${String(name).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function parseBulkStudentText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = /姓名|name|宠物|pet|能量|energy/.test(firstLine);
  const bodyLines = hasHeader ? lines.slice(1) : lines;

  return bodyLines
    .map((line) => {
      const columns = line.includes("\t")
        ? line.split("\t")
        : line.split(",").map((item) => item.trim());
      const [name, petType = "救援犬系列", energy = "0"] = columns;
      if (!name) return null;

      return {
        id: createStudentId(name),
        name: String(name).trim(),
        petType: String(petType || "救援犬系列").trim() || "救援犬系列",
        energy: Math.max(Number.parseInt(String(energy).trim(), 10) || 0, 0)
        ,
        createdAt: new Date().toISOString().slice(0, 10),
        lastRewardLabel: "批量导入"
      };
    })
    .filter(Boolean);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportStudentsToCsv(students) {
  const rows = [
    ["姓名", "宠物系列", "能量", "进化阶段", "创建日期", "最近奖励"]
  ];

  students.forEach((student) => {
    const stage = getEvolutionStage(student.energy);
    rows.push([
      student.name,
      student.petType,
      String(student.energy),
      PET_MILESTONES[stage].label,
      student.createdAt || "",
      student.lastRewardLabel || ""
    ]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

function buildStudentProfileMarkup(student) {
  const stage = getEvolutionStage(student.energy);
  const progress = getStageProgress(student.energy, stage);
  const nextTarget = stage === 1 ? "51 Energy" : stage === 2 ? "151 Energy" : "已达最高阶段";

  return `
    <p class="panel-label">成长档案</p>
    <h3 id="studentModalTitle">${escapeHtml(student.name)}</h3>
    <p id="studentModalText">${escapeHtml(student.petType)} · ${PET_MILESTONES[stage].label}</p>
    <div class="student-modal-grid">
      <div class="student-modal-stage">
        ${createPetAssetMarkup(student.petType, stage, `${student.name} 的成长形象`)}
        <div class="student-progress" aria-hidden="true">
          <span style="width: ${progress}%"></span>
        </div>
      </div>
      <div class="student-modal-meta">
        <p>当前能量 <strong>${student.energy} Energy</strong>，最近一次奖励是“${escapeHtml(student.lastRewardLabel || "尚未获得奖励")}”。</p>
        <ul class="student-modal-metrics">
          <li>宠物 ID：${escapeHtml(student.id.replace("stu-", "").toUpperCase())}</li>
          <li>创建日期：${escapeHtml(student.createdAt || "")}</li>
          <li>当前阶段：${PET_MILESTONES[stage].label}</li>
          <li>下一目标：${nextTarget}</li>
        </ul>
        <ol class="student-modal-log">
          <li>课堂档案已建立，持续累积成长值。</li>
          <li>可在教师后台勾选后批量发放奖励。</li>
          <li>排行榜和首页展示会同步反映当前状态。</li>
        </ol>
      </div>
    </div>
  `;
}

function setupTeacherConsole() {
  const studentGrid = document.getElementById("studentGrid");
  if (!studentGrid) return;

  const loginShell = document.getElementById("loginShell");
  const consoleApp = document.getElementById("consoleApp");
  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginFeedback = document.getElementById("loginFeedback");
  const authBadge = document.getElementById("authBadge");
  const logoutButton = document.getElementById("logoutButton");
  const studentForm = document.getElementById("studentForm");
  const studentNameInput = document.getElementById("studentName");
  const petTypeSelect = document.getElementById("petType");
  const rewardButtons = document.querySelectorAll("[data-reward-points]");
  const totalEnergyStat = document.getElementById("totalEnergyStat");
  const selectedCountStat = document.getElementById("selectedCountStat");
  const evolvedCountStat = document.getElementById("evolvedCountStat");
  const classSignal = document.getElementById("classSignal");
  const rankList = document.getElementById("rankList");
  const rewardFeedback = document.getElementById("rewardFeedback");
  const spotlightTitle = document.getElementById("spotlightTitle");
  const spotlightText = document.getElementById("spotlightText");
  const consoleHint = document.getElementById("consoleHint");
  const seedDemoDataButton = document.getElementById("seedDemoData");
  const clearAllDataButton = document.getElementById("clearAllData");
  const csvFileInput = document.getElementById("csvFileInput");
  const bulkStudentInput = document.getElementById("bulkStudentInput");
  const importStudentsButton = document.getElementById("importStudentsButton");
  const exportCsvButton = document.getElementById("exportCsvButton");
  const exportJsonButton = document.getElementById("exportJsonButton");
  const studentModal = document.getElementById("studentModal");
  const studentModalContent = document.getElementById("studentModalContent");
  const modalCloseButtons = document.querySelectorAll("[data-close-student-modal]");

  let state = loadSharedState();

  function isAuthenticated() {
    try {
      const raw = window.localStorage.getItem(CLASSBUDDY_AUTH_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed?.username === CLASSBUDDY_ADMIN_CREDENTIALS.username;
    } catch {
      return false;
    }
  }

  function setAuthenticated(username) {
    window.localStorage.setItem(
      CLASSBUDDY_AUTH_KEY,
      JSON.stringify({
        username,
        loggedInAt: new Date().toISOString()
      })
    );
  }

  function clearAuthentication() {
    window.localStorage.removeItem(CLASSBUDDY_AUTH_KEY);
  }

  function renderAuth() {
    const authed = isAuthenticated();
    loginShell.hidden = authed;
    consoleApp.hidden = !authed;
    logoutButton.hidden = !authed;
    authBadge.textContent = authed ? "管理员已登录" : "未登录";
    if (authed) {
      loginFeedback.textContent = "已登录，可以开始管理课堂宠物数据。";
    }
  }

  function saveState() {
    saveSharedState(state);
  }

  function renderStudents() {
    const sortedStudents = getSortedStudents(state.students);
    if (!sortedStudents.length) {
      studentGrid.innerHTML = '<div class="empty-state">还没有学生，先在上方录入一位学生开始体验。</div>';
      return;
    }

    studentGrid.innerHTML = sortedStudents
      .map((student) => {
        const stage = getEvolutionStage(student.energy);
        const progress = getStageProgress(student.energy, stage);
        const isSelected = state.selectedIds.includes(student.id);

        return `
          <article class="student-card ${isSelected ? "is-selected" : ""}" data-student-id="${student.id}">
            <div class="student-card-top">
              ${createPetAssetMarkup(student.petType, stage, `${student.name} 的宠物形象`)}
              <label class="student-check">
                <input type="checkbox" data-select-student="${student.id}" ${isSelected ? "checked" : ""} />
                <span>选中</span>
              </label>
            </div>
            <div class="student-meta">
              <h3>${escapeHtml(student.name)}</h3>
              <span class="student-series">${escapeHtml(student.petType)}</span>
              <span class="stage-pill">${PET_MILESTONES[stage].label}</span>
            </div>
            <div class="student-energy">
              <p><strong>${student.energy}</strong> Energy</p>
              <p>宠物 ID · ${student.id.replace("stu-", "").toUpperCase()}</p>
            </div>
            <div class="student-progress" aria-hidden="true">
              <span style="width: ${progress}%"></span>
            </div>
            <div class="student-actions">
              <button class="student-quick-reward" type="button" data-quick-reward="${student.id}">+10 快速激励</button>
              <button class="student-profile-trigger" type="button" data-view-student="${student.id}">查看档案</button>
              <button type="button" data-remove-student="${student.id}">移除</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderRankings() {
    const sortedStudents = getSortedStudents(state.students);
    if (!sortedStudents.length) {
      rankList.innerHTML = '<li><span>暂无学生</span><strong>0</strong></li>';
      return;
    }

    rankList.innerHTML = sortedStudents
      .slice(0, 8)
      .map(
        (student, index) =>
          `<li><span>${index + 1}. ${escapeHtml(student.name)}</span><strong>${student.energy}</strong></li>`
      )
      .join("");
  }

  function renderStats() {
    const summary = buildSharedSummary(state);

    totalEnergyStat.textContent = String(summary.totalEnergy);
    selectedCountStat.textContent = String(state.rewardCount);
    evolvedCountStat.textContent = String(summary.evolvedCount);
    classSignal.textContent = `${summary.studentCount} 名学生`;
    spotlightTitle.textContent = state.spotlight.title;
    spotlightText.textContent = state.spotlight.text;

    if (!state.students.length) {
      consoleHint.textContent = "当前没有学生数据。你可以录入学生，或点击“重置演示数据”恢复默认班级。";
    } else {
      consoleHint.textContent = "先勾选学生，再点击右侧奖励按钮。数据会保存在当前浏览器中。";
    }
  }

  function renderFeedback(message) {
    rewardFeedback.textContent = message;
  }

  function renderAll() {
    if (!isAuthenticated()) return;
    renderStudents();
    renderRankings();
    renderStats();
    saveState();
  }

  function setSpotlight(title, text) {
    state.spotlight = { title, text };
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (
      username === CLASSBUDDY_ADMIN_CREDENTIALS.username &&
      password === CLASSBUDDY_ADMIN_CREDENTIALS.password
    ) {
      setAuthenticated(username);
      loginForm.reset();
      loginFeedback.textContent = "登录成功，正在进入教师后台。";
      renderAuth();
      renderAll();
      return;
    }

    loginFeedback.textContent = "账号或密码错误，请重试。";
  });

  logoutButton.addEventListener("click", () => {
    clearAuthentication();
    studentModal.classList.remove("is-open");
    studentModal.setAttribute("aria-hidden", "true");
    renderAuth();
    loginFeedback.textContent = "你已退出登录。";
  });

  function awardReward(points, label, studentIds) {
    if (!studentIds.length) {
      renderFeedback("请先勾选至少一位学生。");
      return;
    }

    const evolvedStudents = [];
    state.students = state.students.map((student) => {
      if (!studentIds.includes(student.id)) return student;

      const previousStage = getEvolutionStage(student.energy);
      const nextEnergy = student.energy + points;
      const nextStage = getEvolutionStage(nextEnergy);

      if (nextStage > previousStage) {
        evolvedStudents.push({ name: student.name, stage: nextStage });
      }

      return {
        ...student,
        energy: nextEnergy,
        lastRewardLabel: label
      };
    });

    state.rewardCount += studentIds.length;

    if (evolvedStudents.length) {
      const first = evolvedStudents[0];
      setSpotlight(
        `${first.name} 完成进化`,
        `${first.name} 因“${label}”奖励进入${PET_MILESTONES[first.stage].label}。${evolvedStudents.length > 1 ? `本轮共 ${evolvedStudents.length} 位学生完成进化。` : ""}`
      );
    } else {
      setSpotlight(
        "课堂激励已发放",
        `已向 ${studentIds.length} 位学生发放“${label}”奖励，排行榜和宠物状态已同步更新。`
      );
    }

    renderFeedback(`已为 ${studentIds.length} 位学生发放“${label}”奖励，共增加 ${points * studentIds.length} Energy。`);
    renderAll();
    celebrateStudents(studentIds);
  }

  function celebrateStudents(studentIds) {
    studentIds.forEach((studentId) => {
      const card = studentGrid.querySelector(`[data-student-id="${studentId}"]`);
      if (!card) return;
      card.classList.add("is-celebrating");
      window.setTimeout(() => card.classList.remove("is-celebrating"), 700);
    });
  }

  function toggleSelection(studentId, checked) {
    const next = new Set(state.selectedIds);
    if (checked) {
      next.add(studentId);
    } else {
      next.delete(studentId);
    }
    state.selectedIds = [...next];
    renderAll();
  }

  studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = studentNameInput.value.trim();
    const petType = petTypeSelect.value;

    if (!name) {
      renderFeedback("请先输入学生姓名。");
      return;
    }

    const id = createStudentId(name);
    state.students = [...state.students, { id, name, petType, energy: 0 }];
    state.students = state.students.map((student) =>
      student.id === id
        ? { ...student, createdAt: new Date().toISOString().slice(0, 10), lastRewardLabel: "尚未获得奖励" }
        : student
    );
    state.selectedIds = [...state.selectedIds, id];
    setSpotlight("新学生已加入", `${name} 已领养 ${petType}，系统已为 TA 创建课堂成长档案。`);
    renderFeedback(`已添加学生 ${name}，并自动选中，接下来可以直接发放奖励。`);
    studentForm.reset();
    renderAll();
  });

  rewardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const points = Number(button.dataset.rewardPoints);
      const label = button.dataset.rewardLabel || "课堂奖励";
      awardReward(points, label, state.selectedIds);
    });
  });

  studentGrid.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const studentId = target.dataset.selectStudent;
    if (!studentId) return;
    toggleSelection(studentId, target.checked);
  });

  studentGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const quickRewardId = target.getAttribute("data-quick-reward");
    if (quickRewardId) {
      awardReward(REWARD_CONFIG["积极发言"], "积极发言", [quickRewardId]);
      return;
    }

    const viewStudentId = target.getAttribute("data-view-student");
    if (viewStudentId) {
      const student = state.students.find((item) => item.id === viewStudentId);
      if (!student) return;
      studentModalContent.innerHTML = buildStudentProfileMarkup(student);
      studentModal.classList.add("is-open");
      studentModal.setAttribute("aria-hidden", "false");
      return;
    }

    const removeStudentId = target.getAttribute("data-remove-student");
    if (removeStudentId) {
      const removedStudent = state.students.find((student) => student.id === removeStudentId);
      state.students = state.students.filter((student) => student.id !== removeStudentId);
      state.selectedIds = state.selectedIds.filter((id) => id !== removeStudentId);
      setSpotlight("学生档案已移除", removedStudent ? `${removedStudent.name} 的宠物档案已从当前演示班级中移除。` : "已移除一位学生。");
      renderFeedback(removedStudent ? `已移除学生 ${removedStudent.name}。` : "已移除学生。");
      renderAll();
    }
  });

  seedDemoDataButton.addEventListener("click", () => {
    state = cloneInitialState();
    renderFeedback("演示数据已重置。");
    renderAll();
  });

  clearAllDataButton.addEventListener("click", () => {
    state = {
      students: [],
      selectedIds: [],
      rewardCount: 0,
      spotlight: {
        title: "班级已清空",
        text: "当前演示班级没有学生。你可以重新录入学生开始新一轮课堂激励。"
      }
    };
    renderFeedback("已清空全部本地数据。");
    renderAll();
  });

  importStudentsButton.addEventListener("click", () => {
    const importedStudents = parseBulkStudentText(bulkStudentInput.value);
    if (!importedStudents.length) {
      renderFeedback("没有识别到可导入的数据，请检查格式后重试。");
      return;
    }

    state.students = upsertStudents(state.students, importedStudents);
    state.selectedIds = [...new Set([...state.selectedIds, ...importedStudents.map((student) => student.id)])];
    setSpotlight("批量导入完成", `已导入 ${importedStudents.length} 位学生，并自动选中，方便继续发放奖励。`);
    renderFeedback(`成功导入 ${importedStudents.length} 位学生。`);
    bulkStudentInput.value = "";
    renderAll();
  });

  csvFileInput.addEventListener("change", async () => {
    const [file] = csvFileInput.files || [];
    if (!file) return;

    if (file.name.toLowerCase().endsWith(".xlsx")) {
      renderFeedback("当前浏览器版还不能直接解析 .xlsx，请先在 Excel 中另存为 CSV，或直接复制表格内容粘贴导入。");
      csvFileInput.value = "";
      return;
    }

    try {
      const text = await file.text();
      const importedStudents = parseBulkStudentText(text);
      if (!importedStudents.length) {
        renderFeedback("文件已读取，但没有识别到有效学生数据。");
        return;
      }

      state.students = upsertStudents(state.students, importedStudents);
      state.selectedIds = [...new Set([...state.selectedIds, ...importedStudents.map((student) => student.id)])];
      setSpotlight("文件导入完成", `已从文件中导入 ${importedStudents.length} 位学生。`);
      renderFeedback(`成功从文件导入 ${importedStudents.length} 位学生。`);
      csvFileInput.value = "";
      renderAll();
    } catch {
      renderFeedback("文件读取失败，请换一个 CSV 文件重试。");
    }
  });

  exportCsvButton.addEventListener("click", () => {
    const csv = exportStudentsToCsv(getSortedStudents(state.students));
    downloadFile(`classbuddy-students-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    renderFeedback("已导出当前班级 CSV。");
  });

  exportJsonButton.addEventListener("click", () => {
    downloadFile(
      `classbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(state, null, 2),
      "application/json;charset=utf-8"
    );
    renderFeedback("已导出本地备份文件。");
  });

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      studentModal.classList.remove("is-open");
      studentModal.setAttribute("aria-hidden", "true");
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && studentModal.classList.contains("is-open")) {
      studentModal.classList.remove("is-open");
      studentModal.setAttribute("aria-hidden", "true");
    }
  });

  renderAuth();
  if (isAuthenticated()) {
    renderAll();
  }
}

function setupHomeDashboard() {
  const heroPet = document.getElementById("heroPet");
  if (!heroPet) return;

  const heroPetSeries = document.getElementById("heroPetSeries");
  const heroPetName = document.getElementById("heroPetName");
  const heroPetImage = document.getElementById("heroPetImage");
  const heroEnergyBar = document.getElementById("heroEnergyBar");
  const heroEnergyValue = document.getElementById("heroEnergyValue");
  const heroStageLabel = document.getElementById("heroStageLabel");
  const heroRankList = document.getElementById("heroRankList");
  const heroHallMeta = document.getElementById("heroHallMeta");
  const heroClassStatus = document.getElementById("heroClassStatus");
  const homeRewardFeedback = document.getElementById("homeRewardFeedback");
  const homeRewardButtons = document.querySelectorAll("[data-home-reward-points]");

  function renderHomeDashboard() {
    const state = loadSharedState();
    const summary = buildSharedSummary(state);
    const leader = summary.leader;

    if (!leader) {
      heroPet.dataset.evolution = "1";
      if (heroPetImage) {
        heroPetImage.src = getPetAssetPath("救援犬系列", 1);
      }
      heroPetSeries.textContent = "今日课堂伙伴";
      heroPetName.textContent = "等待第一位学生加入";
      heroEnergyBar.style.width = "0%";
      heroEnergyValue.textContent = "0 Energy";
      heroStageLabel.textContent = "幼年期";
      heroHallMeta.textContent = "暂无班级数据";
      heroClassStatus.textContent = "在线 · 0 名学生";
      heroRankList.innerHTML = "<li><span>暂无学生</span><strong>0</strong></li>";
      return;
    }

    const leaderStage = getEvolutionStage(leader.energy);
    heroPet.dataset.evolution = String(leaderStage);
    if (heroPetImage) {
      heroPetImage.src = getPetAssetPath(leader.petType, leaderStage);
      heroPetImage.alt = `${leader.name} 的宠物形象`;
    }
    heroPetSeries.textContent = `今日课堂伙伴 · ${leader.petType}`;
    heroPetName.textContent = leader.name;
    heroEnergyBar.style.width = `${getStageProgress(leader.energy, leaderStage)}%`;
    heroEnergyValue.textContent = `${leader.energy} Energy`;
    heroStageLabel.textContent = formatStageShort(leaderStage);
    heroHallMeta.textContent = `${summary.studentCount} 名学生 · 总能量 ${summary.totalEnergy}`;
    heroClassStatus.textContent = `在线 · ${summary.studentCount} 名学生`;
    heroRankList.innerHTML = summary.sortedStudents
      .slice(0, 3)
      .map(
        (student, index) =>
          `<li><span>${index + 1}. ${escapeHtml(student.name)}</span><strong>${student.energy}</strong></li>`
      )
      .join("");
  }

  renderHomeDashboard();
  homeRewardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const state = loadSharedState();
      const summary = buildSharedSummary(state);
      const leader = summary.leader;

      if (!leader) {
        homeRewardFeedback.textContent = "当前没有学生数据，请先去教师后台录入学生。";
        return;
      }

      const points = Number(button.getAttribute("data-home-reward-points") || 0);
      const label = button.getAttribute("data-home-reward-label") || "课堂奖励";
      const previousStage = getEvolutionStage(leader.energy);

      state.students = state.students.map((student) => {
        if (student.id !== leader.id) return student;
        return { ...student, energy: student.energy + points };
      });
      state.rewardCount += 1;

      const updatedLeader = state.students.find((student) => student.id === leader.id);
      const nextStage = updatedLeader ? getEvolutionStage(updatedLeader.energy) : previousStage;

      if (updatedLeader && nextStage > previousStage) {
        state.spotlight = {
          title: `${updatedLeader.name} 完成进化`,
          text: `${updatedLeader.name} 在首页因“${label}”奖励进入${PET_MILESTONES[nextStage].label}。`
        };
      } else {
        state.spotlight = {
          title: "首页奖励已发放",
          text: `已在首页为 ${leader.name} 发放“${label}”奖励，后台数据已同步。`
        };
      }

      saveSharedState(state);
      renderHomeDashboard();
      homeRewardFeedback.textContent = `已为 ${leader.name} 发放“${label}”奖励，后台打开后会看到同样结果。`;
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === CLASSBUDDY_STORAGE_KEY) {
      renderHomeDashboard();
    }
  });
  window.addEventListener("focus", renderHomeDashboard);
}

setupHomeDashboard();
setupTeacherConsole();
