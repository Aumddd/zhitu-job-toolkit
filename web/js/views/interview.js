/* 面试准备：题库、STAR 故事库、面试复盘 */
(function () {
  "use strict";
  var JB = window.JB;
  JB.views = JB.views || {};

  var ui = { tab: "bank", category: "all", keyword: "", open: {}, starDraft: null };

  var LEVELS = [
    { key: "todo", label: "待准备" },
    { key: "ready", label: "已准备" },
    { key: "solid", label: "很熟练" }
  ];

  function levelBadge(level) {
    if (level === "solid") return '<span class="badge green">很熟练</span>';
    if (level === "ready") return '<span class="badge accent">已准备</span>';
    return '<span class="badge">待准备</span>';
  }

  function bankHTML() {
    var notes = JB.store.get().interviewNotes || {};
    var html = "";

    html += '<div class="filter-line mb-16"><span>分类</span><div class="chip-group">' +
      '<button class="chip' + (ui.category === "all" ? " on" : "") + '" data-cat="all">全部</button>';
    JB.interviewBank.forEach(function (cat) {
      html += '<button class="chip' + (ui.category === cat.key ? " on" : "") + '" data-cat="' + cat.key + '">' + JB.esc(cat.name) + "</button>";
    });
    html += "</div></div>";

    html += '<div class="search-input mb-16" style="max-width:380px">' +
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>' +
      '<input type="text" id="qaSearch" placeholder="搜索问题关键词，例如：薪资 / 自我介绍 / 失败" value="' + JB.esc(ui.keyword) + '" /></div>';

    var total = 0, ready = 0;
    JB.interviewBank.forEach(function (cat) {
      if (ui.category !== "all" && ui.category !== cat.key) return;
      cat.questions.forEach(function (q) {
        total++;
        var note = notes[q.id];
        if (note && note.level && note.level !== "todo") ready++;
      });
    });
    html += '<div class="row between mb-16"><span class="muted small">共 ' + total + " 道问题，已准备 " + ready + " 道</span>" +
      '<span class="muted tiny">先准备高频问题，剩下的看到心里有数即可</span></div>';

    var kw = ui.keyword.trim().toLowerCase();
    JB.interviewBank.forEach(function (cat) {
      if (ui.category !== "all" && ui.category !== cat.key) return;
      var questions = cat.questions.filter(function (q) {
        if (!kw) return true;
        return (q.q + q.tips).toLowerCase().indexOf(kw) > -1;
      });
      if (!questions.length) return;
      html += '<div class="section-title"><h2>' + JB.esc(cat.name) + '</h2><span class="sub">' + JB.esc(cat.desc) + "</span></div>";
      questions.forEach(function (q) {
        var open = ui.open[q.id];
        var note = notes[q.id] || {};
        html += '<div class="qa-item' + (open ? " open" : "") + '" data-qid="' + JB.esc(q.id) + '">' +
          '<div class="qa-q" data-toggle-q="' + JB.esc(q.id) + '">' +
          '<span class="idx">Q</span><span class="q">' + JB.esc(q.q) + "</span>" +
          levelBadge(note.level) +
          '<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>' +
          '<div class="qa-a"><div class="tips">' + JB.esc(q.tips).replace(/&lt;br&gt;/g, "\n") + "</div>" +
          '<div class="my-note"><label class="small strong">我的回答要点</label>' +
          '<textarea rows="3" data-note-for="' + JB.esc(q.id) + '" placeholder="写下你自己的答案骨架，面试前扫一遍就够了">' +
          JB.esc(note.answer || "") + "</textarea>" +
          '<div class="row mt-8" style="gap:6px">' +
          '<span class="tiny muted">掌握程度：</span>' +
          LEVELS.map(function (level) {
            return '<button class="chip' + (note.level === level.key ? " on" : "") + '" data-level="' + level.key + '" data-level-for="' + JB.esc(q.id) + '">' + JB.esc(level.label) + "</button>";
          }).join("") +
          "</div></div></div></div>";
      });
    });

    if (!total) {
      html += '<div class="card"><div class="card-body"><div class="empty"><div class="icon">🔎</div><h3>没有找到相关问题</h3><p>换个关键词试试。</p></div></div></div>';
    }
    return html;
  }

  function starHTML() {
    var stories = JB.store.get().starStories || [];
    var draft = ui.starDraft || { title: "", situation: "", task: "", action: "", result: "", learn: "" };
    var html = '<div class="grid cols-2" style="align-items:start">';

    html += '<div class="card"><div class="card-head"><h2>STAR 故事生成器</h2>' +
      '<span class="sub">把经历写成能直接讲的答案</span></div><div class="card-body">';
    html += '<div class="field mb-16"><label>故事标题</label><input type="text" id="starTitle" placeholder="例如：订单接口性能优化" value="' + JB.esc(draft.title) + '" /></div>';
    JB.starPrompts.forEach(function (prompt) {
      html += '<div class="field mb-16"><label>' + JB.esc(prompt.label) + '</label>' +
        '<textarea rows="3" data-star="' + prompt.key + '" placeholder="' + JB.esc(prompt.hint) + '">' + JB.esc(draft[prompt.key] || "") + "</textarea></div>";
    });
    html += '<div class="row" style="gap:8px"><button class="btn primary" data-star-save="1">保存故事</button>' +
      '<button class="btn" data-star-copy="1">复制成段落</button>' +
      '<button class="btn ghost" data-star-clear="1">清空</button></div>';
    html += "</div></div>";

    html += '<div><div class="card"><div class="card-head"><h2>我的故事库</h2><span class="spacer"></span>' +
      '<span class="sub">' + stories.length + " 个</span></div><div class=\"card-body\">";
    if (!stories.length) {
      html += '<div class="empty"><div class="icon">📝</div><h3>还没有故事</h3>' +
        "<p>准备 3 个故事（技术攻坚、团队协作、失败复盘），能覆盖 80% 的行为面试问题。</p></div>";
    } else {
      stories.forEach(function (story) {
        html += '<div class="entry"><div class="entry-head"><span class="strong">' + JB.esc(story.title || "未命名故事") + "</span>" +
          '<span class="spacer"></span>' +
          '<button class="btn sm ghost" data-star-copy-id="' + JB.esc(story.id) + '">复制</button>' +
          '<button class="btn sm ghost danger" data-star-del="' + JB.esc(story.id) + '">删除</button></div>' +
          '<div class="tiny muted">' + JB.esc(JB.fmtDate(story.createdAt, "short")) + "</div>" +
          '<div class="star-out mt-8">' + JB.esc(starText(story)) + "</div></div>";
      });
    }
    html += "</div></div></div></div>";
    return html;
  }

  function starText(story) {
    var parts = [];
    JB.starPrompts.forEach(function (prompt) {
      var value = story[prompt.key];
      if (value) parts.push(prompt.label.replace(/\s/g, "") + "：" + value);
    });
    return parts.join("\n");
  }

  function reviewHTML() {
    var reviews = JB.store.get().reviews || [];
    var html = '<div class="grid cols-2" style="align-items:start">';
    html += '<div class="card"><div class="card-head"><h2>记录一次面试复盘</h2><span class="sub">趁记忆新鲜写下来</span></div><div class="card-body">' +
      '<div class="form-grid">' +
      '<div class="field"><label>公司</label><input type="text" id="rvCompany" placeholder="公司名称" /></div>' +
      '<div class="field"><label>面试日期</label><input type="date" id="rvDate" value="' + JB.todayISO() + '" /></div>' +
      '<div class="field"><label>轮次</label><input type="text" id="rvRound" placeholder="一面 / 二面 / HR 面" /></div>' +
      '<div class="field"><label>岗位</label><input type="text" id="rvRole" placeholder="后端开发实习生" /></div>' +
      '<div class="field span-2"><label>被问到的问题</label><textarea rows="3" id="rvQuestions" placeholder="问题越多越有价值，尤其是没答上来的"></textarea></div>' +
      '<div class="field span-2"><label>做得好的地方</label><textarea rows="2" id="rvGood"></textarea></div>' +
      '<div class="field span-2"><label>下次要改进的地方</label><textarea rows="2" id="rvImprove"></textarea></div>' +
      '</div><button class="btn primary mt-16" data-review-save="1">保存复盘</button></div></div>';

    html += '<div class="card"><div class="card-head"><h2>复盘记录</h2><span class="spacer"></span><span class="sub">' + reviews.length + " 条</span></div><div class=\"card-body\">";
    if (!reviews.length) {
      html += '<div class="empty"><div class="icon">🧭</div><h3>还没有复盘记录</h3><p>每次面试后花 5 分钟记录，三轮之后进步会非常明显。</p></div>';
    } else {
      reviews.forEach(function (review) {
        html += '<div class="entry"><div class="entry-head"><span class="strong">' + JB.esc([review.company, review.round].filter(Boolean).join(" · ") || "未命名") + "</span>" +
          '<span class="spacer"></span><button class="btn sm ghost danger" data-review-del="' + JB.esc(review.id) + '">删除</button></div>' +
          '<div class="tiny muted">' + JB.esc(review.date || "") + (review.role ? " · " + JB.esc(review.role) : "") + "</div>" +
          (review.questions ? '<div class="small mt-8"><b>问题：</b>' + JB.esc(review.questions).replace(/\n/g, "<br>") + "</div>" : "") +
          (review.good ? '<div class="small mt-8" style="color:var(--green)"><b>做得好：</b>' + JB.esc(review.good) + "</div>" : "") +
          (review.improve ? '<div class="small mt-8" style="color:var(--amber)"><b>待改进：</b>' + JB.esc(review.improve) + "</div>" : "") +
          "</div>";
      });
    }
    html += "</div></div></div>";
    return html;
  }

  function render(el) {
    var html = '<div class="row mb-16" style="gap:6px">' +
      '<button class="btn sm' + (ui.tab === "bank" ? " primary" : "") + '" data-tab="bank">面试题库</button>' +
      '<button class="btn sm' + (ui.tab === "star" ? " primary" : "") + '" data-tab="star">STAR 故事库</button>' +
      '<button class="btn sm' + (ui.tab === "review" ? " primary" : "") + '" data-tab="review">面试复盘</button>' +
      "</div>";

    if (ui.tab === "bank") html += bankHTML();
    else if (ui.tab === "star") html += starHTML();
    else html += reviewHTML();

    el.innerHTML = html;
  }

  function collectStarDraft(el) {
    var draft = { title: (JB.q("#starTitle", el) || {}).value || "" };
    JB.qa("[data-star]", el).forEach(function (node) {
      draft[node.getAttribute("data-star")] = node.value;
    });
    ui.starDraft = draft;
    return draft;
  }

  function bind(el) {
    el.addEventListener("click", function (event) {
      var target = event.target;

      var tab = target.closest("[data-tab]");
      if (tab) { ui.tab = tab.getAttribute("data-tab"); render(el); return; }

      var cat = target.closest("[data-cat]");
      if (cat) { ui.category = cat.getAttribute("data-cat"); render(el); return; }

      var toggle = target.closest("[data-toggle-q]");
      if (toggle) {
        var id = toggle.getAttribute("data-toggle-q");
        ui.open[id] = !ui.open[id];
        render(el);
        return;
      }

      var level = target.closest("[data-level]");
      if (level) {
        JB.store.setInterviewNote(level.getAttribute("data-level-for"), { level: level.getAttribute("data-level") });
        render(el);
        return;
      }

      if (target.closest("[data-star-save]")) {
        var draft = collectStarDraft(el);
        if (!draft.title && !draft.action) { JB.toast("至少写一点内容再保存", "warn"); return; }
        JB.store.addStarStory(draft);
        ui.starDraft = null;
        JB.toast("已保存到故事库", "ok");
        render(el);
        return;
      }

      if (target.closest("[data-star-copy]")) {
        var d = collectStarDraft(el);
        JB.copy(starText(d) || "（还没有内容）", "已复制故事段落");
        return;
      }

      if (target.closest("[data-star-clear]")) { ui.starDraft = null; render(el); return; }

      var copyId = target.closest("[data-star-copy-id]");
      if (copyId) {
        var story = (JB.store.get().starStories || []).filter(function (s) { return s.id === copyId.getAttribute("data-star-copy-id"); })[0];
        if (story) JB.copy(starText(story), "已复制故事段落");
        return;
      }

      var del = target.closest("[data-star-del]");
      if (del) {
        JB.confirm({ title: "删除这个故事？", message: "删除后无法恢复。", okText: "删除", danger: true }).then(function (ok) {
          if (ok) { JB.store.deleteStarStory(del.getAttribute("data-star-del")); render(el); }
        });
        return;
      }

      if (target.closest("[data-review-save]")) {
        var review = {
          company: (JB.q("#rvCompany", el) || {}).value || "",
          date: (JB.q("#rvDate", el) || {}).value || "",
          round: (JB.q("#rvRound", el) || {}).value || "",
          role: (JB.q("#rvRole", el) || {}).value || "",
          questions: (JB.q("#rvQuestions", el) || {}).value || "",
          good: (JB.q("#rvGood", el) || {}).value || "",
          improve: (JB.q("#rvImprove", el) || {}).value || ""
        };
        if (!review.company && !review.questions) { JB.toast("至少填写公司或面试问题", "warn"); return; }
        JB.store.addReview(review);
        JB.toast("复盘已保存", "ok");
        render(el);
        return;
      }

      var reviewDel = target.closest("[data-review-del]");
      if (reviewDel) {
        JB.confirm({ title: "删除这条复盘？", message: "删除后无法恢复。", okText: "删除", danger: true }).then(function (ok) {
          if (ok) { JB.store.deleteReview(reviewDel.getAttribute("data-review-del")); render(el); }
        });
      }
    });

    /* 回答要点自动保存 */
    var timer = null;
    el.addEventListener("input", function (event) {
      var note = event.target.closest("[data-note-for]");
      if (note) {
        var id = note.getAttribute("data-note-for");
        var value = note.value;
        clearTimeout(timer);
        timer = setTimeout(function () { JB.store.setInterviewNote(id, { answer: value }); }, 500);
        return;
      }
      if (event.target.id === "qaSearch") {
        ui.keyword = event.target.value;
        clearTimeout(timer);
        timer = setTimeout(function () {
          render(el);
          var input = JB.q("#qaSearch", el);
          if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        }, 260);
      }
    });
  }

  JB.views.interview = {
    title: "面试准备",
    subtitle: "常见问题怎么答，提前准备好故事",
    render: render,
    bind: bind
  };
})();
