/* 概览页 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  function stats(state) {
    var apps = state.applications || [];
    var byStage = {};
    JB.store.STAGES.forEach(function (s) { byStage[s.key] = 0; });
    apps.forEach(function (a) { byStage[a.stage] = (byStage[a.stage] || 0) + 1; });
    var inProgress = apps.filter(function (a) { return ["applied", "test", "interview"].indexOf(a.stage) > -1; }).length;
    var thisWeek = apps.filter(function (a) {
      var d = JB.daysFromToday(a.appliedAt);
      return d !== null && d <= 0 && d >= -6;
    }).length;
    return {
      resumes: (state.resumes || []).length,
      total: apps.length,
      byStage: byStage,
      inProgress: inProgress,
      offer: byStage.offer || 0,
      interview: byStage.interview || 0,
      saved: (state.savedJobs || []).length,
      thisWeek: thisWeek,
      submitted: apps.filter(function (a) { return a.stage !== "wish"; }).length
    };
  }

  /** 待办：下一步行动 + 截止时间，按紧急程度排序 */
  function todos(state) {
    var out = [];
    (state.applications || []).forEach(function (app) {
      if (app.nextActionAt) {
        out.push({
          kind: "next",
          when: app.nextActionAt,
          days: JB.daysFromToday(app.nextActionAt),
          label: app.nextAction || "跟进进展",
          app: app
        });
      }
      if (app.deadline && ["wish", "applied"].indexOf(app.stage) > -1) {
        out.push({
          kind: "deadline",
          when: app.deadline,
          days: JB.daysFromToday(app.deadline),
          label: "投递截止",
          app: app
        });
      }
    });
    out = out.filter(function (item) { return item.days !== null && item.days <= 14; });
    out.sort(function (a, b) { return a.days - b.days; });
    return out.slice(0, 8);
  }

  function trend(state) {
    var weeks = [];
    var today = JB.startOfDay(new Date());
    for (var i = 7; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      weeks.push({ key: JB.weekKey(JB.isoOf(d)), label: (d.getMonth() + 1) + "/" + d.getDate(), value: 0 });
    }
    (state.applications || []).forEach(function (app) {
      var key = JB.weekKey(app.appliedAt || app.createdAt);
      weeks.forEach(function (w) { if (w.key === key) w.value++; });
    });
    return weeks;
  }

  function renderTodo(item) {
    var cls = item.days < 0 ? "late" : item.days <= 2 ? "soon" : "";
    var when = item.days < 0 ? "逾期 " + Math.abs(item.days) + " 天" : JB.relDate(item.when);
    return '<div class="todo-item ' + cls + '" data-app-id="' + JB.esc(item.app.id) + '">' +
      '<span class="dot"></span>' +
      '<div class="what"><b>' + JB.esc(item.label) + "</b> · " +
      JB.esc(item.app.company || item.app.title || "未命名投递") + "</div>" +
      '<div class="when">' + JB.esc(when) + "</div>" +
      '<button class="btn sm ghost" data-open-app="' + JB.esc(item.app.id) + '">查看</button>' +
      "</div>";
  }

  function render(el) {
    var state = JB.store.get();
    var s = stats(state);
    var resume = JB.store.activeResume();
    var complete = JB.skills.completeness(resume);
    var todoList = todos(state);
    var weeks = trend(state);
    var maxWeek = Math.max.apply(null, weeks.map(function (w) { return w.value; }).concat([1]));
    var name = ((resume && resume.basic && resume.basic.name) || "").trim();
    var hello = name ? name + "，你好" : "你好";

    var html = "";

    /* 问候 + 快捷操作 */
    html += '<div class="hello">' +
      "<div><h2>" + JB.esc(hello) + " 👋</h2>" +
      "<p>求职是件长期的事，把它拆成今天能做的一小步就好。</p></div>" +
      '<div class="quick">' +
      '<button class="btn primary" data-go="jobs">去找岗位</button>' +
      '<button class="btn" data-go="resumes">完善简历</button>' +
      '<button class="btn" data-add-app="1">记录投递</button>' +
      "</div></div>";

    /* 数据卡片 */
    html += '<div class="grid cols-4 mt-16">' +
      '<div class="stat"><div class="label">简历版本</div><div class="value">' + s.resumes + "</div>" +
      '<div class="foot">当前简历完整度 ' + complete.score + "%</div></div>" +
      '<div class="stat"><div class="label">进行中的投递</div><div class="value">' + s.inProgress +
      '<small>个</small></div><div class="foot">累计投递 ' + s.submitted + " 个岗位</div></div>" +
      '<div class="stat"><div class="label">面试中</div><div class="value">' + s.interview + "</div>" +
      '<div class="foot">别忘了面试前做一次复盘</div></div>' +
      '<div class="stat"><div class="label">已获 Offer</div><div class="value">' + s.offer + "</div>" +
      '<div class="foot">本周新增投递 ' + s.thisWeek + " 个</div></div>" +
      "</div>";

    html += '<div class="grid cols-2 mt-16" style="align-items:start">';

    /* 待办 */
    html += '<div class="card"><div class="card-head"><h2>近期待办</h2>' +
      '<span class="sub">未来 14 天内</span><span class="spacer"></span>' +
      '<button class="btn sm ghost" data-go="tracker">全部投递</button></div>' +
      '<div class="card-body">';
    if (!todoList.length) {
      html += '<div class="empty"><div class="icon">🗓️</div><h3>近期没有待办</h3>' +
        "<p>给投递记录填写“下一步行动”和日期，这里就会自动提醒你。</p></div>";
    } else {
      todoList.forEach(function (item) { html += renderTodo(item); });
    }
    html += "</div></div>";

    /* 投递漏斗 */
    html += '<div class="card"><div class="card-head"><h2>投递进度分布</h2><span class="spacer"></span>' +
      '<span class="sub">共 ' + s.total + " 条记录</span></div><div class=\"card-body\">";
    if (!s.total) {
      html += '<div class="empty"><div class="icon">📮</div><h3>还没有投递记录</h3>' +
        "<p>在“找工作”里挑一个岗位，点“加入投递”就能开始追踪进度。</p>" +
        '<button class="btn primary" data-go="jobs">去看看岗位</button></div>';
    } else {
      html += '<div class="bar-chart">';
      JB.store.STAGES.forEach(function (stage) {
        var count = s.byStage[stage.key] || 0;
        var pct = s.total ? Math.round((count / s.total) * 100) : 0;
        html += '<div class="bar-row"><span>' + JB.esc(stage.label) + "</span>" +
          '<div class="track"><i style="width:' + pct + "%;background:" + stage.color + '"></i></div>' +
          '<span class="num">' + count + "</span></div>";
      });
      html += "</div>";
    }
    html += "</div></div>";

    html += "</div>";

    /* 趋势 + 简历状态 */
    html += '<div class="grid cols-2 mt-16" style="align-items:start">';
    html += '<div class="card"><div class="card-head"><h2>近 8 周投递节奏</h2><span class="spacer"></span>' +
      '<span class="sub">按投递日期统计</span></div><div class="card-body">' +
      '<div class="spark">';
    weeks.forEach(function (w) {
      var h = Math.max(4, Math.round((w.value / maxWeek) * 78));
      html += '<div class="col" title="' + w.value + ' 个"><div class="bar" style="height:' + h + 'px"><i style="height:100%"></i></div>' +
        '<span class="lbl">' + JB.esc(w.label) + "</span></div>";
    });
    html += "</div>";
    if (s.total === 0) {
      html += '<p class="muted small mt-8">开始投递后，这里会显示你的投递节奏，帮你发现“是不是该加大投递量了”。</p>';
    } else {
      var best = Math.max.apply(null, weeks.map(function (w) { return w.value; }));
      html += '<p class="muted small mt-8">单周最多投递 <b>' + best + "</b> 个岗位。建议每周保持 3-5 个高质量投递，比一次性海投更有效。</p>";
    }
    html += "</div></div>";

    /* 简历完整度 */
    html += '<div class="card"><div class="card-head"><h2>当前简历状态</h2><span class="spacer"></span>' +
      (resume ? '<span class="badge accent">' + JB.esc(resume.name) + "</span>" : "") +
      '</div><div class="card-body">';
    if (!resume) {
      html += '<div class="empty"><div class="icon">📄</div><h3>还没有简历</h3><p>先建一份简历，匹配度和投递都围绕它工作。</p>' +
        '<button class="btn primary" data-go="resumes">去创建</button></div>';
    } else {
      html += '<div class="row between"><span class="strong">完整度 ' + complete.score + "%</span>" +
        '<span class="muted small">' + (complete.missing.length ? "还有 " + complete.missing.length + " 项可以补充" : "很完整，可以投递了") + "</span></div>" +
        '<div class="progress mt-8"><i style="width:' + complete.score + '%"></i></div>';
      html += '<div class="mt-16">';
      complete.checks.slice(0, 6).forEach(function (check) {
        html += '<div class="row between" style="padding:5px 0">' +
          "<span>" + (check.done ? "✅" : "⬜️") + " " + JB.esc(check.label) + "</span>" +
          (check.done ? "" : '<span class="muted tiny truncate" style="max-width:52%">' + JB.esc(check.tip) + "</span>") +
          "</div>";
      });
      html += "</div>";
      var suggests = JB.skills.suggest(resume);
      if (suggests.length) {
        html += '<div class="divider"></div><div class="small muted mb-8">建议补充的技能关键词（点一下加入简历）</div><div class="chip-group">';
        suggests.forEach(function (skill) {
          html += '<button class="chip" data-add-skill="' + JB.esc(skill) + '">+ ' + JB.esc(skill) + "</button>";
        });
        html += "</div>";
      }
      html += '<div class="mt-16"><button class="btn block" data-go="resumes">去完善简历</button></div>';
    }
    html += "</div></div>";
    html += "</div>";

    el.innerHTML = html;
  }

  function bind(el, ctx) {
    el.addEventListener("click", function (event) {
      var go = event.target.closest("[data-go]");
      if (go) { ctx.navigate(go.getAttribute("data-go")); return; }

      var addApp = event.target.closest("[data-add-app]");
      if (addApp) { ctx.openApplicationEditor(null); return; }

      var openApp = event.target.closest("[data-open-app]");
      if (openApp) { ctx.openApplicationEditor(openApp.getAttribute("data-open-app")); return; }

      var skillBtn = event.target.closest("[data-add-skill]");
      if (skillBtn) {
        var resume = JB.store.activeResume();
        if (!resume) return;
        var list = (resume.skills || []).slice();
        var skill = skillBtn.getAttribute("data-add-skill");
        if (list.indexOf(skill) === -1) list.push(skill);
        JB.store.updateResume(resume.id, { skills: list });
        JB.toast("已加入简历技能：" + skill, "ok");
      }
    });
  }

  JB.views.dashboard = {
    title: "概览",
    subtitle: "今天也离理想工作更近一点",
    render: render,
    bind: bind,
    stats: stats,
    todos: todos
  };
})();
