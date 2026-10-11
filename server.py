#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
职途 · 求职简历管理工具 —— 本地服务器

只依赖 Python 标准库，无需安装任何第三方包。

功能：
  1. 把 web/ 目录作为静态站点提供（前端页面）
  2. /api/jobs     聚合多个免费岗位源（Remotive / Arbeitnow / Jobicy / RemoteOK）
  3. /api/sources  返回各数据源的健康状态
  4. /api/health   健康检查

启动：  python server.py        （自动打开浏览器）
        python server.py --no-browser --port 8765
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT, "web")
CACHE_DIR = os.path.join(ROOT, ".cache")
CACHE_FILE = os.path.join(CACHE_DIR, "jobs-cache.json")
SEED_FILE = os.path.join(WEB_DIR, "data", "seed-jobs.json")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 JobBuddy/1.0"
)
HTTP_TIMEOUT = 12
CACHE_TTL = 600  # 秒，10 分钟内同样的搜索直接走缓存


# --------------------------------------------------------------------------- #
# 工具
# --------------------------------------------------------------------------- #
def http_get_json(url: str):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "identity",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8", errors="replace"))


TAG_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)
BR_RE = re.compile(r"<\s*(br|/p|/div|/li|/h[1-6]|/tr)\s*/?\s*>", re.I)
ANY_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(value: str) -> str:
    if not value:
        return ""
    text = TAG_RE.sub(" ", value)
    text = BR_RE.sub("\n", text)
    text = ANY_TAG_RE.sub("", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean(value: str, limit: int = 4000) -> str:
    if not value:
        return ""
    text = strip_html(str(value))
    if len(text) > limit:
        text = text[:limit].rstrip() + "…"
    return text


def to_iso_date(value) -> str:
    """尽量把各种时间表示转成 YYYY-MM-DD。"""
    if value in (None, "", 0):
        return ""
    if isinstance(value, (int, float)):
        try:
            return time.strftime("%Y-%m-%d", time.localtime(value))
        except Exception:
            return ""
    text = str(value).strip()
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return m.group(0)
    m = re.match(r"(\d{4})/(\d{1,2})/(\d{1,2})", text)
    if m:
        return "%s-%02d-%02d" % (m.group(1), int(m.group(2)), int(m.group(3)))
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(text).strftime("%Y-%m-%d")
    except Exception:
        return ""


def norm_tags(values, limit: int = 8):
    out = []
    for item in values or []:
        text = str(item).strip()
        if text and text not in out:
            out.append(text)
        if len(out) >= limit:
            break
    return out


def as_list(value):
    """部分接口会把本该是数组的字段返回成字符串，这里统一成数组。"""
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [v for v in value if v not in (None, "")]
    if isinstance(value, str):
        return [value] if value.strip() else []
    return [value]


# --------------------------------------------------------------------------- #
# 各数据源适配器
# --------------------------------------------------------------------------- #
def fetch_remotive(keyword: str, limit: int):
    query = urllib.parse.urlencode({"search": keyword, "limit": max(limit, 20)})
    data = http_get_json("https://remotive.com/api/remote-jobs?" + query)
    jobs = []
    for item in data.get("jobs", [])[:limit]:
        jobs.append(
            {
                "id": "remotive:%s" % item.get("id"),
                "source": "remotive",
                "sourceLabel": "Remotive",
                "title": clean(item.get("title"), 200),
                "company": clean(item.get("company_name"), 120),
                "location": clean(item.get("candidate_required_location") or "全球远程", 120),
                "remote": True,
                "type": clean(item.get("job_type"), 40) or "全职",
                "salary": clean(item.get("salary"), 80),
                "url": item.get("url") or "",
                "tags": norm_tags(as_list(item.get("tags")) + as_list(item.get("category"))),
                "postedAt": to_iso_date(item.get("publication_date")),
                "deadline": "",
                "description": clean(item.get("description"), 6000),
                "attribution": "数据来源 Remotive（remotive.com）",
            }
        )
    return jobs


def fetch_arbeitnow(keyword: str, limit: int):
    data = http_get_json("https://www.arbeitnow.com/api/job-board-api?page=1")
    jobs = []
    for item in data.get("data", []):
        haystack = " ".join(
            [
                str(item.get("title") or ""),
                " ".join(as_list(item.get("tags"))),
                str(item.get("company_name") or ""),
            ]
        ).lower()
        if keyword and keyword.lower() not in haystack:
            continue
        jobs.append(
            {
                "id": "arbeitnow:%s" % item.get("slug"),
                "source": "arbeitnow",
                "sourceLabel": "Arbeitnow",
                "title": clean(item.get("title"), 200),
                "company": clean(item.get("company_name"), 120),
                "location": clean(item.get("location") or "欧洲", 120),
                "remote": bool(item.get("remote")),
                "type": clean(" / ".join(as_list(item.get("job_types"))) or "全职", 40),
                "salary": "",
                "url": item.get("url") or "",
                "tags": norm_tags(as_list(item.get("tags"))),
                "postedAt": to_iso_date(item.get("created_at")),
                "deadline": "",
                "description": clean(item.get("description"), 6000),
                "attribution": "数据来源 Arbeitnow（arbeitnow.com）",
            }
        )
        if len(jobs) >= limit:
            break
    return jobs


def fetch_jobicy(keyword: str, limit: int):
    params = {"count": max(limit, 20)}
    if keyword:
        params["tag"] = keyword
    data = http_get_json("https://jobicy.com/api/v2/remote-jobs?" + urllib.parse.urlencode(params))
    jobs = []
    for item in data.get("jobs", [])[:limit]:
        salary = ""
        lo, hi = item.get("annualSalaryMin"), item.get("annualSalaryMax")
        if lo or hi:
            cur = item.get("salaryCurrency") or "USD"
            salary = "%s %s-%s /年" % (cur, lo or "?", hi or "?")
        jobs.append(
            {
                "id": "jobicy:%s" % item.get("id"),
                "source": "jobicy",
                "sourceLabel": "Jobicy",
                "title": clean(item.get("jobTitle"), 200),
                "company": clean(item.get("companyName"), 120),
                "location": clean(item.get("jobGeo") or "全球远程", 120),
                "remote": True,
                "type": clean(" / ".join(as_list(item.get("jobType"))) or "全职", 40),
                "salary": salary,
                "url": item.get("url") or "",
                "tags": norm_tags(as_list(item.get("jobIndustry")) + as_list(item.get("jobLevel"))),
                "postedAt": to_iso_date(item.get("pubDate")),
                "deadline": "",
                "description": clean(item.get("jobDescription") or item.get("jobExcerpt"), 6000),
                "attribution": "数据来源 Jobicy（jobicy.com）",
            }
        )
    return jobs


def fetch_remoteok(keyword: str, limit: int):
    data = http_get_json("https://remoteok.com/api")
    jobs = []
    for item in data:
        if not isinstance(item, dict) or "position" not in item:
            continue
        haystack = " ".join(
            [str(item.get("position") or ""), " ".join(as_list(item.get("tags")))]
        ).lower()
        if keyword and keyword.lower() not in haystack:
            continue
        salary = ""
        lo, hi = item.get("salary_min") or 0, item.get("salary_max") or 0
        if lo or hi:
            salary = "USD %s-%s /年" % (lo or "?", hi or "?")
        jobs.append(
            {
                "id": "remoteok:%s" % item.get("id"),
                "source": "remoteok",
                "sourceLabel": "RemoteOK",
                "title": clean(item.get("position"), 200),
                "company": clean(item.get("company"), 120),
                "location": clean(item.get("location") or "全球远程", 120),
                "remote": True,
                "type": "全职",
                "salary": salary,
                "url": item.get("url") or item.get("apply_url") or "",
                "tags": norm_tags(as_list(item.get("tags"))),
                "postedAt": to_iso_date(item.get("epoch") or item.get("date")),
                "deadline": "",
                "description": clean(item.get("description"), 6000),
                "attribution": "数据来源 RemoteOK（remoteok.com）",
            }
        )
        if len(jobs) >= limit:
            break
    return jobs


PROVIDERS = {
    "remotive": ("Remotive", "海外 · 远程", fetch_remotive),
    "arbeitnow": ("Arbeitnow", "欧洲 · 含签证", fetch_arbeitnow),
    "jobicy": ("Jobicy", "海外 · 远程", fetch_jobicy),
    "remoteok": ("RemoteOK", "海外 · 远程", fetch_remoteok),
}

SOURCE_STATUS = {
    key: {"key": key, "label": meta[0], "note": meta[1], "ok": None, "count": 0, "error": ""}
    for key, meta in PROVIDERS.items()
}
STATUS_LOCK = threading.Lock()

CACHE_LOCK = threading.Lock()
MEM_CACHE: dict[str, dict] = {}


# --------------------------------------------------------------------------- #
# 缓存
# --------------------------------------------------------------------------- #
def load_disk_cache() -> dict:
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_disk_cache(cache: dict) -> None:
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        if len(cache) > 120:
            ordered = sorted(cache.items(), key=lambda kv: kv[1].get("ts", 0), reverse=True)[:120]
            cache = dict(ordered)
        with open(CACHE_FILE, "w", encoding="utf-8") as fh:
            json.dump(cache, fh, ensure_ascii=False)
    except Exception:
        pass


def cache_get(key: str):
    now = time.time()
    with CACHE_LOCK:
        entry = MEM_CACHE.get(key)
        if entry and now - entry["ts"] < CACHE_TTL:
            return entry["payload"]
    return None


def cache_put(key: str, payload: dict) -> None:
    with CACHE_LOCK:
        MEM_CACHE[key] = {"ts": time.time(), "payload": payload}
        save_disk_cache(dict(MEM_CACHE))


def load_seed_jobs():
    try:
        with open(SEED_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def keyword_hit(keyword: str, job: dict) -> bool:
    if not keyword:
        return True
    needle = keyword.strip().lower()
    blob = " ".join(
        [
            job.get("title", ""),
            job.get("company", ""),
            " ".join(job.get("tags") or []),
            (job.get("description") or "")[:1500],
        ]
    ).lower()
    # 多关键词按“任一命中”处理，提升召回
    parts = [p for p in re.split(r"[\s,，、/|]+", needle) if p]
    return any(p in blob for p in parts) if parts else True


def location_hit(location: str, job: dict) -> bool:
    if not location:
        return True
    return location.strip().lower() in (job.get("location") or "").lower()


def search_jobs(keyword: str, location: str, sources: list, limit: int):
    """并发拉取各数据源，返回聚合结果 + 每源状态。"""
    limit = max(1, min(int(limit or 60), 120))
    per_source = max(20, limit // max(1, len(sources)) + 10)
    selected = [s for s in sources if s in PROVIDERS]

    results, statuses = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        future_map = {
            pool.submit(PROVIDERS[key][2], keyword, per_source): key for key in selected
        }
        for future in as_completed(future_map):
            key = future_map[future]
            label = PROVIDERS[key][0]
            try:
                items = future.result()
                results.extend(items)
                statuses.append(
                    {"key": key, "label": label, "ok": True, "count": len(items), "error": ""}
                )
            except Exception as exc:  # noqa: BLE001
                statuses.append(
                    {
                        "key": key,
                        "label": label,
                        "ok": False,
                        "count": 0,
                        "error": "%s: %s" % (type(exc).__name__, exc),
                    }
                )

    for status in statuses:
        with STATUS_LOCK:
            SOURCE_STATUS[status["key"]].update(status)

    jobs = [j for j in results if keyword_hit(keyword, j) and location_hit(location, j)]
    jobs.sort(key=lambda j: j.get("postedAt") or "", reverse=True)
    jobs = jobs[:limit]

    # 在线源全部失败时，回落到内置示例岗位库
    online_ok = any(s["ok"] for s in statuses)
    used_seed = False
    if not online_ok:
        seed = load_seed_jobs()
        seed = [j for j in seed if keyword_hit(keyword, j) and location_hit(location, j)]
        jobs = seed[:limit]
        used_seed = True

    return {
        "ok": True,
        "live": online_ok,
        "usedSeed": used_seed,
        "jobs": jobs,
        "sources": statuses,
        "fetchedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


# --------------------------------------------------------------------------- #
# HTTP 服务
# --------------------------------------------------------------------------- #
class Handler(SimpleHTTPRequestHandler):
    server_version = "JobBuddy/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    # ---- 输出 ---- #
    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        if os.environ.get("JOBBUDDY_VERBOSE"):
            sys.stderr.write("[server] %s\n" % (fmt % args))

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        # 本地工具：所有静态资源都不缓存，避免改完文件后浏览器仍用旧版本
        path = (getattr(self, "path", "") or "").split("?")[0].lower()
        if path.endswith((".html", ".js", ".css", ".json")) or path in ("", "/"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    # ---- 路由 ---- #
    def do_GET(self):  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            return self.send_json({"ok": True, "time": time.time(), "version": "1.0"})

        if path == "/api/sources":
            with STATUS_LOCK:
                return self.send_json({"ok": True, "sources": list(SOURCE_STATUS.values())})

        if path == "/api/jobs":
            params = urllib.parse.parse_qs(parsed.query)
            keyword = (params.get("q", [""])[0] or "").strip()
            location = (params.get("location", [""])[0] or "").strip()
            limit = params.get("limit", ["60"])[0]
            source_param = (params.get("sources", [""])[0] or "").strip()
            sources = (
                [s.strip() for s in source_param.split(",") if s.strip()]
                if source_param
                else list(PROVIDERS.keys())
            )
            cache_key = "|".join([keyword, location, ",".join(sorted(sources)), str(limit)])
            if not params.get("nocache"):
                cached = cache_get(cache_key)
                if cached:
                    cached = dict(cached)
                    cached["cached"] = True
                    return self.send_json(cached)
            try:
                payload = search_jobs(keyword, location, sources, limit)
            except Exception as exc:  # noqa: BLE001
                return self.send_json({"ok": False, "error": str(exc), "jobs": []}, 500)
            cache_put(cache_key, payload)
            payload["cached"] = False
            return self.send_json(payload)

        if path.startswith("/api/"):
            return self.send_json({"ok": False, "error": "unknown api: %s" % path}, 404)

        if path == "/":
            self.path = "/index.html"
        return super().do_GET()


def pick_port(preferred: int) -> int:
    for port in range(preferred, preferred + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    return preferred


def main():
    parser = argparse.ArgumentParser(description="职途 · 求职简历管理工具")
    parser.add_argument("--port", type=int, default=int(os.environ.get("JOBBUDDY_PORT", "8765")))
    parser.add_argument("--no-browser", action="store_true", help="启动后不自动打开浏览器")
    args = parser.parse_args()

    if not os.path.isdir(WEB_DIR):
        print("找不到 web/ 目录，请确认在项目根目录运行本脚本。")
        return 1

    global MEM_CACHE
    MEM_CACHE = load_disk_cache()

    port = pick_port(args.port)
    url = "http://127.0.0.1:%d/" % port
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True

    print("=" * 58)
    print("  职途 · 求职简历管理工具已启动")
    print("  访问地址： %s" % url)
    print("  结束运行： 在此窗口按 Ctrl + C")
    print("=" * 58)

    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
