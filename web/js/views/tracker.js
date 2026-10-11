/* 投递追踪：看板 + 列表 + 转化统计 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  var ui = { mode: "board", dragging: null };

  function urgencyClass(date) {
    var days = JB.daysFromToday(date);
    if (days === null) return "";
    if (days < 0) return "late";
    if (days <= 2) return "soon";
    return "";
  }

  function cardHTML(app) {
    var stage = JB.store.stage(app.stage);
    var nextCls = urgencyClass(app.nextActionAt);
    var deadlineCls = urgencyClass(app.deadline);
    var index = JB.store.stageIndex(app.stage);
    return '<div class="kanban-card" draggable="true" data-app-id="' + JB.esc(app.id) + '">' +
      '<div class="kc-title">' + JB.esc(app.title || "未填写岗位") + "</div>" +
      '<div class="kc-co">' + JB.esc(app.company || "未填写公司") + "</div>" +
      '<div class="kc-meta">' +
      (app.city ? "<span>📍" + JB.esc(app.city) + "</span>" : "") +
      (app.salary ? "<span>💰" + JB.esc(app.salary) + "</span>" : "") +
      (app.channel ? "<span>🔗" + JB.esc(app.channel) + "</span>" : "") +
      (app.appliedAt ? "<span>投递 " + JB.esc(JB.fmtDate(app.appliedAt, "md")) + "</span>" : "") +
      "</div>" +
      (app.nextAction || app.nextActionAt
        ? '<div class="kc-next ' + nextCls + '">下一步：' + JB.esc(app.nextAction || "跟进") +
        (app.nextActionAt ? " · " + JB.esc(JB.relDate(app.nextActionAt)) : "") + "</div>"
        : "") +
      (app.deadline && ["wish", "applied"].indexOf(app.stage) > -1
        ? '<div class="kc-next ' + deadlineCls + '">截止：' + JB.esc(JB.fmtDate(app.deadline)) + "（" + JB.esc(JB.relDate(app.deadline)) + "）</div>"
        : "") +
      '<div class="kc-foot">' +
      '<button class="btn sm ghost" data-move-app="' + JB.esc(app.id) + '" data-dir="-1"' + (index === 0 ? " disabled" : "") + ' title="移到上一阶段">←</button>' +
      '<button class="btn sm ghost" data-move-app="' + JB.esc(app.id) + '" data-dir="1"' + (index === JB.store.STAGES.length - 1 ? " disabled" : "") + ' title="移到下一阶段">→</button>' +
      '<span class="spacer" style="flex:1"></span>' +
      '<button class="btn sm ghost" data-edit-app="' + JB.esc(app.id) + '">编辑</button>' +
      "</div></div>";
  }

  function boardHTML() {
    var html = '<div class="board">';
    JB.store.STAGES.forEach(function (stage) {
      var apps = JB.store.applicationsByStage(stage.key);
      apps.sort(function (a, b) {
        var da = a.nextActionAt ? JB.daysFromToday(a.nextActionAt) : 999;
        var db = b.nextActionAt ? JB.daysFromToday(b.nextActionAt) : 999;
        if (da !== db) return da - db;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
      html += '<div class="col" data-stage="' + stage.key + '">' +
        '<div class="col-head"><span class="swatch" style="background:' + stage.color + '"></span>' +
        '<span class="name">' + JB.esc(stage.label) + '</span><span class="count">' + apps.length + "</span>" +
        '<span class="spacer" style="flex:1"></span>' +
        '<button class="icon-btn" data-add-app="' + stage.key + '" title="在此阶段添加">+</button></div>' +
        '<div class="col-body" data-stage-body="' + stage.key + '">' +
        (apps.length ? apps.map(cardHTML).join("") : '<div class="tiny muted" style="text-align:center;padding:16px 6px">' + JB.esc(stage.hint) + "</div>") +
        "</div></div>";
    });
    html += "</div>";
    return html;
  }

  function listHTML() {
    var apps = (JB.store.get().applications || []).slice();
    if (!apps.length) {
      return '<div class="card"><div class="card-body"><div class="empty"><div class="icon">📮</div><h3>还没有投递记录</h3>' +
        "<p>记录每一次投递，才能知道自己的节奏和转化率。</p>" +
        '<button class="btn primary" data-add-app="">添加投递记录</button></div></div></div>';
    }
    apps.sort(function (a, b) { return String(b.appliedAt || "").localeCompare(String(a.appliedAt || "")); });
    var html = '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>公司</th><th>岗位</th><th>阶段</th><th class=\"nowrap\">投递时间</th><th class=\"nowrap\">下一步</th><th>渠道</th><th></th>" +
      "</tr></thead><tbody>";
    apps.forEach(function (app) {
      var stage = JB.store.stage(app.stage);
      html += "<tr>" +
        '<td class="nowrap"><b>' + JB.esc(app.company || "—") + "</b>" + (app.city ? '<div class="tiny muted">' + JB.esc(app.city) + "</div>" : "") + "</td>" +
        "<td>" + JB.esc(app.title || "—") + (app.salary ? '<div class="tiny muted">' + JB.esc(app.salary) + "</div>" : "") + "</td>" +
        '<td class="nowrap"><span class="badge" style="background:' + stage.color + '22;color:' + stage.color + ';border-color:transparent">' + JB.esc(stage.label) + "</span></td>" +
        '<td class="nowrap">' + JB.esc(JB.fmtDate(app.appliedAt, "md") || "—") + "</td>" +
        '<td class="nowrap">' + (app.nextAction ? JB.esc(app.nextAction) : '<span class="muted">—</span>') +
        (app.nextActionAt ? '<div class="tiny ' + (urgencyClass(app.nextActionAt) === "late" ? "" : "muted") + '"' +
          (urgencyClass(app.nextActionAt) === "late" ? ' style="color:var(--red)"' : "") + ">" + JB.esc(JB.relDate(app.nextActionAt)) + "</div>" : "") + "</td>" +
        '<td class="nowrap tiny muted">' + JB.esc(app.channel || "—") + "</td>" +
        '<td class="nowrap"><button class="btn sm ghost" data-edit-app="' + JB.esc(app.id) + '">编辑</button></td>' +
        "</tr>";
    });
    html += "</tbody></table></div></div>";
    return html;
  }

  function statsHTML() {
    var apps = JB.store.get().applications || [];
    var submitted = apps.filter(function (a) { return a.stage !== "wish"; });
    var progressed = apps.filter(function (a) { return ["test", "interview", "offer"].indexOf(a.stage) > -1; });
    var offers = apps.filter(function (a) { return a.stage === "offer"; });
    function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

    // 平均投递→首次反馈天数
    var gaps = [];
    apps.forEach(function (app) {
      var first = (app.history || []).filter(function (h) {
        return ["test", "interview", "offer"].indexOf(h.to) > -1;
      })[0];
      if (first && app.appliedAt) {
        var a = JB.startOfDay(app.appliedAt);
        var b = JB.startOfDay(first.at);
        var days = Math.round((b - a) / 86400000);
        if (days >= 0) gaps.push(days);
      }
    });
    var avgGap = gaps.length ? Math.round(gaps.reduce(function (s, v) { return s + v; }, 0) / gaps.length) : null;

    return '<div class="grid cols-4">' +
      '<div class="stat"><div class="label">已投递</div><div class="value">' + submitted.length + "</div>" +
      '<div class="foot">另有 ' + (apps.length - submitted.length) + " 个在“想投”清单</div></div>" +
      '<div class="stat"><div class="label">进入笔试 / 面试</div><div class="value">' + progressed.length +
      '<small>个</small></div><div class="foot">转化率 ' + pct(progressed.length, submitted.length) + "%</div></div>" +
      '<div class="stat"><div class="label">Offer</div><div class="value">' + offers.length + "</div>" +
      '<div class="foot">Offer 率 ' + pct(offers.length, submitted.length) + "%</div></div>" +
      '<div class="stat"><div class="label">平均反馈等待</div><div class="value">' + (avgGap === null ? "—" : avgGap) +
      (avgGap === null ? "" : "<small>天</small>") + "</div>" +
      '<div class="foot">' + (avgGap === null ? "记录阶段变化后自动统计" : "从投递到首次进入笔试/面试") + "</div></div>" +
      "</div>";
  }

  function render(el) {
    var apps = JB.store.get().applications || [];
    var html = '<div class="row between mb-16">' +
      '<div class="row" style="gap:6px">' +
      '<button class="btn sm' + (ui.mode === "board" ? " primary" : "") + '" data-mode="board">看板</button>' +
      '<button class="btn sm' + (ui.mode === "list" ? " primary" : "") + '" data-mode="list">列表</button>' +
      "</div>" +
      '<div class="row" style="gap:8px">' +
      '<button class="btn sm" data-add-app="">+ 添加投递记录</button>' +
      '<button class="btn sm ghost" data-export-apps="1">导出投递记录 CSV</button>' +
      "</div></div>";

    if (apps.length) html += statsHTML() + '<div class="mt-16"></div>';
    html += ui.mode === "board" ? boardHTML() : listHTML();
    if (ui.mode === "board" && apps.length) {
      html += '<p class="tiny muted mt-16">小技巧：卡片可以直接拖到其他列；点“→”可以把记录推进到下一个阶段。</p>';
    }
    el.innerHTML = html;
  }

  function moveApp(id, dir) {
    var app = JB.store.getApplication(id);
    if (!app) return;
    var index = JB.store.stageIndex(app.stage) + dir;
    if (index < 0 || index >= JB.store.STAGES.length) return;
    var target = JB.store.STAGES[index];
    JB.store.moveApplication(id, target.key);
    JB.toast("已移到「" + target.label + "」", "ok");
  }

  function bind(el, ctx) {
    el.addEventListener("click", function (event) {
      var target = event.target;

      var mode = target.closest("[data-mode]");
      if (mode) { ui.mode = mode.getAttribute("data-mode"); render(el); return; }

      if (target.closest("[data-add-app]")) {
        var stage = target.closest("[data-add-app]").getAttribute("data-add-app");
        ctx.openApplicationEditor(null, null, { stage: stage || "wish" });
        return;
      }

      var edit = target.closest("[data-edit-app]");
      if (edit) { ctx.openApplicationEditor(edit.getAttribute("data-edit-app")); return; }

      var move = target.closest("[data-move-app]");
      if (move) {
        moveApp(move.getAttribute("data-move-app"), Number(move.getAttribute("data-dir")));
        return;
      }

      if (target.closest("[data-export-apps]")) {
        var apps = JB.store.get().applications || [];
        if (!apps.length) { JB.toast("还没有投递记录", "warn"); return; }
        var rows = [["公司", "岗位", "阶段", "城市", "薪资", "渠道", "投递时间", "截止时间", "下一步", "下一步时间", "备注", "链接"]];
        apps.forEach(function (app) {
          rows.push([
            app.company, app.title, JB.store.stage(app.stage).label, app.city, app.salary, app.channel,
            app.appliedAt, app.deadline, app.nextAction, app.nextActionAt,
            String(app.notes || "").replace(/\n/g, " "), app.url
          ]);
        });
        var csv = rows.map(function (row) {
          return row.map(function (cell) {
            var v = cell === undefined || cell === null ? "" : String(cell);
            return '"' + v.replace(/"/g, '""') + '"';
          }).join(",");
        }).join("\r\n");
        JB.download("投递记录-" + JB.todayISO() + ".csv", "\ufeff" + csv, "text/csv;charset=utf-8");
        JB.toast("已导出 CSV，可用 Excel 打开", "ok");
        return;
      }

      var card = target.closest(".kanban-card");
      if (card && !target.closest("button") && !target.closest("a")) {
        ctx.openApplicationEditor(card.getAttribute("data-app-id"));
      }
    });

    /* 拖拽 */
    el.addEventListener("dragstart", function (event) {
      var card = event.target.closest(".kanban-card");
      if (!card) return;
      ui.dragging = card.getAttribute("data-app-id");
      card.classList.add("dragging");
      try { event.dataTransfer.setData("text/plain", ui.dragging); } catch (e) { /* ignore */ }
      event.dataTransfer.effectAllowed = "move";
    });

    el.addEventListener("dragend", function (event) {
      var card = event.target.closest(".kanban-card");
      if (card) card.classList.remove("dragging");
      JB.qa(".col.drag-over", el).forEach(function (col) { col.classList.remove("drag-over"); });
      ui.dragging = null;
    });

    el.addEventListener("dragover", function (event) {
      var col = event.target.closest(".col");
      if (!col) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (!col.classList.contains("drag-over")) col.classList.add("drag-over");
    });

    el.addEventListener("dragleave", function (event) {
      var col = event.target.closest(".col");
      if (col && !col.contains(event.relatedTarget)) col.classList.remove("drag-over");
    });

    el.addEventListener("drop", function (event) {
      var col = event.target.closest(".col");
      if (!col) return;
      event.preventDefault();
      col.classList.remove("drag-over");
      var id = ui.dragging || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
      if (!id) return;
      var stage = col.getAttribute("data-stage");
      var app = JB.store.getApplication(id);
      if (app && app.stage !== stage) {
        JB.store.moveApplication(id, stage);
        JB.toast("已移到「" + JB.store.stage(stage).label + "」", "ok");
      }
    });
  }

  JB.views.tracker = {
    title: "投递追踪",
    subtitle: "从想投到 Offer，每一步都看得见",
    render: render,
    bind: bind,
    actions: function (ctx) {
      return [{ label: "添加投递记录", kind: "primary", icon: "+", onClick: function () { ctx.openApplicationEditor(null); } }];
    },
    setMode: function (mode) { ui.mode = mode; }
  };
})();
