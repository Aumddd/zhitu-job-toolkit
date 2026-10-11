/* 找工作：聚合在线岗位 + 匹配度排序 + 收藏 / 加入投递 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  var ui = {
    tab: "search",
    q: "",
    location: "",
    type: "",
    sort: "match",
    sources: null,
    loading: false,
    results: [],
    meta: null,
    error: "",
    expanded: {},
    searched: false
  };

  function sources() {
    if (ui.sources) return ui.sources;
    var state = JB.store.get();
    ui.sources = (state.settings.sources || ["remotive", "arbeitnow", "jobicy", "remoteok"]).slice();
    return ui.sources;
  }

  function typeHit(job, type) {
    if (!type) return true;
    var text = (job.type || "") + " " + (job.title || "");
    if (type === "实习") return /实习|intern/i.test(text);
    if (type === "校招") return /校招|应届|管培|校园招聘|20\d{2}\s*届/i.test(text);
    if (type === "远程") return !!job.remote;
    if (type === "全职") return !/实习|intern/i.test(text) && !job.remote;
    return true;
  }

  function withMatch(jobs) {
    var resume = JB.store.activeResume();
    return jobs.map(function (job) {
      var match = JB.skills.matchJob(job, resume);
      return Object.assign({}, job, { _match: match });
    });
  }

  function visibleJobs() {
    var list = ui.results.filter(function (job) { return typeHit(job, ui.type); });
    if (ui.sort === "match") {
      list.sort(function (a, b) { return (b._match ? b._match.score : 0) - (a._match ? a._match.score : 0); });
    } else if (ui.sort === "time") {
      list.sort(function (a, b) { return String(b.postedAt || "").localeCompare(String(a.postedAt || "")); });
    }
    return list;
  }

  function ringHTML(score) {
    var cls = score >= 75 ? "high" : score >= 50 ? "mid" : "";
    var r = 26;
    var c = 2 * Math.PI * r;
    var offset = c * (1 - score / 100);
    return '<div class="match-ring ' + cls + '" title="与简历的匹配度">' +
      '<svg viewBox="0 0 60 60"><circle class="track-c" cx="30" cy="30" r="' + r + '"></circle>' +
      '<circle class="val-c" cx="30" cy="30" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"></circle></svg>' +
      '<span class="num">' + score + "<small>%</small></span></div>";
  }

  function jobCard(job) {
    var saved = JB.store.isSavedJob(job.id);
    var open = ui.expanded[job.id];
    var match = job._match || JB.skills.matchJob(job, JB.store.activeResume());
    var html = '<div class="job-card' + (saved ? " saved" : "") + (open ? " open" : "") + '" data-job-id="' + JB.esc(job.id) + '">' +
      '<div class="job-top">' + ringHTML(match.score) +
      '<div style="flex:1;min-width:0">' +
      '<h3 class="job-title">' + JB.esc(job.title || "未命名岗位") + "</h3>" +
      '<p class="job-co">' + JB.esc(job.company || "未知公司") + "</p>" +
      '<div class="job-meta">' +
      (job.location ? "<span>📍 " + JB.esc(job.location) + "</span>" : "") +
      (job.salary ? "<span>💰 " + JB.esc(job.salary) + "</span>" : "") +
      (job.type ? "<span>🏷 " + JB.esc(job.type) + "</span>" : "") +
      (job.postedAt ? "<span>更新于 " + JB.esc(JB.fmtDate(job.postedAt, "md")) + "</span>" : "") +
      (job.deadline ? "<span>⏰ 截止 " + JB.esc(JB.fmtDate(job.deadline, "md")) + "</span>" : "") +
      '<span class="badge' + (job.source === "seed" ? "" : " accent") + '">' + JB.esc(job.sourceLabel || job.source) + "</span>" +
      "</div>";
    if ((job.tags || []).length) {
      html += '<div class="job-tags">' + job.tags.slice(0, 8).map(function (t) {
        var hit = (match.resumeSkillList || []).indexOf(JB.skills.normalize(t)) > -1;
        return '<span class="tag"' + (hit ? ' style="background:var(--green-soft);border-color:transparent;color:var(--green)"' : "") + ">" + JB.esc(t) + "</span>";
      }).join("") + "</div>";
    }
    html += "</div></div>";

    html += '<div class="job-actions">' +
      '<button class="btn sm" data-toggle-job="' + JB.esc(job.id) + '">' + (open ? "收起详情" : "查看 JD 与匹配分析") + "</button>" +
      '<button class="btn sm' + (saved ? "" : " primary") + '" data-save-job="' + JB.esc(job.id) + '">' + (saved ? "★ 已收藏" : "☆ 收藏") + "</button>" +
      '<button class="btn sm" data-apply-job="' + JB.esc(job.id) + '">加入投递</button>' +
      (job.url ? '<a class="btn sm ghost" href="' + JB.esc(job.url) + '" target="_blank" rel="noopener">打开原站 ↗</a>' : "") +
      '<button class="btn sm ghost" data-copy-job="' + JB.esc(job.id) + '">复制岗位信息</button>' +
      "</div>";

    html += '<div class="job-body">';
    html += '<div class="grid cols-2" style="gap:16px;align-items:start">';
    html += "<div><div class=\"small strong mb-8\">匹配度明细</div><div class=\"match-detail\">";
    Object.keys(match.parts).forEach(function (key) {
      var value = Math.round(match.parts[key] * 100);
      html += '<div class="match-line"><span class="muted">' + JB.esc(key) + '</span>' +
        '<div class="track"><i style="width:' + value + '%"></i></div>' +
        '<span class="tiny muted" style="text-align:right">' + value + "%</span></div>";
    });
    html += "</div>";
    if (match.missing.length) {
      html += '<div class="small muted mt-16">岗位要求中你简历里暂未出现的技能（可在简历中补充或面试前准备）：</div>' +
        '<div class="chip-group mt-8">' + match.missing.slice(0, 8).map(function (s) { return '<span class="tag">' + JB.esc(s) + "</span>"; }).join("") + "</div>";
    }
    if (match.matched.length) {
      html += '<div class="small muted mt-16">已匹配的技能：</div><div class="chip-group mt-8">' +
        match.matched.slice(0, 8).map(function (s) { return '<span class="tag" style="background:var(--green-soft);border-color:transparent;color:var(--green)">' + JB.esc(s) + "</span>"; }).join("") + "</div>";
    }
    html += "</div>";

    html += "<div><div class=\"small strong mb-8\">岗位描述</div><div class=\"job-desc\">" +
      JB.esc(job.description || "该岗位没有提供详细描述，可点击“打开原站”查看。") + "</div>";
    if (job.attribution) html += '<div class="source-note mt-8">' + JB.esc(job.attribution) + "</div>";
    html += "</div>";
    html += "</div></div>";
    html += "</div>";
    return html;
  }

  function sourceStatusHTML() {
    var meta = ui.meta;
    if (!meta) return "";
    var html = '<div class="filter-line">';
    (meta.sources || []).forEach(function (source) {
      html += '<span class="source-note"><span class="' + (source.ok ? "dot-ok" : "dot-bad") + '"></span>' +
        JB.esc(source.label) + (source.ok ? " · " + source.count + " 个" : " · 连接失败") + "</span>";
    });
    html += '<span class="spacer"></span>';
    if (meta.live) {
      html += '<span class="source-note">数据抓取时间 ' + JB.esc(meta.fetchedAt || "") + (meta.cached ? "（缓存）" : "") + "</span>";
    } else {
      html += '<span class="source-note" style="color:var(--amber)">未连接在线数据源，当前显示内置示例岗位库</span>';
    }
    html += "</div>";
    return html;
  }

  function searchPanelHTML() {
    var state = JB.store.get();
    var allSources = ["remotive", "arbeitnow", "jobicy", "remoteok"];
    var html = '<div class="card"><div class="card-body search-panel">';
    html += '<div class="search-row">' +
      '<div class="search-input"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>' +
      '<input type="text" id="jobQuery" placeholder="岗位关键词，例如：后端实习 / 数据分析 / 产品经理" value="' + JB.esc(ui.q) + '" /></div>' +
      '<input type="text" id="jobLocation" placeholder="城市，如 北京 / 远程" value="' + JB.esc(ui.location) + '" style="max-width:170px" />' +
      '<button class="btn primary" data-search="1">搜索岗位</button>' +
      "</div>";
    html += '<div class="filter-line"><span>岗位类型</span>' +
      '<select id="jobType" style="width:auto">' + JB.optionList(["实习", "校招", "全职", "远程"], ui.type, "不限") + "</select>" +
      '<span>排序</span><select id="jobSort" style="width:auto">' +
      JB.optionList([{ value: "match", label: "按匹配度" }, { value: "time", label: "按更新时间" }], ui.sort) + "</select>" +
      '<span class="spacer"></span>' +
      '<button class="btn sm ghost" data-jd-import="1">粘贴 JD 导入岗位</button>' +
      "</div>";
    html += '<div class="filter-line"><span>数据源</span><div class="chip-group">';
    allSources.forEach(function (key) {
      var meta = JB.api.SOURCE_META[key];
      html += '<button class="chip' + (sources().indexOf(key) > -1 ? " on" : "") + '" data-source="' + key + '" title="' + JB.esc(meta.note) + '">' + JB.esc(meta.label) + "</button>";
    });
    html += "</div></div>";
    html += '<p class="tiny muted" style="margin:0">在线数据源以海外远程岗位为主（英文居多）；中文岗位建议使用「粘贴 JD 导入」把 BOSS、实习僧等平台的岗位保存进来，匹配度算法完全相同。</p>';
    html += sourceStatusHTML();
    html += "</div></div>";
    return html;
  }

  function savedLibraryHTML() {
    var state = JB.store.get();
    var saved = withMatch((state.savedJobs || []).slice());
    if (!saved.length) {
      return '<div class="card"><div class="card-body"><div class="empty"><div class="icon">⭐️</div><h3>还没有收藏岗位</h3>' +
        "<p>在搜索结果里点“收藏”，或粘贴一段招聘信息导入，岗位会保存在这里，随时可以加入投递。</p>" +
        '<button class="btn primary" data-tab="search">去搜索岗位</button></div></div></div>';
    }
    saved.sort(function (a, b) { return (b._match ? b._match.score : 0) - (a._match ? a._match.score : 0); });
    var html = '<div class="row between mb-16"><span class="muted small">共收藏 ' + saved.length + " 个岗位</span>" +
      '<button class="btn sm ghost" data-jd-import="1">粘贴 JD 导入</button></div>';
    saved.forEach(function (job) { html += jobCard(job); });
    return html;
  }

  function render(el) {
    var html = "";
    html += '<div class="row mb-16" style="gap:6px">' +
      '<button class="btn sm' + (ui.tab === "search" ? " primary" : "") + '" data-tab="search">搜索岗位</button>' +
      '<button class="btn sm' + (ui.tab === "library" ? " primary" : "") + '" data-tab="library">我的岗位库 (' + (JB.store.get().savedJobs || []).length + ")</button>" +
      "</div>";

    if (ui.tab === "library") {
      el.innerHTML = html + savedLibraryHTML();
      return;
    }

    html += searchPanelHTML();

    if (ui.loading) {
      el.innerHTML = html + '<div class="card mt-16"><div class="card-body"><div class="empty"><div class="icon">⏳</div><h3>正在抓取岗位…</h3><p>首次搜索需要 3-8 秒，之后会使用 10 分钟缓存。</p></div></div></div>';
      return;
    }

    var list = visibleJobs();
    html += '<div class="row between mt-16"><span class="muted small">' +
      (ui.searched ? "找到 " + list.length + " 个岗位" + (ui.type ? "（已按" + ui.type + "筛选）" : "") : "输入关键词后点击搜索") +
      '</span><span class="muted tiny">匹配度基于当前简历「' + JB.esc((JB.store.activeResume() || {}).name || "无") + "」计算</span></div>";

    if (ui.error) {
      html += '<div class="card mt-16"><div class="card-body"><p class="muted small" style="margin:0">在线数据源暂时不可用（' + JB.esc(ui.error) + "），已为你展示内置示例岗位。</p></div></div>";
    }

    if (!ui.searched) {
      html += '<div class="card mt-16"><div class="card-body"><div class="empty"><div class="icon">🔍</div><h3>开始找岗位</h3>' +
        "<p>输入岗位关键词（如“后端实习”“数据分析”“产品经理”）后点击搜索。搜索到的岗位会用你的简历自动算匹配度，并用绿底标出你已经具备的技能。</p></div></div></div>";
      return void (el.innerHTML = html);
    }

    if (!list.length) {
      html += '<div class="card mt-16"><div class="card-body"><div class="empty"><div class="icon">🫥</div><h3>这次没有找到合适的岗位</h3>' +
        "<p>试试更宽泛的关键词（例如“后端”“运营”），或切换数据源、清空城市筛选。</p>" +
        '<button class="btn primary" data-jd-import="1">粘贴 JD 手动添加</button></div></div></div>';
      return void (el.innerHTML = html);
    }

    var cards = "";
    list.forEach(function (job) { cards += jobCard(job); });
    el.innerHTML = html + '<div class="mt-16">' + cards + "</div>";
  }

  /* ---------------- 搜索执行 ---------------- */
  function runSearch(el) {
    var state = JB.store.get();
    var limit = state.settings.jobLimit || 60;
    ui.loading = true;
    ui.searched = true;
    ui.error = "";
    render(el);

    JB.api.searchJobs({ q: ui.q, location: ui.location, sources: sources(), limit: limit })
      .then(function (data) {
        ui.loading = false;
        ui.results = withMatch(data.jobs || []);
        ui.meta = data;
        if (data.message) ui.error = data.message;
        if (data.usedSeed && !data.live) ui.error = "在线数据源连接失败，正在显示内置示例岗位";
        JB.store.setSettings({ lastSearch: { q: ui.q, location: ui.location, at: new Date().toISOString() } });
        render(el);
        if (!ui.results.length) JB.toast("没有匹配的岗位，试试换个关键词", "warn");
      })
      .catch(function (err) {
        ui.loading = false;
        ui.error = err.message;
        render(el);
      });
  }

  function bind(el, ctx) {
    el.addEventListener("click", function (event) {
      var target = event.target;

      var tab = target.closest("[data-tab]");
      if (tab) { ui.tab = tab.getAttribute("data-tab"); render(el); return; }

      if (target.closest("[data-search]")) {
        var q = JB.q("#jobQuery");
        var loc = JB.q("#jobLocation");
        ui.q = q ? q.value.trim() : ui.q;
        ui.location = loc ? loc.value.trim() : ui.location;
        runSearch(el);
        return;
      }

      var source = target.closest("[data-source]");
      if (source) {
        var key = source.getAttribute("data-source");
        var list = sources().slice();
        var idx = list.indexOf(key);
        if (idx > -1) list.splice(idx, 1); else list.push(key);
        if (!list.length) { JB.toast("至少保留一个数据源", "warn"); return; }
        ui.sources = list;
        JB.store.setSettings({ sources: list });
        render(el);
        if (ui.searched) runSearch(el);
        return;
      }

      if (target.closest("[data-jd-import]")) { ctx.openJdImport(); return; }

      var toggle = target.closest("[data-toggle-job]");
      if (toggle) {
        var id = toggle.getAttribute("data-toggle-job");
        ui.expanded[id] = !ui.expanded[id];
        render(el);
        return;
      }

      var save = target.closest("[data-save-job]");
      if (save) {
        var jobId = save.getAttribute("data-save-job");
        var job = findJob(jobId);
        if (!job) return;
        var now = JB.store.toggleSavedJob(job);
        JB.toast(now ? "已收藏到我的岗位库" : "已取消收藏", "ok");
        render(el);
        return;
      }

      var apply = target.closest("[data-apply-job]");
      if (apply) {
        var job2 = findJob(apply.getAttribute("data-apply-job"));
        if (job2) ctx.openApplicationEditor(null, job2);
        return;
      }

      var copy = target.closest("[data-copy-job]");
      if (copy) {
        var job3 = findJob(copy.getAttribute("data-copy-job"));
        if (!job3) return;
        var text = [job3.title, job3.company, job3.location, job3.salary, job3.url, "", job3.description].filter(function (v) { return v !== undefined; }).join("\n");
        JB.copy(text, "已复制岗位信息");
      }
    });

    el.addEventListener("change", function (event) {
      if (event.target.id === "jobType") { ui.type = event.target.value; render(el); }
      if (event.target.id === "jobSort") { ui.sort = event.target.value; render(el); }
    });

    el.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      if (event.target.id === "jobQuery" || event.target.id === "jobLocation") {
        var q = JB.q("#jobQuery"), loc = JB.q("#jobLocation");
        ui.q = q ? q.value.trim() : "";
        ui.location = loc ? loc.value.trim() : "";
        runSearch(el);
      }
    });
  }

  function findJob(id) {
    var state = JB.store.get();
    var pool = (ui.results || []).concat(state.savedJobs || []);
    for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    return null;
  }

  JB.views.jobs = {
    title: "找工作",
    subtitle: "自动查询岗位，并用你的简历算匹配度",
    render: render,
    bind: bind,
    actions: function (ctx) {
      return [
        { label: "粘贴 JD 导入", kind: "", icon: "📋", onClick: function () { ctx.openJdImport(); } },
        { label: "手动添加岗位", kind: "primary", icon: "+", onClick: function () { ctx.openJobCreator(); } }
      ];
    },
    setTab: function (tab) { ui.tab = tab; },
    runSearch: runSearch,
    prefill: function (opts) {
      if (opts && opts.q !== undefined) ui.q = opts.q;
      if (opts && opts.location !== undefined) ui.location = opts.location;
    }
  };
})();
