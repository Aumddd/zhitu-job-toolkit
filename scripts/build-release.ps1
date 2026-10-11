<#
    打包发布压缩包
    用法： powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
           powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1 -Version 1.0.1

    产物： dist\zhitu-job-toolkit-v<版本号>.zip（解压后即为一键可用的目录）
#>

param(
    [string]$Version = "1.0.0",
    [string]$Name = "zhitu-job-toolkit"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$stage = Join-Path $dist $Name
$zip = Join-Path $dist "$Name-v$Version.zip"

# 安全校验：所有删除/写入都限制在项目的 dist 目录内
if (-not ([System.IO.Path]::GetFullPath($dist)).StartsWith([System.IO.Path]::GetFullPath($root))) {
    throw "路径校验失败：$dist 不在项目目录内"
}

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$files = @("server.py", "start.bat", "README.md", "CHANGELOG.md", "LICENSE", "使用说明.txt", ".gitignore", ".gitattributes")
foreach ($file in $files) {
    $source = Join-Path $root $file
    if (-not (Test-Path -LiteralPath $source)) { throw "缺少文件：$file" }
    Copy-Item -LiteralPath $source -Destination $stage
}
foreach ($dir in @("web", "docs")) {
    Copy-Item -LiteralPath (Join-Path $root $dir) -Destination $stage -Recurse
}

# 清掉可能混进来的缓存
Get-ChildItem -LiteralPath $stage -Recurse -Directory -Force |
    Where-Object { $_.Name -in @("__pycache__", ".cache") } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }

# 优先用 bsdtar：会把文件名按 UTF-8 写入 zip，中文文件名在各系统都能正常显示
$tar = Get-Command tar.exe -ErrorAction SilentlyContinue
if ($tar) {
    & $tar.Source -a -c -f $zip -C $dist $Name
} else {
    Compress-Archive -Path $stage -DestinationPath $zip -CompressionLevel Optimal
}

Remove-Item -LiteralPath $stage -Recurse -Force

$size = [math]::Round((Get-Item -LiteralPath $zip).Length / 1KB, 1)
Write-Host ""
Write-Host "打包完成：$zip" -ForegroundColor Green
Write-Host "体积：$size KB"
Write-Host "解压后双击 start.bat 即可运行。"
