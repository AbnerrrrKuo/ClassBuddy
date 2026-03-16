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

const CLASSBUDDY_STORAGE_KEY = "classbuddy-shared-state-v1";
const CLASSBUDDY_INITIAL_STATE = {
  students: [
    { id: "stu-luna", name: "Luna", petType: "救援犬系列", energy: 168 },
    { id: "stu-milo", name: "Milo", petType: "光之巨人系列", energy: 108 },
    { id: "stu-coco", name: "Coco", petType: "魔法精灵系列", energy: 93 },
    { id: "stu-nova", name: "Nova", petType: "救援犬系列", energy: 44 }
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
const stageTag = document.getElementById("stageTag");
const energyValue = document.getElementById("energyValue");
const stageDescription = document.getElementById("stageDescription");

function setStage(stage) {
  const config = stageData[stage];
  if (!config || !demoPet) return;

  demoPet.dataset.evolution = String(stage);
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
    <div class="student-pet pet" data-evolution="${stage}">
      <span class="pet-face pet-face-left"></span>
      <span class="pet-face pet-face-right"></span>
      <span class="pet-core"></span>
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
      energy: Number(student.energy) || 0
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

function setupTeacherConsole() {
  const studentGrid = document.getElementById("studentGrid");
  if (!studentGrid) return;

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

  let state = loadSharedState();

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
              ${createPetMarkup(stage)}
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
    renderStudents();
    renderRankings();
    renderStats();
    saveState();
  }

  function setSpotlight(title, text) {
    state.spotlight = { title, text };
  }

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
        energy: nextEnergy
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

    const id = `stu-${name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")}-${Date.now().toString(36)}`;
    state.students = [...state.students, { id, name, petType, energy: 0 }];
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

  renderAll();
}

function setupHomeDashboard() {
  const heroPet = document.getElementById("heroPet");
  if (!heroPet) return;

  const heroPetSeries = document.getElementById("heroPetSeries");
  const heroPetName = document.getElementById("heroPetName");
  const heroEnergyBar = document.getElementById("heroEnergyBar");
  const heroEnergyValue = document.getElementById("heroEnergyValue");
  const heroStageLabel = document.getElementById("heroStageLabel");
  const heroRankList = document.getElementById("heroRankList");
  const heroHallMeta = document.getElementById("heroHallMeta");
  const heroClassStatus = document.getElementById("heroClassStatus");

  function renderHomeDashboard() {
    const state = loadSharedState();
    const summary = buildSharedSummary(state);
    const leader = summary.leader;

    if (!leader) {
      heroPet.dataset.evolution = "1";
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
  window.addEventListener("storage", (event) => {
    if (event.key === CLASSBUDDY_STORAGE_KEY) {
      renderHomeDashboard();
    }
  });
  window.addEventListener("focus", renderHomeDashboard);
}

setupHomeDashboard();
setupTeacherConsole();
