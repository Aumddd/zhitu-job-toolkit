<#
    把本项目发布到 GitHub

    用法 A（已安装 GitHub CLI，最省事）：
        powershell -ExecutionPolicy Bypass -File scripts\publish.ps1 -Owner 你的用户名

    用法 B（没有 gh，先自己在网页上建好空仓库）：
        1. 打开 https://github.com/new ，仓库名填 zhitu-job-toolkit，不要勾选任何初始化文件
        2. 运行： powershell -ExecutionPolicy Bypass -File scripts\publish.ps1 -Owner 你的用户名 -SkipCreate

    脚本只做三件事：建仓库（可选）、推送代码、打标签。不会删除任何东西。
#>

param(
    [string]$Owner = "",
    [string]$Repo = "zhitu-job-toolkit",
    [string]$Description = "职途 · 面向大三大四学生的求职简历管理工具：简历管理、岗位自动查询与匹配度、投递追踪、面试准备。零依赖，双击即用。",
    [string]$Version = "1.0.0",
    [switch]$Private,
    [switch]$SkipCreate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

$topics = "resume,job-search,job-tracker,career,students,python,vanilla-js,tool,chinese"

try {
    # ---- 0. 基本检查 ----
    if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) {
        throw "当前目录还不是 git 仓库，请先 git init 并提交。"
    }
    $dirty = (git status --porcelain)
    if ($dirty) {
        Write-Host "注意：还有未提交的改动，建议先 commit 后再发布。" -ForegroundColor Yellow
        git status --short
    }

    $hasGh = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)

    # ---- 1. 创建仓库 ----
    if (-not $SkipCreate) {
        if (-not $Owner) { throw "请用 -Owner 指定你的 GitHub 用户名（没有 gh 时请加 -SkipCreate 并在网页建好仓库）。" }
        if (-not $hasGh) {
            throw @"
没有检测到 GitHub CLI（gh）。
请二选一：
  A. 安装 gh 后重新运行：https://cli.github.com/
  B. 打开 https://github.com/new 手动创建空仓库 $Repo，
     然后重新运行： scripts\publish.ps1 -Owner $Owner -SkipCreate
"@
        }
        $visibility = if ($Private) { "--private" } else { "--public" }
        gh repo create "$Owner/$Repo" $visibility --description $Description
        gh repo edit "$Owner/$Repo" --add-topic $topics --enable-issues --enable-wiki=false
    }

    if (-not $Owner) { throw "请用 -Owner 指定你的 GitHub 用户名。" }
    $url = "https://github.com/$Owner/$Repo.git"

    # ---- 2. 关联远程并推送 ----
    $existing = git remote 2>$null
    if ($existing -contains "origin") {
        git remote set-url origin $url
    } else {
        git remote add origin $url
    }
    git push -u origin main

    # ---- 3. 打标签 ----
    if (-not (git tag --list "v$Version")) {
        git tag -a "v$Version" -m "v$Version"
    }
    git push origin "v$Version"

    Write-Host ""
    Write-Host "代码已推送到 $url" -ForegroundColor Green
    Write-Host ""
    Write-Host "最后一步：发布带压缩包的 Release（用户可以一键下载）" -ForegroundColor Cyan
    Write-Host "  1) 先打包： powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1 -Version $Version"
    if ($hasGh) {
        Write-Host "  2) 再执行： gh release create v$Version dist\zhitu-job-toolkit-v$Version.zip --title '职途 v$Version' --notes-file CHANGELOG.md"
    } else {
        Write-Host "  2) 打开 https://github.com/$Owner/$Repo/releases/new"
        Write-Host "     标签选 v$Version，标题填 职途 v$Version，"
        Write-Host "     把 dist\zhitu-job-toolkit-v$Version.zip 拖到附件区域，然后点 Publish release"
    }
}
finally {
    Pop-Location
}
