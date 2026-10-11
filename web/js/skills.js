/* 技能词典 / 关键词提取 / 匹配度打分 / 简历完整度 */
(function () {
  "use strict";
  var JB = window.JB;

  /* ---------------- 技能词典（含常见别名） ---------------- */
  var DICT = {
    "编程语言": ["Java", "Python", "C语言", "C++", "C#", "Go", "JavaScript", "TypeScript", "PHP", "Ruby", "Kotlin", "Swift", "Scala", "R语言", "MATLAB", "SQL", "Shell", "Rust", "Dart", "汇编"],
    "前端": ["HTML", "CSS", "React", "Vue", "Angular", "jQuery", "Webpack", "Vite", "Sass", "Less", "Tailwind", "微信小程序", "Element UI", "Ant Design", "ECharts", "Next.js", "Node.js", "浏览器兼容", "响应式布局", "前端工程化", "组件库"],
    "后端": ["Spring", "Spring Boot", "Spring Cloud", "MyBatis", "Django", "Flask", "FastAPI", "Express", "Laravel", "Gin", "微服务", "RESTful", "gRPC", "Kafka", "RabbitMQ", "RocketMQ", "Redis", "MySQL", "PostgreSQL", "MongoDB", "Oracle", "Elasticsearch", "HBase", "Nginx", "Docker", "Kubernetes", "Git", "Linux", "Jenkins", "CI/CD", "分布式", "高并发", "性能优化", "设计模式", "JVM"],
    "数据与算法": ["机器学习", "深度学习", "PyTorch", "TensorFlow", "Scikit-learn", "pandas", "NumPy", "Spark", "Hadoop", "Hive", "Flink", "ETL", "数据仓库", "数据挖掘", "自然语言处理", "计算机视觉", "推荐系统", "特征工程", "Tableau", "Power BI", "Excel", "数据可视化", "A/B测试", "统计分析", "用户画像", "指标体系"],
    "测试": ["软件测试", "自动化测试", "接口测试", "Selenium", "Appium", "pytest", "JMeter", "Postman", "性能测试", "测试用例", "缺陷管理", "单元测试", "白盒测试"],
    "产品与运营": ["产品设计", "需求分析", "竞品分析", "Axure", "Figma", "墨刀", "PRD", "用户研究", "用户增长", "内容运营", "社群运营", "活动策划", "新媒体", "短视频", "文案", "SEO", "SEM", "跨境电商", "私域运营", "会员运营", "数据埋点", "项目管理", "敏捷开发", "供应链", "采购", "渠道管理"],
    "设计与创意": ["Photoshop", "Illustrator", "Sketch", "平面设计", "视觉设计", "交互设计", "UI设计", "用户体验", "3D建模", "动效设计", "摄影", "视频剪辑", "剪映", "排版", "品牌设计"],
    "金融与财务": ["财务分析", "会计", "审计", "税务", "估值建模", "财务报表", "银行", "风险控制", "投资分析", "CFA", "CPA", "成本管理", "预算管理", "行业研究"],
    "硬件与制造": ["嵌入式", "单片机", "电路设计", "PCB", "信号处理", "自动化", "电气", "PLC", "机械设计", "SolidWorks", "AutoCAD", "仿真分析", "CAN", "ROS"],
    "通用能力": ["沟通表达", "团队协作", "时间管理", "Office", "PPT", "Word", "英语", "日语", "演讲", "抗压能力", "组织协调", "学习能力", "数据敏感", "跨部门协作", "公文写作"]
  };

  var ALIASES = {
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript", "es2015": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "java": "Java", "python": "Python", "py": "Python",
    "c++": "C++", "cpp": "C++", "c#": "C#", "csharp": "C#", "golang": "Go", "go语言": "Go",
    "k8s": "Kubernetes", "docker容器": "Docker",
    "springboot": "Spring Boot", "spring boot": "Spring Boot", "springcloud": "Spring Cloud",
    "mysql数据库": "MySQL", "oracle数据库": "Oracle", "postgres": "PostgreSQL",
    "es": "Elasticsearch", "elastic search": "Elasticsearch",
    "mq": "RabbitMQ", "kafka消息队列": "Kafka",
    "node": "Node.js", "nodejs": "Node.js", "vue.js": "Vue", "vuejs": "Vue", "react.js": "React", "reactjs": "React",
    "webpack5": "Webpack", "vite3": "Vite", "tailwindcss": "Tailwind", "vue3": "Vue", "react18": "React",
    "小程序": "微信小程序", "微信小程序开发": "微信小程序",
    "数据分析师": "数据分析", "数据分析": "数据分析",
    "sql语言": "SQL", "mysql": "MySQL", "redis缓存": "Redis",
    "linux系统": "Linux", "shell脚本": "Shell", "git版本控制": "Git",
    "pytorch": "PyTorch", "tensorflow": "TensorFlow", "sklearn": "Scikit-learn", "scikit-learn": "Scikit-learn",
    "numpy": "NumPy", "pandas": "pandas",
    "tableau": "Tableau", "power bi": "Power BI", "powerbi": "Power BI", "excel表格": "Excel",
    "nlp": "自然语言处理", "cv": "计算机视觉", "机器学习算法": "机器学习", "深度学习框架": "深度学习",
    "hadoop": "Hadoop", "hive": "Hive", "spark": "Spark", "flink": "Flink",
    "ab测试": "A/B测试", "a/b test": "A/B测试",
    "ps": "Photoshop", "ai": "Illustrator", "figma": "Figma", "sketch": "Sketch", "axure": "Axure", "墨刀": "墨刀",
    "ui": "UI设计", "ux": "用户体验", "交互设计": "交互设计",
    "prd文档": "PRD", "需求文档": "PRD", "原型设计": "原型设计",
    "公众号运营": "新媒体", "小红书运营": "新媒体", "抖音运营": "短视频", "视频剪辑": "视频剪辑",
    "商务英语": "英语", "六级": "英语", "cet-6": "英语", "cet6": "英语", "雅思": "英语",
    "ppt制作": "PPT", "office办公软件": "Office", "excel": "Excel", "word": "Word",
    "沟通能力": "沟通表达", "团队合作": "团队协作", "抗压性": "抗压能力",
    "测试工程师": "软件测试", "接口自动化": "接口测试", "自动化脚本": "自动化测试",
    "嵌入式开发": "嵌入式", "单片机开发": "单片机", "can总线": "CAN",
    "财务": "财务报表", "会计学": "会计", "审计实习": "审计"
  };

  // 归一化索引：小写 -> 标准名
  var LOOKUP = {};
  Object.keys(DICT).forEach(function (group) {
    DICT[group].forEach(function (name) {
      LOOKUP[name.toLowerCase()] = name;
    });
  });
  Object.keys(ALIASES).forEach(function (alias) {
    var canonical = ALIASES[alias];
    if (!LOOKUP[canonical.toLowerCase()]) return;
    LOOKUP[alias.toLowerCase()] = canonical;
  });

  // 排序后的键，长的优先匹配，避免 "java" 命中 "javascript"
  var KEYS = Object.keys(LOOKUP).sort(function (a, b) { return b.length - a.length; });

  function isWordChar(ch) {
    return /[a-z0-9+#.+\-]/i.test(ch);
  }

  function findSkill(haystackLower, key) {
    var index = haystackLower.indexOf(key);
    while (index !== -1) {
      var before = index > 0 ? haystackLower[index - 1] : "";
      var after = haystackLower[index + key.length] || "";
      var asciiKey = /^[a-z0-9+#.+\-\s]+$/i.test(key);
      if (!asciiKey) return true;
      // 英文关键词需要词边界，避免 java 命中 javascript
      if (!isWordChar(before) && !isWordChar(after)) return true;
      // "spring boot" 这类含空格的，边界判断只看首尾
      if (key.indexOf(" ") > -1 && !isWordChar(before) && !isWordChar(after)) return true;
      index = haystackLower.indexOf(key, index + 1);
    }
    return false;
  }

  /** 从任意文本中提取标准技能名 */
  function extract(text, limit) {
    if (!text) return [];
    var lower = String(text).toLowerCase();
    var found = [];
    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      if (findSkill(lower, key)) {
        var canonical = LOOKUP[key];
        if (found.indexOf(canonical) === -1) found.push(canonical);
      }
      if (limit && found.length >= limit) break;
    }
    return found;
  }

  function normalizeSkill(name) {
    if (!name) return "";
    var trimmed = String(name).trim();
    if (!trimmed) return "";
    var hit = LOOKUP[trimmed.toLowerCase()];
    return hit || trimmed;
  }

  function allSkills() {
    var out = [];
    Object.keys(DICT).forEach(function (group) {
      DICT[group].forEach(function (name) { out.push(name); });
    });
    return out;
  }

  function categoryOf(skill) {
    var key = normalizeSkill(skill);
    var groups = Object.keys(DICT);
    for (var i = 0; i < groups.length; i++) {
      if (DICT[groups[i]].indexOf(key) > -1) return groups[i];
    }
    return "其他";
  }

  /* ---------------- 岗位技能要求 ---------------- */
  var SOFT_CATEGORIES = ["通用能力", "产品与运营", "设计与创意", "金融与财务"];
  var AMBIGUOUS_EN = ["Go", "R语言", "C语言", "CAN"];

  /** 英文 JD 里单词歧义太多，只保留确定性高的技术类关键词 */
  function descriptionSkillAllowed(skill) {
    if (skill.length < 4) return false;
    if (AMBIGUOUS_EN.indexOf(skill) > -1) return false;
    if (SOFT_CATEGORIES.indexOf(categoryOf(skill)) > -1) return false;
    return true;
  }

  function isChineseText(text) {
    var cjk = (String(text).match(/[\u4e00-\u9fa5]/g) || []).length;
    var compact = String(text).replace(/\s/g, "").length || 1;
    return cjk / compact > 0.12;
  }

  /** 从岗位对象里提取“要求技能”：标签优先，其次正文 */
  function jobSkills(job) {
    var fromTags = extract((job.tags || []).join(" "), 12);
    var fromTitle = extract(job.title || "", 8);
    var desc = (job.description || "").slice(0, 3000);
    var fromDesc = extract(desc, 14);
    if (!isChineseText(desc)) fromDesc = fromDesc.filter(descriptionSkillAllowed);
    var out = [];
    [fromTags, fromTitle, fromDesc].forEach(function (list) {
      list.forEach(function (item) { if (out.indexOf(item) === -1) out.push(item); });
    });
    return out;
  }

  /** 简历里出现过的技能（技能栏 + 全部文字） */
  function resumeSkills(resume) {
    if (!resume) return [];
    var out = [];
    (resume.skills || []).forEach(function (s) {
      var n = normalizeSkill(s);
      if (n && out.indexOf(n) === -1) out.push(n);
    });
    var blob = [
      resume.targetRole, resume.summary, resume.title,
      (resume.education || []).map(function (e) { return [e.school, e.major, e.courses].join(" "); }).join(" "),
      (resume.experience || []).map(function (e) { return [e.company, e.title, e.detail].join(" "); }).join(" "),
      (resume.projects || []).map(function (e) { return [e.name, e.role, e.tech, e.detail].join(" "); }).join(" "),
      (resume.awards || []).map(function (e) { return [e.name, e.detail].join(" "); }).join(" ")
    ].join(" \n ");
    extract(blob, 40).forEach(function (item) { if (out.indexOf(item) === -1) out.push(item); });
    return out;
  }

  /* ---------------- 匹配度 ---------------- */
  var DEGREE_ORDER = { "大专": 1, "本科": 2, "硕士": 3, "博士": 4 };

  /* 岗位族：把中英文岗位名称归到同一类，中英岗位也能互相匹配 */
  var ROLE_FAMILIES = [
    { name: "前端", terms: ["前端", "网页", "frontend", "front-end", "react", "vue", "angular", "javascript", "web", "h5"] },
    { name: "后端", terms: ["后端", "服务端", "服务器", "backend", "back-end", "server", "java", "python", "golang", "php", "node", "api", "platform", "software", "developer", "engineer", "架构", "微服务"] },
    { name: "全栈", terms: ["全栈", "fullstack", "full-stack", "full stack"] },
    { name: "移动端", terms: ["移动端", "客户端", "android", "ios", "flutter"] },
    { name: "数据", terms: ["数据分析", "商业分析", "数据科学", "数据挖掘", "数据开发", "大数据", "data analyst", "data scientist", "data engineer", "analytics", "business intelligence", "etl"] },
    { name: "算法与AI", terms: ["算法", "人工智能", "机器学习", "深度学习", "推荐系统", "自然语言", "计算机视觉", "大模型", "machine learning", "deep learning", "nlp", "computer vision", "llm"] },
    { name: "测试", terms: ["测试", "质量", "qa", " test", "sdet", "quality"] },
    { name: "运维", terms: ["运维", "devops", "sre", "基础设施", "infrastructure", "cloud", "reliability"] },
    { name: "安全", terms: ["安全", "security", "渗透", "infosec"] },
    { name: "产品", terms: ["产品经理", "产品设计", "product manager", "product owner", "product designer"] },
    { name: "运营", terms: ["运营", "增长", "社区", "operations", "growth", "community", "content", "social media"] },
    { name: "市场与销售", terms: ["市场", "品牌", "公关", "销售", "商务", "marketing", "sales", "business development", "brand"] },
    { name: "设计", terms: ["设计师", "视觉设计", "交互设计", "设计", "designer", "ui", "ux", "graphic", "visual"] },
    { name: "人力", terms: ["人力", "人事", "招聘", " hr", "recruit", "talent"] },
    { name: "财务与金融", terms: ["财务", "会计", "审计", "税务", "金融", "投资", "finance", "accounting", "audit", "tax", "investment"] },
    { name: "供应链", terms: ["供应链", "物流", "采购", "supply chain", "logistics", "procurement", "inventory"] },
    { name: "硬件与嵌入式", terms: ["嵌入式", "硬件", "电子", "电路", "单片机", "机械", "embedded", "firmware", "hardware", "electrical", "mechanical", "plc"] },
    { name: "游戏", terms: ["游戏", "game", "unity", "unreal"] },
    { name: "教育与培训", terms: ["教育", "教师", "培训", "讲师", "teacher", "tutor", "instructional"] },
    { name: "医疗与生物", terms: ["医疗", "临床", "医药", "生物", "medical", "clinical", "pharma", "biotech"] },
    { name: "客服与支持", terms: ["客服", "客户成功", "support", "customer success", "customer service"] }
  ];

  function roleFamilies(text) {
    var lower = String(text || "").toLowerCase();
    var out = [];
    if (!lower) return out;
    ROLE_FAMILIES.forEach(function (family) {
      for (var i = 0; i < family.terms.length; i++) {
        if (lower.indexOf(family.terms[i]) > -1) {
          if (out.indexOf(family.name) === -1) out.push(family.name);
          return;
        }
      }
    });
    return out;
  }

  function roleHit(job, resume) {
    var target = (resume && resume.targetRole) || "";
    if (!target) return 0.6;
    // 先看岗位族是否一致（中英文岗位名称都能对上）
    var mine = roleFamilies(target + " " + (resume.experience || []).map(function (e) { return e.title || ""; }).join(" "));
    // 只用岗位名称判断方向，避免标签里的技术词（如 Python）把岗位误判成另一类
    var theirs = roleFamilies(job.title || "");
    var familyHits = mine.filter(function (name) { return theirs.indexOf(name) > -1; });
    if (familyHits.length) {
      return JB.clamp(0.85 + 0.15 * (familyHits.length / Math.min(mine.length, theirs.length)), 0, 1);
    }
    var title = (job.title || "").toLowerCase();
    var roles = target.split(/[\/、,，\s]+/).filter(Boolean);
    if (!roles.length) return 0.6;
    for (var i = 0; i < roles.length; i++) {
      var r = roles[i].toLowerCase();
      if (r.length > 1 && title.indexOf(r) > -1) return 1;
    }
    var jobTokens = title.replace(/[（）()【】\[\]、,，\/·-]/g, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
    var hits = 0;
    roles.forEach(function (r) {
      jobTokens.forEach(function (t) { if (t.indexOf(r) > -1 || r.indexOf(t) > -1) hits++; });
    });
    // 技能相关性兜底：目标岗位关键词与岗位技能交叉
    var targetSkills = extract(target);
    var overlap = targetSkills.filter(function (s) { return jobSkills(job).indexOf(s) > -1; });
    var base = Math.min(1, hits * 0.34);
    if (overlap.length) base = Math.max(base, 0.5 + Math.min(0.3, overlap.length * 0.15));
    return base;
  }

  function cityHit(job, resume) {
    var want = ((resume && resume.targetCity) || "").trim();
    var jobLoc = (job.location || "") + " " + (job.city || "");
    if (!want) return 0.6;
    if (job.remote && /远程|remote|全国|全球/i.test(want + jobLoc)) return 1;
    if (jobLoc.toLowerCase().indexOf(want.toLowerCase()) > -1) return 1;
    // 同城别名：城市简称匹配
    var short = want.replace(/市$/, "");
    if (short && jobLoc.indexOf(short) > -1) return 1;
    if (job.remote) return 0.7;
    return 0.15;
  }

  function eduHit(job, resume) {
    var text = (job.title || "") + " " + (job.description || "").slice(0, 1200);
    var wanted = null;
    if (/博士/.test(text)) wanted = "博士";
    else if (/硕士|研究生/.test(text)) wanted = "硕士";
    else if (/本科/.test(text)) wanted = "本科";
    else if (/大专|专科/.test(text)) wanted = "大专";
    var mine = null;
    (resume && resume.education || []).forEach(function (edu) {
      var d = (edu.degree || "").match(/博士|硕士|本科|大专|专科/);
      if (d) {
        var name = d[0] === "专科" ? "大专" : d[0];
        if (!mine || DEGREE_ORDER[name] > DEGREE_ORDER[mine]) mine = name;
      }
    });
    if (!wanted || !mine) return 0.7;
    var diff = DEGREE_ORDER[mine] - DEGREE_ORDER[wanted];
    if (diff >= 0) return 1;
    if (diff === -1) return 0.5;
    return 0.15;
  }

  function typeHit(job, resume) {
    var prefer = (resume && resume.targetType) || "";
    if (!prefer) return 0.7;
    var type = (job.type || "") + " " + (job.title || "");
    if (prefer === "实习") return /实习|intern/i.test(type) ? 1 : 0.35;
    if (prefer === "校招") return /校招|应届|管培|校园招聘|202\d届/i.test(type) ? 1 : 0.4;
    if (prefer === "社招" || prefer === "全职") return /全职|社招/i.test(type) && !/实习/i.test(type) ? 1 : 0.5;
    return 0.7;
  }

  /**
   * 计算岗位与简历的匹配度
   * 返回 { score, parts, matched, missing, jobSkillList }
   */
  function matchJob(job, resume) {
    var need = jobSkills(job);
    var have = resumeSkills(resume);
    var matched = [];
    var missing = [];
    need.forEach(function (skill) {
      if (have.indexOf(skill) > -1) matched.push(skill);
      else missing.push(skill);
    });

    var skillPart;
    if (need.length === 0) {
      // 没有识别出技能要求时，退回到通用关键词覆盖率
      var titleTokens = (job.title || "").toLowerCase().replace(/[（）()【】\[\]、,，\/·-]/g, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
      var blob = (resumeSkills(resume).join(" ") + " " + ((resume && resume.summary) || "") + " " + ((resume && resume.targetRole) || "")).toLowerCase();
      var hit = titleTokens.filter(function (t) { return blob.indexOf(t) > -1; }).length;
      skillPart = titleTokens.length ? Math.min(1, 0.25 + hit / titleTokens.length) : 0.5;
    } else {
      skillPart = matched.length / need.length;
      // 关键技能（出现在标题里的）权重更高
      var keySkills = extract(job.title || "");
      if (keySkills.length) {
        var keyHit = keySkills.filter(function (s) { return have.indexOf(s) > -1; }).length;
        skillPart = 0.6 * skillPart + 0.4 * (keyHit / keySkills.length);
      }
    }

    var parts = {
      "技能匹配": skillPart,
      "岗位方向": roleHit(job, resume),
      "城市": cityHit(job, resume),
      "学历要求": eduHit(job, resume),
      "岗位类型": typeHit(job, resume)
    };
    var weights = { "技能匹配": 0.5, "岗位方向": 0.18, "城市": 0.12, "学历要求": 0.1, "岗位类型": 0.1 };
    var score = 0;
    Object.keys(parts).forEach(function (key) { score += parts[key] * weights[key]; });

    return {
      score: Math.round(JB.clamp(score, 0, 1) * 100),
      parts: parts,
      matched: matched,
      missing: missing,
      jobSkillList: need,
      resumeSkillList: have
    };
  }

  /* ---------------- 简历完整度 ---------------- */
  function resumeCompleteness(resume) {
    if (!resume) return { score: 0, checks: [] };
    var checks = [];
    function add(label, done, weight, tip) {
      checks.push({ label: label, done: !!done, weight: weight, tip: tip });
    }
    var basic = resume.basic || {};
    add("姓名", !!basic.name, 2, "填写真实姓名，方便导出与投递");
    add("联系方式（手机/邮箱）", !!(basic.phone || basic.email), 4, "HR 联系你的唯一途径，务必填写");
    add("目标岗位", !!resume.targetRole, 3, "目标岗位会用于岗位匹配度计算");
    add("期望城市", !!resume.targetCity, 2, "写明城市可让岗位推荐更准确");
    add("教育经历", (resume.education || []).length > 0, 4, "至少填写一条教育经历（学校/专业/时间）");
    add("绩点或排名", !!(resume.education || []).some(function (e) { return e.gpa; }), 2, "绩点/排名靠前时一定写出来");
    add("实习或工作经历", (resume.experience || []).length > 0, 4, "没有实习也可填写校内项目经历");
    add("项目经历", (resume.projects || []).length > 0, 4, "技术/产品岗的核心加分项");
    add("经历有量化结果", [].concat(resume.experience || [], resume.projects || []).some(function (e) { return /\d/.test(e.detail || ""); }), 3, "用数字说明结果，例如“接口耗时下降 40%”");
    add("技能标签", (resume.skills || []).length >= 5, 4, "技能建议 5-12 个，与目标岗位相关");
    add("荣誉奖项", (resume.awards || []).length > 0, 1, "奖学金、竞赛奖项能体现学习能力");
    add("自我评价", (resume.summary || "").length >= 20, 1, "两三句话说清自己的优势与求职动机");

    var total = checks.reduce(function (sum, c) { return sum + c.weight; }, 0);
    var got = checks.reduce(function (sum, c) { return sum + (c.done ? c.weight : 0); }, 0);
    return {
      score: Math.round((got / total) * 100),
      checks: checks,
      missing: checks.filter(function (c) { return !c.done; })
    };
  }

  /** 根据目标岗位给出技能建议 */
  function suggestSkills(resume) {
    var role = ((resume && resume.targetRole) || "").toLowerCase();
    var rules = [
      { keys: ["前端", "web", "react", "vue"], skills: ["JavaScript", "TypeScript", "React", "Vue", "CSS", "Webpack", "Vite", "Git", "性能优化"] },
      { keys: ["后端", "java", "服务端", "python", "go"], skills: ["Java", "Spring Boot", "MySQL", "Redis", "Linux", "Git", "微服务", "Docker"] },
      { keys: ["算法", "机器学习", "ai", "数据挖掘"], skills: ["Python", "PyTorch", "机器学习", "深度学习", "pandas", "NumPy", "特征工程", "统计分析"] },
      { keys: ["数据分析", "商业分析", "bi"], skills: ["SQL", "Excel", "Python", "pandas", "Tableau", "数据可视化", "A/B测试", "指标体系"] },
      { keys: ["产品", "pm"], skills: ["需求分析", "PRD", "Axure", "原型设计", "竞品分析", "数据分析", "项目管理", "用户研究"] },
      { keys: ["运营", "新媒体", "市场"], skills: ["内容运营", "活动策划", "数据分析", "文案", "Excel", "用户增长", "短视频"] },
      { keys: ["测试", "qa"], skills: ["软件测试", "接口测试", "自动化测试", "pytest", "Postman", "Linux", "SQL"] },
      { keys: ["设计", "ui", "ux", "视觉"], skills: ["Figma", "Photoshop", "交互设计", "UI设计", "用户体验", "视觉设计"] },
      { keys: ["财务", "会计", "审计", "金融"], skills: ["财务报表", "Excel", "财务分析", "会计", "审计", "行业研究"] },
      { keys: ["嵌入式", "硬件", "电子", "自动化"], skills: ["C语言", "嵌入式", "单片机", "Linux", "电路设计", "CAN"] },
      { keys: ["人力", "hr", "行政"], skills: ["沟通表达", "Excel", "PPT", "组织协调", "招聘"] },
      { keys: ["供应链", "物流", "采购"], skills: ["供应链", "Excel", "采购", "数据分析", "成本管理"] }
    ];
    var out = [];
    var have = resumeSkills(resume);
    // 没填目标岗位时不猜方向，直接给通用建议
    if (role) {
      rules.forEach(function (rule) {
        var hit = rule.keys.some(function (k) { return role.indexOf(k) > -1; });
        if (!hit) return;
        rule.skills.forEach(function (s) { if (have.indexOf(s) === -1 && out.indexOf(s) === -1) out.push(s); });
      });
    }
    if (!out.length) {
      ["Excel", "PPT", "英语", "数据分析", "团队协作", "时间管理"].forEach(function (s) {
        if (have.indexOf(s) === -1) out.push(s);
      });
    }
    return out.slice(0, 8);
  }

  JB.skills = {
    dict: DICT,
    extract: extract,
    normalize: normalizeSkill,
    all: allSkills,
    categoryOf: categoryOf,
    jobSkills: jobSkills,
    resumeSkills: resumeSkills,
    matchJob: matchJob,
    completeness: resumeCompleteness,
    suggest: suggestSkills
  };
})();
