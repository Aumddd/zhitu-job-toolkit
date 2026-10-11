/* 岗位描述（JD）解析：把复制来的招聘信息整理成结构化岗位卡片 */
(function () {
  "use strict";
  var JB = window.JB;

  var CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "南京", "西安", "苏州", "天津",
    "重庆", "长沙", "青岛", "合肥", "郑州", "厦门", "福州", "济南", "宁波", "无锡", "大连", "沈阳",
    "哈尔滨", "昆明", "南昌", "贵阳", "石家庄", "太原", "佛山", "东莞", "珠海", "远程", "全国"];

  var TITLE_WORDS = ["实习生", "工程师", "经理", "设计师", "专员", "助理", "顾问", "开发", "运营", "分析师",
    "管培生", "研究员", "架构师", "测试", "编辑", "策划", "讲师", "会计", "销售", "客服", "主管", "总监", "leader"];

  function firstMatch(text, regex) {
    var m = text.match(regex);
    if (!m) return "";
    return (m[1] || m[0] || "").trim();
  }

  /** 在标签后面截取内容，遇到下一个标签就停下 */
  function matchLabel(rawText, labelGroup) {
    var lineRe = new RegExp("(?:^|\\n)\\s*(?:" + labelGroup + ")\\s*[:：]\\s*([^\\n]{2,40})");
    var m = rawText.match(lineRe);
    if (!m) {
      var inlineRe = new RegExp("(?:" + labelGroup + ")\\s*[:：]\\s*([^\\n]{2,40})");
      m = rawText.match(inlineRe);
    }
    if (!m) return "";
    return cutTail(m[1]);
  }

  function cutTail(text) {
    var t = String(text || "").trim();
    var cut = t.search(/[\s（(](公司|企业|工作地点|工作城市|办公地点|薪资|待遇|岗位类型|地点|城市|岗位职责|任职要求|投递方式|联系方式|截止|实习时间)/);
    if (cut > 0) t = t.slice(0, cut);
    return t.replace(/[：:，,、\-|]+$/, "").trim();
  }

  function guessTitle(lines, rawText) {
    var labeled = matchLabel(rawText, "岗位名称|职位名称|招聘岗位|应聘岗位|岗位|职位");
    if (labeled) return labeled;
    for (var i = 0; i < Math.min(lines.length, 6); i++) {
      var line = lines[i].replace(/^[【\[]|[】\]]$/g, "").trim();
      if (line.length < 2 || line.length > 30) continue;
      for (var j = 0; j < TITLE_WORDS.length; j++) {
        if (line.indexOf(TITLE_WORDS[j]) > -1) return line;
      }
    }
    for (var k = 0; k < Math.min(lines.length, 3); k++) {
      if (lines[k].length >= 2 && lines[k].length <= 26 && !/(要求|职责|描述|公司简介|福利)/.test(lines[k])) {
        return lines[k];
      }
    }
    return "";
  }

  function guessCompany(rawText) {
    var labeled = matchLabel(rawText, "公司名称|企业名称|公司|企业|雇主");
    if (labeled) return labeled;
    var m = rawText.match(/([\u4e00-\u9fa5A-Za-z0-9（）()·]{2,30}(?:有限公司|股份有限公司|集团|研究院|研究所|银行|事务所|科技公司|工作室|中心))/);
    return m ? m[1] : "";
  }

  function guessCity(rawText) {
    var labeled = rawText.match(/(?:工作地点|工作城市|办公地点|地点|城市)\s*[:：]?\s*([^\n]{2,20})/);
    if (labeled) {
      for (var i = 0; i < CITIES.length; i++) if (labeled[1].indexOf(CITIES[i]) > -1) return CITIES[i];
      return cutTail(labeled[1]).slice(0, 12);
    }
    for (var k = 0; k < CITIES.length; k++) {
      if (rawText.indexOf(CITIES[k]) > -1) return CITIES[k];
    }
    return "";
  }

  function guessSalary(rawText) {
    var m = rawText.match(/(\d{2,4}\s*[-~到至]\s*\d{2,4}\s*[kK千]\s*[·*x×]?\s*\d*\s*薪?)|(\d{2,4}\s*[kK千]\s*[-~到至]\s*\d{2,4}\s*[kK千]?)/);
    if (m) return m[0].replace(/\s+/g, "");
    var daily = rawText.match(/(\d{2,4}\s*[-~到至]\s*\d{2,4}\s*元\s*\/\s*[天日])|(\d{2,4}\s*元\s*\/\s*[天日])/);
    if (daily) return daily[0].replace(/\s+/g, "");
    if (/面议/.test(rawText)) return "面议";
    return "";
  }

  function guessType(rawText) {
    if (/实习|intern/i.test(rawText)) return "实习";
    if (/校招|校园招聘|应届|20\d{2}\s*届|管培/i.test(rawText)) return "校招";
    if (/兼职|part.?time/i.test(rawText)) return "兼职";
    if (/远程|remote/i.test(rawText)) return "远程";
    return "全职";
  }

  function guessDeadline(rawText) {
    var m = rawText.match(/(?:截止|deadline|投递截止|报名截止)[^\d]{0,12}(\d{4}\s*[-/年.]\s*\d{1,2}\s*[-/月.]\s*\d{1,2}\s*日?)/i);
    if (!m) return "";
    var parts = m[1].match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!parts) return "";
    return parts[1] + "-" + String(parts[2]).padStart(2, "0") + "-" + String(parts[3]).padStart(2, "0");
  }

  function guessEducation(rawText) {
    if (/博士/.test(rawText)) return "博士";
    if (/硕士|研究生/.test(rawText)) return "硕士";
    if (/本科/.test(rawText)) return "本科";
    if (/大专|专科/.test(rawText)) return "大专";
    return "不限";
  }

  /** 从 JD 中抽出“任职要求”段落 */
  function guessRequirements(lines) {
    var out = [];
    var capturing = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^(任职要求|任职资格|岗位要求|职位要求|我们希望|应聘要求|要求)/.test(line)) {
        capturing = true;
        var rest = line.replace(/^[^:：]{0,6}[:：]?/, "").trim();
        if (rest) out.push(rest);
        continue;
      }
      if (capturing && /^(福利|薪资|待遇|工作地点|联系方式|简历投递|公司介绍|关于我们|加分)/.test(line)) break;
      if (capturing && line.length > 2) out.push(line);
    }
    return out.slice(0, 10);
  }

  /**
   * 解析 JD 文本
   * @returns {object} 岗位对象（可直接保存/投递）
   */
  function parseJD(rawText) {
    var text = String(rawText || "").replace(/\r/g, "").trim();
    var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    var compact = text.replace(/\s+/g, " ");

    var title = guessTitle(lines, compact);
    var company = guessCompany(text) || guessCompany(compact) || "";
    var city = guessCity(text);
    var url = firstMatch(compact, /(https?:\/\/[^\s，。；、)）]+)/);
    var email = firstMatch(compact, /([\w.+-]+@[\w-]+\.[\w.]+)/);
    var skills = JB.skills.extract(text, 14);
    var requirements = guessRequirements(lines);

    return {
      id: JB.uid("jd"),
      source: "import",
      sourceLabel: "我粘贴的岗位",
      title: title || "未命名岗位",
      company: company || "未填写公司",
      city: city,
      location: city,
      remote: /远程|remote/i.test(compact),
      type: guessType(compact),
      salary: guessSalary(compact),
      education: guessEducation(compact),
      deadline: guessDeadline(compact),
      url: url,
      email: email,
      tags: skills,
      postedAt: JB.todayISO(),
      description: text,
      requirements: requirements,
      attribution: "来自你粘贴的招聘信息",
      parsedAt: new Date().toISOString(),
      parsing: {
        confidence: [title, company, city, skills.length >= 3].filter(Boolean).length
      }
    };
  }

  JB.jd = { parse: parseJD, CITIES: CITIES };
})();
