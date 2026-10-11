/* 数据层：本地存储、增删改查、事件通知 */
(function () {
  "use strict";
  var JB = window.JB;
  var KEY = "zhitu.data.v1";

  var STAGES = [
    { key: "wish", label: "想投", color: "#8b95a3", hint: "收藏的好岗位，准备投递" },
    { key: "applied", label: "已投递", color: "#2f6fed", hint: "简历已提交，等待回复" },
    { key: "test", label: "笔试 / 测评", color: "#7c3aed", hint: "收到在线测评或笔试" },
    { key: "interview", label: "面试中", color: "#d97706", hint: "一面 / 二面 / HR 面" },
    { key: "offer", label: "已获 Offer", color: "#16a34a", hint: "恭喜！可以比较选择" },
    { key: "closed", label: "已结束", color: "#9aa3ae", hint: "未通过或已放弃" }
  ];

  var CHANNELS = ["官网投递", "Boss直聘", "实习僧", "牛客网", "前程无忧", "智联招聘", "内推", "校园招聘会", "微信公众号", "邮箱投递", "其他"];
  var JOB_TYPES = ["实习", "校招", "全职", "兼职", "远程"];

  function emptyResume(name) {
    return {
      id: JB.uid("resume"),
      name: name || "我的简历",
      targetRole: "",
      targetCity: "",
      targetType: "实习",
      template: "classic",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      basic: { name: "", phone: "", email: "", city: "", school: "", degree: "本科", gradYear: "", github: "", website: "", wechat: "" },
      education: [],
      experience: [],
      projects: [],
      skills: [],
      awards: [],
      summary: ""
    };
  }

  function defaultState() {
    var resume = emptyResume("我的简历");
    return {
      version: 1,
      theme: "light",
      resumes: [resume],
      activeResumeId: resume.id,
      savedJobs: [],
      applications: [],
      starStories: [],
      interviewNotes: {},
      reviews: [],
      settings: {
        sources: ["remotive", "arbeitnow", "jobicy", "remoteok"],
        jobLimit: 60,
        defaultKeyword: "",
        lastSearch: null,
        onboarded: false
      }
    };
  }

  var state = null;
  var listeners = [];
  var storageOK = true;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      var merged = Object.assign(base, parsed);
      merged.settings = Object.assign(base.settings, parsed.settings || {});
      if (!merged.resumes || !merged.resumes.length) {
        merged.resumes = base.resumes;
        merged.activeResumeId = base.resumes[0].id;
      }
      return merged;
    } catch (e) {
      storageOK = false;
      return defaultState();
    }
  }

  function persist() {
    if (!storageOK) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      storageOK = false;
      JB.toast("本地存储不可用，本次数据不会被保存", "warn", 3500);
    }
  }

  function emit(detail) {
    persist();
    listeners.forEach(function (fn) {
      try { fn(state, detail || {}); } catch (e) { console.error(e); }
    });
  }

  /* ---------------- 初始状态 ---------------- */
  state = load();

  var store = {
    STAGES: STAGES,
    CHANNELS: CHANNELS,
    JOB_TYPES: JOB_TYPES,
    storageAvailable: function () { return storageOK; },

    get: function () { return state; },

    subscribe: function (fn) { listeners.push(fn); },

    /** 通用更新：patch 可以是对象或 state => patch */
    update: function (patch) {
      var next = typeof patch === "function" ? patch(state) : patch;
      if (next) Object.assign(state, next);
      emit();
      return state;
    },

    stage: function (key) {
      for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return STAGES[i];
      return STAGES[0];
    },

    stageIndex: function (key) {
      for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return i;
      return 0;
    },

    /* ---------------- 简历 ---------------- */
    emptyResume: emptyResume,

    activeResume: function () {
      var list = state.resumes || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === state.activeResumeId) return list[i];
      return list[0] || null;
    },

    getResume: function (id) {
      var list = state.resumes || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    addResume: function (resume) {
      var item = resume || emptyResume("新简历 " + ((state.resumes || []).length + 1));
      state.resumes.unshift(item);
      state.activeResumeId = item.id;
      emit();
      return item;
    },

    updateResume: function (id, patch) {
      var item = store.getResume(id);
      if (!item) return null;
      Object.assign(item, patch);
      item.updatedAt = new Date().toISOString();
      emit();
      return item;
    },

    duplicateResume: function (id) {
      var source = store.getResume(id);
      if (!source) return null;
      var copy = JSON.parse(JSON.stringify(source));
      copy.id = JB.uid("resume");
      copy.name = source.name + " 副本";
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      state.resumes.unshift(copy);
      state.activeResumeId = copy.id;
      emit();
      return copy;
    },

    deleteResume: function (id) {
      state.resumes = (state.resumes || []).filter(function (r) { return r.id !== id; });
      if (!state.resumes.length) state.resumes = [emptyResume("我的简历")];
      if (state.activeResumeId === id) state.activeResumeId = state.resumes[0].id;
      emit();
    },

    setActiveResume: function (id) {
      state.activeResumeId = id;
      emit();
    },

    /* ---------------- 岗位 ---------------- */
    isSavedJob: function (id) {
      return (state.savedJobs || []).some(function (j) { return j.id === id; });
    },

    getJob: function (id) {
      var list = state.savedJobs || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    saveJob: function (job) {
      var existing = store.getJob(job.id);
      if (existing) {
        Object.assign(existing, job, { savedAt: existing.savedAt || new Date().toISOString() });
        emit();
        return existing;
      }
      var record = Object.assign({}, job, { savedAt: new Date().toISOString() });
      state.savedJobs = [record].concat(state.savedJobs || []);
      emit();
      return record;
    },

    unsaveJob: function (id) {
      state.savedJobs = (state.savedJobs || []).filter(function (j) { return j.id !== id; });
      emit();
    },

    toggleSavedJob: function (job) {
      if (store.isSavedJob(job.id)) { store.unsaveJob(job.id); return false; }
      store.saveJob(job); return true;
    },

    /* ---------------- 投递记录 ---------------- */
    getApplication: function (id) {
      var list = state.applications || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    addApplication: function (data) {
      var now = new Date().toISOString();
      var app = Object.assign({
        id: JB.uid("app"),
        jobId: "",
        title: "",
        company: "",
        city: "",
        salary: "",
        url: "",
        channel: "官网投递",
        stage: "wish",
        resumeId: state.activeResumeId,
        appliedAt: JB.todayISO(),
        deadline: "",
        nextAction: "",
        nextActionAt: "",
        notes: "",
        history: [{ at: now, from: "", to: "wish", note: "创建记录" }],
        createdAt: now,
        updatedAt: now
      }, data);
      state.applications = [app].concat(state.applications || []);
      emit();
      return app;
    },

    updateApplication: function (id, patch) {
      var app = store.getApplication(id);
      if (!app) return null;
      Object.assign(app, patch);
      app.updatedAt = new Date().toISOString();
      emit();
      return app;
    },

    moveApplication: function (id, stage, note) {
      var app = store.getApplication(id);
      if (!app || app.stage === stage) return app;
      app.history = app.history || [];
      app.history.push({ at: new Date().toISOString(), from: app.stage, to: stage, note: note || "" });
      app.stage = stage;
      app.updatedAt = new Date().toISOString();
      emit();
      return app;
    },

    deleteApplication: function (id) {
      state.applications = (state.applications || []).filter(function (a) { return a.id !== id; });
      emit();
    },

    applicationsByStage: function (stage) {
      return (state.applications || []).filter(function (a) { return a.stage === stage; });
    },

    /* ---------------- 面试 ---------------- */
    setInterviewNote: function (questionId, patch) {
      var notes = state.interviewNotes || {};
      notes[questionId] = Object.assign({ updatedAt: new Date().toISOString() }, notes[questionId] || {}, patch);
      state.interviewNotes = notes;
      emit();
    },

    addStarStory: function (story) {
      var item = Object.assign({ id: JB.uid("star"), createdAt: new Date().toISOString() }, story);
      state.starStories = [item].concat(state.starStories || []);
      emit();
      return item;
    },

    deleteStarStory: function (id) {
      state.starStories = (state.starStories || []).filter(function (s) { return s.id !== id; });
      emit();
    },

    addReview: function (review) {
      var item = Object.assign({ id: JB.uid("review"), createdAt: new Date().toISOString() }, review);
      state.reviews = [item].concat(state.reviews || []);
      emit();
      return item;
    },

    deleteReview: function (id) {
      state.reviews = (state.reviews || []).filter(function (r) { return r.id !== id; });
      emit();
    },

    /* ---------------- 设置 / 导入导出 ---------------- */
    setTheme: function (theme) {
      state.theme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      emit();
    },

    setSettings: function (patch) {
      state.settings = Object.assign(state.settings || {}, patch);
      emit();
    },

    exportJSON: function () {
      return JSON.stringify({
        app: "职途 · 求职简历管理工具",
        exportedAt: new Date().toISOString(),
        data: state
      }, null, 2);
    },

    importJSON: function (text) {
      var parsed = JSON.parse(text);
      var incoming = parsed && parsed.data ? parsed.data : parsed;
      if (!incoming || typeof incoming !== "object" || !incoming.resumes) {
        throw new Error("文件格式不正确，请选择本工具导出的备份文件");
      }
      state = Object.assign(defaultState(), incoming);
      document.documentElement.setAttribute("data-theme", state.theme || "light");
      emit();
      return state;
    },

    resetAll: function () {
      state = defaultState();
      document.documentElement.setAttribute("data-theme", "light");
      emit();
    },

    /** 载入一份示例简历，便于快速体验 */
    loadSampleResume: function () {
      var sample = {
        id: JB.uid("resume"),
        name: "后端开发实习 · 主投版",
        targetRole: "后端开发实习生",
        targetCity: "北京",
        targetType: "实习",
        template: "classic",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        basic: {
          name: "张同学", phone: "138-0000-0000", email: "zhang@example.com",
          city: "北京", school: "某某大学", degree: "本科", gradYear: "2027",
          github: "github.com/zhang", website: "", wechat: ""
        },
        education: [{
          school: "某某大学", major: "计算机科学与技术", degree: "本科",
          start: "2023-09", end: "2027-06", gpa: "3.7/4.0（专业前 15%）",
          courses: "数据结构、操作系统、数据库原理、计算机网络"
        }],
        experience: [{
          company: "某科技公司", title: "后端开发实习生", city: "北京",
          start: "2026-03", end: "2026-08",
          detail: "使用 Java + Spring Boot 开发订单查询接口，通过索引优化与 Redis 缓存将平均响应时间从 320ms 降到 90ms；\n参与 MySQL 慢查询治理，累计优化 12 条 SQL，支撑日均 60 万次调用。"
        }],
        projects: [{
          name: "校园二手交易平台", role: "后端负责人", tech: "Java / Spring Boot / MySQL / Redis",
          start: "2025-09", end: "2026-01", link: "",
          detail: "负责用户与商品模块设计与开发，实现 JWT 鉴权与分布式锁；\n上线后注册用户 1200+，累计发布商品 3000+，压测 QPS 达 800。"
        }],
        skills: ["Java", "Spring Boot", "MySQL", "Redis", "Linux", "Git", "Docker", "数据结构"],
        awards: [{ name: "校级一等奖学金", date: "2025-09", detail: "专业排名前 10%" }],
        summary: "计算机专业大三在读，两段项目开发经历，熟悉 Java 后端技术栈，能独立完成接口开发与数据库优化，希望在实习中深入参与真实业务系统建设。"
      };
      state.resumes.unshift(sample);
      state.activeResumeId = sample.id;
      emit();
      return sample;
    }
  };

  JB.store = store;
})();
