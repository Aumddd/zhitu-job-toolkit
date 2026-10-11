/* 通用工具：日期、弹窗、提示、下载、复制 */
(function () {
  "use strict";
  window.JB = window.JB || {};
  var JB = window.JB;

  /* ---------------- 基础 ---------------- */
  JB.q = function (sel, root) { return (root || document).querySelector(sel); };
  JB.qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  JB.esc = function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  JB.uid = function (prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  };

  JB.debounce = function (fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait || 220);
    };
  };

  JB.clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };

  /* ---------------- 日期 ---------------- */
  JB.todayISO = function () {
    var d = new Date();
    return JB.isoOf(d);
  };

  JB.isoOf = function (date) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  };

  JB.fmtDate = function (iso, style) {
    if (!iso) return "—";
    var d = new Date(String(iso).length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return String(iso);
    var now = new Date();
    if (style === "short") return (d.getMonth() + 1) + "月" + d.getDate() + "日";
    if (style === "md") return (d.getMonth() + 1) + "-" + String(d.getDate()).padStart(2, "0");
    if (d.getFullYear() === now.getFullYear()) {
      return (d.getMonth() + 1) + "月" + d.getDate() + "日";
    }
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
  };

  JB.startOfDay = function (value) {
    var d = value instanceof Date ? new Date(value) : new Date(String(value).length <= 10 ? value + "T00:00:00" : value);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  /** 距今天数：正数=未来，0=今天，负数=已过 */
  JB.daysFromToday = function (iso) {
    if (!iso) return null;
    var target = JB.startOfDay(iso);
    if (isNaN(target.getTime())) return null;
    var today = JB.startOfDay(new Date());
    return Math.round((target - today) / 86400000);
  };

  JB.relDate = function (iso) {
    var days = JB.daysFromToday(iso);
    if (days === null) return "—";
    if (days === 0) return "今天";
    if (days === 1) return "明天";
    if (days === 2) return "后天";
    if (days === -1) return "昨天";
    if (days > 0) return days + " 天后";
    return "已过 " + Math.abs(days) + " 天";
  };

  JB.weekKey = function (iso) {
    var d = JB.startOfDay(iso);
    if (isNaN(d.getTime())) return "";
    var day = (d.getDay() + 6) % 7; // 周一为一周开始
    d.setDate(d.getDate() - day);
    return JB.isoOf(d);
  };

  /* ---------------- 提示 ---------------- */
  JB.toast = function (message, type, ms) {
    var root = JB.q("#toastRoot");
    if (!root) return;
    var node = document.createElement("div");
    node.className = "toast" + (type ? " " + type : "");
    node.textContent = message;
    root.appendChild(node);
    setTimeout(function () {
      node.style.transition = "opacity .25s, transform .25s";
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      setTimeout(function () { node.remove(); }, 260);
    }, ms || 2200);
  };

  /* ---------------- 弹窗 ---------------- */
  var openLayers = [];

  JB.closeTopLayer = function () {
    var layer = openLayers.pop();
    if (layer) layer.remove();
  };

  /**
   * 打开弹窗
   * options: { title, html, buttons:[{label, kind, icon, onClick(close, root)}], wide, narrow, onOpen(root) }
   * 返回 { close }
   */
  JB.modal = function (options) {
    options = options || {};
    var overlay = document.createElement("div");
    overlay.className = "overlay";

    var modal = document.createElement("div");
    modal.className = "modal" + (options.wide ? " wide" : "") + (options.narrow ? " narrow" : "");

    var footHTML = "";
    (options.buttons || []).forEach(function (btn, i) {
      footHTML +=
        '<button class="btn ' + (btn.kind || "") + '"' + (btn.id ? ' id="' + JB.esc(btn.id) + '"' : "") +
        (btn.hidden ? " hidden" : "") + ' data-btn-index="' + i + '">' +
        JB.esc(btn.label) + "</button>";
    });

    modal.innerHTML =
      '<div class="modal-head"><h3>' + JB.esc(options.title || "") + "</h3>" +
      '<button class="icon-btn" data-close="1" title="关闭">' +
      '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal-body">' + (options.html || "") + "</div>" +
      (footHTML ? '<div class="modal-foot">' + footHTML + "</div>" : "");

    overlay.appendChild(modal);
    (JB.q("#modalRoot") || document.body).appendChild(overlay);

    function close() {
      var idx = openLayers.indexOf(overlay);
      if (idx >= 0) openLayers.splice(idx, 1);
      overlay.remove();
      if (options.onClose) options.onClose();
    }

    function closeTop() {
      var idx = openLayers.indexOf(overlay);
      // 只关闭最上层弹窗，避免叠层时一次全关
      if (idx !== openLayers.length - 1) return;
      close();
    }

    openLayers.push(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) closeTop();
    });
    modal.addEventListener("click", function (event) {
      var closeBtn = event.target.closest("[data-close]");
      if (closeBtn) { closeTop(); return; }
      var btn = event.target.closest("[data-btn-index]");
      if (btn) {
        var cfg = (options.buttons || [])[Number(btn.getAttribute("data-btn-index"))];
        if (cfg && cfg.onClick) cfg.onClick(close, modal);
        else close();
      }
    });

    if (options.onOpen) options.onOpen(modal, close);
    var first = modal.querySelector("input, textarea, select, button.primary");
    if (first) setTimeout(function () { first.focus(); }, 40);
    return { close: close, root: modal, overlay: overlay };
  };

  JB.confirm = function (options) {
    options = options || {};
    return new Promise(function (resolve) {
      var decided = false;
      JB.modal({
        title: options.title || "确认操作",
        narrow: true,
        html: '<p style="margin:0;color:var(--text-2)">' + JB.esc(options.message || "") + "</p>",
        buttons: [
          { label: options.cancelText || "取消", kind: "ghost", onClick: function (close) { decided = true; close(); resolve(false); } },
          { label: options.okText || "确定", kind: options.danger ? "danger" : "primary", onClick: function (close) { decided = true; close(); resolve(true); } }
        ],
        onClose: function () { if (!decided) resolve(false); }
      });
    });
  };

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && openLayers.length) {
      openLayers.pop().remove();
    }
  });

  /* ---------------- 文件 / 剪贴板 ---------------- */
  JB.download = function (filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || "application/json;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  JB.copy = function (text, okMessage) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); JB.toast(okMessage || "已复制到剪贴板", "ok"); }
      catch (e) { JB.toast("复制失败，请手动选择复制", "err"); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        JB.toast(okMessage || "已复制到剪贴板", "ok");
      }).catch(fallback);
    } else {
      fallback();
    }
  };

  JB.readFile = function (accept) {
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = "file";
      if (accept) input.accept = accept;
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) return resolve(null);
        var reader = new FileReader();
        reader.onload = function () { resolve({ name: file.name, text: String(reader.result || "") }); };
        reader.readAsText(file, "utf-8");
      };
      input.click();
    });
  };

  /* ---------------- 表单读取 ---------------- */
  JB.formValues = function (root) {
    var out = {};
    JB.qa("[data-field]", root).forEach(function (node) {
      out[node.getAttribute("data-field")] = node.value;
    });
    return out;
  };

  JB.optionList = function (items, current, placeholder) {
    var html = placeholder ? '<option value="">' + JB.esc(placeholder) + "</option>" : "";
    items.forEach(function (item) {
      var value = typeof item === "string" ? item : item.value;
      var label = typeof item === "string" ? item : item.label;
      html += '<option value="' + JB.esc(value) + '"' + (String(value) === String(current) ? " selected" : "") + ">" + JB.esc(label) + "</option>";
    });
    return html;
  };
})();
