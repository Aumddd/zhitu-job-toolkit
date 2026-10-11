/* 数据与设置 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  function render(el) {
    var state = JB.store.get();
    var html = '<div class="grid cols-2" style="align-items:start">';

    /* 备份与恢复 */
    html += '<div class="card"><div class="card-head"><h2>数据备份与恢复</h2>' +
      '<span class="sub">建议每次投递高峰期前导出一次</span></div><div class="card-body">' +
      '<p class="small muted" style="margin-top:0">所有数据都保存在这台电脑的浏览器里，不会上传到任何服务器。换电脑、换浏览器或清理浏览器数据前，请先导出备份。</p>' +
      '<div class="row wrap" style="gap:8px">' +
      '<button class="btn primary" data-export-all="1">导出全部数据（JSON）</button>' +
      '<button class="btn" data-import-all="1">从备份导入</button>' +
      '<button class="btn ghost" data-sample-resume="1">载入示例简历</button>' +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="setting-row"><div class="info"><b>当前数据量</b><span>' +
      (state.resumes || []).length + " 份简历 · " + (state.savedJobs || []).length + " 个收藏岗位 · " +
      (state.applications || []).length + " 条投递记录 · " + (state.starStories || []).length + " 个 STAR 故事</span></div></div>" +
      '<div class="setting-row"><div class="info"><b>存储状态</b><span>' +
      (JB.store.storageAvailable() ? "正常（localStorage）" : "不可用：数据只在本次会话内有效，请改用支持本地存储的浏览器") + "</span></div></div>" +
      '<div class="divider"></div>' +
      '<div class="row between"><div><b class="small">清空所有数据</b><div class="tiny muted">删除本机保存的简历、投递记录与设置</div></div>' +
      '<button class="btn danger" data-reset="1">清空</button></div>' +
      "</div></div>";

    /* 求职偏好 */
    html += '<div class="card"><div class="card-head"><h2>求职偏好</h2><span class="sub">影响岗位搜索与匹配度计算</span></div><div class="card-body">' +
      '<div class="form-grid">' +
      '<div class="field span-2"><label>默认搜索关键词</label>' +
      '<input type="text" data-setting="defaultKeyword" value="' + JB.esc(state.settings.defaultKeyword || "") + '" placeholder="例如：后端开发实习" />' +
      '<span class="hint">打开“找工作”时会自动填入</span></div>' +
      '<div class="field"><label>每次搜索最多返回</label>' +
      '<select data-setting="jobLimit">' + JB.optionList([
        { value: 30, label: "30 个" }, { value: 60, label: "60 个" }, { value: 90, label: "90 个" }, { value: 120, label: "120 个" }
      ], state.settings.jobLimit) + "</select></div>" +
      '<div class="field"><label>界面主题</label>' +
      '<select data-setting="themeValue">' + JB.optionList([
        { value: "light", label: "浅色" }, { value: "dark", label: "深色" }
      ], state.theme) + "</select></div>" +
      "</div>" +
      '<div class="divider"></div>' +
      '<div class="small strong mb-8">在线岗位数据源</div>' +
      '<div class="chip-group">' +
      ["remotive", "arbeitnow", "jobicy", "remoteok"].map(function (key) {
        var active = (state.settings.sources || []).indexOf(key) > -1;
        return '<button class="chip' + (active ? " on" : "") + '" data-toggle-source="' + key + '">' +
          (active ? "✓ " : "") + JB.esc(JB.api.SOURCE_META[key].label) + "</button>";
      }).join("") +
      "</div>" +
      '<p class="tiny muted">' + ["remotive", "arbeitnow", "jobicy", "remoteok"].map(function (key) {
        return JB.esc(JB.api.SOURCE_META[key].label + "：" + JB.api.SOURCE_META[key].note);
      }).join("<br>") + "</p>" +
      "</div></div>";

    html += "</div>";

    /* 使用说明 */
    html += '<div class="grid cols-2 mt-16" style="align-items:start">';
    html += '<div class="card"><div class="card-head"><h2>怎么用最顺手</h2><span class="sub">三步开始</span></div><div class="card-body">' +
      '<ol class="small" style="padding-left:18px;margin:0;line-height:2">' +
      "<li>在「我的简历」里把基本信息、教育、实习/项目填完整（完整度 80% 以上就可以投了）。</li>" +
      "<li>在「找工作」里搜索岗位，看匹配度与缺失技能；中文岗位用「粘贴 JD 导入」保存进来。</li>" +
      "<li>心动的岗位点「加入投递」，在「投递追踪」里维护阶段和下一步行动，概览页会自动提醒你。</li>" +
      "</ol>" +
      '<div class="divider"></div>' +
      '<div class="small strong mb-8">关于在线岗位数据</div>' +
      '<p class="tiny muted" style="margin:0">岗位数据来自 Remotive、Arbeitnow、Jobicy、RemoteOK 的公开接口，以海外与远程岗位为主，需要先启动本地服务（start.bat）才能联网抓取。中文平台（BOSS 直聘、实习僧等）没有公开接口，建议复制岗位描述后用「粘贴 JD 导入」，匹配度算法完全一致。</p>' +
      '<p class="tiny muted">使用这些数据源时请保留来源标注，投递时跳转到原站查看最新信息。</p>' +
      "</div></div>";

    html += '<div class="card"><div class="card-head"><h2>快捷键与隐私</h2></div><div class="card-body">' +
      '<div class="setting-row"><div class="info"><b>快速搜索</b><span>任意页面按 <span class="kbd">/</span> 跳到「找工作」并聚焦搜索框</span></div></div>' +
      '<div class="setting-row"><div class="info"><b>新建投递</b><span>按 <span class="kbd">n</span> 快速打开投递记录编辑</span></div></div>' +
      '<div class="setting-row"><div class="info"><b>关闭弹窗</b><span>按 <span class="kbd">Esc</span></span></div></div>' +
      '<div class="divider"></div>' +
      '<p class="small muted" style="margin:0">隐私说明：本工具不收集、不上传任何个人信息。简历与投递记录仅保存在本机浏览器；联网只用于获取公开岗位信息，且不携带你的简历内容。</p>' +
      "</div></div>";
    html += "</div>";

    el.innerHTML = html;
  }

  function bind(el, ctx) {
    el.addEventListener("click", function (event) {
      var target = event.target;

      if (target.closest("[data-export-all]")) {
        JB.download("职途-求职数据备份-" + JB.todayISO() + ".json", JB.store.exportJSON());
        JB.toast("备份已导出", "ok");
        return;
      }

      if (target.closest("[data-import-all]")) {
        JB.readFile(".json,application/json").then(function (file) {
          if (!file) return;
          try {
            JB.store.importJSON(file.text);
            JB.toast("导入成功", "ok");
            render(el);
          } catch (err) {
            JB.toast("导入失败：" + err.message, "err", 3200);
          }
        });
        return;
      }

      if (target.closest("[data-sample-resume]")) {
        JB.confirm({
          title: "载入示例简历？",
          message: "会新增一份示例简历（不会影响你已有的简历），可以随时删除。",
          okText: "载入"
        }).then(function (ok) {
          if (!ok) return;
          JB.store.loadSampleResume();
          JB.views.resumes.setTab("basic");
          JB.toast("示例简历已载入", "ok");
          ctx.navigate("resumes");
        });
        return;
      }

      if (target.closest("[data-reset]")) {
        JB.confirm({
          title: "清空所有数据？",
          message: "简历、收藏岗位、投递记录与设置都会被删除，且无法恢复。建议先导出备份。",
          okText: "确认清空",
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          JB.store.resetAll();
          render(el);
          JB.toast("已清空", "ok");
        });
        return;
      }

      var source = target.closest("[data-toggle-source]");
      if (source) {
        var key = source.getAttribute("data-toggle-source");
        var list = (JB.store.get().settings.sources || []).slice();
        var idx = list.indexOf(key);
        if (idx > -1) list.splice(idx, 1); else list.push(key);
        JB.store.setSettings({ sources: list });
        render(el);
      }
    });

    el.addEventListener("change", function (event) {
      var setting = event.target.closest("[data-setting]");
      if (!setting) return;
      var key = setting.getAttribute("data-setting");
      if (key === "themeValue") {
        JB.store.setTheme(setting.value);
        ctx.syncTheme();
        return;
      }
      var value = key === "jobLimit" ? Number(setting.value) : setting.value;
      JB.store.setSettings({ [key]: value });
      JB.toast("已保存", "ok");
    });
  }

  JB.views.settings = {
    title: "数据与设置",
    subtitle: "备份、偏好与使用说明",
    render: render,
    bind: bind
  };
})();
