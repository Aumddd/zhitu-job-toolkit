/* 我的简历：多版本管理 + 编辑 + 预览 + 导出 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  var ui = { tab: "basic", mode: "edit" };

  var TABS = [
    { key: "basic", label: "基本信息" },
    { key: "education", label: "教育经历" },
    { key: "experience", label: "实习 / 工作" },
    { key: "projects", label: "项目经历" },
    { key: "skills", label: "技能与荣誉" },
    { key: "summary", label: "自我评价" }
  ];

  var DEGREES = ["大专", "本科", "硕士", "博士"];

  /* ---------------- 路径读写 ---------------- */
  function setPath(obj, path, value) {
    var parts = String(path).split(".");
    var node = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var key = parts[i];
      if (node[key] === undefined || node[key] === null) node[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      node = node[key];
    }
    node[parts[parts.length - 1]] = value;
  }

  /* ---------------- 简历纸张渲染 ---------------- */
  function paperHTML(resume) {
    if (!resume) return "";
    var basic = resume.basic || {};
    var cls = "paper" + (resume.template === "modern" ? " modern" : "") + (resume.template === "compact" ? " compact" : "");
    var html = '<div class="' + cls + '">';

    html += '<div class="p-head"><div class="p-name">' + JB.esc(basic.name || "你的姓名") + "</div>";
    if (resume.targetRole) html += '<div class="p-role">求职意向：' + JB.esc(resume.targetRole) + (resume.targetCity ? " | 期望城市：" + JB.esc(resume.targetCity) : "") + "</div>";
    var contacts = [];
    if (basic.phone) contacts.push(basic.phone);
    if (basic.email) contacts.push(basic.email);
    if (basic.city) contacts.push(basic.city);
    if (basic.school) contacts.push(basic.school + (basic.gradYear ? " · " + basic.gradYear + " 届" : ""));
    if (basic.github) contacts.push(basic.github);
    if (basic.website) contacts.push(basic.website);
    if (contacts.length) {
      html += '<div class="p-contact">' + contacts.map(function (c) { return "<span>" + JB.esc(c) + "</span>"; }).join("") + "</div>";
    }
    html += "</div>";

    var sections = [];

    if ((resume.education || []).length) {
      sections.push(
        '<div class="p-sec"><h4>教育经历</h4>' +
        resume.education.map(function (edu) {
          return '<div class="p-item"><div class="t1">' + JB.esc(edu.school || "") +
            (edu.major ? "　" + JB.esc(edu.major) : "") +
            (edu.degree ? "　" + JB.esc(edu.degree) : "") +
            '<span class="right">' + JB.esc([edu.start, edu.end].filter(Boolean).join(" - ")) + "</span></div>" +
            (edu.gpa ? '<div class="t2">GPA / 排名：' + JB.esc(edu.gpa) + "</div>" : "") +
            (edu.courses ? '<div class="t2">主修课程：' + JB.esc(edu.courses) + "</div>" : "") +
            "</div>";
        }).join("") + "</div>"
      );
    }

    function blocks(list, mapper) {
      return list.map(function (item) {
        var bullets = String(item.detail || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
        return '<div class="p-item">' + mapper(item, bullets) + "</div>";
      }).join("");
    }

    if ((resume.experience || []).length) {
      sections.push(
        '<div class="p-sec"><h4>实习 / 工作经历</h4>' +
        blocks(resume.experience, function (item, bullets) {
          return '<div class="t1">' + JB.esc([item.company, item.title].filter(Boolean).join("　|　")) +
            '<span class="right">' + JB.esc([item.city, [item.start, item.end].filter(Boolean).join(" - ")].filter(Boolean).join(" | ")) + "</span></div>" +
            (bullets.length ? "<ul>" + bullets.map(function (b) { return "<li>" + JB.esc(b.replace(/^[-•*]\s*/, "")) + "</li>"; }).join("") + "</ul>" : "");
        }) + "</div>"
      );
    }

    if ((resume.projects || []).length) {
      sections.push(
        '<div class="p-sec"><h4>项目经历</h4>' +
        blocks(resume.projects, function (item, bullets) {
          return '<div class="t1">' + JB.esc(item.name || "") +
            (item.role ? "　|　" + JB.esc(item.role) : "") +
            '<span class="right">' + JB.esc([item.start, item.end].filter(Boolean).join(" - ")) + "</span></div>" +
            (item.tech ? '<div class="t2">技术栈：' + JB.esc(item.tech) + "</div>" : "") +
            (bullets.length ? "<ul>" + bullets.map(function (b) { return "<li>" + JB.esc(b.replace(/^[-•*]\s*/, "")) + "</li>"; }).join("") + "</ul>" : "");
        }) + "</div>"
      );
    }

    if ((resume.skills || []).length) {
      sections.push(
        '<div class="p-sec"><h4>专业技能</h4><div class="p-skills">' +
        resume.skills.map(function (s) { return '<span class="p-skill">' + JB.esc(s) + "</span>"; }).join("") +
        "</div></div>"
      );
    }

    if ((resume.awards || []).length) {
      sections.push(
        '<div class="p-sec"><h4>荣誉奖项</h4>' +
        resume.awards.map(function (award) {
          return '<div class="p-item"><div class="t1">' + JB.esc(award.name || "") +
            '<span class="right">' + JB.esc(award.date || "") + "</span></div>" +
            (award.detail ? '<div class="t2">' + JB.esc(award.detail) + "</div>" : "") + "</div>";
        }).join("") + "</div>"
      );
    }

    if (resume.summary) {
      sections.push('<div class="p-sec"><h4>自我评价</h4><div class="p-item">' + JB.esc(resume.summary).replace(/\n/g, "<br>") + "</div></div>");
    }

    if (!sections.length) {
      sections.push('<div class="p-sec"><h4>开始填写</h4><div class="p-item t2">左侧填写内容后，这里会实时生成简历预览。</div></div>');
    }

    html += sections.join("");
    html += "</div>";
    return html;
  }

  /* ---------------- 纯文本 / Markdown 导出 ---------------- */
  function plainText(resume) {
    if (!resume) return "";
    var basic = resume.basic || {};
    var lines = [];
    lines.push(basic.name || "");
    var head = [];
    if (resume.targetRole) head.push("求职意向：" + resume.targetRole);
    if (resume.targetCity) head.push("期望城市：" + resume.targetCity);
    if (resume.targetType) head.push(resume.targetType);
    if (head.length) lines.push(head.join(" | "));
    var contact = [basic.phone, basic.email, basic.github, basic.website].filter(Boolean);
    if (contact.length) lines.push(contact.join(" | "));
    if (basic.school) lines.push(basic.school + (basic.degree ? " · " + basic.degree : "") + (basic.gradYear ? " · " + basic.gradYear + " 届" : ""));

    if ((resume.education || []).length) {
      lines.push("", "【教育经历】");
      resume.education.forEach(function (edu) {
        lines.push([edu.school, edu.major, edu.degree, [edu.start, edu.end].filter(Boolean).join("-")].filter(Boolean).join(" | "));
        if (edu.gpa) lines.push("GPA/排名：" + edu.gpa);
        if (edu.courses) lines.push("主修课程：" + edu.courses);
      });
    }
    function pushList(title, list, head3) {
      if (!list || !list.length) return;
      lines.push("", "【" + title + "】");
      list.forEach(function (item) {
        lines.push(head3(item));
        String(item.detail || "").split("\n").forEach(function (b) {
          var t = b.trim().replace(/^[-•*]\s*/, "");
          if (t) lines.push("- " + t);
        });
      });
    }
    pushList("实习 / 工作经历", resume.experience, function (item) {
      return [item.company, item.title, item.city, [item.start, item.end].filter(Boolean).join("-")].filter(Boolean).join(" | ");
    });
    pushList("项目经历", resume.projects, function (item) {
      return [item.name, item.role, item.tech, [item.start, item.end].filter(Boolean).join("-")].filter(Boolean).join(" | ");
    });
    if ((resume.skills || []).length) lines.push("", "【专业技能】", resume.skills.join("、"));
    if ((resume.awards || []).length) {
      lines.push("", "【荣誉奖项】");
      resume.awards.forEach(function (a) {
        lines.push([a.name, a.date, a.detail].filter(Boolean).join(" | "));
      });
    }
    if (resume.summary) lines.push("", "【自我评价】", resume.summary);
    return lines.join("\n");
  }

  function markdown(resume) {
    if (!resume) return "";
    var basic = resume.basic || {};
    var out = ["# " + (basic.name || "姓名")];
    if (resume.targetRole) out.push("**求职意向：**" + resume.targetRole + (resume.targetCity ? " ｜ **期望城市：**" + resume.targetCity : ""));
    var contact = [basic.phone, basic.email, basic.github, basic.website].filter(Boolean).join(" ｜ ");
    if (contact) out.push(contact);
    if (basic.school) out.push(basic.school + (basic.degree ? " · " + basic.degree : "") + (basic.gradYear ? " · " + basic.gradYear + " 届" : ""));

    if ((resume.education || []).length) {
      out.push("", "## 教育经历");
      resume.education.forEach(function (edu) {
        out.push("### " + [edu.school, edu.major, edu.degree].filter(Boolean).join(" · "));
        out.push(([edu.start, edu.end].filter(Boolean).join(" - ") || "") + (edu.gpa ? " ｜ GPA：" + edu.gpa : ""));
        if (edu.courses) out.push("主修课程：" + edu.courses);
      });
    }
    function pushMd(title, list, head) {
      if (!list || !list.length) return;
      out.push("", "## " + title);
      list.forEach(function (item) {
        out.push("### " + head(item));
        String(item.detail || "").split("\n").forEach(function (b) {
          var t = b.trim().replace(/^[-•*]\s*/, "");
          if (t) out.push("- " + t);
        });
      });
    }
    pushMd("实习 / 工作经历", resume.experience, function (i) { return [i.company, i.title].filter(Boolean).join(" · "); });
    pushMd("项目经历", resume.projects, function (i) { return [i.name, i.role, i.tech].filter(Boolean).join(" · "); });
    if ((resume.skills || []).length) out.push("", "## 专业技能", resume.skills.join(" ｜ "));
    if ((resume.awards || []).length) {
      out.push("", "## 荣誉奖项");
      resume.awards.forEach(function (a) { out.push("- " + [a.name, a.date, a.detail].filter(Boolean).join(" ｜ ")); });
    }
    if (resume.summary) out.push("", "## 自我评价", resume.summary);
    return out.join("\n");
  }

  /* ---------------- 编辑器片段 ---------------- */
  function field(label, path, value, options) {
    options = options || {};
    var input;
    if (options.type === "textarea") {
      input = '<textarea data-path="' + path + '" rows="' + (options.rows || 5) + '" placeholder="' + JB.esc(options.placeholder || "") + '">' + JB.esc(value || "") + "</textarea>";
    } else if (options.type === "select") {
      input = '<select data-path="' + path + '">' + JB.optionList(options.options, value) + "</select>";
    } else {
      input = '<input type="' + (options.type || "text") + '" data-path="' + path + '" value="' + JB.esc(value || "") + '" placeholder="' + JB.esc(options.placeholder || "") + '" />';
    }
    return '<div class="field' + (options.span2 ? " span-2" : "") + '"><label>' + JB.esc(label) + "</label>" + input +
      (options.hint ? '<span class="hint">' + JB.esc(options.hint) + "</span>" : "") + "</div>";
  }

  function entryTools(listName, index, total) {
    return '<div class="entry-head"><span class="idx">第 ' + (index + 1) + ' 条</span><span class="spacer"></span>' +
      '<button class="icon-btn" data-move="' + listName + '" data-index="' + index + '" data-dir="-1" title="上移"' + (index === 0 ? " disabled" : "") + ">↑</button>" +
      '<button class="icon-btn" data-move="' + listName + '" data-index="' + index + '" data-dir="1" title="下移"' + (index === total - 1 ? " disabled" : "") + ">↓</button>" +
      '<button class="icon-btn" data-remove="' + listName + '" data-index="' + index + '" title="删除">✕</button></div>';
  }

  function editorHTML(resume) {
    var html = "";

    if (ui.tab === "basic") {
      html += '<div class="form-grid">' +
        field("简历名称", "name", resume.name, { hint: "例如：后端开发实习 · 主投版" }) +
        field("是否在投岗位类型", "targetType", resume.targetType, { type: "select", options: JB.store.JOB_TYPES }) +
        field("目标岗位", "targetRole", resume.targetRole, { hint: "用于计算岗位匹配度，例如：后端开发实习生" }) +
        field("期望城市", "targetCity", resume.targetCity, { placeholder: "北京 / 上海 / 远程" }) +
        field("姓名", "basic.name", (resume.basic || {}).name) +
        field("手机号", "basic.phone", (resume.basic || {}).phone) +
        field("邮箱", "basic.email", (resume.basic || {}).email) +
        field("现居城市", "basic.city", (resume.basic || {}).city) +
        field("学校", "basic.school", (resume.basic || {}).school) +
        field("学历", "basic.degree", (resume.basic || {}).degree, { type: "select", options: DEGREES }) +
        field("毕业年份", "basic.gradYear", (resume.basic || {}).gradYear, { placeholder: "2027" }) +
        field("GitHub / 作品集", "basic.github", (resume.basic || {}).github, { placeholder: "github.com/yourname" }) +
        field("个人网站 / 其他链接", "basic.website", (resume.basic || {}).website) +
        field("微信", "basic.wechat", (resume.basic || {}).wechat, { hint: "可选，部分实习岗位会要求" }) +
        field("简历模板", "template", resume.template, {
          type: "select",
          options: [{ value: "classic", label: "经典（居中标题，适合大多数岗位）" },
          { value: "modern", label: "现代（蓝色强调，适合互联网岗位）" },
          { value: "compact", label: "紧凑（一页装下更多内容）" }],
          span2: true
        }) +
        "</div>";
    }

    if (ui.tab === "education") {
      var education = resume.education || [];
      html += '<p class="muted small mb-16">建议从最高学历开始写；如果绩点或排名靠前，务必写上。</p>';
      education.forEach(function (edu, index) {
        html += '<div class="entry">' + entryTools("education", index, education.length) +
          '<div class="form-grid">' +
          field("学校", "education." + index + ".school", edu.school) +
          field("专业", "education." + index + ".major", edu.major) +
          field("学历", "education." + index + ".degree", edu.degree, { type: "select", options: DEGREES }) +
          field("绩点 / 排名", "education." + index + ".gpa", edu.gpa, { placeholder: "3.7/4.0（专业前 15%）" }) +
          field("入学时间", "education." + index + ".start", edu.start, { placeholder: "2023.09" }) +
          field("毕业时间", "education." + index + ".end", edu.end, { placeholder: "2027.06" }) +
          field("主修课程", "education." + index + ".courses", edu.courses, { span2: true, hint: "只写与目标岗位相关的 3-5 门课" }) +
          "</div></div>";
      });
      html += '<button class="btn mt-16" data-add="education">+ 添加教育经历</button>';
    }

    if (ui.tab === "experience") {
      var experience = resume.experience || [];
      html += '<p class="muted small mb-16">每段经历写 2-4 条，用「动作 + 方法 + 结果」句式，尽量带数字。没有实习可以写校内实践、实验室项目、竞赛集训。</p>';
      experience.forEach(function (item, index) {
        html += '<div class="entry">' + entryTools("experience", index, experience.length) +
          '<div class="form-grid">' +
          field("公司 / 组织", "experience." + index + ".company", item.company) +
          field("职位", "experience." + index + ".title", item.title, { placeholder: "后端开发实习生" }) +
          field("城市", "experience." + index + ".city", item.city) +
          field("开始时间", "experience." + index + ".start", item.start, { placeholder: "2026.03" }) +
          field("结束时间", "experience." + index + ".end", item.end, { placeholder: "2026.08 / 至今" }) +
          '<div class="field span-2"><label>工作内容与成果</label>' +
          '<textarea rows="5" data-path="experience.' + index + '.detail" placeholder="每行一条，例如：\n使用 Java + Spring Boot 开发订单查询接口，通过索引优化与 Redis 缓存将平均响应时间从 320ms 降到 90ms">' +
          JB.esc(item.detail || "") + "</textarea><span class=\"hint\">一行一条，预览和导出时会自动变成项目符号</span></div>" +
          "</div></div>";
      });
      html += '<button class="btn mt-16" data-add="experience">+ 添加实习 / 工作经历</button>';
    }

    if (ui.tab === "projects") {
      var projects = resume.projects || [];
      html += '<p class="muted small mb-16">技术岗建议 2 个，非技术岗 1-2 个；写清你的角色、技术栈和可量化的结果。</p>';
      projects.forEach(function (item, index) {
        html += '<div class="entry">' + entryTools("projects", index, projects.length) +
          '<div class="form-grid">' +
          field("项目名称", "projects." + index + ".name", item.name) +
          field("担任角色", "projects." + index + ".role", item.role, { placeholder: "后端负责人 / 独立开发" }) +
          field("技术栈 / 工具", "projects." + index + ".tech", item.tech, { placeholder: "Java / Spring Boot / MySQL / Redis" }) +
          field("项目链接", "projects." + index + ".link", item.link, { placeholder: "github.com/xxx 或在线地址" }) +
          field("开始时间", "projects." + index + ".start", item.start, { placeholder: "2025.09" }) +
          field("结束时间", "projects." + index + ".end", item.end, { placeholder: "2026.01" }) +
          '<div class="field span-2"><label>项目职责与成果</label>' +
          '<textarea rows="5" data-path="projects.' + index + '.detail" placeholder="每行一条，例如：\n负责用户与商品模块设计，实现 JWT 鉴权与分布式锁\n上线后注册用户 1200+，压测 QPS 达 800">' +
          JB.esc(item.detail || "") + "</textarea></div>" +
          "</div></div>";
      });
      html += '<button class="btn mt-16" data-add="projects">+ 添加项目经历</button>';
    }

    if (ui.tab === "skills") {
      var skills = resume.skills || [];
      var awards = resume.awards || [];
      html += '<div class="field"><label>技能标签（回车添加）</label><div class="skill-input-wrap" id="skillWrap">';
      skills.forEach(function (skill, index) {
        html += '<span class="skill-pill">' + JB.esc(skill) + '<button data-skill-remove="' + index + '" title="删除">✕</button></span>';
      });
      html += '<input type="text" id="skillInput" placeholder="例如：Java、SQL、Figma…" /></div>' +
        '<span class="hint">建议 5-12 个，只写能经得起追问的；技能会影响岗位匹配度计算</span></div>';

      var suggests = JB.skills.suggest(resume);
      if (suggests.length) {
        html += '<div class="mt-16 small muted mb-8">根据你的目标岗位推荐</div><div class="chip-group">';
        suggests.forEach(function (skill) {
          html += '<button class="chip" data-skill-add="' + JB.esc(skill) + '">+ ' + JB.esc(skill) + "</button>";
        });
        html += "</div>";
      }

      html += '<div class="mt-16 small muted mb-8">按类别挑选（点一下即可添加）</div>';
      var dict = JB.skills.dict;
      Object.keys(dict).forEach(function (group) {
        html += '<div class="mt-8"><span class="tiny muted">' + JB.esc(group) + "</span><div class=\"chip-group mt-8\">";
        dict[group].forEach(function (skill) {
          if (skills.indexOf(skill) > -1) return;
          html += '<button class="chip" data-skill-add="' + JB.esc(skill) + '">' + JB.esc(skill) + "</button>";
        });
        html += "</div></div>";
      });

      html += '<div class="divider"></div><div class="section-title"><h2>荣誉奖项</h2><span class="sub">奖学金、竞赛、证书都可以写</span></div>';
      awards.forEach(function (award, index) {
        html += '<div class="entry">' + entryTools("awards", index, awards.length) +
          '<div class="form-grid">' +
          field("奖项 / 证书名称", "awards." + index + ".name", award.name, { span2: true }) +
          field("获得时间", "awards." + index + ".date", award.date, { placeholder: "2025.09" }) +
          field("补充说明", "awards." + index + ".detail", award.detail, { placeholder: "专业排名前 10% / 全国二等奖" }) +
          "</div></div>";
      });
      html += '<button class="btn mt-16" data-add="awards">+ 添加荣誉奖项</button>';
    }

    if (ui.tab === "summary") {
      html += '<div class="field"><label>自我评价</label>' +
        '<textarea rows="6" data-path="summary" placeholder="两到三句话：我的专业背景 + 与岗位相关的能力证据 + 求职动机">' + JB.esc(resume.summary || "") + "</textarea>" +
        '<span class="hint">避免空话（如“吃苦耐劳、学习能力强”），尽量带上具体事实</span></div>';
      html += '<div class="mt-16 small muted mb-8">没思路？点一句模板套用，再改成自己的内容</div><div class="chip-group">';
      [
        "XX 专业大四在读，累计完成 2 个完整项目，熟悉 XX 技术栈，能独立完成模块开发与调试。",
        "在校期间担任 XX 负责人，组织 XX 人团队完成 XX 活动，具备较强的沟通与推进能力。",
        "对 XX 行业有持续关注，曾通过 XX 方式自学 XX 技能，希望在实习中深入参与真实业务。"
      ].forEach(function (tpl, i) {
        html += '<button class="chip" data-summary-tpl="' + i + '">套用模板 ' + (i + 1) + "</button>";
      });
      html += "</div>";
    }

    return html;
  }

  /* ---------------- 主渲染 ---------------- */
  function render(el) {
    var state = JB.store.get();
    var resume = JB.store.activeResume();
    var html = '<div class="resume-layout">';

    /* 左：版本列表 */
    html += '<div><div class="card"><div class="card-head"><h2>简历版本</h2><span class="spacer"></span>' +
      '<button class="btn sm" data-new-resume="1" title="新建">+ 新建</button></div><div class="card-body">';
    html += '<div class="resume-list">';
    (state.resumes || []).forEach(function (item) {
      var score = JB.skills.completeness(item).score;
      html += '<div class="resume-item' + (resume && item.id === resume.id ? " active" : "") + '" data-select-resume="' + item.id + '">' +
        '<div class="name truncate">' + JB.esc(item.name) + "</div>" +
        '<div class="meta truncate">' + JB.esc(item.targetRole || "未填写目标岗位") + " · " + JB.esc(item.targetType || "") + "</div>" +
        '<div class="mini-progress js-mini" data-resume-id="' + JB.esc(item.id) + '"><i style="width:' + score + '%"></i></div>' +
        '<div class="meta">完整度 ' + score + "% · 更新于 " + JB.esc(JB.fmtDate(item.updatedAt, "short")) + "</div>" +
        "</div>";
    });
    html += "</div></div></div></div>";

    /* 右侧内容 */
    html += "<div>";
    if (!resume) {
      html += '<div class="card"><div class="card-body"><div class="empty"><div class="icon">📄</div><h3>还没有简历</h3>' +
        '<p>点击下方按钮创建第一份简历，或者在设置里载入一份示例简历快速体验。</p>' +
        '<button class="btn primary" data-new-resume="1">新建简历</button></div></div></div>';
      el.innerHTML = html + "</div></div>";
      return;
    }

    var complete = JB.skills.completeness(resume);

    /* 顶部：名称 + 完整度 + 操作 */
    html += '<div class="card"><div class="card-head">' +
      '<h2>' + JB.esc(resume.name) + "</h2>" +
      '<span class="badge js-score ' + (complete.score >= 80 ? "green" : complete.score >= 55 ? "amber" : "red") + '">完整度 ' + complete.score + "%</span>" +
      '<span class="spacer"></span>' +
      '<button class="btn sm" data-mode="edit">编辑</button>' +
      '<button class="btn sm" data-mode="preview">预览与导出</button>' +
      "</div>";

    html += '<div class="card-body tight">' +
      '<div class="progress"><i class="js-progress" style="width:' + complete.score + '%"></i></div>' +
      '<div class="row between mt-8"><span class="tiny muted js-missing">' +
      (complete.missing.length ? "还有 " + complete.missing.length + " 项可补充：" + complete.missing.slice(0, 3).map(function (c) { return c.label; }).join("、") : "简历信息完整，可以开始投递") +
      "</span>" +
      '<span class="row" style="gap:6px">' +
      '<button class="btn sm ghost" data-duplicate-resume="1">复制版本</button>' +
      '<button class="btn sm ghost danger" data-delete-resume="1">删除</button>' +
      "</span></div></div></div>";

    /* 编辑 / 预览 */
    html += '<div class="card mt-16">';
    if (ui.mode === "edit") {
      html += '<div class="tabs">';
      TABS.forEach(function (tab) {
        html += '<button class="tab' + (ui.tab === tab.key ? " active" : "") + '" data-tab="' + tab.key + '">' + JB.esc(tab.label) + "</button>";
      });
      html += "</div>";
      html += '<div class="card-body">' + editorHTML(resume) + "</div>";
    } else {
      html += '<div class="card-head"><h2>预览</h2><span class="sub">导出 PDF 时建议在浏览器打印窗口中选择“另存为 PDF”、关闭页眉页脚</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn sm primary" data-print="1">打印 / 导出 PDF</button>' +
        "</div>";
      html += '<div class="card-body"><div class="paper-wrap">' + paperHTML(resume) + "</div></div>";
      html += '<div class="card-foot row wrap">' +
        '<button class="btn sm" data-copy-text="1">复制纯文本（网申粘贴用）</button>' +
        '<button class="btn sm" data-export-md="1">导出 Markdown</button>' +
        '<button class="btn sm" data-export-json="1">导出 JSON（单份）</button>' +
        "</div>";
    }
    html += "</div>";

    /* 体检建议 */
    if (ui.mode === "edit") {
      html += '<div class="card mt-16"><div class="card-head"><h2>简历体检</h2><span class="sub">逐项检查常见的硬伤</span></div><div class="card-body">';
      complete.checks.forEach(function (check) {
        html += '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border)">' +
          '<span>' + (check.done ? "✅" : "⬜️") + " " + JB.esc(check.label) + "</span>" +
          '<span class="tiny muted">' + JB.esc(check.done ? "已填写" : check.tip) + "</span></div>";
      });
      html += "</div></div>";
    }

    html += "</div></div>";
    el.innerHTML = html;
  }

  /* ---------------- 交互 ---------------- */
  var pendingSave = null;

  /** 只更新顶部的完整度相关 UI，避免输入时整页重绘 */
  function updateChrome(el) {
    var resume = JB.store.activeResume();
    if (!resume) return;
    var complete = JB.skills.completeness(resume);
    var badge = JB.q(".js-score", el);
    if (badge) {
      badge.className = "badge js-score " + (complete.score >= 80 ? "green" : complete.score >= 55 ? "amber" : "red");
      badge.textContent = "完整度 " + complete.score + "%";
    }
    var bar = JB.q(".js-progress", el);
    if (bar) bar.style.width = complete.score + "%";
    var missing = JB.q(".js-missing", el);
    if (missing) {
      missing.textContent = complete.missing.length
        ? "还有 " + complete.missing.length + " 项可补充：" + complete.missing.slice(0, 3).map(function (c) { return c.label; }).join("、")
        : "简历信息完整，可以开始投递";
    }
    var mini = JB.q('.js-mini[data-resume-id="' + resume.id + '"]', el);
    if (mini) {
      var inner = mini.querySelector("i");
      if (inner) inner.style.width = complete.score + "%";
    }
  }

  function bind(el, ctx) {
    el.addEventListener("click", function (event) {
      var target = event.target;
      var resume = JB.store.activeResume();
      if (!resume) return;

      var select = target.closest("[data-select-resume]");
      if (select) { JB.store.setActiveResume(select.getAttribute("data-select-resume")); return; }

      if (target.closest("[data-new-resume]")) {
        ctx.openResumeCreator();
        return;
      }

      if (target.closest("[data-duplicate-resume]")) {
        JB.store.duplicateResume(resume.id);
        JB.toast("已复制为新版本", "ok");
        return;
      }

      if (target.closest("[data-delete-resume]")) {
        JB.confirm({
          title: "删除这份简历？",
          message: "删除后无法恢复，与它关联的投递记录会保留但不再指向简历。",
          okText: "删除",
          danger: true
        }).then(function (ok) {
          if (ok) { JB.store.deleteResume(resume.id); JB.toast("已删除", "ok"); }
        });
        return;
      }

      var mode = target.closest("[data-mode]");
      if (mode) { ui.mode = mode.getAttribute("data-mode"); render(el); return; }

      var tab = target.closest("[data-tab]");
      if (tab) { ui.tab = tab.getAttribute("data-tab"); render(el); return; }

      var add = target.closest("[data-add]");
      if (add) {
        var listName = add.getAttribute("data-add");
        var blank = {
          education: { school: "", major: "", degree: "本科", start: "", end: "", gpa: "", courses: "" },
          experience: { company: "", title: "", city: "", start: "", end: "", detail: "" },
          projects: { name: "", role: "", tech: "", link: "", start: "", end: "", detail: "" },
          awards: { name: "", date: "", detail: "" }
        }[listName];
        var list = (resume[listName] || []).concat([blank]);
        JB.store.updateResume(resume.id, { [listName]: list });
        return;
      }

      var remove = target.closest("[data-remove]");
      if (remove) {
        var name = remove.getAttribute("data-remove");
        var index = Number(remove.getAttribute("data-index"));
        var next = (resume[name] || []).slice();
        next.splice(index, 1);
        JB.store.updateResume(resume.id, { [name]: next });
        return;
      }

      var move = target.closest("[data-move]");
      if (move) {
        var listKey = move.getAttribute("data-move");
        var i = Number(move.getAttribute("data-index"));
        var dir = Number(move.getAttribute("data-dir"));
        var arr = (resume[listKey] || []).slice();
        var j = i + dir;
        if (j < 0 || j >= arr.length) return;
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        JB.store.updateResume(resume.id, { [listKey]: arr });
        return;
      }

      var skillRemove = target.closest("[data-skill-remove]");
      if (skillRemove) {
        var sList = (resume.skills || []).slice();
        sList.splice(Number(skillRemove.getAttribute("data-skill-remove")), 1);
        JB.store.updateResume(resume.id, { skills: sList });
        return;
      }

      var skillAdd = target.closest("[data-skill-add]");
      if (skillAdd) {
        var v = skillAdd.getAttribute("data-skill-add");
        var list2 = (resume.skills || []).slice();
        if (list2.indexOf(v) === -1) list2.push(v);
        JB.store.updateResume(resume.id, { skills: list2 });
        return;
      }

      var tpl = target.closest("[data-summary-tpl]");
      if (tpl) {
        var templates = [
          "XX 专业大四在读，累计完成 2 个完整项目，熟悉 XX 技术栈，能独立完成模块开发与调试。",
          "在校期间担任 XX 负责人，组织 XX 人团队完成 XX 活动，具备较强的沟通与推进能力。",
          "对 XX 行业有持续关注，曾通过 XX 方式自学 XX 技能，希望在实习中深入参与真实业务。"
        ];
        JB.store.updateResume(resume.id, { summary: templates[Number(tpl.getAttribute("data-summary-tpl"))] });
        return;
      }

      if (target.closest("[data-print]")) {
        JB.q("#printRoot").innerHTML = paperHTML(resume);
        setTimeout(function () { window.print(); }, 60);
        return;
      }

      if (target.closest("[data-copy-text]")) { JB.copy(plainText(resume), "已复制简历纯文本"); return; }

      if (target.closest("[data-export-md]")) {
        JB.download((resume.basic.name || "简历") + "-" + resume.name + ".md", markdown(resume), "text/markdown;charset=utf-8");
        JB.toast("已导出 Markdown", "ok");
        return;
      }

      if (target.closest("[data-export-json]")) {
        JB.download(resume.name + ".json", JSON.stringify(resume, null, 2));
        JB.toast("已导出 JSON", "ok");
      }
    });

    /* 输入即保存（防抖），并即时刷新预览相关 UI */
    el.addEventListener("input", function (event) {
      var input = event.target.closest("[data-path]");
      if (!input) return;
      var resume = JB.store.activeResume();
      if (!resume) return;
      var path = input.getAttribute("data-path");
      var value = input.value;
      clearTimeout(pendingSave);
      pendingSave = setTimeout(function () {
        var draft = JSON.parse(JSON.stringify(resume));
        setPath(draft, path, value);
        JB.store.updateResume(resume.id, draft);
        updateChrome(el);
      }, 320);
    });

    /* 离开输入框后刷新整页，让列表与体检结果同步 */
    el.addEventListener("focusout", function (event) {
      if (!event.target.closest || !event.target.closest("[data-path]")) return;
      setTimeout(function () {
        var active = document.activeElement;
        if (active && el.contains(active)) return;
        if (JB.q(".overlay")) return;
        if (JB.app && JB.app.refresh) JB.app.refresh();
      }, 160);
    });

    /* 技能输入框 */
    el.addEventListener("keydown", function (event) {
      var input = event.target;
      if (input.id === "skillInput" && (event.key === "Enter" || event.key === "," || event.key === "，")) {
        event.preventDefault();
        var resume = JB.store.activeResume();
        if (!resume) return;
        var raw = input.value.trim().replace(/[,，]$/, "");
        if (!raw) return;
        var skill = JB.skills.normalize(raw);
        var list = (resume.skills || []).slice();
        if (list.indexOf(skill) === -1) {
          list.push(skill);
          JB.store.updateResume(resume.id, { skills: list });
        } else {
          JB.toast("这个技能已经添加过了");
        }
        input.value = "";
      }
    });

    el.addEventListener("blur", function (event) {
      if (event.target.id === "skillInput") {
        event.target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      }
    }, true);
  }

  JB.views.resumes = {
    title: "我的简历",
    subtitle: "针对不同岗位准备不同版本，投递更有的放矢",
    render: render,
    bind: bind,
    paperHTML: paperHTML,
    plainText: plainText,
    markdown: markdown,
    setTab: function (tab) { ui.tab = tab; },
    setMode: function (mode) { ui.mode = mode; }
  };
})();
