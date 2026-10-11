/* 岗位数据获取：对接本地服务 /api/jobs，失败时回落到内置示例岗位库 */
(function () {
  "use strict";
  var JB = window.JB;

  var seedCache = null;
  var seedPromise = null;

  function loadSeed() {
    if (seedCache) return Promise.resolve(seedCache);
    if (seedPromise) return seedPromise;
    seedPromise = fetch("data/seed-jobs.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (list) {
        seedCache = Array.isArray(list) ? list : [];
        return seedCache;
      })
      .catch(function () {
        seedCache = [];
        return seedCache;
      });
    return seedPromise;
  }

  function textHit(job, keyword) {
    if (!keyword) return true;
    var parts = keyword.toLowerCase().split(/[\s,，、/|]+/).filter(Boolean);
    if (!parts.length) return true;
    var blob = [job.title, job.company, (job.tags || []).join(" "), job.description || "", job.location || "", job.city || ""]
      .join(" ").toLowerCase();
    return parts.some(function (p) { return blob.indexOf(p) > -1; });
  }

  function locationHit(job, location) {
    if (!location) return true;
    var blob = ((job.location || "") + " " + (job.city || "") + (job.remote ? " 远程 remote" : "")).toLowerCase();
    return blob.indexOf(location.toLowerCase()) > -1;
  }

  /** 本地示例库搜索（离线可用） */
  function searchSeed(options) {
    return loadSeed().then(function (list) {
      var jobs = list.filter(function (job) {
        return textHit(job, options.q) && locationHit(job, options.location);
      });
      return {
        ok: true,
        live: false,
        usedSeed: true,
        offline: true,
        jobs: jobs.slice(0, options.limit || 60),
        sources: [{ key: "seed", label: "示例岗位库", ok: true, count: jobs.length, error: "" }],
        message: "当前使用离线示例岗位库（未能连接在线数据源）"
      };
    });
  }

  function searchJobs(options) {
    options = options || {};
    var params = new URLSearchParams();
    params.set("q", options.q || "");
    params.set("location", options.location || "");
    params.set("limit", String(options.limit || 60));
    if (options.sources && options.sources.length) params.set("sources", options.sources.join(","));
    if (options.onlySeed) params.set("sources", "");

    if (options.onlySeed) return searchSeed(options);

    return fetch("api/jobs?" + params.toString(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("服务返回 " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || "接口返回异常");
        // 服务端在线源全部失败时，本地再补一次示例库，避免出现空页面
        if (data.usedSeed && (!data.jobs || !data.jobs.length)) {
          return searchSeed(options);
        }
        return data;
      })
      .catch(function (err) {
        return searchSeed(options).then(function (fallback) {
          fallback.error = fallback.jobs.length
            ? err.message
            : "无法连接本地服务，请确认已通过 start.bat 启动（" + err.message + "）";
          return fallback;
        });
      });
  }

  /** 数据源健康状态（用于“找工作”页展示） */
  function sourceStatus() {
    return fetch("api/sources", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) { return (data && data.sources) || []; })
      .catch(function () { return []; });
  }

  JB.api = {
    searchJobs: searchJobs,
    searchSeed: searchSeed,
    loadSeed: loadSeed,
    sourceStatus: sourceStatus,
    SOURCE_META: {
      remotive: { label: "Remotive", note: "海外远程岗位，英文居多" },
      arbeitnow: { label: "Arbeitnow", note: "欧洲岗位，部分提供签证支持" },
      jobicy: { label: "Jobicy", note: "海外远程岗位，可按行业筛选" },
      remoteok: { label: "RemoteOK", note: "海外科技类远程岗位" },
      seed: { label: "示例岗位库", note: "内置中文岗位样例，离线也能体验" }
    }
  };
})();
