/* 应用入口：路由、顶栏、弹窗表单、快捷键 */
(function () {
  "use strict";
  var JB = window.JB;
  var VIEW_KEYS = ["dashboard", "resumes", "jobs", "tracker", "interview", "settings"];
  var bound = {};
  var current = "dashboard";

  var ctx = {
    navigate: navigate,
    refresh: function () { renderActive(); },
    openResumeCreator: openResumeCreator,
    openJobCreator: openJobCreator,
    openJdImport: openJdImport,
    openApplicationEditor: openApplicationEditor,
    syncTheme: syncTheme
  };

  /* ---------------- 主题 ---------------- */
  function syncTheme() {
    var theme = JB.store.get().theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    var label = JB.q("#themeLabel");
    if (label) label.textContent = theme === "dark" ? "深色" : "浅色";
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var hash = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return VIEW_KEYS.indexOf(hash) > -1 ? hash : "dashboard";
  }

  function navigate(key) {
    if (VIEW_KEYS.indexOf(key) === -1) key = "dashboard";
    if (("#/" + key) === location.hash) {
      current = key;
      renderActive();
      return;
    }
    location.hash = "#/" + key;
  }

  function renderActive() {
    var view = JB.views[current];
    var el = JB.q("#view-" + current);
    if (!view || !el) return;

    var titleNode = JB.q("#viewTitle");
    var subNode = JB.q("#viewSubtitle");
    if (titleNode) titleNode.textContent = view.title || "";
    if (subNode) subNode.textContent = view.subtitle || "";

    var actions = JB.q("#topbarActions");
    if (actions) {
      var list = typeof view.actions === "function" ? (view.actions(ctx) || []) : [];
      actions.innerHTML = list.map(function (action) {
        return '<button class="btn ' + (action.kind || "") + '" data-action="' + JB.esc(action.label) + '">' +
          (action.icon ? JB.esc(action.icon) + " " : "") + JB.esc(action.label) + "</button>";
      }).join("");
      actions.onclick = function (event) {
        var btn = event.target.closest("[data-action]");
        if (!btn) return;
        var cfg = list.filter(function (a) { return a.label === btn.getAttribute("data-action"); })[0];
        if (cfg && cfg.onClick) cfg.onClick(ctx);
      };
    }

    view.render(el);
    if (!bound[current]) {
      view.bind(el, ctx);
      bound[current] = true;
    }
  }

  function showView(key) {
    current = key;
    JB.qa(".view").forEach(function (node) {
      node.classList.toggle("active", node.id === "view-" + key);
    });
    JB.qa(".nav-item").forEach(function (node) {
      node.classList.toggle("active", node.getAttribute("data-view") === key);
    });
    renderActive();
    var sidebar = JB.q("#sidebar");
    if (sidebar) sidebar.classList.remove("open");
    window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
  }

  /* ---------------- 简历创建 ---------------- */
  function openResumeCreator() {
    JB.modal({
      title: "新建简历版本",
      html:
        '<div class="form-grid">' +
        '<div class="field span-2"><label>简历名称</label><input type="text" data-field="name" placeholder="例如：数据分析实习 · 主投版" /></div>' +
        '<div class="field"><label>目标岗位</label><input type="text" data-field="targetRole" placeholder="数据分析实习生" /></div>' +
        '<div class="field"><label>期望城市</label><input type="text" data-field="targetCity" placeholder="上海 / 远程" /></div>' +
        '<div class="field"><label>岗位类型</label><select data-field="targetType">' + JB.optionList(JB.store.JOB_TYPES, "实习") + "</select></div>" +
        '<div class="field"><label>模板</label><select data-field="template">' +
        JB.optionList([{ value: "classic", label: "经典" }, { value: "modern", label: "现代" }, { value: "compact", label: "紧凑" }], "classic") +
        "</select></div></div>" +
        '<div class="row mt-16" style="gap:8px"><button class="btn ghost" data-sample="1">用示例内容创建</button>' +
        '<span class="tiny muted">不知道写什么？载入示例后改成自己的经历即可</span></div>',
      buttons: [
        { label: "取消", kind: "ghost" },
        {
          label: "创建", kind: "primary", onClick: function (close, root) {
            var values = JB.formValues(root);
            var resume = JB.store.emptyResume(values.name || ("新简历 " + ((JB.store.get().resumes || []).length + 1)));
            resume.targetRole = values.targetRole || "";
            resume.targetCity = values.targetCity || "";
            resume.targetType = values.targetType || "实习";
            resume.template = values.template || "classic";
            JB.store.addResume(resume);
            close();
            JB.views.resumes.setTab("basic");
            JB.views.resumes.setMode("edit");
            navigate("resumes");
            JB.toast("已创建简历，开始填写吧", "ok");
          }
        }
      ],
      onOpen: function (root) {
        root.addEventListener("click", function (event) {
          if (!event.target.closest("[data-sample]")) return;
          JB.store.loadSampleResume();
          JB.views.resumes.setTab("basic");
          JB.views.resumes.setMode("edit");
          JB.closeTopLayer();
          navigate("resumes");
          JB.toast("已用示例内容创建简历", "ok");
        });
      }
    });
  }

  /* ---------------- 手动添加岗位 ---------------- */
  function openJobCreator() {
    JB.modal({
      title: "手动添加岗位",
      wide: true,
      html:
        '<div class="form-grid">' +
        '<div class="field"><label>岗位名称</label><input type="text" data-field="title" placeholder="后端开发实习生" /></div>' +
        '<div class="field"><label>公司</label><input type="text" data-field="company" placeholder="某某科技有限公司" /></div>' +
        '<div class="field"><label>城市 / 地点</label><input type="text" data-field="location" placeholder="北京 / 远程" /></div>' +
        '<div class="field"><label>岗位类型</label><select data-field="type">' + JB.optionList(JB.store.JOB_TYPES, "实习") + "</select></div>" +
        '<div class="field"><label>薪资</label><input type="text" data-field="salary" placeholder="200-300 元/天" /></div>' +
        '<div class="field"><label>投递截止</label><input type="date" data-field="deadline" /></div>' +
        '<div class="field span-2"><label>原岗位链接</label><input type="text" data-field="url" placeholder="https://" /></div>' +
        '<div class="field span-2"><label>技能标签（用逗号分隔）</label><input type="text" data-field="tags" placeholder="Java, MySQL, Redis" /></div>' +
        '<div class="field span-2"><label>岗位描述</label><textarea rows="5" data-field="description" placeholder="把岗位职责与要求粘贴进来，匹配度会算得更准"></textarea></div>' +
        "</div>",
      buttons: [
        { label: "取消", kind: "ghost" },
        {
          label: "保存到岗位库", kind: "primary", onClick: function (close, root) {
            var values = JB.formValues(root);
            if (!values.title) { JB.toast("请填写岗位名称", "warn"); return; }
            var job = {
              id: JB.uid("manual"),
              source: "manual",
              sourceLabel: "手动添加",
              title: values.title,
              company: values.company || "未填写公司",
              location: values.location || "",
              city: values.location || "",
              remote: /远程|remote/i.test(values.location || ""),
              type: values.type || "实习",
              salary: values.salary || "",
              url: values.url || "",
              deadline: values.deadline || "",
              postedAt: JB.todayISO(),
              tags: String(values.tags || "").split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean),
              description: values.description || "",
              attribution: "手动添加的岗位"
            };
            if (!job.tags.length) job.tags = JB.skills.extract(job.description, 8);
            JB.store.saveJob(job);
            close();
            JB.views.jobs.setTab("library");
            navigate("jobs");
            JB.toast("岗位已保存到我的岗位库", "ok");
          }
        }
      ]
    });
  }

  /* ---------------- 粘贴 JD 导入 ---------------- */
  function openJdImport(prefill) {
    JB.modal({
      title: "粘贴 JD 导入岗位",
      wide: true,
      html:
        '<p class="small muted" style="margin-top:0">把 BOSS 直聘、实习僧、牛客等平台的岗位描述整段复制粘贴进来，工具会自动识别岗位名称、公司、城市、薪资、截止时间与技能关键词。</p>' +
        '<div id="jdStep1"><textarea rows="9" data-field="raw" placeholder="粘贴招聘信息原文（可以包含“岗位职责”“任职要求”等段落）">' + JB.esc(prefill || "") + "</textarea></div>" +
        '<div id="jdStep2" style="display:none"></div>',
      buttons: [
        { label: "取消", kind: "ghost" },
        {
          label: "智能解析", kind: "primary", id: "jdParse", onClick: function (close, root) {
            // 第二次点击时按钮已变成“保存岗位”
            if (root.querySelector('[data-parsed="1"]')) {
              var savedJob = saveJobFromModal(root);
              if (!savedJob) return;
              close();
              JB.views.jobs.setTab("library");
              navigate("jobs");
              JB.toast("岗位已保存，可在“我的岗位库”查看", "ok");
              return;
            }
            var raw = (root.querySelector('[data-field="raw"]') || {}).value || "";
            if (raw.trim().length < 10) { JB.toast("请先粘贴岗位描述内容", "warn"); return; }
            var parsed = JB.jd.parse(raw);
            var step1 = root.querySelector("#jdStep1");
            var step2 = root.querySelector("#jdStep2");
            step1.style.display = "none";
            step2.style.display = "block";
            step2.innerHTML =
              '<p class="small" style="margin-top:0">已识别出以下内容，可以直接修改后再保存：</p>' +
              '<div class="form-grid">' +
              '<div class="field"><label>岗位名称</label><input type="text" data-field="title" value="' + JB.esc(parsed.title) + '" /></div>' +
              '<div class="field"><label>公司</label><input type="text" data-field="company" value="' + JB.esc(parsed.company) + '" /></div>' +
              '<div class="field"><label>城市</label><input type="text" data-field="location" value="' + JB.esc(parsed.city) + '" /></div>' +
              '<div class="field"><label>岗位类型</label><select data-field="type">' + JB.optionList(JB.store.JOB_TYPES, parsed.type) + "</select></div>" +
              '<div class="field"><label>薪资</label><input type="text" data-field="salary" value="' + JB.esc(parsed.salary) + '" /></div>' +
              '<div class="field"><label>投递截止</label><input type="date" data-field="deadline" value="' + JB.esc(parsed.deadline) + '" /></div>' +
              '<div class="field span-2"><label>链接</label><input type="text" data-field="url" value="' + JB.esc(parsed.url) + '" /></div>' +
              '<div class="field span-2"><label>技能关键词</label><input type="text" data-field="tags" value="' + JB.esc((parsed.tags || []).join(", ")) + '" /></div>' +
              "</div>" +
              '<div class="mt-16 small muted">原始描述会完整保留在岗位详情里。</div>' +
              '<textarea rows="6" data-field="description">' + JB.esc(parsed.description) + "</textarea>";
            root.querySelector("#jdParse").textContent = "保存岗位";
            root.querySelector("#jdParse").setAttribute("data-parsed", "1");
          }
        },
        {
          label: "保存并加入投递", id: "jdSaveApply", onClick: function (close, root) {
            if (!root.querySelector('[data-parsed="1"]')) {
              JB.toast("请先点击“智能解析”识别岗位信息", "warn");
              return;
            }
            var saved = saveJobFromModal(root);
            if (!saved) return;
            close();
            openApplicationEditor(null, saved);
          }
        }
      ]
    });
  }

  function saveJobFromModal(root) {
    var values = JB.formValues(root);
    if (!values.title) { JB.toast("岗位名称为空，无法保存", "warn"); return null; }
    var job = {
      id: JB.uid("jd"),
      source: "import",
      sourceLabel: "我粘贴的岗位",
      title: values.title,
      company: values.company || "未填写公司",
      location: values.location || "",
      city: values.location || "",
      remote: /远程|remote/i.test(values.location || ""),
      type: values.type || "实习",
      salary: values.salary || "",
      url: values.url || "",
      deadline: values.deadline || "",
      postedAt: JB.todayISO(),
      tags: String(values.tags || "").split(/[,，、]/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 10),
      description: values.description || "",
      attribution: "来自你粘贴的招聘信息"
    };
    if (!job.tags.length) job.tags = JB.skills.extract(job.description, 8);
    JB.store.saveJob(job);
    return job;
  }

  /* ---------------- 投递记录编辑 ---------------- */
  function openApplicationEditor(id, job, options) {
    options = options || {};
    var app = id ? JB.store.getApplication(id) : null;
    if (job && !JB.store.isSavedJob(job.id)) JB.store.saveJob(job);

    var state = JB.store.get();
    var data = app || {
      title: job ? job.title : "",
      company: job ? job.company : "",
      city: job ? (job.city || job.location || "") : "",
      salary: job ? job.salary : "",
      url: job ? job.url : "",
      jobId: job ? job.id : "",
      stage: options.stage || "wish",
      channel: "官网投递",
      appliedAt: JB.todayISO(),
      deadline: job ? job.deadline || "" : "",
      resumeId: state.activeResumeId
    };

    var resumeOptions = (state.resumes || []).map(function (r) {
      return { value: r.id, label: r.name + (r.targetRole ? "（" + r.targetRole + "）" : "") };
    });

    var historyHTML = "";
    if (app && (app.history || []).length) {
      historyHTML = '<div class="divider"></div><div class="small strong mb-8">阶段变化记录</div>' +
        app.history.slice().reverse().map(function (h) {
          return '<div class="row between tiny muted" style="padding:3px 0"><span>' +
            JB.esc(h.from ? JB.store.stage(h.from).label + " → " + JB.store.stage(h.to).label : "创建记录") + "</span>" +
            '<span>' + JB.esc(JB.fmtDate(h.at, "short") + " " + new Date(h.at).toTimeString().slice(0, 5)) + "</span></div>";
        }).join("");
    }

    JB.modal({
      title: app ? "编辑投递记录" : "添加投递记录",
      wide: true,
      html:
        '<div class="form-grid">' +
        '<div class="field"><label>岗位名称</label><input type="text" data-field="title" value="' + JB.esc(data.title || "") + '" /></div>' +
        '<div class="field"><label>公司</label><input type="text" data-field="company" value="' + JB.esc(data.company || "") + '" /></div>' +
        '<div class="field"><label>城市</label><input type="text" data-field="city" value="' + JB.esc(data.city || "") + '" /></div>' +
        '<div class="field"><label>薪资</label><input type="text" data-field="salary" value="' + JB.esc(data.salary || "") + '" /></div>' +
        '<div class="field"><label>当前阶段</label><select data-field="stage">' +
        JB.optionList(JB.store.STAGES.map(function (s) { return { value: s.key, label: s.label }; }), data.stage) + "</select></div>" +
        '<div class="field"><label>投递渠道</label><select data-field="channel">' + JB.optionList(JB.store.CHANNELS, data.channel) + "</select></div>" +
        '<div class="field"><label>投递日期</label><input type="date" data-field="appliedAt" value="' + JB.esc(data.appliedAt || "") + '" /></div>' +
        '<div class="field"><label>投递截止 / 答复期限</label><input type="date" data-field="deadline" value="' + JB.esc(data.deadline || "") + '" /></div>' +
        '<div class="field span-2"><label>使用的简历版本</label><select data-field="resumeId">' +
        JB.optionList(resumeOptions, data.resumeId, "不指定") + "</select></div>" +
        '<div class="field"><label>下一步行动</label><input type="text" data-field="nextAction" value="' + JB.esc(data.nextAction || "") + '" placeholder="例如：等 HR 回复 / 准备二面" /></div>' +
        '<div class="field"><label>下一步时间</label><input type="date" data-field="nextActionAt" value="' + JB.esc(data.nextActionAt || "") + '" /></div>' +
        '<div class="field span-2"><label>备注</label><textarea rows="3" data-field="notes" placeholder="面试官问题、薪资沟通、待补充材料等">' + JB.esc(data.notes || "") + "</textarea></div>" +
        '<div class="field span-2"><label>岗位链接</label><input type="text" data-field="url" value="' + JB.esc(data.url || "") + '" placeholder="https://" /></div>' +
        "</div>" + historyHTML,
      buttons: (app ? [{ label: "删除", kind: "danger", onClick: function (close) {
        JB.confirm({ title: "删除这条投递记录？", message: "删除后无法恢复。", okText: "删除", danger: true }).then(function (ok) {
          if (!ok) return;
          JB.store.deleteApplication(app.id);
          close();
          JB.toast("已删除", "ok");
        });
      } }] : []).concat([
        { label: "取消", kind: "ghost" },
        {
          label: app ? "保存" : "添加", kind: "primary", onClick: function (close, root) {
            var values = JB.formValues(root);
            if (!values.title && !values.company) { JB.toast("至少填写岗位名称或公司", "warn"); return; }
            if (app) {
              var stageChanged = values.stage !== app.stage;
              var patch = Object.assign({}, values);
              // 阶段变化交给 moveApplication 处理，才能写入阶段变化记录
              if (stageChanged) delete patch.stage;
              JB.store.updateApplication(app.id, patch);
              if (stageChanged) JB.store.moveApplication(app.id, values.stage);
              JB.toast("已保存", "ok");
            } else {
              JB.store.addApplication(Object.assign({ jobId: data.jobId || "" }, values));
              JB.toast("已加入投递追踪", "ok");
            }
            close();
            if (current !== "tracker") navigate("tracker");
          }
        }
      ])
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    syncTheme();

    JB.qa(".nav-item").forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.preventDefault();
        navigate(node.getAttribute("data-view"));
      });
    });

    window.addEventListener("hashchange", function () {
      showView(parseHash());
    });

    var themeBtn = JB.q("#themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        JB.store.setTheme(JB.store.get().theme === "dark" ? "light" : "dark");
        syncTheme();
      });
    }

    var menuBtn = JB.q("#menuBtn");
    if (menuBtn) {
      menuBtn.addEventListener("click", function () {
        JB.q("#sidebar").classList.toggle("open");
      });
    }

    JB.store.subscribe(function () {
      var active = document.activeElement;
      var viewEl = JB.q("#view-" + current);
      if (active && viewEl && viewEl.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
      renderActive();
    });

    document.addEventListener("keydown", function (event) {
      var active = document.activeElement;
      var typing = active && /INPUT|TEXTAREA|SELECT/.test(active.tagName);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        navigate("jobs");
        setTimeout(function () {
          var input = JB.q("#jobQuery");
          if (input) input.focus();
        }, 120);
      }
      if ((event.key === "n" || event.key === "N") && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openApplicationEditor(null);
      }
    });

    if (location.protocol === "file:") {
      var banner = document.createElement("div");
      banner.className = "card";
      banner.style.margin = "0 0 16px";
      banner.innerHTML = '<div class="card-body row wrap" style="gap:10px">' +
        '<span class="badge amber">提示</span>' +
        '<span class="small">你正在以本地文件方式打开页面，岗位搜索与离线岗位库不可用。双击项目目录下的 <b>start.bat</b> 启动本地服务后再访问，功能才完整。</span></div>';
      var content = JB.q("#content");
      if (content) content.insertBefore(banner, content.firstChild);
    }

    var initial = parseHash();
    showView(initial);
    if (location.hash !== "#/" + initial) location.hash = "#/" + initial;

    var stored = JB.store.get().settings.lastSearch;
    if (stored && stored.q) JB.views.jobs.prefill({ q: stored.q, location: stored.location || "" });
    var keyword = JB.store.get().settings.defaultKeyword;
    if (keyword && !(stored && stored.q)) JB.views.jobs.prefill({ q: keyword });

    var bootScreen = JB.q("#bootScreen");
    if (bootScreen) {
      bootScreen.classList.add("hide");
      setTimeout(function () { bootScreen.remove(); }, 400);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  JB.app = { ctx: ctx, navigate: navigate, renderActive: renderActive };
})();
