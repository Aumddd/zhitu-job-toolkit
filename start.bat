@echo off
chcp 65001 >nul
title 职途 · 求职简历管理工具
cd /d "%~dp0"

set PY_CMD=
where python >nul 2>nul && set PY_CMD=python
if "%PY_CMD%"=="" (where py >nul 2>nul && set PY_CMD=py)

if "%PY_CMD%"=="" (
  echo.
  echo   [错误] 没有检测到 Python。
  echo   请先安装 Python 3.8 以上版本：https://www.python.org/downloads/
  echo   安装时记得勾选 "Add Python to PATH"。
  echo.
  pause
  exit /b 1
)

echo.
echo   正在启动「职途 · 求职简历管理工具」...
echo   浏览器会自动打开，关闭本窗口即可停止服务。
echo.

%PY_CMD% server.py

echo.
echo   服务已停止。
pause
